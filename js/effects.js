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
  let worn=0;
  (inv||[]).forEach(it=>{
    if(!it||!it.fx||!it.fx.zeroKeep||!it.equipped) return;
    worn++;
    if(worn>1) it.equipped=false;
  });
  return {worn:Math.min(1, worn)};
}
function floor(it){
  const table={ring:8, weapon:6, armor:6, potion:2, charm:4, wondrous:6, cursed:1, bandage:1, scroll:2};
  let v=it&&it.value|0;
  if(/zero-return/i.test(it&&it.name||'')) v=Math.max(v, 8);
  if(!(v>0)) v=table[it&&it.kind]||2;
  return v;
}
function purpose(it){
  if(!it) return 'store';
  if(it.fx&&it.fx.zeroKeep) return 'defense';
  const kind=it.kind;
  if(kind==='weapon'||kind==='tool') return 'work';
  if(kind==='ring'||kind==='shield') return 'defense';
  if(kind==='armor'||kind==='charm'||kind==='wondrous'||kind==='cursed') return 'wear';
  if(kind==='potion'||kind==='scroll'||kind==='salve'||kind==='bandage'||kind==='thrown') return 'drink';
  return 'store';
}
function price(it){
  if(!it) return it;
  it.value=floor(it);
  it.end=purpose(it);
  return it;
}
function dispose(inv, id, how, yes){
  const i=(inv||[]).findIndex(x=>x&&String(x.id)===String(id));
  if(i<0) return {ok:false, why:'missing'};
  if((how==='destroy'||how==='drop')&&!yes) return {ok:false, why:'confirm'};
  const it=inv.splice(i,1)[0];
  price(it);
  const gold=how==='sell'?Math.max(1, Math.floor(it.value/2)):0;
  const left=(inv||[]).some(x=>x&&x.fx&&x.fx.zeroKeep&&x.equipped);
  return {ok:true, item:it, gold, zeroKeep:!!(it.fx&&it.fx.zeroKeep), aura:left};
}
function aura(buffs, npc, bands){
  if(npc) return true;
  if(bands) return false;
  return !!(buffs&&buffs.dread>0);
}
root.EFFECTS={scrub, tick, dismiss, rings, aura, floor, purpose, price, dispose, star:['mundane']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.EFFECTS;
})(typeof window!=='undefined'?window:globalThis);
