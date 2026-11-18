/* One sheet at a time. A hit closes it. While it is open, the world holds still. */
(function(root){
'use strict';
const GROUPS=[
  {id:'play', label:'Play', ids:['bHero','bTalk','bBag','bJobs']},
  {id:'world', label:'World', ids:['bQuests','bElder','bBoard','bRep','bGlobe','bTablet']},
  {id:'book', label:'Book', ids:['bLore','bMem','bPersona','bBeat','bHelp']}
];
function openOne(current, id){
  if(current===id) return null;
  return id;
}
function onAttack(open){
  return {close:!!open, hold:false};
}
function shouldHold(open){
  return !!open;
}
function groupFor(id){
  return GROUPS.find(g=>g.ids.indexOf(id)>=0)||null;
}
function showIds(groupId){
  const g=GROUPS.find(x=>x.id===groupId)||GROUPS[0];
  return g.ids.slice();
}
root.SHEETS={GROUPS, openOne, onAttack, shouldHold, groupFor, showIds, star:['roleplay','phone']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.SHEETS;
})(typeof window!=='undefined'?window:globalThis);
