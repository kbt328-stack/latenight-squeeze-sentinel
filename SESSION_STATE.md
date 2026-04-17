# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17
> Last session: Built and deployed single-page watchlist dashboard (infra/scripts/dashboard-server.ts) — Fastify + vanilla HTML/JS, no React, no build step. Seeded 19 new watchlist tokens (infra/scripts/seed-watchlist.ts) bringing total to 20. Dashboard live at http://187.124.88.22:4000 (Hetzner firewall rule added for TCP 4000). All 5 ingestion workers + scoring runner already picked up new tokens — score rows writing for all 20 tokens as of 20:12 UTC. RAVE scoring 8.7/low (correct post-dump). New tokens will have non-zero scores after next hourly structural worker cycle (~top of hour). Dashboard auto-refreshes every 60s, shows composite score, band, per-plane signal breakdown, score history sparkline.

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
| **A** | Infrastructure & DevOps | Paste any output or errors here if it fails.Sonnet 4.6partial | Caddy not installed, CI/CD not tested end-to-end |
| **B** | Database & Schema | d | Schema migrated, RAVE seeded, hypertables created |
| **C** | Data Clients | d | All 6 clients present |
| **D** | Scoring Engine | d | 108 tests passing, RAVE fixture scores ≥75 |
| **E** | Ingestion Workers | d | All 5 workers boot clean |
| **F** | Scoring Runner + Wallet Graph | d | |
| **G** | Alerting Worker | n | Blocked on F |
| **H** | Dashboard SPA | partial | Can start independently |
| **I** | Landing Page | n | Can start independently |
| **J** | Backtest Framework | n | Blocked on D+F |

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
Scoring pipeline live (B-F done), dashboard at :4000 with 20 tokens seeding signals, RAVE 8.7 post-dump correct — next: Workstream G (alerting worker) then finish H (real API hookup), I (landing), J (backtest).

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
