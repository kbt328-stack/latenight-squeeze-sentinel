import { Redis } from 'ioredis';
import { SentinelError, ErrorCodes } from '@sentinel/shared';
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 3 });
  }
  return _redis;
}
export interface RateLimiterOptions { key: string; maxRequests: number; windowSeconds: number; }
export async function acquireToken(opts: RateLimiterOptions): Promise<void> {
  const redis = getRedis();
  const bucketKey = `rl:${opts.key}`;
  const count = await redis.incr(bucketKey);
  if (count === 1) await redis.expire(bucketKey, opts.windowSeconds);
  if (count > opts.maxRequests) {
    throw new SentinelError(ErrorCodes.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded for ${opts.key}: ${count}/${opts.maxRequests}`,
      { key: opts.key, count, maxRequests: opts.maxRequests });
  }
}
