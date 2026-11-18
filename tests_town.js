/* Footprints, item names, street houses, townsfolk, raids, skills, and a new world.
   Run: node tests_town.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const COLLIDE=require('./js/collide.js');
const ITEMS=require('./js/items.js');
const ROADS=require('./js/roads.js');
const TOWN=require('./js/townplan.js');
const HOUSES=require('./js/houses.js');
const FOLK=require('./js/folk.js');
const RAIDS=require('./js/raids.js');
const SKILLS=require('./js/skills.js');
const NEWWORLD=require('./js/newworld.js');
const WORK=require('./js/workshop.js');
const VILLAGE=require('./js/village.js');

const hall={x:0, z:-12, hw:5.6, hd:3.3, yaw:0};
const corner=COLLIDE.cornerOpen(hall);
ok(corner.missedByCircle&&corner.blockedByBox, 'a circle misses the hall corner and the box does not');
const walker={x:hall.x+hall.hw-0.2, z:hall.z+hall.hd-0.2};
ok(COLLIDE.pushBox(walker, 0.3, hall), 'the wall pushes a walker who clips a corner');
ok(Math.abs(walker.x-hall.x)>=hall.hw-0.01||Math.abs(walker.z-hall.z)>=hall.hd-0.01, 'the walker ends outside the footprint');

const old={reag:{wolf_hide:2, copper:1, copper_ore:3}, inv:[{name:'Wolf Hide', kind:'hide', qty:1}], village:{towns:{guild:{items:{Ore:4}}}}, gold:12};
ITEMS.migrate(old);
ok(old.vItems===1&&old.reag.wolf_pelt===2&&!old.reag.wolf_hide, 'wolf hide becomes the wolf pelt');
ok(old.reag.copper_ore===4&&!old.reag.copper, 'plain copper joins the copper ore pile');
ok(old.inv[0].name==='Wolf Pelt'&&old.inv[0].cat==='Hide'&&old.inv[0].rid==='wolf_pelt', 'an inventory hide takes the canonical name');
ok(old.village.towns.guild.items.bog_iron_ore===4&&old.gold===12, 'a town stock of Ore becomes bog iron and the purse stays');
const again=JSON.parse(JSON.stringify(old));
ITEMS.migrate(again);
ok(again.reag.wolf_pelt===2, 'a second migrate does not double the pile');

const plan=TOWN.check();
ok(plan.ok&&plan.roadsOk&&Math.abs(plan.width-ROADS.HALF*2)<0.05, 'town streets use the road width');
ok(plan.farmsOut, 'fields sit outside the palisade');
const street=HOUSES.along([[0,0,48,0],[0,0,0,48]], function(){ return 0.35; });
ok(street.plots.length>=2&&HOUSES.spaced(street.plots), 'houses along a street keep their gaps');
ok(street.yards.length===street.plots.length&&street.fences.length===street.plots.length, 'each house has a yard and a fence');
const door=HOUSES.doorFaces(street.plots[0]);
ok(Math.hypot(door.x-street.plots[0].x, door.z-street.plots[0].z)>1, 'the door sits on the footprint, facing out');

const folk=FOLK.roster('guild', 36);
ok(folk.length>=10&&folk.length<=50, 'a town has between ten and fifty people');
ok(FOLK.countFor(1)===10&&FOLK.countFor(5000)===50, 'the count stays inside that band');
const stock={items:{bog_iron_ore:8, oak_log:8, mint:4, oak_beam:3}, coin:10, pop:36};
const far=FOLK.tick(folk, stock, 1, false);
ok(far.shown===0&&far.abstract===folk.length, 'offscreen townsfolk stay abstract');
const near=FOLK.tick(folk, stock, 6, true);
ok(near.shown<=FOLK.MESH_CAP&&near.shown>0, 'only a handful near the player get a body');
ok((stock.items.sun_grain||0)>0, 'farmers put grain in the stockpile');

const beasts=RAIDS.plan(function(){ return 0.2; });
ok(beasts.human===false&&(beasts.kind==='wolf'||beasts.kind==='direrat'), 'raids are wolves or dire rats');
const pile={items:{oak_log:5, mint:5, clay:5, tin_ore:5}};
const scuff=RAIDS.strike(pile);
ok(scuff.lost===RAIDS.CAP, 'a raid scuffs only the stock cap');
let left=0; Object.keys(pile.items).forEach(k=>{ left+=pile.items[k]; });
ok(left===17, 'the rest of the stock stays');
const helped=RAIDS.resolve({town:{items:{oak_log:1}}, player:true});
ok(helped.rep===2&&/guards/.test(helped.line), 'helping the watch is remembered');

const fresh={};
ok(SKILLS.use(fresh,'nope','mining',1).ok===false, 'an unknown branch is refused');
const mine=SKILLS.use(fresh,'gathering','mining',1);
ok(mine.level===1&&mine.era==='Herbalism'&&mine.d20!==true, 'the first gather is Herbalism and not a dice roll');
const mix=SKILLS.use(fresh,'alchemy','mix',25);
ok(mix.level===5&&mix.era==='Chymistry', 'more practice steps the era name');
ok(SKILLS.use(fresh,'combat','melee',1).d20===true, 'combat is marked to keep d20 until review');

const pack={gold:40, inv:[{id:'band', name:'Linen Bandage', kind:'bandage'}], reag:{copper_ore:1}, worlds:{mori:{reg:{3:2}}}, seed:'mori', gather:{skills:{mining:12}}};
ok(NEWWORLD.apply(pack,'other').ok===false&&pack.worlds.mori.reg[3]===2&&pack.gold===40, 'a new world without a yes leaves the save alone');
const made=NEWWORLD.apply(pack,'bramble',{confirm:true});
ok(made.ok&&made.save.gold===40&&made.save.inv[0].name==='Linen Bandage'&&made.save.gather.skills.mining===12, 'the pack and the skills come along');
ok(made.save.seed==='bramble'&&made.save.worldBackup.worlds.mori.reg[3]===2, 'the old world is the backup');
ok(/square/.test(made.save.greet)&&/tinker/i.test(made.save.greet), 'Mori and Tinker greet the new ground');
const back=NEWWORLD.revert(made.save,{confirm:true});
ok(back.ok&&back.save.seed==='mori'&&back.save.worlds.mori.reg[3]===2&&back.save.gold===40, 'revert puts that world back and keeps the pack');
ok(NEWWORLD.revert(pack).ok===false, 'revert also waits for a yes');

const maker={reag:{copper_ore:1}, inv:[{rid:'copper_ore', qty:1, name:'Copper Ore'}]};
const bar=VILLAGE.craft(maker,'copper_bar');
ok(bar.ok&&maker.reag.copper_bar===1&&!maker.reag.copper_ore&&maker.inv.length===0, 'the make takes both the bag and the pack');
ok(/from your pack/.test(bar.note)&&/Copper bar/.test(bar.note), 'the note says what left and what arrived');
const shy=VILLAGE.craft({reag:{}, inv:[]},'copper_bar');
ok(!shy.ok&&/pack/.test(shy.why), 'a short pack is told what it is short of');
ok(WORK.craft({charcoal:4},'black_powder').cap, 'the ceiling recipe still does not craft');

function Stub(){ this.set=function(){ return this; }; }
const gctx={console, Math, THREE:{Object3D:Stub, Color:Stub}, TWOSPEED:{}, performance:{now:function(){ return 0; }}};
gctx.window=gctx;
vm.createContext(gctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/gather.js'),'utf8'), gctx);
ok(gctx.GATHERING.highlightFor({gnode:{ready:true}})===true, 'a live node keeps its ring');
ok(gctx.GATHERING.highlightFor({gnode:{ready:false}})===false, 'a depleted node drops the ring');
ok(gctx.GATHERING.highlightFor({spent:true, gnode:{}})===false, 'a spent target drops the ring');

console.log('tests_town: '+n+' checks passed');
