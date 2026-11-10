/* power.js — keep render, audio compile, and world-building on different frames.
   Robert's Legion Go 2 sat under about 60% RAM at idle and about 90% while gaming.
   Gaming mode caps quality and slows background steps so those jobs are not forced onto one clock.
   This is a budget, not a battery claim. */
(function(root){
'use strict';
const MODES={
  auto:   {label:'Auto',   qualityMax:2, chunk:2, catchPer:1, catchGap:0.4, bgMs:1.2, flower:1,    shadow:null},
  gaming: {label:'Gaming', qualityMax:1, chunk:1, catchPer:1, catchGap:0.8, bgMs:0.45, flower:0.55, shadow:false},
  low:    {label:'Low power', qualityMax:0, chunk:1, catchPer:1, catchGap:1.2, bgMs:0.25, flower:0.35, shadow:false}
};
let mode='auto';
function setMode(m){ mode=MODES[m]?m:'auto'; try{ if(root.localStorage) root.localStorage.setItem('mori.power', mode); }catch(e){} return mode; }
function getMode(){ return MODES[mode]?mode:'auto'; }
function boot(search){
  let q=null;
  const m=/[?&]power=([a-z]+)/.exec(String(search||'')); if(m) q=m[1];
  else try{ q=new URLSearchParams(search||'').get('power'); }catch(e){}
  let saved=null; try{ saved=root.localStorage&&root.localStorage.getItem('mori.power'); }catch(e){}
  setMode(q||saved||'auto');
  return getMode();
}
/* frame % 3: world, then audio compile, then background building. Never all three. */
function framePlan(frame){
  const m=MODES[getMode()]||MODES.auto;
  const p=((frame|0)%3+3)%3;
  return {mode:getMode(), world:p===0, audio:p===1, build:p===2,
    chunk:m.chunk, catchPer:m.catchPer, catchGap:m.catchGap, bgMs:p===1?m.bgMs:0,
    flower:m.flower, shadow:m.shadow, qualityMax:m.qualityMax};
}
function pace(){ const m=MODES[getMode()]||MODES.auto; return {per:m.catchPer, gap:m.catchGap}; }
function settingsHTML(){ const cur=getMode();
  return '<div class="sec">Power</div><div class="small">Gaming keeps drawing, new sounds, and background building on separate frames. Meant for a handheld sitting near 90% RAM in a game and under 60% when idle. It does not measure your battery.</div>'+
    '<div class="row"><label>Mode <select id="powerMode">'+Object.keys(MODES).map(k=>'<option value="'+k+'"'+(k===cur?' selected':'')+'>'+MODES[k].label+'</option>').join('')+'</select></label></div>';
}
const api={MODES, setMode, getMode, boot, framePlan, pace, settingsHTML};
root.POWER=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
