import { SentinelError, ErrorCodes } from '@sentinel/shared';
import { instrumentedFetch } from './_lib/fetch.js';
const SOURCE = 'goplus';
const BASE = 'https://api.gopluslabs.io/api/v1';
const RL = { key: SOURCE, maxRequests: 20, windowSeconds: 1 };
const CHAIN_IDS:Record<string,string>={ethereum:'1',base:'8453',arbitrum:'42161',bsc:'56',polygon:'137'};

export interface GoPlusTokenSecurityRaw { code:number;message:string;result:Record<string,{is_open_source:string;is_proxy:string;is_mintable:string;is_honeypot:string;honeypot_with_same_creator:string;is_blacklisted:string;is_whitelisted:string;owner_address:string;creator_address:string;owner_change_balance:string;hidden_owner:string;can_take_back_ownership:string;buy_tax:string;sell_tax:string;is_anti_whale:string;is_anti_whale_modifiable:string;holder_count:string;total_supply:string;trust_list:string;lp_holders:Array<{address:string;is_locked:number;percent:string}>;dex:Array<{name:string;liquidity:string;pair:string}>}> }
export interface ContractSafety { contractAddress:string;isOpenSource:boolean;isHoneypot:boolean;isMintable:boolean;isProxy:boolean;hiddenOwner:boolean;canReclaimOwnership:boolean;buyTaxPct:number;sellTaxPct:number;ownerAddress:string;creatorAddress:string;holderCount:number;deployerAppearsDoxxed:boolean;isHighRisk:boolean;riskFlags:string[] }

export class GoPlusClient {
  readonly source = SOURCE;
  async fetchTokenSecurity(contractAddress:string, chain='ethereum') {
    const chainId=CHAIN_IDS[chain]??'1';
    const appKey=process.env['GOPLUS_APP_KEY'];
    const headers:Record<string,string>={};
    if(appKey)headers['Authorization']=`Bearer ${appKey}`;
    return instrumentedFetch<GoPlusTokenSecurityRaw>(`${BASE}/token_security/${chainId}?contract_addresses=${contractAddress}`,{source:SOURCE,endpoint:`/token_security/${chainId}`,rateLimit:RL,apiKey:null,headers,costUnits:1});
  }
  normalize(raw:GoPlusTokenSecurityRaw, contractAddress:string):ContractSafety {
    const addr=contractAddress.toLowerCase();
    const data=raw.result[addr];
    if(!data)throw new SentinelError(ErrorCodes.RESPONSE_PARSE_ERROR,`GoPlus returned no data for ${contractAddress}`,{contractAddress});
    const riskFlags:string[]=[];
    if(data.is_honeypot==='1')riskFlags.push('honeypot');
    if(data.hidden_owner==='1')riskFlags.push('hidden_owner');
    if(data.can_take_back_ownership==='1')riskFlags.push('can_reclaim_ownership');
    if(data.is_mintable==='1')riskFlags.push('mintable');
    if(data.is_open_source!=='1')riskFlags.push('not_open_source');
    const buyTax=parseFloat(data.buy_tax??'0')*100,sellTax=parseFloat(data.sell_tax??'0')*100;
    if(buyTax>10)riskFlags.push(`high_buy_tax_${buyTax.toFixed(0)}pct`);
    if(sellTax>10)riskFlags.push(`high_sell_tax_${sellTax.toFixed(0)}pct`);
    const deployerAppearsDoxxed=data.trust_list==='1'||(data.is_open_source==='1'&&data.hidden_owner!=='1');
    return{contractAddress:addr,isOpenSource:data.is_open_source==='1',isHoneypot:data.is_honeypot==='1',isMintable:data.is_mintable==='1',isProxy:data.is_proxy==='1',hiddenOwner:data.hidden_owner==='1',canReclaimOwnership:data.can_take_back_ownership==='1',buyTaxPct:buyTax,sellTaxPct:sellTax,ownerAddress:data.owner_address??'',creatorAddress:data.creator_address??'',holderCount:parseInt(data.holder_count??'0',10),deployerAppearsDoxxed,isHighRisk:riskFlags.includes('honeypot')||riskFlags.includes('hidden_owner'),riskFlags};
  }
}
export default new GoPlusClient();
