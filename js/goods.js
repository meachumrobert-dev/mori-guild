/* Every good has a use or an end. A dead end fails the test.
   Prices follow how badly the town wants the end of the chain. */
(function(root){
'use strict';
const ITEMS={
  ash:{name:'Ash', uses:['lye','field'], end:null},
  lye:{name:'Lye', uses:['soap','leather'], end:null},
  soap:{name:'Soap', uses:[], end:'wash'},
  bone:{name:'Bone', uses:['glue','bonemeal'], end:null},
  glue:{name:'Glue', uses:['furniture','armor'], end:null},
  bonemeal:{name:'Bonemeal', uses:['field','grain'], end:null},
  furniture:{name:'Furniture', uses:[], end:'home'},
  field:{name:'Dressed field', uses:['grain','flax'], end:null},
  oak_log:{name:'Oak log', uses:['plank','charcoal','stake','oak_beam','firewood'], end:null},
  plank:{name:'Plank', uses:['furniture','hull','barrel'], end:null},
  charcoal:{name:'Charcoal', uses:['bloom','bar'], end:null},
  stake:{name:'Stake', uses:['palisade','frame'], end:null},
  oak_beam:{name:'Oak beam', uses:['frame','hull'], end:null},
  firewood:{name:'Firewood', uses:[], end:'hearth'},
  grain:{name:'Grain', uses:['flour','ale'], end:null},
  flour:{name:'Flour', uses:['loaf','tavern_meal'], end:null},
  loaf:{name:'Loaf', uses:['tavern_meal','ale'], end:null},
  tavern_meal:{name:'Tavern meal', uses:[], end:'feed'},
  hide:{name:'Hide', uses:['leather','bone'], end:null},
  leather:{name:'Leather', uses:['armor','furniture'], end:null},
  armor:{name:'Leather armor', uses:[], end:'wear'},
  palisade:{name:'Palisade', uses:[], end:'defense'},
  frame:{name:'House frame', uses:[], end:'home'},
  bloom:{name:'Iron bloom', uses:['bar','tool'], end:null},
  bar:{name:'Iron bar', uses:['tool','armor'], end:null},
  tool:{name:'Tool', uses:[], end:'work'},
  hull:{name:'Hull timber', uses:[], end:'ship'},
  ale:{name:'Ale', uses:[], end:'drink'},
  fish:{name:'Fish', uses:['tavern_meal','glue'], end:null},
  flax:{name:'Flax', uses:['yarn','cloth'], end:null},
  yarn:{name:'Yarn', uses:['cloth','sail'], end:null},
  cloth:{name:'Cloth', uses:['sail'], end:'wear'},
  sail:{name:'Sail', uses:[], end:'ship'},
  clay:{name:'Clay', uses:['pot','frame'], end:null},
  pot:{name:'Pot', uses:[], end:'cook'},
  fiber:{name:'Fiber', uses:['rope','cloth'], end:null},
  rope:{name:'Rope', uses:[], end:'ship'},
  barrel:{name:'Barrel', uses:[], end:'store'},
  stone:{name:'Stone', uses:['frame','millstone'], end:null},
  millstone:{name:'Millstone', uses:[], end:'work'}
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
  const single=Object.keys(table).filter(id=>{
    const it=table[id];
    return !(it.end)&&(it.uses||[]).length<2;
  });
  return {dead, broken, single};
}
root.GOODS={ITEMS, deadEnds, audit, price, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.GOODS;
})(typeof window!=='undefined'?window:globalThis);
