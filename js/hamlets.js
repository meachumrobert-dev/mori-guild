/* Hamlets under a city. People age, die, and are replaced down to a floor.
   A share of the harvest walks to the city as tithe. */
(function(root){
'use strict';
const SPAN={human:80, dwarf:400, elf:1000, halfling:150, orc:70};
const FLOOR=8;
function record(race, age, year){
  const span=SPAN[race]||SPAN.human;
  return {race:race||'human', age:age|0, born:(year|0)-(age|0), alive:(age|0)<=span, span};
}
function fresh(name, race){
  const people=[];
  for(let i=0;i<FLOOR;i++) people.push({race:race||'human', age:16+i, alive:true, job:i%2?'farmer':'miller'});
  return {name:name||'hamlet', race:race||'human', year:0, people, tithe:0, lord:'minor'};
}
function year(hamlet){
  hamlet.people.forEach(p=>{
    if(!p.alive) return;
    p.age=(p.age|0)+1;
    const span=SPAN[p.race]||SPAN.human;
    if(p.age>span) p.alive=false;
  });
  let live=hamlet.people.filter(p=>p.alive);
  let born=0;
  while(live.length<FLOOR){
    const baby={race:hamlet.race||'human', age:0, alive:true, job:'farmer'};
    hamlet.people.push(baby);
    live.push(baby);
    born++;
  }
  const farmers=live.filter(p=>p.job==='farmer').length||1;
  const due=Math.max(1, Math.floor(farmers/2));
  hamlet.tithe=(hamlet.tithe|0)+due;
  hamlet.year=(hamlet.year|0)+1;
  return {alive:live.length, born, tithe:due, floor:FLOOR};
}
root.HAMLETS={SPAN, FLOOR, record, fresh, year, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.HAMLETS;
})(typeof window!=='undefined'?window:globalThis);
