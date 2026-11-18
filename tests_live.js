/* A new world stays lit. Labels go away. Broken buffs do not linger.
   Run: node tests_live.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const RESEED=require('./js/reseed.js');
const TAGS=require('./js/tags.js');
const EFFECTS=require('./js/effects.js');
const NEWWORLD=require('./js/newworld.js');

const broken={bless:0, dread:NaN, forever:Infinity, weedwake:12, note:'no'};
const cleaned=EFFECTS.scrub(broken);
ok(cleaned.dropped.length>=3&&broken.weedwake===12&&broken.bless==null, 'zero, NaN, and endless effects are dropped');
EFFECTS.tick(broken, 13);
ok(broken.weedwake==null, 'a buff expires when its seconds run out');
const bag=[{name:'Zero-Return Band', fx:{zeroKeep:1}, equipped:true},{name:'Zero-Return Band', fx:{zeroKeep:1}, equipped:true}];
ok(EFFECTS.rings(bag).worn===1&&bag[1].equipped===false, 'a second Zero-Return Band comes off');
ok(EFFECTS.aura({}, false)===false&&EFFECTS.aura({dread:4}, false)===true, 'the green aura needs a live dread timer');
EFFECTS.dismiss(broken, 'dread');
ok(!EFFECTS.aura({dread:0}, false), 'dismissing dread turns the streaks off');

const tag=TAGS.fresh();
TAGS.show(tag, {id:'hat', text:'+5 HAT (knockoff)', dist:2, max:6});
ok(tag.shown&&tag.text.indexOf('HAT')>=0, 'a nearby item shows one label');
TAGS.show(tag, {id:'hat', text:'+5 HAT (knockoff)', dist:30, max:6});
ok(!tag.shown, 'the label goes when the item is far');
TAGS.show(tag, {id:'feather', text:'Feather Token', dist:1, max:6});
TAGS.pickup(tag, 'feather');
ok(!tag.shown&&tag.id==null, 'pickup clears that label');
TAGS.show(tag, {id:'ore', text:'Bog iron', dist:1, max:6, menu:true});
ok(!tag.shown, 'a menu clears the label');

const dark=RESEED.sky(undefined, 0.05);
ok(Number.isFinite(dark.clock)&&dark.light>0.2, 'a missing clock comes back as daylight');
const noon=RESEED.sky(40, 0.05);
ok(noon.day>0.5&&noon.sun>1, 'daytime keeps the sun on');
const hurt=RESEED.stages({
  terrain(){ return {chunks:4, ground:true, lights:true}; },
  roads(){ throw new Error('road mesh'); },
  villages(){ return {chunks:1, ground:true, lights:true}; }
});
ok(hurt.errors.indexOf('roads')>=0&&hurt.chunks>=4&&hurt.ground&&hurt.lights, 'a failed road stage does not take the ground');
ok(RESEED.jobTimeout({t:20, dur:5})&&!RESEED.jobTimeout({t:3, dur:5}), 'a seed job that overruns is abandoned');

const made=NEWWORLD.apply({gold:12, clock:undefined, inv:[], buffs:{bless:0}}, 'bramble', {confirm:true});
ok(made.save.clock===40&&made.save.gold===12, 'a new world starts at daytime and keeps the pack');

const ctx={console};
ctx.window=ctx; ctx.globalThis=ctx;
ctx.document={
  createElement(){ return {style:{}, width:8, height:8, classList:{add(){},remove(){}}, appendChild(){}, setAttribute(){}, getContext(){ return {fillStyle:'', font:'', fillRect(){}, fillText(){}, strokeRect(){}, beginPath(){}, arc(){}, fill(){}}; }}; },
  body:{appendChild(){}, classList:{add(){},remove(){},contains(){return false}}}
};
vm.createContext(ctx);
function load(p){ vm.runInContext(fs.readFileSync(p,'utf8'), ctx, {filename:p}); }
['vendor/three-r170.min.js','js/hero.js','js/planet.js','js/lumber.js','js/ores.js','js/roads.js','js/portals.js','js/grounded.js','js/houses.js','js/recipes.js','js/seedworld.js'].forEach(load);
const scene=new ctx.THREE.Scene();
scene.add(new ctx.THREE.HemisphereLight('#cfe8ff','#3a5a2a',1));
scene.add(new ctx.THREE.DirectionalLight('#fff2d0',2));
const reg={};
ctx.SEEDWORLD.init({scene, mobile:true, v2height:()=>0, stage:id=>reg[id]||0, explored:()=>true, guildId:()=>ctx.PLANET.startRegion(), tf:null, siteHook:()=>{}, houseCell:()=>4});
const seeds=['mori','alpha','beta','gamma','delta','north','oak','thorn','river','seed-9','play-3'];
seeds.forEach(seed=>{
  ctx.PLANET.setSeed(seed);
  const g=ctx.PLANET.startRegion();
  Object.keys(reg).forEach(k=>delete reg[k]);
  reg[g]=1;
  ctx.SEEDWORLD.setFrame(g, true);
  let built=0;
  for(let t=0;t<6;t++) built+=ctx.SEEDWORLD.update(0,8,4)||0;
  const y=ctx.SEEDWORLD.heightAt(0,8);
  const lights=scene.children.filter(o=>o.isLight).length;
  ok(ctx.SEEDWORLD.chunkCount>0&&Number.isFinite(y)&&lights>=2, seed+' has ground, chunks, and lights ('+ctx.SEEDWORLD.chunkCount+' chunks)');
});

console.log('tests_live: '+n+' checks passed');
