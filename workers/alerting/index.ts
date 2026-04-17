import { Queue, Worker, type Job } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { logger } from '@sentinel/shared';
import { db, sql } from '@sentinel/db';
import { sendTelegram, sendDiscord } from './channels.js';
import type { AlertPayload } from './formatter.js';

const SCORE_CHANNEL = 'sentinel:scores';
const DEDUP_TTL_SECONDS = 6 * 60 * 60;

const redis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const sub = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const BAND_RANK: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };

function bandRisen(prev: string, next: string): boolean {
  return (BAND_RANK[next] ?? 0) > (BAND_RANK[prev] ?? 0);
}

async function getPreviousBand(tokenId: string): Promise<string> {
  try {
    const rows = await db.execute(
      sql`SELECT band FROM scores WHERE token_id = ${tokenId} ORDER BY scored_at DESC LIMIT 2`
    );
    const arr = rows as Array<{ band: string }>;
    return arr[1]?.band ?? 'low';
  } catch {
    return 'low';
  }
}

async function isDuplicate(tokenId: string, band: string): Promise<boolean> {
  const key = `alert-dedup:${tokenId}:${band}`;
  const set = await redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
  return set === null;
}

interface ScoreEvent {
  tokenId: string;
  tokenSymbol: string;
  composite: number;
  band: string;
  action: string;
  drawdownProbability: number;
  contributingSignals: string[];
  scoredAt: string;
}

async function dispatch(payload: AlertPayload): Promise<void> {
  const criticalWebhook = process.env['DISCORD_WEBHOOK_URL_CRITICAL'];
  const watchWebhook = process.env['DISCORD_WEBHOOK_URL_WATCH'];
  if (payload.band === 'critical') {
    await sendTelegram(payload);
    if (criticalWebhook) await sendDiscord(payload, criticalWebhook);
  } else if (payload.band === 'high') {
    if (watchWebhook) await sendDiscord(payload, watchWebhook);
  }
}

async function handleScoreEvent(raw: string): Promise<void> {
  let event: ScoreEvent;
  try {
    event = JSON.parse(raw) as ScoreEvent;
  } catch (err) {
    logger.error({ err, raw }, 'Failed to parse score event');
    return;
  }

  const previousBand = await getPreviousBand(event.tokenId);
  if (!bandRisen(previousBand, event.band)) return;

  const deduped = await isDuplicate(event.tokenId, event.band);
  if (deduped) {
    logger.debug({ symbol: event.tokenSymbol, band: event.band }, 'Alert suppressed by dedup');
    return;
  }

  const payload: AlertPayload = {
    tokenSymbol: event.tokenSymbol,
    composite: event.composite,
    band: event.band,
    previousBand,
    contributingSignals: event.contributingSignals,
    scoredAt: new Date(event.scoredAt),
    action: event.action,
    drawdownProbability: event.drawdownProbability,
  };

  logger.info({ symbol: event.tokenSymbol, band: event.band, composite: event.composite }, 'Firing alert');

  try {
    await dispatch(payload);
  } catch (err) {
    logger.error({ err, symbol: event.tokenSymbol }, 'Alert dispatch failed');
  }
}

await sub.subscribe(SCORE_CHANNEL, (err) => {
  if (err) {
    logger.error({ err }, 'Failed to subscribe to score channel');
    process.exit(1);
  }
  logger.info({ channel: SCORE_CHANNEL }, 'Alerting worker started');
});

sub.on('message', (_channel: string, message: string) => {
  handleScoreEvent(message).catch((err) =>
    logger.error({ err }, 'Unhandled error in handleScoreEvent'),
  );
});

async function shutdown(): Promise<void> {
  logger.info('Alerting worker shutting down');
  await sub.unsubscribe();
  await sub.quit();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
