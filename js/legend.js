/* Big-beast parts are reagents and armor stuff, and they are worth a lot in town.
   An adult kill becomes a short local legend. Dragon and myth scales are priced
   and written as armor, and they do not spawn. */
(function(root){
'use strict';
const PARTS={
  troll_blood:{value:40, kind:'blood', spawn:true},
  royal_honey:{value:55, kind:'honey', spawn:true},
  lizard_marrow:{value:48, kind:'marrow', spawn:true},
  giant_hide:{value:36, kind:'hide', spawn:true},
  bone:{value:18, kind:'bone', spawn:true},
  dragon_scale:{value:200, kind:'scale', spawn:false},
  myth_scale:{value:240, kind:'scale', spawn:false}
};
const RUMOR_DAYS=3;
function prices(){ const o={}; for(const id in PARTS) o[id]=PARTS[id].value; return o; }
function migrate(save){
  if(!save) return save;
  if(!save.legend) save.legend={rumors:[]};
  if(!save.legend.rumors) save.legend.rumors=[];
  return save;
}
function onKill(save, beast, townId, day){
  migrate(save);
  if(!beast) return {ok:false, why:'no beast'};
  if(beast.spawn===false) return {ok:false, why:'not in the world yet', spawn:false};
  if(!save.reag) save.reag={};
  const got={};
  const parts=beast.parts||{};
  for(const id in parts){
    if(PARTS[id]&&PARTS[id].spawn===false) continue;
    const q=parts[id]|0; if(q<1) continue;
    save.reag[id]=(save.reag[id]||0)+q; got[id]=q;
  }
  let rumor=null, rep=0;
  if(beast.size==='adult'){
    rumor={name:beast.name||'a great beast', text:'A local legend: someone felled '+(beast.name||'a great beast')+' nearby.', until:(day|0)+RUMOR_DAYS, town:String(townId||'guild')};
    save.legend.rumors.push(rumor);
    if(root.REPUTATION){
      const bag=root.REPUTATION.ensure(save);
      const moved=root.REPUTATION.shift(bag, 'city', String(townId||'guild'), 2, day|0);
      rep=moved.applied||0;
    }
    if(root.STOCKPILE){
      const town=root.STOCKPILE.ensure(save, townId||'guild');
      for(const id in got) town.demand[id]=Math.max(town.demand[id]|0, 4);
    }
  }
  return {ok:true, got, rumor, rep};
}
function active(save, day){
  migrate(save);
  return save.legend.rumors.filter(r=>(r.until|0)>=(day|0));
}
function mention(save, day){
  const rows=active(save, day==null?((save.village&&save.village.day)|0):day);
  if(!rows.length) return '';
  return rows[rows.length-1].text;
}
root.LEGEND={PARTS, RUMOR_DAYS, prices, migrate, onKill, active, mention};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LEGEND;
})(typeof window!=='undefined'?window:globalThis);
