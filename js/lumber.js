/* Lumber species, regions, and the stages from a standing tree to finished wood.
   Softwoods (pine, fir, spruce) are the early framing and fuel woods.
   Hardwoods (oak, ash, maple) are for tools, handles, furniture, and ships.
   Yew is the bow wood. Ironwood is the later magical-tier wood.
   A log is split, then hewn, then sawn (that step needs the saw), then seasoned.
   Skill comes from use. The saw is a technology, not a free step.
   No meshes here. Gather and the world draw what this table names. */
(function(root){
'use strict';
const SPECIES={
  pine:{name:'Pine', group:'soft', shape:'soft', tier:0, uses:['framing','fuel'], log:'pine_log', color:'#2f6a38', biomes:['taiga','mountain','tundra','snow','steppe']},
  fir:{name:'Fir', group:'soft', shape:'soft', tier:0, uses:['framing','fuel'], log:'fir_log', color:'#3a7a48', biomes:['taiga','mountain','tundra']},
  spruce:{name:'Spruce', group:'soft', shape:'soft', tier:0, uses:['framing','fuel'], log:'spruce_log', color:'#245c40', biomes:['taiga','snow','tundra','mountain']},
  oak:{name:'Oak', group:'hard', shape:'hard', tier:1, uses:['tools','handles','furniture','ships'], log:'oak_log', color:'#3f6a28', biomes:['forest','grass','savanna','swamp','steppe']},
  ash:{name:'Ash', group:'hard', shape:'hard', tier:1, uses:['tools','handles','furniture'], log:'ash_log', color:'#5a7a32', biomes:['forest','grass','steppe']},
  maple:{name:'Maple', group:'hard', shape:'hard', tier:1, uses:['tools','handles','furniture'], log:'maple_log', color:'#6a5030', biomes:['forest','grass']},
  yew:{name:'Yew', group:'bow', shape:'yew', tier:2, uses:['bows'], log:'yew_bough', color:'#1c3428', biomes:['forest','taiga','swamp','grass']},
  ironwood:{name:'Ironwood', group:'magic', shape:'iron', tier:3, uses:['magic'], log:'ironwood_log', color:'#1a2820', biomes:['jungle','forest','swamp','mountain']}
};
const ORDER=['log','split','hewn','sawn','seasoned'];
const STAGE={
  log:{name:'Log', labor:0, seconds:0, skill:1, tech:null, days:0},
  split:{name:'Split timber', labor:1, seconds:20, skill:1, tech:null, days:0},
  hewn:{name:'Hewn beam', labor:2, seconds:45, skill:2, tech:null, days:0},
  sawn:{name:'Sawn plank', labor:4, seconds:90, skill:4, tech:'saw', days:0},
  seasoned:{name:'Seasoned timber', labor:6, seconds:180, skill:4, tech:'saw', days:12}
};
const RESPAWN=[45,60,90,150,240];
const REQ=[1,1,4,6,8];
const SHAPE={soft:'cone', hard:'broad', yew:'column', iron:'iron'};
function species(id){ return SPECIES[id]||null; }
function shapeOf(id){ const s=SPECIES[id]; return s?s.shape:'soft'; }
function req(tier){ return REQ[Math.max(0,Math.min(REQ.length-1, tier|0))]; }
function respawnSeconds(tier){ return RESPAWN[Math.max(0,Math.min(RESPAWN.length-1, tier|0))]; }
function pick(biome, rnd){
  const roll=typeof rnd==='function'?rnd:()=>0.5;
  const list=Object.keys(SPECIES).filter(id=>SPECIES[id].biomes.indexOf(biome)>=0);
  const pool=list.length?list:['pine','oak'];
  let tot=0; const w=pool.map(id=>{ const v=1/(1+SPECIES[id].tier*SPECIES[id].tier); tot+=v; return v; });
  let r=roll()*tot;
  for(let i=0;i<pool.length;i++){ r-=w[i]; if(r<=0) return pool[i]; }
  return pool[pool.length-1];
}
function key(seed, region, ix, iz, i){ return 'tree|'+seed+'|'+region+'|'+ix+','+iz+'|'+i; }
function fromSaved(ty){
  if(typeof ty==='string'&&SPECIES[ty]) return ty;
  if(ty===0||ty==='0') return 'pine';
  if(ty===1||ty==='1') return 'oak';
  return 'oak';
}
function parseItem(id){
  if(!id) return null;
  for(const sid in SPECIES){
    if(SPECIES[sid].log===id) return {species:sid, stage:'log'};
    for(let i=1;i<ORDER.length;i++){ if(id===sid+'_'+ORDER[i]) return {species:sid, stage:ORDER[i]}; }
  }
  return null;
}
function itemId(speciesId, stage){
  const s=SPECIES[speciesId]; if(!s) return null;
  if(stage==='log') return s.log;
  return speciesId+'_'+stage;
}
function work(inputId, ctx){
  ctx=ctx||{};
  const cur=parseItem(inputId);
  if(!cur) return {ok:false, why:'unknown wood'};
  const at=ORDER.indexOf(cur.stage);
  if(at<0||at>=ORDER.length-1) return {ok:false, why:'already finished'};
  const next=ORDER[at+1], spec=STAGE[next], s=SPECIES[cur.species];
  const skill=ctx.skill|0;
  if(skill<spec.skill) return {ok:false, why:'woodcutting '+spec.skill+' (you are '+skill+')', needSkill:spec.skill};
  const tech=ctx.tech||[];
  if(spec.tech&&tech.indexOf(spec.tech)<0) return {ok:false, why:'needs the '+spec.tech, needTech:spec.tech};
  return {ok:true, out:itemId(cur.species, next), name:s.name+' '+spec.name.toLowerCase(), stage:next, labor:spec.labor, seconds:spec.seconds, days:spec.days, skill:spec.skill, tech:spec.tech};
}
function reagents(){
  const out=[];
  Object.keys(SPECIES).forEach(sid=>{
    const s=SPECIES[sid];
    const known={oak_log:1, yew_bough:1, ironwood_log:1};
    if(!known[s.log]) out.push({id:s.log, name:s.name+' Log', fam:'wood', tier:s.tier, gp:s.tier===0?0.02:0.1, wt:s.group==='soft'?2:3, stack:20, col:s.color, note:s.uses.join(', ')});
    ORDER.slice(1).forEach((st,i)=>{
      const spec=STAGE[st];
      out.push({id:sid+'_'+st, name:s.name+' '+spec.name, fam:'wood', tier:s.tier, gp:(0.05+s.tier*0.4)*(i+2), wt:Math.max(0.4, 2.2-i*0.35), stack:20, col:s.color, note:spec.tech?('needs '+spec.tech):s.uses[0]});
    });
  });
  return out;
}
function woods(){
  const biomes=['forest','jungle','grass','swamp','savanna','steppe','taiga','mountain','tundra','snow','beach','desert'];
  const table={};
  biomes.forEach(b=>{
    const ids=['deadfall'];
    Object.keys(SPECIES).forEach(id=>{ if(SPECIES[id].biomes.indexOf(b)>=0) ids.push(SPECIES[id].log); });
    if(b==='forest'||b==='jungle'||b==='swamp') ids.push('darkwood_log');
    table[b]=ids.filter((x,i,a)=>a.indexOf(x)===i);
  });
  table._=['deadfall','oak_log','pine_log','ironwood_log'];
  return table;
}
function annotate(rows, biome, rnd, keyAt){
  return (rows||[]).map((row,i)=>{
    const sp=row[3]&&SPECIES[row[3]]?row[3]:pick(biome, rnd);
    const s=SPECIES[sp];
    const k=row[4]||(keyAt?keyAt(i):('tree|'+i));
    return {x:row[0], z:row[1], scale:row[2], species:sp, key:k, log:s.log, shape:s.shape, tier:s.tier, choppable:true, req:req(s.tier), respawn:respawnSeconds(s.tier)};
  });
}
root.LUMBER={SPECIES, STAGE, ORDER, SHAPE, species, shapeOf, pick, key, fromSaved, parseItem, itemId, work, reagents, woods, annotate, req, respawnSeconds};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LUMBER;
})(typeof window!=='undefined'?window:globalThis);
