import { logger } from '@sentinel/shared';
export interface WatchlistToken { id:string; symbol:string; contractAddress:string; chain:string; coingeckoId?:string }
const BOOTSTRAP:WatchlistToken[] = [
  { id:'41cc3204-976e-4e87-8e15-fee1cb8c585b', symbol:'RAVE', contractAddress:'0x17205fab260a7a6383a81452ce6315a39370db97', chain:'ethereum', coingeckoId:'ravedao' }
];
export async function getWatchlist():Promise<WatchlistToken[]> {
  try {
    const { db } = await import('@sentinel/db');
    const rows = await db.query.tokens.findMany({ limit: 250 });
    if(rows.length===0){logger.warn({event:'watchlist_fallback'},'No tokens in DB — using bootstrap');return BOOTSTRAP;}
    return rows.map(r=>({id:r.id,symbol:r.symbol,contractAddress:r.contractAddress,chain:r.chain,coingeckoId:(r.metadata as Record<string,string>|null)?.['coingecko_id']}));
  } catch(err) {
    logger.error({err,event:'watchlist_db_error'},'Failed to load watchlist, using bootstrap');
    return BOOTSTRAP;
  }
}
