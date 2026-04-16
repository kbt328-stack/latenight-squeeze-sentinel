import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';
const PLANE='distribution' as const, QUEUE_NAME=`ingestion-${PLANE}`;
const redis=new IORedis(process.env['REDIS_URL']??'redis://localhost:6379',{maxRetriesPerRequest:null});
const queue=new Queue(QUEUE_NAME,{connection:redis});
await queue.upsertJobScheduler('distribution-cron',{pattern:'*/5 * * * *'},{name:'ingest-distribution',data:{}});
const worker=new Worker<Record<string,never>>(QUEUE_NAME,async(_job:Job)=>{
  const tokens=await getWatchlist();
  for(const token of tokens){try{await ingestToken(token);}catch(err){logger.error({err,symbol:token.symbol},'Distribution token error');}}
},{connection:redis,concurrency:1});
const EXCHANGES=['0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2','0xf89d7b9c864f589bbf53a82105107622b35eaa40','0x9696f59e4d72e237be84ffd425dcad154bf96976','0x0d0707963952f2fba59dd06f2b425ace40b492fe'];
async function ingestToken(token:WatchlistToken):Promise<void>{
  const now=new Date(); const signals:SignalRow[]=[];
  const {coingecko,etherscan,lunarcrush}=await import('@sentinel/data-clients');
  const eng=await import('@sentinel/scoring-engine');
  try{
    if(token.coingeckoId){const chartRaw=await coingecko.fetchMarketChart(token.coingeckoId,7);const candles=coingecko.normalizeMarketChart(chartRaw);
    signals.push({tokenId:token.id,plane:PLANE,signalId:'d1',value:eng.activate_d1(coingecko.volumeChangeDayOverDay(candles)),rawPayload:{volChangeDod:coingecko.volumeChangeDayOverDay(candles)},source:'coingecko',observedAt:now});
    signals.push({tokenId:token.id,plane:PLANE,signalId:'d2',value:eng.activate_d2(coingecko.hasLowerHighs(candles)?1:0),rawPayload:{hasLowerHighs:coingecko.hasLowerHighs(candles)},source:'coingecko',observedAt:now});}
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['d1','d2']},'CoinGecko distribution failed');}
  try{
    const {db}=await import('@sentinel/db');
    const insiders=await db.query.wallets.findMany({where:(w,{arrayContains})=>arrayContains(w.labels,['insider'])});
    let sends=0; const cutoff=Math.floor((Date.now()-21600000)/1000);
    for(const w of insiders.slice(0,10)){try{const txRaw=await etherscan.fetchTokenTransfers(token.contractAddress,w.address,token.chain as 'ethereum'|'base');const txs=etherscan.normalizeTransfers(txRaw);sends+=txs.filter(tx=>tx.from===w.address.toLowerCase()&&tx.timestamp.getTime()/1000>cutoff&&EXCHANGES.includes(tx.to)).length;}catch{}}
    signals.push({tokenId:token.id,plane:PLANE,signalId:'d3',value:eng.activate_d3(sends),rawPayload:{sends},source:'etherscan',observedAt:now});
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['d3']},'d3 failed');}
  signals.push({tokenId:token.id,plane:PLANE,signalId:'d4',value:0,rawPayload:{stub:true},source:'stub',observedAt:now});
  try{const tsRaw=await lunarcrush.fetchTimeSeries(token.symbol.toLowerCase(),30);const pts=lunarcrush.normalize(tsRaw),vel=lunarcrush.computeVelocity(pts);signals.push({tokenId:token.id,plane:PLANE,signalId:'d5',value:eng.activate_d5(vel.isVolumeATH?100:vel.volumeChangeVs7dAvg),rawPayload:{isVolumeATH:vel.isVolumeATH},source:'lunarcrush',observedAt:now});}catch(err){logger.warn({err,symbol:token.symbol,signals:['d5']},'LunarCrush distribution failed');}
  if(signals.length>0)await writeSignals(signals);
}
process.on('SIGTERM',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
process.on('SIGINT',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
logger.info({queue:QUEUE_NAME},'Distribution worker started');
