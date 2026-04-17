import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('LunarCrushClient', () => {
  beforeEach(() => {
    process.env['LUNARCRUSH_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws (async) when API key is missing', async () => {
    delete process.env['LUNARCRUSH_API_KEY'];
    const { LunarCrushClient } = await import('../lunarcrush.js');
    await expect(new LunarCrushClient().fetchTimeSeries('rave')).rejects.toThrow();
  });

  it('normalize maps raw points to SocialDataPoint shape', async () => {
    const { LunarCrushClient } = await import('../lunarcrush.js');
    const client = new LunarCrushClient();
    const raw = {
      config: { symbol: 'rave' },
      data: [{
        time: 1700000000, open: 0.05, close: 0.06, high: 0.07, low: 0.04,
        volume_24h: 100_000, social_volume: 500, social_score: 80,
        average_sentiment: 3.2, tweet_volume: 200, reddit_posts: 10,
      }],
    };
    const result = client.normalize(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.socialVolume).toBe(500);
    expect(result[0]?.socialScore).toBe(80);
    expect(result[0]?.sentiment).toBe(3.2);
    expect(result[0]?.tweetVolume).toBe(200);
    expect(result[0]?.timestamp).toBeInstanceOf(Date);
    expect(result[0]?.timestamp.getTime()).toBe(1700000000 * 1000);
  });

  it('computeVelocity returns zeros when insufficient data', async () => {
    const { LunarCrushClient } = await import('../lunarcrush.js');
    const client = new LunarCrushClient();
    expect(client.computeVelocity([]).volumeChangePct24h).toBe(0);
    expect(client.computeVelocity([]).currentVolume).toBe(0);
  });

  it('computeVelocity detects volume spike vs prior 24h', async () => {
    const { LunarCrushClient } = await import('../lunarcrush.js');
    const client = new LunarCrushClient();
    const low = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(1700000000000 + i * 3_600_000),
      socialVolume: 100, socialScore: 50, sentiment: 3, tweetVolume: 20,
    }));
    const high = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(1700086400000 + i * 3_600_000),
      socialVolume: 1_000, socialScore: 90, sentiment: 4, tweetVolume: 200,
    }));
    const result = client.computeVelocity([...low, ...high]);
    expect(result.volumeChangePct24h).toBeCloseTo(900);
    expect(result.currentVolume).toBe(1_000);
  });
});
