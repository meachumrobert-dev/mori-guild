/* Settlements want water. Claims grow. Realms mint what they have.
   Trade compounds, then eases off so it does not run away. */
(function(root){
'use strict';
const STAGES=['stake','homestead','hamlet','village','town'];
function waterFor(biome, landlocked){
  if(landlocked) return {kind:'well', navigable:false};
  if(biome==='beach'||biome==='coast') return {kind:'sea', navigable:true, dock:true, yard:true};
  if(biome==='swamp'||biome==='jungle') return {kind:'river', navigable:true};
  if(biome==='desert') return {kind:'spring', navigable:false};
  return {kind:'river', navigable:true};
}
function claimAt(parcel, who, at){
  if(!parcel) return {ok:false, why:'no ground'};
  if(parcel.owner) return {ok:false, why:'not wild'};
  if(parcel.realmLaw) return {ok:false, why:'realm law blocks a claim here'};
  parcel.owner=who||'you';
  parcel.at=at?{x:at.x||0, z:at.z||0}: (parcel.at||{x:0,z:0});
  parcel.stage='stake';
  parcel.pushback=!!parcel.border;
  return {ok:true, at:parcel.at, stage:parcel.stage, pushback:parcel.pushback};
}
function grow(parcel){
  if(!parcel||!parcel.owner) return parcel;
  const i=STAGES.indexOf(parcel.stage||'stake');
  if(i<STAGES.length-1) parcel.stage=STAGES[i+1];
  return parcel;
}
function chapter(town){
  town=town||{};
  const late=STAGES.indexOf(town.stage)>=3;
  if(!late&&!town.playerLand) return {ok:false, why:'a chapter wants a town, or your own land'};
  town.guild={board:true, members:1};
  return {ok:true, guild:town.guild};
}
function compound(town, trade){
  town=town||{capital:1};
  const add=Math.max(0, trade||0);
  const cap=town.capital||1;
  const next=cap+add*0.15;
  const soft=40;
  town.capital=next>soft?soft+(next-soft)*0.25:next;
  town.capital=Math.round(town.capital*100)/100;
  return town;
}
function respawn(node, demand){
  const want=Math.max(0, demand||0);
  const geo=node&&node.geo!=null?node.geo:1;
  const weight=Math.round((0.4+want*0.2)*geo*100)/100;
  return {ready:weight>0.5, weight};
}
root.REALM={STAGES, waterFor, claimAt, grow, chapter, compound, respawn, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.REALM;
})(typeof window!=='undefined'?window:globalThis);
