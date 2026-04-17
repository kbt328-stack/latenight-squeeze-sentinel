import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('LunarCrushClient', () => {
  beforeEach(() => {
    process.env['LUNARCRUSH_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing', async () => {
    delete process.env['LUNARCRUSH_API_KEY'];
    const { LunarCrushClient } = await import('../lunarcrush.js');
    expect(() => new LunarCrushClient().fetchTimeSeries('rave')).toThrow();
  });

  it('normalize maps raw points to SocialDataPoint shape', async () => {
    const { LunarCrushClient } = await import('../lunarcrush.js');
    const client = new LunarCrushClient();
    const raw = {
      config: { symbol: 'rave' },
      data: [{
        time: 1700000000, open: 0.05, close: 0.06, high: 0.07, low: 0.04,
        volume_24h: 100000, social_volume: 500, social_score: 80,
        average_sentiment: 3.2, tweet_volume: 200, reddit_posts: 10,
      }],
    };
    const result = client.normalize(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.socialVolume).toBe(500);
    expect(result[0]?.timestamp).toBeInstanceOf(Date);
  });

  it('computeVelocity returns zeros when insufficient data', async () => {
    const { LunarCrushClient } = await import('../lunarcrush.js');
    const client = new LunarCrushClient();
    const result = client.computeVelocity([]);
    expect(result.volumeChangePct24h).toBe(0);
    expect(result.currentVolume).toBe(0);
  });
});
