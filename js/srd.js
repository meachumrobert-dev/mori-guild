/* SRD 3.5 open-content flavored data (OGL) — monsters, templates and random treasure tables.
   Names/stats are simplified from the d20 System Reference Document 3.5. Robert's own items live beside them. */
(function(){
'use strict';
const rnd=n=>1+Math.floor(Math.random()*n);
function dice(expr){ // "2d4+2"
  const m=/^(\d+)d(\d+)([+-]\d+)?$/.exec(expr); if(!m) return +expr||0;
  let t=0; for(let i=0;i<+m[1];i++) t+=rnd(+m[2]); return t+(+(m[3]||0)); }
const d20=()=>rnd(20), dPct=()=>rnd(100);

const MONSTERS={
  direrat:  {name:'Dire Rat',        hp:'1d8+1', ac:15, atk:4, dmg:'1d4',   color:'#6b5a4a', size:0.55, speed:3.4, xp:1, shape:'rat', type:'animal'},
  skeleton: {name:'Human Skeleton',  hp:'1d12',  ac:15, atk:1, dmg:'1d6+1', color:'#d8d2bc', size:1.0, speed:2.4, xp:2, shape:'skel', type:'undead'},
  zombie:   {name:'Human Zombie',    hp:'2d12+3',ac:11, atk:2, dmg:'1d6+1', color:'#6f8a5a', size:1.0, speed:1.6, xp:2, shape:'skel', type:'undead'},
  grayooze: {name:'Gray Ooze (slime boss)', hp:'6d10+30', ac:5, atk:3, dmg:'1d6+1', color:'#7d8a96', size:2.2, speed:1.3, xp:10, shape:'slime', boss:true, type:'ooze'},
  /* v3.4 overland critters (SRD 3.5 stat lines, simplified) */
  wolf:     {name:'Wolf',            hp:'2d8+4', ac:14, atk:3, dmg:'1d6+1', color:'#7a7468', size:1.0, speed:4.2, xp:2, shape:'wolf', type:'animal'},
  monitor:  {name:'Monitor Lizard',  hp:'3d8+9', ac:15, atk:5, dmg:'1d8+4', color:'#5f6b3a', size:1.0, speed:2.6, xp:3, shape:'lizard', type:'animal', reptile:true},
  firebeetle:{name:'Giant Fire Beetle',hp:'1d8', ac:16, atk:1, dmg:'2d4',   color:'#7a2a1a', size:0.8, speed:2.6, xp:1, shape:'beetle', type:'vermin'}
};
/* SRD templates applied to creatures: tint, aura and stat adjustments */
const TEMPLATES={
  none:      {name:'',           tint:null,      aura:null,      hp:0, ac:0, atk:0, dmg:0},
  fiendish:  {name:'Fiendish',   tint:'#a3202a', aura:'#ff3040', hp:2, ac:0, atk:0, dmg:1, note:'smite good 1/day, darkvision 60 ft.'},
  celestial: {name:'Celestial',  tint:'#f2e6a0', aura:'#ffe680', hp:2, ac:0, atk:0, dmg:1, note:'smite evil 1/day, darkvision 60 ft.'},
  halffiend: {name:'Half-Fiend', tint:'#5a1020', aura:'#ff2060', hp:4, ac:1, atk:2, dmg:2, note:'+4 Str, claws, bite'},
  skeleton:  {name:'Skeletal',   tint:'#e6e0c8', aura:null,      hp:0, ac:2, atk:0, dmg:0, note:'undead, DR 5/bludgeoning'},
  zombie:    {name:'Zombie',     tint:'#5f7a4a', aura:null,      hp:6, ac:-1,atk:0, dmg:1, note:'undead, single actions only'},
  undead:    {name:'Lich-touched',tint:'#4a5a8a',aura:'#6affc0', hp:4, ac:2, atk:1, dmg:1, note:'undead tint, fear aura'}
};
function makeMonster(kind, tmpl){
  const b=MONSTERS[kind], t=TEMPLATES[tmpl||'none'];
  const hp=Math.max(1,dice(b.hp)+t.hp);
  return {kind, tmpl:tmpl||'none', name:(t.name?t.name+' ':'')+b.name, hp, max:hp, ac:b.ac+t.ac, atk:b.atk+t.atk, dmg:b.dmg, dmgBonus:t.dmg,
    color:t.tint?mix(b.color,t.tint,0.55):b.color, aura:t.aura, size:b.size, speed:b.speed, xp:b.xp, shape:b.shape, type:b.type||'animal', reptile:!!b.reptile, boss:!!b.boss, note:t.note||''};
}
function mix(a,b,f){ const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16); const c=[16,8,0].map(s=>Math.round(((A>>s)&255)*(1-f)+((B>>s)&255)*f)); return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''); }

/* ---------- random treasure (SRD-style d% tables, minor items) ---------- */
const WEAPONS=['Longsword','Short Sword','Battleaxe','Warhammer','Rapier','Morningstar','Shortbow','Longbow','Light Crossbow','Quarterstaff','Dagger','Scimitar'];
const ARMORS=['Leather Armor','Studded Leather','Chain Shirt','Hide Armor','Scale Mail','Breastplate','Light Steel Shield','Heavy Wooden Shield'];
const WEAPON_SPECIAL=['Flaming','Frost','Shock','Keen','Ghost Touch','Merciful','Defending','Mighty Cleaving'];
const ARMOR_SPECIAL=['Light Fortification','Shadow','Silent Moves','Glamered','Slick'];
const POTIONS=[[20,'Potion of Cure Light Wounds',50,{heal:'1d8+1'}],[35,'Potion of Bull\'s Strength',300,{buff:'atk'}],[50,'Potion of Barkskin +2',300,{buff:'ac'}],
  [65,'Potion of Cure Moderate Wounds',300,{heal:'2d8+3'}],[80,'Potion of Shield of Faith +2',50,{buff:'ac'}],[90,'Oil of Magic Weapon',50,{buff:'atk'}],[100,'Potion of Cure Serious Wounds',750,{heal:'3d8+5'}]];
