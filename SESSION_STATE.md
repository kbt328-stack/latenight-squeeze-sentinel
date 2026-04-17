# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17

---

## VPS Facts (never changes)
- **Provider:** Hetzner CPX41
- **IP:** 187.124.88.22
- **OS:** Ubuntu 24.04.4 LTS
- **User:** root (migrate to non-root app user in Workstream A hardening pass)
- **Repo location:** `/root/squeeze-sentinel`
- **Branch policy:** work on `agent/workstream-X`, PR to main when workstream complete

## Environment
- Node: v22.22.0 ✅
- pnpm: 10.33.0 ✅
- Docker: 29.3.0 ✅
- Caddy: NOT YET INSTALLED
- psql client: NOT YET INSTALLED (`apt install postgresql-client-common`)

## Critical: Loading .env for CLI commands
**pnpm does NOT auto-load .env.** Any command that needs DB/Redis/API keys must be prefixed:
```bash
export $(cat .env | grep -v "^#" | grep -v "^$" | grep -v "ghp_" | xargs)
# then run your command
pnpm db:migrate
```
Add this to your shell session at the start of every VPS working session.

## Running Docker Containers
| Container | Image | Ports | Status |
|---|---|---|---|
| sentinel-postgres | timescale/timescaledb:latest-pg16 | 5432 | ✅ Up |
| sentinel-redis | redis:7-alpine | 6379 | ✅ Up |
| traefik | traefik:latest | — | ✅ Up (pre-existing) |
| preview-server | nginx:alpine | 80 | pre-existing, ignore |
| apex_bot / openclaw | hostinger | 3333-3335 | pre-existing, ignore |

**Caddy is NOT running yet** — it will replace/sit alongside traefik for sentinel routes.

## Workers (PM2)
All 6 ingestion workers are running via PM2 with 0 crashes:
- `ingest-structural` (hourly)
- `ingest-setup` (15min)
- `ingest-trigger` (1min)
- `ingest-squeeze` (1min)
- `ingest-distribution` (5min)
- (scoring runner not yet built — Workstream F)

Check worker health:
```bash
pm2 status
pm2 logs ingest-setup   # check if LunarCrush signals firing after key was populated
```

## Git State
- **Current branch:** `agent/workstream-d-scoring` (needs merge to main)
- **Dirty files:** `packages/db/node_modules` tracked in git — needs `.gitignore` fix
- **Action needed:** merge `agent/workstream-d-scoring` → main before starting new workstreams

## Security Issues — Fix Immediately
1. `.env` contains a loose GitHub PAT (`ghp_e...`) on its own line — not a KEY=VALUE pair. Remove it:
```bash
grep -n "ghp_" .env   # find the line
# delete that line with nano/vim
```
2. `packages/db/node_modules` is tracked in git — add to root `.gitignore`

---

## Confirmed Database State (verified this session)

```sql
SELECT COUNT(*) FROM tokens;       -- returns 1 (RAVE only)

SELECT token_id, plane, COUNT(*)
FROM signals
GROUP BY token_id, plane
ORDER BY plane;
-- returns:
-- distribution | 54
-- setup        |  8
-- squeeze      | 130
-- structural   |  3
-- trigger      | 517
-- ALL for the same token_id (RAVE: 41cc3204-976e-4e87-8e15-fee1cb8c585b)
```

**Critical finding:** Only 1 token in the DB. Workers are running but only scanning RAVE because it's the only token ever seeded. The top-200 watchlist population was never built.

---

## Workstream Status

