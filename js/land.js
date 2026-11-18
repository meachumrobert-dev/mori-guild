/* A room, a plot, wild land, or a lord's grant. A claim starts a homestead
   with Mori. Settlers follow the biome. Fealty can be kept or set down. */
(function(root){
'use strict';
const BIOME={
  forest:['human','elf','wolfkin'],
  hill:['dwarf','human','goatkin'],
  coast:['human','halfling','otterkin'],
  marsh:['human','lizardkin']
};
function rent(purse, nights){
  const cost=2*Math.max(1, nights|0);
  if((purse|0)<cost) return {ok:false, why:'short', cost};
  return {ok:true, cost, room:true, nights:nights|0};
}
function buy(purse, plot){
  const cost=plot&&plot.price||24;
  if(plot&&plot.owner) return {ok:false, why:'owned'};
  if((purse|0)<cost) return {ok:false, why:'short', cost};
  return {ok:true, cost, owner:'you'};
}
function claim(parcel, who){
  if(!parcel||parcel.owner) return {ok:false, why:'not wild'};
  parcel.owner=who||'you';
  parcel.quest={id:'homestead', from:'mori', text:'Mori walks the corners with you and asks what the first roof is for.'};
  return {ok:true, quest:parcel.quest};
}
function grant(lord, who, plot){
  if(!lord||(lord.rank|0)<1) return {ok:false, why:'no grant to give'};
  plot.owner=who;
  plot.from=lord.name||'lord';
  return {ok:true, owner:who};
}
function settlers(biome){
  return (BIOME[biome]||BIOME.forest).slice();
}
function fealty(hold, lord){
  hold.liege=lord;
  hold.free=false;
  return hold;
}
function independence(hold){
  if((hold.strength|0)<(hold.oath|0)) return {ok:false, why:'the oath still holds'};
  hold.free=true;
  hold.liege=null;
  return {ok:true, hold};
}
root.LAND={BIOME, rent, buy, claim, grant, settlers, fealty, independence, star:['roleplay','no-ending']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LAND;
})(typeof window!=='undefined'?window:globalThis);
