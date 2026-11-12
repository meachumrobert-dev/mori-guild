/* The world stays on screen. Occlusion may hide a small prop behind another
   building. It must not hide the ground, a chunk, or a building's own door,
   and a fresh or pre-PR5 save must still render that ground.
   Run: node tests_world.js */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }

function Box3(){}
Box3.prototype.setFromObject=function(obj){
  const b=obj.userData.box;
  this.min={x:b[0], y:b[1], z:b[2]};
  this.max={x:b[3], y:b[4], z:b[5]};
  return this;
};
Box3.prototype.isEmpty=function(){ return this.max.x<this.min.x; };

const ctx={console, Math, performance:{now:()=>0}};
ctx.window=ctx;
ctx.THREE={Box3};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/occlusion.js'),'utf8'), ctx, {filename:'js/occlusion.js'});
const O=ctx.OCCLUSION;

function mesh(name, box, extra){
  const o={name, visible:true, isLight:false, children:[], parent:null, userData:Object.assign({box}, extra||{})};
  return o;
}
function adopt(parent, child){ child.parent=parent; parent.children.push(child); return child; }

const hall=mesh('hall', [-6,0,-16, 6,7,-9], {frame:true});
const door=adopt(hall, mesh('frame_door', [-0.8,0,-9.4, 0.8,2.4,-9.05]));
const gable=adopt(hall, mesh('Mesh', [-0.2,3,-12, 0.2,6,-11.6]));
const land=mesh('land', [-32,0,-32, 32,1,32], {terrain:true, noCull:true});
const root=mesh('world', [-80,0,-80, 80,4,80], {sw:true});
const stuck=mesh('stuck-ground', [-2,0,6, 2,0.4,10], {sw:true, _occ:1});
stuck.visible=false;
const crate=mesh('crate', [30,0,30, 31,1,31]);
const wall=mesh('other-house', [20,0,20, 28,6,28]);
const scene={children:[hall, land, root, stuck, crate, wall]};
const camera={position:{x:0, y:5, z:16}};

ok(O.exempt(land) && O.exempt(door) && O.exempt(gable) && O.exempt(root), 'ground, doors, and framed buildings are exempt');
ok(!O.exempt(crate) && !O.exempt(wall), 'a loose crate can still be tested');
ok(O.sameBuild(door, hall) && O.sameBuild(gable, door), 'a door and its wall are the same building');
ok(!O.sameBuild(door, wall) && !O.sameBuild(crate, wall), 'a crate across the yard is a different object');
const hallBox={min:[-6,0,-16], max:[6,7,-9], obj:hall};
ok(!O.occluded(camera.position, {x:0,y:1.2,z:-9.2}, [hallBox], 2.2, door), 'the hall box does not occlude its own door');
const wallBox={min:[20,0,20], max:[28,6,28], obj:wall};
ok(O.occluded(camera.position, {x:30.5,y:0.5,z:30.5}, [wallBox], 2.2, crate), 'a different building still blocks a crate behind it');

for(let i=0;i<6;i++) O.update(scene, camera, {far:200, budget:16, heightAt:()=>0});
ok(land.visible && !land.userData._occ, 'a terrain mesh stays visible');
ok(root.visible && !root.userData._occ, 'the world root stays visible');
ok(stuck.visible && !stuck.userData._occ, 'ground that occlusion had hidden is shown again');
ok(door.visible && !door.userData._occ && gable.visible && !gable.userData._occ, 'the hall door and gable stay visible');
ok(!crate.visible && crate.userData._occ===1, 'a crate behind another building is still hidden');
ok(O.viewOffset(0, 8, 0, 16).shifted===false && O.viewOffset(0, 8, 0, 16).sx===0, 'the guild spawn does not rebase the world');
const back=O.viewOffset(5000, 0, 5016, 0);
ok(back.shifted && back.sx===-5000 && Math.abs(back.cx)<30, 'a far camera is shifted and then the caller can put it back');

console.log('tests_world logic: '+n+' checks');

const OLD_SAVE=JSON.stringify({
  v:1, life:6, larpy:2, gold:40, herbs:3, ore:1, timber:5, hp:16,
  inv:[{id:'band_starter',name:'Linen Bandage',cat:'Bandage',kind:'bandage',value:1,fx:{hot:{pps:1,dur:8},healCheck:true}},{id:'p1',name:'Grey Recovery Draught',cat:'Potion',kind:'potion',tier:'grey',bonus:0,value:40,fx:{hot:{pps:3,dur:12}}}],
  dyes:['Holo Pink','Starter Brown'], templates:['Armor: Base'], instruments:[],
  outpost:{}, structs:[], jobs:[], trust:true, builds:2, clock:80,
  player:{x:0,z:8,yaw:0.2}, hatEgg:false, blue:false, buffs:{}, clears:1,
  nid:4, follower:false, planIdx:1, crafted:1, house:null, crafting:[], xpSpent:0,
  seed:'mori', worlds:{mori:{reg:{},exp:{},tf:{}}}, at:null, sugN:1,
  hotbar:{bandage:true,potion:true,salve:true},
  gather:{t:40, skills:{herbalism:1,mining:0,woodcutting:2}, dep:{}}, reag:{}
});

