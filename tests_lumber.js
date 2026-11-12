/* Standing trees, species by region, and the lumber stages.
   Run: node tests_lumber.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
function load(file){ const c={console, Math, window:{}}; c.window=c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'), c, {filename:file}); return c; }
const L=load('js/lumber.js').LUMBER;
const G=load('js/grounded.js').GROUNDED;

const ids=Object.keys(L.SPECIES);
ok(ids.length>=8, 'pine, fir, spruce, oak, ash, maple, yew, and ironwood are all species');
['pine','fir','spruce'].forEach(id=>{ const s=L.species(id); ok(s.group==='soft' && s.uses.indexOf('fuel')>=0 && s.uses.indexOf('framing')>=0, id+' is an early softwood for framing and fuel'); });
['oak','ash','maple'].forEach(id=>{ const s=L.species(id); ok(s.group==='hard' && s.uses.indexOf('tools')>=0 && s.uses.indexOf('furniture')>=0, id+' is a hardwood for tools and furniture'); });
ok(L.species('oak').uses.indexOf('ships')>=0, 'oak is a ship wood');
ok(L.species('yew').uses.indexOf('bows')>=0 && L.shapeOf('yew')==='yew', 'yew is the bow wood and has its own shape');
ok(L.species('ironwood').group==='magic' && L.species('ironwood').tier>=3, 'ironwood is the later magical-tier wood');
ok(L.req(L.species('ironwood').tier)>L.req(L.species('pine').tier), 'ironwood takes a higher woodcutting level than pine');

const shapes={}; ids.forEach(id=>{ shapes[L.shapeOf(id)]=1; ok(L.SHAPE[L.shapeOf(id)], id+' has a draw shape'); });
ok(Object.keys(shapes).length>=4, 'softwood, hardwood, yew, and ironwood do not share one model');

function rnd(seed){ let a=seed>>>0; return function(){ a=(Math.imul(a,1664525)+1013904223)>>>0; return a/4294967296; }; }
['taiga','forest','jungle','grass','swamp','mountain','steppe'].forEach(biome=>{
  const a=L.annotate([[10,20,1]], biome, rnd(7), i=>'k'+i);
  const b=L.annotate([[10,20,1]], biome, rnd(7), i=>'k'+i);
  ok(a[0].choppable && a[0].log && a[0].key==='k0', biome+' trees are choppable');
  ok(a[0].species===b[0].species && a[0].respawn>0, biome+' picks the same species twice and grows back');
  ok(L.species(a[0].species).biomes.indexOf(biome)>=0, biome+' grows a species that belongs there ('+a[0].species+')');
});
const cold=L.annotate([[0,0,1],[1,1,1],[2,2,1],[3,3,1]], 'taiga', rnd(3), i=>'c'+i);
ok(cold.every(t=>L.species(t.species).group==='soft'||t.species==='yew'), 'a cold region leans on softwoods and yew, not a single decorative tree');
ok(cold.every(t=>t.choppable), 'every standing tree in the list can be chopped');

let id='pine_log', step=L.work(id,{skill:1, tech:[]});
ok(step.ok && step.stage==='split' && step.labor>=1, 'a log becomes split timber with labor, and no saw');
step=L.work(step.out,{skill:2, tech:[]});
ok(step.ok && step.stage==='hewn', 'split timber becomes a hewn beam');
const blocked=L.work(step.out,{skill:4, tech:[]});
ok(!blocked.ok && blocked.needTech==='saw', 'a sawn plank waits for the saw');
const low=L.work(step.out,{skill:2, tech:['saw']});
ok(!low.ok && low.needSkill===4, 'the saw still asks for the woodcutting level you earn by use');
step=L.work(step.out,{skill:4, tech:['saw']});
ok(step.ok && step.stage==='sawn', 'with the saw and the skill, a hewn beam becomes a sawn plank');
step=L.work(step.out,{skill:4, tech:['saw']});
ok(step.ok && step.stage==='seasoned' && step.days>=12, 'seasoned timber is the last stage and takes days');
ok(!L.work(step.out,{skill:8, tech:['saw']}).ok, 'seasoned timber is finished');

ok(G.techById('saw') && G.techById('saw').needs.indexOf('timber_join')>=0, 'the saw sits on the timber technology, not as a free recipe');
ok(L.respawnSeconds(0)===45 && L.respawnSeconds(3)>L.respawnSeconds(0), 'chopped trees grow back, and rarer wood takes longer');
const again=L.key('mori', 4, 1, 2, 0);
ok(again===L.key('mori', 4, 1, 2, 0) && again.indexOf('tree|')===0, 'a standing tree keeps one chop key');

console.log('tests_lumber: '+n+' checks passed');
