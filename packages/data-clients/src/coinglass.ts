import { SentinelError, ErrorCodes } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';

const SOURCE = 'coinglass';
const BASE = 'https://open-api-v4.coinglass.com/public/v4';
const RL = { key: SOURCE, maxRequests: 10, windowSeconds: 1 };

function key() {
  const k = process.env['COINGLASS_API_KEY'];
  if (!k) throw new SentinelError(ErrorCodes.MISSING_API_KEY, 'COINGLASS_API_KEY not set');
  return k;
}

function headers() { return { 'CG-API-KEY': key() }; }

// ── Raw response shapes ───────────────────────────────────────────────────────

export interface CoinglassFundingRateRaw {
  code: string;
  data: Array<{
    exchangeName: string;
    fundingRate: number;
    nextFundingTime: number;
  }> | null;
}

export interface CoinglassOpenInterestRaw {
  code: string;
  data: Array<{
    exchangeName: string;
    openInterest: number;
    openInterestAmount: number;
  }> | null;
}

export interface CoinglassLiquidationRaw {
  code: string;
  data: Array<{
    longLiquidationUsd: number;
    shortLiquidationUsd: number;
    t: number;
  }> | null;
}

export interface CoinglassLongShortRaw {
  code: string;
  data: Array<{
    longAccount: number;
    shortAccount: number;
    longShortRatio: number;
    t: number;
  }> | null;
}

// ── Normalized shapes — null means "no futures market / data unavailable" ─────

export interface FundingRateNormalized {
  symbol: string;
  avgAnnualizedRate: number;
  byExchange: Array<{ exchange: string; rate: number }>;
}

export interface OpenInterestNormalized {
  symbol: string;
  totalUsd: number;
  totalTokens: number;
}

export interface LiquidationNormalized {
  longLiqUsd: number;
  shortLiqUsd: number;
  shortToLongRatio: number;
  timestamp: Date;
}

export interface LongShortNormalized {
  shortToLongRatio: number;
  longRatio: number;
  shortRatio: number;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class CoinglassClient {
  readonly source = SOURCE;

  // t2: funding rate — aggregated across exchanges for symbol
  async fetchFundingRate(symbol: string) {
    return instrumentedFetch<CoinglassFundingRateRaw>(
      `${BASE}/futures/funding-rate/exchange-list?symbol=${symbol}`,
      { source: SOURCE, endpoint: '/futures/funding-rate/exchange-list', rateLimit: RL, apiKey: null, headers: headers(), costUnits: 1 }
    );
  }

  normalizeFundingRate(raw: CoinglassFundingRateRaw, symbol: string): FundingRateNormalized | null {
    if (!raw.data || raw.data.length === 0) return null;
    const rates = raw.data.map(e => e.fundingRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    // fundingRate from v4 is per-8h; annualize: × 3 × 365 × 100 for percentage
    return {
      symbol,
      avgAnnualizedRate: avg * 3 * 365 * 100,
      byExchange: raw.data.map(e => ({ exchange: e.exchangeName, rate: e.fundingRate })),
    };
  }

  // t4: open interest
  async fetchOpenInterest(symbol: string) {
    return instrumentedFetch<CoinglassOpenInterestRaw>(
      `${BASE}/futures/open-interest/exchange-list?symbol=${symbol}`,
      { source: SOURCE, endpoint: '/futures/open-interest/exchange-list', rateLimit: RL, apiKey: null, headers: headers(), costUnits: 1 }
    );
  }

  normalizeOpenInterest(raw: CoinglassOpenInterestRaw, symbol: string): OpenInterestNormalized | null {
    if (!raw.data || raw.data.length === 0) return null;
    const totalUsd = raw.data.reduce((a, b) => a + b.openInterest, 0);
    const totalTokens = raw.data.reduce((a, b) => a + b.openInterestAmount, 0);
    return { symbol, totalUsd, totalTokens };
  }

  // q1/q2: liquidations — aggregated coin history, last 1h
  async fetchLiquidations(symbol: string) {
    return instrumentedFetch<CoinglassLiquidationRaw>(
      `${BASE}/futures/liquidation/aggregated-history?symbol=${symbol}&interval=1h&limit=1&exchange_list=Binance`,
      { source: SOURCE, endpoint: '/futures/liquidation/aggregatedHistory', rateLimit: RL, apiKey: null, headers: headers(), costUnits: 1 }
    );
  }

  normalizeLiquidations(raw: CoinglassLiquidationRaw): LiquidationNormalized | null {
    if (!raw.data || raw.data.length === 0) return null;
    const item = raw.data[0]!;
    return {
      longLiqUsd: item.longLiquidationUsd,
      shortLiqUsd: item.shortLiquidationUsd,
      shortToLongRatio: item.longLiquidationUsd > 0 ? item.shortLiquidationUsd / item.longLiquidationUsd : 0,
      timestamp: new Date(item.t),
    };
  }

  // t3: global long/short account ratio
  async fetchLongShortRatio(symbol: string) {
    return instrumentedFetch<CoinglassLongShortRaw>(
      `${BASE}/futures/globalLongShortAccountRatio/history?symbol=${symbol}&interval=1h&limit=1`,
      { source: SOURCE, endpoint: '/futures/globalLongShortAccountRatio/history', rateLimit: RL, apiKey: null, headers: headers(), costUnits: 1 }
    );
  }

  normalizeLongShortRatio(raw: CoinglassLongShortRaw): LongShortNormalized | null {
    if (!raw.data || raw.data.length === 0) return null;
    const item = raw.data[0]!;
    return {
      shortToLongRatio: item.longAccount > 0 ? item.shortAccount / item.longAccount : 0,
      longRatio: item.longAccount,
      shortRatio: item.shortAccount,
    };
  }
}

export default new CoinglassClient();
