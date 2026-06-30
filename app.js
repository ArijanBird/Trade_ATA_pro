// ─── DATA ───────────────────────────────────────────────
const STOCKS = [
  {sym:'NVDA',name:'NVIDIA Corp',exch:'NASDAQ',base:875.30,color:'#9f6ef5',bg:'rgba(159,111,245,.25)'},
  {sym:'AAPL',name:'Apple Inc',exch:'NASDAQ',base:189.20,color:'#60a5fa',bg:'rgba(96,165,250,.25)'},
  {sym:'BTC',name:'Bitcoin',exch:'Crypto',base:62450,color:'#e040a8',bg:'rgba(224,64,168,.25)'},
  {sym:'ETH',name:'Ethereum',exch:'Crypto',base:3210,color:'#00e676',bg:'rgba(0,230,118,.25)'},
  {sym:'TSLA',name:'Tesla Inc',exch:'NASDAQ',base:172.50,color:'#ff3d57',bg:'rgba(255,61,87,.25)'},
  {sym:'MSFT',name:'Microsoft',exch:'NASDAQ',base:415.80,color:'#00b8d4',bg:'rgba(0,184,212,.25)'},
  {sym:'SPY',name:'S&P 500 ETF',exch:'NYSE',base:521.80,color:'#ffaa00',bg:'rgba(255,170,0,.25)'},
];

const INSIDER = [
  {sym:'NVDA',who:'CEO Jensen Huang',type:'Purchase',amount:'$4.2M',shares:'4,800 shares',desc:'CEO increased stake — third purchase this quarter. Historically precedes strong earnings periods. Confidence in upcoming product cycle visible in accumulation pattern.'},
  {sym:'MSFT',who:'Board Director S. Nadella',type:'Purchase',amount:'$2.8M',shares:'6,730 shares',desc:'Director bought near 52-week support. Previous similar purchases preceded 15–30% rallies within 6 months. AI division expansion cited as key driver.'},
  {sym:'ETH',who:'Grayscale Institutional',type:'Accumulation',amount:'$18.5M',shares:'5,760 ETH',desc:'Institutional accumulation at current levels. Whale wallets absorbing sell pressure for 12 consecutive days. ETF inflow momentum building.'},
  {sym:'AAPL',who:'CFO Luca Maestri',type:'Purchase',amount:'$1.1M',shares:'5,810 shares',desc:'CFO purchase signals confidence in upcoming earnings. Filed with SEC 3 days ago. Services revenue beat expected to drive next leg up.'},
];

let prices = {};
let history = {};
let alerts = [];
let alertCount = 0;
let currentDetail = null;
let deferredPrompt = null;

STOCKS.forEach(s => {
  prices[s.sym] = s.base;
  history[s.sym] = Array.from({length:20},()=>s.base*(1+(Math.random()-.5)*.015));
});

// ─── FORMAT ──────────────────────────────────────────────
function fmt(p, sym) {
  if(sym==='BTC') return '$'+Math.round(p).toLocaleString();
  if(sym==='ETH') return '$'+Math.round(p).toLocaleString();
  return '$'+p.toFixed(2);
}

// ─── TABS ────────────────────────────────────────────────
function goTab(id, el) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.bntab').forEach(t=>t.classList.remove('on'));
  document.getElementById('screen-'+id).classList.add('on');
  if(el) el.classList.add('on');
}

// ─── TICKER ──────────────────────────────────────────────
function renderTicker() {
  document.getElementById('tickerStrip').innerHTML = STOCKS.map(s=>`
    <div class="tick" id="tk-${s.sym}">
      <div class="tsym">${s.sym}</div>
      <div class="tprice" id="tp-${s.sym}">${fmt(prices[s.sym],s.sym)}</div>
      <div class="tchg" id="tc-${s.sym}">0.00%</div>
    </div>`).join('');
}

// ─── INSIDER ─────────────────────────────────────────────
function renderInsider() {
  document.getElementById('insiderList').innerHTML = INSIDER.map(i=>`
    <div class="ins-card">
      <div class="ins-top">
        <span class="ins-sym">${i.sym}</span>
        <span class="ins-badge">${i.type.toUpperCase()}</span>
      </div>
      <div class="ins-who">${i.who}</div>
      <div class="ins-amount">${i.amount} · ${i.shares}</div>
      <div class="ins-desc">${i.desc}</div>
    </div>`).join('');
}

// ─── ALERTS ──────────────────────────────────────────────
function renderAlerts() {
  const list = document.getElementById('alertList');
  document.getElementById('stAlerts').textContent = alertCount;
  if(!alerts.length) {
    list.innerHTML = `<div class="no-alerts"><div class="pulse-ring"></div>Scanning for significant movements...<br/><span style="font-size:10px;">Alerts trigger on ±2–5% moves</span></div>`;
    return;
  }
  list.innerHTML = alerts.slice(0,8).map(a=>`
    <div class="acard ${a.dir}" onclick="openDetail('${a.id}')">
      <div class="acard-top">
        <div class="asset-row">
          <div class="aicon" style="background:${a.stock.bg};color:${a.stock.color}">${a.stock.sym.slice(0,2)}</div>
          <div><div class="asym">${a.stock.sym}</div><div class="atype">${a.stock.name}</div></div>
        </div>
        <span class="abadge ${a.dir}">${a.pct>0?'+':''}${a.pct.toFixed(1)}%</span>
      </div>
      <div class="asig">${a.signal}</div>
      <div class="adesc">${a.desc}</div>
      ${a.loading?`<div class="ai-loading-row"><div class="ai-spinner"></div>AI analyzing...</div>`:''}
      <div class="atime">${a.time}</div>
    </div>`).join('');
}

