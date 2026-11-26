/* Robert's batch: crew paths, gear, questions, realms.
   Run: node tests_batch.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const CREW=require('./js/crew.js');
const GEAR=require('./js/gear.js');
const ASK=require('./js/ask.js');
const REALM=require('./js/realm.js');
const CODEX=require('./js/codex.js');

const wall=(x,z)=>!(x>-1&&x<3&&z>3&&z<12);
const step=CREW.route(wall, 0, 0, 0, 16);
ok(step&&Math.abs(step.x)>2, 'a blocked corridor steps around the wall ('+(step&&step.x)+')');
ok(CREW.shouldRegroup(22, 0)&&CREW.shouldRegroup(2, 4)&&!CREW.shouldRegroup(6, 1), 'far or stuck crew regroup');
ok(CREW.pace(4.2, 10)>5.2&&CREW.pace(4.2, 1)===4.2, 'crew match the player when they fall behind');

const lyra={name:'Lyra', role:'support', x:0, z:0, hp:20, max:20, cd:9, healCd:9, spellCd:9, buffCd:0};
const far={id:'juno', x:40, z:0, hp:10, max:20};
CREW.tick([lyra], {dt:0.1, stance:'passive', player:{x:0,z:0,hp:20,max:20}, foes:[], allies:[far], blockers:[]});
ok(!far.bless, 'Lyra does not bless across 40 m');
const near={id:'you', x:3, z:0, hp:10, max:20};
lyra.buffCd=0; lyra.x=0;
CREW.tick([lyra], {dt:0.1, stance:'passive', player:near, foes:[], allies:[near], blockers:[]});
ok(near.bless===1, 'Lyra blesses someone in range');

const sc=GEAR.weaponOf('Masterwork Scimitar', 'medium');
ok(sc.die==='1d6'&&sc.threat===18&&GEAR.crits(18, sc.threat)&&!GEAR.crits(17, sc.threat), 'a scimitar is 1d6 and threatens on 18');
const small=GEAR.weaponOf('Longsword', 'small');
ok(small.die==='1d6', 'a small longsword steps down a die');
const bag=[];
const ring={name:'Ring of Protection +1', kind:'ring', value:8};
const force={name:'Ring of Force Shield', kind:'ring', value:20, fx:{ac:2}};
const shield={name:'Heavy Shield', kind:'shield', value:5};
ok(GEAR.canWear(bag, ring).ok&&GEAR.canWear([Object.assign({equipped:true}, ring)], force).ok, 'two rings can be worn');
ok(GEAR.bonusKind(force)==='shield'&&GEAR.bonusKind(shield)==='shield', 'a force shield is a shield bonus');
const ac=GEAR.stackAC([{kind:'shield', n:2},{kind:'shield', n:2},{kind:'deflection', n:1},{kind:'dex', n:2}]);
ok(ac.parts.shield===2&&ac.total===15, 'shield bonuses do not stack');
ok(GEAR.treasureLevel(4)===5, 'treasure level is one plus full clears');
const deep=GEAR.deepen({hp:30, max:30, ac:5, atk:3, dmgBonus:0}, 5);
ok(deep.hp>30&&deep.ac>5, 'a deeper foe is harder');
const bars={copper_bar:2, tin_bar:1};
ok(GEAR.smelt(bars,'bronze').ok&&bars.bronze_bar===1&&bars.copper_bar===0, 'bronze is two copper and one tin');
ok(!GEAR.smelt({copper_bar:2},'brass').ok, 'brass waits for zinc');
ok(GEAR.roundHp(26.849999999999987)===27, 'hit points display as a whole number');
const law=GEAR.mintLaw(['copper','bronze']);
const changed=GEAR.change({}, 'copper', 'bronze', 8, law);
ok(changed.ok&&changed.grams>0&&changed.fee>0, 'a mint changes copper for bronze and takes a fee');
ok(GEAR.armorSet('bronze').ac>0&&GEAR.rankFor(0)==='copper'&&GEAR.rankFor(32)==='silver', 'armor and ranks follow the metal ladder');

ok(ASK.question('what is a ring of force shield?')&&!ASK.question('forge a shield'), 'a question is not a forge order');
ok(/copper and tin/.test(ASK.answer('Mori, what is bronze?')), 'what is bronze answers, it does not shrug');
ok(/two/.test(ASK.answer('what is a ring of force shield?')), 'a force-shield question does not become a job');

const wild={};
ok(REALM.claimAt(wild, 'you', {x:4, z:8}).ok&&wild.at.x===4&&wild.stage==='stake', 'a claim remembers where it was planted');
ok(!REALM.claimAt({realmLaw:true}, 'you', {x:1,z:1}).ok, 'realm law blocks a claim inside a city');
REALM.grow(wild); REALM.grow(wild); REALM.grow(wild);
ok(wild.stage==='village', 'a stake grows toward a village');
ok(REALM.chapter({stage:'town'}).ok&&!REALM.chapter({stage:'hamlet'}).ok, 'a guild chapter wants a town');
ok(REALM.chapter({playerLand:true, stage:'stake'}).ok, 'your own land can hold a chapter');
const coast=REALM.waterFor('beach', false);
ok(coast.dock&&coast.yard&&REALM.waterFor('desert', true).kind==='well', 'coasts get a dock and a landlocked realm digs a well');
const town={capital:10};
REALM.compound(town, 100);
const capped=town.capital;
REALM.compound(town, 100);
ok(town.capital>10&&town.capital-capped<capped, 'trade compounds, then eases off');
ok(REALM.respawn({geo:1}, 3).ready, 'a wanted node comes back');

['skeleton','zombie','grayooze','monitor','firebeetle','wolf','direrat'].forEach(id=>{
  ok(CODEX.PAGES[id]&&CODEX.PAGES[id].cat==='bestiary', id+' has a codex page');
});

console.log('tests_batch: '+n+' checks passed');
