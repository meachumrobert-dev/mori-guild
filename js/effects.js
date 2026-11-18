/* Buffs are numbers of seconds. Zero, NaN, and infinity do not linger.
   Only one Zero-Return Band stays worn. A dread aura is a timed effect, not a fixture. */
(function(root){
'use strict';
function scrub(buffs){
  buffs=buffs||{};
  const dropped=[];
  Object.keys(buffs).forEach(k=>{
    const v=buffs[k];
    if(typeof v!=='number'||!Number.isFinite(v)||v<=0){ delete buffs[k]; dropped.push(k); }
  });
  return {buffs, dropped};
}
function tick(buffs, dt){
  scrub(buffs);
  const step=Number.isFinite(dt)?dt:0;
  Object.keys(buffs).forEach(k=>{
    buffs[k]-=step;
    if(!(buffs[k]>0)) delete buffs[k];
  });
  return buffs;
}
function dismiss(buffs, id){
  if(buffs&&id) delete buffs[id];
  return buffs;
}
function rings(inv){
  let kept=false;
  (inv||[]).forEach(it=>{
    if(!it||!it.fx||!it.fx.zeroKeep) return;
    if(!kept){ it.equipped=true; kept=true; return; }
    it.equipped=false;
  });
  return {worn:kept?1:0};
}
function aura(buffs, npc){
  if(npc) return true;
  return !!(buffs&&buffs.dread>0);
}
root.EFFECTS={scrub, tick, dismiss, rings, aura, star:['mundane']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.EFFECTS;
})(typeof window!=='undefined'?window:globalThis);