const RINGS=[[18,'Ring of Protection +1',2000,{ac:1}],[28,'Ring of Feather Falling',2200,{}],[36,'Ring of Sustenance',2500,{}],[44,'Ring of Climbing',2500,{}],[52,'Ring of Jumping',2500,{}],
  [60,'Ring of Swimming',2500,{}],[70,'Ring of Counterspells',4000,{}],[75,'Ring of Mind Shielding',8000,{}],[80,'Ring of Protection +2',8000,{ac:2}],[90,'Ring of Force Shield',8500,{ac:2}],[100,'Ring of the Ram',8600,{atk:1}]];
const WONDROUS=[[8,'Feather Token',50,{}],[16,'Elixir of Hiding',250,{}],[24,'Bag of Holding (type I)',2500,{}],[32,'Cloak of Resistance +1',1000,{ac:0}],[40,'Boots of Elvenkind',2500,{}],
  [48,'Bracers of Armor +1',1000,{ac:1}],[56,'Amulet of Natural Armor +1',2000,{ac:1}],[64,'Gloves of Dexterity +2',4000,{ac:1}],[72,'Gauntlets of Ogre Power',4000,{atk:1}],[80,'Pearl of Power (1st)',1000,{}],
  [88,'Hat of Disguise',1800,{}],[94,'Eyes of the Eagle',2500,{}],[100,'Dust of Appearance',1800,{}]];
const ROBERT=[['Weedwake Draught','potion'],['Tokenbloom Elixir','potion'],['Fence-Safe Charm','charm'],['Zero-Return Band','ring'],['Template Stylus','wondrous'],['Skinbinder Needle','wondrous'],['Quiet Path Marker','wondrous'],["Mori's Green Veil",'wondrous']];
const pick=(tbl,r)=>tbl.find(x=>r<=x[0]);
// enhancement bonus: d% shifted up by treasure level (deeper runs roll better), +1..+5
function enh(level){ const r=dPct()+Math.max(0,(level||1)-4)*6; return r<=70?1:r<=90?2:r<=100?3:r<=112?4:5; }

/* category table (d%): 1-20 coins, 21-35 mundane gear, 36-55 potion, 56-70 magic weapon, 71-82 magic armor, 88 ring, 98 wondrous, 99-100 Robert's own */
function rollTreasure(level){
  level=level||1; const roll=dPct(); const out={roll, rolls:[roll]};
  if(roll<=20){ const gp=dice((level+1)+'d6')*10; Object.assign(out,{cat:'Coins', name:gp+' gp', gold:gp}); }
  else if(roll<=35){ const w=Math.random()<0.5; const it=w?WEAPONS[rnd(WEAPONS.length)-1]:ARMORS[rnd(ARMORS.length)-1];
    Object.assign(out,{cat:'Equipment', name:'Masterwork '+it, kind:w?'weapon':(/Shield/.test(it)?'shield':'armor'), bonus:0, mw:true, value:w?315:160}); }
  else if(roll<=55){ const r2=dPct(); out.rolls.push(r2); const p=pick(POTIONS,r2); Object.assign(out,{cat:'Potion', name:p[1], kind:'potion', value:p[2], fx:p[3]}); }
  else if(roll<=70){ const b=enh(level); const r2=dPct(); out.rolls.push(r2); let nm=WEAPONS[rnd(WEAPONS.length)-1];
    let sp=''; if(r2>85){ sp=WEAPON_SPECIAL[rnd(WEAPON_SPECIAL.length)-1]; }
    Object.assign(out,{cat:'Magic Weapon', name:'+'+b+' '+(sp?sp+' ':'')+nm, kind:'weapon', bonus:b, special:sp, value:2000*b*b+(sp?6000:0)}); }
  else if(roll<=82){ const b=enh(level); const r2=dPct(); out.rolls.push(r2); let nm=ARMORS[rnd(ARMORS.length)-1];
    let sp=''; if(r2>85){ sp=ARMOR_SPECIAL[rnd(ARMOR_SPECIAL.length)-1]; }
    Object.assign(out,{cat:'Magic Armor', name:'+'+b+' '+(sp?sp+' ':'')+nm, kind:/Shield/.test(nm)?'shield':'armor', bonus:b, special:sp, value:1000*b*b+(sp?3750:0)}); }
  else if(roll<=88){ const r2=dPct(); out.rolls.push(r2); const p=pick(RINGS,r2); Object.assign(out,{cat:'Ring', name:p[1], kind:'ring', value:p[2], fx:p[3]}); }
  else if(roll<=98){ const r2=dPct(); out.rolls.push(r2); const p=pick(WONDROUS,r2); Object.assign(out,{cat:'Wondrous Item', name:p[1], kind:'wondrous', value:p[2], fx:p[3]}); }
  else { const it=ROBERT[rnd(ROBERT.length)-1]; Object.assign(out,{cat:"Robert's World", name:it[0], kind:it[1], value:500}); }
  return out;
}
window.SRD={dice, d20, dPct, rnd, MONSTERS, TEMPLATES, makeMonster, rollTreasure, ROBERT, mix};
})();
