import { SentinelError, ErrorCodes } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';
const SOURCE = 'lunarcrush';
const BASE = 'https://lunarcrush.com/api4/public';
const RL = { key: SOURCE, maxRequests: 80, windowSeconds: 60 };
function key() { const k=process.env['LUNARCRUSH_API_KEY']; if(!k) throw new SentinelError(ErrorCodes.MISSING_API_KEY,'LUNARCRUSH_API_KEY not set'); return k; }

export interface LunarCrushTimeSeriesPoint { time:number;open:number;close:number;high:number;low:number;volume_24h:number;social_volume:number;social_score:number;average_sentiment:number;tweet_volume:number;reddit_posts:number }
export interface LunarCrushTimeSeriesRaw { data:LunarCrushTimeSeriesPoint[]; config:{symbol:string} }
export interface SocialDataPoint { timestamp:Date;socialVolume:number;socialScore:number;sentiment:number;tweetVolume:number }
export interface SocialVelocity { volumeChangePct24h:number;volumeChangeVs7dAvg:number;isVolumeATH:boolean;currentVolume:number;peakVolume:number }

export class LunarCrushClient {
  readonly source = SOURCE;
  async fetchTimeSeries(coin:string, days=30) { return instrumentedFetch<LunarCrushTimeSeriesRaw>(`${BASE}/coins/${coin}/time-series/v2?bucket=hour&interval=${days}d`,{source:SOURCE,endpoint:`/coins/${coin}/time-series`,rateLimit:RL,apiKey:null,headers:{Authorization:`Bearer ${key()}`},costUnits:1}); }
  normalize(raw:LunarCrushTimeSeriesRaw):SocialDataPoint[] { return raw.data.map(p=>({timestamp:new Date(p.time*1000),socialVolume:p.social_volume,socialScore:p.social_score,sentiment:p.average_sentiment,tweetVolume:p.tweet_volume})); }
  computeVelocity(points:SocialDataPoint[]):SocialVelocity {
    if(points.length<48)return{volumeChangePct24h:0,volumeChangeVs7dAvg:0,isVolumeATH:false,currentVolume:0,peakVolume:0};
    const last24=points.slice(-24),prev24=points.slice(-48,-24);
    const current=last24.reduce((s,p)=>s+p.socialVolume,0)/24;
    const previous=prev24.reduce((s,p)=>s+p.socialVolume,0)/24;
    const week7=points.slice(-168).reduce((s,p)=>s+p.socialVolume,0)/Math.min(168,points.length);
    const peak=Math.max(...points.map(p=>p.socialVolume));
    return{volumeChangePct24h:previous>0?((current-previous)/previous)*100:0,volumeChangeVs7dAvg:week7>0?((current-week7)/week7)*100:0,isVolumeATH:current>=peak*0.95,currentVolume:current,peakVolume:peak};
  }
}
export default new LunarCrushClient();
