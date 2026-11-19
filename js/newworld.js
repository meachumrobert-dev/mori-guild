/* A new seed, with the old world kept aside. Character, skills, and the pack stay.
   Nothing is wiped unless someone says yes. Revert puts the backup back. */
(function(root){
'use strict';
const WORLD=['seed','worlds','at','jobs','structs','builds','planIdx','crafting','village','legend','roads','clock','player','sugN','greet'];
function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function take(save, keys){
  const o={};
  keys.forEach(k=>{ if(save&&save[k]!==undefined) o[k]=clone(save[k]); });
  return o;
}
function greeting(seed, back){
  seed=String(seed||'mori');
  if(back) return 'back on "'+seed+'". i kept your pack. the square is where we left it.';
  return 'new ground, seed "'+seed+'". the square, the gates, and the palisade are laid again. tinker says the streets match the road. your pack is the same one.';
}
function apply(save, seed, opt){
  opt=opt||{};
  if(!opt.confirm) return {ok:false, why:'needs a yes', wiped:false, save};
  seed=String(seed||'').trim().slice(0,40);
  if(!seed) return {ok:false, why:'seed', wiped:false, save};
  const next=clone(save)||{};
  const backup=take(next, WORLD);
  WORLD.forEach(k=>{ delete next[k]; });
  next.seed=seed;
  next.worlds={};
  next.at=null;
  next.jobs=[];
  next.player={x:0, z:8, yaw:0};
  next.clock=40;
  next.worldBackup=backup;
  next.greet=greeting(seed, false);
  next.vWorld=1;
  return {ok:true, save:next, greet:next.greet, wiped:false};
}
function revert(save, opt){
  opt=opt||{};
  if(!opt.confirm) return {ok:false, why:'needs a yes', wiped:false, save};
  if(!save||!save.worldBackup) return {ok:false, why:'no backup', wiped:false, save};
  const next=clone(save);
  const leaving=take(next, WORLD);
  const back=next.worldBackup;
  WORLD.forEach(k=>{ delete next[k]; });
  Object.keys(back).forEach(k=>{ next[k]=clone(back[k]); });
  next.worldBackup=leaving;
  next.greet=greeting(next.seed||'mori', true);
  return {ok:true, save:next, greet:next.greet, wiped:false};
}
function install(live, next){
  if(!live||!next) return live;
  Object.keys(live).forEach(k=>{ if(!(k in next)) delete live[k]; });
  Object.assign(live, next);
  return live;
}
root.NEWWORLD={WORLD, greeting, apply, revert, install};
if(typeof module!=='undefined'&&module.exports) module.exports=root.NEWWORLD;
})(typeof window!=='undefined'?window:globalThis);
