import { logger, SentinelError, type SignalRow } from '@sentinel/shared';
import { sql } from '@sentinel/db';
export async function writeSignals(signals: SignalRow[]): Promise<void> {
  if (signals.length === 0) return;
  try {
    const { db } = await import('@sentinel/db');
    for (const s of signals) {
      await db.execute(
        sql`INSERT INTO signals (token_id, plane, signal_id, value, raw_payload, source, observed_at)
            VALUES (${s.tokenId}, ${s.plane}, ${s.signalId}, ${s.value}, ${JSON.stringify(s.rawPayload)}::jsonb, ${s.source}, ${s.observedAt.toISOString()})
            ON CONFLICT (token_id, signal_id, observed_at) DO NOTHING`
      );
    }
    logger.info({ event: 'signals_written', count: signals.length }, 'Signals persisted');
  } catch (err) {
    logger.error({ err, event: 'signals_write_failed' }, 'Failed to write signals');
    throw new SentinelError('DB_QUERY_FAILED', 'Failed to write signals', { cause: String(err) });
  }
}
