/* Peoples and beastfolk. A tribe starts near no tech. Trade and teaching
   move a method. A mix of the two is a hybrid, not a replacement. */
(function(root){
'use strict';
const PEOPLES={
  human:{span:80, tech:2, lore:'road'},
  dwarf:{span:400, tech:3, lore:'stone'},
  elf:{span:1000, tech:3, lore:'star'},
  halfling:{span:150, tech:2, lore:'hearth'}
};
const TRIBES={
  wolfkin:{tech:0, lore:'hunt-moon', biome:'forest'},
  goatkin:{tech:0, lore:'high-path', biome:'hill'},
  otterkin:{tech:0, lore:'tide-name', biome:'coast'},
  lizardkin:{tech:0, lore:'warm-mud', biome:'marsh'}
};
function trade(tribe, offer){
  if(!tribe||(offer|0)<1) return {ok:false, why:'nothing offered'};
  const next=(tribe.tech|0)+1;
  return {ok:true, tech:next, lore:tribe.lore, hybrid:offer>0&&next>0};
}
function branch(a, b){
  return {id:a+'+'+b, parents:[a,b], hybrid:true};
}
root.KIN={PEOPLES, TRIBES, trade, branch, star:['uneven','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.KIN;
})(typeof window!=='undefined'?window:globalThis);
