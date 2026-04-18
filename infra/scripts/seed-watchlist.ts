import postgres from 'postgres';
const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }
const sql = postgres(DATABASE_URL);
const TOKENS = [
  { symbol:'RAVE', address:'0x17205fab260a7a6383a81452ce6315a39370db97', chain:'ethereum', name:'RaveDAO', cg:'ravedao' },
  { symbol:'TURBO', address:'0xa35923162c49cf95e6bf26623385eb431ad920d3', chain:'ethereum', name:'Turbo', cg:'turbo' },
  { symbol:'PEPE', address:'0x6982508145454ce325ddbe47a25d4ec3d2311933', chain:'ethereum', name:'Pepe', cg:'pepe' },
  { symbol:'MOG', address:'0xaaee1a9723aadb7afa2810263653a34ba2c21c7a', chain:'ethereum', name:'Mog Coin', cg:'mog-coin' },
  { symbol:'FLOKI', address:'0xcf0c122c6b73ff809c693db761e7baebe62b6a2e', chain:'ethereum', name:'FLOKI', cg:'floki' },
  { symbol:'WOJAK', address:'0x5026f006b85729a8b14553fae6af249ad16c9aab', chain:'ethereum', name:'Wojak', cg:'wojak' },
  { symbol:'LADYS', address:'0x12970e6868f88f6557b76120662c1b3e501be1ff', chain:'ethereum', name:'Milady', cg:'milady-meme-coin' },
  { symbol:'OMNI', address:'0x36e66fbbce51e4cd5bd3c62b637eb411b18949d4', chain:'ethereum', name:'Omni Network', cg:'omni-network' },
  { symbol:'MAGA', address:'0x576e2bed8f7b46d34016198911cdf9886f78bea7', chain:'ethereum', name:'MAGA', cg:'maga-hat' },
  { symbol:'BABYDOGE', address:'0xac57de9c1a09fec648e93eb98875b212db0d460b', chain:'ethereum', name:'Baby Doge', cg:'baby-doge-coin' },
  { symbol:'BRETT', address:'0x532f27101965dd16442e59d40670faf5ebb142e4', chain:'base', name:'Brett', cg:'based-brett' },
  { symbol:'DEGEN', address:'0x4ed4e862860bed51a9570b96d89af5e1b0efefed', chain:'base', name:'Degen', cg:'degen-base' },
  { symbol:'TOSHI', address:'0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4', chain:'base', name:'Toshi', cg:'toshi-base' },
  { symbol:'HIGHER', address:'0x0578d8a44db98b23bf096a382e016e29a5ce0ffe', chain:'base', name:'Higher', cg:'higher' },
  { symbol:'AERO', address:'0x940181a94a35a4569e4529a3cdfb74e38fd98631', chain:'base', name:'Aerodrome', cg:'aerodrome-finance' },
  { symbol:'NORMIE', address:'0x7f12d13b34f5f4f0a9449c16bcd42f0da47af200', chain:'base', name:'Normie', cg:'normie' },
  { symbol:'KEYCAT', address:'0x9a26f5433671751c3276a065f57e5a02d2817973', chain:'base', name:'Keyboard Cat', cg:'keyboard-cat-base' },
  { symbol:'CLANKER', address:'0x1bc0c42215582d5a085795f4badbac3ff36d1bcb', chain:'base', name:'Clanker', cg:'clanker' },
  { symbol:'SKI', address:'0x9ca818e3f2a8dc5f74742b8f4b55e9154ec6b0c9', chain:'base', name:'Ski Mask Dog', cg:'ski-mask-dog' },
  { symbol:'BOME', address:'0xecb5d1932f9a0e4c5cfe38bfdc5e8c1c98c0917f', chain:'ethereum', name:'Book of Meme', cg:'book-of-meme' },
];
async function main() {
  console.log('Seeding ' + TOKENS.length + ' tokens...');
  for (const t of TOKENS) {
    await sql`INSERT INTO tokens (symbol, contract_address, chain, metadata, first_seen_at)
      VALUES (${t.symbol}, ${t.address.toLowerCase()}, ${t.chain}, ${JSON.stringify({name:t.name,coingecko_id:t.cg})}::jsonb, NOW())
      ON CONFLICT (chain, contract_address) DO UPDATE SET symbol=EXCLUDED.symbol, metadata=EXCLUDED.metadata`;
    console.log('  ✓ ' + t.symbol);
  }
  await sql.end();
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
