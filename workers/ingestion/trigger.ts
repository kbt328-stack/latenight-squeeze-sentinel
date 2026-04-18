import { Queue, Worker, type Job } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { sql } from '@sentinel/db';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';

const PLANE = 'trigger' as const, QUEUE_NAME = `ingestion-${PLANE}`;
const redis = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection: redis });
await queue.upsertJobScheduler('trigger-cron', { pattern: '* * * * *' }, { name: 'ingest-trigger', data: {} });

const worker = new Worker<Record<string, never>>(QUEUE_NAME, async (_job: Job) => {
  const tokens = await getWatchlist();
  for (const token of tokens) {
    try { await ingestToken(token); }
    catch (err) { logger.error({ err, symbol: token.symbol }, 'Trigger token error'); }
  }
}, { connection: redis, concurrency: 1 });

// Known CEX deposit addresses for t1
const EXCHANGES = [
  '0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2',
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40',
  '0x9696f59e4d72e237be84ffd425dcad154bf96976',
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
];

// Helper: push signal with explicit null for "data unavailable"
function sig(tokenId: string, signalId: string, value: number | null, rawPayload: object, source: string, observedAt: Date): SignalRow {
  return { tokenId, plane: PLANE, signalId, value, rawPayload, source, observedAt };
}

async function ingestToken(token: WatchlistToken): Promise<void> {
  const now = new Date();
  const signals: SignalRow[] = [];
  const { coinglass, etherscan, coingecko } = await import('@sentinel/data-clients');
  const eng = await import('@sentinel/scoring-engine');

  // t2: funding rate — null if no futures market, 0 if market exists but rate is neutral
  try {
    const raw = await coinglass.fetchFundingRate(token.symbol);
    const f = coinglass.normalizeFundingRate(raw, token.symbol);
    if (f === null) {
      logger.info({ symbol: token.symbol }, 't2: no futures market — writing null');
      signals.push(sig(token.id, 't2', null, { noFuturesMarket: true }, 'coinglass', now));
    } else {
      signals.push(sig(token.id, 't2', eng.activate_t2(f.avgAnnualizedRate), { avgAnnualizedRate: f.avgAnnualizedRate }, 'coinglass', now));
    }
  } catch (err) {
    logger.warn({ err, symbol: token.symbol }, 't2 fetch failed — writing null');
    signals.push(sig(token.id, 't2', null, { error: true }, 'coinglass', now));
  }

  // t3: long/short ratio — null if no futures market
  try {
    const raw = await coinglass.fetchLongShortRatio(token.symbol);
    const ls = coinglass.normalizeLongShortRatio(raw);
    if (ls === null) {
      logger.info({ symbol: token.symbol }, 't3: no futures market — writing null');
      signals.push(sig(token.id, 't3', null, { noFuturesMarket: true }, 'coinglass', now));
    } else {
      signals.push(sig(token.id, 't3', eng.activate_t3(ls.shortToLongRatio), { shortToLongRatio: ls.shortToLongRatio }, 'coinglass', now));
    }
  } catch (err) {
    logger.warn({ err, symbol: token.symbol }, 't3 fetch failed — writing null');
    signals.push(sig(token.id, 't3', null, { error: true }, 'coinglass', now));
  }

  // t4: open interest vs market cap — null if no futures market
  try {
    const oiRaw = await coinglass.fetchOpenInterest(token.symbol);
    const oi = coinglass.normalizeOpenInterest(oiRaw, token.symbol);
    if (oi === null) {
      logger.info({ symbol: token.symbol }, 't4: no futures market — writing null');
      signals.push(sig(token.id, 't4', null, { noFuturesMarket: true }, 'coinglass', now));
    } else {
      let mcUsd = 0;
      try {
        if (token.coingeckoId) {
          const cr = await coingecko.fetchCoin(token.coingeckoId);
          mcUsd = coingecko.normalizeCoin(cr).marketCapUsd;
        }
      } catch (mcErr) { logger.warn({ err: mcErr, coingeckoId: token.coingeckoId }, 'mcap fetch failed'); }
      const oiToMc = mcUsd > 0 ? (oi.totalUsd / mcUsd) * 100 : 0;
      signals.push(sig(token.id, 't4', eng.activate_t4(oiToMc), { oiUsd: oi.totalUsd, mcUsd, oiToMc }, 'coinglass', now));
    }
  } catch (err) {
    logger.warn({ err, symbol: token.symbol }, 't4 fetch failed — writing null');
    signals.push(sig(token.id, 't4', null, { error: true }, 'coinglass', now));
  }

  // t1: accumulator wallet deposits to exchanges
  try {
    const { db } = await import('@sentinel/db');
    const accWallets = await db.execute(
      sql`SELECT address FROM wallets WHERE 'early_accumulator' = ANY(labels) LIMIT 20`
    ) as Array<{ address: string }>;
    let deposits = 0;
    const cutoff = Math.floor((Date.now() - 3_600_000) / 1000);
    for (const w of accWallets.slice(0, 5)) {
      try {
        const txRaw = await etherscan.fetchTokenTransfers(token.contractAddress, w.address, token.chain as 'ethereum' | 'base');
        const txs = etherscan.normalizeTransfers(txRaw);
        deposits += txs.filter(tx => tx.timestamp.getTime() / 1000 > cutoff && EXCHANGES.includes(tx.to)).length;
      } catch { /* per-wallet non-fatal */ }
    }
    signals.push(sig(token.id, 't1', eng.activate_t1(deposits), { deposits }, 'etherscan', now));
  } catch (err) {
    logger.warn({ err, symbol: token.symbol }, 't1 failed — writing null');
    signals.push(sig(token.id, 't1', null, { error: true }, 'etherscan', now));
  }

  // t5: stubbed — intentionally null (no X API configured)
  signals.push(sig(token.id, 't5', null, { stub: true }, 'stub', now));

  if (signals.length > 0) await writeSignals(signals);
}

process.on('SIGTERM', async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
process.on('SIGINT',  async () => { await worker.close(); await queue.close(); await redis.quit(); process.exit(0); });
logger.info({ queue: QUEUE_NAME }, 'Trigger worker started');
