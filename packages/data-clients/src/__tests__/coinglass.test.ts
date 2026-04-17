import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('CoinglassClient', () => {
  beforeEach(() => {
    process.env['COINGLASS_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing (at fetch time, not construction)', async () => {
    delete process.env['COINGLASS_API_KEY'];
    const { CoinglassClient } = await import('../coinglass.js');
    await expect(new CoinglassClient().fetchFundingRate('RAVE')).rejects.toThrow();
  });

  it('normalizeFundingRate returns array with avgAnnualizedRate', async () => {
    const { CoinglassClient } = await import('../coinglass.js');
    const client = new CoinglassClient();
    const raw = {
      code: '0',
      data: [{
        symbol: 'RAVE',
        uMarginList: [
          { exchangeName: 'Bitget', rate: -180, nextFundingTime: 1700000000 },
          { exchangeName: 'OKX',    rate: -200, nextFundingTime: 1700000000 },
        ],
      }],
    };
    const result = client.normalizeFundingRate(raw);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.symbol).toBe('RAVE');
    expect(result[0]?.avgAnnualizedRate).toBe(-190);
    expect(result[0]?.byExchange).toHaveLength(2);
  });

  it('normalizeFundingRate returns empty array when data is empty', async () => {
    const { CoinglassClient } = await import('../coinglass.js');
    const client = new CoinglassClient();
    const result = client.normalizeFundingRate({ code: '0', data: [] });
    expect(result).toHaveLength(0);
  });

  it('normalizeLiquidations computes shortToLongRatio correctly', async () => {
    const { CoinglassClient } = await import('../coinglass.js');
    const client = new CoinglassClient();
    const raw = {
      code: '0',
      data: [{
        symbol: 'RAVE',
        longLiquidationUsd: 100_000,
        shortLiquidationUsd: 350_000,
        t: 1700000000,
      }],
    };
    const result = client.normalizeLiquidations(raw);
    expect(result[0]?.shortToLongRatio).toBeCloseTo(3.5);
    expect(result[0]?.timestamp).toBeInstanceOf(Date);
  });

  it('normalizeLiquidations shortToLongRatio is 0 when longLiq is 0', async () => {
    const { CoinglassClient } = await import('../coinglass.js');
    const client = new CoinglassClient();
    const raw = {
      code: '0',
      data: [{ symbol: 'RAVE', longLiquidationUsd: 0, shortLiquidationUsd: 500_000, t: 1700000000 }],
    };
    const result = client.normalizeLiquidations(raw);
    expect(result[0]?.shortToLongRatio).toBe(0);
  });
});
