/* herbal.js (v3.8) — Real-world herbal reagents, traditional-use blends (folklore), healing ladder.
   Salves: HoT, no roll. Bandages: hotbar default, HoT + D&D 3.5 Heal check. White-grey potions: strong HoT.
   Green/magic potions: instant heal (need brass+ pot). Mythical beast reagents upgrade blends to magic tier.
   Folklore only — not medical advice. Behave #1. No energy / paywalls. */
(function(){
'use strict';
let X=null;

/* Real-world herbs (gathered). Folklore blurbs go into LORE as kind:'herb'. */
const HERBS={
  lavender:   {name:'Lavender',   tier:1, gp:0.2, wt:0.1, stack:50, col:'#9b7ec8', biomes:['grass','forest','steppe'],
    folk:'Folk say lavender calms restless nights and soothes a worried brow. A garden favorite of herb-keepers.'},
  frankincense:{name:'Frankincense Resin', tier:2, gp:2, wt:0.1, stack:40, col:'#e8d9a8', biomes:['desert','savanna','mountain'],
    folk:'Resin burned in temples for ages. Storytellers claim its smoke clears a tense room and settles the spirit.'},
  chamomile:  {name:'Chamomile',  tier:1, gp:0.15, wt:0.1, stack:50, col:'#f2e6a0', biomes:['grass','steppe','savanna'],
    folk:'Little daisy of the meadow. Folklore links it to gentle sleep and a settled stomach after a long road.'},
  yarrow:     {name:'Yarrow',     tier:1, gp:0.2, wt:0.1, stack:50, col:'#f5f0e0', biomes:['grass','mountain','steppe'],
    folk:'Soldiers\' weed in old songs — pressed to cuts on the field. Said to slow a trickle of blood.'},
  comfrey:    {name:'Comfrey',    tier:1, gp:0.25, wt:0.2, stack:40, col:'#6a8a4a', biomes:['forest','swamp','grass'],
    folk:'Knitbone of hedge-witches. Folklore says a poultice eases bruises and helps a sprain feel steadier.'},
  calendula:  {name:'Calendula',  tier:1, gp:0.2, wt:0.1, stack:50, col:'#f0a020', biomes:['grass','garden','savanna'],
    folk:'Marigold\'s cousin. Garden lore paints it as kind to scraped knees and sun-touched skin.'},
  sage:       {name:'Sage',       tier:1, gp:0.2, wt:0.1, stack:50, col:'#7a9a6a', biomes:['grass','mountain','steppe'],
    folk:'Kitchen and shrine leaf. Old tales say a sage wash clears a foggy head and a musty room.'},
  mint:       {name:'Mint',       tier:0, gp:0.1, wt:0.1, stack:50, col:'#4fbf7a', biomes:['grass','swamp','forest','guild'],
    folk:'Cool leaf by every stream. Folklore credits it with settling a queasy traveler and freshening the breath.'},
  rosemary:   {name:'Rosemary',   tier:1, gp:0.25, wt:0.1, stack:50, col:'#3a6a4a', biomes:['grass','beach','mountain'],
    folk:'Remembrance herb. Ballads say a sprig sharpens recall and steadies a weary walker.'},
  willow_bark:{name:'Willow Bark',tier:1, gp:0.3, wt:0.2, stack:40, col:'#c8b090', biomes:['forest','swamp','river'],
    folk:'River-tree bark. Healers of old chewed it for aches — a pain tonic in every grandmother\'s song.'},
  aloe:       {name:'Aloe Leaf',  tier:1, gp:0.3, wt:0.3, stack:30, col:'#6fbf6a', biomes:['desert','savanna'],
    folk:'Gel of the dry lands. Folklore paints it on burns and sun-sting; cool relief in a hot tale.'},
  myrrh:      {name:'Myrrh Resin',tier:2, gp:2.5, wt:0.1, stack:40, col:'#8a5a2a', biomes:['desert','savanna'],
    folk:'Bitter resin of funeral and feast. Stories say a myrrh salve seals a scrape and wards ill humours.'}
};

/* Mythical beast reagents that upgrade a blend to magic (green) tier */
const MYTHIC={
  phoenix_ash:{name:'Phoenix Ash', fam:'ichor', tier:3, gp:40, wt:0.1, stack:20, col:'#ff6a20', note:'mythic · upgrades blends to magic'},
  unicorn_tear:{name:'Unicorn Tear', fam:'ichor', tier:3, gp:50, wt:0.05, stack:20, col:'#e8f8ff', note:'mythic · upgrades blends to magic'},
  dragon_scale_dust:{name:'Dragon Scale Dust', fam:'scales', tier:4, gp:80, wt:0.1, stack:20, col:'#5a8a2a', note:'mythic · upgrades blends to magic'},
  basilisk_eye:{name:'Basilisk Eye Jelly', fam:'ichor', tier:3, gp:45, wt:0.2, stack:10, col:'#8aff3a', note:'mythic · upgrades blends to magic'}
};

/* Sensible traditional blends only */
const BLENDS={
  calm_salve:{label:'Calming Lavender–Frankincense Salve', need:{'r:lavender':2,'r:frankincense':1},
    item:{name:'Calming Salve', cat:'Salve', kind:'salve', value:15, color:'#c8b0e0',
      fx:{hot:{pps:1.5, dur:10}}, note:'lavender + frankincense · folklore calm'},
    mythNeed:{'r:unicorn_tear':1}, mythItem:{name:'Soothing Veil Salve', cat:'Magic Salve', kind:'salve', value:120, color:'#a3ff12',
      fx:{hot:{pps:3, dur:12}, buff:'calm'}, note:'magic tier · mythical tear'}},
  wound_salve:{label:'Yarrow–Comfrey Wound Salve', need:{'r:yarrow':2,'r:comfrey':2},
    item:{name:'Wound Salve', cat:'Salve', kind:'salve', value:18, color:'#c8d8a0',
      fx:{hot:{pps:2, dur:12}}, note:'yarrow + comfrey · field wound lore'},
    mythNeed:{'r:phoenix_ash':1}, mythItem:{name:'Phoenix Wound Salve', cat:'Magic Salve', kind:'salve', value:150, color:'#a3ff12',
      fx:{hot:{pps:4, dur:14}}, note:'magic tier · phoenix ash'}},
  skin_salve:{label:'Calendula–Aloe Skin Salve', need:{'r:calendula':2,'r:aloe':1},
    item:{name:'Skin Salve', cat:'Salve', kind:'salve', value:14, color:'#f0c060',
      fx:{hot:{pps:1.2, dur:10}}, note:'calendula + aloe · scraped skin lore'}},
  pain_tonic:{label:'Willow Bark Pain Tonic', need:{'r:willow_bark':3,'r:mint':1},
    item:{name:'Pain Tonic', cat:'Tonic', kind:'potion', value:20, color:'#c8b090',
      fx:{hot:{pps:1, dur:8}, buff:'ease'}, note:'willow bark · ache tonic folklore'},
    mythNeed:{'r:basilisk_eye':1}, mythItem:{name:'Ease of Scales Tonic', cat:'Magic Potion', kind:'potion', value:160, color:'#a3ff12',
      fx:{heal:'2d8+3'}, note:'green / instant · mythical'}},
  clear_brew:{label:'Sage–Rosemary Clarity Brew', need:{'r:sage':2,'r:rosemary':1},
    item:{name:'Clarity Brew', cat:'Tonic', kind:'potion', value:12, color:'#8aaa70',
      fx:{buff:'clarity'}, note:'sage + rosemary · clear-head folklore'}},
  sleep_tea:{label:'Chamomile Sleep Tea', need:{'r:chamomile':3,'r:lavender':1},
    item:{name:'Sleep Tea', cat:'Tonic', kind:'potion', value:10, color:'#f2e6a0',
      fx:{hot:{pps:0.8, dur:15}, buff:'restful'}, note:'chamomile + lavender · rest folklore'}},
  myrrh_balm:{label:'Myrrh Sealing Balm', need:{'r:myrrh':1,'r:calendula':1,'r:yarrow':1},
    item:{name:'Sealing Balm', cat:'Salve', kind:'salve', value:22, color:'#8a5a2a',
      fx:{hot:{pps:2.5, dur:10}}, note:'myrrh + calendula + yarrow'}}
};

/* Healing ladder helpers */
const BANDAGE={name:'Linen Bandage', cat:'Bandage', kind:'bandage', value:1, color:'#e8e0d0',
  fx:{hot:{pps:1, dur:8}, healCheck:true}, note:'hotbar default · d20 + Wis + Heal ranks'};
const GREY_POTION={name:'Grey Recovery Draught', cat:'Potion', kind:'potion', tier:'grey', value:40, color:'#b0b0b8',
  fx:{hot:{pps:3, dur:12}}, note:'white-grey · strong heal over time'};
const WHITE_POTION={name:'White Mending Draught', cat:'Potion', kind:'potion', tier:'grey', value:60, color:'#f0f0f4',
  fx:{hot:{pps:4, dur:14}}, note:'white-grey · stronger HoT'};
const GREEN_POTION={name:'Green Instant Cure', cat:'Magic Potion', kind:'potion', tier:'green', value:150, color:'#a3ff12',
  fx:{heal:'2d8+3'}, note:'green · instant · needs brass+ pot'};

function loreCards(){
  return Object.keys(HERBS).map(id=>{ const h=HERBS[id];
    return {id:'herb_'+id, kind:'herb', title:h.name, blurb:h.folk+' (Folklore — not medical advice.)', unlock:'gather_'+id}; });
}

function registerGather(){
  if(!window.GATHERING||!GATHERING.R) return;
  const R=GATHERING.R;
  Object.keys(HERBS).forEach(id=>{ if(R[id]) return;
    const h=HERBS[id]; R[id]={id, name:h.name, fam:'herb', tier:h.tier, gp:h.gp, wt:h.wt, stack:h.stack, col:h.col, folk:h.folk}; });
  Object.keys(MYTHIC).forEach(id=>{ if(R[id]) return;
    const m=MYTHIC[id]; R[id]={id, name:m.name, fam:m.fam, tier:m.tier, gp:m.gp, wt:m.wt, stack:m.stack, col:m.col, note:m.note, mythic:true}; });
}

function injectBiomes(){
  // Soft-patch gather HERBS tables if exposed; else game uses our list via gather patch
  if(window.GATHERING&&GATHERING._herbBiomes) GATHERING._herbBiomes(HERBS);
}

function ensureBandage(S){
  if(!S.inv) S.inv=[];
  if(!S.inv.some(i=>i.kind==='bandage')){
    S.inv.push(Object.assign({id:'band_starter'}, BANDAGE));
  }
  if(!S.hotbar) S.hotbar={bandage:true, potion:true, salve:true};
  return S;
}

function wisMod(S){ // D&D 3.5: default Wis 12 → +1; persona can raise
  const p=(S.persona&&S.persona.wis)||12; return Math.floor((p-10)/2);
}
function healRanks(S){
  const sk=(S.craftSkills||{}); return Math.min(20, Math.floor((sk.heal||0)/25));
}
function healCheck(){
  const S=X.S(); const d=SRD.d20(), wis=wisMod(S), ranks=healRanks(S), tot=d+wis+ranks;
  // Better roll → more healing: base 1d4, +1 per 5 over DC 10, crit 20 doubles
  const base=SRD.dice('1d4'); let bonus=Math.max(0, Math.floor((tot-10)/5));
  if(d===20) bonus+=base; if(d===1) bonus=Math.min(bonus,0);
  const heal=Math.max(1, base+bonus);
  return {d, wis, ranks, tot, heal, crit:d===20, fumble:d===1};
}

function applyHot(fx, label){
  const S=X.S(); if(!S.hots) S.hots=[];
  S.hots.push({pps:fx.pps, left:fx.dur, label:label||'salve'});
}
function tickHots(dt){
  const S=X.S(); if(!S.hots||!S.hots.length) return;
  const max=X.stats?X.stats().maxHp:20; let healed=0;
  for(let i=S.hots.length-1;i>=0;i--){ const h=S.hots[i]; const got=h.pps*dt; S.hp=Math.min(max, S.hp+got); healed+=got; h.left-=dt; if(h.left<=0) S.hots.splice(i,1); }
  return healed;
}

function useHealItem(it){
  if(!it) return null; const S=X.S(); const f=it.fx||{}; const max=(X.stats?X.stats().maxHp:20);
  const idx=S.inv.indexOf(it); if(idx<0) return null; S.inv.splice(idx,1);
  // gain Heal skill when using bandages / heal items (Albion-style use)
  if(!S.craftSkills) S.craftSkills={}; S.craftSkills.heal=(S.craftSkills.heal||0)+6;
  if(f.healCheck){ const r=healCheck(); applyHot({pps:Math.max(0.5, r.heal/8), dur:8}, it.name);
    // also instant chunk equal to check result
    S.hp=Math.min(max, S.hp+r.heal);
    if(X.showRoll) X.showRoll(r.d, it.name+': Heal check d20 '+r.d+' + Wis '+r.wis+' + ranks '+r.ranks+' = '+r.tot+' → heal '+r.heal+(r.crit?' (nat 20!)':''), r.crit?'crit':r.fumble?'foe':'');
    if(X.log) X.log('🩹 '+it.name+': '+r.heal+' HP + HoT. Heal ranks now '+healRanks(S)+'.');
    return {kind:'bandage', roll:r}; }
  if(f.heal){ const n=SRD.dice(f.heal); S.hp=Math.min(max,S.hp+n); if(X.showRoll) X.showRoll(n, it.name+': instant heal '+f.heal+' = '+n, 'crit'); if(X.log) X.log('💚 '+it.name+' (green / instant): +'+n+' HP'); return {kind:'green', n}; }
  if(f.hot){ applyHot(f.hot, it.name); if(X.log) X.log((it.kind==='salve'?'🧴':'🧪')+' '+it.name+': healing over time ('+f.hot.pps+'/s for '+f.hot.dur+'s). No roll.'); return {kind:'hot'}; }
  if(f.buff){ S.buffs[f.buff]=90; if(X.log) X.log(it.name+' applied.'); return {kind:'buff'}; }
  return {kind:'other'};
}

function pickHotbar(slot){
  const S=X.S();
  if(slot==='bandage') return S.inv.find(i=>i.kind==='bandage')||null;
  if(slot==='salve') return S.inv.find(i=>i.kind==='salve')||null;
  if(slot==='potion'){
    // prefer green instant, then grey HoT, then any heal potion
    return S.inv.find(i=>i.kind==='potion'&&i.tier==='green')
      || S.inv.find(i=>i.kind==='potion'&&i.tier==='grey')
      || S.inv.find(i=>i.kind==='potion'&&i.fx&&(i.fx.heal||i.fx.hot))
      || S.inv.find(i=>i.kind==='potion')||null;
  }
  return null;
}

function hotbarHTML(){
  const S=X.S(); const b=S.inv.filter(i=>i.kind==='bandage').length;
  const s=S.inv.filter(i=>i.kind==='salve').length;
  const g=S.inv.filter(i=>i.kind==='potion'&&i.tier==='green').length;
  const grey=S.inv.filter(i=>i.kind==='potion'&&i.tier==='grey').length;
  const pot=S.inv.filter(i=>i.kind==='potion').length;
  return {bandage:b, salve:s, green:g, grey:grey, potion:pot};
}

function panelBlends(potTier){
  const unlocked=window.STATIONS?STATIONS.potCanBrew(potTier||'clay'):{mundane:true, grey:true, green:false};
  let h='<div class="sec">Herbal blends (folklore recipes)</div><div class="small">Traditional uses only — folklore, not medical advice. Mythical reagents upgrade a blend to the magic (green) tier. Green instant potions need a brass or higher pot.</div>';
  Object.keys(BLENDS).forEach(k=>{ const b=BLENDS[k]; const need=Object.entries(b.need).map(([id,n])=>n+' '+(GATHERING.R[id.slice(2)]||{name:id}).name).join(', ');
    h+='<div class="q"><span><b>'+b.label+'</b><br><span class="small">'+need+' → '+b.item.name+' ('+(b.item.fx.hot?'HoT salve/tonic':b.item.fx.heal?'instant':'buff')+')</span></span>'+
      '<button data-blend="'+k+'">Brew</button>'+(b.mythNeed&&unlocked.green?'<button data-blendmyth="'+k+'">Magic tier</button>':'')+'</div>'; });
  h+='<div class="sec">Healing ladder</div><div class="small">🧴 Salves — heal over time, no roll, auto from hotbar. 🩹 Bandages — every character\'s hotbar; HoT + Heal check (d20+Wis+ranks). ⚪ Grey draughts — stronger HoT. 💚 Green — instant (brass+ pot).</div>';
  return h;
}

function brewBlend(key, myth){
  const b=BLENDS[key]; if(!b) return null;
  const need=myth&&b.mythNeed?Object.assign({},b.need,b.mythNeed):b.need;
  const item=myth&&b.mythItem?b.mythItem:b.item;
  for(const k in need){ if(GATHERING.count(k)<need[k]) return {ok:false, missing:k}; }
  for(const k in need) GATHERING.spendKey(k, need[k]);
  GATHERING.clean();
  // unlock lore for used herbs
  Object.keys(need).forEach(k=>{ if(k.startsWith('r:')){ const id=k.slice(2); if(HERBS[id]&&window.LORE) LORE.unlock('herb_'+id); } });
  if(!X.S().craftSkills) X.S().craftSkills={}; X.S().craftSkills.alchemy=(X.S().craftSkills.alchemy||0)+10+(myth?15:0);
  return {ok:true, item:JSON.parse(JSON.stringify(item))};
}

function registerLore(){
  if(!window.LORE||!LORE.CARDS) return;
  loreCards().forEach(c=>{ if(!LORE.CARDS.find(x=>x.id===c.id)){ LORE.CARDS.push(c); if(LORE.byId){ /* rebuild via side effect if needed */ } } });
  // patch LORE.byId map if present
  if(LORE.CARDS){ const BY={}; LORE.CARDS.forEach(c=>BY[c.id]=c); LORE._BY=BY; }
}

window.HERBAL={ HERBS, MYTHIC, BLENDS, BANDAGE, GREY_POTION, WHITE_POTION, GREEN_POTION,
  init(o){ X=o; registerGather(); registerLore(); ensureBandage(o.S()); },
  registerGather, registerLore, loreCards, ensureBandage, wisMod, healRanks, healCheck,
  applyHot, tickHots, useHealItem, pickHotbar, hotbarHTML, panelBlends, brewBlend,
  onGather(id){ if(HERBS[id]&&window.LORE) LORE.unlock('herb_'+id); } };
})();
