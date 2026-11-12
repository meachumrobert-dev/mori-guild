/* Village loop. Stockpile caps, contract life, regard caps, taxes, workshop ceiling, old saves.
   Run: node tests_village.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const STOCK=require('./js/stockpile.js');
const ELDER=require('./js/elder.js');
const CONTRACTS=require('./js/contracts.js');
const REP=require('./js/reputation.js');
const TITHE=require('./js/tithe.js');
const WORK=require('./js/workshop.js');
const VILLAGE=require('./js/village.js');

const bare=STOCK.town('guild');
bare.demand.oak_beam=10000; bare.items.oak_beam=0;
const high=STOCK.price(bare,'oak_beam');
ok(high<=STOCK.baseOf('oak_beam')*STOCK.MAX+0.001, 'a shortage cannot push the price past the cap ('+high+')');
bare.items.oak_beam=100000;
const low=STOCK.price(bare,'oak_beam');
ok(low>=STOCK.baseOf('oak_beam')*STOCK.MIN-0.001, 'a glut cannot drop the price through the floor ('+low+')');
const purse=STOCK.town('sell');
purse.coin=100000; purse.demand.oak_beam=40;
let prev=STOCK.price(purse,'oak_beam');
for(let i=0;i<30;i++){ STOCK.sell(purse,'oak_beam',5); const now=STOCK.price(purse,'oak_beam'); ok(now<=prev+0.001, 'selling into the stockpile does not raise the price'); prev=now; }
ok(purse.items.oak_beam===150, 'sold goods land in the town stockpile');
ok(purse.coin>=0, 'the town does not go into debt to buy them');

const made=STOCK.town('craft');
made.items.bog_iron_ore=4;
const bloom=STOCK.produce(made, WORK.RECIPES.find(r=>r.id==='bog_bloom'));
ok(bloom.ok&&made.items.bog_iron_bloom===1&&made.items.bog_iron_ore===2, 'a crafter turns bog iron ore into a bloom');
ok(!STOCK.produce(made, WORK.RECIPES.find(r=>r.id==='black_powder')).ok, 'the stockpile will not brew black powder');

const elderTown=STOCK.town('guild');
const offer=ELDER.offer(elderTown);
ok(/40/.test(offer.text)&&/oak beam/.test(offer.text), 'the elder asks for the oak beams the town lacks: '+offer.text);
ok(ELDER.adventurer(true)===null, 'a town with a guild hall does not get a roadside contract from her');
const road=ELDER.adventurer(false);
ok(road&&road.specialty==='adventurer'&&/guild hall/.test(road.text), 'without a hall she posts an adventurer contract');
const steps=ELDER.nextSteps(elderTown,{hasHall:false});
ok(steps.length>=3&&/stockpile/.test(steps[0])&&/ceiling/.test(steps.join(' ')), 'what next names the stockpile and the tech ceiling');
ok(ELDER.nameFor('guild').indexOf('Elder ')===0, 'her name is a local title, not a borrowed person');

let c=CONTRACTS.blank({town:'guild', specialty:'merchant', kind:'deliver', item:'oak_beam', qty:40});
ok(c.stage==='player', 'the first delivery is the player\'s quest');
ok(CONTRACTS.handIn(c).stage==='board'&&c.done===1, 'after that it sits on the guild board');
CONTRACTS.handIn(c); const last=CONTRACTS.handIn(c);
ok(last.stage==='caravan'&&c.group>=2&&c.done===CONTRACTS.NEED, 'after N completions a caravan group runs it');
const dry=STOCK.town('road');
const missed=CONTRACTS.runCaravan(dry, c, 3);
ok(!missed.ok&&dry.slow===1, 'undelivered goods slow research');
dry.items.oak_beam=40;
ok(CONTRACTS.runCaravan(dry, c, 4).ok&&dry.items.oak_beam===0, 'a stocked caravan delivers');
ok(!CONTRACTS.runCaravan(dry, c, 4).ok, 'the same day does not run twice');
c.group=1;
c.lastDay=-1;
ok(CONTRACTS.runCaravan(dry, c, 5).why==='caravans travel in groups', 'a lone wagon does not count as a caravan');
const weekly=CONTRACTS.blank({schedule:'weekly'});
weekly.stage='caravan'; weekly.group=3; weekly.qty=1; weekly.item='oak_beam';
ok(!CONTRACTS.due(weekly, 3)&&CONTRACTS.due(weekly, 7), 'weekly jobs wait for the week mark');
ok(CONTRACTS.collateral(()=>0).chance===CONTRACTS.COLLATERAL_CAP, 'a scuffed crate stays inside the chance cap');
ok(CONTRACTS.collateral(()=>0.5)===null, 'most adventurer jobs do not scuff anything');
const mixed=[
  CONTRACTS.blank({kind:'deliver', specialty:'merchant'}),
  CONTRACTS.blank({kind:'guard', specialty:'mercenary'}),
  CONTRACTS.blank({kind:'clear', specialty:'adventurer'})
];
mixed.forEach(x=>x.stage='board');
ok(CONTRACTS.board(mixed,'merchant').every(x=>x.kind==='deliver'), 'merchant boards are caravan deliveries');
ok(CONTRACTS.board(mixed,'mercenary').every(x=>x.kind==='guard'), 'mercenary boards are guard jobs');
ok(CONTRACTS.board(mixed,'adventurer').every(x=>x.kind==='clear'), 'adventurer boards are threat clearings');
ok(CONTRACTS.TREE[CONTRACTS.TREE.length-1].name.toLowerCase().indexOf('ceiling')>=0, 'the shared tree ends at the powder ceiling');

const rep=REP.fresh();
REP.seed(rep,[{a:1,b:2,type:'ally'},{a:1,b:3,type:'rival'},{a:1,b:4,type:'vassal'},{a:1,b:5,type:'neutral'}]);
ok(REP.relation(rep,2,1)==='allied'&&REP.relation(rep,1,4)==='allied', 'allies and vassals seed as allied');
ok(REP.relation(rep,1,3)==='rival'&&REP.relation(rep,5,1)==='neutral', 'rivals and neutrals keep their place');
ok(!Object.keys(rep.rel).some(k=>rep.rel[k]==='war'), 'war is not invented from the city-state seed');
const day1=REP.shift(rep,'city','9',100,1);
ok(day1.applied===REP.DAY_CAP&&day1.value===REP.DAY_CAP, 'regard from quests stops at the daily cap');
ok(REP.shift(rep,'city','9',5,1).applied===0, 'the same day cannot add more');
ok(REP.shift(rep,'personal','pell',3,1).applied===3, 'another person is a separate cap');
ok(REP.shift(rep,'city','9',REP.DAY_CAP,2).applied===REP.DAY_CAP, 'the next day the cap opens again');
const mul=REP.priceMul(rep,'9');
ok(mul>=0.85&&mul<=1.2&&mul<1, 'city regard eases prices inside a cap ('+mul+')');
ok(REP.questOpen(rep,{city:{id:'9',min:100}})===false, 'a cold city does not offer the high quest');
ok(REP.questOpen(rep,{city:{id:'9',min:REP.DAY_CAP}})===true, 'enough regard opens the quest');

const taxed=STOCK.town('tax');
taxed.tax={coin:0.5, goods:0.04, labor:5}; taxed.coin=80; taxed.pop=30; taxed.happiness=70;
const beforePop=taxed.pop, beforeMood=taxed.happiness;
const bill=TITHE.apply(taxed);
ok(bill.heavy&&taxed.pop<beforePop&&taxed.happiness<beforeMood, 'overtaxing lowers population and happiness');
ok(taxed.pop>=TITHE.POP_FLOOR, 'population does not fall through the floor');
ok(TITHE.LADDER.join(',')==='knight,baron,count,duke,king', 'the ladder runs knight to king');
ok(TITHE.seasonHook(taxed).later===true, 'the seasonal realm sim is a hook, not this pass');

const bag={bog_iron_ore:2, wolf_pelt:1, mint:1, chamomile:1, oak_log:1};
ok(WORK.craft(bag,'bog_bloom').ok&&bag.bog_iron_bloom===1, 'the smithy blooms bog iron');
ok(WORK.craft(bag,'scraped_hide').ok&&bag.scraped_hide===1, 'the leather bench scrapes a hide');
ok(WORK.craft(bag,'traveler_tisane').ok&&bag.traveler_tisane===1, 'the herb bench steeps a tisane');
ok(WORK.craft(bag,'oak_beam').ok&&bag.oak_beam===1, 'a log becomes an oak beam');
ok(WORK.craft({charcoal:9},'black_powder').cap&&WORK.craft({resin:2,oil:2},'greek_fire').cap, 'black powder and Greek fire are the ceiling');

const old={gold:40, quests:{pell_seeds:{st:'active'}}, ore:6, inv:[{name:'Sword'}]};
VILLAGE.migrate(old);
ok(old.gold===40&&old.ore===6&&old.quests.pell_seeds.st==='active'&&old.inv[0].name==='Sword', 'an old save keeps gold, ore, quests, and gear');
ok(old.village&&old.village.towns.guild&&old.village.rep&&old.village.contracts, 'the old save grows a village record');
const coin=old.village.towns.guild.coin;
VILLAGE.migrate(old);
ok(old.village.towns.guild.coin===coin, 'migrating again does not reset the town');
const first=VILLAGE.ensureContract(old,'guild',true);
ok(first.stage==='player'&&first.qty===40, 'the elder\'s first job is a player delivery');
old.reag={oak_beam:40};
ok(VILLAGE.deliver(old, first.id).stage==='board', 'delivering it moves the job onto the board');
ok((old.reag.oak_beam||0)===0&&old.village.towns.guild.items.oak_beam===40, 'the beams move from the bag into the stockpile');
const html=VILLAGE.elderHTML(old,'guild',true);
ok(html.indexOf('What next')>=0&&html.indexOf('position:fixed')<0&&html.indexOf('data-craft="bog_bloom"')>=0, 'the elder panel is in-flow text with a workshop button');
ok(VILLAGE.boardHTML(old,'guild').indexOf('merchant')>=0, 'the guild board says it is the merchant specialty');
ok(VILLAGE.repHTML(old).indexOf(String(REP.DAY_CAP))>=0, 'the regard panel names the daily cap');
const voice=VILLAGE.answer(old,'guild',true);
ok(/elder /.test(voice)&&/what next/.test(voice), 'what next is answered in her voice: '+voice);

console.log('tests_village: '+n+' checks passed');
