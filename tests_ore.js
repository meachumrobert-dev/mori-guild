/* Ore names, old-save migration, and "where do I find it".
   Run: node tests_ore.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const O=require('./js/ores.js');

const names=[];
for(let i=0;i<16;i++){
  const id=O.starter(i);
  const k=O.kind(id);
  ok(k && k.name!=='Ore' && !/^ore$/i.test(k.name), 'quarry rock '+i+' is '+k.name+', not Ore');
  ok(O.worldLabel(id)===k.name, 'world label uses the ore name');
  ok(O.prompt(id).indexOf(k.name)>=0 && O.prompt(id).indexOf('Mine')>=0, 'hover prompt names the ore');
  ok(O.tip(id).indexOf(k.name)>=0, 'tooltip names the ore');
  ok(O.gatherLine(id, 2, 'Grey Quarry').indexOf(k.name)>=0 && O.gatherLine(id, 2, 'Grey Quarry').indexOf('Grey Quarry')>=0, 'gather message names the ore');
  names.push(k.name);
}
ok(names.indexOf('Bog Iron Ore')>=0 && names.indexOf('Copper Ore')>=0 && names.indexOf('Tin Ore')>=0, 'the quarry has bog iron, copper, and tin');
ok(names.indexOf('Zinc Ore')>=0 && names.indexOf('Manganese Ore')>=0 && names.indexOf('Nickel Ore')>=0 && names.indexOf('Clay')>=0, 'the quarry has zinc, manganese, nickel, and clay');
ok(names.indexOf('Ore')<0, 'no quarry rock is still called Ore');

const fresh={ore:6, reag:{ore:2, copper_ore:1}, inv:[{name:'Ore', qty:3},{name:'Ore', kind:'ore'},{name:'Copper Ore', kind:'ore', rid:'copper_ore', qty:4},{name:'Sword', kind:'weapon'}]};
O.migrate(fresh);
ok(fresh.vOre===1 && fresh.ore===0 && fresh.reag.ore==null, 'the generic counter is cleared');
ok(fresh.reag.bog_iron_ore===6+2+3+1, 'counts move to Bog Iron Ore without being dropped ('+fresh.reag.bog_iron_ore+')');
ok(fresh.reag.copper_ore===1, 'typed reagent stacks stay');
ok(fresh.inv.length===2 && fresh.inv.some(i=>i.name==='Copper Ore') && fresh.inv.some(i=>i.name==='Sword'), 'a typed ore item and other gear stay in the bag');
const again=JSON.parse(JSON.stringify(fresh));
O.migrate(again);
ok(again.reag.bog_iron_ore===fresh.reag.bog_iron_ore, 'migration does not run twice');

const empty={ore:0, inv:[{name:'Bandage'}], reag:{}};
O.migrate(empty);
ok(empty.reag.bog_iron_ore==null && empty.inv.length===1, 'a save with no generic ore is left alone');

const tin=O.whereLine('where do I find tin ore', {x:0, z:8, nodes:[{rid:'tin_ore', x:-30, z:-10, region:'the Grey Quarry, Thalulfall Reach', ready:true}]});
ok(/tin ore/.test(tin) && /west/.test(tin) && /Grey Quarry/.test(tin), 'tin answers with type, direction, and region: '+tin);
const bog=O.whereLine('where do I find iron', {x:0, z:0, nodes:[{rid:'bog_iron_ore', x:0, z:-40, region:'the Grey Quarry, Thalulfall Reach'}]});
ok(/bog iron ore/.test(bog) && /north/.test(bog), 'plain iron means the bog-iron node: '+bog);
const iron=O.whereLine('where is iron ore', {x:0, z:0, nodes:[{rid:'iron_ore', x:40, z:0, region:'a mountain in the north'}]});
ok(/iron ore/.test(iron) && !/bog iron/.test(iron) && /east/.test(iron) && /mountain/.test(iron), 'iron ore stays the mountain metal: '+iron);
const oak=O.whereLine('where do I find oak', {x:0, z:0, nodes:[{rid:'oak_log', x:20, z:30, region:'the Old Wood, Thalulfall Reach'}]});
ok(/oak log/.test(oak) && /south-east/.test(oak) && /Old Wood/.test(oak), 'oak answers with the wood and the region: '+oak);
const mint=O.whereLine('where do I find mint', {x:0, z:0, nodes:[{rid:'mint', x:-12, z:28, region:'the Herb Meadow, Thalulfall Reach'}]});
ok(/mint/.test(mint) && /Herb Meadow/.test(mint), 'mint answers with the meadow: '+mint);
const gone=O.whereLine('where do I find nickel', {nodes:[], x:0, z:0});
ok(/nickel ore/.test(gone) && /mountain/.test(gone), 'a missing node still names the ore and a region: '+gone);
ok(O.whereLine('who rules here')==null, 'a rule question is not an ore question');
ok(O.mention('where do I find clay').id==='clay', 'clay is its own yield');

console.log('tests_ore: '+n+' checks passed');
