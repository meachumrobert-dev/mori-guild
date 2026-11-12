/* A bridge troll. Lighthearted, tougher in a higher region, sometimes paid off.
   Winning leaves a vial of Troll's Blood. A fight that goes badly only bonks you. */
(function(root){
'use strict';
const CAP=0.42;
function chance(level){ return Math.min(CAP, 0.08+Math.max(0, level|0)*0.03); }
function toll(level){ return 5+Math.max(0, level|0)*4; }
function meet(rng, level){
  const roll=typeof rng==='function'?rng():Math.random();
  if(roll>=chance(level)) return null;
  const again=typeof rng==='function'?rng():Math.random();
  return {name:'Bridge troll', level:level|0, toll:toll(level), canPay:again<0.6, drop:'troll_blood'};
}
function enter(pos, bridges, state){
  state=state||{};
  const on=(bridges||[]).find(b=>Math.hypot(pos.x-b.x, pos.z-b.z)<(b.r||7));
  if(!on){ state.bridge=null; return null; }
  if(state.bridge===on.id) return null;
  state.bridge=on.id;
  return on;
}
function resolve(opt){
  opt=opt||{};
  const level=opt.level|0;
  const rng=opt.rng||Math.random;
  if(opt.choice==='pay'){
    const cost=toll(level);
    if((opt.gold|0)<cost) return {ok:false, why:'short of coin', cost};
    return {ok:true, paid:cost, drop:null, line:'The troll counts the coins twice, bows, and waves you on.'};
  }
  const win=rng()>Math.min(0.72, 0.32+level*0.04);
  if(win) return {ok:true, drop:'troll_blood', qty:1, hurt:0, line:'You stare. The troll blinks first and leaves a vial of blood.'};
  return {ok:false, drop:null, hurt:Math.min(6, 2+level), line:'The troll bonks your shield, giggles, and wanders off.'};
}
function migrate(save){
  if(!save) return save;
  if(!save.roads) save.roads={bridge:null};
  return save;
}
root.TROLLS={CAP, chance, toll, meet, enter, resolve, migrate};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TROLLS;
})(typeof window!=='undefined'?window:globalThis);
