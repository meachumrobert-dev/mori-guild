/* Land, boats, kin, spells, a typed try, and a world that does not end.
   Run: node tests_land.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const SNAP=require('./js/snap.js');
const LAND=require('./js/land.js');
const SHIPS=require('./js/ships.js');
const KIN=require('./js/kin.js');
const SPELLS=require('./js/spells.js');
const ROLE=require('./js/roleplay.js');
const LIVING=require('./js/living.js');

ok(SNAP.snap(1.6,-0.4).x===2&&SNAP.snap(1.6,-0.4).z===0, 'a piece snaps to the meter');
ok(SNAP.dig(3, 0.5)===2.5&&SNAP.blend(0, 4, 0.25)===1, 'dig lowers ground and blend eases the lip');
const wall=SNAP.place([], {kind:'wall', x:1.2, z:1.2}, 'you');
const withMori=SNAP.coBuild(wall);
ok(withMori.length===2&&withMori[1].by==='mori', 'Mori sets the next piece');

ok(LAND.rent(1, 2).ok===false&&LAND.rent(10, 2).cost===4, 'a room costs two a night');
const plot={price:10};
ok(LAND.buy(4, plot).why==='short'&&LAND.buy(10, plot).owner==='you', 'a plot sells when the purse covers it');
const wild={};
const claimed=LAND.claim(wild, 'you');
ok(claimed.ok&&claimed.quest.from==='mori'&&LAND.claim(wild).why==='not wild', 'a claim starts Mori\'s homestead and wild land only claims once');
ok(LAND.grant({rank:0}, 'you', {}).why==='no grant to give'&&LAND.grant({rank:2, name:'Brook'}, 'you', plot).owner==='you', 'a lord can grant, a cottar cannot');
ok(LAND.settlers('hill').indexOf('dwarf')>=0&&LAND.settlers('coast').indexOf('otterkin')>=0, 'settlers follow the biome');
const hold={strength:2, oath:5};
ok(!LAND.independence(hold).ok);
LAND.fealty(hold, 'Brook');
hold.strength=6;
ok(hold.liege==='Brook'&&LAND.independence(hold).ok&&hold.free, 'fealty holds until the oath is outgrown');

const boat=SHIPS.starter();
ok(!boat.keel&&SHIPS.yard('ocean').indexOf('hulk')>=0&&SHIPS.yard('river').indexOf('hulk')<0, 'the river yard is smaller than the ocean yard');
ok(SHIPS.swap(boat,'sail','lateen').ok&&boat.sail==='lateen', 'a sail swaps');
ok(SHIPS.heel(boat, 3).over&&!SHIPS.heel(Object.assign({}, boat, {keel:true}), 3).over, 'a keel-less hull can tip');
ok(SHIPS.haul(boat,'grain','haven').ok&&SHIPS.unload(boat).length===1&&boat.cargo.length===0, 'cargo goes out and comes off');

ok(KIN.TRIBES.wolfkin.tech===0, 'a tribe starts near no tech');
const dealt=KIN.trade(KIN.TRIBES.wolfkin, 1);
ok(dealt.ok&&dealt.lore==='hunt-moon'&&dealt.hybrid&&dealt.tech===1, 'a method buys lore and starts a hybrid step');
ok(KIN.branch('wolfkin','human').hybrid, 'two peoples make a branch, not a replacement');

ok(SPELLS.SCHOOLS.every(s=>SPELLS.bySchool(s).length>=2), 'each school has more than one spell');
const cantrip=SPELLS.cast('prestidigitation', 12, {level:1});
ok(cantrip.ok&&cantrip.effect<=cantrip.cap&&cantrip.flavor==='spark', 'a cantrip lands as flavor, inside a cap');
const fail=SPELLS.cast('wish', 2, {level:1});
ok(!fail.ok&&fail.effect===0, 'a high spell does not land on a low roll');
ok(SPELLS.cast('fireball', 20, {level:1}).effect<=4, 'even a high roll stays inside the cap');

const claim=ROLE.read('I claim this valley', {law:'wild'});
ok(claim.intent==='claim'&&claim.plausible, 'a wild claim is a real try');
ok(!ROLE.read('I claim this valley', {law:'lord'}).plausible, 'a lord\'s hall does not let you claim it');
ok(ROLE.read('hello there', {law:'public'}).intent===null, 'chatter is not a try');
const landed=ROLE.resolve(ROLE.read('sneak past the guard', {law:'public'}), {roll:16, skill:2, oppose:12});
ok(landed.ok&&landed.effect<=3, 'a success stays small');
ok(!ROLE.resolve(ROLE.read('unlock the chest', {law:'lord'}), {roll:20}).ok, 'security law refuses the try before the roll');

ok(LIVING.rank(0).name==='cottar'&&LIVING.rank(9).name==='king'&&LIVING.rank(9).last===false, 'a crown is a rank, not an ending');
const world={day:3};
ok(LIVING.day(world).ended===false&&world.day===4, 'the next day still comes');
ok(LIVING.fall({name:'Kit'}, 0).permadeath&&!LIVING.fall({name:'Lyra'}, 4).dead, 'a fallen mate stays fallen');

console.log('tests_land: '+n+' checks passed');
