/* A person learns a method by walking, by a ruin, by taking a thing apart,
   or by trying it. They can teach it, sell it, or keep it. */
(function(root){
'use strict';
const WAYS={travel:8, ruin:12, reverse:14, experiment:10};
function tryLearn(person, way, roll){
  const dc=WAYS[way];
  if(dc==null) return {ok:false, why:'unknown way'};
  const skill=(person.skill&&person.skill[way])||0;
  const ok=(roll|0)+skill>=dc;
  if(ok){ person.known=person.known||[]; if(person.known.indexOf(way)<0) person.known.push(way); }
  return {ok, dc, way};
}
function hoard(person, id){ person.hoard=person.hoard||{}; person.hoard[id]=1; return person; }
function teach(from, to, id){
  if(from.hoard&&from.hoard[id]) return {ok:false, why:'hoarded'};
  if(!from.known||from.known.indexOf(id)<0) return {ok:false, why:'unknown'};
  to.known=to.known||[];
  if(to.known.indexOf(id)<0) to.known.push(id);
  return {ok:true};
}
function sell(from, to, id, coin){
  if(from.hoard&&from.hoard[id]) return {ok:false, why:'hoarded'};
  const price=4;
  if((coin|0)<price) return {ok:false, why:'short', price};
  const moved=teach(from, to, id);
  if(!moved.ok) return moved;
  return {ok:true, paid:price};
}
root.KNOW={WAYS, tryLearn, hoard, teach, sell, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.KNOW;
})(typeof window!=='undefined'?window:globalThis);
