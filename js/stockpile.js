/* Town stockpile. Players sell into it. Crafters draw it down.
   Prices float with supply and demand, and stay inside a cap.
   No meshes. The page only asks this object for numbers. */
(function(root){
'use strict';
const MIN=0.45, MAX=2.4;
const BASE={
  bog_iron_ore:2, copper_ore:4, tin_ore:4, zinc_ore:8, clay:1,
  oak_log:2, oak_beam:6, bog_iron_bloom:10, copper_bar:9, tin_bar:9,
  wolf_pelt:3, scraped_hide:5, trail_leather:12,
  mint:1, chamomile:1, traveler_tisane:4
};
function baseOf(id){ return BASE[id]||2; }
function clampMul(m){ return Math.max(MIN, Math.min(MAX, m)); }
function price(town, id){
  const base=baseOf(id);
  const stock=(town.items&&town.items[id])||0;
  const want=(town.demand&&town.demand[id])||0;
  const mul=clampMul((want+4)/(stock+4));
  return Math.round(base*mul*100)/100;
}
function town(id){
  return {id:String(id||'guild'), items:{}, demand:{oak_beam:40, bog_iron_bloom:8, trail_leather:6, traveler_tisane:10}, coin:120, pop:36, happiness:72};
}
function ensure(save, id){
  if(!save.village) save.village={v:1, day:0, towns:{}, contracts:[], rep:null};
  if(!save.village.towns) save.village.towns={};
  const key=String(id||'guild');
  if(!save.village.towns[key]) save.village.towns[key]=town(key);
  return save.village.towns[key];
}
function sell(town, id, qty){
  qty=qty|0;
  if(qty<1) return {ok:false, why:'nothing to sell'};
  const each=price(town, id);
  const purse=Math.max(0, town.coin||0);
  let paid=Math.round(each*qty*100)/100;
  if(paid>purse) paid=purse;
  town.items[id]=(town.items[id]||0)+qty;
  town.coin=Math.round((purse-paid)*100)/100;
  return {ok:true, each, paid, price:price(town, id)};
}
function produce(town, recipe){
  if(!recipe||recipe.cap) return {ok:false, why:'that recipe is past the village cap'};
  const need=recipe.in||{};
  for(const k in need){ if((town.items[k]||0)<need[k]) return {ok:false, why:'the stockpile is short of '+k}; }
  for(const k in need) town.items[k]-=need[k];
  const out=recipe.out||{};
  for(const k in out) town.items[k]=(town.items[k]||0)+out[k];
  return {ok:true, out};
}
function migrate(save){
  if(!save) return save;
  if(!save.village) save.village={v:1, day:0, towns:{}, contracts:[], rep:null};
  if(!save.village.towns) save.village.towns={};
  if(!save.village.towns.guild) save.village.towns.guild=town('guild');
  save.village.v=1;
  return save;
}
root.STOCKPILE={MIN, MAX, BASE, baseOf, price, town, ensure, sell, produce, migrate};
if(typeof module!=='undefined'&&module.exports) module.exports=root.STOCKPILE;
})(typeof window!=='undefined'?window:globalThis);
