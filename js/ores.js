/* Ore names for the metal paths. The guild quarry used to say only "Ore".
   Each node is a real yield: bog iron, copper, tin, zinc, manganese, nickel, clay.
   An old generic ore count becomes Bog Iron Ore. No meshes here. */
(function(root){
'use strict';
const KINDS={
  bog_iron_ore:{name:'Bog Iron Ore', tier:0, gp:0.1, wt:1, stack:20, col:'#6b4428', biomes:['swamp','grass','forest','guild'], path:'iron',
    tip:'Bog Iron Ore. Early iron from wet ground. The iron path starts here.',
    aliases:['bog iron','bog iron ore','bog-iron','iron']},
  iron_ore:{name:'Iron Ore', tier:0, gp:0.1, wt:1, stack:20, col:'#a0522d', biomes:['mountain','taiga','tundra','swamp'], path:'iron',
    tip:'Iron Ore. Bloomery iron, past the bog-iron start.',
    aliases:['iron ore']},
  copper_ore:{name:'Copper Ore', tier:1, gp:0.5, wt:1, stack:20, col:'#d9803a', biomes:['grass','forest','mountain','desert','guild'], path:'copper',
    tip:'Copper Ore. The copper hearth and, with tin, bronze.',
    aliases:['copper','copper ore']},
  tin_ore:{name:'Tin Ore', tier:1, gp:0.4, wt:1, stack:20, col:'#c5ccd4', biomes:['grass','mountain','forest','guild'], path:'bronze',
    tip:'Tin Ore. Sorted for bronze, with copper.',
    aliases:['tin','tin ore']},
  zinc_ore:{name:'Zinc Ore', tier:2, gp:3, wt:1, stack:20, col:'#a8b0a0', biomes:['mountain','desert','jungle'], path:'brass',
    tip:'Zinc Ore. With copper, this is the brass path.',
    aliases:['zinc','zinc ore']},
  manganese_ore:{name:'Manganese Ore', tier:2, gp:4, wt:1, stack:20, col:'#6a4a6a', biomes:['mountain','taiga'], path:'steel',
    tip:'Manganese Ore. A later steel, not the first iron.',
    aliases:['manganese','manganese ore']},
  nickel_ore:{name:'Nickel Ore', tier:2, gp:4, wt:1, stack:20, col:'#b7c4b0', biomes:['mountain','desert'], path:'steel',
    tip:'Nickel Ore. A later steel, not the first iron.',
    aliases:['nickel','nickel ore']},
  clay:{name:'Clay', tier:0, gp:0.05, wt:1, stack:30, col:'#b08968', biomes:['swamp','grass','guild','beach'], path:'clay',
    tip:'Clay. Dug for pots, tile, and pipe. Not a metal.',
    aliases:['clay']},
  silver_ore:{name:'Silver Ore', tier:2, gp:5, wt:1, stack:20, col:'#e6eef5', biomes:['mountain','taiga'], path:'silver',
    tip:'Silver Ore. A mountain vein.',
    aliases:['silver','silver ore']},
  mithral_ore:{name:'Mithral Ore', tier:3, gp:25, wt:0.5, stack:20, col:'#8fd3ff', biomes:['mountain'], path:'mithral',
    tip:'Mithral Ore. High mountain, after the common metals.',
    aliases:['mithral','mithral ore','mithril']},
  adamantine_ore:{name:'Adamantine Ore', tier:4, gp:60, wt:1, stack:10, col:'#5b2a86', biomes:['mountain'], path:'adamantine',
    tip:'Adamantine Ore. The rare end of the mountain veins.',
    aliases:['adamantine','adamantine ore','adamant']}
};
/* Sixteen quarry rocks west of the guild. Early metals first, two later steels. */
const STARTER=['bog_iron_ore','copper_ore','tin_ore','clay','bog_iron_ore','zinc_ore','bog_iron_ore','copper_ore','tin_ore','clay','manganese_ore','bog_iron_ore','nickel_ore','copper_ore','tin_ore','bog_iron_ore'];
const EXTRA=[
  {id:'oak_log', name:'Oak Log', aliases:['oak','oak wood','oak log'], biomes:['forest','grass']},
  {id:'pine_log', name:'Pine Log', aliases:['pine','pine wood','pine log'], biomes:['taiga','mountain']},
  {id:'ash_log', name:'Ash Log', aliases:['ash','ash wood'], biomes:['forest','grass']},
  {id:'yew_bough', name:'Yew Bough', aliases:['yew','yew wood'], biomes:['forest','taiga']},
  {id:'mint', name:'Mint', aliases:['mint'], biomes:['grass','guild']},
  {id:'lavender', name:'Lavender', aliases:['lavender'], biomes:['grass','guild']},
  {id:'chamomile', name:'Chamomile', aliases:['chamomile'], biomes:['grass','guild']},
  {id:'willow_bark', name:'Willow Bark', aliases:['willow','willow bark'], biomes:['forest','swamp']}
];
const DIRS=['north','north-east','east','south-east','south','south-west','west','north-west'];
function kind(id){ return KINDS[id]||null; }
function starter(i){ return STARTER[((i%STARTER.length)+STARTER.length)%STARTER.length]; }
function nameOf(id){ const k=KINDS[id]; return k?k.name:null; }
function worldLabel(id){ return nameOf(id)||'Ore'; }
function prompt(id){ const n=nameOf(id); return n?'⛏ Mine '+n:'⛏ Mine ore'; }
function tip(id){ const k=KINDS[id]; return k?k.tip:('Ore. Yields '+(nameOf(id)||'ore')+'.'); }
function gatherLine(id, n, place){ const name=nameOf(id)||'Ore'; const qty=(n==null?1:n); return 'Mori: +'+qty+' '+name+(place?' from the '+place:'')+'.'; }
function reagents(){
  return Object.keys(KINDS).map(id=>{ const k=KINDS[id]; return {id, name:k.name, fam:'ore', tier:k.tier, gp:k.gp, wt:k.wt, stack:k.stack, col:k.col}; });
}
function itemCount(it){
  if(it.qty!=null) return Math.max(0, it.qty|0);
  if(it.count!=null) return Math.max(0, it.count|0);
  if(it.n!=null) return Math.max(0, it.n|0);
  return 1;
}
function isGeneric(it){
  if(!it||typeof it!=='object') return false;
  const name=String(it.name||'').trim();
  if(/^ore$/i.test(name)) return true;
  if(String(it.id||'')==='ore') return true;
  if(it.kind==='ore'&&!it.rid&&!it.reagent) return true;
  return false;
}
function migrate(S){
  if(!S||S.vOre) return S;
  S.vOre=1;
  if(!S.reag) S.reag={};
  let add=0;
  if((S.ore|0)>0){ add+=S.ore|0; S.ore=0; }
  if((S.reag.ore|0)>0){ add+=S.reag.ore|0; delete S.reag.ore; }
  const keep=[];
  (S.inv||[]).forEach(it=>{ if(isGeneric(it)) add+=itemCount(it); else keep.push(it); });
  S.inv=keep;
  if(add>0) S.reag.bog_iron_ore=(S.reag.bog_iron_ore||0)+add;
  return S;
}
function rowsOf(extra){
  const rows=Object.keys(KINDS).map(id=>{ const k=KINDS[id]; return {id, name:k.name, aliases:k.aliases, biomes:k.biomes}; });
  EXTRA.forEach(r=>rows.push(r));
  (extra||[]).forEach(r=>{ if(r&&r.id&&!rows.some(x=>x.id===r.id)) rows.push(r); });
  return rows;
}
function mention(ask, extra){
  const t=String(ask||'').toLowerCase();
  const rows=rowsOf(extra);
  let hit=null, best=0;
  rows.forEach(r=>{
    const names=[String(r.name||'').toLowerCase()].concat(r.aliases||[]);
    names.forEach(n=>{
      if(!n) return;
      const re=new RegExp('\\b'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b');
      if(re.test(t)&&n.length>best){ best=n.length; hit=r; }
    });
  });
  return hit;
}
function dirTo(dx, dz){ const a=Math.atan2(dx, -dz); return DIRS[(Math.round(a/(Math.PI/4))+8)%8]; }
function whereLine(ask, opt){
  opt=opt||{};
  const hit=mention(ask, opt.catalog);
  if(!hit) return null;
  const nodes=(opt.nodes||[]).filter(n=>n&&n.rid===hit.id&&n.ready!==false);
  if(!nodes.length){
    const bios=(hit.biomes||[]).filter(b=>b!=='guild'&&b!=='_');
    return 'i don\'t see '+hit.name.toLowerCase()+' near you. it is known in '+(bios.slice(0,3).join(', ')||'wilder ground')+'.';
  }
  const x=opt.x||0, z=opt.z||0;
  nodes.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
  const n=nodes[0];
  const d=Math.round(Math.hypot(n.x-x, n.z-z));
  const region=n.region||opt.region||'this region';
  return hit.name.toLowerCase()+' is '+d+' m '+dirTo(n.x-x, n.z-z)+', in '+region+'.';
}
root.ORES={KINDS, STARTER, kind, starter, nameOf, worldLabel, prompt, tip, gatherLine, reagents, migrate, mention, whereLine, dirTo, isGeneric};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ORES;
})(typeof window!=='undefined'?window:globalThis);
