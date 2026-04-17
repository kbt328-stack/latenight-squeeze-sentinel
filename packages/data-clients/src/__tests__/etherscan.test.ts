import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('EtherscanClient', () => {
  beforeEach(() => {
    process.env['ETHERSCAN_API_KEY'] = 'test-key';
    vi.resetModules();
  });

  it('throws when API key is missing for chain', async () => {
    delete process.env['ETHERSCAN_API_KEY'];
    delete process.env['BASESCAN_API_KEY'];
    const { EtherscanClient } = await import('../etherscan.js');
    const client = new EtherscanClient();
    await expect(client.fetchTokenHolders('0xabc', 'ethereum')).rejects.toThrow();
  });

  it('normalizeHolderConcentration calculates top3Pct correctly', async () => {
    const { EtherscanClient } = await import('../etherscan.js');
    const client = new EtherscanClient();
    const raw = {
      status: '1', message: 'OK',
      result: [
        { TokenHolderAddress: '0xa', TokenHolderQuantity: '400000' },
        { TokenHolderAddress: '0xb', TokenHolderQuantity: '300000' },
        { TokenHolderAddress: '0xc', TokenHolderQuantity: '200000' },
        { TokenHolderAddress: '0xd', TokenHolderQuantity: '100000' },
      ],
    };
    const result = client.normalizeHolderConcentration(raw, 1000000n);
    expect(result.top3Pct).toBeCloseTo(90);
    expect(result.top10Pct).toBeCloseTo(100);
  });

  it('normalizeTransfers maps values correctly', async () => {
    const { EtherscanClient } = await import('../etherscan.js');
    const client = new EtherscanClient();
    const raw = {
      status: '1', message: 'OK',
      result: [{
        blockNumber: '19000000', timeStamp: '1700000000',
        hash: '0xhash', from: '0xFROM', to: '0xTO',
        value: '1000000000000000000', tokenName: 'RAVE',
        tokenSymbol: 'RAVE', tokenDecimal: '18',
      }],
    };
    const result = client.normalizeTransfers(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.from).toBe('0xfrom');
    expect(result[0]?.valueHuman).toBe(1);
  });
});
