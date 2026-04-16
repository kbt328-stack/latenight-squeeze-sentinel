import { logger, SentinelError, ErrorCodes } from '@sentinel/shared';
import { withRetry, type RetryOptions } from './retry.js';
import { acquireToken, type RateLimiterOptions } from './rate-limit.js';

export interface FetchOptions {
  source: string; endpoint: string; rateLimit: RateLimiterOptions;
  apiKey?: string | null; headers?: Record<string, string>;
  costUnits?: number; retry?: RetryOptions;
}

export async function instrumentedFetch<T>(url: string, opts: FetchOptions): Promise<T> {
  if (opts.apiKey === undefined) {
    throw new SentinelError(ErrorCodes.MISSING_API_KEY, `API key not configured for ${opts.source}`, { source: opts.source });
  }
  return withRetry(async () => {
    await acquireToken(opts.rateLimit);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };
    if (opts.apiKey) headers['Authorization'] = `Bearer ${opts.apiKey}`;
    const start = Date.now();
    const res = await fetch(url, { headers });
    logger.info({ source: opts.source, endpoint: opts.endpoint, latency_ms: Date.now() - start, status: res.status, cost_units: opts.costUnits ?? 1 }, `${opts.source} request`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new SentinelError(res.status === 429 ? ErrorCodes.RATE_LIMIT_EXCEEDED : ErrorCodes.UPSTREAM_ERROR,
        `${opts.source} HTTP ${res.status}: ${body.slice(0, 200)}`, { source: opts.source, status: res.status });
      (err as unknown as { status: number }).status = res.status;
      throw err;
    }
    try { return await res.json() as T; }
    catch { throw new SentinelError(ErrorCodes.RESPONSE_PARSE_ERROR, `${opts.source}: failed to parse JSON`, { url }); }
  }, { ...opts.retry, source: opts.source });
}