function addAlert(stock, pct, newPrice) {
  const dir = pct > 0 ? 'up' : 'dn';
  const signal = pct > 3 ? 'Strong Bullish Breakout' : pct > 0 ? 'Bullish Move Detected' : pct < -3 ? 'Sharp Drop Alert' : 'Bearish Pullback';
  const desc = pct > 0
    ? `${stock.sym} surged ${pct.toFixed(1)}% — volume spike and momentum detected.`
    : `${stock.sym} dropped ${Math.abs(pct).toFixed(1)}% — selling pressure increasing.`;
  const conf = Math.min(95, Math.round(55 + Math.abs(pct)*8 + Math.random()*8));
  const snapHistory = [...history[stock.sym]];
  const alert = {id:Date.now()+'_'+stock.sym, stock, pct, newPrice, dir, signal, desc, conf, snapHistory, aiText:null, loading:true, time:'just now'};
  alerts.unshift(alert);
  alertCount++;
  renderAlerts();
  fetchAI(alert);
  tryNotify(signal, `${stock.sym} ${pct>0?'+':''}${pct.toFixed(1)}%`);
}

// ─── AI FETCH ────────────────────────────────────────────
async function fetchAI(alert) {
  const dir = alert.pct > 0 ? 'upward' : 'downward';
  const prompt = `You are an AI market analyst for A.T.A (AI Trading Alerts). A market asset just made a significant move.

Asset: ${alert.stock.sym} (${alert.stock.name})
Exchange: ${alert.stock.exch}
Price change: ${alert.pct>0?'+':''}${alert.pct.toFixed(2)}%
Current price: ${fmt(alert.newPrice,alert.stock.sym)}
Direction: ${dir}

Write a concise market analysis in 3-4 sentences covering:
1. The likely reason for this ${dir} move (technical or macro factors)
2. Key price levels to watch now
3. Short-term momentum outlook

Rules: No buy/sell recommendations. Professional and data-driven tone. End with: "This is informational only — not financial advice." Keep it under 80 words.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data = await res.json();
    const text = data.content?.map(c=>c.text||'').join('') || 'Analysis unavailable.';
    alert.aiText = text;
    alert.loading = false;
    renderAlerts();
    if(currentDetail===alert.id) updateDetailAI(alert);
  } catch(e) {
    alert.aiText = 'AI analysis temporarily unavailable.';
    alert.loading = false;
    renderAlerts();
    if(currentDetail===alert.id) updateDetailAI(alert);
  }
}

// ─── DETAIL ──────────────────────────────────────────────
function openDetail(id) {
  const a = alerts.find(x=>x.id===id);
  if(!a) return;
  currentDetail = id;
  document.getElementById('d-asset').textContent = a.stock.sym;
  document.getElementById('d-exch').textContent = a.stock.name + ' · ' + a.stock.exch;
  document.getElementById('d-price').textContent = fmt(a.newPrice, a.stock.sym);
  const chgEl = document.getElementById('d-chg');
  chgEl.textContent = (a.pct>0?'+':'')+a.pct.toFixed(2)+'%';
  chgEl.style.color = a.pct>0?'var(--green)':'var(--red)';
  document.getElementById('d-sig').textContent = a.signal;
  document.getElementById('d-risk').textContent = Math.abs(a.pct)>3?'High':'Medium';
  document.getElementById('d-risk').style.color = Math.abs(a.pct)>3?'var(--red)':'var(--amber)';
  document.getElementById('d-conf-num').textContent = a.conf+'%';
  document.getElementById('d-conf-lbl').textContent = a.conf+'%';
  document.getElementById('confFill').style.width = '0%';

  document.querySelectorAll('.bntab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('screen-detail').classList.add('on');

  setTimeout(()=>{
    document.getElementById('confFill').style.width = a.conf+'%';
    drawChart(a.snapHistory, a.dir);
    updateDetailAI(a);
  }, 80);
}

document.getElementById('detailBack').addEventListener('click', ()=>{
  currentDetail = null;
  goTab('dash', document.querySelector('.bntab'));
});

function updateDetailAI(a) {
  const spinner = document.getElementById('aiSpinner');
  const body = document.getElementById('aiBody');
  if(a.loading) {
    spinner.style.display='block';
    body.textContent = 'Generating AI analysis...';
  } else {
    spinner.style.display='none';
    body.textContent = a.aiText || 'Analysis unavailable.';
  }
}

// ─── CHART ───────────────────────────────────────────────
function drawChart(priceArr, dir) {
  const canvas = document.getElementById('chart');
  const W = canvas.offsetWidth; const H = 160;
  canvas.width = W*2; canvas.height = H*2;
  const ctx = canvas.getContext('2d'); ctx.scale(2,2);
  ctx.clearRect(0,0,W,H);
  const min = Math.min(...priceArr)*.997, max = Math.max(...priceArr)*1.003;
  const range = max-min || 1;
  const barW = (W-24)/priceArr.length;
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=.5;
  for(let i=0;i<4;i++){const y=8+(H-16)*i/3;ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(W-12,y);ctx.stroke();}
  priceArr.forEach((p,i)=>{
    const open=i>0?priceArr[i-1]:p*.999;
    const close=p;
    const high=Math.max(open,close)*1.002;
    const low=Math.min(open,close)*.998;
    const x=12+i*barW+barW/2;
    const toY=v=>H-8-((v-min)/range)*(H-16);
    const isUp=close>=open;
    ctx.strokeStyle=isUp?'#00e676':'#ff3d57'; ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x,toY(high));ctx.lineTo(x,toY(low));ctx.stroke();
    ctx.fillStyle=isUp?'#00e676':'#ff3d57';
    ctx.fillRect(x-barW*.35,Math.min(toY(open),toY(close)),barW*.7,Math.max(2,Math.abs(toY(open)-toY(close))));
  });
  const lineColor=dir==='up'?'rgba(0,230,118,.5)':'rgba(255,61,87,.5)';
  ctx.strokeStyle=lineColor; ctx.lineWidth=1.2; ctx.setLineDash([3,3]);
  ctx.beginPath();
  priceArr.forEach((p,i)=>{const x=12+i*barW+barW/2;const y=H-8-((p-min)/range)*(H-16);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke(); ctx.setLineDash([]);
}

// ─── MARKET SIMULATION ───────────────────────────────────
function tick() {
  STOCKS.forEach(s => {
    const old = prices[s.sym];
    const move = (Math.random()-.48)*1.3;
    const newP = old*(1+move/100);
    prices[s.sym] = newP;
    history[s.sym].push(newP);
    if(history[s.sym].length>30) history[s.sym].shift();

    const totalChg = (newP-s.base)/s.base*100;
    const tp=document.getElementById('tp-'+s.sym);
    const tc=document.getElementById('tc-'+s.sym);
    const tk=document.getElementById('tk-'+s.sym);
    if(tp) tp.textContent=fmt(newP,s.sym);
    if(tc){tc.textContent=(totalChg>0?'+':'')+totalChg.toFixed(2)+'%';tc.style.color=totalChg>0?'var(--green)':'var(--red)';}
    if(tk){
      tk.classList.remove('flash-up','flash-down');
      void tk.offsetWidth;
      tk.classList.add(move>0?'flash-up':'flash-down');
      setTimeout(()=>tk.classList.remove('flash-up','flash-down'),500);
    }

    const absChg=Math.abs(totalChg);
    const threshold=parseInt(document.getElementById('threshSlider').value)||2;
    if(absChg>=threshold && absChg<=6){
      const alreadyAlerted=alerts.some(a=>a.stock.sym===s.sym&&Math.abs(Date.now()-parseInt(a.id))<90000);
      if(!alreadyAlerted) addAlert(s,totalChg,newP);
    }
  });

  const totalChgs=STOCKS.map(s=>(prices[s.sym]-s.base)/s.base*100);
  const avg=totalChgs.reduce((a,b)=>a+b,0)/totalChgs.length;
  const sentEl=document.getElementById('stSent');
  sentEl.textContent=avg>0.3?'Bullish':avg<-0.3?'Bearish':'Neutral';
  sentEl.style.color=avg>0.3?'var(--green)':avg<-0.3?'var(--red)':'var(--amber)';
}

// ─── SETTINGS ────────────────────────────────────────────
function toggleSetting(key) {
  const el=document.getElementById('tog'+key.charAt(0).toUpperCase()+key.slice(1));
  el.classList.toggle('on');
  if(key==='notif' && el.classList.contains('on')) requestNotifPermission();
}

// ─── NOTIFICATIONS ───────────────────────────────────────
async function requestNotifPermission() {
  if(!('Notification' in window)) return;
  await Notification.requestPermission();
}

function tryNotify(title, body) {
  const togNotif=document.getElementById('togNotif');
  if(!togNotif.classList.contains('on')) return;
  if(Notification.permission==='granted') {
    new Notification('A.T.A Alert: '+title,{body, icon:'icons/icon-192.png', badge:'icons/icon-192.png'});
  }
}

// ─── PWA INSTALL ─────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredPrompt=e;
});

document.getElementById('installBtn').addEventListener('click',async ()=>{
  if(deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
  } else {
    alert('To install:\niPhone: Tap Share → Add to Home Screen\nAndroid: Tap Menu → Add to Home Screen');
  }
});

// ─── SERVICE WORKER ──────────────────────────────────────
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ─── INIT ────────────────────────────────────────────────
renderTicker();
renderInsider();
setInterval(tick, 3000);
tick();
