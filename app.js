(function(){
  function start(){ try{ main(); }catch(e){ console.error(e); alert('Init error: '+e.message); } }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();

function main(){
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const KEYS = { entries:'smoke_entries_v1', settings:'smoke_settings_v1', timer:'smoke_timer_v1', badges:'smoke_badges_v1', theme:'smoke_theme_v1' };
  const load=(k,d)=>{ try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;} };
  const save=(k,v)=> localStorage.setItem(k, JSON.stringify(v));
  const DEFAULT_TRIGGERS=['Stress','After meal','Coffee/Tea','Alcohol','Social','Boredom','Commute','Other'];
  let entries=load(KEYS.entries,[]);
  let settings=load(KEYS.settings,{ costPerPack:0, cigsPerPack:20, baseline:null, quitDate:null, plan:[], timerMinutes:10, triggers:DEFAULT_TRIGGERS.slice(), badgeFilter:'all', cravingSavingsTotal:0, savingsGoalAmount:0, savingsGoalBasis:'total' });
  const themeSel=$('#themeSwitch');
  function applyTheme(m){ if(!themeSel) return; themeSel.value=m; const r=document.documentElement; if(m==='light') r.setAttribute('data-theme','light'); else if(m==='dark') r.setAttribute('data-theme','dark'); else r.removeAttribute('data-theme'); save(KEYS.theme,m);} applyTheme(load(KEYS.theme,'system')); themeSel?.addEventListener('change',()=>applyTheme(themeSel.value));

  $$('.tab-btn').forEach(b=> b.addEventListener('click', ()=> switchTab(b.dataset.tab)));
  function switchTab(id){ $$('.tab-btn').forEach(b=>{ const a=b.dataset.tab===id; b.classList.toggle('active',a); b.setAttribute('aria-selected', a?'true':'false'); }); $$('.tab-panel').forEach(p=> p.classList.toggle('active', p.id===id)); if(id==='dashboard') renderDashboard(); if(id==='history') renderHistory(); if(id==='plan') renderPlan(); if(id==='log') renderLogTriggers(); }

  // utils
  const todayKey=(d=new Date())=> d.toISOString().slice(0,10);
  const fmtDate=(d)=> new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  const fmtTime=(d)=> new Date(d).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  const randId=()=> Math.random().toString(36).slice(2)+Date.now().toString(36);
  const groupByDay=(arr)=> arr.reduce((a,e)=>{const k=e.ts.slice(0,10); (a[k]=a[k]||[]).push(e); return a;},{});
  const dayTotals=(arr)=> Object.fromEntries(Object.entries(groupByDay(arr)).map(([k,v])=>[k, v.filter(x=>x.type!=='craving').reduce((s,e)=>s+Number(e.count||0),0)]));
  const perCig=()=> settings.cigsPerPack ? (Number(settings.costPerPack||0)/Number(settings.cigsPerPack||1)) : 0;
  const getPlanLimit=(iso)=> (settings.plan||[]).find(p=>p.date===iso)?.limit ?? null;
  function showToast(m){ const c=$('#toastContainer'); if(!c) return; const el=document.createElement('div'); el.className='toast'; el.textContent=m; c.appendChild(el); setTimeout(()=>{ el.style.opacity=0; el.style.transform='translateY(8px)'; setTimeout(()=> el.remove(), 300); }, 4200); }

  // dashboard
  function renderDashboard(){ const totals=dayTotals(entries); const k=todayKey(); const cnt=totals[k]||0; $('#todayCount').textContent=cnt; const lim=getPlanLimit(k); $('#todayLimit').textContent=lim??'—'; $('#remaining').textContent=(lim!=null)?Math.max(0,lim-cnt):'—'; renderSpark(totals); renderMoney(); draw30(totals); drawHeatmap(); }
  function renderSpark(totals){ const sp=$('#sparkline'); sp.innerHTML=''; const now=new Date(); for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const k=d.toISOString().slice(0,10); const c=totals[k]||0; const lim=getPlanLimit(k); const max=Math.max(5,c,lim||0); const h=Math.round((Math.min(Math.max(c,lim||0),max)/max)*100); const bar=document.createElement('div'); bar.className='sparkbar'+(lim!=null&&c>lim?' over':''); bar.style.height=Math.max(4,h)+'%'; bar.title=`${k}: ${c}${lim!=null?` / limit ${lim}`:''}`; sp.appendChild(bar);} const sum=[...sp.children].length? Object.values(totals).slice(-7).reduce((a,b)=>a+b,0):0; $('#weeklySummary').textContent=`${sum} cigarettes in last 7 days`; }
  function renderMoney(){ const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth(),1), end=new Date(now.getFullYear(),now.getMonth()+1,0); const monthTotal=entries.filter(e=>{const dt=new Date(e.ts); return e.type!=='craving' && dt>=start && dt<=end;}).reduce((s,e)=>s+Number(e.count||0),0); const price=perCig(); const spent=monthTotal*price; const baselineMonth=settings.baseline? settings.baseline*end.getDate():null; const saved=baselineMonth!=null? Math.max(0,(baselineMonth-monthTotal)*price):0; const timerCompletions = entries.filter(e=> e.type==='craving' && e.action==='complete' && (new Date(e.ts))>=start && (new Date(e.ts))<=end).length; const savedCraving = timerCompletions * price; const fmt=(n)=> new Intl.NumberFormat(undefined,{style:'currency',currency:'INR'}).format(n||0); $('#moneySpent').textContent=fmt(spent); $('#moneySaved').textContent=fmt(saved); $('#moneyCravingSaved').textContent=fmt(savedCraving); $('#moneyCravingSavedTotal').textContent=fmt(settings.cravingSavingsTotal||0); const goal=Number(settings.savingsGoalAmount||0); const basis=settings.savingsGoalBasis||'total'; const current=basis==='month'? savedCraving : (settings.cravingSavingsTotal||0); const pct=goal>0? Math.min(100,Math.round((current/goal)*100)):0; $('#savingsProgressBar').style.width=pct+'%'; $('#savingsGoalText').textContent=goal? fmt(goal)+(basis==='month'?' (this month)':' (total)'):'—'; $('#savingsProgressPct').textContent=pct+'%'; }

  // quick log & undo
  $('#quickLog1')?.addEventListener('click',()=> addEntry({count:1}));
  $('#undoLast')?.addEventListener('click',()=>{ const last=entries[entries.length-1]; if(!last) return alert('No entries to undo.'); if(confirm('Remove the last entry?')){ entries.pop(); save(KEYS.entries,entries); renderDashboard(); if($('#history').classList.contains('active')) renderHistory(); }});

  // log form
  const logForm=$('#logForm');
  logForm?.addEventListener('submit',(e)=>{ e.preventDefault(); const count=Number($('#count').value||1); const when=$('#when').value? new Date($('#when').value): new Date(); const trigger=$('#triggerSelect').value||''; const mood=$('#mood').value||''; const note=$('#note').value?.trim()||''; addEntry({count, ts:when.toISOString(), trigger, mood, note}); logForm.reset(); renderLogTriggers(); });
  function addEntry({count=1, ts=(new Date()).toISOString(), trigger='', mood='', note=''}){ const e={type:'smoke', id:randId(), ts, count:Number(count)||1, trigger, mood, note}; entries.push(e); entries.sort((a,b)=> a.ts.localeCompare(b.ts)); save(KEYS.entries,entries); renderDashboard(); if($('#history').classList.contains('active')) renderHistory(); }

  // history
  function renderHistory(){ const list=$('#historyList'); if(!list) return; list.innerHTML=''; const groups=Object.entries(groupByDay(entries)).sort((a,b)=> b[0].localeCompare(a[0])); if(groups.length===0){ list.innerHTML='<p class="muted">No entries yet.</p>'; return;} for(const [day,items] of groups){ const dayTotal=items.filter(x=>x.type!=='craving').reduce((s,e)=>s+Number(e.count||0),0); const wrap=document.createElement('div'); const head=document.createElement('div'); head.className='row'; head.innerHTML=`<h3 style="margin:0">${fmtDate(day)}</h3><span class="muted">Total: ${dayTotal}</span>`; wrap.appendChild(head); items.sort((a,b)=> a.ts.localeCompare(b.ts)); items.forEach(e=>{ const item=document.createElement('div'); item.className='item'; const left=document.createElement('div'); const right=document.createElement('div'); right.className='actions'; if(e.type==='craving'){ const label=e.action==='complete'?'Completed':'Craving'; left.innerHTML=`<div><strong>${label}</strong> at ${fmtTime(e.ts)}</div>`; } else if(e.type==='note' && e.rr){ left.innerHTML=`<div><strong>Relapse repair plan saved</strong> at ${fmtTime(e.ts)}</div>`; } else { left.innerHTML=`<div><strong>${e.count}</strong> at ${fmtTime(e.ts)}</div>`; } const del=document.createElement('button'); del.className='btn danger'; del.textContent='Delete'; del.addEventListener('click',()=>{ if(confirm('Delete this item?')){ entries=entries.filter(x=>x.id!==e.id); save(KEYS.entries,entries); renderHistory(); renderDashboard(); }}); right.appendChild(del); item.appendChild(left); item.appendChild(right); wrap.appendChild(item); }); list.appendChild(wrap);} }

  // triggers
  function renderLogTriggers(){ const sel=$('#triggerSelect'); if(!sel) return; sel.innerHTML=''; const opt=document.createElement('option'); opt.value=''; opt.textContent='— choose —'; sel.appendChild(opt); (settings.triggers||DEFAULT_TRIGGERS).forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o); }); const chips=$('#chipsRow'); if(chips){ chips.innerHTML=''; (settings.triggers||DEFAULT_TRIGGERS).forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=t; b.addEventListener('click',()=>{ $('#triggerSelect').value=t; $('#count').value=1; $('#when').value=''; $('#mood').value=''; $('#note').value=''; $('#count').focus();}); chips.appendChild(b); }); }
  }

  // plan
  function generatePlan(baseline, quitDate){ const plan=[]; const start=new Date(); start.setHours(0,0,0,0); let daily=Math.max(0,Math.round(baseline)); for(let d=0; d<90; d++){ const cur=new Date(start); cur.setDate(start.getDate()+d); if(d>0 && d%7===0) daily=Math.round(daily*0.8); const iso=cur.toISOString().slice(0,10); plan.push({date:iso,limit:(quitDate && iso>=quitDate)?0:Math.max(0,daily)}); } return plan; }
  function renderPlan(){ $('#baseline').value=settings.baseline??''; $('#quitDate').value=settings.quitDate??''; $('#costPerPack').value=settings.costPerPack??''; $('#cigsPerPack').value=settings.cigsPerPack??''; $('#timerMinutes').value=settings.timerMinutes??10; $('#savingsGoalAmount').value=settings.savingsGoalAmount??''; $('#savingsGoalBasis').value=settings.savingsGoalBasis||'total'; const grid=$('#planGrid'); if(!grid) return; grid.innerHTML=''; if(!settings.plan||!settings.plan.length){ grid.innerHTML='<p class="muted">No plan yet. Enter baseline and optional quit date, then click Generate.</p>'; return;} const todayISO=todayKey(); settings.plan.forEach(p=>{ const card=document.createElement('div'); card.className='plan-day'+(p.date===todayISO?' today':''); const h=document.createElement('h4'); h.textContent=new Date(p.date).toLocaleDateString(undefined,{month:'short', day:'numeric', weekday:'short'}); const input=document.createElement('input'); input.type='number'; input.min='0'; input.value=p.limit; input.addEventListener('change',()=>{ p.limit=Number(input.value||0); save(KEYS.settings,settings); if($('#dashboard').classList.contains('active')) renderDashboard(); }); card.appendChild(h); card.appendChild(input); grid.appendChild(card); }); }
  $('#generatePlan')?.addEventListener('click',()=>{ const baseline=Number($('#baseline').value||settings.baseline||0); const qd=$('#quitDate').value||settings.quitDate||null; settings.baseline=baseline>0?baseline:null; settings.quitDate=qd; settings.costPerPack=Number($('#costPerPack').value||settings.costPerPack||0); settings.cigsPerPack=Number($('#cigsPerPack').value||settings.cigsPerPack||20); settings.timerMinutes=Math.max(1, Number($('#timerMinutes').value||settings.timerMinutes||10)); if(baseline>0){ settings.plan=generatePlan(baseline,qd);} save(KEYS.settings,settings); renderPlan(); renderDashboard(); renderLogTriggers(); });
  $('#clearPlan')?.addEventListener('click',()=>{ if(confirm('Clear your plan?')){ settings.plan=[]; save(KEYS.settings,settings); renderPlan(); renderDashboard(); }});
  $('#saveSavingsGoal')?.addEventListener('click',()=>{ settings.savingsGoalAmount=Math.max(0, Number($('#savingsGoalAmount').value||0)); settings.savingsGoalBasis=$('#savingsGoalBasis').value||'total'; save(KEYS.settings,settings); showToast('Savings goal saved.'); renderDashboard(); });
  $('#clearSavingsGoal')?.addEventListener('click',()=>{ settings.savingsGoalAmount=0; save(KEYS.settings,settings); showToast('Savings goal cleared.'); renderDashboard(); });

  // Coach client (local/offline only for safe build)
  const coachMessages=$('#coachMessages'); const coachInput=$('#coachText'); const coachSend=$('#coachSend'); const coachShare=$('#coachShareContext'); const coachStatus=$('#coachStatus');
  if(coachSend){
    $('#coach')?.addEventListener('click',(e)=>{ const chip=e.target.closest('[data-coach-prompt]'); if(!chip) return; coachInput.value=chip.dataset.coachPrompt; coachInput.focus(); });
    coachSend.addEventListener('click', sendCoachMessage);
    coachInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendCoachMessage(); }});
  }
  function pushMsg(role,text){ const row=document.createElement('div'); row.className='msg '+(role==='user'?'me':'ai'); const b=document.createElement('div'); b.className='bubble'; b.textContent=text; row.appendChild(b); coachMessages.appendChild(row); coachMessages.scrollTop=coachMessages.scrollHeight; }
  async function sendCoachMessage(){ const text=(coachInput.value||'').trim(); if(!text) return; pushMsg('user',text); coachInput.value=''; coachStatus.textContent='Thinking…'; try{ pushMsg('assistant', offlineTip()); } finally { coachStatus.textContent=''; } }
  function offlineTip(){ const tips=['Pause. Breathe in 4s, out 6s. Cravings pass like waves.','Stand up, sip water, take a 2‑minute walk.','Delay 5 minutes—use the timer—then re‑check the urge.']; return tips[Math.floor(Math.random()*tips.length)]; }

  // Daily check-in save stub
  const ciEnabled=$('#checkinEnabled'); const ciTime=$('#checkinTime'); const ciSave=$('#checkinSave'); if(ciSave){ ciSave.addEventListener('click',()=>{ alert('Daily check‑in saved (safe mode).'); }); }

  // Initial renders
  renderLogTriggers();
  renderDashboard();
}
