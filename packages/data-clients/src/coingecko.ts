import { SentinelError, ErrorCodes } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';
const SOURCE = 'coingecko';
const BASE = 'https://api.coingecko.com/api/v3';
const RL = { key: SOURCE, maxRequests: 15, windowSeconds: 60 };
function key() { const k=process.env['COINGECKO_API_KEY']; if(!k) throw new SentinelError(ErrorCodes.MISSING_API_KEY,'COINGECKO_API_KEY not set'); return k; }

export interface CoinGeckoMarketChartRaw { prices:[number,number][]; market_caps:[number,number][]; total_volumes:[number,number][] }
export interface CoinGeckoCoinRaw { id:string;symbol:string;name:string;market_data:{current_price:{usd:number};market_cap:{usd:number};total_volume:{usd:number};circulating_supply:number;total_supply:number;price_change_percentage_24h:number;price_change_percentage_7d:number;price_change_percentage_30d:number;ath:{usd:number};ath_date:{usd:string}} }
export interface PriceCandle { timestamp:Date; price:number; volume:number; marketCap:number }
export interface CoinSummary { id:string;symbol:string;currentPriceUsd:number;marketCapUsd:number;volumeUsd24h:number;circulatingSupply:number;totalSupply:number;pctChange24h:number;pctChange7d:number;pctChange30d:number;athUsd:number;athDate:Date;gainFromLow90d:number|null }

export class CoinGeckoClient {
  readonly source = SOURCE;
  async fetchCoin(coinId:string) { return instrumentedFetch<CoinGeckoCoinRaw>(`${BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,{source:SOURCE,endpoint:`/coins/${coinId}`,rateLimit:RL,apiKey:null,headers:{'x-cg-demo-api-key':key()},costUnits:1}); }
  normalizeCoin(raw:CoinGeckoCoinRaw, priceHistory?:PriceCandle[]):CoinSummary {
    const md=raw.market_data;
    let gainFromLow90d:number|null=null;
    if(priceHistory&&priceHistory.length>0){const low=Math.min(...priceHistory.map(c=>c.price));if(low>0)gainFromLow90d=((md.current_price.usd-low)/low)*100;}
    return{id:raw.id,symbol:raw.symbol,currentPriceUsd:md.current_price.usd,marketCapUsd:md.market_cap.usd,volumeUsd24h:md.total_volume.usd,circulatingSupply:md.circulating_supply,totalSupply:md.total_supply,pctChange24h:md.price_change_percentage_24h,pctChange7d:md.price_change_percentage_7d,pctChange30d:md.price_change_percentage_30d,athUsd:md.ath.usd,athDate:new Date(md.ath_date.usd),gainFromLow90d};
  }
  async fetchMarketChart(coinId:string, days:number) { return instrumentedFetch<CoinGeckoMarketChartRaw>(`${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`,{source:SOURCE,endpoint:`/coins/${coinId}/market_chart`,rateLimit:RL,apiKey:null,headers:{'x-cg-demo-api-key':key()},costUnits:1}); }
  normalizeMarketChart(raw:CoinGeckoMarketChartRaw):PriceCandle[] { return raw.prices.map(([ts,price],i)=>({timestamp:new Date(ts),price,volume:raw.total_volumes[i]?.[1]??0,marketCap:raw.market_caps[i]?.[1]??0})); }
  hasLowerHighs(candles:PriceCandle[], windowCount=3):boolean {
    if(candles.length<windowCount*4)return false;
    const highs:number[]=[];
    for(let i=1;i<candles.length-1;i++){const p=candles[i-1]!.price,c=candles[i]!.price,n=candles[i+1]!.price;if(c>p&&c>n)highs.push(c);}
    if(highs.length<windowCount)return false;
    const last=highs.slice(-windowCount);
    return last.every((h,idx)=>idx===0||h<last[idx-1]!);
  }
  volumeChangeDayOverDay(candles:PriceCandle[]):number {
    if(candles.length<48)return 0;
    const yday=candles.slice(-48,-24).reduce((s,c)=>s+c.volume,0);
    const today=candles.slice(-24).reduce((s,c)=>s+c.volume,0);
    return yday===0?0:((today-yday)/yday)*100;
  }
}
export default new CoinGeckoClient();
