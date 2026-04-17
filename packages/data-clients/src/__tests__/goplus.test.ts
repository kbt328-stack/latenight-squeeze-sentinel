import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_lib/fetch.js', () => ({ instrumentedFetch: vi.fn() }));
vi.mock('../_lib/rate-limit.js', () => ({ acquireToken: vi.fn().mockResolvedValue(undefined) }));

describe('GoPlusClient', () => {
  beforeEach(() => vi.resetModules());

  it('normalize identifies honeypot correctly', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const result = client.normalize({
      is_honeypot: '1', is_open_source: '0', hidden_owner: '1',
      owner_address: '0xowner', creator_address: '0xcreator',
      buy_tax: '0.05', sell_tax: '0.10',
    });
    expect(result.isHoneypot).toBe(true);
    expect(result.hasHiddenOwner).toBe(true);
  });

  it('normalize identifies clean token correctly', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    const client = new GoPlusClient();
    const result = client.normalize({
      is_honeypot: '0', is_open_source: '1', hidden_owner: '0',
      owner_address: '0xowner', creator_address: '0xcreator',
      buy_tax: '0', sell_tax: '0',
    });
    expect(result.isHoneypot).toBe(false);
    expect(result.isOpenSource).toBe(true);
  });

  it('throws on unknown chain', async () => {
    const { GoPlusClient } = await import('../goplus.js');
    await expect(new GoPlusClient().getTokenSecurity('polkadot', '0xabc')).rejects.toThrow();
  });
});
