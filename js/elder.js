/* The village elder. A local guide, not a copy of a real person.
   She reads the stockpile, asks for what is short, and says what to do next.
   Towns with no guild hall also get an adventurer contract from her. */
(function(root){
'use strict';
const SYL=['bramble','moss','fern','quill','pebble','wick','hart','lumen','brook','thistle','cobble','yarrow'];
function nameFor(townId){
  const s=String(townId||'guild');
  let h=2166136261;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  const a=SYL[(h>>>0)%SYL.length], b=SYL[((h>>>8))%SYL.length];
  const word=a===b?a:a+b;
  return 'Elder '+word.charAt(0).toUpperCase()+word.slice(1);
}
function gaps(town){
  const d=town&&town.demand||{};
  const items=town&&town.items||{};
  const out=[];
  Object.keys(d).forEach(id=>{ const need=d[id]|0, have=items[id]|0; if(have<need) out.push({id, have, need, short:need-have}); });
  out.sort((a,b)=>b.short-a.short);
  return out;
}
function label(id){
  return ({oak_beam:'oak beams', bog_iron_bloom:'bog iron blooms', trail_leather:'trail leather', traveler_tisane:'traveler tisanes'})[id]||id.replace(/_/g,' ');
}
function offer(town){
  const g=gaps(town)[0];
  if(!g) return {id:'steady', text:'the stores look steady. ask me what next if you are idle.', item:null, qty:0};
  return {id:'bring_'+g.id, text:'bring '+g.need+' '+label(g.id)+'. we have '+g.have+'.', item:g.id, qty:g.need, have:g.have};
}
function adventurer(hasHall){
  if(hasHall) return null;
  return {id:'clear_verge', specialty:'adventurer', kind:'clear', text:'no guild hall here. the verge needs a sweep. clear the threats on the road, then the board can keep the job.', qty:1, item:'road_threat'};
}
function nextSteps(town, opt){
  opt=opt||{};
  const steps=[];
  const g=gaps(town)[0];
  if(g) steps.push('fill the stockpile: '+g.short+' more '+label(g.id)+'.');
  steps.push(opt.hasHall?'the guild hall can post the job after you deliver it once.':'there is no guild hall, so i am posting the road contract myself.');
  if((town.happiness|0)<50) steps.push('the tithe is heavy. happiness is '+town.happiness+'. ease the tax before you ask for more labor.');
  if((town.slow|0)>0) steps.push('a late caravan slowed research by '+town.slow+' day'+(town.slow===1?'':'s')+'.');
  steps.push('workshops can bloom bog iron, scrape a hide, or steep a tisane. black powder and greek fire are the ceiling, not a bench job.');
  return steps;
}
function say(town, opt){
  const who=nameFor(town&&town.id);
  const o=offer(town);
  const extra=adventurer(opt&&opt.hasHall);
  let line=who.toLowerCase()+' here. '+o.text;
  if(extra) line+=' '+extra.text;
  line+=' what next: '+nextSteps(town, opt)[0];
  return line;
}
root.ELDER={nameFor, gaps, offer, adventurer, nextSteps, say, label};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ELDER;
})(typeof window!=='undefined'?window:globalThis);
