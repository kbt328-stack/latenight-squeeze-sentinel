import Fastify from 'fastify';
import postgres from 'postgres';

const PORT = Number(process.env['DASHBOARD_PORT'] ?? 4000);
const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const sql = postgres(DATABASE_URL);
const app = Fastify({ logger: { level: 'warn' } });

app.get('/api/watchlist', async () => {
  const scored = await sql`
    SELECT DISTINCT ON (s.token_id)
      s.token_id, t.symbol, t.chain,
      s.composite, s.band, s.plane_scores, s.contributing_signals,
      s.scored_at, s.drawdown_probability,
      (SELECT COUNT(*)::int FROM signals sig WHERE sig.token_id = s.token_id
        AND sig.observed_at > NOW() - INTERVAL '2 hours' AND sig.value > 0) AS signal_count
    FROM scores s JOIN tokens t ON t.id = s.token_id
    ORDER BY s.token_id, s.scored_at DESC
  `;
  const unscored = await sql`
    SELECT t.id AS token_id, t.symbol, t.chain FROM tokens t
    LEFT JOIN scores s ON s.token_id = t.id WHERE s.token_id IS NULL ORDER BY t.symbol
  `;
  return { scored, unscored, generated_at: new Date().toISOString() };
});

app.get('/api/token/:tokenId', async (req) => {
  const { tokenId } = req.params;
  const [score] = await sql`
    SELECT DISTINCT ON (s.token_id)
      s.token_id, t.symbol, t.chain,
      s.composite, s.band, s.plane_scores, s.contributing_signals,
      s.scored_at, s.drawdown_probability
    FROM scores s JOIN tokens t ON t.id = s.token_id
    WHERE s.token_id = ${tokenId}::uuid
    ORDER BY s.token_id, s.scored_at DESC
  `;
  const signals = await sql`
    SELECT DISTINCT ON (signal_id) signal_id, plane, value, source, observed_at
    FROM signals WHERE token_id = ${tokenId}::uuid
      AND observed_at > NOW() - INTERVAL '2 hours'
    ORDER BY signal_id, observed_at DESC
  `;
  const scoreHistory = await sql`
    SELECT composite, band, scored_at FROM scores
    WHERE token_id = ${tokenId}::uuid ORDER BY scored_at DESC LIMIT 60
  `;
  return { score: score ?? null, signals, scoreHistory };
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Squeeze Sentinel</title>
<style>
:root{--ink:#0B0B0F;--ink2:#16161D;--ink3:#1E1E28;--gold:#C9A961;--text:#E8E8F0;--dim:#888899;--border:#2a2a38;--crit:#ff4444;--high:#ff8c00;--mod:#e6c229;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--ink);color:var(--text);font-family:'SF Mono','Fira Code',monospace;font-size:13px;height:100vh;display:flex;flex-direction:column;}
header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border);background:var(--ink2);flex-shrink:0;}
.logo{font-size:14px;font-weight:700;letter-spacing:.08em;color:var(--gold);text-transform:uppercase;}
.logo span{color:var(--dim);font-weight:400;}
#statusbar{font-size:11px;color:var(--dim);}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#3d3;margin-right:5px;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.body{display:flex;flex:1;overflow:hidden;}
#sidebar{width:300px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--ink2);}
.wl-hdr{padding:10px 14px;font-size:10px;letter-spacing:.12em;color:var(--dim);text-transform:uppercase;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--ink2);}
.tok{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;}
.tok:hover,.tok.active{background:var(--ink3);}
.sym{font-weight:700;width:58px;flex-shrink:0;}
.chn{font-size:10px;color:var(--dim);width:36px;flex-shrink:0;}
.barwrap{flex:1;}
.barbg{height:4px;background:var(--ink);border-radius:2px;overflow:hidden;margin-bottom:3px;}
.barfill{height:100%;border-radius:2px;transition:width .4s;}
.scorerow{display:flex;align-items:center;gap:6px;}
.scorenum{font-size:11px;font-weight:700;}
.pill{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;border-radius:3px;}
.unsec{padding:8px 14px;font-size:11px;color:var(--dim);}
.unsec-lbl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;padding-top:4px;}
.utok{padding:5px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;}
#detail{flex:1;overflow-y:auto;padding:22px;background:var(--ink);}
.ph{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--dim);}
.ph-icon{font-size:36px;opacity:.25;}
.tok-hdr{display:flex;align-items:flex-end;gap:18px;margin-bottom:22px;flex-wrap:wrap;}
.big-sym{font-size:28px;font-weight:700;color:var(--gold);}
.comp-lbl{font-size:9px;letter-spacing:.15em;color:var(--dim);text-transform:uppercase;margin-bottom:2px;}
.comp-num{font-size:48px;font-weight:800;line-height:1;letter-spacing:-.03em;}
.meta{display:flex;gap:14px;font-size:11px;color:var(--dim);margin-bottom:20px;flex-wrap:wrap;}
.meta strong{color:var(--text);}
.planes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:22px;}
.pcard{background:var(--ink2);border:1px solid var(--border);border-radius:6px;padding:12px 14px;}
.ptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.pname{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);}
.pscore{font-size:17px;font-weight:700;}
.sigrow{display:flex;align-items:center;gap:7px;padding:5px 0;border-top:1px solid var(--border);}
.sigid{font-size:10px;color:var(--dim);width:22px;flex-shrink:0;}
.siglabel{font-size:10px;color:var(--dim);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sigbg{height:3px;background:var(--ink);border-radius:2px;overflow:hidden;}
.sigfill{height:100%;border-radius:2px;}
.sigval{font-size:11px;font-weight:600;width:26px;text-align:right;flex-shrink:0;}
.nosig{font-size:11px;color:var(--dim);padding:6px 0;}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:8px;}
canvas{width:100%;height:90px;background:var(--ink2);border:1px solid var(--border);border-radius:6px;display:block;}
.c-crit{color:var(--crit);} .c-high{color:var(--high);} .c-mod{color:var(--mod);} .c-low{color:var(--dim);}
.p-crit{background:rgba(255,68,68,.15);color:var(--crit);border:1px solid rgba(255,68,68,.35);}
.p-high{background:rgba(255,140,0,.15);color:var(--high);border:1px solid rgba(255,140,0,.35);}
.p-mod{background:rgba(230,194,41,.15);color:var(--mod);border:1px solid rgba(230,194,41,.35);}
.p-low{background:var(--ink3);color:var(--dim);border:1px solid var(--border);}
.b-crit{background:var(--crit);} .b-high{background:var(--high);} .b-mod{background:var(--mod);} .b-low{background:#333;}
.b-sig{background:var(--gold);}
</style>
</head>
<body>
<header>
  <div class="logo">Squeeze Sentinel <span>// watchlist</span></div>
  <div id="statusbar"><span class="dot"></span><span id="stxt">Loading…</span></div>
</header>
<div class="body">
  <div id="sidebar"><div class="wl-hdr">Token / Score</div><div id="wlbody">Loading…</div></div>
  <div id="detail"><div class="ph"><div class="ph-icon">◈</div><div>Select a token</div></div></div>
</div>
<script>
const LABELS={s1:'Top 3 wallets >70% supply',s2:'Float <30% total',s3:'Perp listing',s4:'Deployer not doxxed',s5:'Token age <6mo',u1:'Insider accumulation >1%',u2:'New exchange listings',u3:'Early pump 50-200%',u4:'Social velocity rising',t1:'Accum wallets → exchange',t2:'Funding deeply negative',t3:'Short/long ratio >2',t4:'OI >30% circ MC',t5:'On-chain sleuth flags',q1:'Short liq >3x long liq',q2:'Funding → extreme positive',q3:'Vertical price few trades',q4:'Same wallets withdraw',q5:'Social volume explosion',d1:'Price holds volume fading',d2:'Lower highs hourly',d3:'Insider staggered sends',d4:'Narrative retrofitting',d5:'Retail mentions ATH'};
const PLANES=['structural','setup','trigger','squeeze','distribution'];
let selected=null;

function bc(b){return 'c-'+(b||'low');}
function bp(b){return 'p-'+(b||'low');}
function bb(b){return 'b-'+(b||'low');}
function scoreColor(c){return c>=75?'var(--crit)':c>=55?'var(--high)':c>=35?'var(--mod)':'#444';}
function fmt(n){return typeof n==='number'?n.toFixed(1):'—';}
function rel(iso){const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000);return m<1?'just now':m<60?m+'m ago':Math.floor(m/60)+'h ago';}
function chainLabel(c){return c==='ethereum'?'ETH':c==='base'?'BASE':c.toUpperCase();}

