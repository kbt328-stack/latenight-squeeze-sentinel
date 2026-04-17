import { Queue, Worker, type Job } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';
const PLANE = 'structural' as const;
const QUEUE_NAME = `ingestion-${PLANE}`;
const redis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection: redis });
await queue.upsertJobScheduler('structural-cron', { pattern: '0 * * * *' }, { name: 'ingest-structural', data: {} });
const worker = new Worker<Record<string, never>>(QUEUE_NAME, async (_job: Job) => {
  const tokens = await getWatchlist();
  logger.info({ event: 'structural_run_start', tokenCount: tokens.length }, 'Structural ingestion started');
  for (const token of tokens) { try { await ingestToken(token); } catch (err) { logger.error({ err, symbol: token.symbol }, 'Structural token error'); } }
  logger.info({ event: 'structural_run_complete' }, 'Done');
}, { connection: redis, concurrency: 1 });

async function ingestToken(token: WatchlistToken): Promise<void> {
  const now = new Date(); const signals: SignalRow[] = [];
  const { etherscan, goplus, coinglass } = await import('@sentinel/data-clients');
  const eng = await import('@sentinel/scoring-engine');
  try {
    const raw = await etherscan.fetchTokenHolders(token.contractAddress, token.chain as 'ethereum' | 'base');
    const total = raw.result.reduce((s, h) => s + BigInt(h.TokenHolderQuantity), 0n);
    const c = etherscan.normalizeHolderConcentration(raw, total);
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 's1', value: eng.activate_s1(c.top3Pct), rawPayload: { top3Pct: c.top3Pct }, source: 'etherscan', observedAt: now });
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 's2', value: eng.activate_s2(Math.max(0, 100 - c.top10Pct)), rawPayload: { estimatedFloatPct: 100 - c.top10Pct }, source: 'etherscan', observedAt: now });
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['s1', 's2'] }, 'Etherscan failed'); }
  try {
    const oiRaw = await coinglass.fetchOpenInterest(token.symbol);
    const oi = coinglass.normalizeOpenInterest(oiRaw);
    const hasPerp = oi.length > 0 && oi[0]!.totalUsd > 0;
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 's3', value: eng.activate_s3(hasPerp), rawPayload: { hasPerp, oiUsd: oi[0]?.totalUsd ?? 0 }, source: 'coinglass', observedAt: now });
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['s3'] }, 'Coinglass failed'); }
  try {
    const safety = await goplus.fetchTokenSecurity(token.contractAddress, token.chain);
    const n = goplus.normalize(safety, token.contractAddress);
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 's4', value: eng.activate_s4(!n.deployerAppearsDoxxed), rawPayload: { deployerAppearsDoxxed: n.deployerAppearsDoxxed, riskFlags: n.riskFlags }, source: 'goplus', observedAt: now });
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['s4'] }, 'GoPlus failed'); }
  try {
    const { db } = await import('@sentinel/db');
    const rec = await db.query.tokens.findFirst({ where: (t, { eq }) => eq(t.id, token.id) });
    if (rec) { const ageDays = (now.getTime() - new Date(rec.firstSeenAt).getTime()) / 86400000; signals.push({ tokenId: token.id, plane: PLANE, signalId: 's5', value: eng.activate_s5(ageDays), rawPayload: { ageDays }, source: 'db', observedAt: now }); }
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['s5'] }, 'Token age failed'); }
  if (signals.length > 0) await writeSignals(signals);
}
process.on('SIGTERM', async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
process.on('SIGINT',  async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
logger.info({ queue: QUEUE_NAME }, 'Structural worker started');
