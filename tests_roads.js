/* Roads, waystones, trolls, shared-effect alchemy, and big-beast loot.
   Run: node tests_roads.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const PORTALS=require('./js/portals.js');
const ROADS=require('./js/roads.js');
const TROLLS=require('./js/trolls.js');
const RECIPES=require('./js/recipes.js');
const LEGEND=require('./js/legend.js');
require('./js/reputation.js');
require('./js/stockpile.js');

const neighbors=[{id:5,name:'North Vale',land:true},{id:2,name:'West Wick',land:true},{id:9,name:'Sea',land:false}];
const d1=PORTALS.destFor(4, 0, neighbors, 'mori');
const d2=PORTALS.destFor(4, 0, neighbors, 'mori');
ok(d1&&d1.id===d2.id, 'a waystone keeps the same destination');
ok([2,5].indexOf(d1.id)>=0, 'the destination is a land neighbor');
const ends=PORTALS.ends(4, 2, neighbors, 'mori');
ok(ends.length===4&&ends.filter(e=>e.road===0).length===2, 'each road has a stone at the start and the end');
ok(ends.filter(e=>e.road===0).every(e=>e.dest===ends[0].dest), 'both ends of a road agree');
ok(PORTALS.FADE_MS>0&&PORTALS.FADE_MS<=1000, 'the loading fade is short');
const old={gold:40, reag:{mint:1}, quests:{a:1}};
TROLLS.migrate(old); LEGEND.migrate(old); RECIPES.migrate(old);
ok(old.gold===40&&old.reag.mint===1&&old.quests.a===1&&old.roads&&old.legend&&old.alchemy, 'an old save keeps its gold and grows the new records');

const flat=ROADS.lay([0,0,120,0], {heightAt:()=>4, step:30, sway:0, cap:4});
ok(flat.points.every(p=>Math.abs(p.y-4)<=ROADS.FILL+0.02), 'a flat road sits on the ground');
ok(flat.points.every(p=>p.y>=p.ground-ROADS.CUT-0.02), 'the bed is not buried');
const bent=ROADS.samples([0,0,100,0], {sway:40, step:25, cap:4, heightAt:()=>0});
ok(Math.abs(bent[Math.floor(bent.length/2)].z)>5, 'the road curves off the straight line');
const wet=ROADS.lay([0,0,90,0], {heightAt:x=>x<40?-1:3, seaY:0, step:30, gap:100, cap:4});
const bridge=wet.points.filter(p=>p.bridge);
ok(bridge.length>0&&bridge.every(p=>p.y>0), 'water gets a bridge above the sea');
const cut=ROADS.grade([{x:0,z:0,ground:0},{x:20,z:0,ground:30},{x:40,z:0,ground:0}], {step:20, maxSlope:0.1, gap:100});
const mid=cut.points[1];
ok(mid.y<=mid.ground+ROADS.FILL&&mid.y>=mid.ground-ROADS.CUT-0.02&&mid.cut>0, 'a steep hill is cut, not floated over or buried');

ok(TROLLS.chance(1)<TROLLS.chance(8)&&TROLLS.chance(40)===TROLLS.CAP, 'trolls are more common in a higher region, and the chance is capped');
ok(TROLLS.toll(4)>TROLLS.toll(1), 'the toll scales with the region');
ok(TROLLS.meet(()=>0, 2)&&TROLLS.meet(()=>0, 2).drop==='troll_blood', 'a meeting can offer troll blood');
ok(TROLLS.meet(()=>0.99, 2)===null, 'most crossings are quiet');
const broke=TROLLS.resolve({choice:'pay', level:3, gold:1, rng:()=>0});
ok(!broke.ok, 'a poor purse cannot pay the toll');
const paid=TROLLS.resolve({choice:'pay', level:1, gold:50, rng:()=>0});
ok(paid.ok&&paid.paid===TROLLS.toll(1), 'enough coin buys a peaceful pass');
const won=TROLLS.resolve({choice:'fight', level:1, rng:()=>0.99});
ok(won.ok&&won.drop==='troll_blood', 'staring the troll down leaves a vial of blood');
const lost=TROLLS.resolve({choice:'fight', level:2, rng:()=>0});
ok(!lost.ok&&lost.hurt<=6, 'a lost staring match only bonks you');
const state={};
const bridges=[{id:'br1', x:0, z:0, r:5}];
ok(TROLLS.enter({x:1,z:1}, bridges, state)&&TROLLS.enter({x:1,z:1}, bridges, state)===null, 'one crossing rolls once');

ok(RECIPES.era('gather',0)==='Herbalism'&&RECIPES.era('gather',5)==='Apothecary'&&RECIPES.era('gather',10)==='Botany', 'plant skill walks Herbalism, Apothecary, Botany');
ok(RECIPES.era('mix',0)==='Alchemy'&&RECIPES.era('mix',5)==='Chymistry'&&RECIPES.era('mix',10)==='Chemistry', 'mixing skill walks Alchemy, Chymistry, Chemistry');
const tasted={};
RECIPES.migrate(tasted);
ok(RECIPES.taste(tasted,'troll_blood').learned==='regenerate'&&tasted.alchemy.known.troll_blood[1]!==true, 'a first taste reveals only the first effect');
tasted.alchemy.gather=9;
ok(RECIPES.taste(tasted,'mint').learned==='restore_health', 'a higher skill can start on a new herb');
const pair=RECIPES.combine({mint:1, chamomile:1}, ['mint','chamomile'], {apparatus:'mortar', skill:0, known:{}});
ok(pair.ok&&pair.effects.length===1&&pair.effects.every(e=>e.id!=='regenerate'), 'a mortar draws one shared mundane effect');
ok(pair.effects[0].n>=2, 'the effect is one both herbs carry');
const magic=RECIPES.combine({troll_blood:1, lizard_marrow:1}, ['troll_blood','lizard_marrow'], {apparatus:'mortar', skill:0, known:{}});
const magicPot=RECIPES.combine({troll_blood:1, lizard_marrow:1}, ['troll_blood','lizard_marrow'], {apparatus:'enchanted', skill:0, known:{}});
ok(magic.ok&&magic.effects.every(e=>!e.magic), 'a mortar leaves magic effects in the pot');
ok(magicPot.effects.some(e=>e.magic), 'an enchanted pot lets a magic effect through');
const bag={troll_blood:1, royal_honey:1, lizard_marrow:1, alcohol_base:1};
const high=RECIPES.combine(bag, ['troll_blood','royal_honey','lizard_marrow','alcohol_base'], {apparatus:'distillery', skill:10, known:{}});
ok(high.ok&&high.effects.some(e=>e.id==='regenerate'&&e.n===4), 'the four reagents share Regenerate');
ok(high.name==='High Regeneration Potion'&&high.yield===2, 'a strong shared Regenerate, from a distillery, is a High Regeneration Potion ('+high.name+' '+high.strength+')');
ok(bag.troll_blood===0&&bag.alcohol_base===0, 'the mix spends the reagents');
const weak=RECIPES.combine({troll_blood:1, royal_honey:1, lizard_marrow:1, alcohol_base:1}, ['troll_blood','royal_honey','lizard_marrow','alcohol_base'], {apparatus:'mortar', skill:0, known:{}});
ok(weak.ok&&weak.name!=='High Regeneration Potion', 'the same reagents in a mortar are not yet the high potion');
const still={chamomile:2};
ok(!RECIPES.distill(still,'mortar').ok&&RECIPES.distill(still,'distillery').qty===2, 'alcohol base comes from the distillery, two herbs in');
ok(RECIPES.craftGear('scale_armor').gated&&RECIPES.dragon().spawn===false, 'scale armor is written down and dragons do not spawn');
const added=RECIPES.shared(['mint','chamomile']);
ok(added.every(e=>e.n>=2), 'effect matching only keeps what at least two reagents share');

const beast=RECIPES.lizard(3);
const save={gold:11, reag:{}, village:{day:1, towns:{}, rep:null}};
const kill=LEGEND.onKill(save, beast, 'guild', 1);
ok(kill.ok&&save.reag.lizard_marrow===1&&save.reag.giant_hide===1&&kill.rumor&&kill.rep>0, 'an adult lizard leaves marrow, hide, a rumor, and regard');
ok(/local legend/i.test(LEGEND.mention(save, 1))&&LEGEND.mention(save, 9)==='', 'the elder tells the rumor, then it fades');
ok(LEGEND.onKill(save, RECIPES.dragon(), 'guild', 1).spawn===false, 'a dragon kill is refused');
ok(LEGEND.prices().dragon_scale>=200&&LEGEND.prices().troll_blood>=40, 'monster parts are worth a lot in town');
ok(save.gold===11, 'the legend does not spend the purse');

console.log('tests_roads: '+n+' checks passed');
