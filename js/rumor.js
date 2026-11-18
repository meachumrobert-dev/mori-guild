/* People know what they saw. A rumor walks the road, wears out, and bends.
   Small news dies. A legend keeps going. Mori already knows. */
(function(root){
'use strict';
function witness(npc, ev){
  npc.seen=npc.seen||[];
  npc.seen.push({id:ev.id, text:ev.text, weight:ev.weight||1, day:ev.day||0});
  return npc;
}
function knows(npc, id){
  return !!(npc.seen||[]).some(e=>e.id===id);
}
function carry(rumor, miles, days){
  const weight=rumor.weight||1;
  const legend=weight>=5;
  if(!legend&&days>4&&weight<3) return {faded:true, text:'', miles, days, legend:false};
  const bends=Math.min(3, Math.floor((miles|0)/10));
  let text=rumor.text;
  if(bends) text+=' — and the telling has changed '+bends+' times';
  return {faded:false, text, miles, days, legend, bends};
}
function mori(){ return {omniscient:true}; }
root.RUMOR={witness, knows, carry, mori, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RUMOR;
})(typeof window!=='undefined'?window:globalThis);
