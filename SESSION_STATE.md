# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17
> Last session: Session 2026-04-17: pm2 installed, all 6 workers running persistently via ecosystem.config.cjs with dotenv env passthrough. Coinglass upgraded to Startup — /open_interest and /funding working (200), /globalLongShortAccountRatio still 500 (not on Startup tier). Composite non-zero at 2.61 — pipeline proven end-to-end. s5=87 confirmed structural worker firing correctly. Missing: t2/t4 values not inserting despite 200 responses (normalization or activation issue), s1-s4 not yet seen, long/short ratio needs Standard tier or stub. Next: debug why t2/t4 fetch 200 but write 0, fix globalLongShortAccountRatio to fail-fast instead of retrying, check s1-s4 structural signals. Always add the check list details because i dont know what to write.

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
| **A** | Infrastructure & DevOps | ?? | Caddy not installed, CI/CD not tested end-to-end |
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
Session 2026-04-17: pm2 installed, all 6 workers running persistently via ecosystem.config.cjs with dotenv env passthrough. Coinglass upgraded to Startup — /open_interest and /funding working (200), /globalLongShortAccountRatio still 500 (not on Startup tier). Composite non-zero at 2.61 — pipeline proven end-to-end. s5=87 confirmed structural worker firing correctly. Missing: t2/t4 values not inserting despite 200 responses (normalization or activation issue), s1-s4 not yet seen, long/short ratio needs Standard tier or stub. Next: debug why t2/t4 fetch 200 but write 0, fix globalLongShortAccountRatio to fail-fast instead of retrying, check s1-s4 structural signals.

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
