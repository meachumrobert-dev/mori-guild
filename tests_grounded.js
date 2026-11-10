/* Regression tests for the grounded world pass. Node only — no three.js.
   Run: node tests_grounded.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const context={console, Math, Date, performance:{now:()=>0}};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/js/planet.js','utf8'), context);
vm.runInContext(fs.readFileSync(__dirname+'/js/grounded.js','utf8'), context);
const G=context.GROUNDED, P=context.PLANET;
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }

/* planet scale is unchanged */
ok(P.COUNT===1536, '1536 regions');
ok(P.RADIUS_KM===3185, 'quarter-earth radius');

/* roof triangle: 30 degrees, run 4 */
const tri=G.pitchTriangle(4, Math.PI/6);
ok(Math.abs(tri.rise-4/Math.sqrt(3))<1e-9, 'rise = run * tan');
ok(Math.abs(tri.rafter-4/(Math.sqrt(3)/2))<1e-9, 'rafter = run / cos');
ok(tri.seam<1e-9, 'rafter matches the straight-line distance');
[22,34,42].forEach(deg=>{
  const spec=G.cottageFrame({w:4.2,d:3.6,wallH:2.5,pitch:deg*Math.PI/180});
  const roofs=spec.parts.filter(p=>p.kind==='roof');
  ok(roofs.length===2, 'two slopes');
  const ends=roofs.map(G.roofEnds);
  const ridgeA=ends[0][0].y>ends[0][1].y?ends[0][0]:ends[0][1];
  const ridgeB=ends[1][0].y>ends[1][1].y?ends[1][0]:ends[1][1];
  ok(Math.abs(ridgeA.y-ridgeB.y)<1e-6 && Math.abs(ridgeA.z)<1e-6 && Math.abs(ridgeB.z)<1e-6, 'slopes meet at one ridge');
  const eave=ends[0][0].y<ends[0][1].y?ends[0][0]:ends[0][1];
  ok(Math.abs(eave.y-spec.plateY)<1e-6, 'eave sits on the wall plate');
});
const wide=G.cottageFrame({w:6.2,d:5,wallH:2.6,pitch:0.6});
ok(wide.king && wide.parts.some(p=>p.kind==='king') && wide.parts.some(p=>p.kind==='tie'), 'long span gets a king post and tie');
const small=G.cottageFrame({w:3.4,d:3.0,wallH:2.4,pitch:0.55});
ok(!small.king && !small.mid, 'a short cottage does not invent extra posts');
ok(small.parts.some(p=>p.kind==='stone') && small.parts.some(p=>p.kind==='lintel'), 'foundation and a door header');

/* settlement */
function flat(){ return 12; }
function pond(x,z){ return Math.hypot(x-28,z)<7?-1:12; }
function plan(h, extra){
  let s=1;
  const rng=()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; };
  return G.planSettlement(Object.assign({
    rng, anchor:{x:0,z:0}, city:false, biome:'grass', heightAt:h, seaY:0,
    roadDist:()=>1e9, nearestRoad:()=>null, blocks:[], irrigationReach:36
  }, extra||{}));
}
const a=plan(flat), b=plan(flat);
ok(JSON.stringify(a)===JSON.stringify(b), 'same rng sequence, same village');
ok(a.plots.length>=3, 'a flat meadow gets several houses');
for(let i=0;i<a.plots.length;i++) for(let j=i+1;j<a.plots.length;j++) ok(!G.obbHit(a.plots[i], a.plots[j], 2.2), 'house footprints stay apart');
a.plots.forEach(p=>{
  ok(a.paths.some(seg=>Math.hypot(seg[0]-p.door.x, seg[1]-p.door.z)<0.2), 'each door starts a path');
  ok(! (0!=null && flat()<0.7), 'not in the water');
});
ok(a.farms.length>=1, 'grass near a well can grow a field');
a.farms.forEach(f=>{
  ok(f.haul<=46 && f.waterM<=36, 'haul and water probe stay inside the caps');
  ok(G.farmSuit('grass', f.waterM, 36).ok, 'farm suit agrees');
  ok(a.paths.some(seg=>Math.hypot(seg[0]-f.x,seg[1]-f.z)<0.2), 'the field has a haul path');
});
const dry=G.farmSuit('desert', 30, 26);
ok(!dry.ok, 'desert far from water is not a field');
const seep=G.farmSuit('desert', 6, 26);
ok(seep.ok, 'desert beside a seep can be a field');
const wetPlan=plan(pond);
wetPlan.farms.concat(wetPlan.plots).forEach(p=>ok(pond(p.x,p.z)>0.5, 'nothing is sited in the pond'));
const roadPlan=plan(flat, {biome:'grass', roadDist:(x,z)=>Math.abs(z), nearestRoad:()=>({d:0,px:0,pz:0,tx:1,tz:0})});
ok(roadPlan.form==='linear', 'a road makes a linear hamlet');
ok(roadPlan.plots.every(p=>Math.abs(p.z)>4), 'houses sit off the road');

