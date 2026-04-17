import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

const CONTRACT = '0x17205fab260a7a6383a81452ce6315a39370db97';

function makeRaw(overrides: Record<string, string> = {}) {
  const defaults = {
    is_open_source: '1', is_proxy: '0', is_mintable: '0',
    is_honeypot: '0', honeypot_with_same_creator: '0',
    is_blacklisted: '0', is_whitelisted: '0',
    owner_address: '0xowner', creator_address: '0xcreator',
    owner_change_balance: '0', hidden_owner: '0',
    can_take_back_ownership: '0', buy_tax: '0', sell_tax: '0',
    is_anti_whale: '0', is_anti_whale_modifiable: '0',
    holder_count: '1500', total_supply: '100000000', trust_list: '0',
  };
  return {
    code: 1, message: 'ok',
    result: { [CONTRACT]: { ...defaults, ...overrides, lp_holders: [], dex: [] } },
  };
}

describe('GoPlusClient', () => {
  beforeEach(() => vi.resetModules());

  it('normalize identifies honeypot correctly', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const raw = makeRaw({ is_honeypot: '1', is_open_source: '0', hidden_owner: '1' });
    const result = client.normalize(raw, CONTRACT);
    expect(result.isHoneypot).toBe(true);
    expect(result.hiddenOwner).toBe(true);
    expect(result.isHighRisk).toBe(true);
    expect(result.riskFlags).toContain('honeypot');
    expect(result.riskFlags).toContain('hidden_owner');
  });

  it('normalize identifies clean token correctly', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const raw = makeRaw({ is_honeypot: '0', is_open_source: '1', hidden_owner: '0' });
    const result = client.normalize(raw, CONTRACT);
    expect(result.isHoneypot).toBe(false);
    expect(result.isOpenSource).toBe(true);
    expect(result.hiddenOwner).toBe(false);
    expect(result.isHighRisk).toBe(false);
    expect(result.riskFlags).toHaveLength(0);
  });

  it('normalize throws when contractAddress not in result', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const raw = { code: 1, message: 'ok', result: {} };
    expect(() => client.normalize(raw as never, CONTRACT)).toThrow();
  });

  it('normalize flags high buy/sell tax', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const raw = makeRaw({ buy_tax: '0.15', sell_tax: '0.20' });
    const result = client.normalize(raw, CONTRACT);
    expect(result.buyTaxPct).toBeCloseTo(15);
    expect(result.sellTaxPct).toBeCloseTo(20);
    expect(result.riskFlags.some(f => f.startsWith('high_buy_tax'))).toBe(true);
    expect(result.riskFlags.some(f => f.startsWith('high_sell_tax'))).toBe(true);
  });

  it('fetchTokenSecurity resolves for unknown chain (falls back to ethereum chain id)', async () => {
    const { instrumentedFetch } = await import('../_lib/fetch.js');
    vi.mocked(instrumentedFetch).mockResolvedValueOnce(makeRaw());
    const { GoPlusClient } = await import('../goplus.js');
    await expect(
      new GoPlusClient().fetchTokenSecurity(CONTRACT, 'polkadot')
    ).resolves.toBeDefined();
  });
});
