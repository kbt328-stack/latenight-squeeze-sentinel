import { logger } from '@sentinel/shared';
import { db, sql } from '@sentinel/db';

export interface AccumulatorResult {
  walletAddress: string;
  tokenId: string;
  tokenSymbol: string;
  gainedPct: number;
  windowStart: Date;
  windowEnd: Date;
  labeled: boolean;
}

export async function detectAccumulators(
  tokenId: string | null = null,
  lookbackDays = 90,
): Promise<AccumulatorResult[]> {
  logger.info(
    { event: 'accumulation_detect_start', tokenId, lookbackDays },
    'Running accumulation detector',
  );

  const tokenFilter = tokenId ? sql`AND wtp.token_id = ${tokenId}::uuid` : sql``;
  const cutoff = new Date(Date.now() - lookbackDays * 86400 * 1000);

  const rows = await db.execute<{
    wallet_address: string;
    token_id: string;
    token_symbol: string;
    gained_pct: number;
    window_start: Date;
    window_end: Date;
  }>(
    sql`
      WITH position_changes AS (
        SELECT
          wtp.wallet_address,
          wtp.token_id,
          t.symbol AS token_symbol,
          wtp.snapshot_at,
          wtp.pct_of_circulating,
          LAG(wtp.pct_of_circulating) OVER (
            PARTITION BY wtp.wallet_address, wtp.token_id
            ORDER BY wtp.snapshot_at
          ) AS prev_pct,
          LAG(wtp.snapshot_at) OVER (
            PARTITION BY wtp.wallet_address, wtp.token_id
            ORDER BY wtp.snapshot_at
          ) AS prev_snapshot_at
        FROM wallet_token_positions wtp
        JOIN tokens t ON t.id = wtp.token_id
        WHERE wtp.snapshot_at >= ${cutoff}
        ${tokenFilter}
      ),
      low_score_windows AS (
        SELECT DISTINCT
          pc.wallet_address,
          pc.token_id,
          pc.token_symbol,
          (pc.pct_of_circulating - pc.prev_pct) AS gained_pct,
          pc.prev_snapshot_at AS window_start,
          pc.snapshot_at AS window_end
        FROM position_changes pc
        LEFT JOIN scores s
          ON s.token_id = pc.token_id
          AND s.scored_at BETWEEN pc.prev_snapshot_at AND pc.snapshot_at
        WHERE pc.prev_pct IS NOT NULL
          AND (pc.pct_of_circulating - pc.prev_pct) > 1.0
          AND (s.composite IS NULL OR s.composite < 35)
      )
      SELECT
        wallet_address,
        token_id::text,
        token_symbol,
        gained_pct,
        window_start,
        window_end
      FROM low_score_windows
      ORDER BY gained_pct DESC
    `,
  );

  const results: AccumulatorResult[] = [];

  for (const row of rows) {
    const result: AccumulatorResult = {
      walletAddress: row.wallet_address,
      tokenId: row.token_id,
      tokenSymbol: row.token_symbol,
      gainedPct: row.gained_pct,
      windowStart: new Date(row.window_start),
      windowEnd: new Date(row.window_end),
      labeled: false,
    };

    try {
      await db.execute(
        sql`
          INSERT INTO wallets (address, chain, labels, flags, last_updated)
          VALUES (
            ${row.wallet_address},
            'ethereum',
            ARRAY['early_accumulator']::text[],
            ${JSON.stringify({ detectedAt: new Date().toISOString(), tokenId: row.token_id, gainedPct: row.gained_pct })}::jsonb,
            NOW()
          )
          ON CONFLICT (address) DO UPDATE SET
            labels = (
              SELECT ARRAY(
                SELECT DISTINCT unnest(wallets.labels || ARRAY['early_accumulator']::text[])
              )
            ),
            last_updated = NOW()
        `,
      );
      result.labeled = true;
      logger.info(
        { event: 'accumulator_labeled', walletAddress: row.wallet_address, tokenSymbol: row.token_symbol, gainedPct: row.gained_pct },
        `Labeled ${row.wallet_address} as early_accumulator`,
      );
    } catch (err) {
      logger.error({ err, walletAddress: row.wallet_address, event: 'accumulator_label_failed' }, 'Failed to label accumulator wallet');
    }

    results.push(result);
  }

  logger.info({ event: 'accumulation_detect_complete', found: results.length }, `Accumulation detection complete: ${results.length} wallets found`);
  return results;
}