/* flowers cluster; nodes are metadata */
P.setSeed('mori');
G.clearFlowerCache();
const fctx={seed:'mori', regionId:4, guild:false, rng:P.rngFor, biomeAt:()=>'grass'};
let node=null, nodeAt=null;
for(let i=0;i<40&&!node;i++){ const q=G.flowerNode(i,2,fctx); if(q){ node=q; nodeAt=i; } }
ok(node && node.meta && !node.type, 'a flower node is metadata, not a gather target');
ok(G.flowerNode(nodeAt,2,fctx).x===node.x, 'flower nodes are stable');
const pts=G.clusterPoints(node, 24, P.rngFor('mori','cl',1), ()=>true);
ok(pts.length>=8, 'a node grows a cluster');
const mean=pts.reduce((s,p)=>s+p.r,0)/pts.length;
ok(mean<node.radius*0.6, 'more stems near the node than at the rim');
let grassN=0, desertN=0;
G.clearFlowerCache();
for(let i=0;i<30;i++){ if(G.flowerNode(i,0,Object.assign({},fctx,{biomeAt:()=>'grass'}))) grassN++; }
G.clearFlowerCache();
for(let i=0;i<30;i++){ if(G.flowerNode(i,0,Object.assign({},fctx,{regionId:9,biomeAt:()=>'desert'}))) desertN++; }
ok(grassN>desertN, 'grass holds more flower nodes than desert');

/* ore veins follow geology and are patchy */
G.clearOreCache();
const octx={seed:'mori', regionId:2, rng:P.rngFor, biomeAt:()=>'mountain', elevAt:()=>2800};
let deps=0, beach=0;
for(let i=0;i<24;i++) if(G.oreNode(i,1,octx)) deps++;
G.clearOreCache();
for(let i=0;i<24;i++) if(G.oreNode(i,1,Object.assign({},octx,{biomeAt:()=>'beach',elevAt:()=>2}))) beach++;
ok(deps>beach+4, 'mountains hold more deposits than a beach');
G.clearOreCache();
const dep=G.oreNode(3,3,octx);
ok(dep && dep.meta, 'a deposit is metadata');
let inside=0, hits=0, cross=0, along=0;
for(let i=0;i<80;i++) for(let j=0;j<40;j++){
  const x=dep.x-dep.length/2+i*(dep.length/80), z=dep.z-dep.halfW*1.4+j*(dep.halfW*2.8/40);
  inside++; const hit=G.inVein(dep,x,z); if(hit){ hits++; cross+=Math.abs(hit.cross); along+=Math.abs(hit.along); }
}
const frac=hits/inside;
ok(frac>0.04 && frac<0.55, 'a vein is patchy, not a solid block or a dusting');
ok(hits>0 && cross/hits<dep.halfW && along/hits>cross/hits, 'hits stretch along the strike');
ok(!G.oreAt(dep.x+5000, dep.z+5000, octx), 'ore is not scattered far from a deposit');

