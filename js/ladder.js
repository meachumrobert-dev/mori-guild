/* Stations open with skill. Nothing above your rung is lit. */
(function(root){
'use strict';
const RUNGS=[
  {id:'campfire', skill:0, name:'Campfire'},
  {id:'kiln', skill:5, name:'Kiln'},
  {id:'bloomery', skill:10, name:'Bloomery'},
  {id:'retort', skill:15, name:'Retort'},
  {id:'cast_iron', skill:25, name:'Cast iron'},
  {id:'foundry', skill:30, name:'Foundry'},
  {id:'distillery', skill:35, name:'Distillery'},
  {id:'enchant_pot', skill:40, name:'Enchanting pot'},
  {id:'arcane_forge', skill:55, name:'Arcane forge'},
  {id:'steel_forge', skill:60, name:'Steel forge'},
  {id:'crucible', skill:70, name:'Crucible'},
  {id:'alloys', skill:80, name:'Alloys'}
];
function open(skill){
  const s=skill|0;
  return RUNGS.filter(r=>r.skill<=s);
}
function locked(skill){
  const s=skill|0;
  return RUNGS.filter(r=>r.skill>s);
}
function next(skill){
  return locked(skill)[0]||null;
}
root.LADDER={RUNGS, open, locked, next, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LADDER;
})(typeof window!=='undefined'?window:globalThis);
