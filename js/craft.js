/* Item Creation Bench — SRD 3.5 style magic item pricing.
   Base price = spell level x caster level x multiplier (use-activated / continuous 2,000 gp, command word 1,800 gp).
   Charges per day: divide by (5 / charges). Continuous: rounds x4, 1 min/level x2, 10 min/level x1.5, 24 h+ x0.5.
   0-level spells count as 1/2. Metamagic raises the effective spell level (and so the minimum caster level).
   Several abilities on one item: costliest 100%, next 75%, the rest 50% (SRD multiple-abilities rule).
   Craft cost = base item + half the magic price, plus 1/25 of the magic price in XP. */
(function(){
'use strict';
const SPELLS={
  expeditious:{name:'Expeditious Retreat', lvl:1, dur:'min',   fx:{speed:0.3},        school:'Transmutation'},
  longstrider:{name:'Longstrider',         lvl:1, dur:'hour',  fx:{speed:0.1},        school:'Transmutation'},
  catsgrace:  {name:"Cat's Grace",         lvl:2, dur:'min',   fx:{ac:1},             school:'Transmutation'},
  haste:      {name:'Haste',               lvl:3, dur:'round', fx:{speed:0.3, atk:1}, school:'Transmutation'},
  bulls:      {name:"Bull's Strength",     lvl:2, dur:'min',   fx:{atk:1, dmg:1},     school:'Transmutation'},
  barkskin:   {name:'Barkskin',            lvl:2, dur:'10min', fx:{ac:2},             school:'Transmutation'},
  shield:     {name:'Shield',              lvl:1, dur:'min',   fx:{ac:2},             school:'Abjuration'},
  magearmor:  {name:'Mage Armor',          lvl:1, dur:'hour',  fx:{ac:1},             school:'Conjuration'},
  magicweapon:{name:'Magic Weapon',        lvl:1, dur:'min',   fx:{atk:1},            school:'Transmutation'},
  bless:      {name:'Bless',               lvl:1, dur:'min',   fx:{atk:1},            school:'Enchantment'},
  jump:       {name:'Jump',                lvl:1, dur:'min',   fx:{},                 school:'Transmutation'},
  featherfall:{name:'Feather Fall',        lvl:1, dur:'round', fx:{},                 school:'Transmutation'},
  darkvision: {name:'Darkvision',          lvl:2, dur:'hour',  fx:{},                 school:'Transmutation'},
  light:      {name:'Light',               lvl:0, dur:'10min', fx:{},                 school:'Evocation'},
  curelight:  {name:'Cure Light Wounds',   lvl:1, dur:'inst',  fx:{regen:1},          school:'Conjuration'},
  truestrike: {name:'True Strike',         lvl:1, dur:'round', fx:{atk:1},            school:'Divination'}
};
const METAMAGIC={ extend:{name:'Extend Spell',up:1}, empower:{name:'Empower Spell',up:2}, maximize:{name:'Maximize Spell',up:3}, quicken:{name:'Quicken Spell',up:4},
  silent:{name:'Silent Spell',up:1}, still:{name:'Still Spell',up:1}, enlarge:{name:'Enlarge Spell',up:1}, widen:{name:'Widen Spell',up:3} };
const USES={ scroll:{name:'Scroll (spell completion)',mult:25,fixed:true}, potion:{name:'Potion (use-activated, drink)',mult:50,fixed:true}, wand:{name:'Wand (50 charges)',mult:750,fixed:true},
  use:{name:'Use-activated',mult:2000}, continuous:{name:'Continuous',mult:2000}, command:{name:'Command word',mult:1800}, charges:{name:'Charges per day',mult:1800} };
/* SRD 3.5 item creation feats - minimum caster level to take the feat */
const FEATS={ scribe:{name:'Scribe Scroll',cl:1}, brew:{name:'Brew Potion',cl:3}, wondrous:{name:'Craft Wondrous Item',cl:3}, arms:{name:'Craft Magic Arms and Armor',cl:5},
  wand:{name:'Craft Wand',cl:5}, rod:{name:'Craft Rod',cl:9}, staff:{name:'Craft Staff',cl:12}, ring:{name:'Forge Ring',cl:12} };
const CRAFTERS={ you:{name:'You', cl:null}, mori:{name:'Mori (guild artificer)', cl:6}, delroth:{name:'Delroth (Dread Necromancer)', cl:60} };
const DURMOD={round:4, min:2, '10min':1.5, hour:1, day:0.5, inst:1};
const BASES={
  chainshirt:{name:'Masterwork Chain Shirt', kind:'armor', price:250, fx:{}, armorType:'Chain Shirt'},
  leather:   {name:'Masterwork Leather Armor', kind:'armor', price:160, fx:{}, armorType:'Leather'},
  breastplate:{name:'Masterwork Breastplate', kind:'armor', price:350, fx:{}, armorType:'Breastplate'},
  longsword: {name:'Masterwork Longsword', kind:'weapon', price:315, fx:{}, mw:true},
  cloak:     {name:'Cloak', kind:'wondrous', price:1, fx:{}},
  boots:     {name:'Boots', kind:'wondrous', price:1, fx:{}},
  ring:      {name:'Silver Ring', kind:'ring', price:5, fx:{}},
  amulet:    {name:'Amulet', kind:'wondrous', price:5, fx:{}},
  hat:       {name:'Wide-brim Hat', kind:'wondrous', price:1, fx:{}},
  scroll:    {name:'Scroll', kind:'scroll', price:0, fx:{}, use:'scroll', feat:'scribe'},
  potion:    {name:'Potion', kind:'potion', price:0, fx:{}, use:'potion', feat:'brew'},
  wand:      {name:'Wand', kind:'wand', price:0, fx:{}, use:'wand', feat:'wand'},
  rod:       {name:'Rod', kind:'rod', price:0, fx:{}, feat:'rod'},
  staff:     {name:'Staff', kind:'staff', price:0, fx:{}, feat:'staff'}
};
const KIND_FEAT={armor:'arms', weapon:'arms', ring:'ring', wondrous:'wondrous'};
Object.values(BASES).forEach(b=>{ if(!b.feat) b.feat=KIND_FEAT[b.kind]; });
function featFor(baseKey){ const b=BASES[baseKey]||BASES.cloak; return FEATS[b.feat]; }
const minCL=l=>l<=0?1:l*2-1;
/* Robert's House Rules (toggles, all ON by default):
   maxEnh5  - enhancement bonus capped at +5 (off: up to +10, epic table).
   budget   - an item holds at most 5 effective spell levels, +2 wiggle room (so a metamagic that pushes slightly over still fits).
   ritual   - "Quickened Ritual" is offered: quickens the crafting RITUAL (not the item's spell) - crafting becomes instant
              for a +50% gp and +50% XP surcharge. Separate from Quicken Spell on the item's spell (e.g. quickened true strike).
   dmMeta   - DM ruling: metamagic allowed on continuous / use-activated items (off: metamagic only on command word / charges).
   Crafting time (SRD): 1 day per 1,000 gp of base price; house minimum 8 hours. */
const HOUSE_DEFAULT={maxEnh5:true, budget:true, ritual:true, dmMeta:true};
const BUDGET={cap:5, wiggle:2};
const RITUAL={gp:0.5, xp:0.5};
function price(cfg, rules, crafterCL){
  rules=Object.assign({}, HOUSE_DEFAULT, rules||{});
  const base=BASES[cfg.base]||BASES.cloak; const useKey=base.use||(USES[cfg.use]&&!USES[cfg.use].fixed?cfg.use:'use'); const use=USES[useKey];
  cfg=Object.assign({}, cfg, {use:useKey});
  const issues=[]; const feat=FEATS[base.feat]; const ccl=crafterCL==null?99:crafterCL;
  const featLocked=feat&&ccl<feat.cl; if(featLocked) issues.push('🔒 Requires '+feat.name+' (caster level '+feat.cl+'+); crafter is CL '+ccl+'.');
  const metaBlocked=!rules.dmMeta && (cfg.use==='continuous'||cfg.use==='use') && (cfg.meta||[]).length>0;
  if(metaBlocked) issues.push('Metamagic on '+use.name.toLowerCase()+' items needs the DM ruling toggle.');
  const meta=metaBlocked?[]:(cfg.meta||[]);
  const up=meta.reduce((a,k)=>a+(METAMAGIC[k]?METAMAGIC[k].up:0),0);
  const lines=(cfg.spells||[]).filter(k=>SPELLS[k]).map(k=>{
    const sp=SPELLS[k]; const eff=sp.lvl+up; const effL=eff<=0?0.5:eff; const cl=minCL(eff)+(cfg.clBonus||0);
    let gp=effL*cl*use.mult, note=effL+' x CL'+cl+' x '+use.mult;
    if(cfg.use==='continuous'){ const d=DURMOD[sp.dur]||1; gp*=d; if(d!==1) note+=' x'+d+' ('+sp.dur+')'; }
    if(cfg.use==='charges'){ const c=Math.max(1,Math.min(5,cfg.charges||1)); gp/= (5/c); note+=' / (5/'+c+')'; }
    return {key:k, name:sp.name, eff, effL, cl, gp:Math.round(gp), note};
  });
  const sorted=lines.slice().sort((a,b)=>b.gp-a.gp); let magic=0;
  sorted.forEach((l,i)=>{ const f=i===0?1:i===1?0.75:0.5; l.factor=f; magic+=l.gp*f; });
  // enhancement bonus (armor/shield: bonus^2 x 1,000 gp; weapon: bonus^2 x 2,000 gp)
  const enhMax=rules.maxEnh5?5:10; let enh=Math.max(0,Math.floor(cfg.enh||0));
  if(base.kind!=='armor'&&base.kind!=='weapon') enh=0;
  if(enh>enhMax){ issues.push('Enhancement capped at +'+enhMax+(rules.maxEnh5?' (house rule)':'')+'.'); enh=enhMax; }
  const enhGp=enh?enh*enh*(base.kind==='weapon'?2000:1000):0; magic+=enhGp;
  magic=Math.round(magic);
  // spell-level budget
  const used=lines.reduce((a,l)=>a+l.effL,0);
  const budget={used, cap:BUDGET.cap, max:BUDGET.cap+BUDGET.wiggle, on:!!rules.budget,
    state: used<=BUDGET.cap?'ok':used<=BUDGET.cap+BUDGET.wiggle?'wiggle':'over'};
  if(rules.budget && budget.state==='over') issues.push('Over the spell-level budget ('+used+' / '+budget.max+' incl. +'+BUDGET.wiggle+' wiggle room).');
  // crafting cost, time, ritual
  let craftGp=base.price+Math.round(magic/2), xp=Math.round(magic/25);
  const hours=magic>0?Math.max(8, Math.ceil(magic/1000)*24):0; // shown as days of 24h for >= 1 day
  const days=magic/1000;
  const ritual=!!(rules.ritual && cfg.ritual);
  let surchargeGp=0, surchargeXp=0;
  if(ritual){ surchargeGp=Math.round((craftGp-base.price)*RITUAL.gp); surchargeXp=Math.round(xp*RITUAL.xp); craftGp+=surchargeGp; xp+=surchargeXp; }
  const time=ritual?{instant:true, label:'Instant (Quickened Ritual)', days:0}
    : {instant:false, days:Math.max(1/3, Math.ceil(days)), label: magic<=0?'—': days<1?'8 hours (minimum)':Math.ceil(days).toLocaleString()+' days'};
  const total=base.price+magic;
  const fx=Object.assign({}, base.fx); lines.forEach(l=>{ const f=SPELLS[l.key].fx; for(const k in f) fx[k]=(fx[k]||0)+f[k]; });
  // v3.2: the enhancement bonus lives on item.bonus (not fx) and the armor's SRD base AC comes from its type, so nothing is counted twice
  const clTooHigh=lines.some(l=>l.cl>ccl); if(clTooHigh) issues.push('Item caster level '+Math.max(...lines.map(l=>l.cl))+' is above the crafter\'s CL '+ccl+'.');
  if(['scroll','potion','wand'].includes(useKey)&&lines.length>1) issues.push(base.name+'s hold one spell.');
  const ok=(lines.length>0||enh>0) && !(rules.budget && budget.state==='over') && !featLocked && !clTooHigh && !(['scroll','potion','wand'].includes(useKey)&&lines.length>1);
  return {base, use:useKey, feat, featLocked, crafterCL:ccl, lines:sorted, enh, enhGp, enhMax, magic, total, craftGp, xp, fx, budget, time, ritual, surchargeGp, surchargeXp, metaBlocked, issues, ok, rules,
    guildGold:Math.max(1,Math.ceil(craftGp))}; // v3.2: 1 gold = 1 gp (SRD scale)
}
const PRESETS={ strider:{label:"Robert's Strider Armor", name:"Robert's Strider Armor", base:'chainshirt', use:'continuous', spells:['expeditious','longstrider','catsgrace','haste'], meta:[], clBonus:0, charges:3, enh:0, ritual:false, crafter:'mori'} };
function staleBenchName(name, base){ if(!name||name==='My Wondrous Item') return true; if(/strider armor/i.test(name)&&base!=='chainshirt') return true; return false; }
function titledName(baseKey, spellName){ const b=BASES[baseKey]; if(!b) return 'My Wondrous Item'; return b.name+(spellName?' of '+spellName:''); }
window.CRAFT={SPELLS, METAMAGIC, USES, BASES, DURMOD, price, PRESETS, minCL, FEATS, CRAFTERS, featFor, HOUSE_DEFAULT, BUDGET, RITUAL, staleBenchName, titledName};
})();
