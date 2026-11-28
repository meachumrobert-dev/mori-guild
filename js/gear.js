/* SRD-shaped gear, depth, alloys, and the metal ladder.
   Two rings. A force shield is a shield bonus. Weapons keep their own dice. */
(function(root){
'use strict';
const SLOTS=['head','eyes','neck','shoulders','body','torso','arms','hands','ring','ring2','waist','feet','main','off'];
const METALS=['copper','bronze','iron','steel','silver','gold','orichalcum','mithril','adamantine'];
const WEAPONS={
  dagger:{die:'1d4', threat:19, crit:2, hands:1},
  scimitar:{die:'1d6', threat:18, crit:2, hands:1},
  rapier:{die:'1d6', threat:18, crit:2, hands:1},
  shortsword:{die:'1d6', threat:19, crit:2, hands:1},
  longsword:{die:'1d8', threat:19, crit:2, hands:1},
  battleaxe:{die:'1d8', threat:20, crit:3, hands:1},
  warhammer:{die:'1d8', threat:20, crit:3, hands:1},
  morningstar:{die:'1d8', threat:20, crit:2, hands:1},
  quarterstaff:{die:'1d6', threat:20, crit:2, hands:2},
  shortbow:{die:'1d6', threat:20, crit:3, hands:2},
  longbow:{die:'1d8', threat:20, crit:3, hands:2}
};
const ALLOYS={
  bronze:{out:'bronze_bar', need:{copper_bar:2, tin_bar:1}},
  brass:{out:'brass_bar', need:{copper_bar:2, zinc_bar:1}}
};
const COINS=['tin','copper','nickel','bronze','brass','silver','gold','platinum','mithril'];
const PURITY={tin:1, copper:2, nickel:3, bronze:4, brass:5, silver:10, gold:20, platinum:40, mithril:80};
function weaponOf(name, size){
  const n=String(name||'').toLowerCase();
  let hit=null;
  Object.keys(WEAPONS).forEach(id=>{ if(n.indexOf(id)>=0||n.indexOf(id.replace('sword',' sword'))>=0) hit=id; });
  if(/short sword/.test(n)) hit='shortsword';
  if(/long sword/.test(n)) hit='longsword';
  const w=Object.assign({id:hit||'longsword'}, WEAPONS[hit||'longsword']);
  if(size==='small'&&w.die==='1d8') w.die='1d6';
  if(size==='small'&&w.die==='1d6'&&/bow|staff/.test(hit||'')) w.die='1d4';
  return w;
}
function crits(roll, threat){
  return roll>=(threat||20)&&roll<=20;
}
function slotOf(it){
  if(!it) return null;
  const n=String(it.name||'').toLowerCase();
  if(it.kind==='weapon') return 'main';
  if(it.kind==='shield'||/force shield/.test(n)) return 'off';
  if(it.kind==='ring'||/ring/.test(n)) return 'ring';
  if(/helm|hat|crown|circlet/.test(n)) return 'head';
  if(/goggle|lens|eye/.test(n)) return 'eyes';
  if(/amulet|necklace|periapt/.test(n)) return 'neck';
  if(/cloak|cape|mantle/.test(n)) return 'shoulders';
  if(/armor|mail|plate|shirt|leather/.test(n)||it.kind==='armor') return 'body';
  if(/vest|robe/.test(n)) return 'torso';
  if(/bracer|gauntlet/.test(n)) return 'arms';
  if(/glove/.test(n)) return 'hands';
  if(/belt/.test(n)) return 'waist';
  if(/boot|shoe/.test(n)||it.kind==='boots') return 'feet';
  return it.slot||null;
}
function wornRings(inv){
  return (inv||[]).filter(i=>i&&i.equipped&&slotOf(i)==='ring');
}
function canWear(inv, it){
  const slot=slotOf(it);
  if(slot!=='ring'){
    const other=(inv||[]).find(i=>i&&i!==it&&i.equipped&&slotOf(i)===slot);
    return {ok:!other, slot, replaces:other||null};
  }
  const rings=wornRings(inv).filter(i=>i!==it);
  if(rings.length<2) return {ok:true, slot:'ring'};
  const weak=rings.slice().sort((a,b)=>(a.value||0)-(b.value||0))[0];
  return {ok:false, slot:'ring', replaces:weak};
}
function bonusKind(it){
  const n=String(it&&it.name||'').toLowerCase();
  if(/force shield/.test(n)||it&&it.kind==='shield') return 'shield';
  if(/natural armor|amulet of natural/.test(n)) return 'natural';
  if(/protection|deflection/.test(n)) return 'deflection';
  if(it&&it.kind==='armor') return 'armor';
  return 'magic';
}
function stackAC(parts){
  const out={armor:0, shield:0, deflection:0, natural:0, dex:0, magic:0};
  (parts||[]).forEach(p=>{
    const k=p.kind||'magic';
    if(k==='shield') out.shield=Math.max(out.shield, p.n||0);
    else out[k]=(out[k]||0)+(p.n||0);
  });
  const total=10+(out.dex||0)+(out.armor||0)+(out.shield||0)+(out.deflection||0)+(out.natural||0)+(out.magic||0);
  const note='10'
    +(out.dex?' + Dex '+out.dex:'')
    +(out.armor?' + armor '+out.armor:'')
    +(out.shield?' + shield '+out.shield:'')
    +(out.deflection?' + deflection '+out.deflection:'')
    +(out.natural?' + natural '+out.natural:'')
    +(out.magic?' + other '+out.magic:'');
  return {total, note, parts:out};
}
function treasureLevel(clears){ return 1+(clears|0); }
function deepen(mon, depth){
  mon=Object.assign({}, mon);
  const extra=Math.max(0, (depth|0)-1);
  mon.hp=Math.max(1, (mon.hp||1)+extra*4);
  mon.max=mon.hp;
  mon.ac=(mon.ac||10)+Math.min(8, extra);
  mon.atk=(mon.atk||0)+Math.min(8, extra);
  mon.dmgBonus=(mon.dmgBonus||0)+Math.floor(extra/2);
  mon.depth=depth|0;
  return mon;
}
function smelt(bag, id){
  const rec=ALLOYS[id];
  if(!rec) return {ok:false, why:'no alloy'};
  bag=bag||{};
  for(const k in rec.need) if((bag[k]|0)<rec.need[k]) return {ok:false, why:'short '+k};
  for(const k in rec.need) bag[k]-=rec.need[k];
  bag[rec.out]=(bag[rec.out]|0)+1;
  return {ok:true, out:rec.out, bag};
}
function roundHp(n){ return Math.round(Number(n)||0); }
function coinValue(id, grams, purity){
  const base=PURITY[id]||1;
  const p=purity==null?1:Math.max(0.1, Math.min(1, purity));
  return Math.round(base*(grams||1)*p*100)/100;
}
function mintLaw(regionMetals){
  const have=(regionMetals||[]).filter(id=>COINS.indexOf(id)>=0);
  return {accepts:have.length?have:['copper','bronze'], fee:0.08};
}
function change(purse, from, to, grams, law){
  law=law||mintLaw([from, to]);
  if(law.accepts.indexOf(from)<0||law.accepts.indexOf(to)<0) return {ok:false, why:'this mint does not take that metal'};
  const gross=coinValue(from, grams, 1);
  const fee=Math.round(gross*(law.fee||0)*100)/100;
  const net=Math.max(0, gross-fee);
  const unit=coinValue(to, 1, 1)||1;
  const out=Math.round((net/unit)*100)/100;
  return {ok:true, fee, grams:out};
}
function armorSet(metal){
  const i=METALS.indexOf(metal);
  if(i<0) return null;
  const ac=1+Math.floor(i/2);
  return {metal, ac, slots:['body','off'], rank:metal};
}
function rankFor(builds){
  const i=Math.max(0, Math.min(METALS.length-1, Math.floor((builds||0)/8)));
  return METALS[i];
}
root.GEAR={SLOTS, METALS, WEAPONS, ALLOYS, COINS, weaponOf, crits, slotOf, canWear, bonusKind, stackAC, treasureLevel, deepen, smelt, roundHp, coinValue, mintLaw, change, armorSet, rankFor, star:['mundane','roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.GEAR;
})(typeof window!=='undefined'?window:globalThis);
