/* Use-based skills. You get better by doing the thing.
   d20 checks stay where they are until a later pass. This only records use.
   Era names follow the same ladder as gathering and alchemy. */
(function(root){
'use strict';
const TREE={
  gathering:{title:'Gathering', era:['Herbalism','Apothecary','Botany'], skills:['herbalism','mining','woodcutting','skinning']},
  crafting:{title:'Crafting', era:['Bench','Smithy','Workshop'], skills:['smithing','leather','cook']},
  combat:{title:'Combat', era:['Militia','Arms','Veteran'], skills:['melee','guard'], d20:true},
  alchemy:{title:'Alchemy', era:['Alchemy','Chymistry','Chemistry'], skills:['mix','distill']},
  social:{title:'Social', era:['Gossip','Regard','Charter'], skills:['talk','elder']},
  trade:{title:'Trade', era:['Barter','Merchant','Factor'], skills:['sell','haggle']}
};
function xpOf(save){
  if(!save.skillTree) save.skillTree={xp:{}};
  if(!save.skillTree.xp) save.skillTree.xp={};
  return save.skillTree.xp;
}
function level(xp){ xp=xp|0; if(xp<1) return 0; return Math.floor(Math.sqrt(xp)); }
function eraName(branch, lv){
  const row=TREE[branch];
  if(!row) return '';
  const i=lv>=10?2:lv>=5?1:0;
  return row.era[i];
}
function use(save, branch, skill, n){
  if(!TREE[branch]||TREE[branch].skills.indexOf(skill)<0) return {ok:false, why:'unknown skill'};
  const xp=xpOf(save);
  const key=branch+'.'+skill;
  xp[key]=(xp[key]|0)+Math.max(1, n|0);
  const lv=level(xp[key]);
  return {ok:true, key, xp:xp[key], level:lv, era:eraName(branch, lv), d20:!!TREE[branch].d20};
}
root.SKILLS={TREE, level, eraName, use};
if(typeof module!=='undefined'&&module.exports) module.exports=root.SKILLS;
})(typeof window!=='undefined'?window:globalThis);
