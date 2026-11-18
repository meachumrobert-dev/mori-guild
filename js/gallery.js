/* HeroLock gallery. A preset is a short text code, not a picture.
   Locked faces stay locked. The list is capped so a phone can hold it. */
(function(root){
'use strict';
const CAP=24;
const FIELDS=['name','race','jawWidth','cheek','eyeAngle','eyeSize','eyeSpacing','brow','noseLen','earSize','earAngle','hornLen','hornCurve','height','skin','hair','eyeGlow','glow','hairStyle','beard','scars','scarHeavy','robe','veil','corset','pauldron','bootStyle','top','armor','boots','hat'];
function pack(p){
  const o={v:1};
  FIELDS.forEach(k=>{ if(p&&p[k]!==undefined&&p[k]!==null) o[k]=p[k]; });
  return JSON.stringify(o);
}
function unpack(text){
  let o;
  try{ o=JSON.parse(String(text||'')); }catch(e){ return {ok:false, why:'not a preset code'}; }
  if(!o||o.v!==1||typeof o.race!=='string'||o.race.length<2||o.race.length>24) return {ok:false, why:'not a preset code'};
  if(o.locked||o.kit) return {ok:false, why:'locked presets are not shared'};
  const preset={race:o.race, name:String(o.name||'Shared face').slice(0,32)};
  FIELDS.forEach(k=>{ if(k==='name'||k==='race') return; if(o[k]!==undefined) preset[k]=o[k]; });
  return {ok:true, preset};
}
function add(list, preset){
  const next=(list||[]).slice();
  if(next.length>=CAP) next.shift();
  next.push(Object.assign({id:'g'+next.length}, preset));
  return next;
}
root.GALLERY={CAP, FIELDS, pack, unpack, add};
if(typeof module!=='undefined'&&module.exports) module.exports=root.GALLERY;
})(typeof window!=='undefined'?window:globalThis);
