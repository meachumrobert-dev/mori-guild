/* The tablet's codex. A page stays dark until the world has shown it to you. */
(function(root){
'use strict';
const CATS={
  spells:{label:'Spells', sub:['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation']},
  races:{label:'Races', sub:['peoples']},
  items:{label:'Items', sub:['materials','goods']},
  stations:{label:'Stations', sub:['craft']},
  jobs:{label:'Jobs', sub:['buildings']},
  bestiary:{label:'Bestiary', sub:['beasts']}
};
const PAGES={
  wolf:{cat:'bestiary', sub:'beasts', name:'Wolf', text:'A pack animal. It tests fences and runs when the light finds it.', level:1},
  direrat:{cat:'bestiary', sub:'beasts', name:'Dire rat', text:'Mean, numerous, and fond of granaries.', level:1},
  bog_iron_ore:{cat:'items', sub:'materials', name:'Bog iron ore', text:'Wet-ground iron. The first metal.', level:0},
  oak_log:{cat:'items', sub:'materials', name:'Oak log', text:'Beams, planks, charcoal, or the hearth.', level:0},
  guild_hall:{cat:'jobs', sub:'buildings', name:'Guild hall', text:'Where the town keeps its name and its rest.', level:0},
  bloomery:{cat:'stations', sub:'craft', name:'Bloomery', text:'Ore and charcoal become a bloom.', level:1},
  human:{cat:'races', sub:'peoples', name:'Human', text:'Short lives, quick towns, restless trade.', level:0},
  prestidigitation:{cat:'spells', sub:'transmutation', name:'Prestidigitation', text:'A cantrip of small shows. Flavor, not a fireball.', school:'transmutation', level:0},
  skeleton:{cat:'bestiary', sub:'beasts', name:'Human skeleton', text:'Bones with a sword. It does not breathe.', level:1},
  zombie:{cat:'bestiary', sub:'beasts', name:'Human zombie', text:'Slow undead. It keeps coming.', level:1},
  grayooze:{cat:'bestiary', sub:'beasts', name:'Gray ooze', text:'The Undercroft boss. Acid, and no armor to speak of.', level:3},
  monitor:{cat:'bestiary', sub:'beasts', name:'Monitor lizard', text:'A big reptile of warm coasts and swamps.', level:2},
  firebeetle:{cat:'bestiary', sub:'beasts', name:'Giant fire beetle', text:'A glowing vermin. The glands burn.', level:1}
};
function fresh(){ return {seen:{}}; }
function discover(book, id){
  book=book||fresh();
  if(!book.seen) book.seen={};
  if(PAGES[id]) book.seen[id]=1;
  return book;
}
function list(book, cat){
  book=book||fresh();
  return Object.keys(PAGES).filter(id=>{
    const p=PAGES[id];
    if(cat&&p.cat!==cat) return false;
    return !!(book.seen&&book.seen[id]);
  }).map(id=>Object.assign({id}, PAGES[id]));
}
function hidden(book){
  book=book||fresh();
  return Object.keys(PAGES).filter(id=>!(book.seen&&book.seen[id])).length;
}
root.CODEX={CATS, PAGES, fresh, discover, list, hidden, star:['connected','roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.CODEX;
})(typeof window!=='undefined'?window:globalThis);
