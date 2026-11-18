/* Beasts at the palisade. Wolves and dire rats only. No people.
   The watch answers. Stock loss stays under a cap. Helping raises regard. */
(function(root){
'use strict';
const CAP=3;
const KINDS={wolf:{name:'wolf pack', n:3}, direrat:{name:'dire rats', n:4}};
function plan(rng){
  const roll=typeof rng==='function'?rng():0.2;
  const keys=Object.keys(KINDS);
  const kind=keys[Math.floor(roll*keys.length)%keys.length];
  const k=KINDS[kind];
  return {kind, name:k.name, n:k.n, human:false, edge:'north'};
}
function strike(town){
  const items=town.items||(town.items={});
  let lost=0;
  Object.keys(items).forEach(id=>{
    if(lost>=CAP) return;
    const have=items[id]|0;
    if(have<1) return;
    items[id]=have-1;
    if(items[id]<=0) delete items[id];
    lost++;
  });
  return {lost, cap:CAP};
}
function resolve(opt){
  opt=opt||{};
  const town=opt.town||{items:{}};
  const hit=strike(town);
  const aided=!!opt.player;
  return {
    lost:hit.lost, cap:CAP, aided, rep:aided?2:0, human:false,
    quest:aided?null:'hold the north gate with the watch',
    line:aided?'You stand with the guards. The pack thinks better of it.':'The watch holds the choke. A few sacks get scuffed.'
  };
}
function elderLine(){
  return 'if a wolf pack or dire rats test the north gate, stand with the watch. the town remembers.';
}
root.RAIDS={CAP, KINDS, plan, strike, resolve, elderLine};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RAIDS;
})(typeof window!=='undefined'?window:globalThis);
