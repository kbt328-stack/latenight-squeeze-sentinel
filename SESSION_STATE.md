# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17
> Last session: Fixed Etherscan V2 API migration (v1 deprecated, NOTOK). Added fetchTotalSupply endpoint to etherscan client. Fixed s1 concentration calc to use actual total supply instead of summing fetched holders. Fixed fetchTokenHolders to fetch 100 instead of 10. s2/s3/s5 now firing correctly. s1=0 is correct behavior on post-dump RAVE (top 3 only hold 14.4% now). Composite at 12.77 — correct for a dead pump. GoPlus normalize bug still present (undefined contract address key). Next session: add 10-20 live tokens to watchlist, build quick single-page dashboard (no React, just Fastify endpoint + HTML) showing composite scores, signal breakdown, score history per token.

---

## VPS Facts (never changes)
- **Provider:** Hetzner CPX41
- **IP:** 187.124.88.22
- **OS:** Ubuntu 24.04.4 LTS
- **User:** root (migrate to non-root app user in Workstream A hardening pass)
- **Repo location:** /root/squeeze-sentinel
- **Branch policy:** work on agent/workstream-X, PR to main when workstream complete

## Environment
- Node: v22.22.0 ✅
- pnpm: 10.33.0 ✅
- Docker: 29.3.0 ✅
- Caddy: NOT YET INSTALLED
- psql client: NOT YET INSTALLED

## Critical: Loading .env for CLI commands
```bash
export $(cat .env | grep -v "^#" | grep -v "^$" | grep -v "ghp_" | xargs)
```

## Running Docker Containers
| Container | Status |
|---|---|
| sentinel-postgres | ✅ Up |
| sentinel-redis | ✅ Up |
| traefik | ✅ Up (pre-existing) |

## Workstream Status
| Stream | Name | Status | Notes |
|---|---|---|---|
| **A** | Infrastructure & DevOps | ? | Caddy not installed, CI/CD not tested end-to-end |
| **B** | Database & Schema | ? | Schema migrated, RAVE seeded, hypertables created |
| **C** | Data Clients | ? | All 6 clients present |
| **D** | Scoring Engine | ? | 108 tests passing, RAVE fixture scores ≥75 |
| **E** | Ingestion Workers | ? | All 5 workers boot clean |
| **F** | Scoring Runner + Wallet Graph | ? | |
| **G** | Alerting Worker | ? | Blocked on F |
| **H** | Dashboard SPA | ? | Can start independently |
| **I** | Landing Page | ? | Can start independently |
| **J** | Backtest Framework | ? | Blocked on D+F |

## Database State
- Migration 0001_initial.sql: ✅ Applied
- All tables: ✅ Created
- Hypertables: ✅ Created
- RAVE seeded: ✅
- Real signal data: ❌ None yet (workers not yet running continuously)

## Known Issues / Tech Debt
1. packages/db/node_modules tracked in git — add to .gitignore
2. GitHub PAT loose in .env — REMOVE IMMEDIATELY
3. VPS needs restart (kernel update pending)
4. 45 apt packages need updating
5. Non-root app user not yet created (Workstream A hardening)
6. Workers run via tsx (dev mode) — need Docker container for production

## Next Session Priority
Etherscan Pro live, V2 API fixed, s2/s3/s5 firing, composite 12.77 on post-dump RAVE (correct). Next: add 15-20 live watchlist tokens and build a single-page dashboard (Fastify JSON endpoint + plain HTML, no React) showing composite score, band, signal breakdown per token — something we can screen share today.

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
