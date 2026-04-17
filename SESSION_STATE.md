# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: 2026-04-17
> Last session: Summary for the prompt: "Workstream G complete. Alerting worker boots, subscribes to Redis score:events, detects band escalations, deduplicates via 6h window, sends Telegram alerts. Fixed: db.execute returns array directly (not {rows:[]}), alerts.score_id made nullable, Telegram bot token and chat ID configured. RAVE test alert delivered successfully. Next: add alerting worker to workers dev script, commit G, then Workstream H real API hookup and I landing page."

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
| **A** | Infrastructure & DevOps | partial | Caddy not installed, CI/CD not tested end-to-end |
| **B** | Database & Schema | d | Schema migrated, RAVE seeded, hypertables created |
| **C** | Data Clients | d | All 6 clients present |
| **D** | Scoring Engine | d | 108 tests passing, RAVE fixture scores ≥75 |
| **E** | Ingestion Workers | d | All 5 workers boot clean |
| **F** | Scoring Runner + Wallet Graph | ? | |
| **G** | Alerting Worker | d | Blocked on F |
| **H** | Dashboard SPA | x | Can start independently |
| **I** | Landing Page | x | Can start independently |
| **J** | Backtest Framework | x | Blocked on D+F |

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
Next session: wire alerting into pnpm dev:workers, commit G, then H real API hookup + I landing page.

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
