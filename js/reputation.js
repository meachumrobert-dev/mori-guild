/* Three layers of regard: a person, a guild, a city.
   Cities also keep a relation table: allied, neutral, rival, or war.
   The table is seeded from the planet's ally, rival, vassal, and neutral ties.
   A quest can move regard only so far in one day. */
(function(root){
'use strict';
const DAY_CAP=8;
const REL={ally:'allied', allied:'allied', vassal:'allied', neutral:'neutral', rival:'rival', war:'war'};
function fresh(){ return {personal:{}, guild:{}, city:{}, rel:{}, spent:{}}; }
function ensure(save){
  if(!save.village) save.village={v:1, day:0, towns:{}, contracts:[], rep:null};
  if(!save.village.rep) save.village.rep=fresh();
  const r=save.village.rep;
  if(!r.personal) r.personal={}; if(!r.guild) r.guild={}; if(!r.city) r.city={}; if(!r.rel) r.rel={}; if(!r.spent) r.spent={};
  return r;
}
function key(a,b){ a=String(a); b=String(b); return a<b?a+'|'+b:b+'|'+a; }
function seed(rep, pairs){
  (pairs||[]).forEach(p=>{
    const t=REL[p.type]||'neutral';
    rep.rel[key(p.a,p.b)]=t;
  });
  return rep;
}
function relation(rep, a, b){ return (rep.rel&&rep.rel[key(a,b)])||'neutral'; }
function shift(rep, layer, id, delta, day){
  const bag=rep[layer];
  if(!bag) return {ok:false, why:'unknown layer', applied:0};
  const spendKey=layer+'|'+id+'|'+day;
  const used=rep.spent[spendKey]||0;
  const sign=delta<0?-1:1;
  const room=DAY_CAP-Math.abs(used);
  const applied=sign*Math.min(Math.abs(delta|0), Math.max(0, room));
  if(!applied) return {ok:true, applied:0, value:bag[id]|0, capped:true};
  bag[id]=(bag[id]|0)+applied;
  rep.spent[spendKey]=used+applied;
  return {ok:true, applied, value:bag[id], capped:Math.abs(applied)<Math.abs(delta|0)};
}
function priceMul(rep, cityId){
  const n=(rep.city&&rep.city[cityId])||0;
  const m=1-n/200;
  return Math.max(0.85, Math.min(1.2, Math.round(m*100)/100));
}
function questOpen(rep, need){
  need=need||{};
  if(need.personal&&((rep.personal&&rep.personal[need.personal.id])||0)<need.personal.min) return false;
  if(need.city&&((rep.city&&rep.city[need.city.id])||0)<need.city.min) return false;
  if(need.guild&&((rep.guild&&rep.guild[need.guild.id])||0)<need.guild.min) return false;
  if(need.rel&&relation(rep, need.rel.a, need.rel.b)===need.rel.not) return false;
  return true;
}
function migrate(save){ ensure(save); return save; }
root.REPUTATION={DAY_CAP, REL, fresh, ensure, seed, relation, shift, priceMul, questOpen, migrate};
if(typeof module!=='undefined'&&module.exports) module.exports=root.REPUTATION;
})(typeof window!=='undefined'?window:globalThis);
