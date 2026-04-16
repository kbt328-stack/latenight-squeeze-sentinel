import { SentinelError, ErrorCodes } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';
const SOURCE = 'coinglass';
const BASE = 'https://open-api.coinglass.com/public/v2';
const RL = { key: SOURCE, maxRequests: 10, windowSeconds: 1 };
function key() { const k = process.env['COINGLASS_API_KEY']; if (!k) throw new SentinelError(ErrorCodes.MISSING_API_KEY,'COINGLASS_API_KEY not set'); return k; }

export interface CoinglassFundingRateRaw { code:string; data:Array<{symbol:string;uMarginList:Array<{exchangeName:string;rate:number;nextFundingTime:number}>}> }
export interface CoinglassOpenInterestRaw { code:string; data:Array<{symbol:string;openInterest:number;openInterestAmount:number}> }
export interface CoinglassLiquidationRaw { code:string; data:Array<{symbol:string;longLiquidationUsd:number;shortLiquidationUsd:number;t:number}> }
export interface CoinglassLongShortRaw { code:string; data:Array<{symbol:string;longRatio:number;shortRatio:number;longShortRatio:number}> }
export interface FundingRateNormalized { symbol:string; avgAnnualizedRate:number; byExchange:Array<{exchange:string;rate:number}> }
export interface OpenInterestNormalized { symbol:string; totalUsd:number; totalTokens:number }
export interface LiquidationNormalized { symbol:string; longLiqUsd:number; shortLiqUsd:number; shortToLongRatio:number; timestamp:Date }
export interface LongShortNormalized { symbol:string; shortToLongRatio:number; longRatio:number; shortRatio:number }

export class CoinglassClient {
  readonly source = SOURCE;
  async fetchFundingRate(symbol:string) { return instrumentedFetch<CoinglassFundingRateRaw>(`${BASE}/funding?symbol=${symbol}`,{source:SOURCE,endpoint:'/funding',rateLimit:RL,apiKey:null,headers:{'coinglassSecret':key()},costUnits:1}); }
  normalizeFundingRate(raw:CoinglassFundingRateRaw):FundingRateNormalized[] { return raw.data.map(item=>{const rates=item.uMarginList.map(e=>e.rate);const avg=rates.length>0?rates.reduce((a,b)=>a+b,0)/rates.length:0;return{symbol:item.symbol,avgAnnualizedRate:avg,byExchange:item.uMarginList.map(e=>({exchange:e.exchangeName,rate:e.rate}))}}); }
  async fetchOpenInterest(symbol:string) { return instrumentedFetch<CoinglassOpenInterestRaw>(`${BASE}/openInterest?symbol=${symbol}`,{source:SOURCE,endpoint:'/openInterest',rateLimit:RL,apiKey:null,headers:{'coinglassSecret':key()},costUnits:1}); }
  normalizeOpenInterest(raw:CoinglassOpenInterestRaw):OpenInterestNormalized[] { return raw.data.map(item=>({symbol:item.symbol,totalUsd:item.openInterest,totalTokens:item.openInterestAmount})); }
  async fetchLiquidations(symbol:string) { return instrumentedFetch<CoinglassLiquidationRaw>(`${BASE}/liquidation/detail?symbol=${symbol}&interval=1h`,{source:SOURCE,endpoint:'/liquidation/detail',rateLimit:RL,apiKey:null,headers:{'coinglassSecret':key()},costUnits:1}); }
  normalizeLiquidations(raw:CoinglassLiquidationRaw):LiquidationNormalized[] { return raw.data.map(item=>({symbol:item.symbol,longLiqUsd:item.longLiquidationUsd,shortLiqUsd:item.shortLiquidationUsd,shortToLongRatio:item.longLiquidationUsd>0?item.shortLiquidationUsd/item.longLiquidationUsd:0,timestamp:new Date(item.t)})); }
  async fetchLongShortRatio(symbol:string) { return instrumentedFetch<CoinglassLongShortRaw>(`${BASE}/globalLongShortAccountRatio?symbol=${symbol}&interval=1h`,{source:SOURCE,endpoint:'/globalLongShortAccountRatio',rateLimit:RL,apiKey:null,headers:{'coinglassSecret':key()},costUnits:1}); }
  normalizeLongShortRatio(raw:CoinglassLongShortRaw):LongShortNormalized[] { return raw.data.map(item=>({symbol:item.symbol,shortToLongRatio:item.longRatio>0?item.shortRatio/item.longRatio:0,longRatio:item.longRatio,shortRatio:item.shortRatio})); }
}
export default new CoinglassClient();
