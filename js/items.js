/* One name and one category for each good. Near-duplicates fold into that id.
   An old save keeps its counts. Nothing is deleted just because the name changed. */
(function(root){
'use strict';
const ITEMS={
  bog_iron_ore:{name:'Bog Iron Ore', cat:'Ore'},
  iron_ore:{name:'Iron Ore', cat:'Ore'},
  copper_ore:{name:'Copper Ore', cat:'Ore'},
  tin_ore:{name:'Tin Ore', cat:'Ore'},
  zinc_ore:{name:'Zinc Ore', cat:'Ore'},
  manganese_ore:{name:'Manganese Ore', cat:'Ore'},
  nickel_ore:{name:'Nickel Ore', cat:'Ore'},
  clay:{name:'Clay', cat:'Ore'},
  silver_ore:{name:'Silver Ore', cat:'Ore'},
  mithral_ore:{name:'Mithral Ore', cat:'Ore'},
  adamantine_ore:{name:'Adamantine Ore', cat:'Ore'},
  oak_log:{name:'Oak Log', cat:'Wood'},
  pine_log:{name:'Pine Log', cat:'Wood'},
  ash_log:{name:'Ash Log', cat:'Wood'},
  yew_bough:{name:'Yew Bough', cat:'Wood'},
  ironwood_log:{name:'Ironwood Log', cat:'Wood'},
  oak_beam:{name:'Oak Beam', cat:'Wood'},
  bog_iron_bloom:{name:'Bog Iron Bloom', cat:'Metal'},
  copper_bar:{name:'Copper Bar', cat:'Metal'},
  tin_bar:{name:'Tin Bar', cat:'Metal'},
  wolf_pelt:{name:'Wolf Pelt', cat:'Hide'},
  rat_hide:{name:'Dire Rat Hide', cat:'Hide'},
  lizard_hide:{name:'Monitor Hide', cat:'Hide'},
  scraped_hide:{name:'Scraped Hide', cat:'Hide'},
  trail_leather:{name:'Trail Leather', cat:'Hide'},
  mint:{name:'Mint', cat:'Herb'},
  chamomile:{name:'Chamomile', cat:'Herb'},
  traveler_tisane:{name:'Traveler Tisane', cat:'Herb'}
};
const ALIAS={
  ore:'bog_iron_ore', Ore:'bog_iron_ore', 'Bog Iron':'bog_iron_ore', bog_iron:'bog_iron_ore', bogiron:'bog_iron_ore',
  copper:'copper_ore', Copper:'copper_ore', 'Copper Ore':'copper_ore',
  tin:'tin_ore', Tin:'tin_ore', 'Tin Ore':'tin_ore',
  zinc:'zinc_ore', 'Zinc Ore':'zinc_ore',
  clay:'clay', Clay:'clay',
  wolf_hide:'wolf_pelt', wolf_skin:'wolf_pelt', 'Wolf Hide':'wolf_pelt', 'Wolf Skin':'wolf_pelt', 'Wolf Pelt':'wolf_pelt',
  dire_rat_hide:'rat_hide', 'Dire Rat Hide':'rat_hide',
  'Oak Log':'oak_log', 'Oak Beam':'oak_beam', 'Ironwood':'ironwood_log', ironwood:'ironwood_log'
};
function canon(id){
  if(id==null) return null;
  const key=String(id);
  if(ITEMS[key]) return key;
  if(ALIAS[key]) return ALIAS[key];
  return key;
}
function info(id){ const c=canon(id); return ITEMS[c]?Object.assign({id:c}, ITEMS[c]):null; }
function foldBag(bag){
  if(!bag||typeof bag!=='object') return bag;
  Object.keys(bag).forEach(k=>{
    const c=canon(k);
    if(!c||c===k||!ITEMS[c]) return;
    const n=(bag[k]|0);
    if(!n) return;
    bag[c]=(bag[c]|0)+n;
    delete bag[k];
  });
  return bag;
}
function migrate(save){
  if(!save||save.vItems) return save;
  save.vItems=1;
  foldBag(save.reag);
  if(save.village&&save.village.towns){
    Object.keys(save.village.towns).forEach(id=>{
      const t=save.village.towns[id];
      if(t&&t.items) foldBag(t.items);
    });
  }
  (save.inv||[]).forEach(it=>{
    if(!it) return;
    const from=it.rid||it.reagent||it.name;
    const c=canon(from);
    const row=ITEMS[c];
    if(!row) return;
    it.rid=c;
    it.name=row.name;
    it.cat=row.cat;
  });
  return save;
}
root.ITEMS={ITEMS, ALIAS, canon, info, foldBag, migrate};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ITEMS;
})(typeof window!=='undefined'?window:globalThis);
