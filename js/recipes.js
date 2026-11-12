/* Alchemy in the Elder Scrolls way. A reagent carries several effects.
   You learn them by tasting. Two to four reagents make a potion from the
   effects they share. The pot changes the strength, the count, and which
   effects survive. High Regeneration is the name of a strong shared
   Regenerate, not a recipe that names its ingredients. */
(function(root){
'use strict';
const EFFECTS={
  regenerate:{name:'Regenerate', magic:false},
  restore_health:{name:'Restore Health', magic:false},
  restore_stamina:{name:'Restore Stamina', magic:false},
  resist_poison:{name:'Resist Poison', magic:false},
  cure_disease:{name:'Cure Disease', magic:false},
  calm:{name:'Calm', magic:false},
  damage_health:{name:'Damage Health', magic:false, harm:true},
  fortify_health:{name:'Fortify Health', magic:true},
  fortify_magicka:{name:'Fortify Magicka', magic:true},
  water_walking:{name:'Water Walking', magic:true}
};
const REAGENTS={
  troll_blood:{name:"Troll's Blood", fam:'blood', tier:3, gp:40, wt:0.4, stack:10, col:'#8a1a2a', quality:3, effects:['regenerate','restore_health','fortify_health','resist_poison']},
  royal_honey:{name:'Royal Ironwood Bee Honey', fam:'honey', tier:3, gp:55, wt:0.3, stack:10, col:'#e2b84a', quality:3, effects:['regenerate','restore_health','fortify_magicka','cure_disease']},
  lizard_marrow:{name:'Giant Lizard Bone Marrow', fam:'marrow', tier:3, gp:48, wt:0.6, stack:10, col:'#f0e2c4', quality:3, effects:['regenerate','fortify_health','restore_stamina','resist_poison']},
  alcohol_base:{name:'Alcohol Base', fam:'spirit', tier:1, gp:6, wt:0.5, stack:20, col:'#e8d8a8', quality:1, effects:['regenerate','restore_stamina','water_walking','damage_health']},
  chamomile:{name:'Chamomile', fam:'herb', tier:1, gp:0.15, wt:0.1, stack:50, col:'#f2e6a0', quality:1, ferment:true, effects:['restore_health','resist_poison','calm','cure_disease']},
  mint:{name:'Mint', fam:'herb', tier:0, gp:0.1, wt:0.1, stack:50, col:'#4fbf7a', quality:1, ferment:true, effects:['restore_health','restore_stamina','resist_poison','calm']},
  dragon_scale:{name:'Dragon Scale', fam:'scale', tier:4, gp:200, wt:0.8, stack:10, col:'#2a6a32', spawn:false, quality:4, effects:['fortify_health','resist_poison','regenerate','damage_health']},
  myth_scale:{name:'Myth Scale', fam:'scale', tier:4, gp:240, wt:0.5, stack:10, col:'#c9b4ff', spawn:false, quality:4, effects:['fortify_magicka','water_walking','regenerate','fortify_health']},
  giant_hide:{name:'Giant Hide', fam:'hide', tier:3, gp:36, wt:2, stack:10, col:'#6a5a3a', quality:2, effects:['resist_poison','restore_health','calm','restore_stamina']},
  bone:{name:'Great Bone', fam:'bone', tier:2, gp:18, wt:1, stack:20, col:'#efe6d2', quality:2, effects:['restore_stamina','resist_poison','restore_health','calm']}
};
const APPARATUS={
  mortar:{name:'Mortar and pestle', tier:0, potency:1, yield:1, magic:false, maxFx:1, pure:false, distill:false},
  clay:{name:'Clay pot', tier:1, potency:1.15, yield:1, magic:false, maxFx:2, pure:false, distill:false},
  retort:{name:'Retort', tier:2, potency:1.35, yield:1, magic:false, maxFx:3, pure:true, distill:true},
  alembic:{name:'Alembic', tier:2, potency:1.4, yield:1, magic:false, maxFx:3, pure:true, distill:true},
  distillery:{name:'Distillery', tier:3, potency:1.6, yield:2, magic:false, maxFx:4, pure:true, distill:true},
  enchanted:{name:'Enchanted pot', tier:4, potency:1.7, yield:1, magic:true, maxFx:4, pure:false, distill:false}
};
const GEAR=[
  {id:'scale_armor', name:'Scale armor', gated:true, gate:'dragon', in:{dragon_scale:4}, note:'Needs a dragon. None are in the world yet.'},
  {id:'myth_leather', name:'Myth-hide leather', gated:true, gate:'myth', in:{myth_scale:2, giant_hide:1}, note:'A later leather. The myth scale is not spawning.'}
];
const GATHER_ERA=[{id:'herbalism', name:'Herbalism', min:0},{id:'apothecary', name:'Apothecary', min:5},{id:'botany', name:'Botany', min:10}];
const MIX_ERA=[{id:'alchemy', name:'Alchemy', min:0},{id:'chymistry', name:'Chymistry', min:5},{id:'chemistry', name:'Chemistry', min:10}];
function era(track, level){
  const rows=track==='mix'?MIX_ERA:GATHER_ERA;
  let name=rows[0].name;
  rows.forEach(r=>{ if((level|0)>=r.min) name=r.name; });
  return name;
}
function reagents(){ return Object.keys(REAGENTS).map(id=>Object.assign({id}, REAGENTS[id])); }
function shared(ids){
  const counts={};
  ids.forEach(id=>{ const r=REAGENTS[id]; if(!r) return; r.effects.forEach(e=>{ counts[e]=(counts[e]||0)+1; }); });
  return Object.keys(counts).filter(e=>counts[e]>=2).map(e=>({id:e, n:counts[e], magic:!!(EFFECTS[e]&&EFFECTS[e].magic), harm:!!(EFFECTS[e]&&EFFECTS[e].harm), name:EFFECTS[e]?EFFECTS[e].name:e})).sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
}
function strengthOf(ids, effects, app, skill){
  const quals=ids.map(id=>((REAGENTS[id]&&REAGENTS[id].quality)||1));
  const avg=quals.reduce((a,b)=>a+b,0)/quals.length;
  const share=effects.length?effects[0].n:2;
  return Math.round(avg*app.potency*(1+(skill|0)/20)*(1+Math.max(0, share-2)*0.2)*100)/100;
}
function potionName(ids, effects, strength){
  const top=effects[0];
  if(top&&top.id==='regenerate'&&top.n===ids.length&&strength>=6) return 'High Regeneration Potion';
  if(top&&top.id==='regenerate') return 'Regeneration Potion';
  return (top?top.name:'Strange')+' Potion';
}
function migrate(save){
  if(!save) return save;
  if(!save.alchemy) save.alchemy={known:{}, gather:0, mix:0};
  if(!save.alchemy.known) save.alchemy.known={};
  return save;
}
function taste(save, id){
  migrate(save);
  const r=REAGENTS[id];
  if(!r) return {ok:false, why:'unknown reagent'};
  const cap=Math.min(4, 1+Math.floor((save.alchemy.gather|0)/3));
  const known=save.alchemy.known[id]||[false,false,false,false];
  let learned=null;
  for(let i=0;i<cap;i++) if(!known[i]){ known[i]=true; learned=r.effects[i]; break; }
  save.alchemy.known[id]=known.slice();
  return {ok:true, learned, known:known.slice(), era:era('gather', save.alchemy.gather|0)};
}
function combine(bag, ids, opt){
  opt=opt||{};
  ids=(ids||[]).filter((id,i,a)=>a.indexOf(id)===i);
  if(ids.length<2||ids.length>4) return {ok:false, why:'mix two, three, or four reagents'};
  const app=APPARATUS[opt.apparatus||'mortar'];
  if(!app) return {ok:false, why:'unknown apparatus'};
  bag=bag||{};
  for(let i=0;i<ids.length;i++){ if((bag[ids[i]]|0)<1||!REAGENTS[ids[i]]) return {ok:false, why:'short of '+ids[i]}; }
  let effects=shared(ids);
  if(!app.magic) effects=effects.filter(e=>!e.magic);
  if(app.pure) effects=effects.filter(e=>!e.harm);
  effects=effects.slice(0, app.maxFx);
  if(!effects.length) return {ok:false, why:'those reagents share nothing this pot can draw out'};
  ids.forEach(id=>{ bag[id]-=1; });
  const strength=strengthOf(ids, effects, app, opt.skill|0);
  const name=potionName(ids, effects, strength);
  const known=opt.known||{};
  const shown=effects.filter(e=>{
    let seen=0;
    ids.forEach(id=>{ const r=REAGENTS[id]; const i=r.effects.indexOf(e.id); const row=known[id]; if(row&&row[i]) seen++; });
    return seen>=1;
  }).map(e=>e.name);
  return {ok:true, name, effects, shown, strength, yield:app.yield, apparatus:app.name, era:era('mix', opt.skill|0),
    item:{name, cat:'Potion', kind:'potion', value:Math.round(20+strength*12), fx:{hot:{pps:Math.max(1, Math.round(strength)/2), dur:8+app.tier*2}}, yield:app.yield}};
}
function distill(bag, apparatus){
  const app=APPARATUS[apparatus||''];
  if(!app||!app.distill) return {ok:false, why:'needs a retort, an alembic, or a distillery'};
  bag=bag||{};
  const id=Object.keys(bag).find(k=>REAGENTS[k]&&REAGENTS[k].ferment&&(bag[k]|0)>=2);
  if(!id) return {ok:false, why:'needs two of a herb that will ferment'};
  bag[id]-=2;
  const qty=app.yield||1;
  bag.alcohol_base=(bag.alcohol_base||0)+qty;
  return {ok:true, qty, name:'Alcohol Base'};
}
function craftGear(id){
  const g=GEAR.filter(x=>x.id===id)[0];
  if(!g) return {ok:false, why:'unknown piece'};
  return {ok:false, gated:true, why:g.note};
}
function hive(seed, regionId, trees){
  const woods=(trees||[]).filter(t=>t&&(t.species==='ironwood'||t.sp==='ironwood'));
  if(!woods.length) return null;
  const s=String(seed)+'|hive|'+regionId;
  let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  if((h>>>0)%100>=12) return null;
  const t=woods[(h>>>8)%woods.length];
  return {x:t.x+3, z:(t.z||0)+2, rid:'royal_honey', name:'Royal Ironwood Bee Hive'};
}
function lizard(level){ return {name:'Giant Lizard', size:'adult', level:level|0, spawn:true, parts:{lizard_marrow:1, giant_hide:1, bone:2}}; }
function dragon(){ return {name:'Dragon', size:'adult', spawn:false, parts:{dragon_scale:2, myth_scale:1}}; }
function panel(save){
  migrate(save);
  const mix=era('mix', save.alchemy.mix|0), plant=era('gather', save.alchemy.gather|0);
  let h='<div class="sec">'+plant+' · '+mix+'</div>';
  h+='<label class="small">Apparatus <select id="alembic">'+Object.keys(APPARATUS).map(id=>'<option value="'+id+'">'+APPARATUS[id].name+'</option>').join('')+'</select></label>';
  h+='<div class="row"><button type="button" data-mix="1">Mix</button><button type="button" data-distill="1">Distill</button></div>';
  h+='<p class="small">Two to four reagents. A potion keeps the effects they share. Taste a reagent to learn what it does.</p>';
  return h;
}
root.RECIPES={EFFECTS, REAGENTS, APPARATUS, GEAR, GATHER_ERA, MIX_ERA, era, reagents, shared, combine, distill, taste, migrate, craftGear, hive, lizard, dragon, panel, potionName};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RECIPES;
})(typeof window!=='undefined'?window:globalThis);
