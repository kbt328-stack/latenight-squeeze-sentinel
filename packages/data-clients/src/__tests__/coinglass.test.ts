import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('CoinglassClient', () => {
  beforeEach(() => {
    process.env['COINGLASS_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing', async () => {
    delete process.env['COINGLASS_API_KEY'];
    const { CoinglassClient } = await import('../coinglass.js');
    expect(() => new CoinglassClient()).toThrow();
  });

  it('getFundingRateHistory returns array on success', async () => {
    const { instrumentedFetch } = await import('../_lib/fetch.js');
    vi.mocked(instrumentedFetch).mockResolvedValueOnce({ data: [{ t: 1700000000, r: -0.05 }] });
    const { CoinglassClient } = await import('../coinglass.js');
    const result = await new CoinglassClient().getFundingRateHistory('RAVE');
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when data missing', async () => {
    const { instrumentedFetch } = await import('../_lib/fetch.js');
    vi.mocked(instrumentedFetch).mockResolvedValueOnce({});
    const { CoinglassClient } = await import('../coinglass.js');
    const result = await new CoinglassClient().getFundingRateHistory('RAVE');
    expect(result).toHaveLength(0);
  });
});
