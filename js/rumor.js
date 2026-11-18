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
function along(rumor, stops){
  let cur={id:rumor.id, text:rumor.text, weight:rumor.weight||1};
  const heard=[];
  (stops||[]).forEach(stop=>{
    const step=carry(cur, stop.miles|0, stop.days|0);
    cur.text=step.text; cur.faded=step.faded; cur.bends=step.bends;
    if(step.faded) return;
    if(stop.who) witness(stop.who, {id:rumor.id, text:step.text, weight:rumor.weight||1, day:stop.days|0});
    heard.push({miles:stop.miles|0, text:step.text});
  });
  return {faded:!!cur.faded, text:cur.faded?'':cur.text, heard, bends:cur.bends||0};
}
root.RUMOR={witness, knows, carry, along, mori, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RUMOR;
})(typeof window!=='undefined'?window:globalThis);
