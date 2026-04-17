import { Queue, Worker, type Job } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { sql } from '@sentinel/db';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';
const PLANE = 'setup' as const, QUEUE_NAME = `ingestion-${PLANE}`;
const redis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection: redis });
await queue.upsertJobScheduler('setup-cron', { pattern: '*/15 * * * *' }, { name: 'ingest-setup', data: {} });
const worker = new Worker<Record<string, never>>(QUEUE_NAME, async (_job: Job) => {
  const tokens = await getWatchlist();
  for (const token of tokens) { try { await ingestToken(token); } catch (err) { logger.error({ err, symbol: token.symbol }, 'Setup token error'); } }
}, { connection: redis, concurrency: 1 });

async function ingestToken(token: WatchlistToken): Promise<void> {
  const now = new Date(); const signals: SignalRow[] = [];
  const { coingecko, lunarcrush } = await import('@sentinel/data-clients');
  const eng = await import('@sentinel/scoring-engine');
  try {
    if (token.coingeckoId) {
      const [chartRaw, coinRaw] = await Promise.all([coingecko.fetchMarketChart(token.coingeckoId, 90), coingecko.fetchCoin(token.coingeckoId)]);
      const candles = coingecko.normalizeMarketChart(chartRaw), coin = coingecko.normalizeCoin(coinRaw, candles);
      signals.push({ tokenId: token.id, plane: PLANE, signalId: 'u3', value: eng.activate_u3(coin.gainFromLow90d ?? 0), rawPayload: { gainFromLow90d: coin.gainFromLow90d }, source: 'coingecko', observedAt: now });
      signals.push({ tokenId: token.id, plane: PLANE, signalId: 'u2', value: eng.activate_u2(coin.pctChange30d > 50 ? 1 : 0), rawPayload: { pctChange30d: coin.pctChange30d }, source: 'coingecko', observedAt: now });
    }
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['u2', 'u3'] }, 'CoinGecko setup failed'); }
  try {
    const tsRaw = await lunarcrush.fetchTimeSeries(token.symbol.toLowerCase(), 30);
    const pts = lunarcrush.normalize(tsRaw), vel = lunarcrush.computeVelocity(pts);
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 'u4', value: eng.activate_u4(vel.volumeChangePct24h), rawPayload: { volumeChangePct24h: vel.volumeChangePct24h }, source: 'lunarcrush', observedAt: now });
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['u4'] }, 'LunarCrush setup failed'); }
  try {
    const { db } = await import('@sentinel/db');
    const res = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM wallet_token_positions WHERE token_id = ${token.id}::uuid AND pct_of_circulating > 0.01 AND snapshot_at > NOW() - INTERVAL '90 days'`
    );
    const cnt = parseInt((res[0] as { cnt: string } | undefined)?.cnt ?? '0', 10);
    signals.push({ tokenId: token.id, plane: PLANE, signalId: 'u1', value: eng.activate_u1(cnt), rawPayload: { accumulatorCount: cnt }, source: 'db', observedAt: now });
  } catch (err) { logger.warn({ err, symbol: token.symbol, signals: ['u1'] }, 'u1 failed'); }
  if (signals.length > 0) await writeSignals(signals);
}
process.on('SIGTERM', async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
process.on('SIGINT',  async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
logger.info({ queue: QUEUE_NAME }, 'Setup worker started');
