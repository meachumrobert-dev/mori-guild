/* Village workshops. Smithing, leather, and a kitchen herb tisane.
   Inputs are the ores, logs, hides, and herbs the world already grows.
   Black powder and Greek fire are named so the ladder has a ceiling.
   They are not bench jobs. */
(function(root){
'use strict';
const CAP=['black_powder','greek_fire'];
const RECIPES=[
  {id:'bog_bloom', station:'smith', name:'Bog iron bloom', in:{bog_iron_ore:2}, out:{bog_iron_bloom:1}},
  {id:'copper_bar', station:'smith', name:'Copper bar', in:{copper_ore:2}, out:{copper_bar:1}},
  {id:'tin_bar', station:'smith', name:'Tin bar', in:{tin_ore:2}, out:{tin_bar:1}},
  {id:'oak_beam', station:'smith', name:'Oak beam', in:{oak_log:1}, out:{oak_beam:1}},
  {id:'scraped_hide', station:'leather', name:'Scraped hide', in:{wolf_pelt:1}, out:{scraped_hide:1}},
  {id:'trail_leather', station:'leather', name:'Trail leather', in:{scraped_hide:2}, out:{trail_leather:1}},
  {id:'traveler_tisane', station:'herb', name:'Traveler tisane', in:{mint:1, chamomile:1}, out:{traveler_tisane:1}, note:'A kitchen steep. Not a cure.'},
  {id:'black_powder', station:'smith', name:'Black powder', cap:true, in:{charcoal:2}, out:{black_powder:1}},
  {id:'greek_fire', station:'smith', name:'Greek fire', cap:true, in:{resin:1, oil:1}, out:{greek_fire:1}}
];
const BY={}; RECIPES.forEach(r=>BY[r.id]=r);
function list(station){ return RECIPES.filter(r=>!station||r.station===station); }
function craft(bag, id){
  const r=BY[id];
  if(!r) return {ok:false, why:'unknown recipe'};
  if(r.cap||CAP.indexOf(r.id)>=0) return {ok:false, cap:true, why:'The village stops at black powder and Greek fire. That is the ceiling, not a bench job.'};
  bag=bag||{};
  for(const k in r.in){ if((bag[k]|0)<r.in[k]) return {ok:false, why:'short of '+k}; }
  for(const k in r.in) bag[k]-=r.in[k];
  for(const k in r.out) bag[k]=(bag[k]|0)+r.out[k];
  return {ok:true, recipe:r.id, out:r.out, name:r.name};
}
root.WORKSHOP={CAP, RECIPES, list, craft};
if(typeof module!=='undefined'&&module.exports) module.exports=root.WORKSHOP;
})(typeof window!=='undefined'?window:globalThis);
