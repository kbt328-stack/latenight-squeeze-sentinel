import { logger, SentinelError, ErrorCodes } from '@sentinel/shared';
export interface RetryOptions { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number; source?: string; }

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxRetries = opts.maxRetries ?? 5;
  const baseDelay = opts.baseDelayMs ?? 2_000;
  const maxDelay = opts.maxDelayMs ?? 32_000;
  const src = opts.source ?? 'unknown';
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (isNonRetryable(err)) throw err;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
        logger.warn({ source: src, attempt, delay_ms: delay }, 'Retryable error — backing off');
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw new SentinelError(ErrorCodes.JOB_DEAD_LETTERED, `${src}: exhausted ${maxRetries} retries`, { lastErr });
}

function isNonRetryable(err: unknown): boolean {
  if (err instanceof SentinelError && err.code === ErrorCodes.MISSING_API_KEY) return true;
  const status = (err as { status?: number })?.status;
  if (status !== undefined && status >= 400 && status < 500 && status !== 429) return true;
  return false;
}
