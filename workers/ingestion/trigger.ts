import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger, type SignalRow } from '@sentinel/shared';
import { getWatchlist, type WatchlistToken } from './_lib/watchlist.js';
import { writeSignals } from './_lib/write-signals.js';
const PLANE='trigger' as const, QUEUE_NAME=`ingestion-${PLANE}`;
const redis=new IORedis(process.env['REDIS_URL']??'redis://localhost:6379',{maxRetriesPerRequest:null});
const queue=new Queue(QUEUE_NAME,{connection:redis});
await queue.upsertJobScheduler('trigger-cron',{pattern:'* * * * *'},{name:'ingest-trigger',data:{}});
const worker=new Worker<Record<string,never>>(QUEUE_NAME,async(_job:Job)=>{
  const tokens=await getWatchlist();
  for(const token of tokens){try{await ingestToken(token);}catch(err){logger.error({err,symbol:token.symbol},'Trigger token error');}}
},{connection:redis,concurrency:1});

const EXCHANGES=['0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2','0xf89d7b9c864f589bbf53a82105107622b35eaa40','0x9696f59e4d72e237be84ffd425dcad154bf96976','0x0d0707963952f2fba59dd06f2b425ace40b492fe'];

async function ingestToken(token:WatchlistToken):Promise<void>{
  const now=new Date(); const signals:SignalRow[]=[];
  const {coinglass,etherscan,coingecko}=await import('@sentinel/data-clients');
  const eng=await import('@sentinel/scoring-engine');
  try{
    const [fRaw,lsRaw,oiRaw]=await Promise.all([coinglass.fetchFundingRate(token.symbol),coinglass.fetchLongShortRatio(token.symbol),coinglass.fetchOpenInterest(token.symbol)]);
    const f=coinglass.normalizeFundingRate(fRaw),ls=coinglass.normalizeLongShortRatio(lsRaw),oi=coinglass.normalizeOpenInterest(oiRaw);
    signals.push({tokenId:token.id,plane:PLANE,signalId:'t2',value:eng.activate_t2(f[0]?.avgAnnualizedRate??0),rawPayload:{avgAnnualizedRate:f[0]?.avgAnnualizedRate},source:'coinglass',observedAt:now});
    signals.push({tokenId:token.id,plane:PLANE,signalId:'t3',value:eng.activate_t3(ls[0]?.shortToLongRatio??0),rawPayload:{shortToLongRatio:ls[0]?.shortToLongRatio},source:'coinglass',observedAt:now});
    let mcUsd=0;
    try{if(token.coingeckoId){const cr=await coingecko.fetchCoin(token.coingeckoId);mcUsd=coingecko.normalizeCoin(cr).marketCapUsd;}}catch{}
    const oiUsd=oi[0]?.totalUsd??0, oiToMc=mcUsd>0?(oiUsd/mcUsd)*100:0;
    signals.push({tokenId:token.id,plane:PLANE,signalId:'t4',value:eng.activate_t4(oiToMc),rawPayload:{oiUsd,mcUsd,oiToMc},source:'coinglass',observedAt:now});
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['t2','t3','t4']},'Coinglass trigger failed');}
  try{
    const {db}=await import('@sentinel/db');
    const accWallets=await db.query.wallets.findMany({where:(w,{arrayContains})=>arrayContains(w.labels,['early_accumulator'])});
    let deposits=0; const cutoff=Math.floor((Date.now()-3600000)/1000);
    for(const w of accWallets.slice(0,5)){try{const txRaw=await etherscan.fetchTokenTransfers(token.contractAddress,w.address,token.chain as 'ethereum'|'base');const txs=etherscan.normalizeTransfers(txRaw);deposits+=txs.filter(tx=>tx.timestamp.getTime()/1000>cutoff&&EXCHANGES.includes(tx.to)).length;}catch{}}
    signals.push({tokenId:token.id,plane:PLANE,signalId:'t1',value:eng.activate_t1(deposits),rawPayload:{deposits},source:'etherscan',observedAt:now});
  }catch(err){logger.warn({err,symbol:token.symbol,signals:['t1']},'t1 failed');}
  signals.push({tokenId:token.id,plane:PLANE,signalId:'t5',value:0,rawPayload:{stub:true},source:'stub',observedAt:now});
  if(signals.length>0)await writeSignals(signals);
}
process.on('SIGTERM',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
process.on('SIGINT',async()=>{await worker.close();await queue.close();await redis.quit();process.exit(0);});
logger.info({queue:QUEUE_NAME},'Trigger worker started');
