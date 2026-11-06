/* stations.js (v3.8) — Alchemy pot & forge material tiers, Enchanting Forge / Circle,
   smithing DCs, use-based craft skills, durability / lifetime max on crafted gear.
   Progression: clay → … → brass (zinc starts green/magic) → ironwood; brass+ironwood unlock mythic metals.
   Mundane alchemy through bronze; green instant potions need brass+. Mori's enchanting pot is one high-tier pot, not the only station.
   Behave #1. No energy timers / paywalls. */
(function(){
'use strict';
let X=null;

/* Pot / forge material ladder (owner [pt104u]) */
const POT_TIERS=[
  {id:'clay',       label:'Clay Pot',        ord:0, mundane:true, grey:true,  green:false, magic:false, jewelry:false, note:'starter alchemy'},
  {id:'cast_iron',  label:'Cast Iron Pot',   ord:1, mundane:true, grey:true,  green:false, magic:false, jewelry:false, note:'sturdy mundane'},
  {id:'steel',      label:'Steel Pot',       ord:2, mundane:true, grey:true,  green:false, magic:false, jewelry:false, note:'alchemy, not magical'},
  {id:'copper',     label:'Copper Pot',      ord:3, mundane:true, grey:true,  green:false, magic:false, jewelry:false, note:'still mundane'},
  {id:'bronze',     label:'Bronze Pot',      ord:4, mundane:true, grey:true,  green:false, magic:false, jewelry:false, note:'still not magical'},
  {id:'brass',      label:'Brass Pot',       ord:5, mundane:true, grey:true,  green:true,  magic:true,  jewelry:true,  note:'zinc path — first green / magic items; jewelry'},
  {id:'ironwood',   label:'Ironwood Pot',    ord:6, mundane:true, grey:true,  green:true,  magic:true,  jewelry:true,  note:'clay tradition leads here'},
  {id:'orichalcum', label:'Orichalcum Pot',  ord:7, mundane:true, grey:true,  green:true,  magic:true,  jewelry:true,  note:'mythic metal'},
  {id:'mythril',    label:'Mythril Pot',     ord:8, mundane:true, grey:true,  green:true,  magic:true,  jewelry:true,  note:'SRD mithral-style'},
  {id:'adamantine', label:'Adamantine Pot',  ord:9, mundane:true, grey:true,  green:true,  magic:true,  jewelry:true,  note:'SRD adamantine'},
  {id:'mori',       label:'Mori\'s Enchanting Pot', ord:10, mundane:true, grey:true, green:true, magic:true, jewelry:true, note:'high-tier guild pot — one of many, not the only'}
];

const FORGE_TIERS=[
  {id:'clay',       label:'Clay Forge',        ord:0, dcBonus:0,  mw:false, mythic:false, note:'practice heat'},
  {id:'cast_iron',  label:'Cast Iron Forge',   ord:1, dcBonus:0,  mw:false, mythic:false, note:'DC 10 — anyone can start'},
  {id:'steel',      label:'Steel Forge',       ord:2, dcBonus:0,  mw:true,  mythic:false, note:'layered-carbon masterwork DC 15'},
  {id:'copper',     label:'Copper Forge',      ord:3, dcBonus:0,  mw:true,  mythic:false, note:'non-magical'},
  {id:'bronze',     label:'Bronze Forge',      ord:4, dcBonus:0,  mw:true,  mythic:false, note:'non-magical'},
  {id:'brass',      label:'Brass Forge',       ord:5, dcBonus:1,  mw:true,  mythic:false, jewelry:true, note:'jewelry; zinc starts green path'},
  {id:'ironwood',   label:'Ironwood Forge',    ord:6, dcBonus:1,  mw:true,  mythic:false, note:'clay path culminates here'},
  {id:'orichalcum', label:'Orichalcum Forge',  ord:7, dcBonus:2,  mw:true,  mythic:true,  note:'needs brass + ironwood unlocked'},
  {id:'mythril',    label:'Mythril Forge',     ord:8, dcBonus:2,  mw:true,  mythic:true,  note:'SRD mithral'},
  {id:'adamantine', label:'Adamantine Forge',  ord:9, dcBonus:3,  mw:true,  mythic:true,  note:'SRD adamantine'}
];

/* Smithing DCs (3.5 Craft) */
const SMITH_DC={
  cast_iron_bar:10,
  simple_blade:10,
  steel_mw_sword:15,       // layered-carbon masterwork
  manganese_steel:20,
  nickel_steel:20,
  brass_jewelry:15,
  ironwood_haft:18,
  orichalcum:25,
  mythril:25,
  adamantine:28
};

const STATION_KINDS={
  pot:{label:'Alchemy Pot', tiers:POT_TIERS},
  forge:{label:'Smithing Forge', tiers:FORGE_TIERS},
  enchant_forge:{label:'Enchanting Forge', note:'magic weapons & armor (Craft Magic Arms and Armor)'},
  enchant_circle:{label:'Enchanting Circle', note:'wondrous items (Craft Wondrous Item)'},
  mori_pot:{label:'Mori\'s Enchanting Pot', note:'high-tier pot among many'}
};

function bag(){ const s=X.S(); if(!s.stations) s.stations={pot:'clay', forge:'cast_iron', unlocked:['clay','cast_iron'], enchantForge:false, enchantCircle:false, zinc:false};
  if(!s.craftSkills) s.craftSkills={alchemy:0, smithing:0, enchanting:0, heal:0, jewelry:0};
  return s.stations; }
function skills(){ bag(); return X.S().craftSkills; }
const level=xp=>Math.min(20,1+Math.floor(Math.sqrt((xp||0)/25)));
function skillLv(k){ return level(skills()[k]||0); }
function gain(k,n){ const sk=skills(); sk[k]=(sk[k]||0)+(n||8); return skillLv(k); }

function potTier(){ return POT_TIERS.find(t=>t.id===bag().pot)||POT_TIERS[0]; }
function forgeTier(){ return FORGE_TIERS.find(t=>t.id===bag().forge)||FORGE_TIERS[1]; }
function potCanBrew(tierId){ const t=POT_TIERS.find(x=>x.id===tierId)||potTier(); return {mundane:!!t.mundane, grey:!!t.grey, green:!!t.green, magic:!!t.magic, jewelry:!!t.jewelry, tier:t}; }
function canGreen(){ return potCanBrew().green; }

function unlocked(){ return bag().unlocked||['clay','cast_iron']; }
function hasUnlock(id){ return unlocked().indexOf(id)>=0; }

/* Progression rules: clay leads toward ironwood; brass + ironwood unlock mythic metals */
function unlockNext(kind, id){
  const st=bag(); if(st.unlocked.indexOf(id)<0) st.unlocked.push(id);
  if(id==='brass') st.zinc=true;
  if(id==='brass'||id==='ironwood'){
    if(hasUnlock('brass')&&hasUnlock('ironwood')){
      ['orichalcum','mythril','adamantine'].forEach(m=>{ if(st.unlocked.indexOf(m)<0) st.unlocked.push(m); });
    }
  }
  if(kind==='pot') st.pot=id; if(kind==='forge') st.forge=id;
  return st;
}

function canUpgradeTo(kind, id){
  const list=kind==='pot'?POT_TIERS:FORGE_TIERS;
  const t=list.find(x=>x.id===id); if(!t) return {ok:false, why:'unknown tier'};
  if(hasUnlock(id)) return {ok:true, already:true};
  if(t.mythic && !(hasUnlock('brass')&&hasUnlock('ironwood'))) return {ok:false, why:'need brass and ironwood unlocked first'};
  // sequential: must have previous ord unlocked (skip mori pot special)
  if(id==='mori') return {ok:skillLv('alchemy')>=8, why:skillLv('alchemy')>=8?'':'alchemy skill 8+'};
  const prev=list.filter(x=>x.ord===t.ord-1)[0];
  if(prev && !hasUnlock(prev.id) && prev.id!=='clay') return {ok:false, why:'unlock '+prev.label+' first'};
  return {ok:true};
}

/* Craft check: d20 + skill ranks vs DC */
function craftCheck(skill, dc){
  const ranks=skillLv(skill); const d=SRD.d20(); const tot=d+ranks;
  const ok=d!==1 && (d===20 || tot>=dc);
  return {d, ranks, dc, tot, ok, crit:d===20, fumble:d===1};
}

function smithSword(opts){
  opts=opts||{}; const kind=opts.kind||'steel_mw'; // cast_iron | steel_mw | manganese | nickel
  const dc=kind==='cast_iron'?SMITH_DC.cast_iron_bar:kind==='manganese'||kind==='nickel'?SMITH_DC.manganese_steel:SMITH_DC.steel_mw_sword;
  const ft=forgeTier();
  const roll=craftCheck('smithing', Math.max(1, dc-ft.dcBonus));
  gain('smithing', roll.ok?14:4);
  if(!roll.ok) return {ok:false, roll, msg:'Smithing check failed (d20 '+roll.d+' +'+roll.ranks+' = '+roll.tot+' vs DC '+roll.dc+').'};
  const mat=kind==='cast_iron'?'Cast Iron':kind==='manganese'?'Manganese Steel':kind==='nickel'?'Nickel Steel':'Steel';
  const mw=kind!=='cast_iron';
  const item={name:(mw?'Masterwork ':'')+mat+' Longsword', cat:'Forged', kind:'weapon', mw:mw, bonus:0,
    material:mat.toLowerCase().replace(/ /g,'_'), forgeTier:ft.id, value:mw?315:15,
    durability:100, maxDur:100, lifetime:mw?500:200, uses:0, crafted:true};
  stampDurability(item, ft.id);
  return {ok:true, roll, item, msg:'Forged '+item.name+' (DC '+roll.dc+', rolled '+roll.tot+').'};
}

/* Durability + lifetime max (Albion-ish): use wears gear; lifetime caps total repairs/uses */
function stampDurability(item, tierId){
  const ord=(FORGE_TIERS.find(t=>t.id===tierId)||FORGE_TIERS[1]).ord;
  item.durability=item.durability||100;
  item.maxDur=item.maxDur||100;
  item.lifetime=item.lifetime!=null?item.lifetime:(200+ord*80);
  item.uses=item.uses||0;
  item.crafted=true;
  return item;
}
function wearItem(it, amt){
  if(!it||it.durability==null) return it;
  amt=amt==null?1:amt; it.durability=Math.max(0, it.durability-amt); it.uses=(it.uses||0)+amt;
  if(it.uses>=(it.lifetime||9999)){ it.broken=true; it.equipped=false; }
  else if(it.durability<=0){ it.broken=true; it.equipped=false; }
  return it;
}
function repairItem(it){
  if(!it||it.lifetime==null) return {ok:false};
  if((it.uses||0)>=it.lifetime) return {ok:false, why:'lifetime max reached — retire this piece'};
  it.durability=it.maxDur||100; it.broken=false; it.uses=(it.uses||0)+5; // repair costs lifetime
  return {ok:true};
}

function enableEnchantForge(){ bag().enchantForge=true; return bag(); }
function enableEnchantCircle(){ bag().enchantCircle=true; return bag(); }

/* Economy: merchant stock + treasury buys crafted goods */
function merchantStock(){
  const herbs=Object.keys(window.HERBAL?HERBAL.HERBS:{}).slice(0,6).map(id=>({id:'r:'+id, name:(HERBAL.HERBS[id]||{}).name, gp:HERBAL.HERBS[id].gp, qty:2+Math.floor(Math.random()*3)}));
  const metals=[{id:'r:copper_ore',name:'Copper Ore',gp:0.5,qty:4},{id:'r:iron_ore',name:'Iron Ore',gp:0.1,qty:6},{id:'zinc_ingot',name:'Zinc Ingot',gp:5,qty:2},{id:'r:mithral_ore',name:'Mithral Ore',gp:25,qty:1}];
  return {herbs, metals};
}
function treasuryBuyCrafted(it){
  if(!it||!window.TREASURY) return {ok:false};
  const value=Math.max(1, Math.floor((it.value||10)*0.6));
  const t=TREASURY.bag(); if(t.marks<value) return {ok:false, why:'treasury short '+value+' Marks'};
  t.marks-=value; t.paid=(t.paid||0)+value;
  // mint a little back as "guild purchased stock"
  return {ok:true, paid:value, marks:t.marks};
}

function panelHTML(){
  const st=bag(), pt=potTier(), ft=forgeTier(), sk=skills();
  let h='<div class="sec">Crafting stations (v3.8)</div>';
  h+='<div class="row"><span class="chip">⚗ '+pt.label+'</span><span class="chip">🔥 '+ft.label+'</span>'+
    (st.enchantForge?'<span class="chip">✦ Enchanting Forge</span>':'')+(st.enchantCircle?'<span class="chip">◯ Enchanting Circle</span>':'')+
    (hasUnlock('mori')||st.pot==='mori'?'<span class="chip">💚 Mori\'s Pot</span>':'')+'</div>';
  h+='<div class="small">Skills (use-based): Alchemy <b>'+skillLv('alchemy')+'</b> · Smithing <b>'+skillLv('smithing')+'</b> · Enchanting <b>'+skillLv('enchanting')+'</b> · Heal <b>'+skillLv('heal')+'</b> · Jewelry <b>'+skillLv('jewelry')+'</b></div>';
  h+='<div class="small">Smithing DCs: cast iron <b>10</b> (anyone can start) · steel layered-carbon masterwork sword <b>15</b> · manganese / nickel steel <b>20</b> (or a high roll). Brass unlocks jewelry & green path (zinc). Clay → ironwood; brass + ironwood → orichalcum / mythril / adamantine.</div>';
  h+='<div class="sec">Upgrade pot</div><div class="row">';
  POT_TIERS.forEach(t=>{ const u=hasUnlock(t.id)||t.id===st.pot; const can=canUpgradeTo('pot',t.id);
    h+='<button data-pot="'+t.id+'" '+(st.pot===t.id?'class="pri"':'')+' title="'+(t.note||'')+'">'+(u?'✓ ':'')+t.label+(t.green?' 💚':'')+'</button>'; });
  h+='</div><div class="sec">Upgrade forge</div><div class="row">';
  FORGE_TIERS.forEach(t=>{ const u=hasUnlock(t.id)||t.id===st.forge;
    h+='<button data-forge="'+t.id+'" '+(st.forge===t.id?'class="pri"':'')+' title="'+(t.note||'')+'">'+(u?'✓ ':'')+t.label+(t.mythic?' ✦':'')+'</button>'; });
  h+='</div><div class="sec">Special stations</div><div class="row">'+
    '<button data-encf="1">'+(st.enchantForge?'✓ ':'')+'Enchanting Forge (magic arms)</button>'+
    '<button data-encc="1">'+(st.enchantCircle?'✓ ':'')+'Enchanting Circle (wondrous)</button>'+
    '<button data-pot="mori">'+(st.pot==='mori'||hasUnlock('mori')?'✓ ':'')+'Mori\'s Enchanting Pot</button></div>';
  h+='<div class="sec">Smith a blade</div><div class="row">'+
    '<button data-smith="cast_iron">Cast iron (DC 10)</button>'+
    '<button data-smith="steel_mw">Steel MW sword (DC 15)</button>'+
    '<button data-smith="manganese">Manganese steel (DC 20)</button>'+
    '<button data-smith="nickel">Nickel steel (DC 20)</button></div>';
  const stock=merchantStock();
  h+='<div class="sec">Merchant stock (herbs & metals)</div><div class="small">'+stock.herbs.map(x=>x.name+' ×'+x.qty).join(', ')+' · '+stock.metals.map(x=>x.name+' ×'+x.qty).join(', ')+'</div>';
  h+='<div class="small">Guild treasury buys crafted goods for ~60% Marks value.</div>';
  return h;
}

function brewGrey(which){
  if(!potCanBrew().grey) return {ok:false, why:'pot too crude'};
  const item=which==='white'?JSON.parse(JSON.stringify(HERBAL.WHITE_POTION)):JSON.parse(JSON.stringify(HERBAL.GREY_POTION));
  // costs
  const need=which==='white'?{'r:calendula':2,'r:comfrey':1,'r:myrrh':1}:{'r:yarrow':2,'r:mint':1,'herbs':1};
  for(const k in need){ const have=k.startsWith('r:')?GATHERING.count(k):(X.S()[k]||0)+GATHERING.stand(k); if(have<need[k]) return {ok:false, why:'need '+k}; }
  for(const k in need){ if(k.startsWith('r:')) GATHERING.spendKey(k,need[k]); else { let n=need[k]; const a=Math.min(X.S()[k]||0,n); X.S()[k]-=a; n-=a; if(n) GATHERING.spendKey(k,n); } }
  GATHERING.clean(); gain('alchemy',12); return {ok:true, item};
}
function brewGreen(){
  if(!canGreen()) return {ok:false, why:'green / magic potions need a brass (or higher) pot — zinc starts the path'};
  const need={'r:yarrow':2,'r:comfrey':2,'r:frankincense':1};
  for(const k in need) if(GATHERING.count(k)<need[k]) return {ok:false, why:'need '+k};
  // optional mythic upgrade already handled in blends; base green:
  for(const k in need) GATHERING.spendKey(k,need[k]); GATHERING.clean();
  gain('alchemy',18); return {ok:true, item:JSON.parse(JSON.stringify(HERBAL.GREEN_POTION))};
}

window.STATIONS={ POT_TIERS, FORGE_TIERS, SMITH_DC, STATION_KINDS,
  init(o){ X=o; bag(); }, bag, skills, skillLv, gain, potTier, forgeTier, potCanBrew, canGreen,
  unlockNext, canUpgradeTo, hasUnlock, unlocked, craftCheck, smithSword, stampDurability, wearItem, repairItem,
  enableEnchantForge, enableEnchantCircle, merchantStock, treasuryBuyCrafted, panelHTML, brewGrey, brewGreen };
})();
