#!/usr/bin/env bash
set -e
cd "$(git rev-parse --show-toplevel)"

echo ""
echo "=== Squeeze Sentinel — End of Session ==="
echo ""

# Get today's date
TODAY=$(date -u +%Y-%m-%d)

# Prompt for summary
read -rp "One-line summary of what was done this session: " SUMMARY
echo ""

# Show current workstream status and let user update
echo "Current workstream status (press enter to keep, or type new status):"
echo "Options: ✅ Done | 🟡 Partial | ❌ Not done"
echo ""

STREAMS=("A:Infrastructure" "B:Database" "C:Data_Clients" "D:Scoring_Engine" "E:Ingestion_Workers" "F:Scoring_Runner" "G:Alerting" "H:Dashboard" "I:Landing" "J:Backtest")
declare -A STATUS
for S in "${STREAMS[@]}"; do
  KEY="${S%%:*}"
  NAME="${S##*:}"
  CURRENT=$(grep "| \*\*${KEY}\*\*" SESSION_STATE.md | awk -F'|' '{print $3}' | xargs)
  read -rp "  Workstream ${KEY} (${NAME}) [${CURRENT}]: " INPUT
  STATUS[$KEY]="${INPUT:-$CURRENT}"
done

echo ""
read -rp "Next session priority (one line): " NEXT_PRIORITY
echo ""

# Rebuild SESSION_STATE.md
cat > SESSION_STATE.md << EOF
# Squeeze Sentinel — Session State
> **Agents and humans: read this before touching anything. Update it before ending any session.**
> Last updated: ${TODAY}
> Last session: ${SUMMARY}

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
\`\`\`bash
export \$(cat .env | grep -v "^#" | grep -v "^$" | grep -v "ghp_" | xargs)
\`\`\`

## Running Docker Containers
| Container | Status |
|---|---|
| sentinel-postgres | ✅ Up |
| sentinel-redis | ✅ Up |
| traefik | ✅ Up (pre-existing) |

## Workstream Status
| Stream | Name | Status | Notes |
|---|---|---|---|
| **A** | Infrastructure & DevOps | ${STATUS[A]} | Caddy not installed, CI/CD not tested end-to-end |
| **B** | Database & Schema | ${STATUS[B]} | Schema migrated, RAVE seeded, hypertables created |
| **C** | Data Clients | ${STATUS[C]} | All 6 clients present |
| **D** | Scoring Engine | ${STATUS[D]} | 108 tests passing, RAVE fixture scores ≥75 |
| **E** | Ingestion Workers | ${STATUS[E]} | All 5 workers boot clean |
| **F** | Scoring Runner + Wallet Graph | ${STATUS[F]} | |
| **G** | Alerting Worker | ${STATUS[G]} | Blocked on F |
| **H** | Dashboard SPA | ${STATUS[H]} | Can start independently |
| **I** | Landing Page | ${STATUS[I]} | Can start independently |
| **J** | Backtest Framework | ${STATUS[J]} | Blocked on D+F |

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
${NEXT_PRIORITY}

## Milestone Tracking
| Milestone | Target | Status |
|---|---|---|
| M0: Scoring engine + DB live | Week 1 | ✅ Done 2026-04-16 |
| M1: Bootstrap scoring live | Week 3 | 🟡 In progress |
| M2: All workstreams, alerting live | Week 6 | 🔴 Not started |
| M3: Backtest corpus >15 cases | Week 9 | 🔴 Not started |
| M4: Pro tier + trading signal API | Week 12 | 🔴 Not started |
EOF

# Commit and push
git add SESSION_STATE.md
git commit -m "chore: end-of-session state update — ${SUMMARY}"
git push

echo ""
echo "✅ Session state committed and pushed."
echo "   Safe to disconnect."
