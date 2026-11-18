/* The world does not end at a crown. Mori keeps shaping the day.
   A crew mate who falls stays fallen. Rank is a goal, not a stop. */
(function(root){
'use strict';
const RANKS=['cottar','knight','baron','count','duke','king'];
function rank(deeds){
  const i=Math.max(0, Math.min(RANKS.length-1, deeds|0));
  return {name:RANKS[i], index:i, last:false};
}
function day(world){
  world.day=(world.day|0)+1;
  return {day:world.day, ended:false, mori:'still shaping'};
}
function fall(mate, hp){
  if((hp|0)>0) return {name:mate.name, dead:false};
  return {name:mate.name, dead:true, permadeath:true};
}
root.LIVING={RANKS, rank, day, fall, star:['no-ending','built']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LIVING;
})(typeof window!=='undefined'?window:globalThis);
