/* MyLedger V0.1.5 · 本地财务分析。只读交易数据，不写入交易/同步队列。 */
(()=>{
'use strict';
const get = id => document.getElementById(id);
const money = cents => `${cents<0?'−':''}¥${(Math.abs(cents)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const compact = cents => (cents/100).toLocaleString('zh-CN',{maximumFractionDigits:0});
const z = n => String(n).padStart(2,'0');
const iso = date => `${date.getFullYear()}-${z(date.getMonth()+1)}-${z(date.getDate())}`;
const addDays = (d,n) => new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const safe = text => String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors = ['#166cff','#12cbb5','#ffbb61','#956bff','#4ea9ec','#f27ead','#9aaec6','#38b28f'];
const excludedKey='myledger-analytics-excluded-v1';
const budgetKey='myledger-analytics-budgets-v1';
let period='week',mode='all',cursor=new Date(),latest=[],ready=false;
const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v&&typeof v==='object'?v:fallback;}catch{return fallback;}};
let excluded = readJson(excludedKey,['驾照专项']);
if(!Array.isArray(excluded))excluded=['驾照专项'];
let budgets = readJson(budgetKey,{});
if(Array.isArray(budgets))budgets={};
function bounds(anchor,type=period){
  const y=anchor.getFullYear(),m=anchor.getMonth();
  let from,to;
  if(type==='week'){from=addDays(anchor,-(anchor.getDay()+6)%7);to=addDays(from,6);}
  if(type==='month'){from=new Date(y,m,1);to=new Date(y,m+1,0);}
  if(type==='year'){from=new Date(y,0,1);to=new Date(y,11,31);}
  return {from,to,first:iso(from),last:iso(to)};
}
function shiftDate(anchor,units,type=period){
  if(type==='week')return addDays(anchor,units*7);
  if(type==='month')return new Date(anchor.getFullYear(),anchor.getMonth()+units,1);
  return new Date(anchor.getFullYear()+units,0,1);
}
function countDays(from,to){return Math.max(1,Math.round((Date.UTC(to.getFullYear(),to.getMonth(),to.getDate())-Date.UTC(from.getFullYear(),from.getMonth(),from.getDate()))/86400000)+1);}
function periodName(b){
  if(period==='week')return `${b.from.getFullYear()===b.to.getFullYear()?'':b.from.getFullYear()+'年'}${b.from.getMonth()+1}/${b.from.getDate()} – ${b.to.getMonth()+1}/${b.to.getDate()}`;
  if(period==='month')return `${b.from.getFullYear()}年${b.from.getMonth()+1}月`;
  return `${b.from.getFullYear()}年`;
}
function filteredRecords(rows){return mode==='all'?rows:rows.filter(r=>!(r.txnType==='expense'||r.txnType==='refund')||!excluded.includes(r.category));}
const net = r => r.txnType==='expense'?r.amountCents:r.txnType==='refund'?-r.amountCents:0;
function aggregate(rows){return {net:rows.reduce((n,r)=>n+net(r),0),income:rows.reduce((n,r)=>n+(r.txnType==='income'?r.amountCents:0),0),expenses:rows.filter(r=>r.txnType==='expense'),refunds:rows.filter(r=>r.txnType==='refund')};}
function dataForRange(rows,b){return rows.filter(r=>r.txnDate>=b.first&&r.txnDate<=b.last);}
function samePeriodData(rows,b,elapsed){
  const prev=bounds(shiftDate(b.from,-1));
  const last = elapsed===null ? prev.to : addDays(prev.from,Math.min(elapsed,countDays(prev.from,prev.to))-1);
  const end=last>prev.to?prev.to:last;
  return {range:prev,values:aggregate(rows.filter(r=>r.txnDate>=prev.first&&r.txnDate<=iso(end)))};
}
function trendPoints(rows,b){
  const result=[];let labels=[],length=0;
  if(period==='week')length=7;
  if(period==='month')length=b.to.getDate();
  if(period==='year')length=12;
  for(let i=0;i<length;i++){
    const start=period==='year'?new Date(b.from.getFullYear(),i,1):addDays(b.from,i);
    const end=period==='year'?new Date(b.from.getFullYear(),i+1,0):start;
    const d=dataForRange(rows,{first:iso(start),last:iso(end)});
    const totals=aggregate(d);
    const label=period==='week'?'一二三四五六日'[i]:period==='month'?`${i+1}日`:`${i+1}月`;
    result.push({label,net:totals.net,income:totals.income});
  }
  return result;
}
function svgLineChart(points){
  const W=680,H=260,L=53,R=16,T=17,B=38,plotW=W-L-R,plotH=H-T-B;
  const all=points.flatMap(p=>[p.net,p.income,0]);
  const rawMax=Math.max(0,...all),rawMin=Math.min(0,...all);
  let max=rawMax>0?rawMax*1.13:10000,min=rawMin<0?rawMin*1.13:0;
  if(max-min<1000)max=min+1000;
  const x=i=>L+(points.length===1?plotW/2:i*plotW/(points.length-1));
  const y=n=>T+(max-n)/(max-min)*plotH;
  const segments=values=>values.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
  const spendPath=segments(points.map(p=>p.net));
  const incomePath=segments(points.map(p=>p.income));
  const zeroY=y(0);
  const area=spendPath+` L${x(points.length-1).toFixed(2)} ${zeroY.toFixed(2)} L${x(0).toFixed(2)} ${zeroY.toFixed(2)} Z`;
  const grid=Array.from({length:5},(_,i)=>{
    const val=min+(max-min)*(4-i)/4,yy=y(val);
    return `<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#dce8f7" stroke-dasharray="4 5"/><text x="${L-9}" y="${yy+4}" text-anchor="end" fill="#8298b7" font-size="12">${safe(compact(Math.round(val)))}</text>`;
  }).join('');
  const indexSet=new Set(points.map((p,i)=>i).filter(i=>points.length<=12 || i===0||i===points.length-1||i%Math.ceil(points.length/6)===0));
  const labels=points.map((p,i)=>indexSet.has(i)?`<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="#8396b2" font-size="12">${safe(p.label)}</text>`:'').join('');
  const circles=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.net)}" r="${points.length>16?2.5:4.2}" fill="#1676ff" stroke="white" stroke-width="${points.length>16?1:2}"><title>${safe(p.label)} · 净消费 ${safe(money(p.net))}</title></circle>`).join('');
  return `<svg class="analytics-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="净消费和收入趋势，可悬停数据点查看金额" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="insightsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1688fa" stop-opacity=".24"/><stop offset="100%" stop-color="#1688fa" stop-opacity=".012"/></linearGradient></defs>${grid}<line x1="${L}" x2="${W-R}" y1="${zeroY}" y2="${zeroY}" stroke="#adcbe8" stroke-width="1.2"/><path d="${area}" fill="url(#insightsFill)"/><path d="${spendPath}" fill="none" stroke="#1676ff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${incomePath}" fill="none" stroke="#11baa8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${circles}${labels}</svg>`;
}
function renderCategory(rows){
  const byCat=new Map();
  rows.forEach(r=>{if(r.txnType==='expense'||r.txnType==='refund')byCat.set(r.category,(byCat.get(r.category)||0)+net(r));});
  const positive=[...byCat.entries()].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const denominator=positive.reduce((s,[,v])=>s+v,0);
  const visible=positive.slice(0,6).map(([name,value])=>({name,value}));
  if(positive.length>6)visible.push({name:'其他类别',value:positive.slice(6).reduce((s,[,v])=>s+v,0)});
  const gradient=[];let start=0;
  visible.forEach((v,i)=>{const end=start+v.value/Math.max(1,denominator)*100;gradient.push(`${colors[i%colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`);start=end;});
  get('analyticsDonut').style.background=denominator>0?`conic-gradient(${gradient.join(',')})`:'conic-gradient(#dce7f7 0 100%)';
  get('analyticsCategoryCount').textContent=`${positive.length} 类`;
  const out=get('analyticsCategoryRows');
  if(!visible.length){out.innerHTML='<div class="analytics-empty">这一时期还没有分类消费</div>';return;}
  out.innerHTML=visible.map((v,i)=>{const pct=v.value/denominator*100;return `<div class="analytics-category-row"><div class="analytics-category-name"><i style="background:${colors[i%colors.length]}"></i><span title="${safe(v.name)}">${safe(v.name)}</span><strong>${pct.toFixed(1)}%</strong></div><div class="analytics-progress-track"><span style="width:${pct.toFixed(2)}%;background:${colors[i%colors.length]}"></span></div><small>${safe(money(v.value))}</small></div>`;}).join('');
}
function budgetMonth(){return `${cursor.getFullYear()}-${z(cursor.getMonth()+1)}`;}
function renderBudget(rows){
  const month=budgetMonth(),v=Number(budgets[month])||0;
  const currentMonth=rows.filter(r=>r.txnDate.startsWith(month));
  const total=aggregate(currentMonth).net;
  get('analyticsBudgetName').textContent=`${cursor.getFullYear()}年${cursor.getMonth()+1}月预算`;
  get('analyticsBudgetValue').textContent=v>0?money(v):'未设置预算';
  const pct=v>0?Math.max(0,total/v*100):0;
  get('analyticsBudgetFill').style.width=Math.min(100,pct).toFixed(2)+'%';
  get('analyticsBudgetFill').classList.toggle('over',pct>100);
  get('analyticsBudgetFooter').textContent=v>0?`已用 ${money(total)} · ${pct.toFixed(1)}% · ${v>=total?'剩余 '+money(v-total):'超出 '+money(total-v)}`:'点击右上角设置每月预算（仅保存在本设备）';
}
function renderInsights(rows,totals,prev,peak,positiveCats,comparable){
  const lines=[];
  const list=[...positiveCats].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(!rows.length){lines.push('本期尚无记录。新增消费后，趋势和洞察将自动更新。');}
  else{
    if(list.length){const [name,value]=list[0];const positiveTotal=list.reduce((s,[,v])=>s+Math.max(0,v),0);lines.push(`${name}是本期占比最高的消费类别，占正向分类净消费的 ${(value/positiveTotal*100).toFixed(1)}%。`);}
    else lines.push('本期没有正向净消费，可能仅有收入、转账或退款。');
    if(comparable&&prev.net!==0){const pct=Math.abs((totals.net-prev.net)/Math.abs(prev.net)*100).toFixed(1);lines.push(`净消费较上期可比时段${totals.net>=prev.net?'增加':'减少'} ${pct}%，变化金额 ${money(Math.abs(totals.net-prev.net))}。`);}
    else lines.push('上期可比时段无可用于计算百分比的消费数据。');
    if(peak&&peak.value>0)lines.push(`${peak.date} 是本期消费最高的一天，净消费 ${money(peak.value)}。`);
  }
  get('analyticsInsights').innerHTML=lines.map(t=>`<div class="analytics-insight-row"><span class="analytics-tick">✓</span><span>${safe(t)}</span></div>`).join('');
}
function buildPeak(rows){
  const daily=new Map();rows.forEach(r=>daily.set(r.txnDate,(daily.get(r.txnDate)||0)+net(r)));
  return [...daily.entries()].map(([date,value])=>({date,value})).sort((a,b)=>b.value-a.value)[0]||null;
}
function setExcludedChoices(){
  const seen=[...new Set(['驾照专项',...latest.filter(r=>r.txnType==='expense'||r.txnType==='refund').map(r=>r.category)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-CN'));
  get('analyticsExcludeCategories').innerHTML=seen.map(c=>`<label><input type="checkbox" data-exclude-category="${safe(c)}" ${excluded.includes(c)?'checked':''}><span>${safe(c)}</span></label>`).join('');
}
function render(rows=latest){
  latest=Array.isArray(rows)?rows:[];
  if(!ready)return;
  const r=filteredRecords(latest),b=bounds(cursor),current=dataForRange(r,b),totals=aggregate(current),now=new Date(),currentBounds=bounds(now);
  const isCurrent=b.first===currentBounds.first;
  let elapsed=null;
  if(isCurrent)elapsed=countDays(b.from,now);
  const days=isCurrent?Math.min(elapsed,countDays(b.from,b.to)):countDays(b.from,b.to);
  const comparison=samePeriodData(r,b,elapsed);
  const prev=comparison.values;
  const hasComparable=prev.net!==0;
  get('analyticsPeriodLabel').textContent=periodName(b);
  get('analyticsNext').disabled=b.last>=currentBounds.last;
  get('analyticsNet').textContent=money(totals.net);
  get('analyticsIncome').textContent=money(totals.income);
  get('analyticsDaily').textContent=money(Math.round(totals.net/Math.max(1,days)));
  get('analyticsDays').textContent=`按 ${days} 个自然日计算`;
  get('analyticsBalance').textContent=money(totals.income-totals.net);
  let comparisonText='上一期可比时段暂无消费';
  let comparisonFigure='—';
  if(hasComparable){
    const difference=totals.net-prev.net, percent=Math.abs(difference/Math.abs(prev.net)*100);
    const direction=difference>0?'增加':difference<0?'减少':'持平';
    comparisonText=difference===0?'与上期可比时段持平':`较上期可比时段${direction} ${percent.toFixed(1)}%`;
    comparisonFigure=difference===0?'0.0%':`${difference>0?'↑':'↓'} ${percent.toFixed(1)}%`;
  }else if(prev.net===0&&totals.net>0) comparisonText='上期消费为零，无法计算变化百分比';
  get('analyticsCompare').textContent=comparisonText;
  get('analyticsChange').textContent=comparisonFigure;
  get('analyticsChange').className='analytics-mini-figure '+(totals.net>prev.net?'up':totals.net<prev.net?'down':'');
  get('analyticsChangeDetails').textContent=`本期 ${money(totals.net)} · 上期可比 ${money(prev.net)}${isCurrent?'（截至今天）':''}`;
  get('analyticsTrendChart').innerHTML=svgLineChart(trendPoints(current,b));
  get('analyticsTrendNote').textContent=period==='year'?'每个点代表一个月。净消费为支出减退款；收入独立显示。':period==='month'?'每个点代表一天。净消费可能因为退款而小于零。':'周一至周日；图表包含已记录的收入、支出和退款。';
  renderCategory(current);
  renderBudget(r);
  const peak=buildPeak(current);
  get('analyticsPeak').textContent=peak&&peak.value>0?peak.date.slice(5).replace('-','/'):'—';
  get('analyticsPeakDetails').textContent=peak&&peak.value>0?`当日净消费 ${money(peak.value)}`:'本期没有正向净消费';
  const big=totals.expenses.slice().sort((a,b)=>b.amountCents-a.amountCents).slice(0,5);
  get('analyticsTopRecords').innerHTML=big.length?big.map(v=>`<div class="analytics-top-row"><time>${safe(v.txnDate)}</time><div><strong>${safe(v.category)}</strong><span title="${safe(v.note||'')}" >${safe(v.note||v.payment||'消费记录')}</span></div><b>${safe(money(v.amountCents))}</b></div>`).join(''):'<div class="analytics-empty">本期还没有支出明细</div>';
  const cats=new Map();current.forEach(v=>{if(v.txnType==='expense'||v.txnType==='refund')cats.set(v.category,(cats.get(v.category)||0)+net(v));});
  renderInsights(current,totals,prev,peak,[...cats.entries()],hasComparable);
  get('analyticsScopeNote').textContent=mode==='all'?'全部消费：支出减退款；收入单独统计；内部转账不计入收支。':'基础生活：排除选定专项类别的支出与退款；收入和内部转账的口径不变。';
  document.querySelectorAll('[data-analysis-period]').forEach(v=>{const active=v.dataset.analysisPeriod===period;v.classList.toggle('selected',active);v.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-analysis-mode]').forEach(v=>{const active=v.dataset.analysisMode===mode;v.classList.toggle('selected',active);v.setAttribute('aria-pressed',String(active));});
  setExcludedChoices();
}
function setup(){
  ready=true;
  document.querySelectorAll('[data-analysis-period]').forEach(btn=>btn.addEventListener('click',()=>{period=btn.dataset.analysisPeriod;cursor=new Date();render();}));
  document.querySelectorAll('[data-analysis-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.analysisMode;render();}));
  get('analyticsPrev').addEventListener('click',()=>{cursor=shiftDate(cursor,-1);render();});
  get('analyticsNext').addEventListener('click',()=>{const next=shiftDate(cursor,1);if(bounds(next).first<=bounds(new Date()).first){cursor=next;render();}});
  get('analyticsSetBudget').addEventListener('click',()=>{
    const key=budgetMonth();const existing=Number(budgets[key])||0;
    const input=prompt(`设置 ${cursor.getFullYear()} 年 ${cursor.getMonth()+1} 月预算（元）。\n仅此设备保存。留空表示取消本月预算。`,existing?(existing/100).toFixed(2):'');
    if(input===null)return;
    if(!input.trim()){delete budgets[key];}
    else if(/^\d+(\.\d{1,2})?$/.test(input.trim())&&Number(input)>0&&Number(input)<1e9){budgets[key]=Math.round(Number(input)*100);}
    else{alert('请输入正数金额，最多保留两位小数。');return;}
    try{localStorage.setItem(budgetKey,JSON.stringify(budgets));}catch(e){alert('预算保存失败：'+e.message);return;}render();
  });
  get('analyticsExcludeCategories').addEventListener('change',event=>{
    const input=event.target.closest('input[data-exclude-category]');if(!input)return;
    const cat=input.dataset.excludeCategory;
    excluded=input.checked?[...new Set([...excluded,cat])]:excluded.filter(c=>c!==cat);
    try{localStorage.setItem(excludedKey,JSON.stringify(excluded));}catch(e){alert('排除类别设置保存失败：'+e.message);}
    render();
  });
  render(window.MyLedgerBridge?.getRecords?.()||[]);
}
window.MyLedgerAnalytics={render,onViewChange(view){if(view==='analytics')render(window.MyLedgerBridge?.getRecords?.()||latest);}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
