/* Raiders start outside the wall and walk to the gate.
   A beacon zaps them on the way. Guards meet whoever arrives. */
(function(root){
'use strict';
function place(gate, outside, i, n){
  const span=(n-1)*2.2;
  return {x:gate.x+(i*2.2-span/2), z:gate.z+outside, tx:gate.x, tz:gate.z, hp:8, phase:'march'};
}
function tick(r, towers){
  if(!r||r.phase==='down') return r;
  const dx=r.tx-r.x, dz=r.tz-r.z, d=Math.hypot(dx,dz)||1;
  const step=Math.min(1.4, d);
  r.x+=dx/d*step; r.z+=dz/d*step;
  (towers||[]).forEach(t=>{
    if(Math.hypot(t.x-r.x, t.z-r.z)<=(t.range||14)) r.hp-=t.zap||1;
  });
  if(r.hp<=0){ r.phase='down'; return r; }
  if(Math.hypot(r.x-r.tx, r.z-r.tz)<2.4) r.phase='gate';
  return r;
}
function meet(raiders){
  const live=(raiders||[]).filter(r=>r.phase==='gate');
  return {guards:live.length?Math.min(4, 1+live.length):0, atGate:live.length};
}
function loss(arrived, cap){
  const n=Math.max(0, arrived|0);
  const c=cap==null?3:cap;
  return Math.min(c, n);
}
root.RAIDMARCH={place, tick, meet, loss, star:['mundane','roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RAIDMARCH;
})(typeof window!=='undefined'?window:globalThis);
