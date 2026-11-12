/* Contract life. A player delivers it once. Then it sits on the guild board.
   After N board completions a caravan runs it on a daily or weekly mark.
   Caravans travel in groups. A missed load slows the town's research.
   Guilds share one progress tree. Each board only shows its specialty.
   Adventurer jobs can scuff a crate. The chance is capped, and nobody is hurt. */
(function(root){
'use strict';
const NEED=3;
const COLLATERAL_CAP=0.08;
const TREE=[
  {id:'charter', name:'Village charter'},
  {id:'workshop', name:'Workshop row'},
  {id:'caravan', name:'Caravan road'},
  {id:'ceiling', name:'Black powder and Greek fire, the ceiling'}
];
const FOCUS={
  merchant:['deliver'],
  mercenary:['guard'],
  adventurer:['clear']
};
function blank(o){
  o=o||{};
  return {
    id:o.id||('c_'+Math.floor(Math.random()*1e9)),
    town:String(o.town||'guild'),
    specialty:o.specialty||'merchant',
    kind:o.kind||'deliver',
    item:o.item||'oak_beam',
    qty:o.qty||40,
    stage:'player',
    done:0,
    schedule:o.schedule||'daily',
    group:0,
    lastDay:-1
  };
}
function handIn(c){
  if(!c) return {ok:false, why:'no contract'};
  if(c.stage==='player'){ c.stage='board'; c.done=1; return {ok:true, stage:'board', done:1}; }
  if(c.stage==='board'){ c.done=(c.done||0)+1; if(c.done>=NEED){ c.stage='caravan'; c.group=Math.max(2, c.group||3); return {ok:true, stage:'caravan', done:c.done, group:c.group}; } return {ok:true, stage:'board', done:c.done}; }
  return {ok:false, why:'the caravan already keeps this job'};
}
function due(c, day){
  if(!c||c.stage!=='caravan') return false;
  if(c.lastDay===day) return false;
  if(c.schedule==='weekly') return day%7===0;
  return true;
}
function runCaravan(town, c, day){
  if(!due(c, day)) return {ok:false, why:'not due'};
  if((c.group|0)<2) return {ok:false, why:'caravans travel in groups'};
  const have=(town.items&&town.items[c.item])||0;
  if(have<c.qty){ town.slow=(town.slow||0)+1; c.lastDay=day; return {ok:false, slow:town.slow, why:'the goods were not there'}; }
  town.items[c.item]=have-c.qty;
  c.lastDay=day;
  return {ok:true, group:c.group};
}
function collateral(rng){
  const roll=typeof rng==='function'?rng():Math.random();
  if(roll>=COLLATERAL_CAP) return null;
  return {chance:COLLATERAL_CAP, roll, note:'a crate split on the road. nobody was hurt. the town is a little less cheerful.'};
}
function board(contracts, specialty){
  const kinds=FOCUS[specialty]||FOCUS.merchant;
  return (contracts||[]).filter(c=>c.stage!=='player'&&kinds.indexOf(c.kind)>=0);
}
function seedBoard(townId, specialty){
  const kind=(FOCUS[specialty]||FOCUS.merchant)[0];
  const item=kind==='guard'?'road_watch':kind==='clear'?'road_threat':'oak_beam';
  const qty=kind==='deliver'?40:1;
  return blank({id:'board_'+townId+'_'+kind, town:townId, specialty, kind, item, qty, schedule:kind==='deliver'?'weekly':'daily'});
}
root.CONTRACTS={NEED, COLLATERAL_CAP, TREE, FOCUS, blank, handIn, due, runCaravan, collateral, board, seedBoard};
if(typeof module!=='undefined'&&module.exports) module.exports=root.CONTRACTS;
})(typeof window!=='undefined'?window:globalThis);