/* tech graph */
ok(!G.implies('pottery','roof_tile') && !G.implies('pottery','clay_pipe') && !G.implies('pottery','mill'), 'a pot is not a pipe, a tile, or a mill');
ok(!G.implies('bronze','iron_bloom') && !G.implies('copper_fire','iron_bloom'), 'bronze does not imply iron');
ok(G.implies('iron_bloom','bellows') && G.implies('iron_bloom','bloomery'), 'iron needs bellows and a bloomery');
ok(G.techById('tan_bark').days>=14 && G.techById('plate').shifts>G.techById('leather_armor').shifts, 'leather takes days; plate takes more labor than leather armor');
ok(G.techById('plate').needs.indexOf('leather_armor')<0, 'leather armor is not the parent of plate');
const known=G.expandArts(['charcoal','clay_dig','pottery']);
ok(known.has('pottery') && !known.has('kiln'), 'expand drops an art whose needs are missing');
const taught=G.teachArt([...known], 'copper_fire', {via:'trade'});
ok(taught.ok && taught.dev===1, 'trade can teach a copper hearth once charcoal is known');
const iron=G.teachArt([...known], 'iron_bloom', {via:'trade'});
ok(!iron.ok && iron.reason==='prereq' && iron.missing.indexOf('bloomery')>=0, 'iron ore does not skip the furnace');
const lvl=G.teachArt([...known], 'pottery', {via:'level'});
ok(!lvl.ok && lvl.reason==='level', 'a character level grants no art');
const culture=G.teachArt(['hide_scrape','rawhide'], 'tan_bark', {via:'trade', teacherCulture:'hearthfolk'});
ok(!culture.ok && culture.reason==='culture', 'bark-tan needs a greenweald teacher');
const teacher=G.teachArt(['hide_scrape','rawhide'], 'tan_bark', {via:'teacher', teacherCulture:'greenweald'});
ok(teacher.ok, 'a matching teacher opens the culture art');
ok(!G.citySupportsStation(['pottery'], 'cast_iron').have, 'a pottery town does not support the iron station');
ok(G.citySupportsStation(['charcoal','copper_fire'], 'copper').have, 'a copper hearth supports the copper station');

/* crests and cultures */
ok(G.CREST.grand.subordinateCrests===4 && G.CREST.personal.bandSize===6 && G.CREST.hostIfFull===24, 'command span is 4 captains of 6');
const liege={subordinates:[{},{},{},{}]};
ok(!G.canAttach(liege,{kind:'personal'}).ok, 'a fifth captain does not fit');
ok(G.canAttach(liege,{kind:'ally'}).ok && !G.canAttach(liege,{kind:'ally'}).usesSlot, 'an ally keeps their own crest');
ok(G.canAttach({subordinates:[]},{kind:'teacher'}).ok && !G.canAttach({subordinates:[]},{kind:'teacher'}).usesSlot, 'a teacher is not a troop slot');
P.setSeed('mori');
const c1=G.cultureFor(12,'grass', P.rngFor('mori','civ',12));
const c2=G.cultureFor(12,'grass', P.rngFor('mori','civ',12));
ok(c1.dominant.id===c2.dominant.id && c1.minorities.indexOf(c1.dominant.id)<0, 'one stable dominant culture, minorities differ');
ok(c1.dominant.race && c1.dominant.id!=='human', 'culture ids are original labels');
const clan=G.civicProfile({id:3, biome:'taiga', gov:'clan', clan:true, rng:()=>0.2});
ok(clan.race==='undead catfolk' && clan.arts.indexOf('iron_bloom')<0, 'the Compact keeps its face and does not start with iron');

/* gather keys stay compatible */
ok(G.gatherKey('mori', 4, 2, -3, 1)==='mori|4|2,-3|1', 'depletion keys keep the old shape');

/* Delroth canon strings were not edited */
const hero=fs.readFileSync(__dirname+'/js/hero.js','utf8');
ok(hero.includes("skin:'#2a2a2f'") && hero.includes("+5 HAT") && hero.includes("eyeGlow:'#39ff6a'"), 'Delroth canon look is untouched');

console.log('tests_grounded: '+n+' checks passed');
