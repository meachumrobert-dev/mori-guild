/* idlebuild.js (v3.7) — Mori's low-priority idle world builder.
   While the game is open she slowly advances seed stages (terrain → roads → villages → city-state)
   on nearby unbuilt regions, prioritizing the player's heading, active quest targets, and nearest
   seedable neighbors. Deterministic from the World Seed. Never steals the job queue from the player.
   Pauses when the tab is hidden, or on the lowest quality tier with a low battery.
   Away catch-up: lastSeen → elapsed (cap ~24 h of work) → work ticks spread over the first minute.
   Behave stays rule #1. No energy timers, no paywalls. */
(function(){
'use strict';
const SPEEDS={ slow:{tickSec:45, label:'slow'}, normal:{tickSec:18, label:'normal'} };
const AWAY_CAP_MS=24*3600*1000;
let X=null, acc=0, catchQ=[], catchAcc=0, catchBudget=0, heading={x:0,z:1}, lastPos=null, summary=null, shownSummary=false, batteryLow=false, batHooked=false;

function cfg(){ const s=X.S(); if(!s.idleBuild) s.idleBuild={on:true, speed:'normal', lastSeen:Date.now(), stats:{ticks:0, terrain:0, roads:0, villages:0, cities:0, pois:0}}; 
  if(!s.idleBuild.stats) s.idleBuild.stats={ticks:0, terrain:0, roads:0, villages:0, cities:0, pois:0};
  if(s.idleBuild.on==null) s.idleBuild.on=true; if(!s.idleBuild.speed) s.idleBuild.speed='normal';
  return s.idleBuild; }
function speed(){ return SPEEDS[cfg().speed]||SPEEDS.normal; }
function enabled(){ return !!cfg().on; }
function stampSeen(){ cfg().lastSeen=Date.now(); }
function progress(){ const n=X.programmedCount(); const total=X.PL.COUNT; return {built:n, total, pct:Math.round(n*1000/total)/10}; }

function pauseReason(){ if(!enabled()) return 'off';
  if(typeof document!=='undefined'&&document.hidden) return 'hidden';
  if(X.PERF&&X.PERF.q===0&&batteryLow) return 'battery';
  if(X.S().blue) return 'blue';
  // never compete with a real (non-idle) job
  const cj=X.curJob&&X.curJob(); if(cj&&!cj.idle) return 'busy';
  if((X.jobs()||[]).some(j=>!j.idle&&j.kind!=='gather')) return 'queued';
  return null; }

function hookBattery(){ if(batHooked||typeof navigator==='undefined'||!navigator.getBattery) return; batHooked=true;
  navigator.getBattery().then(b=>{ const upd=()=>{ batteryLow=(!b.charging&&b.level<0.2); }; upd(); b.addEventListener('levelchange',upd); b.addEventListener('chargingchange',upd); }).catch(()=>{}); }

function readTinkerHeading(){ try{
  const raw=localStorage.getItem('mori_guild3d_v3_save'); if(!raw) return null;
  const s=JSON.parse(raw); if(!s||!s.player) return null;
  const yaw=s.player.yaw||0; return {x:Math.sin(yaw), z:Math.cos(yaw), x0:s.player.x||0, z0:s.player.z||0, from:'tinker'};
} catch(e){ return null; } }

function updateHeading(dt){ const p=X.player.pos; if(!lastPos){ lastPos={x:p.x,z:p.z}; return; }
  const dx=p.x-lastPos.x, dz=p.z-lastPos.z, d=Math.hypot(dx,dz);
  if(d>0.05){ heading.x=dx/d; heading.z=dz/d; heading.from='live'; }
  lastPos={x:p.x,z:p.z}; }

function questRegion(){ const Q=window.QUESTS; if(!Q) return null;
  const act=Q.list.filter(q=>Q.state(q.id)&&Q.state(q.id).st==='active'); if(!act.length) return null;
  const q=act[0]; const place=q.place;
  if(place==='guild'||place==='bard') return typeof X.guildId==='function'?X.guildId():X.guildId;
  if(window.CLAN&&CLAN.pick){ const pk=CLAN.pick(); if(place==='clan') return pk.clan; if(place==='haven') return pk.sister; }
  return null; }

function score(id, hdg, qid){ const inf=X.PL.regionInfo(id); if(!inf) return 1e9;
  const pc=X.PL.regionCenter(X.curRegion()); const rc=inf.c;
  // direction from player region center to candidate
  const vx=rc[0]-pc[0], vz=rc[2]-pc[2]; const vl=Math.hypot(vx,vz)||1; const ux=vx/vl, uz=vz/vl;
  const align=-(hdg.x*ux+hdg.z*uz); // lower is better (want align → -1)
  const ang=X.PL.angle(pc,rc);
  const st=X.stageOf(id);
  let sc=ang*1.2+align*0.85+st*0.04;
  if(qid!=null&&id===qid) sc-=0.55;
  if(st===0) sc-=0.08; // prefer opening new neighbors a little
  if(st===3) sc-=0.05; // finish villages → city
  if(!inf.isLand) sc+=0.3;
  return sc; }

function pickTarget(){ if(!X.seedable) return -1;
  const hdg=heading.from?heading:(readTinkerHeading()||{x:0,z:1});
  const qid=questRegion();
  const cand=new Set();
  for(const k in (typeof X.WD==='function'?(typeof X.WD==='function'?X.WD():X.WD()):(typeof X.WD==='function'?X.WD():X.WD())).reg){ const id=+k; cand.add(id); X.PL.neighbors(id).forEach(n=>cand.add(n)); }
  // also neighbors of current region
  X.PL.neighbors(X.curRegion()).forEach(n=>cand.add(n));
  let best=-1, bs=1e9;
  cand.forEach(id=>{ if(!X.seedable(id)) return; const sc=score(id,hdg,qid); if(sc<bs){ bs=sc; best=id; } });
  return best; }

function recordAdvance(id, st){ const c=cfg(); c.stats.ticks=(c.stats.ticks||0)+1; if(window.TREASURY) TREASURY.mintStage(st, X.PL.regionInfo(id).name);
  if(st===1) c.stats.terrain=(c.stats.terrain||0)+1;
  if(st===2) c.stats.roads=(c.stats.roads||0)+1;
  if(st===3){ c.stats.villages=(c.stats.villages||0)+1; c.stats.pois=(c.stats.pois||0)+1; }
  if(st===4){ c.stats.cities=(c.stats.cities||0)+1; c.stats.pois=(c.stats.pois||0)+1; }
  if(summary){ summary.ticks++; summary.ids[id]=(summary.ids[id]||0)+1;
    if(st===1) summary.terrain++; if(st===2) summary.roads++; if(st===3) summary.villages++; if(st===4) summary.cities++;
    if(st>=3) summary.pois++; summary.names[id]=X.PL.regionInfo(id).name; }
}

function tick(quiet, force){ if(!force&&!enabled()) return null; const id=pickTarget(); if(id<0) return null;
  const before=X.stageOf(id); if(!X.advanceRegion(id, true)) return null;
  const st=X.stageOf(id); recordAdvance(id, st);
  if(!quiet&&st!==before){ const nm=X.PL.regionInfo(id).name; const stage=X.STAGES[st];
    if(Math.random()<0.35) X.log&&X.log('🌱 Mori (idle): '+nm+' → '+stage); }
  // rare flower/grove stamp on land terrain+ regions, only when not lowest quality (cheap finishNow)
  if(st>=1&&X.PERF&&X.PERF.q>0&&window.TERRAFORM&&X.PL.regionInfo(id).isLand&&(X.hash?(X.hash(id+st)&7)===0:((id*st)%7)===0)){
    try{ const TF=window.TF||window.TERRAFORM; const kind=(id+st)%2?'meadow':'grove';
      if(TF&&TF.plan&&TF.finishNow&&TF.pickSpot){ /* skip if current region visual busy */ if(id!==X.curRegion()||!X.curJob||!X.curJob()){ /* away-only soft stamp skipped live to save frames */ } }
    }catch(e){}
  }
  return {id, st, name:X.PL.regionInfo(id).name}; }

function hash(n){ let h=n|0; h^=X.S().seed?X.S().seed.length*101:0; for(let i=0;i<String(X.S().seed||'mori').length;i++) h=(Math.imul(h^String(X.S().seed).charCodeAt(i),16777619))|0; return h>>>0; }
/* A missing or junk stamp is "she is here now", never the 24 h cap.
   Date.now()-0 is decades, and the cap would turn that into a finished planet. */
function absenceMs(lastSeen, now){
  if(typeof lastSeen!=='number' || !isFinite(lastSeen) || lastSeen<=0) return 0;
  return Math.max(0, Math.min(AWAY_CAP_MS, now-lastSeen));
}
function owedTicks(elapsedMs){ const sec=Math.min(Math.max(0,elapsedMs)||0, AWAY_CAP_MS)/1000; return Math.floor(sec/speed().tickSec); }

function beginCatchUp(){ const c=cfg(); const now=Date.now(); catchQ=[]; summary=null; shownSummary=false;
  const missing=!(typeof c.lastSeen==='number' && isFinite(c.lastSeen) && c.lastSeen>0);
  if(missing){ c.lastSeen=now; return {owed:0, elapsed:0, missing:true}; }
  const elapsed=absenceMs(c.lastSeen, now);
  stampSeen(); const n=owedTicks(elapsed);
  if(n<=0||!enabled()) return {owed:0, elapsed, missing:false};
  const p0=progress();
  if(p0.built>=p0.total){
    summary={ticks:0, terrain:0, roads:0, villages:0, cities:0, pois:0, ids:{}, names:{}, elapsed, owed:0, skipped:n, finished:true, built:p0.built, total:p0.total, told:true};
    showSummary(summary, true); shownSummary=true;
    return {owed:0, elapsed, missing:false, finished:true, skipped:n};
  }
  summary={ticks:0, terrain:0, roads:0, villages:0, cities:0, pois:0, ids:{}, names:{}, elapsed, owed:n, told:false};
  for(let i=0;i<n;i++) catchQ.push(1);
  catchBudget=1; // one region step per beat — a long absence must not stampede the frame
  catchAcc=0;
  showSummary(summary, true); // the card is part of login, not a popup after the queue drains
  shownSummary=true;
  return {owed:n, elapsed, missing:false}; }

function flushCatchUp(dt){ if(!catchQ.length) return false;
  catchAcc+=dt; const pace=window.POWER&&POWER.pace?POWER.pace():{per:catchBudget||1, gap:0.4};
  const per=Math.max(1, pace.per|0);
  let n=0;
  const gap=pace.gap||0.4;
  if(catchAcc>=gap){
    const bite=Math.min(per, catchQ.length);
    while(catchQ.length&&n<bite){ catchQ.pop(); const step=tick(true,true); if(!step){ catchQ.length=0; break; } n++; }
    catchAcc=0;
  }
  if(!catchQ.length&&summary&&!summary.told){ summary.told=true; const line=moriVoice(summary); X.addChat&&X.addChat('mo', line); X.log&&X.log('🌱 Mori finished the work she queued while you were away.'); }
  return !!n; }

function moriVoice(s){ const bits=[];
  if(s.terrain) bits.push('shaped '+s.terrain+' region'+(s.terrain>1?'s':'')+' of terrain');
  if(s.roads) bits.push('laid roads in '+s.roads);
  if(s.villages) bits.push('raised '+s.villages+' little settlement'+(s.villages>1?'s':''));
  if(s.cities) bits.push('wrote '+s.cities+' city-state'+(s.cities>1?'s':''));
  if(s.pois&&!s.villages&&!s.cities) bits.push('placed '+s.pois+' points of interest');
  const names=Object.keys(s.names||{}).slice(0,4).map(id=>s.names[id]);
  let line='while you were away, i kept behaving and building. ';
  if(!bits.length) line+='i mostly pulled weeds and waited for you.';
  else line+='i '+bits.join(', ')+'.';
  if(names.length) line+=' places like '+names.join(', ')+(Object.keys(s.names).length>names.length?'…':'')+'.';
  const p=progress(); line+=' the world is '+p.built+' of '+p.total+' regions real now ('+p.pct+'%). want to walk that way with me?';
  return line; }

function showSummary(s, atLogin){ const hrs=Math.round((s.elapsed/3600000)*10)/10;
  const line=s.finished
    ?('the world was already finished — '+s.built+' of '+s.total+' regions. i did not spend the '+s.skipped+' away ticks. there was nothing left to build.')
    :(atLogin
    ?('i was away about '+hrs+' hours. i queued '+s.owed+' small build steps and i will work through them slowly, one at a time. the world will not jump ahead all at once.')
    :moriVoice(s));
  X.addChat&&X.addChat('mo', line);
  X.log&&X.log(s.finished?'🌱 The world was already finished. Mori did not spend the away ticks.':'🌱 While you were away, Mori built…');
  const card='<h3>'+(s.finished?'🌱 The world was already finished':'🌱 While you were away, Mori built…')+'</h3>'+
    '<div class="quote">"'+line+'"</div>'+
    '<div class="sec">'+(s.finished?('Away for ~'+hrs+' h · 0 work ticks spent ('+s.skipped+' skipped, the planet is done)'):('Away for ~'+hrs+' h · '+s.owed+' work ticks (cap 24 h)'))+'</div>'+
    '<div class="row"><span class="chip">Terrain '+s.terrain+'</span><span class="chip">Roads '+s.roads+'</span><span class="chip">Villages '+s.villages+'</span><span class="chip">Cities '+s.cities+'</span><span class="chip">POIs '+s.pois+'</span></div>'+
    '<div class="small">Idle building stays free — no energy timers, no paywalls. Toggle it in World Seed / settings. My #1 rule is still behave.</div>'+
    '<div class="row"><button class="pri" id="idleSumOk">Thanks, Mori</button></div>';
  if(X.modal){ X.modal(card, root=>{ const b=root.querySelector('#idleSumOk'); if(b) b.onclick=()=>document.getElementById('modal').classList.remove('open'); }); }
}

function update(dt){ if(!X) return; updateHeading(dt); hookBattery();
  if(catchQ.length){ flushCatchUp(dt); stampSeen(); return; }
  const reason=pauseReason(); if(reason){ if(reason==='hidden'){ /* lastSeen stamped by visibility handler */ } return; }
  acc+=dt; const need=speed().tickSec; if(acc<need) return; acc-=need;
  // drop idle weed job so she can seed without fighting the player queue
  const cj=X.curJob&&X.curJob(); if(cj&&cj.idle&&cj.kind==='gather'){ X.clearIdleJob&&X.clearIdleJob(); }
  tick(false); stampSeen(); X.save&&X.save(); }

function settingsHTML(){ const c=cfg(); const p=progress(); const reason=pauseReason();
  return '<div class="sec">Mori\'s idle world builder</div>'+
    '<div class="small">While the game is open, Mori slowly seeds the next regions (terrain, roads, villages, city-states) toward where you are heading. Free forever — no energy, no paywall. Pauses when this tab is hidden'+(batteryLow?', or on low battery at lowest quality':'')+'. Rule #1: behave.</div>'+
    '<div class="row"><label><input type="checkbox" id="idleOn" '+(c.on?'checked':'')+'> Idle building on</label></div>'+
    '<div class="row"><label>Speed <select id="idleSp"><option value="slow"'+(c.speed==='slow'?' selected':'')+'>Slow</option><option value="normal"'+(c.speed==='normal'?' selected':'')+'>Normal</option></select></label>'+
    '<span class="chip">World '+p.built+'/'+p.total+' ('+p.pct+'%)</span>'+(reason?'<span class="chip">paused: '+reason+'</span>':'<span class="chip">active</span>')+'</div>'+
    '<div class="small">Lifetime: terrain '+(c.stats.terrain||0)+' · roads '+(c.stats.roads||0)+' · villages '+(c.stats.villages||0)+' · cities '+(c.stats.cities||0)+' · ticks '+(c.stats.ticks||0)+'</div>'; }

function bindSettings(root){ if(!root) return;
  const on=root.querySelector('#idleOn'); if(on) on.onchange=()=>{ cfg().on=!!on.checked; X.save&&X.save(); if(X.renderSeedPanel) X.renderSeedPanel(); };
  const sp=root.querySelector('#idleSp'); if(sp) sp.onchange=()=>{ cfg().speed=sp.value==='slow'?'slow':'normal'; X.save&&X.save(); }; }

function progressChip(){ const p=progress(); return '🌍 '+p.built+'/'+p.total+' · '+p.pct+'%'; }

window.IDLEBUILD={
  SPEEDS, AWAY_CAP_MS, absenceMs, init(o){ X=o; hookBattery(); const r=beginCatchUp(); return r; },
  update, tick, pickTarget, progress, progressChip, settingsHTML, bindSettings, pauseReason, stampSeen, beginCatchUp,
  get summary(){ return summary; }, get catchLeft(){ return catchQ.length; }, get heading(){ return heading; },
  setEnabled(v){ cfg().on=!!v; }, setSpeed(v){ cfg().speed=(v==='slow'?'slow':'normal'); }, cfg, owedTicks, moriVoice, enabled, speed
};
})();
