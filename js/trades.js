/* Town work. Small places share people. A missing hat means that
   building is not there. A larger place gives each person one job.
   Five tiers decide which jobs a town can even ask for. */
(function(root){
'use strict';
const JOBS={
  farmer:{in:null, out:'grain', n:2, tier:0},
  hunter:{in:null, out:'hide', n:1, tier:0},
  fisher:{in:null, out:'fish', n:1, tier:0},
  washerwoman:{in:'soap', out:null, n:0, tier:0, gossip:true},
  miller:{in:'grain', out:'flour', n:1, tier:1, place:'stream'},
  baker:{in:'flour', out:'loaf', n:1, tier:1},
  brewer:{in:'grain', out:'ale', n:1, tier:1},
  butcher:{in:'hide', out:'bone', n:1, tier:1},
  carpenter:{in:'oak_log', out:'plank', n:1, tier:1},
  innkeeper:{in:'loaf', out:'tavern_meal', n:1, tier:1},
  tanner:{in:'hide', out:'leather', n:1, tier:2, place:'downwind'},
  potter:{in:'clay', out:'pot', n:1, tier:2},
  weaver:{in:'yarn', out:'cloth', n:1, tier:2},
  mason:{in:'stone', out:'frame', n:1, tier:2},
  priest:{in:null, out:null, n:0, tier:2},
  stablehand:{in:'grain', out:null, n:0, tier:2, place:'gate'},
  smith:{in:'bloom', out:'bar', n:1, tier:3},
  cooper:{in:'plank', out:'barrel', n:1, tier:3}
};
const PORTS=['docks','shipyard','ropewalk','sailmaker','cooper','fishmarket','warehouse','customs','harbormaster','lighthouse','chandlery'];
const TIERS=[
  {id:0, name:'camp', at:0},
  {id:1, name:'hamlet', at:4},
  {id:2, name:'town', at:12},
  {id:3, name:'port', at:24},
  {id:4, name:'city', at:40}
];
const PLACE={
  tannery:'downwind', stable:'gate', barracks:'gate', granary:'stilts', mill:'stream',
  washhouse:'square', bakery:'square', tavern:'square'
};
function tierFor(pop){
  let t=TIERS[0];
  TIERS.forEach(row=>{ if((pop|0)>=row.at) t=row; });
  return t;
}
function jobsFor(pop){
  const t=tierFor(pop).id;
  return Object.keys(JOBS).filter(id=>JOBS[id].tier<=t);
}
function site(kind, town){
  town=town||{x:0,z:0,wind:'east',stream:{x:14,z:6}};
  const rule=PLACE[kind]||'square';
  const wind=town.wind==='west'?-1:1;
  if(rule==='downwind') return {x:town.x+wind*26, z:town.z+4, rule};
  if(rule==='gate') return {x:town.x, z:town.z+18, rule};
  if(rule==='stilts') return {x:town.x-6, z:town.z+8, rule, stilts:true};
  if(rule==='stream') return {x:town.stream.x, z:town.stream.z, rule};
  return {x:town.x, z:town.z, rule};
}
function staff(people, pop){
  const n=people&&people.length?people.length:(pop|0);
  const list=people&&people.length?people:Array.from({length:n},(_,i)=>({id:'p'+i}));
  const wanted=jobsFor(list.length);
  const assignment=root.DUTIES?root.DUTIES.assign(list, wanted):{posts:[], missing:wanted.slice(), covered:{}, specialized:list.length>=12};
  const open={};
  wanted.forEach(id=>{ open[id]=!!(assignment.covered&&assignment.covered[id]); });
  return {tier:tierFor(list.length), wanted, assignment, open, missing:assignment.missing||[]};
}
function produce(assignment, town){
  const items=town.items||(town.items={});
  const made={};
  Object.keys(JOBS).forEach(id=>{
    const rate=(assignment.covered&&assignment.covered[id])||0;
    if(rate<=0) return;
    const job=JOBS[id];
    if(job.in&&(items[job.in]|0)<1) return;
    const qty=Math.round((job.n||0)*rate*100)/100;
    if(job.in){ items[job.in]-=1; if(items[job.in]<=0) delete items[job.in]; }
    if(job.out&&qty){ items[job.out]=(items[job.out]|0)+qty; made[job.out]=(made[job.out]||0)+qty; }
    if(job.gossip) town.gossip=(town.gossip|0)+1;
  });
  return made;
}
function service(staffed, job){
  return !!(staffed.open&&staffed.open[job]);
}
const BUILDINGS=[
  {id:'washhouse', place:'square', job:'washerwoman', tier:0},
  {id:'granary', place:'stilts', job:'farmer', tier:1},
  {id:'mill', place:'stream', job:'miller', tier:1},
  {id:'bakery', place:'square', job:'baker', tier:1},
  {id:'tavern', place:'square', job:'innkeeper', tier:1},
  {id:'tannery', place:'downwind', job:'tanner', tier:2},
  {id:'stables', place:'gate', job:'stablehand', tier:2},
  {id:'barracks', place:'gate', job:'guard', tier:2}
];
function layout(town, pop){
  const tier=tierFor(pop).id;
  return BUILDINGS.filter(b=>b.tier<=tier).map(b=>{
    const at=site(b.id==='stables'?'stable':b.id, town);
    return {id:b.id, job:b.job, place:b.place, tier:b.tier, x:at.x, z:at.z, stilts:!!at.stilts};
  });
}
function ports(pop){
  if(tierFor(pop).id<3) return [];
  return PORTS.map((id,i)=>({id, x:8+((i%4)*6), z:42+Math.floor(i/4)*5, tier:3}));
}
function chain(start){
  const goods=root.GOODS&&root.GOODS.ITEMS;
  const seen={}, out=[];
  function walk(id){
    if(!goods||!goods[id]||seen[id]) return;
    seen[id]=1; out.push(id);
    (goods[id].uses||[]).forEach(walk);
  }
  walk(start);
  return out;
}
root.TRADES={JOBS, PORTS, TIERS, PLACE, BUILDINGS, tierFor, jobsFor, site, staff, produce, service, layout, ports, chain, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TRADES;
})(typeof window!=='undefined'?window:globalThis);
