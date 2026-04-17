import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('CoinGeckoClient', () => {
  beforeEach(() => {
    process.env['COINGECKO_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing', async () => {
    delete process.env['COINGECKO_API_KEY'];
    const { CoinGeckoClient } = await import('../coingecko.js');
    expect(() => new CoinGeckoClient()).toThrow();
  });

  it('getCoin returns data with id field', async () => {
    const { instrumentedFetch } = await import('../_lib/fetch.js');
    vi.mocked(instrumentedFetch).mockResolvedValueOnce({
      id: 'rave', symbol: 'rave',
      market_data: { current_price: { usd: 0.05 }, circulating_supply: 1000000 },
    });
    const { CoinGeckoClient } = await import('../coingecko.js');
    const result = await new CoinGeckoClient().getCoin('rave');
    expect(result).toHaveProperty('id');
  });

  it('getMarketChartRange returns prices array', async () => {
    const { instrumentedFetch } = await import('../_lib/fetch.js');
    vi.mocked(instrumentedFetch).mockResolvedValueOnce({
      prices: [[1700000000, 0.05]], total_volumes: [[1700000000, 50000]],
    });
    const { CoinGeckoClient } = await import('../coingecko.js');
    const result = await new CoinGeckoClient().getMarketChartRange('rave', 1700000000, 1700086400);
    expect(result.prices.length).toBeGreaterThan(0);
  });
});
