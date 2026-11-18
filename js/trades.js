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
root.TRADES={JOBS, PORTS, TIERS, PLACE, tierFor, jobsFor, site, staff, produce, service, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TRADES;
})(typeof window!=='undefined'?window:globalThis);
