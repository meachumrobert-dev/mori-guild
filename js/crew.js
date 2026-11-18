/* Crew in a fight. They pick a foe, take a side, fall back when hurt,
   stand by you when told, and walk behind you when the fight is over. */
(function(root){
'use strict';
function order(mate, ctx){
  ctx=ctx||{};
  const foes=ctx.foes||[];
  const hp=mate.hp==null?1:mate.hp;
  const max=mate.max||20;
  if(hp/max<0.3) return {act:'retreat', x:(ctx.player&&ctx.player.x)||0, z:((ctx.player&&ctx.player.z)||0)-4};
  if(!foes.length) return {act:'follow'};
  if(ctx.mode==='guard'){
    const p=ctx.player||{x:0,z:0};
    return {act:'guard', x:p.x+1.2, z:p.z-1.2};
  }
  let best=foes[0], bd=1e9;
  foes.forEach(f=>{ const d=Math.hypot(f.x-(mate.x||0), f.z-(mate.z||0)); if(d<bd){ bd=d; best=f; } });
  const side=(mate.slot||0)%2?1:-1;
  return {act:'flank', foe:best.id, x:best.x+side*1.4, z:best.z+side*0.4};
}
root.CREW={order, star:['roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.CREW;
})(typeof window!=='undefined'?window:globalThis);
