import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('CoinGeckoClient', () => {
  beforeEach(() => {
    process.env['COINGECKO_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing (at fetch time, not construction)', async () => {
    delete process.env['COINGECKO_API_KEY'];
    const { CoinGeckoClient } = await import('../coingecko.js');
    await expect(new CoinGeckoClient().fetchCoin('rave')).rejects.toThrow();
  });

  it('normalizeCoin returns CoinSummary with id field', async () => {
    const { CoinGeckoClient } = await import('../coingecko.js');
    const client = new CoinGeckoClient();
    const raw = {
      id: 'rave', symbol: 'rave', name: 'RaveDAO',
      market_data: {
        current_price: { usd: 0.05 }, market_cap: { usd: 500_000 },
        total_volume: { usd: 50_000 }, circulating_supply: 10_000_000,
        total_supply: 100_000_000, price_change_percentage_24h: 5.2,
        price_change_percentage_7d: -10.1, price_change_percentage_30d: 200.0,
        ath: { usd: 0.12 }, ath_date: { usd: '2026-04-10T00:00:00.000Z' },
      },
    };
    const result = client.normalizeCoin(raw);
    expect(result).toHaveProperty('id', 'rave');
    expect(result.currentPriceUsd).toBe(0.05);
    expect(result.totalSupply).toBe(100_000_000);
    expect(result.gainFromLow90d).toBeNull();
  });

  it('normalizeCoin computes gainFromLow90d when price history provided', async () => {
    const { CoinGeckoClient } = await import('../coingecko.js');
    const client = new CoinGeckoClient();
    const raw = {
      id: 'rave', symbol: 'rave', name: 'RaveDAO',
      market_data: {
        current_price: { usd: 0.10 }, market_cap: { usd: 1_000_000 },
        total_volume: { usd: 100_000 }, circulating_supply: 10_000_000,
        total_supply: 100_000_000, price_change_percentage_24h: 0,
        price_change_percentage_7d: 0, price_change_percentage_30d: 0,
        ath: { usd: 0.12 }, ath_date: { usd: '2026-04-10T00:00:00.000Z' },
      },
    };
    const history = [
      { timestamp: new Date(), price: 0.05, volume: 10_000, marketCap: 500_000 },
      { timestamp: new Date(), price: 0.04, volume: 8_000,  marketCap: 400_000 },
    ];
    const result = client.normalizeCoin(raw, history);
    expect(result.gainFromLow90d).toBeCloseTo(150);
  });

  it('normalizeMarketChart returns PriceCandle array', async () => {
    const { CoinGeckoClient } = await import('../coingecko.js');
    const client = new CoinGeckoClient();
    const raw = {
      prices:        [[1700000000000, 0.05], [1700003600000, 0.06]],
      market_caps:   [[1700000000000, 500_000], [1700003600000, 600_000]],
      total_volumes: [[1700000000000, 50_000],  [1700003600000, 60_000]],
    };
    const result = client.normalizeMarketChart(raw);
    expect(result).toHaveLength(2);
    expect(result[0]?.price).toBe(0.05);
    expect(result[0]?.timestamp).toBeInstanceOf(Date);
    expect(result[1]?.volume).toBe(60_000);
  });
});
