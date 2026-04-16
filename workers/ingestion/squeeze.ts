import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';
const PLANE='squeeze' as const, QUEUE_NAME=`ingestion-${PLANE}`;
const redis=new IORedis(process.env['REDIS_URL']??'redis://localhost:6379',{maxRetriesPerRequest:null});
const queue=new Queue(QUEUE_NAME,{connection:redis});
await queue.upsertJobScheduler('squeeze-cron',{pattern:'* * * * *'},{name:'ingest-squeeze',data:{}});
const worker=new Worker<Record<string,never>>(QUEUE_NAME,async(_job:Job)=>{
  const tokens=await getWatchlist();
  for(const token of tokens){try{await ingestToken(token);}catch(err){logger.error({err,symbol:token.symbol},'Squeeze token error');}}
},{connection:redis,concurrency:1});
const EXCHANGES=['0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2','0xf89d7b9c864f589bbf53a82105107622b35eaa40','0x9696f59e4d72e237be84ffd425dcad154bf96976'];
async function ingestToken(token:WatchlistToken):Promise<void>{
  const now=new Date(); const signals:SignalRow[]=[];
  const {coinglass,coingecko,etherscan,lunarcrush}=await import('@sentinel/data-clients');
  const eng=await import('@sentinel/scoring-engine');
  try{
    const [liqRaw,fRaw]=await Promise.all([coinglass.fetchLiquidations(token.symbol),coinglass.fetchFundingRate(token.symbol)]);
    const liq=coinglass.normalizeLiquidations(liqRaw), f=coinglass.normalizeFundingRate(fRaw);
    signals.push({tokenId:token.id,plane:PLANE,signalId:'q1',value:eng.activate_q1(liq[0]?.shortToLongRatio??0),rawPayload:{shortToLongRatio:liq[0]?.shortToLongRatio},source:'coinglass',observedAt:now});
    signals.push({tokenId:token.id,plane:PLANE,signalId:'q2',value:eng.activate_q2(f[0]?.avgAnnualizedRate??0),rawPayload:{avgAnnualizedRate:f[0]?.avgAnnualizedRate},source:'coinglass',observedAt:now});
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['q1','q2']},'Coinglass squeeze failed');}
  try{if(token.coingeckoId){const cr=await coingecko.fetchCoin(token.coingeckoId);const c=coingecko.normalizeCoin(cr);signals.push({tokenId:token.id,plane:PLANE,signalId:'q3',value:eng.activate_q3(c.pctChange24h),rawPayload:{pctChange24h:c.pctChange24h},source:'coingecko',observedAt:now});}}catch(err){logger.warn({err,symbol:token.symbol,signals:['q3']},'CoinGecko squeeze failed');}
  try{
    const {db}=await import('@sentinel/db');
    const accWallets=await db.query.wallets.findMany({where:(w,{arrayContains})=>arrayContains(w.labels,['early_accumulator'])});
    let withdrawals=0; const cutoff=Math.floor((Date.now()-3600000)/1000);
    for(const w of accWallets.slice(0,5)){try{const txRaw=await etherscan.fetchTokenTransfers(token.contractAddress,w.address,token.chain as 'ethereum'|'base');const txs=etherscan.normalizeTransfers(txRaw);withdrawals+=txs.filter(tx=>tx.timestamp.getTime()/1000>cutoff&&EXCHANGES.includes(tx.from)).length;}catch{}}
    signals.push({tokenId:token.id,plane:PLANE,signalId:'q4',value:eng.activate_q4(withdrawals),rawPayload:{withdrawals},source:'etherscan',observedAt:now});
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['q4']},'q4 failed');}
  try{const tsRaw=await lunarcrush.fetchTimeSeries(token.symbol.toLowerCase(),7);const pts=lunarcrush.normalize(tsRaw),vel=lunarcrush.computeVelocity(pts);signals.push({tokenId:token.id,plane:PLANE,signalId:'q5',value:eng.activate_q5(vel.volumeChangePct24h,vel.isVolumeATH),rawPayload:{volumeChangePct24h:vel.volumeChangePct24h,isVolumeATH:vel.isVolumeATH},source:'lunarcrush',observedAt:now});}catch(err){logger.warn({err,symbol:token.symbol,signals:['q5']},'LunarCrush squeeze failed');}
  if(signals.length>0)await writeSignals(signals);
}
process.on('SIGTERM',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
process.on('SIGINT',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
logger.info({queue:QUEUE_NAME},'Squeeze worker started');
