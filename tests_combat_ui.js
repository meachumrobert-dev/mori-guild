/* One sheet, a held world, raiders who walk in, crew who think, a codex that starts dark.
   Run: node tests_combat_ui.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const SHEETS=require('./js/sheets.js');
const RAID=require('./js/raidmarch.js');
const CREW=require('./js/crew.js');
const CODEX=require('./js/codex.js');

ok(SHEETS.openOne(null,'bagP')==='bagP', 'opening a sheet shows that sheet');
ok(SHEETS.openOne('bagP','bagP')===null, 'the same sheet closes');
ok(SHEETS.openOne('bagP','questP')==='questP', 'a new sheet replaces the open one');
ok(SHEETS.onAttack('bagP').close&&!SHEETS.onAttack(null).close, 'an attack closes the open sheet');
ok(SHEETS.shouldHold(true)&&!SHEETS.shouldHold(null), 'an open sheet holds the fight');
const play=SHEETS.showIds('play');
ok(play.indexOf('bBag')>=0&&play.indexOf('bLore')<0, 'the phone play tab does not show the book');
ok(SHEETS.showIds('book').indexOf('bLore')>=0, 'lore lives on the book tab');
ok(SHEETS.showIds('world').indexOf('bNewWorld')>=0&&SHEETS.showIds('play').indexOf('bNewWorld')<0, 'New World sits on the World tab');

const gate={x:0,z:20};
const walker=RAID.place(gate, 18, 0, 1);
ok(walker.z>=gate.z+18, 'a raider starts outside the wall');
let steps=0;
while(walker.phase==='march'&&steps<40){ RAID.tick(walker, [{x:0,z:30,range:2,zap:0}]); steps++; }
ok(walker.phase==='gate'&&steps>3, 'the raider walks to the gate');
const zapped=RAID.place(gate, 6, 0, 1);
RAID.tick(zapped, [{x:zapped.x, z:zapped.z, range:4, zap:20}]);
ok(zapped.phase==='down', 'a beacon drops a raider before the gate');
const pack=[0,1,2].map(i=>{ const r=RAID.place(gate, 4, i, 3); r.phase='gate'; return r; });
const met=RAID.meet(pack);
ok(met.atGate===3&&met.guards>=1&&met.guards<=4, 'guards meet the ones who arrive');
ok(RAID.loss(9, 3)===3&&RAID.loss(0, 3)===0, 'lost stock stays under the cap');

ok(CREW.order({hp:4,max:20,x:0,z:0},{foes:[{id:'w',x:3,z:0}],player:{x:0,z:0}}).act==='retreat', 'a hurt mate falls back');
const flank=CREW.order({hp:18,max:20,x:0,z:0,slot:1},{foes:[{id:'wolf',x:4,z:1},{id:'rat',x:9,z:9}],player:{x:0,z:0}});
ok(flank.act==='flank'&&flank.foe==='wolf', 'the crew picks the nearer foe and takes a side');
ok(CREW.order({hp:20,max:20},{foes:[{id:'w',x:1,z:1}],player:{x:2,z:2},mode:'guard'}).act==='guard', 'a guard order stands by you');
ok(CREW.order({hp:20,max:20},{foes:[],player:{x:0,z:0}}).act==='follow', 'with no foe they walk behind you');

const book=CODEX.fresh();
ok(CODEX.list(book).length===0&&CODEX.hidden(book)>0, 'the codex starts dark');
CODEX.discover(book,'wolf');
ok(CODEX.list(book,'bestiary').length===1&&CODEX.list(book,'spells').length===0, 'a seen beast unlocks only that page');
ok(CODEX.CATS.spells.sub.indexOf('evocation')>=0, 'spells keep their schools');
CODEX.discover(book,'nope');
ok(!CODEX.list(book).some(p=>p.id==='nope'), 'an unknown id does not invent a page');

console.log('tests_combat_ui: '+n+' checks passed');
