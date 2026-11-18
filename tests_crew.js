/* Crew walk, hit, heal, and keep their distance. No snap.
   Run: node tests_crew.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const CREW=require('./js/crew.js');

const tank={name:'Juno', role:'tank', x:0, z:0, hp:20, max:20, cd:0};
const foe={id:'wolf', x:12, z:0, hp:40, max:40, threat:0};
const speed=CREW.ROLES.tank.speed;
const dt=0.1;
let far=0;
for(let i=0;i<8;i++){
  const x0=tank.x, z0=tank.z;
  CREW.tick([tank], {dt, stance:'aggressive', player:{x:0,z:2,hp:20,max:20}, foes:[foe], allies:[], blockers:[]});
  const step=Math.hypot(tank.x-x0, tank.z-z0);
  ok(step<=speed*dt+0.02, 'a tick moves at most one step ('+step.toFixed(3)+')');
  ok(Math.hypot(tank.x-foe.x, tank.z-foe.z)>0.4, 'the tank does not appear on the wolf');
  if(i===0) far=Math.hypot(tank.x, tank.z);
}
ok(tank.x>far*0.5, 'the tank is closer after several steps');
ok(foe.hp===40, 'damage waits until the tank is in reach');

tank.x=foe.x-1.1; tank.z=foe.z; tank.cd=0;
const before=foe.hp;
CREW.tick([tank], {dt, stance:'aggressive', player:{x:0,z:0,hp:20,max:20}, foes:[foe], allies:[], blockers:[]});
ok(foe.hp<before, 'the tank hits on its own timer');
ok(foe.threat>=4, 'the bruiser taunts');

const kit={name:'Kit', role:'ranged', x:foe.x-1, z:foe.z, hp:20, max:20, cd:0};
const wolf2={id:'wolf2', x:foe.x, z:foe.z, hp:30, max:30, threat:0};
const kitStart=Math.hypot(kit.x-wolf2.x, kit.z-wolf2.z);
for(let i=0;i<12;i++) CREW.tick([kit], {dt, stance:'aggressive', player:{x:0,z:0,hp:20,max:20}, foes:[wolf2], allies:[], blockers:[]});
const kitDist=Math.hypot(kit.x-wolf2.x, kit.z-wolf2.z);
ok(kitDist>kitStart+0.4, 'the archer opens the distance ('+kitDist.toFixed(2)+')');
ok(kitDist>3.2, 'the archer does not stand in the wolf\'s teeth');
ok(wolf2.hp<30, 'the bow still lands while Kit keeps away');

const lyra={name:'Lyra', role:'support', x:0, z:0, hp:20, max:20, cd:9, healCd:0, spellCd:9, buffCd:9};
const hurt={id:'Juno', name:'Juno', x:1, z:0, hp:8, max:20};
CREW.tick([lyra], {dt, stance:'passive', player:{x:0,z:0,hp:20,max:20}, foes:[], allies:[hurt, lyra], blockers:[]});
ok(hurt.hp>8, 'Lyra heals the lowest ally under half');

const box={x:2, z:0, hw:0.6, hd:0.6};
const walker={name:'Juno', role:'tank', x:0, z:0, hp:20, max:20, cd:9};
CREW.tick([walker], {dt:0.2, stance:'passive', player:{x:6,z:0,hp:20,max:20}, foes:[], allies:[], blockers:[box]});
ok(Math.abs(walker.x-box.x)>box.hw||Math.abs(walker.z-box.z)>box.hd, 'a blocked step slides off the wall');

const shy={name:'Kit', role:'ranged', x:0, z:0, hp:20, max:20, cd:0};
const near={id:'rat', x:3, z:0, hp:10, max:10};
const xShy=shy.x;
CREW.tick([shy], {dt, stance:'passive', player:{x:0,z:0,hp:20,max:20}, foes:[near], allies:[], blockers:[]});
ok(near.hp===10&&Math.abs(shy.x-xShy)<0.5, 'passive crew do not run in');

const back={name:'Juno', role:'tank', x:5, z:0, hp:4, max:20, cd:0};
const bully={id:'ogre', x:6, z:0, hp:20, max:20};
CREW.tick([back], {dt, stance:'aggressive', player:{x:0,z:0,hp:20,max:20}, foes:[bully], allies:[], blockers:[]});
ok(back.x<5&&bully.hp===20, 'under 30% they walk back and do not swing');

const a={id:'a', x:2, z:0, hp:3, max:20, threat:1};
const b={id:'b', x:3, z:1, hp:20, max:20, threat:0};
const hunter={name:'Juno', role:'tank', x:1, z:0, hp:20, max:20, cd:0, target:'a'};
CREW.tick([hunter], {dt, stance:'aggressive', player:{x:0,z:0,hp:20,max:20}, foes:[a,b], allies:[], blockers:[]});
a.hp=0;
CREW.tick([hunter], {dt, stance:'aggressive', player:{x:0,z:0,hp:20,max:20}, foes:[a,b], allies:[], blockers:[]});
ok(hunter.target==='b', 'they switch when the first foe drops');

const pal={id:'you', x:1, z:0, hp:12, max:20};
const bad={id:'you', x:1.2, z:0, hp:12, max:20};
const guard={name:'Juno', role:'tank', x:1.1, z:0, hp:20, max:20, cd:0};
CREW.tick([guard], {dt, stance:'aggressive', player:pal, foes:[bad], allies:[pal], blockers:[]});
ok(pal.hp===12, 'a swing never lands on an ally');

console.log('tests_crew: '+n+' checks passed');
