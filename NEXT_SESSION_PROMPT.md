
---

## Session 2026-04-17 Handoff

### Completed this session
- Workstream G (alerting worker) — fully built and booting
- All 7 workers boot together via `pnpm dev:workers`
- Fixed: watchlist RAVE token ID was empty string → `41cc3204-976e-4e87-8e15-fee1cb8c585b`
- Fixed: coingecko_id key was camelCase in normalizer, snake_case in DB
- Fixed: t3 was hardcoded `Promise.resolve([])` stub — replaced with real `fetchLongShortRatio` call

### Known blockers
- Coinglass $80 plan: t3 (long/short) and q1/q2 (liquidations) paywalled at v3 — these signals will stay 0 until upgrade or workaround
- Trigger plane composite still 0 at session end — verify first thing next session
- LUNARCRUSH_API_KEY showing as missing in logs — verify it's set correctly in .env

### First thing next session
1. Load env: `export $(grep -v "^#" ~/squeeze-sentinel/.env | grep -v "^$" | grep -v "ghp_" | grep "=" | xargs)`
2. Start workers: `cd ~/squeeze-sentinel/workers && nohup pnpm dev > /tmp/workers.log 2>&1 &`
3. Wait 90 seconds then check: `docker exec sentinel-postgres psql -U sentinel -d sentinel -c "SELECT s.composite, s.band, s.plane_scores, s.scored_at FROM scores s JOIN tokens t ON t.id = s.token_id WHERE t.symbol = 'RAVE' ORDER BY s.scored_at DESC LIMIT 5;"`
4. If trigger still 0: `tail -50 /tmp/workers.log | grep -E "trigger|t2|t4|RAVE|error"`
5. If trigger working: move to Workstream H (dashboard) — `apps/api/` is empty, needs Fastify routes before dashboard can show real data

### Priority order
1. Confirm trigger signals landing (t2 should be non-zero, t4 depends on mcap fetch working)
2. Build `apps/api/` — Fastify server with routes: `/tokens`, `/tokens/:symbol/scores`, `/tokens/:symbol/signals`, `/alerts`
3. Workstream H dashboard wired to real API
4. Workstream I landing page