async function boot(browser, w, h, touch, save){
  const page=await browser.newPage();
  page.setDefaultTimeout(30000);
  const errs=[];
  page.on('pageerror', e=>errs.push(String(e)));
  page.on('console', msg=>{
    if(msg.type()!=='error') return;
    const t=msg.text();
    if(/favicon|dict\.json|CORS policy|ERR_FAILED/i.test(t)) return;
    errs.push(t);
  });
  await page.setViewport({width:w, height:h, isMobile:!!touch, hasTouch:!!touch});
  const url='file://'+path.join(__dirname,'index.html')+'?quality=low';
  await page.goto(url, {waitUntil:'domcontentloaded'});
  await page.evaluate(raw=>{ localStorage.clear(); if(raw) localStorage.setItem('mori_guild3d_v3_save', raw); }, save);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g&&window.__g.SW&&window.__g.renderer);
  await new Promise(r=>setTimeout(r, 2500));
  const snap=await page.evaluate(()=>{
    const g=window.__g;
    let terrain=0, terrainHidden=0, alpha0=0, frames=0, framesHidden=0;
    g.scene.traverse(o=>{
      const u=o.userData||{};
      if((u.terrain||u.sw)&&o.isMesh){
        terrain++;
        if(!o.visible||u._occ) terrainHidden++;
        const m=o.material;
        if(m&&m.transparent&&m.opacity!=null&&m.opacity<0.05) alpha0++;
      }
      if(o.name&&String(o.name).indexOf('frame_')===0){
        let up=o.parent, blocked=false;
        while(up){ if(!up.visible&&!(up.userData&&up.userData._occ)) blocked=true; up=up.parent; }
        if(!blocked){ frames++; if(!o.visible||u._occ) framesHidden++; }
      }
    });
    const info=g.renderer.info.render;
    return {
      terrain, terrainHidden, alpha0, frames, framesHidden,
      chunks:g.SW.chunks.size,
      tris:info.triangles, calls:info.calls,
      scene:[g.scene.position.x, g.scene.position.y, g.scene.position.z],
      bars:!!(g.S.bars&&g.S.bars.pages),
      stage:g.stageOf(g.guildId),
      player:!!(g.player.model&&g.player.model.visible)
    };
  });
  await page.close();
  return {snap, errs};
}

async function browserHalf(){
  let puppeteer; try{ puppeteer=require('puppeteer-core'); }catch(e){ console.log('browser half skipped'); return; }
  const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader']});
  const cases=[
    ['desktop fresh', 1280, 720, false, null],
    ['phone fresh', 844, 390, true, null],
    ['desktop old save', 1280, 720, false, OLD_SAVE],
    ['phone old save', 844, 390, true, OLD_SAVE]
  ];
  for(const [label,w,h,touch,save] of cases){
    const {snap, errs}=await boot(browser, w, h, touch, save);
    ok(errs.length===0, label+' loads with no console error'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
    ok(snap.chunks>8 && snap.terrain>8, label+' has terrain meshes ('+snap.chunks+' chunks, '+snap.terrain+' meshes)');
    ok(snap.terrainHidden===0 && snap.alpha0===0, label+' terrain is visible and not faded out (hidden '+snap.terrainHidden+', alpha0 '+snap.alpha0+')');
    ok(snap.tris>5000 && snap.calls>20, label+' rendered the world ('+snap.tris+' tris, '+snap.calls+' draws)');
    ok(snap.frames>0 && snap.framesHidden===0, label+' building frames stay visible ('+snap.frames+' frames, '+snap.framesHidden+' hidden)');
    ok(snap.scene[0]===0 && snap.scene[1]===0 && snap.scene[2]===0, label+' leaves the world group at the origin');
    ok(snap.bars && snap.player && snap.stage>=1, label+' keeps the guild, the player, and a migrated hotbar');
    console.log(label+': chunks '+snap.chunks+' terrain '+snap.terrain+' frames '+snap.frames+' tris '+snap.tris+' stage '+snap.stage);
  }
  await browser.close();
}

browserHalf().then(()=>{ console.log('tests_world: '+n+' checks'); }).catch(e=>{ console.error(e); process.exit(1); });
