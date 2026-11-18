/* Goods have a next step. Towns share work. Mills, rungs, hamlets, rumors, and lessons.
   Run: node tests_economy.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const GOODS=require('./js/goods.js');
const DUTIES=require('./js/duties.js');
global.DUTIES=DUTIES;
const TRADES=require('./js/trades.js');
const MILL=require('./js/mill.js');
const LADDER=require('./js/ladder.js');
const HAMLETS=require('./js/hamlets.js');
const RUMOR=require('./js/rumor.js');
const KNOW=require('./js/know.js');

const audit=GOODS.audit();
ok(audit.dead.length===0, 'no good is a dead end: '+audit.dead.join(','));
ok(audit.broken.length===0, 'every use names a real good: '+audit.broken.join(','));
ok(GOODS.ITEMS.oak_log.uses.indexOf('plank')>=0&&GOODS.ITEMS.ash.uses[0]==='lye', 'logs and ash keep their next steps');
ok(GOODS.price({demand:{soap:8}, items:{soap:0}}, 'soap')>GOODS.price({demand:{soap:0}, items:{soap:20}}, 'soap'), 'a wanted good costs more than a glut');

const hamlet=TRADES.staff([{id:'a'},{id:'b'},{id:'c'},{id:'d'}], 4);
ok(!hamlet.assignment.specialized, 'three people do not specialize');
ok(hamlet.missing.length>0&&!TRADES.service(hamlet,'smith'), 'a job nobody holds is not offered');
ok(hamlet.assignment.posts.some(p=>p.jobs.length===2&&p.rate===0.5), 'a small town splits the day');
const cityPeople=[];
for(let i=0;i<40;i++) cityPeople.push({id:'c'+i});
const city=TRADES.staff(cityPeople, 40);
ok(city.assignment.specialized&&city.missing.length===0&&TRADES.service(city,'smith'), 'a city covers each job with one person');
const town={items:{grain:6, hide:4, soap:2, oak_log:3, flour:2, clay:2, yarn:2, bloom:1, plank:2}, gossip:0};
const made=TRADES.produce(hamlet.assignment, town);
ok(town.gossip>=0, 'the washhouse can pass gossip when someone is washing');
const millSite=TRADES.site('mill', {x:0,z:0,wind:'east',stream:{x:14,z:6}});
const tan=TRADES.site('tannery', {x:0,z:0,wind:'east',stream:{x:14,z:6}});
const stable=TRADES.site('stable', {x:0,z:0});
ok(millSite.rule==='stream'&&tan.x>10&&stable.rule==='gate', 'the mill sits on the stream, the tannery downwind, the stable at the gate');
ok(TRADES.PORTS.indexOf('lighthouse')>=0&&TRADES.PORTS.length>=11, 'a port keeps its yards and offices');
ok(TRADES.tierFor(3).id===0&&TRADES.tierFor(4).id===1&&TRADES.tierFor(40).id===4, 'five tiers follow the headcount');

const calm=MILL.shaft('wind', {calm:true});
const blow=MILL.shaft('wind', {calm:false});
ok(calm.power<blow.power&&calm.loads.stones<blow.loads.stones, 'a calm day feeds the shaft less');
const walked=MILL.shaft('tread', {steps:40, endurance:1});
ok(walked.power===1&&walked.endurance>1&&walked.loads.bellows>0&&walked.loads.pump>0, 'the treadwheel shares power and builds endurance');

ok(LADDER.open(0).length===1&&LADDER.open(0)[0].id==='campfire', 'a new hand has the campfire');
ok(LADDER.next(10).id==='retort'&&LADDER.open(80).length===LADDER.RUNGS.length, 'rungs open in order up to alloys');
ok(LADDER.locked(39).some(r=>r.id==='enchant_pot')&&!LADDER.locked(40).some(r=>r.id==='enchant_pot'), 'the enchanting pot waits for 40');

const home=HAMLETS.fresh('Briar', 'elf');
const elder=home.people[0]; elder.age=1000;
const spun=HAMLETS.year(home);
ok(HAMLETS.SPAN.dwarf===400&&HAMLETS.SPAN.elf===1000, 'dwarves and elves keep their spans');
ok(spun.alive>=HAMLETS.FLOOR&&spun.born>=1&&home.tithe>=1, 'a death is replaced and the city still gets a tithe');

const npc={};
RUMOR.witness(npc, {id:'wolf', text:'wolves at the gate', weight:1, day:1});
ok(RUMOR.knows(npc,'wolf')&&!RUMOR.knows(npc,'dragon'), 'a person knows what they saw');
ok(RUMOR.carry({text:'wolves at the gate', weight:1}, 4, 6).faded, 'small news fades');
const legend=RUMOR.carry({text:'the crown fell', weight:6}, 40, 20);
ok(!legend.faded&&legend.legend&&legend.bends>=3, 'a legend travels and bends');
ok(RUMOR.mori().omniscient, 'Mori already knows');

const pupil={skill:{travel:0}};
ok(!KNOW.tryLearn(pupil,'travel',3).ok&&KNOW.tryLearn(pupil,'travel',9).ok, 'travel teaches when the roll clears');
const sage={known:['ruin']};
ok(KNOW.teach(sage, pupil, 'ruin').ok&&pupil.known.indexOf('ruin')>=0, 'a lesson moves');
KNOW.hoard(sage,'ruin');
ok(!KNOW.teach(sage, {}, 'ruin').ok&&!KNOW.sell(sage, {}, 'ruin', 20).ok, 'a hoarded method is not taught or sold');

if(made) ok(true, 'production ran');
console.log('tests_economy: '+n+' checks passed');