function renderSidebar(data){
  const scored=[...(data.scored||[])].sort((a,b)=>b.composite-a.composite);
  let h='';
  for(const t of scored){
    const act=t.token_id===selected?' active':'';
    const pct=Math.min(100,t.composite);
    h+=\`<div class="tok\${act}" onclick="pick('\${t.token_id}')">
      <div class="sym">\${t.symbol}</div>
      <div class="chn">\${chainLabel(t.chain)}</div>
      <div class="barwrap">
        <div class="barbg"><div class="barfill \${bb(t.band)}" style="width:\${pct}%"></div></div>
        <div class="scorerow">
          <span class="scorenum \${bc(t.band)}">\${fmt(t.composite)}</span>
          <span class="pill \${bp(t.band)}">\${t.band||'low'}</span>
        </div>
      </div>
    </div>\`;
  }
  if(data.unscored?.length){
    h+='<div class="unsec"><div class="unsec-lbl">Pending score</div>';
    for(const t of data.unscored) h+=\`<div class="utok"><span style="width:58px;font-weight:700">\${t.symbol}</span><span>\${chainLabel(t.chain)}</span></div>\`;
    h+='</div>';
  }
  document.getElementById('wlbody').innerHTML=h||'<div style="padding:14px;color:var(--dim)">No tokens. Run seed script.</div>';
}

async function pick(id){
  selected=id;
  document.querySelectorAll('.tok').forEach(r=>r.classList.remove('active'));
  document.querySelectorAll('.tok').forEach(r=>{if(r.getAttribute('onclick')?.includes(id))r.classList.add('active');});
  document.getElementById('detail').innerHTML='<div class="ph"><div class="ph-icon">◌</div><div>Loading…</div></div>';
  const d=await fetch('/api/token/'+id).then(r=>r.json());
  renderDetail(d);
}

function renderDetail({score,signals,scoreHistory}){
  if(!score){document.getElementById('detail').innerHTML='<div class="ph"><div class="ph-icon">◌</div><div>No scores yet — waiting for workers</div></div>';return;}
  const byPlane={};
  for(const s of (signals||[])){if(!byPlane[s.plane])byPlane[s.plane]=[];byPlane[s.plane].push(s);}
  let planes='';
  for(const plane of PLANES){
    const ps=score.plane_scores?.[plane]??0;
    const sigs=byPlane[plane]||[];
    let rows=sigs.length===0?'<div class="nosig">No data in last 2h</div>':
      sigs.sort((a,b)=>b.value-a.value).map(s=>\`
        <div class="sigrow" title="\${LABELS[s.signal_id]||s.signal_id} · \${rel(s.observed_at)}">
          <span class="sigid">\${s.signal_id}</span>
          <div style="flex:1">
            <div class="siglabel">\${LABELS[s.signal_id]||s.signal_id}</div>
            <div class="sigbg"><div class="sigfill \${s.value>0?'b-sig':'b-low'}" style="width:\${Math.min(100,s.value)}%"></div></div>
          </div>
          <span class="sigval" style="color:\${s.value>0?'var(--gold)':'var(--dim)'}">\${fmt(s.value)}</span>
        </div>\`).join('');
    planes+=\`<div class="pcard">
      <div class="ptop"><span class="pname">\${plane}</span><span class="pscore" style="color:\${scoreColor(ps)}">\${fmt(ps)}</span></div>
      \${rows}
    </div>\`;
  }
  const history=[...(scoreHistory||[])].slice(0,60).reverse();
  const contrib=(score.contributing_signals||[]).join(', ')||'—';
  const dp=typeof score.drawdown_probability==='number'?(score.drawdown_probability*100).toFixed(0)+'%':'—';
  document.getElementById('detail').innerHTML=\`
    <div class="tok-hdr">
      <div class="big-sym">\${score.symbol}</div>
      <div><div class="comp-lbl">Composite</div><div class="comp-num \${bc(score.band)}">\${fmt(score.composite)}</div></div>
      <span class="pill \${bp(score.band)}" style="font-size:12px;padding:3px 8px">\${score.band||'low'}</span>
    </div>
    <div class="meta">
      <span>Chain: <strong>\${score.chain}</strong></span>
      <span>Drawdown prob: <strong>\${dp}</strong></span>
      <span>Scored: <strong>\${rel(score.scored_at)}</strong></span>
      <span>Top signals: <strong style="color:var(--gold)">\${contrib}</strong></span>
    </div>
    <div class="planes">\${planes}</div>
    <div class="sec-title">Score history (last 60 runs)</div>
    <canvas id="hchart" width="800" height="90"></canvas>
  \`;
  requestAnimationFrame(()=>drawChart('hchart',history));
}

function drawChart(id,history){
  const c=document.getElementById(id);
  if(!c||history.length<2)return;
  const ctx=c.getContext('2d');
  const w=c.offsetWidth||800,h=90;
  c.width=w;c.height=h;
  const pad=8,step=(w-pad*2)/(history.length-1);
  ctx.clearRect(0,0,w,h);
  [[75,'rgba(255,68,68,.25)'],[55,'rgba(255,140,0,.25)'],[35,'rgba(230,194,41,.25)']].forEach(([band,col])=>{
    const y=h-pad-((band/100)*(h-pad*2));
    ctx.strokeStyle=col;ctx.setLineDash([2,4]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();
  });
  ctx.setLineDash([]);ctx.strokeStyle='#C9A961';ctx.lineWidth=2;ctx.beginPath();
  history.forEach((r,i)=>{
    const x=pad+i*step,y=h-pad-((Math.min(100,r.composite)/100)*(h-pad*2));
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.stroke();
  const last=history[history.length-1];
  if(last){const x=pad+(history.length-1)*step,y=h-pad-((Math.min(100,last.composite)/100)*(h-pad*2));
    ctx.fillStyle='#C9A961';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
}

async function refresh(){
  try{
    const d=await fetch('/api/watchlist').then(r=>r.json());
    renderSidebar(d);
    const s=d.scored||[],u=d.unscored||[];
    document.getElementById('stxt').textContent=s.length+' scored · '+u.length+' pending · '+new Date().toLocaleTimeString();
    if(selected&&s.find(t=>t.token_id===selected)){
      const d2=await fetch('/api/token/'+selected).then(r=>r.json());
      renderDetail(d2);
    }
  }catch(e){document.getElementById('stxt').textContent='Error: '+e.message;}
}
refresh();setInterval(refresh,60000);
</script>
</body>
</html>`;

app.get('/', async (_, reply) => { reply.type('text/html').send(HTML); });

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { console.error(err); process.exit(1); }
  console.log('Dashboard running at http://187.124.88.22:' + PORT);
});
