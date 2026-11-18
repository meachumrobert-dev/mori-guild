/* Every good has a use or an end. A dead end fails the test.
   Prices follow how badly the town wants the end of the chain. */
(function(root){
'use strict';
const ITEMS={
  ash:{name:'Ash', uses:['lye'], end:null},
  lye:{name:'Lye', uses:['soap'], end:null},
  soap:{name:'Soap', uses:[], end:'wash'},
  bone:{name:'Bone', uses:['glue','bonemeal'], end:null},
  glue:{name:'Glue', uses:['furniture'], end:null},
  bonemeal:{name:'Bonemeal', uses:['field'], end:null},
  furniture:{name:'Furniture', uses:[], end:'home'},
  field:{name:'Dressed field', uses:['grain'], end:null},
  oak_log:{name:'Oak log', uses:['plank','charcoal','stake','oak_beam','firewood'], end:null},
  plank:{name:'Plank', uses:['furniture','hull'], end:null},
  charcoal:{name:'Charcoal', uses:['bloom'], end:null},
  stake:{name:'Stake', uses:['palisade'], end:null},
  oak_beam:{name:'Oak beam', uses:['frame'], end:null},
  firewood:{name:'Firewood', uses:[], end:'hearth'},
  grain:{name:'Grain', uses:['flour'], end:null},
  flour:{name:'Flour', uses:['loaf'], end:null},
  loaf:{name:'Loaf', uses:['tavern_meal'], end:null},
  tavern_meal:{name:'Tavern meal', uses:[], end:'feed'},
  hide:{name:'Hide', uses:['leather'], end:null},
  leather:{name:'Leather', uses:['armor'], end:null},
  armor:{name:'Leather armor', uses:[], end:'wear'},
  palisade:{name:'Palisade', uses:[], end:'defense'},
  frame:{name:'House frame', uses:[], end:'home'},
  bloom:{name:'Iron bloom', uses:['bar'], end:null},
  bar:{name:'Iron bar', uses:['tool'], end:null},
  tool:{name:'Tool', uses:[], end:'work'},
  hull:{name:'Hull timber', uses:[], end:'ship'},
  ale:{name:'Ale', uses:[], end:'drink'},
  fish:{name:'Fish', uses:['tavern_meal'], end:null},
  flax:{name:'Flax', uses:['yarn'], end:null},
  yarn:{name:'Yarn', uses:['cloth'], end:null},
  cloth:{name:'Cloth', uses:['sail'], end:'wear'},
  sail:{name:'Sail', uses:[], end:'ship'},
  clay:{name:'Clay', uses:['pot'], end:null},
  pot:{name:'Pot', uses:[], end:'cook'},
  fiber:{name:'Fiber', uses:['rope'], end:null},
  rope:{name:'Rope', uses:[], end:'ship'},
  barrel:{name:'Barrel', uses:[], end:'store'},
  stone:{name:'Stone', uses:['frame'], end:null}
};
function deadEnds(table){
  table=table||ITEMS;
  return Object.keys(table).filter(id=>{
    const it=table[id];
    return !(it.uses&&it.uses.length)&&!it.end;
  });
}
function price(town, id){
  const it=ITEMS[id];
  if(!it) return 0;
  const want=(town&&town.demand&&town.demand[id])||0;
  const stock=(town&&town.items&&town.items[id])||0;
  const base=it.end?6:2;
  return Math.round(base*(want+3)/(stock+3)*100)/100;
}
function audit(table){
  table=table||ITEMS;
  const dead=deadEnds(table);
  const broken=[];
  Object.keys(table).forEach(id=>{
    (table[id].uses||[]).forEach(u=>{ if(!table[u]) broken.push(id+'->'+u); });
  });
  return {dead, broken};
}
root.GOODS={ITEMS, deadEnds, audit, price, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.GOODS;
})(typeof window!=='undefined'?window:globalThis);
