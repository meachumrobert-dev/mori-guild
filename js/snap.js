/* Pieces sit on a one-meter grid. Digging lowers ground. A blend eases the lip.
   Mori can set the next piece with you. */
(function(root){
'use strict';
const GRID=1;
function snap(x, z){
  return {x:Math.round(x/GRID)*GRID, z:Math.round(z/GRID)*GRID};
}
function dig(height, amount){
  return Math.round((height-(amount||0.4))*100)/100;
}
function blend(a, b, t){
  const k=Math.max(0, Math.min(1, t==null?0.5:t));
  return Math.round((a*(1-k)+b*k)*100)/100;
}
function place(pieces, part, by){
  const at=snap(part.x||0, part.z||0);
  const row=pieces.slice();
  row.push({id:part.id||('piece-'+row.length), kind:part.kind||'wall', x:at.x, z:at.z, by:by||'you'});
  return row;
}
function coBuild(pieces){
  const row=pieces.slice();
  const at=snap(0, row.length);
  row.push({id:'mori-'+row.length, kind:'post', x:at.x, z:at.z, by:'mori'});
  return row;
}
root.SNAP={GRID, snap, dig, blend, place, coBuild, star:['roleplay','built']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.SNAP;
})(typeof window!=='undefined'?window:globalThis);