| Stream | Name | Status | Notes |
|---|---|---|---|
| **A** | Infrastructure & DevOps | 🟡 Partial | Docker/Redis/Postgres up, PM2 running workers. Caddy not installed. CI/CD not tested end-to-end. Non-root user not done. |
| **B** | Database & Schema | ✅ Done | Schema migrated, hypertables live, RAVE seeded, 108 tests passing. |
| **C** | Data Clients | 🟡 Partial | 5 clients built (Coinglass, Etherscan, CoinGecko, LunarCrush, GoPlus). Verify committed: `ls packages/data-clients/src/` |
| **D** | Scoring Engine | ✅ Done | 23 activations, computeComposite, explainScore, getBand. 117 tests passing. RAVE fixture scores ≥75. |
| **E** | Ingestion Workers | 🟡 Partial | 6 workers running, signals writing to DB — but only for RAVE. Token population not built. See next priorities. |
| **F** | Scoring Runner + Wallet Graph | ❌ Not done | Blocked until token population done + setup signals confirmed firing. |
| **G** | Alerting Worker | ❌ Not done | Blocked on F. |
| **H** | Dashboard SPA | ❌ Not done | Can start independently (mock API). |
| **I** | Landing Page | ❌ Not done | Can start independently. |
| **J** | Backtest Framework | ❌ Not done | Blocked on D + F. |

---

## Current Signal State (live, as of this session)

| Signal | Value | Reason |
|---|---|---|
| s1 | missing | Etherscan Pro required (`tokenholderlist` endpoint — $199/mo) |
| s2 | missing | Etherscan Pro required |
| s3 | 100 | Firing correctly ✅ |
| s4 | missing | Etherscan Pro required |
| s5 | 86 | Firing correctly ✅ |
| t1 | 0 | No wallet graph built yet (Workstream F) |
| t2 | 0 | Correct — RAVE not on perp exchanges with funding data right now |
| t3 | 0 | Stubbed — `/globalLongShortAccountRatio` returns 404 on Startup tier |
| t4 | 0 | Correct — RAVE OI/mcap is 11.9%, threshold is 30% |
| t5 | 0 | Stubbed — X API not configured |
| u1–u4 | 0 | LunarCrush key now populated — check `pm2 logs ingest-setup` to confirm firing |
| q1–q5 | 0 | Expected — no active squeeze on RAVE right now |
| d1–d5 | 0 | Expected — no active distribution on RAVE right now |

**Live composite: 6.58** — this is correct. The RAVE squeeze already happened. The ≥75 target is a *backtest* number against April 12 historical data, not a live number today. Do not treat 6.58 as broken.

**Structural plane score: 32.9** — only s3 and s5 contributing. Would be ~75+ if s1/s2/s4 were populated (either via Etherscan Pro or stubs with known RAVE values).

---

## Product Direction Decisions (made this session, not yet in CLAUDE.md)

### 1. Token watchlist = top 200 by market cap
The system will track the **top 200 tokens by market cap** via CoinGecko, not just RAVE. This was always the intent per CLAUDE.md Workstream E ("top 200 by market cap + any token with composite >35 in last 7d") but was never implemented.

### 2. US exchange availability on every alert
Every alert and token page will surface **where US buyers can actually purchase** the token. Specifically flag:
- **Coinbase** (primary — regulated, no freeze risk, accessible to all US retail)
- **Kraken** (secondary US regulated venue)
- **Gemini** (tertiary US regulated venue)

This data comes from CoinGecko's exchange tickers endpoint — no additional API key needed.

Store as `us_exchanges text[]` column on the `tokens` table (migration needed).

### 3. Exchange freeze risk is a known concern
Kyle raised the real problem of exchanges freezing sells mid-pump (documented behavior on Binance, KuCoin). Coinbase is the safest venue for US retail because it's regulated. This informs why Coinbase availability is the primary flag. No additional scoring signal needed for now — just surface availability on alerts.

### 4. No tradability scoring layer yet
Discussed adding a second score for "can we actually trade this without getting rekt" but explicitly deferred. Current focus is getting squeeze detection working across 200 tokens first.

---

## Next Session Priority Order

