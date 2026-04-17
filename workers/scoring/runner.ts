import { Queue, Worker, type Job } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { logger, SentinelError } from '@sentinel/shared';
import { db, sql } from '@sentinel/db';
import { computeComposite, type SignalValues } from '@sentinel/scoring-engine';
import { getWatchlist, type WatchlistToken } from '../ingestion/_lib/watchlist.js';

const QUEUE_NAME = 'scoring-runner';
const SCORE_CHANNEL = 'sentinel:scores';

const redis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const pubRedis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const queue = new Queue(QUEUE_NAME, { connection: redis });

// Run every minute
await queue.upsertJobScheduler(
  'scoring-cron',
  { pattern: '* * * * *' },
  { name: 'score-all', data: {} },
);

const worker = new Worker<Record<string, never>>(
  QUEUE_NAME,
  async (_job: Job) => {
    const tokens = await getWatchlist();
    logger.info({ event: 'scoring_run_start', tokenCount: tokens.length }, 'Scoring run started');

    for (const token of tokens) {
      try {
        await scoreToken(token);
      } catch (err) {
        logger.error({ err, symbol: token.symbol, event: 'scoring_token_error' }, 'Failed to score token');
      }
    }

    logger.info({ event: 'scoring_run_complete' }, 'Scoring run complete');
  },
  { connection: redis, concurrency: 1 },
);

async function scoreToken(token: WatchlistToken): Promise<void> {
  const scoredAt = new Date();

  const rows = await db.execute<{ signal_id: string; value: number }>(
    sql`
      SELECT DISTINCT ON (signal_id)
        signal_id,
        value
      FROM signals
      WHERE token_id = ${token.id}::uuid
        AND observed_at >= NOW() - INTERVAL '2 hours'
      ORDER BY signal_id, observed_at DESC
    `,
  );

  if (rows.length === 0) {
    logger.warn(
      { symbol: token.symbol, event: 'scoring_no_signals' },
      'No recent signals found — skipping score',
    );
    return;
  }

  const signalValues: SignalValues = {};
  for (const row of rows) {
    signalValues[row.signal_id as keyof SignalValues] = row.value;
  }

  const result = computeComposite(signalValues);

  logger.info(
    {
      event: 'score_computed',
      symbol: token.symbol,
      tokenId: token.id,
      composite: result.composite,
      band: result.band,
      planes: result.planes,
      signalCount: rows.length,
    },
    `Score computed: ${result.composite} (${result.band})`,
  );

  await db.execute(
    sql`
      INSERT INTO scores (token_id, scored_at, composite, plane_scores, band, drawdown_probability, action, contributing_signals)
      VALUES (
        ${token.id}::uuid,
        ${scoredAt.toISOString()},
        ${result.composite},
        ${JSON.stringify(result.planes)}::jsonb,
        ${result.band},
        ${result.drawdownProbability},
        ${result.action},
        ${JSON.stringify(result.contributingSignals).replace('[', '{').replace(']', '}')}
      )
      ON CONFLICT (token_id, scored_at) DO NOTHING
    `,
  );

  const event = {
    tokenId: token.id,
    symbol: token.symbol,
    composite: result.composite,
    band: result.band,
    drawdownProbability: result.drawdownProbability,
    action: result.action,
    planes: result.planes,
    contributingSignals: result.contributingSignals,
    scoredAt: scoredAt.toISOString(),
  };

  await pubRedis.publish(SCORE_CHANNEL, JSON.stringify(event));
}

process.on('SIGTERM', async () => {
  await worker.close();
  await queue.close();
  await redis.quit();
  await pubRedis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  await queue.close();
  await redis.quit();
  await pubRedis.quit();
  process.exit(0);
});

logger.info({ queue: QUEUE_NAME, channel: SCORE_CHANNEL }, 'Scoring runner started');
