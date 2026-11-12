/* A stub of the feudal ladder. Knight, baron, count, duke, king.
   A town can owe coin, goods, and labor days. Too heavy a tithe
   trims population and happiness. The seasonal realm sim is a later hook. */
(function(root){
'use strict';
const LADDER=['knight','baron','count','duke','king'];
const COIN_CAP=0.2, LABOR_CAP=3, POP_FLOOR=8;
function rank(town){ const r=town&&town.rank; return LADDER.indexOf(r)>=0?r:'knight'; }
function due(town){
  const pop=Math.max(POP_FLOOR, town.pop|0);
  const tax=town.tax||{coin:0.08, goods:0.04, labor:1};
  return {
    coin:Math.round(pop*40*(tax.coin||0)),
    goods:{oak_beam:Math.max(0, Math.round(pop*(tax.goods||0)/10))},
    labor:tax.labor|0
  };
}
function heavy(town){
  const tax=town.tax||{};
  return (tax.coin||0)>COIN_CAP || (tax.labor|0)>LABOR_CAP;
}
function apply(town){
  const bill=due(town);
  const coin=Math.min(town.coin||0, bill.coin);
  town.coin=Math.round(((town.coin||0)-coin)*100)/100;
  const goods={};
  for(const k in bill.goods){
    const take=Math.min(bill.goods[k], (town.items&&town.items[k])||0);
    if(town.items) town.items[k]-=take;
    goods[k]=take;
  }
  let mood=0, people=0;
  if(heavy(town)){
    mood=4; people=1;
    town.happiness=Math.max(0,(town.happiness|0)-mood);
    town.pop=Math.max(POP_FLOOR,(town.pop|0)-people);
  }
  return {ok:true, paid:{coin, goods, labor:bill.labor}, heavy:heavy(town), mood, people};
}
function seasonHook(town){
  return {later:true, name:'season', town:town&&town.id||'guild', note:'The seasonal realm sim is not in this pass. Call this hook when it is.'};
}
root.TITHE={LADDER, COIN_CAP, LABOR_CAP, POP_FLOOR, rank, due, heavy, apply, seasonHook};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TITHE;
})(typeof window!=='undefined'?window:globalThis);
