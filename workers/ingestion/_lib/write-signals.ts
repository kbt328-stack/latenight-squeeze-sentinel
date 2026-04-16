import { logger, SentinelError, type SignalRow } from '@sentinel/shared';
export async function writeSignals(signals:SignalRow[]):Promise<void> {
  if(signals.length===0)return;
  try {
    const { db } = await import('@sentinel/db');
    for(const s of signals){
      await db.execute(
        `INSERT INTO signals (token_id, plane, signal_id, value, raw_payload, source, observed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (token_id, signal_id, observed_at) DO NOTHING`,
        [s.tokenId,s.plane,s.signalId,s.value,JSON.stringify(s.rawPayload),s.source,s.observedAt]
      );
    }
    logger.info({event:'signals_written',count:signals.length},'Signals persisted');
  } catch(err) {
    logger.error({err,event:'signals_write_failed'},'Failed to write signals');
    throw new SentinelError('DB_QUERY_FAILED','Failed to write signals',{cause:String(err)});
  }
}
