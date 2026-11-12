/* Waystones at each end of a road, until you can walk the whole world.
   The destination is a land neighbor, chosen from the seed, and it does not change.
   Travel is a short fade. The save stays put. */
(function(root){
'use strict';
const FADE_MS=700;
function hash(seed, regionId, i){
  const s=String(seed)+'|'+regionId+'|'+i;
  let h=2166136261;
  for(let k=0;k<s.length;k++){ h^=s.charCodeAt(k); h=Math.imul(h,16777619); }
  return h>>>0;
}
function lands(neighbors){
  return (neighbors||[]).filter(n=>n&&n.land!==false&&n.id!=null).slice().sort((a,b)=>a.id-b.id);
}
function destFor(regionId, roadIndex, neighbors, seed){
  const list=lands(neighbors);
  if(!list.length) return null;
  const off=hash(seed, regionId, 0)%list.length;
  return list[(off+(roadIndex|0))%list.length];
}
function ends(regionId, roadCount, neighbors, seed){
  const out=[];
  for(let i=0;i<roadCount;i++){
    const dest=destFor(regionId, i, neighbors, seed);
    if(!dest) continue;
    out.push({road:i, end:'start', dest:dest.id, name:dest.name||('region '+dest.id)});
    out.push({road:i, end:'end', dest:dest.id, name:dest.name||('region '+dest.id)});
  }
  return out;
}
root.PORTALS={FADE_MS, hash, destFor, ends};
if(typeof module!=='undefined'&&module.exports) module.exports=root.PORTALS;
})(typeof window!=='undefined'?window:globalThis);