### Priority 1 — Immediate (15 min)
```bash
# Verify LunarCrush is now firing
pm2 logs ingest-setup --lines 50

# Check if setup signals in DB now
export $(cat .env | grep -v "^#" | grep -v "^$" | grep -v "ghp_" | xargs)
docker exec sentinel-postgres psql -U sentinel -d sentinel \
  -c "SELECT signal_id, value, observed_at FROM signals WHERE plane='setup' ORDER BY observed_at DESC LIMIT 10;"
```

### Priority 2 — Token Population (this session's main task)
Build `packages/db/src/seed-watchlist.ts`:
1. Hit CoinGecko `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200`
2. For each token, also fetch exchange tickers to populate `us_exchanges`
3. Insert all 200 into `tokens` table (upsert on `chain + contract_address`)
4. Add `us_exchanges text[]` column to tokens schema + migration

Then verify workers loop over `SELECT * FROM tokens` not a hardcoded UUID. Check:
```bash
grep -n "41cc3204\|token_id\|FROM tokens\|watchlist" workers/ingestion/*.ts | head -40
```

### Priority 3 — Stub s1/s2/s4 for RAVE backtest
Known RAVE values (from 0xchainink report):
- s1: top 3 wallets hold >70% of supply → value = 100
- s2: circulating float <30% → value = 100
- s4: deployer not doxxed/audited → value = 100

Stub these in the structural worker for RAVE specifically so the April 12 backtest can be validated. Then run Workstream F scoring runner against historical data — must hit composite ≥75.

### Priority 4 — Git hygiene (do anytime, takes 5 min)
```bash
# Remove GitHub PAT from .env
grep -n "ghp_" .env
# delete that line

# Add to .gitignore
echo "packages/db/node_modules" >> .gitignore
echo "packages/*/node_modules" >> .gitignore
git add .gitignore
git commit -m "chore: fix gitignore for package node_modules"

# Merge scoring branch
git checkout main
git merge agent/workstream-d-scoring
git push
```

---

## API Cost Reality Check

| Service | Tier | Monthly Cost | Unlocks |
|---|---|---|---|
| CoinGecko | Free | $0 | Price/volume, token list, exchange tickers |
| GoPlus | Free | $0 | Contract safety (s4 for new tokens) |
| Coinglass | Startup (current) | ~$50–80 | t2, t4 (t3 stubbed on 404 at this tier) |
| LunarCrush | Builder | $49 | u1–u4, q5, d5 |
| Etherscan | Pro | $199 | s1, s2, s4 for live tokens — biggest unlock |
| X API | Basic | $100 | t5, u4 — low priority, defer |
| Hetzner VPS | CPX41 | ~$28 | Infrastructure |
| **Minimum viable** | | **~$326/mo** | All planes except X API signals |
| **Full** | | **~$426/mo** | Everything |

**Etherscan Pro decision:** Without it, s1/s2/s4 are permanently dead for any token that isn't hardcoded. These are the highest-weight structural signals. Can stub RAVE values for backtest validation, but real-world scoring of new tokens needs Pro. Consider Moralis or Covalent as cheaper alternatives — both have free `tokenholderlist` equivalents.

---

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live on VPS | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live (200 tokens, free-tier data flowing) | Week 3 | 🔴 Token population not built |
| M2: All workstreams, alerting live, paying subscribers | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases, recall ≥80% | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |

---

## Known Issues / Tech Debt
1. `packages/db/node_modules` tracked in git — add to `.gitignore`
2. GitHub PAT loose in `.env` — remove immediately (security issue)
3. VPS needs kernel restart — do during maintenance window
4. 42 apt packages need updating — `apt upgrade` during maintenance
5. Workers hardcoded to RAVE only — token population script needed
6. `tokens` table missing `us_exchanges text[]` column — needs migration
7. t3 signal permanently stubbed at Startup tier (Coinglass 404) — acceptable for now
8. t5/u4 stubbed (X API) — acceptable for nownano SESSION_STATE.md
