import { SentinelError, ErrorCodes, type Chain } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';
const SOURCE = 'etherscan';
const RL = { key: SOURCE, maxRequests: 4, windowSeconds: 1 };
function apiKey(chain:Chain):string { const m:Partial<Record<Chain,string|undefined>>={ethereum:process.env['ETHERSCAN_API_KEY'],base:process.env['BASESCAN_API_KEY']}; const k=m[chain]; if(!k) throw new SentinelError(ErrorCodes.MISSING_API_KEY,`No key for chain: ${chain}`); return k; }
function baseUrl(chain:Chain):string { const u:Partial<Record<Chain,string>>={ethereum:'https://api.etherscan.io/api',base:'https://api.basescan.org/api',arbitrum:'https://api.arbiscan.io/api'}; const url=u[chain]; if(!url) throw new SentinelError(ErrorCodes.UPSTREAM_ERROR,`Unsupported chain: ${chain}`); return url; }

export interface EtherscanTokenHolder { TokenHolderAddress:string; TokenHolderQuantity:string }
export interface EtherscanTokenHolderRaw { status:string; message:string; result:EtherscanTokenHolder[] }
export interface EtherscanTokenTransfer { blockNumber:string;timeStamp:string;hash:string;from:string;to:string;value:string;tokenName:string;tokenSymbol:string;tokenDecimal:string }
export interface EtherscanTransferRaw { status:string; message:string; result:EtherscanTokenTransfer[] }
export interface HolderConcentration { top3Pct:number; top10Pct:number; topHolders:Array<{address:string;balanceRaw:bigint;pct:number}>; totalSupplyRaw:bigint }
export interface TokenTransferNormalized { hash:string;from:string;to:string;value:bigint;decimals:number;valueHuman:number;timestamp:Date;blockNumber:number }

export class EtherscanClient {
  readonly source = SOURCE;
  async fetchTokenHolders(contractAddress:string, chain:Chain='ethereum', page=1, offset=100) {
    const url=`${baseUrl(chain)}?module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=${page}&offset=${offset}&apikey=${apiKey(chain)}`;
    return instrumentedFetch<EtherscanTokenHolderRaw>(url,{source:SOURCE,endpoint:'tokenholderlist',rateLimit:RL,apiKey:null,costUnits:1});
  }
  normalizeHolderConcentration(raw:EtherscanTokenHolderRaw, totalSupply:bigint):HolderConcentration {
    const holders=raw.result.map(h=>({address:h.TokenHolderAddress,balanceRaw:BigInt(h.TokenHolderQuantity),pct:totalSupply>0n?Number(BigInt(h.TokenHolderQuantity)*10000n/totalSupply)/100:0}));
    return {top3Pct:holders.slice(0,3).reduce((s,h)=>s+h.pct,0),top10Pct:holders.slice(0,10).reduce((s,h)=>s+h.pct,0),topHolders:holders.slice(0,20),totalSupplyRaw:totalSupply};
  }
  async fetchTokenTransfers(contractAddress:string, walletAddress:string, chain:Chain='ethereum', startBlock=0) {
    const url=`${baseUrl(chain)}?module=account&action=tokentx&contractaddress=${contractAddress}&address=${walletAddress}&startblock=${startBlock}&endblock=99999999&sort=desc&apikey=${apiKey(chain)}`;
    return instrumentedFetch<EtherscanTransferRaw>(url,{source:SOURCE,endpoint:'tokentx',rateLimit:RL,apiKey:null,costUnits:1});
  }
  normalizeTransfers(raw:EtherscanTransferRaw):TokenTransferNormalized[] {
    return raw.result.map(t=>{const decimals=parseInt(t.tokenDecimal,10)||18;const value=BigInt(t.value);const divisor=10n**BigInt(decimals);return{hash:t.hash,from:t.from.toLowerCase(),to:t.to.toLowerCase(),value,decimals,valueHuman:Number(value/divisor),timestamp:new Date(parseInt(t.timeStamp,10)*1000),blockNumber:parseInt(t.blockNumber,10)};});
  }
}
export default new EtherscanClient();
