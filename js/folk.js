/* Townsfolk. A hamlet has at least ten, a city at most fifty.
   Offscreen people are numbers. Only a handful near the player get a body.
   Each career feeds or draws on the town stockpile. No real names. */
(function(root){
'use strict';
const CAREERS=['farmer','smith','miner','woodcutter','merchant','guard','crafter','herbalist'];
const SYL=['bramble','moss','fern','quill','pebble','wick','hart','brook','thistle','cobble','yarrow','lumen'];
const JOB={
  farmer:{out:'sun_grain', n:1},
  smith:{in:'bog_iron_ore', out:'bog_iron_bloom', n:1},
  miner:{out:'bog_iron_ore', n:1},
  woodcutter:{out:'oak_log', n:1},
  merchant:{in:'oak_beam', coin:1},
  guard:{},
  crafter:{in:'oak_log', out:'oak_beam', n:1},
  herbalist:{in:'mint', out:'traveler_tisane', n:1}
};
const MESH_CAP=6;
function countFor(pop){
  const n=Math.round(10+(Math.max(0, pop|0)/4));
  return Math.max(10, Math.min(50, n));
}
function nameAt(town, i){
  let h=2166136261;
  const s=String(town||'town')+'|'+i;
  for(let k=0;k<s.length;k++){ h^=s.charCodeAt(k); h=Math.imul(h,16777619); }
  const a=SYL[(h>>>0)%SYL.length], b=SYL[(h>>>8)%SYL.length];
  const word=a===b?a:a+b;
  return word.charAt(0).toUpperCase()+word.slice(1);
}
function roster(town, pop){
  const n=countFor(pop);
  const people=[];
  for(let i=0;i<n;i++){
    const career=CAREERS[i%CAREERS.length];
    people.push({id:String(town)+'-'+i, town:String(town), career, name:nameAt(town, i), lod:'abstract'});
  }
  return people;
}
function tick(people, town, hour, near){
  const items=town.items||(town.items={});
  let shown=0, moved=0;
  (people||[]).forEach(p=>{
    const mesh=!!near&&shown<MESH_CAP;
    p.lod=mesh?'mesh':'abstract';
    if(mesh) shown++;
    if((hour|0)%6!==0) return;
    const job=JOB[p.career]||{};
    if(job.in&&(items[job.in]|0)<1) return;
    if(job.in){ items[job.in]-=1; if(items[job.in]<=0) delete items[job.in]; }
    if(job.out) items[job.out]=(items[job.out]|0)+(job.n||1);
    if(job.coin) town.coin=(town.coin|0)+job.coin;
    moved++;
  });
  return {shown, abstract:(people||[]).length-shown, moved, cap:MESH_CAP};
}
root.FOLK={CAREERS, JOB, MESH_CAP, countFor, roster, tick, nameAt};
if(typeof module!=='undefined'&&module.exports) module.exports=root.FOLK;
})(typeof window!=='undefined'?window:globalThis);
