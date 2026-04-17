# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17
> Last session: Workstream G complete — alerting worker built, boots clean, subscribed to sentinel:scores Redis channel, wired into pnpm dev:workers. All 7 workers (alerting + 5 ingestion planes + scoring runner) booting together cleanly. Fixed watchlist RAVE token ID (was empty string), coingecko_id snake_case key mismatch, replaced t3 stub with real fetchLongShortRatio call. Coinglass $80 plan blocks t3 (long/short ratio) and q1/q2 (liquidations) — both require v3 API. t4 OI data confirmed available on v2. LUNARCRUSH_API_KEY needs verification in .env. Trigger plane still reading 0 at session end — BullMQ cron timing suspected, needs one full minute cycle to confirm. Next: verify trigger signals landing for RAVE with real data, then H (dashboard) and I (landing page).

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
| **A** | Infrastructure & DevOps | Infrastructure & DevOps | Caddy not installed, CI/CD not tested end-to-end |
| **B** | Database & Schema | Database & Schema | Schema migrated, RAVE seeded, hypertables created |
| **C** | Data Clients | Data Clients | All 6 clients present |
| **D** | Scoring Engine | Scoring Engine | 108 tests passing, RAVE fixture scores ≥75 |
| **E** | Ingestion Workers | Ingestion Workers | All 5 workers boot clean |
| **F** | Scoring Runner + Wallet Graph | Scoring Runner + Wallet Graph | |
| **G** | Alerting Worker | Alerting Worker | Blocked on F |
| **H** | Dashboard SPA | Dashboard SPA | Can start independently |
| **I** | Landing Page | Landing Page | Can start independently |
| **J** | Backtest Framework | Backtest Framework | Blocked on D+F |

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
Workstream G complete — alerting worker built, boots clean, subscribed to sentinel:scores Redis channel, wired into pnpm dev:workers. All 7 workers (alerting + 5 ingestion planes + scoring runner) booting together cleanly. Fixed watchlist RAVE token ID (was empty string), coingecko_id snake_case key mismatch, replaced t3 stub with real fetchLongShortRatio call. Coinglass $80 plan blocks t3 (long/short ratio) and q1/q2 (liquidations) — both require v3 API. t4 OI data confirmed available on v2. LUNARCRUSH_API_KEY needs verification in .env. Trigger plane still reading 0 at session end — BullMQ cron timing suspected, needs one full minute cycle to confirm. Next: verify trigger signals landing for RAVE with real data, then H (dashboard) and I (landing page).

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
