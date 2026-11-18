/* A starter boat, a river yard, an ocean yard. Sail, hull, and rudder swap.
   A hull with no keel tips. Cargo goes out and comes back. */
(function(root){
'use strict';
const PARTS={
  hull:{skiff:1, cog:3, hulk:6},
  sail:{lug:1, square:2, lateen:2},
  rudder:{oar:1, tiller:2}
};
const YARDS={river:['skiff','lug','oar'], ocean:['cog','hulk','square','lateen','tiller']};
function starter(){
  return {hull:'skiff', sail:'lug', rudder:'oar', keel:false, cargo:[], hold:2};
}
function yard(kind){ return (YARDS[kind]||YARDS.river).slice(); }
function swap(ship, slot, id){
  if(!PARTS[slot]||!PARTS[slot][id]) return {ok:false, why:'no such part'};
  ship[slot]=id;
  if(slot==='hull') ship.hold=PARTS.hull[id];
  return {ok:true, ship};
}
function heel(ship, wind){
  const w=Math.max(0, wind||0);
  const tip=ship.keel?Math.min(0.4, w*0.15):Math.min(1, w*0.35);
  return {tip:Math.round(tip*100)/100, over:tip>=0.8};
}
function haul(ship, goods, port){
  const room=ship.hold-(ship.cargo||[]).length;
  if(room<1) return {ok:false, why:'full'};
  ship.cargo.push({id:goods, port:port||'home'});
  return {ok:true, cargo:ship.cargo.slice()};
}
function unload(ship){
  const out=ship.cargo.slice();
  ship.cargo=[];
  return out;
}
root.SHIPS={PARTS, YARDS, starter, yard, swap, heel, haul, unload, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.SHIPS;
})(typeof window!=='undefined'?window:globalThis);
