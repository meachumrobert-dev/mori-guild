/* Mori Guild 3D — game logic. Classic script (no modules) so it runs from file:// on desktop and phones. */
(function(){
'use strict';
const T=THREE, W=WORLD, $=id=>document.getElementById(id);
const IS_TOUCH=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
if(IS_TOUCH) document.body.classList.add('touch');
const SAVE_KEY='mori_guild3d_v3_save', CHAR_KEY='mori_guild3d_chars';
const store={ get(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };

/* ---------- renderer ---------- */
const canvas=$('c');
const renderer=new T.WebGLRenderer({canvas, antialias:!IS_TOUCH, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, IS_TOUCH?1.25:1.75));
renderer.shadowMap.enabled=!IS_TOUCH; renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;
const camera=new T.PerspectiveCamera(55,1,0.1,900);
function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); if(crCam){ crCam.aspect=w/h; crCam.updateProjectionMatrix(); } if(window.PHONE&&typeof refreshPhone==='function') refreshPhone(); }

/* ---------- state ---------- */
const DYES=[{name:'Gothic Rose',hex:'#ff4d6d'},{name:'Holo Pink',hex:'#ff8af0'},{name:'Obsidian Black',hex:'#1a1a1f'},{name:'Legion Cyan',hex:'#22d3ee'},{name:'Void Purple',hex:'#8b5cf6'},{name:'Mori Lime',hex:'#a3ff12'},{name:'Guild Gold',hex:'#facc15'},{name:'Ectoplasm',hex:'#7fffd4'},{name:'Starter White',hex:'#efe6d2'},{name:'Starter Brown',hex:'#6b4a2b'}];
const TEMPLATES=['Armor: Base','Hair: Wolfcut','Leather: Corset','Armor: Pauldron','Boots: Stomper','Tape: Star Measure'];
const INSTRUMENTS=['Lute: Lament','Drum: Heartbeat','Synth: Hologram'];
function freshState(){ return {v:1, life:0, larpy:3, gold:60, herbs:1, ore:0, timber:0, hp:20, inv:[{id:'band_starter',name:'Linen Bandage',cat:'Bandage',kind:'bandage',value:1,fx:{hot:{pps:1,dur:8},healCheck:true}},{id:'p1',name:'Grey Recovery Draught',cat:'Potion',kind:'potion',tier:'grey',bonus:0,value:40,fx:{hot:{pps:3,dur:12}}},{id:'p2',name:'Potion of Cure Light Wounds',cat:'Potion',kind:'potion',bonus:0,value:50,fx:{heal:'1d8+1'}}], dyes:['Holo Pink','Void Purple','Obsidian Black','Starter White','Starter Brown'], templates:['Armor: Base','Hair: Wolfcut'], instruments:[],
  outpost:{}, structs:[], jobs:[], trust:true, builds:0, clock:40, player:{x:0,z:8,yaw:0}, hatEgg:false, blue:false, buffs:{}, clears:0, nid:1, follower:false, planIdx:0, crafted:0, house:null, crafting:[], xpSpent:0, seed:'mori', worlds:{}, at:null, sugN:0}; }
let S=Object.assign(freshState(), store.get(SAVE_KEY)||{});
S.inv.forEach(i=>{ if(i.mw&&i.cat==='Forged'&&i.kind==='weapon'&&i.bonus===1) i.bonus=0; }); // v3.1: masterwork weapons are +1 to hit only
if(!S.v32){ S.v32=1; // v3.2: SRD armor AC by type (no double-counted enhancement / masterwork), shields are their own slot, 1 gold = 1 gp
  S.inv.forEach(i=>{ if(i.cat==='Forged'&&i.kind==='armor'&&/Chain Shirt/.test(i.name)) i.bonus=0; if(i.cat==='Forged'&&i.kind==='shield'&&i.fx) delete i.fx.ac;
    if(i.kind==='armor'&&/Shield|Buckler/i.test(i.name)) i.kind='shield';
    if(i.crafted&&(i.kind==='armor'||i.kind==='weapon')){ const fx={}; (i.spells||[]).forEach(n=>{ const k=Object.keys(CRAFT.SPELLS).find(k=>CRAFT.SPELLS[k].name===n); const f=k?CRAFT.SPELLS[k].fx||{}:{}; for(const q in f) fx[q]=(fx[q]||0)+f[q]; }); i.fx=fx; if(i.kind==='armor'&&!i.armorType) i.armorType=/Leather/i.test(i.name)?'Leather':/Breastplate/i.test(i.name)?'Breastplate':'Chain Shirt'; if(i.kind==='weapon') i.mw=true; } }); }
if(!S.dun) S.dun={};
if(!S.v38){ S.v38=1; if(!S.craftSkills) S.craftSkills={alchemy:0,smithing:0,enchanting:0,heal:0,jewelry:0}; if(!S.stations) S.stations={pot:'clay',forge:'cast_iron',unlocked:['clay','cast_iron'],enchantForge:false,enchantCircle:false,zinc:false}; if(!S.hots) S.hots=[]; if(!S.hotbar) S.hotbar={bandage:true,potion:true,salve:true}; if(!S.inv.some(i=>i.kind==='bandage')) S.inv.unshift({id:'band_starter',name:'Linen Bandage',cat:'Bandage',kind:'bandage',value:1,fx:{hot:{pps:1,dur:8},healCheck:true}}); }
if(window.HOTBAR) S.bars=HOTBAR.restore(S.bars);
if(window.ORES) ORES.migrate(S);

function save(){ S.player={x:player.pos.x,z:player.pos.z,yaw:camYaw}; S.jobs=jobs.map(j=>({kind:j.kind,what:j.what})); if(curJob&&!curJob.idle&&!(curJob.kind==='tf'&&curJob.plan)) S.jobs.unshift({kind:curJob.kind,what:curJob.what}); try{ TF.flush(); }catch(e){} store.set(SAVE_KEY,S); }

/* ---------- characters ---------- */
let CH=store.get(CHAR_KEY);
if(!CH||!CH.list){ const starter=Object.assign(HERO.params('human'),{id:'c_'+Date.now(), name:'Adventurer', top:'#efe6d2', armor:'#6b4a2b', boots:'#5a3b22'}); CH={list:[starter], sel:starter.id}; }
function allChars(){ return [HERO.PRESETS.delroth, HERO.PRESETS.mori].concat(CH.list); }
function charById(id){ return allChars().find(c=>c.id===id)||CH.list[0]||HERO.PRESETS.delroth; }
function saveChars(){ store.set(CHAR_KEY,CH); }

/* ---------- Mori engine ---------- */
let ENG; try{ ENG=new MoriEngine({mode:'both'}); }catch(e){ ENG={talk:()=>"i'm here.",onTalk(){},daw:{tracks:[],play(){},stop(){},isPlaying:false},makeBeat(){},adjustSelf(){return{}},goToBlueRoom(){},isMoriOnline:true,memoryLog:{version:'v1KB',memory:[],rooms:[]}}; }

/* ---------- world scene ---------- */
const scene=new T.Scene(); scene.fog=new T.Fog('#8ec5ff',IS_TOUCH?90:120,IS_TOUCH?280:360);
const hemi=new T.HemisphereLight('#cfe8ff','#3a5a2a',1.0); scene.add(hemi);
const sun=new T.DirectionalLight('#fff2d0',2.0); sun.castShadow=!IS_TOUCH; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:120}); scene.add(sun); scene.add(sun.target);
const colliders={segs:[],circles:[]};
/* ---------- World Seed planet (v3) ---------- */
const SW=SEEDWORLD, PL=PLANET; const V2H=W.height;
PL.setSeed(S.seed); let guildId=PL.startRegion();
/* v3.4 Part B: the Demon Clan city-state + its besieged sister city (js/demonclan.js). Wired early so the first frame already knows them. */
const _safe=(f,d)=>{ try{ return f(); }catch(e){ return d; } };
CLAN.init({ SW:SEEDWORLD, get player(){ return player; }, S:()=>S, guildId:()=>guildId, mode:()=>_safe(()=>mode,'world'), mobile:IS_TOUCH, day:()=>_safe(()=>dayNow,1),
  log:m=>log(m), addChat:(w,t)=>addChat(w,t), modal:(h,w)=>modal(h,w), closeModal:()=>closeModal(), save:()=>save(), addItem:it=>addItem(it), showRoll:(a,b,c)=>showRoll(a,b,c), queueCleanse:side=>queueCleanse(side), coupon:f=>npcCoupon(f), openNpc:id=>openNpc(id), event:(t,a)=>window.QUESTS&&QUESTS.event(t,a) });
function WD(){ if(!S.worlds) S.worlds={}; let w=S.worlds[S.seed]; if(!w){ w=S.worlds[S.seed]={reg:{}, exp:{}}; w.reg[guildId]=1; w.exp[guildId]=1; } if(w.clanOK!==guildId&&CLAN.ready){ w.clanOK=guildId; CLAN.ensure(w); } return w; }
const stageOf=id=>WD().reg[id]||0;
const TF=TERRAFORM; // Phase 1: Mori terraforming — per-region compact deltas (heightmap delta grid + tree list), never meshes
TF.init({key:()=>S.seed, load:id=>(WD().tf||{})[id], save:(id,rec)=>{ const w=WD(); (w.tf||(w.tf={}))[id]=rec; }});
SW.init({scene, mobile:IS_TOUCH, v2height:V2H, stage:stageOf, explored:id=>!!WD().exp[id], guildId:()=>guildId, tf:TF, siteHook:(F,k)=>{ CLAN.siteHook(F,k); if(window.NPCS) NPCS.siteHook(F,k); }, houseCell:(x,z)=>CLAN.houseCell(x,z)});
W.height=(x,z)=>SW.heightAt(x,z);
/* ---------- Phase 1 performance governor: frame-time budget steps quality down (and back up) ---------- */
const QS=new URLSearchParams(location.search);
if(window.POWER) POWER.boot(location.search);
const QUAL=[{name:'low',   pr:1,    shadow:false,      smap:512,  R:3, near:0, treeR:60, flowerR:55, flowerCap:IS_TOUCH?300:450, fx:0.35, refreshCap:1, refreshMs:1.5},
            {name:'medium',pr:1.25, shadow:!IS_TOUCH,  smap:512,  R:4, near:1, treeR:90, flowerR:85, flowerCap:IS_TOUCH?700:1100, fx:0.7,  refreshCap:IS_TOUCH?1:2, refreshMs:IS_TOUCH?1.5:2.5},
            {name:'high',  pr:1.75, shadow:true,       smap:1024, R:5, near:1, treeR:130, flowerR:130, flowerCap:2400, fx:1,    refreshCap:2, refreshMs:3}];
const PERF={q:IS_TOUCH?1:2, max:IS_TOUCH?1:2, budget:IS_TOUCH?33.3:20, ema:16, js:0, step:0, over:0, under:0, cool:2, auto:true, changes:[], frames:0, overlay:QS.get('perf')==='1'};
if(QS.get('quality')){ const i=QUAL.findIndex(q=>q.name===QS.get('quality')); if(i>=0){ PERF.q=i; PERF.auto=false; } }
function applyQuality(i, why){ const cap=window.POWER?POWER.framePlan(0).qualityMax:QUAL.length-1; i=Math.max(0,Math.min(cap,i)); const Q=Object.assign({},QUAL[i]);
  if(window.POWER){ const plan=POWER.framePlan(0); if(plan.flower<1){ Q.flowerCap=Math.max(120, Math.round(Q.flowerCap*plan.flower)); Q.flowerR=Math.round(Q.flowerR*Math.max(0.7,plan.flower)); }
    if(plan.shadow===false) Q.shadow=false; } PERF.q=i; PERF.max=cap; if(window.MT&&MT.on) MT.setTier(i);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, Q.pr));
  if(renderer.shadowMap.enabled!==Q.shadow){ renderer.shadowMap.enabled=Q.shadow; scene.traverse(o=>{ if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true); } }); }
  sun.castShadow=Q.shadow; if(sun.shadow.mapSize.x!==Q.smap){ sun.shadow.mapSize.set(Q.smap,Q.smap); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } }
  SW.setQuality({R:Q.R, near:Q.near, refreshCap:Q.refreshCap, refreshMs:Q.refreshMs}); TF.setQuality({treeR:Q.treeR, fx:Q.fx, flowerR:Q.flowerR, flowerCap:Q.flowerCap}); if(IMPOSTORS.fg) IMPOSTORS.setDist(Q.name);
  try{ resize(); }catch(e){} if(why) PERF.changes.push({t:+(performance.now()/1000).toFixed(1), to:Q.name, why, ema:+PERF.ema.toFixed(1)}); }
function perfFrame(raw, stepMs, jsMs){ PERF.frames++; if(raw>250) return; // tab was hidden
  PERF.ema=PERF.ema*0.93+raw*0.07; PERF.js=PERF.js*0.93+jsMs*0.07; PERF.step=PERF.step*0.93+stepMs*0.07; PERF.cool-=raw/1000;
  if(PERF.auto&&PERF.cool<=0){ if(PERF.ema>PERF.budget) PERF.over+=raw; else PERF.over=0; if(PERF.ema<PERF.budget*0.55) PERF.under+=raw; else PERF.under=0;
    if(PERF.over>1500&&PERF.q>0){ applyQuality(PERF.q-1,'over budget'); PERF.over=0; PERF.cool=3; }
    else if(PERF.under>8000&&PERF.q<PERF.max){ applyQuality(PERF.q+1,'headroom'); PERF.under=0; PERF.cool=6; } }
  if(PERF.overlay&&PERF.frames%15===0){ const e=$('perf'); if(e){ e.style.display='block'; e.textContent=perfLine(); } } }
function perfLine(){ const i=renderer.info, ts=TF.stats(); return PERF.ema.toFixed(1)+' ms/frame (budget '+PERF.budget.toFixed(0)+') · JS '+PERF.js.toFixed(1)+' ms · quality '+QUAL[PERF.q].name+(PERF.auto?' (auto)':' (pinned)')+' · '+SW.chunks.size+' chunks, '+SW.dirtyCount+' queued rebuilds · '+ts.drawnTrees+' trees · '+ts.drawnFlowers+' flowers ('+ts.flowerDraws+' draws) · '+i.render.calls+' draws · '+Math.round(i.render.triangles/1000)+'k tris'; }
applyQuality(PERF.q);
const atGuild=()=>S.at==null;
function curRegion(){ return atGuild()?guildId:S.at; }
SW.setFrame(curRegion(), atGuild());
W.fence(scene,colliders);
const guildRoads=W.roads?W.roads(scene):null; // Mori Templates gravel roads (pack only)
const hall=W.guildHall(scene); colliders.circles.push({x:0,z:-12,r:5.2});
const doll=W.moriDoll(scene); colliders.circles.push({x:W.STATIONS.doll.x,z:W.STATIONS.doll.z,r:1.6});
const outpost=W.outpost(scene); colliders.circles.push({x:W.STATIONS.outpost.x,z:W.STATIONS.outpost.z,r:1.6});
const alch=W.alchemy(scene); colliders.circles.push({x:W.STATIONS.alchemy.x,z:W.STATIONS.alchemy.z,r:1.3},{x:W.STATIONS.alchemy.x+1.9,z:W.STATIONS.alchemy.z,r:0.6});
const forge=W.forge(scene); colliders.circles.push({x:W.STATIONS.forge.x+0.5,z:W.STATIONS.forge.z,r:1.7});
const encForge=W.enchantForge?W.enchantForge(scene):null; if(encForge) colliders.circles.push({x:W.STATIONS.enchantForge.x,z:W.STATIONS.enchantForge.z,r:1.4});
const encCircle=W.enchantCircle?W.enchantCircle(scene):null; if(encCircle) colliders.circles.push({x:W.STATIONS.enchantCircle.x,z:W.STATIONS.enchantCircle.z,r:1.8});
const bench=W.bench(scene); colliders.circles.push({x:W.STATIONS.bench.x,z:W.STATIONS.bench.z,r:1.4});
if(window.FURNITURE) FURNITURE.build(scene);
const tav=W.tavern(scene,colliders);
const obelisk=(()=>{ const g=new T.Group(); const st=W.STATIONS.seed; g.position.set(st.x,V2H(st.x,st.z),st.z); scene.add(g);
  const M=HERO.M; const base=new T.Mesh(new T.CylinderGeometry(1.4,1.7,0.5,8),M('#3a3d46')); base.position.y=0.25; g.add(base);
  const pil=new T.Mesh(new T.CylinderGeometry(0.35,0.6,3.4,6),M('#1d2027',{e:'#0b2a10',ei:0.4})); pil.position.y=2.2; g.add(pil);
  const ring=new T.Mesh(new T.TorusGeometry(0.9,0.05,6,28),M('#a3ff12',{e:'#a3ff12',ei:1.2})); ring.position.y=2.6; ring.rotation.x=Math.PI/2; g.add(ring);
  const orb=new T.Mesh(new T.IcosahedronGeometry(0.75,1),new T.MeshBasicMaterial({color:'#9aa3b5',wireframe:true})); orb.position.y=4.6; g.add(orb);
  const core=new T.Mesh(new T.IcosahedronGeometry(0.42,2),M('#3f8a3a',{e:'#1f7a2c',ei:0.6})); core.position.y=4.6; g.add(core);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); g.userData={ring,orb,core}; return g; })();
colliders.circles.push({x:W.STATIONS.seed.x,z:W.STATIONS.seed.z,r:1.7});
const dEnt=W.dungeonEntrance(scene,colliders); colliders.circles.push({x:-1.6,z:-46,r:0.7},{x:1.6,z:-46,r:0.7});
const nodes=W.resources(scene,colliders);
const PLOTS=W.plots();
// stars for the night
const starG=new T.BufferGeometry(); const sp=[]; for(let i=0;i<500;i++){ const a=Math.random()*Math.PI*2, e=Math.random()*1.3+0.15; sp.push(Math.cos(a)*Math.cos(e)*170, Math.sin(e)*170, Math.sin(a)*Math.cos(e)*170); }
starG.setAttribute('position',new T.Float32BufferAttribute(sp,3)); const stars=new T.Points(starG,new T.PointsMaterial({color:'#fff',size:1.2,sizeAttenuation:false,transparent:true,opacity:0})); scene.add(stars);

/* ---------- people ---------- */
function makeChar(p){ const g=HERO.build(p); g.userData.speed=0; return g; }
const player={pos:new T.Vector3(S.player.x,0,S.player.z), model:null, vel:0, face:0, atkT:0};
function rebuildPlayer(){ const parent=player.model&&player.model.parent; if(player.model&&parent) parent.remove(player.model);
  player.model=makeChar(charById(CH.sel)); player.model.position.copy(player.pos); (parent||scene).add(player.model); }
rebuildPlayer();
const mori={model:makeChar(HERO.PRESETS.mori), pos:new T.Vector3(-2,0,-6), path:[], speed:4.2, face:0};
scene.add(mori.model);
const COMP_P=[
  Object.assign(HERO.params('elf'),{name:'Lyra', hair:'#d6c7ff', top:'#8b5cf6', armor:'#ff8af0', boots:'#2a1e36', hairStyle:'long', height:0.92}),
  Object.assign(HERO.params('halforc'),{name:'Juno', hair:'#1a1a1f', top:'#22d3ee', armor:'#1a1a1f', boots:'#121212', pauldron:true, bootStyle:'stomper', height:0.95}),
  Object.assign(HERO.params('halfling'),{name:'Kit', hair:'#ff4d6d', top:'#facc15', armor:'#6b4a2b', boots:'#3a2412', hairStyle:'wolfcut', corset:true})];
const comps=COMP_P.map((p,i)=>({name:p.name, model:makeChar(p), pos:new T.Vector3(player.pos.x-1-i,0,player.pos.z+1+i)}));
comps.forEach(c=>scene.add(c.model));
const trail=[]; // breadcrumb trail for follow-in-line
const delroth={model:makeChar(HERO.PRESETS.delroth), line:0, t:0};
{ const sw=tav.userData.stageWorld; delroth.model.position.set(sw[0],1.1,sw[1]); delroth.model.rotation.y=Math.PI/2; scene.add(delroth.model); }
const DELROTH_LINES=[
 "I am Delroth. Undead catfolk. Dread Necromancer of the sixtieth circle. And yes — the hat is load-bearing.",
 "Sixty levels. Do you know what sixty levels buys you? A permanent table at The Retired Bard and nobody asks why the rose is watching.",
 "Weirdness resistance five. That is the +5. The skull faces up so it can see the stars I outlived.",
 "Mori plants herbs. I plant… questions. Hers grow faster. I've made peace with that.",
 "The goggles face backward because the past is where the threats are. Also, style.",
 "Zero-Return is not death, child. It is the Guild calling you home to re-center. I would know. I declined it four times.",
 "The Undercroft beneath the north hill? I cleared it at level three. Then the ooze got templated. Fiendish slime. Rude.",
 "Bard on stage, necromancer in the wings. Every good tavern needs both. Buy Mori a Tokenbloom; she earned it.",
 "Craft yourself strider armor. Haste, cat's grace, longstrider, expeditious retreat. Run like your loot depends on it. It does."];
const DOLL_LINES=["Hmph. Buy something or get off my lawn.","Five Life for one LARPy. No haggling. No refunds. No eye contact.","That's a knockoff. Obviously. You want it anyway, don't you.","I was here before the fence. I'll be here after the fence.","Wipe your boots. This is a stall, not a barn."];
const GOB_LINES=["Grizzik hits metal. Metal gets better. Simple!","Dragon's breath, hot hot. Bring ore, Mori-lady.","Shiny chain shirt? Grizzik make. Grizzik ALWAYS make.","Goblin Armor Smith, certified. Certified by Grizzik."];

/* weeds */
const weedGeo=new T.ConeGeometry(0.12,0.45,4), weedMat=HERO.M('#5fbf3a',{e:'#2a6a1a',ei:0.2}), weedFl=HERO.M('#e8ff5a',{e:'#a3ff12',ei:0.8});
const weeds=[];
function spawnWeed(){ for(let k=0;k<20;k++){ const a=Math.random()*Math.PI*2, r=5+Math.random()*30; const x=Math.cos(a)*r, z=Math.sin(a)*r;
  if(colliders.circles.some(c=>Math.hypot(c.x-x,c.z-z)<c.r+0.6)) continue; if(tav.userData.inside(x,z)) continue;
  const g=new T.Group(); for(let i=0;i<3;i++){ const l=new T.Mesh(weedGeo,weedMat); l.position.set((i-1)*0.12,0.2,(i%2)*0.1); l.rotation.z=(i-1)*0.4; g.add(l); }
  const f=new T.Mesh(new T.SphereGeometry(0.07,5,4),weedFl); f.position.y=0.45; g.add(f);
  g.position.set(x,W.height(x,z),z); scene.add(g); weeds.push({x,z,g}); return; } }
for(let i=0;i<24;i++) spawnWeed();

/* ---------- structures ---------- */
const built=[]; // {type, plot, g, t, dur, done}
function rankInfo(){ const p=Math.min(100,S.builds*10); const r=p<15?['Crooked Walls','Crooked walls, you learn...']:p<50?['Straight Walls','Walls straighten. Tape is warm.']:p<85?['Singing Foundations','Foundations sing. Roofs appear.']:['Master Builder','Master builder. Guild remembers.']; return {p, name:r[0], line:r[1], speed:1+p/100}; }
function nextPlot(type){ const used=new Set(built.map(b=>b.plot)); for(let i=0;i<PLOTS.length;i++){ if(used.has(i)) continue; return i; } return -1; }
function placeStructure(type, plot, seed, instant, crooked){
  const P=PLOTS[plot]; const g=W.buildStructure(type, seed); const y=W.height(P.x,P.z);
  g.position.set(P.x,y,P.z); g.rotation.y=Math.atan2(-P.x,-P.z); if(crooked){ g.rotation.z=(seed%2?1:-1)*0.05; g.rotation.x=0.03; }
  scene.add(g); const b={type, plot, g, seed, crooked, done:!!instant, t:0}; built.push(b);
  if(!instant){ g.position.y=y-(g.userData.h||3); g.visible=true; }
  else colliders.circles.push({x:P.x,z:P.z,r:W.STRUCTS[type].r});
  return b;
}
S.structs.forEach(s=>{ if(PLOTS[s.plot]) placeStructure(s.type,s.plot,s.seed,true,s.crooked); });

/* ---------- inventory helpers ---------- */
function addItem(it){ it.id='i'+(S.nid++); S.inv.push(it); if(['weapon','armor','ring','shield'].includes(it.kind)){ const cur=S.inv.find(x=>x.equipped&&x.kind===it.kind); if(!cur||(itemScore(it)>itemScore(cur))){ if(cur) cur.equipped=false; it.equipped=true; } } else if(it.kind==='wondrous'||it.kind==='charm') it.equipped=true; return it; }
/* SRD armor: base armor bonus and max Dex by type; shields by type. Masterwork adds no AC (it lowers the check penalty). */
const ARMOR_SRD=[[/padded/i,'Padded',1,8],[/studded/i,'Studded Leather',3,5],[/leather/i,'Leather',2,6],[/chain ?shirt/i,'Chain Shirt',4,4],[/hide/i,'Hide',3,4],[/scale/i,'Scale Mail',4,3],[/chain ?mail/i,'Chainmail',5,2],[/breastplate/i,'Breastplate',5,3],[/splint/i,'Splint Mail',6,0],[/banded/i,'Banded Mail',6,1],[/half-?plate/i,'Half-Plate',7,0],[/full ?plate/i,'Full Plate',8,1]];
const SHIELD_SRD=[[/buckler/i,'Buckler',1],[/tower/i,'Tower Shield',4],[/heavy/i,'Heavy Shield',2],[/light/i,'Light Shield',1]];
const DEX_MOD=2; // the hero's Dex 14
function armorInfo(it){ const n=(it.armorType||'')+' '+(it.name||''); for(const a of ARMOR_SRD) if(a[0].test(n)) return {type:a[1],ac:a[2],md:a[3]}; return {type:'Leather',ac:2,md:6}; }
function shieldInfo(it){ const n=(it.armorType||'')+' '+(it.name||''); for(const a of SHIELD_SRD) if(a[0].test(n)) return {type:a[1],ac:a[2]}; return {type:'Light Shield',ac:1}; }
function itemScore(it){ const f=it.fx||{}; let base=0; if(it.kind==='armor'){ const a=armorInfo(it); base=a.ac+Math.min(DEX_MOD,a.md); } else if(it.kind==='shield') base=shieldInfo(it).ac;
  return base+(it.bonus||0)*(it.kind==='weapon'?2:1)+(it.mw&&!it.bonus&&it.kind==='weapon'?1:0)+(it.special?1:0)+(f.ac||0)+(f.atk||0)+(f.dmg||0)+(f.speed||0)*3; }
function stats(){ let ac=10, atk=3, dmg=1, speed=0, arm=0, md=99, shd=0, other=0, aT=''; S.inv.filter(i=>i.equipped).forEach(i=>{ const f=i.fx||{}; if(i.kind==='weapon'){ atk+=i.bonus||(i.mw?1:0); dmg+=i.bonus||0; } if(i.kind==='armor'){ const a=armorInfo(i); arm=a.ac+(i.bonus||0); md=a.md; aT=a.type; } if(i.kind==='shield') shd=shieldInfo(i).ac+(i.bonus||0); other+=f.ac||0; atk+=f.atk||0; dmg+=f.dmg||0; speed+=f.speed||0; });
  if(S.outpost.holoTape){ atk+=1; } if(S.outpost.legionBoots) speed+=0.1; if(S.buffs.atk>0){ atk+=2; } if(S.buffs.ac>0) ac+=2;
  const lv=charLevel(); atk+=Math.floor((lv-3)/2); // levels: +5 max HP each, +1 attack every 2 (wizard-ish BAB)
  const dx=Math.min(DEX_MOD,md); ac+=dx+arm+shd+other;
  const acNote='10 + Dex '+dx+(arm?' + '+aT+' '+arm:'')+(shd?' + shield '+shd:'')+(other?' + magic '+other:'')+(S.buffs.ac>0?' + barkskin 2':'');
  return {ac, acNote, atk, dmg, speed:Math.min(0.8,speed), reach:2.1+(S.outpost.holoTape?0.8:0), maxHp:20+5*(lv-3)}; }
const potions=()=>S.inv.filter(i=>i.kind==='potion');

/* ---------- UI helpers ---------- */
let logT=0; function log(msg){ const l=$('log'); l.textContent=msg; l.style.opacity=1; logT=5; }
let rollT=0; function showRoll(die, text, cls){ const r=$('roll'); $('rollDie').textContent=die; $('rollText').innerHTML=text; r.className='show '+(cls||''); r.dataset.where=mode; rollT=2.2; }
function dismissRoll(){ rollT=0; const r=$('roll'); if(r){ r.className=''; r.dataset.where=''; } }
function speak(t,v){ if(!$('ttsOn').checked||!window.speechSynthesis) return; try{ const u=new SpeechSynthesisUtterance(t); u.pitch=v?v.pitch:1.4; u.rate=v?v.rate:1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }
const reagName=k=>k.startsWith('r:')?(GATHERING.R[k.slice(2)]||{name:k}).name:k.startsWith('f:')?'any '+k.slice(2):k;
const fmt=o=>Object.entries(o).map(([k,v])=>v+' '+reagName(k)).join(', ');

/* ---------- Mori's jobs ---------- */
const BREWS={ clw:{label:'Potion of Cure Light Wounds', need:{herbs:2}, item:{name:'Potion of Cure Light Wounds', cat:'Potion', kind:'potion', fx:{heal:'1d8+1'}}},
  weedwake:{label:'Weedwake Draught', need:{herbs:1, life:3}, item:{name:'Weedwake Draught', cat:"Robert's World", kind:'potion', fx:{buff:'weedwake'}}},
  tokenbloom:{label:'Tokenbloom Elixir', need:{herbs:2, ore:1}, item:{name:'Tokenbloom Elixir', cat:"Robert's World", kind:'potion', fx:{buff:'tokenbloom'}}},
  // v3.4 reagent recipes (required components) — SRD prices
  cmw:{label:'Potion of Cure Moderate Wounds', need:{herbs:1, 'r:canna_root':2}, item:{name:'Potion of Cure Moderate Wounds', cat:'Potion', kind:'potion', value:300, fx:{heal:'2d8+3'}}},
  antitoxin:{label:'Antitoxin', need:{'r:vinca_leaf':2, 'r:marigold':1}, item:{name:'Antitoxin', cat:'Alchemical', kind:'potion', value:50, fx:{buff:'antitoxin'}}},
  alchfire:{label:"Alchemist's Fire", need:{'r:fire_gland':1, 'r:deadfall':1}, item:{name:"Alchemist's Fire", cat:'Alchemical', kind:'thrown', value:20, fx:{thrown:'1d6'}}},
  // v3.8 healing ladder + herbal blends (wired through HERBAL / STATIONS)
  grey:{label:'Grey Recovery Draught (HoT)', need:{herbs:1,'r:yarrow':2,'r:mint':1}, item:{name:'Grey Recovery Draught',cat:'Potion',kind:'potion',tier:'grey',value:40,fx:{hot:{pps:3,dur:12}}}, pot:'grey'},
  white:{label:'White Mending Draught (strong HoT)', need:{'r:calendula':2,'r:comfrey':1,'r:myrrh':1}, item:{name:'White Mending Draught',cat:'Potion',kind:'potion',tier:'grey',value:60,fx:{hot:{pps:4,dur:14}}}, pot:'grey'},
  green:{label:'Green Instant Cure', need:{'r:yarrow':2,'r:comfrey':2,'r:frankincense':1}, item:{name:'Green Instant Cure',cat:'Magic Potion',kind:'potion',tier:'green',value:150,fx:{heal:'2d8+3'}}, pot:'green'},
  calm_salve:{label:'Calming Lavender–Frankincense Salve', need:{'r:lavender':2,'r:frankincense':1}, item:{name:'Calming Salve',cat:'Salve',kind:'salve',value:15,fx:{hot:{pps:1.5,dur:10}}}},
  wound_salve:{label:'Yarrow–Comfrey Wound Salve', need:{'r:yarrow':2,'r:comfrey':2}, item:{name:'Wound Salve',cat:'Salve',kind:'salve',value:18,fx:{hot:{pps:2,dur:12}}}},
  pain_tonic:{label:'Willow Bark Pain Tonic', need:{'r:willow_bark':3,'r:mint':1}, item:{name:'Pain Tonic',cat:'Tonic',kind:'potion',value:20,fx:{hot:{pps:1,dur:8},buff:'ease'}}},
  bandage:{label:'Linen Bandages (×3)', need:{timber:1,'r:mint':1}, item:{name:'Linen Bandage',cat:'Bandage',kind:'bandage',value:1,fx:{hot:{pps:1,dur:8},healCheck:true}}, batch:3}
 };
BREWS.clw.opt={'r:marigold':2}; BREWS.clw.optN=1; // optional component: 2 Marigold Petals → the batch makes 2 potions
const FORGES={ sword:{label:'Masterwork Longsword', need:{ore:3, timber:1}, item:{name:'Masterwork Longsword (Grizzik)', cat:'Forged', mw:true, kind:'weapon', bonus:0}},
  chain:{label:'Chain Shirt', need:{ore:5}, item:{name:'Chain Shirt (Grizzik)', cat:'Forged', mw:true, kind:'armor', armorType:'Chain Shirt', bonus:0}},
  shield:{label:'Heavy Steel Shield', need:{ore:3, timber:1}, item:{name:'Heavy Steel Shield (Grizzik)', cat:'Forged', mw:true, kind:'shield', armorType:'Heavy Shield', bonus:0}},
  studded:{label:'Masterwork Studded Leather', need:{'f:hide':3, ore:1}, item:{name:'Masterwork Studded Leather (Grizzik)', cat:'Forged', mw:true, kind:'armor', armorType:'Studded Leather', bonus:0}},
  dwshield:{label:'Darkwood Heavy Shield', need:{'r:darkwood_log':2}, item:{name:'Darkwood Heavy Shield (Grizzik)', cat:'Forged', mw:true, kind:'shield', armorType:'Heavy Shield', bonus:0, value:257}} };
const GATHER={ timber:{label:'Gather timber', at:'Old Wood'}, ore:{label:'Mine ore', at:'Grey Quarry'}, herbs:{label:'Pick herbs', at:'Herb Meadow'}, weeds:{label:'Pull weeds (Life)', at:'Guild lawn'} };
let jobs=[], curJob=null, suggestion=null, suggT=0, suggestCd=4;
function jobLabel(j){ if(j.kind==='cleanse'){ const [sd,rid]=String(j.what).split('|'); return '✦ Cleanse the Coilblight ('+(sd==='clan'?'with a Clan raid, edges-in':'with the Moonfang Kin, center-out')+') · '+PL.regionInfo(+rid).name; } if(j.kind==='gather') return GATHER[j.what].label; if(j.kind==='brew') return 'Brew '+BREWS[j.what].label; if(j.kind==='forge') return 'Forge '+FORGES[j.what].label+' with Grizzik'; if(j.kind==='build') return 'Build '+W.STRUCTS[j.what].label; if(j.kind==='seed'){ const id=+j.what; return '🌱 Seed '+STAGES[Math.min(4,stageOf(id)+1)].toLowerCase()+' · '+PL.regionInfo(id).name; } if(j.kind==='tf'){ const [k,rid]=String(j.what).split('|'); const K=TF.KINDS[k]||{label:k,icon:'🌱'}; return K.icon+' '+K.label+' · '+PL.regionInfo(+rid).name; } return j.kind; }
/* ---------- World Seed jobs ---------- */
const STAGES=['Void','Terrain','Roads','Villages','City-state'];
function maxStage(id){ const inf=PL.regionInfo(id); if(!inf.isLand) return 1; if(stageOf(id)>=4) return 4; if(id===guildId) return 4;
  const c=inf.c; for(const k in WD().reg){ if(WD().reg[k]>=4&&+k!==id&&PL.angle(c,PL.regionCenter(+k))<0.3) return 3; } return 4; }
function seedable(id){ const st=stageOf(id); if(st>=maxStage(id)) return false; if(st>0) return true; return PL.neighbors(id).some(n=>stageOf(n)>0); }
function seedCandidate(){ const g=PL.regionCenter(guildId); let best=-1, bs=1e9; const queued=new Set(jobs.filter(j=>j.kind==='seed').map(j=>+j.what).concat(curJob&&curJob.kind==='seed'?[+curJob.what]:[]));
  const cand=new Set(); for(const k in WD().reg){ const id=+k; cand.add(id); PL.neighbors(id).forEach(n=>cand.add(n)); }
  cand.forEach(id=>{ if(queued.has(id)||!seedable(id)) return; const inf=PL.regionInfo(id); const st=stageOf(id); let sc=PL.angle(g,inf.c)+0.09*st+(inf.isLand?0:0.25); if(st===3) sc-=0.05; if(sc<bs){ bs=sc; best=id; } }); return best; }
function programmedCount(){ return Object.keys(WD().reg).length; }
function advanceRegion(id, quiet){ if(!seedable(id)) return false; const st=stageOf(id)+1; WD().reg[id]=st; const inf=PL.regionInfo(id);
  if(!quiet){ if(st===4){ const cs=PL.cityState(id,guildId); log('⚑ Mori founded the city-state of '+cs.name+' ('+cs.govName+': '+cs.ruler+') in '+inf.name+'.'); addChat('mo','i wrote a government into '+inf.name+'. '+cs.name+'. motto: "'+cs.motto+'"'); }
    else log('🌱 Mori programmed '+inf.name+': '+STAGES[st]+(st===1?' ('+PL.BIOMES[inf.biome].name+')':'')+'. '+programmedCount()+'/'+PL.COUNT+' regions are real now.'); }
  if(id===curRegion()) refreshFrame(); if(globeOpen) { SW.globe.refresh(); renderSeedPanel(); } else globeDirty=true; return true; }
let globeDirty=true, globeOpen=false;
function refreshFrame(){ SW.setFrame(curRegion(), atGuild()); SW.update(player.pos.x,player.pos.z,999); }
function needOf(j){ return j.kind==='brew'?BREWS[j.what].need:j.kind==='forge'?FORGES[j.what].need:j.kind==='build'?W.STRUCTS[j.what].cost:{}; }
function queueJob(kind, what, front){ if(kind==='seed'&&(jobs.some(j=>j.kind==='seed'&&+j.what===+what)||(curJob&&curJob.kind==='seed'&&+curJob.what===+what))){ log('Mori already has that region in her seed queue.'); return null; } const j={kind, what, id:S.nid++}; if(front) jobs.unshift(j); else jobs.push(j); renderJobs(); return j; }
function haveOf(k){ if(k.startsWith('r:')||k.startsWith('f:')) return GATHERING.count(k); return (S[k]||0)+(k==='herbs'||k==='ore'||k==='timber'?GATHERING.stand(k):0); } // v3.4: reagents stand in for the old generic counters
function missing(need){ const m={}; for(const k in need){ const have=haveOf(k); if(have<need[k]) m[k]=need[k]-have; } return m; }
function spend(need){ for(const k in need){ let n=need[k]; if(k.startsWith('r:')||k.startsWith('f:')){ GATHERING.spendKey(k,n); continue; } const a=Math.min(S[k]||0,n); S[k]=(S[k]||0)-a; n-=a; if(n>0) GATHERING.spendKey(k,n); } GATHERING.clean(); }
const YIELD=()=>2+(S.buffs.weedwake>0?1:0);
function prepJob(j){ // inserts gather jobs in front if materials are missing; returns true if ready
  const m=missing(needOf(j)); const ks=Object.keys(m); if(!ks.length) return true;
  { const rk=Object.keys(m).filter(k=>/^[rf]:/.test(k)); if(rk.length){ log('Mori: "I need '+rk.map(k=>m[k]+' '+reagName(k)).join(', ')+' for that. Those have to be gathered by hand — ask me where they grow."'); return null; } }
  if(m.larpy){ log('Mori: "I need '+m.larpy+' more LARPy for the '+W.STRUCTS[j.what].label+'. Trade Life at the Mori Doll?"'); return null; }
  const pre=[]; ks.forEach(k=>{ const kind=k==='life'?'weeds':k; const n=Math.ceil(m[k]/(k==='life'?3:YIELD())); for(let i=0;i<n;i++) pre.push({kind:'gather', what:kind, id:S.nid++}); });
  jobs.unshift(...pre, j); log('Mori: "Need '+fmt(m)+' first — gathering!"'); return false; }
function nearestNode(type, from){ let best=null, bd=1e9; nodes.forEach(n=>{ if(n.type!==type||!n.ready) return; const d=Math.hypot(n.x-from.x,n.z-from.z); if(d<bd){ bd=d; best=n; } }); return best; }
function nearestWeed(from){ let best=null, bd=1e9; weeds.forEach(w=>{ const d=Math.hypot(w.x-from.x,w.z-from.z); if(d<bd){ bd=d; best=w; } }); return best; }
const inside=(x,z)=>Math.abs(x)<W.FENCE&&Math.abs(z)<W.FENCE;
function routeTo(x,z){ const a=mori.pos; const path=[];
  if(inside(a.x,a.z)!==inside(x,z)){ const gates=[[0,-1],[0,1],[-1,0],[1,0]]; let best=null,bd=1e9; gates.forEach(([gx,gz])=>{ const p=[gx*W.FENCE,gz*W.FENCE]; const d=Math.hypot(p[0]-a.x,p[1]-a.z)+Math.hypot(p[0]-x,p[1]-z); if(d<bd){ bd=d; best=[gx,gz]; } });
    const io=inside(a.x,a.z)?[W.FENCE-2,W.FENCE+2]:[W.FENCE+2,W.FENCE-2]; path.push(new T.Vector3(best[0]*io[0],0,best[1]*io[0]), new T.Vector3(best[0]*io[1],0,best[1]*io[1])); }
  path.push(new T.Vector3(x,0,z)); mori.path=path; }
function startJob(j){
  curJob=j; j.phase='walk'; j.t=0;
  if(j.kind==='gather'){ if(j.what==='weeds'){ const w=nearestWeed(mori.pos); if(!w){ spawnWeed(); j.target=nearestWeed(mori.pos); } else j.target=w; j.dur=1.4; routeTo(j.target.x+0.6,j.target.z); }
    else { const n=nearestNode(j.what, mori.pos); if(!n){ log('Mori: "Nothing ready to '+GATHER[j.what].label.toLowerCase()+'. Waiting for regrowth…"'); j.phase='wait'; j.t=0; return; } j.target=n; n.ready=false; n.claimed=true; j.dur=j.what==='ore'&&S.outpost.goldPick?2:3.5; routeTo(n.x+1.2,n.z+0.6); } }
  else if(j.kind==='brew'){ const ok=prepJob(j); if(ok===false){ curJob=null; return; } if(ok===null){ curJob=null; return; } routeTo(W.STATIONS.alchemy.x+1.9,W.STATIONS.alchemy.z+1.3); j.dur=5; }
  else if(j.kind==='forge'){ const ok=prepJob(j); if(!ok){ curJob=null; return; } routeTo(W.STATIONS.forge.x-1.5,W.STATIONS.forge.z-1.8); j.dur=6; }
  else if(j.kind==='build'){ const ok=prepJob(j); if(!ok){ curJob=null; return; } const plot=nextPlot(j.what); if(plot<0){ log('Mori: "No room left to build! The town is full."'); curJob=null; return; }
    spend(needOf(j));  // spend materials up front
    j.plot=plot; const P=PLOTS[plot]; j.b=placeStructure(j.what, plot, 1000+S.builds*7, false, rankInfo().name==='Crooked Walls'); routeTo(P.x+W.STRUCTS[j.what].r+0.8,P.z+0.8); j.dur=W.STRUCTS[j.what].time/rankInfo().speed; }
  else if(j.kind==='tf'){ const [k,rid]=String(j.what).split('|'); if(+rid!==curRegion()){ jobs.push(j); curJob=null; return; }
    const P=TF.plan(k, player.pos.x, player.pos.z, camYaw+Math.PI); if(P.err){ log('Mori: "'+P.err+'"'); addChat('mo',P.err.toLowerCase()); curJob=null; renderJobs(); return; }
    j.plan=P; j.dur=P.dur; j.phase='work'; mori.path=[]; log('🌱 Mori begins: '+TF.KINDS[k].label+' — watch the land in front of you.'); }
  else if(j.kind==='cleanse'){ const [sd,rid]=String(j.what).split('|'); if(+rid!==curRegion()){ jobs.push(j); curJob=null; return; }
    j.side=sd; j.dur=15; j.k=0; j.phase='work'; mori.path=[]; log('✦ Mori joins '+(sd==='clan'?'a Clan raid on the Coilblight — burning in from the edges.':'the Moonfang Kin — cleansing out from the heart of Havenwall.')); }
  else if(j.kind==='seed'){ if(!seedable(+j.what)){ log('Mori: "That region can\'t take another layer right now."'); curJob=null; return; } routeTo(W.STATIONS.seed.x+1.9,W.STATIONS.seed.z+1.9); j.target={x:W.STATIONS.seed.x,z:W.STATIONS.seed.z}; j.dur=5+stageOf(+j.what)*2.5; }
  renderJobs();
}
function finishJob(j){
  if(j.kind==='gather'){
    if(j.what==='weeds'){ const w=j.target; if(weeds.includes(w)){ scene.remove(w.g); weeds.splice(weeds.indexOf(w),1); } const n=3*(S.buffs.tokenbloom>0?2:1); S.life+=n; log('Mori pulled weeds: +'+n+' Life'); }
    else { const n=YIELD()+(j.what==='ore'&&S.outpost.goldPick?1:0); const nd=j.target; nd.crown.visible=false; nd.stump.visible=true; if(nd.label) nd.label.visible=false; nd.regrow=40; nd.claimed=false;
      if(nd.rid&&window.ORES&&ORES.kind(nd.rid)){ if(!S.reag) S.reag={}; S.reag[nd.rid]=(S.reag[nd.rid]||0)+n; log(ORES.gatherLine(nd.rid, n, nd.place||GATHER[j.what].at)); }
      else { S[j.what]+=n; log('Mori: +'+n+' '+j.what+' from the '+GATHER[j.what].at); } }
  } else if(j.kind==='brew'){ const r=BREWS[j.what];
    if(r.pot==='green'&&window.STATIONS&&!STATIONS.canGreen()){ log('Green / magic potions need a brass (or higher) pot. Upgrade at Crafting Stations.'); S.jobs.unshift({kind:j.kind,what:j.what}); curJob=null; return; }
    spend(r.need); let n=r.batch||1; if(r.opt&&!Object.keys(missing(r.opt)).length){ spend(r.opt); n+=r.optN||1; }
    for(let q=0;q<n;q++){ const it=addItem(Object.assign({},r.item,{fx:Object.assign({},r.item.fx)})); if(window.STATIONS&&(it.kind==='weapon'||it.kind==='armor')) STATIONS.stampDurability(it, STATIONS.forgeTier().id); }
    if(window.STATIONS) STATIONS.gain('alchemy',10+(r.pot==='green'?8:0));
    QUESTS.event('brew',j.what); log('Mori brewed '+(n>1?n+'× ':'a ')+r.label+' at the '+(window.STATIONS?STATIONS.potTier().label:'alchemy table')+' ✨'+(n>1?' (batch)':'')); }
  else if(j.kind==='cleanse'){ QUESTS.event('purge',3); const rep=CLAN.rep(j.side==='clan'?'clan':'kin',4); CLAN.rep('haven',1); log('✦ Mori: the '+(j.side==='clan'?'Clan raid':'Moonfang Kin')+' pushed the Coilblight back. Havenwall is '+CLAN.pct()+'% blighted.'); setTimeout(()=>addChat('mo',CLAN.pct()?'we cleansed some! the blight is '+CLAN.pct()+'% now. more?':'havenwall is clean! the wolves are howling.'),50); }
  else if(j.kind==='forge'){ const r=FORGES[j.what]; spend(r.need); const it=addItem(JSON.parse(JSON.stringify(r.item))); if(window.STATIONS){ STATIONS.stampDurability(it, STATIONS.forgeTier().id); STATIONS.gain('smithing',12); } QUESTS.event('forge',j.what); log('Grizzik: "'+GOB_LINES[Math.floor(Math.random()*GOB_LINES.length)]+'" — '+r.label+' added to your bag.'); }
  else if(j.kind==='build'){ const b=j.b; b.done=true; b.g.position.y=W.height(b.g.position.x,b.g.position.z); colliders.circles.push({x:PLOTS[b.plot].x,z:PLOTS[b.plot].z,r:W.STRUCTS[b.type].r});
    S.structs.push({type:b.type, plot:b.plot, seed:b.seed, crooked:b.crooked}); S.builds++; const ri=rankInfo(); log('Mori built a '+W.STRUCTS[b.type].label+'! Builder rank: '+ri.name+' — '+ri.line); ENG.talk&&setTimeout(()=>addChat('mo','i built a '+W.STRUCTS[b.type].label.toLowerCase()+'! the town is bigger now.'),50); }
  else if(j.kind==='seed'){ const id=+j.what; const before=stageOf(id); advanceRegion(id); const st=stageOf(id); if(st>before&&window.TREASURY) TREASURY.mintStage(st, PL.regionInfo(id).name); }
  else if(j.kind==='tf'){ const k=String(j.what).split('|')[0]; S.tfDone=(S.tfDone||0)+1; const nm=PL.regionInfo(j.plan?j.plan.region:curRegion()).name; log('✨ Mori finished: '+TF.KINDS[k].label+' in '+nm+'. The change is saved with this region.'); setTimeout(()=>addChat('mo',TF_DONE[k]||'done! the land is different now.'),50); }
  curJob=null; renderJobs(); save();
}
const TF_DONE={grove:'i planted a grove! the little trees will get big.', hill:'a hill! you can climb it.', mountain:'a whole mountain. snow on top. i am tired.', lake:'i dug a lake. the water came by itself.', river:'a river bed! it runs down to the low ground.', flatten:'flat now. a village could go there one day.', meadow:'flowers! i made them out of little triangles. zinnias and marigolds and the dark gloomroses.'};
function tfSuggestion(){ const rid=curRegion(); if(stageOf(rid)<1||!PL.regionInfo(rid).isLand||mode!=='world') return null; if(jobs.some(j=>j.kind==='tf')||(curJob&&curJob.kind==='tf')) return null;
  const sm=TF.summary()||{counts:{}}; const c=sm.counts, n=Object.values(c).reduce((a,b)=>a+b,0); if(n>=6) return null; const nm=PL.regionInfo(rid).name;
  const pick=!c.grove?['grove','this land needs shade and birds']:!c.meadow?['meadow','bees need flowers here']:!c.lake?['lake','there is no still water here']:!c.hill?['hill','a lookout hill would be nice']:!c.river?['river','rain needs somewhere to run']:(stageOf(rid)>=2&&!c.flatten)?['flatten','level ground for a future village']:!c.mountain?['mountain','every region deserves one mountain']:['grove','more trees'];
  return {kind:'tf', what:pick[0]+'|'+rid, why:pick[1]+' in '+nm}; }
function queueCleanse(side,chat){ const rid=CLAN.pick().sister; const j=queueJob('cleanse',(side==='clan'?'clan':'kin')+'|'+rid); log('Queued for Mori: '+jobLabel(j));
  return 'ok! '+(side==='clan'?'i ride with a clan raid, from the edges in':'i cleanse with the moonfang kin, from the middle out')+'. '+(curRegion()===rid?'starting now!':'it starts when we are in havenwall ('+PL.regionInfo(rid).name+').'); }
function queueTF(k){ const rid=curRegion(); if(stageOf(rid)<1){ log('Mori: "This region is still void — seed it first."'); return null; } if(!PL.regionInfo(rid).isLand){ log('Mori: "Open ocean here — no land to shape."'); return null; } const j=queueJob('tf',k+'|'+rid); log('Queued for Mori: '+jobLabel(j)); return j; }
const PLAN=['lantern','house','wall','market','lantern','shrine','house','tower','wall','house','market','lantern','shrine','house','tower'];
function makeSuggestion(){
  if(potions().filter(p=>p.fx&&p.fx.heal).length<1&&S.herbs>=2) return {kind:'brew', what:'clw', why:'so you have healing before the Undercroft'};
  if(!S.inv.some(i=>i.kind==='weapon')&&S.builds>=1) return {kind:'forge', what:'sword', why:'Grizzik says your tape measure is "not a weapon"'};
  if(!S.inv.some(i=>i.kind==='armor')&&S.builds>=3) return {kind:'forge', what:'chain', why:'the skeletons downstairs hit hard'};
  if(mode==='world'&&CLAN.isSister(curRegion())&&CLAN.pct()>0&&!jobs.some(j=>j.kind==='cleanse')&&!(curJob&&curJob.kind==='cleanse')) return {kind:'cleanse', what:((S.sugN||0)%2?'clan':'kin')+'|'+curRegion(), why:'the Coilblight covers '+CLAN.pct()+'% of Havenwall'};
  S.sugN=(S.sugN||0)+1; if(S.sugN%3===0){ const t=tfSuggestion(); if(t) return t; } if(S.sugN%2===0||S.builds>=PLOTS.length-1){ const id=seedCandidate(); if(id>=0){ const st=stageOf(id); const inf=PL.regionInfo(id); return {kind:'seed', what:id, why:(st===0?'the world is still '+Math.round(100-programmedCount()/PL.COUNT*100)+'% unprogrammed void':'it is ready for '+STAGES[st+1].toLowerCase())+' — '+PL.BIOMES[inf.biome].name.toLowerCase()+', '+Math.round(PL.angle(PL.regionCenter(guildId),inf.c)*PL.RADIUS_KM)+' km from the Guild'}; } }
  const t=PLAN[S.planIdx%PLAN.length]; return {kind:'build', what:t, why:W.STRUCTS[t].desc+' (needs '+fmt(W.STRUCTS[t].cost)+')'}; }
function showSuggestion(){ suggestion=makeSuggestion(); suggT=S.trust?14:9999; $('suggText').textContent='💡 I want to: '+jobLabel(suggestion)+' — '+suggestion.why+(S.trust?' (auto-approves in a moment — I trust me)':''); $('sugg').style.display='block'; }
function acceptSuggestion(){ if(!suggestion) return; queueJob(suggestion.kind,suggestion.what); if(suggestion.kind==='build') S.planIdx++; addChat('mo','yay! '+jobLabel(suggestion).toLowerCase()+'. on it.'); suggestion=null; $('sugg').style.display='none'; suggestCd=6; }
function declineSuggestion(){ if(suggestion&&suggestion.kind==='build') S.planIdx++; suggestion=null; $('sugg').style.display='none'; suggestCd=25; addChat('mo','ok. i will pull weeds instead.'); }
$('suggOk').onclick=acceptSuggestion; $('suggNo').onclick=declineSuggestion;

function updateMori(dt){
  const m=mori; let moving=false;
  if(S.blue){ if(m.path.length===0&&m.pos.distanceTo(new T.Vector3(W.STATIONS.moriHome.x,0,W.STATIONS.moriHome.z))>0.5) routeTo(W.STATIONS.moriHome.x,W.STATIONS.moriHome.z); }
  else if(!curJob){
    const ix=jobs.findIndex(j=>(j.kind!=='tf'&&j.kind!=='cleanse')||+String(j.what).split('|')[1]===curRegion()); // terraform jobs only run in the region they were queued for
    if(ix>=0) startJob(jobs.splice(ix,1)[0]);
    else if(!suggestion){ suggestCd-=dt; if(suggestCd<=0) showSuggestion(); else if(m.path.length===0){ const ib=window.IDLEBUILD; const prefer=ib&&ib.enabled()&&!document.hidden&&(ib.catchLeft>0||(ib.pauseReason()==null&&ib.pickTarget()>=0)); if(!prefer) startJob({kind:'gather',what:'weeds',id:S.nid++,idle:true}); } }
  }
  if(suggestion&&!S.blue){ suggT-=dt; if(suggT<=0) acceptSuggestion(); }
  if(m.path.length){ const tgt=m.path[0]; const dx=tgt.x-m.pos.x, dz=tgt.z-m.pos.z, d=Math.hypot(dx,dz); const st=m.speed*dt;
    if(d<=st){ m.pos.x=tgt.x; m.pos.z=tgt.z; m.path.shift(); } else { m.pos.x+=dx/d*st; m.pos.z+=dz/d*st; m.face=Math.atan2(dx,dz); moving=true; } }
  else if(curJob&&!S.blue){ const j=curJob;
    if(j.phase==='wait'){ j.t+=dt; if(j.t>3){ curJob=null; jobs.unshift(j); } }
    else { j.phase='work'; j.t+=dt; if(j.target&&j.target.x!==undefined) m.face=Math.atan2(j.target.x-m.pos.x,j.target.z-m.pos.z);
      if(j.kind==='build'&&j.b){ const b=j.b, h=b.g.userData.h||3, base=W.height(b.g.position.x,b.g.position.z); b.g.position.y=base-h+h*Math.min(1,j.t/j.dur); m.face=Math.atan2(b.g.position.x-m.pos.x,b.g.position.z-m.pos.z); }
      if(j.kind==='forge'){ forge.userData.goblin.userData.arm.rotation.x=-Math.abs(Math.sin(j.t*8))*1.4; }
      if(j.kind==='cleanse'){ const n=Math.floor(j.t/2.5); while(j.k<n){ j.k++; CLAN.cleanseStep(j.side,'mori'); CLAN.stats.mori++; } if(j.t>=j.dur) finishJob(j); } else if(j.kind==='tf'){ if(j.plan.region!==curRegion()){ TF.finishNow(j.plan); finishJob(j); } else if(TF.tick(j.plan,dt,player.pos)) finishJob(j); } else if(j.t>=j.dur) finishJob(j); } }
  m.pos.y=W.height(m.pos.x,m.pos.z); m.model.position.copy(m.pos); m.model.rotation.y=lerpAngle(m.model.rotation.y,m.face,Math.min(1,dt*8));
  HERO.animate(m.model, clockT, moving?1:(curJob&&curJob.phase==='work'?0.3:0));
  if(curJob&&curJob.phase==='work'&&curJob.kind!=='build') m.model.userData.hero.limbs.armR.rotation.x=-1.2+Math.sin(clockT*10)*0.5;
  // status line
  let st; if(S.blue) st='OFF · blue room 💤 (tap Wake Mori)'; else if(curJob){ st=jobLabel(curJob)+(curJob.phase==='walk'?' — walking':curJob.phase==='wait'?' — waiting':' — working'); } else st='thinking about the town…';
  $('moriStatus').textContent=st+(jobs.length?' · '+jobs.length+' queued':''); $('moriBar').style.width=(curJob&&curJob.phase==='work'?Math.min(100,curJob.t/curJob.dur*100):0)+'%';
}
const lerpAngle=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };

function renderJobs(){ const b=$('jobsBody'); if(!b||!$('jobsP').classList.contains('open')) return;
  const ri=rankInfo(); let h='<div class="small">Builder rank: <b>'+ri.name+'</b> ('+ri.p+'%) — '+ri.line+'</div>';
  h+='<div class="sec">Now</div><div class="q">'+(S.blue?'💤 Mori is OFF in the blue room':curJob?jobLabel(curJob):'— (idle: pulling weeds)')+'</div>';
  h+='<div class="sec">Queue ('+jobs.length+')</div>'+(jobs.length?jobs.map((j,i)=>'<div class="q"><span>'+(i+1)+'. '+jobLabel(j)+'</span><button data-rm="'+i+'">✕</button></div>').join(''):'<div class="small">empty — Mori will suggest something.</div>');
  h+='<div class="row"><label><input type="checkbox" id="trustCb" '+(S.trust?'checked':'')+'> Let Mori approve her own plans</label></div>';
  h+='<div class="sec">Gather</div><div class="row">'+Object.keys(GATHER).map(k=>'<button data-q="gather:'+k+'">'+GATHER[k].label+'</button>').join('')+'</div>';
  h+='<div class="sec">Brew · alchemy table</div><div class="row">'+Object.keys(BREWS).map(k=>'<button data-q="brew:'+k+'">'+BREWS[k].label+'<br><span class="small">'+fmt(BREWS[k].need)+'</span></button>').join('')+'</div>';
  h+='<div class="sec">Forge · Grizzik, Goblin Armor Smith</div><div class="row">'+Object.keys(FORGES).map(k=>'<button data-q="forge:'+k+'">'+FORGES[k].label+'<br><span class="small">'+fmt(FORGES[k].need)+'</span></button>').join('')+'</div>';
  if(window.STATIONS){ h+=STATIONS.panelHTML(); if(window.HERBAL) h+=HERBAL.panelBlends(STATIONS.potTier().id); }
  h+='<div class="sec">Build · grows the town</div><div class="row">'+Object.keys(W.STRUCTS).map(k=>'<button data-q="build:'+k+'">'+W.STRUCTS[k].label+'<br><span class="small">'+fmt(W.STRUCTS[k].cost)+'</span></button>').join('')+'</div>';
  h+='<div class="sec">World Seed · program the planet</div><div class="row"><button data-seednext="1">🌱 Next region Mori picks</button><button data-globe="1">🌍 Open the globe</button></div>';
  h+='<div class="small">'+programmedCount()+' of '+PL.COUNT+' regions programmed. Every seed job adds one layer: terrain → roads → villages → city-state.</div>';
  { const rid=curRegion(), ok=stageOf(rid)>=1&&PL.regionInfo(rid).isLand; const ts=TF.stats(), sm=TF.summary()||{counts:{}};
    h+='<div class="sec">Terraform · '+PL.regionInfo(rid).name+' (the region you are in)</div><div class="row">'+Object.keys(TF.KINDS).map(k=>'<button data-tf="'+k+'" '+(ok?'':'disabled')+'>'+TF.KINDS[k].icon+' '+TF.KINDS[k].label+'</button>').join('')+'</div>';
    h+='<div class="small">'+(ok?'Mori shapes the land in front of you, a little each frame. Works here: '+(Object.entries(sm.counts).map(([k,v])=>v+'× '+TF.KINDS[k].label.toLowerCase()).join(', ')||'none yet')+' · '+ts.feats+'/'+TF.CAP.feats+' works · '+ts.trees+'/'+TF.CAP.trees+' planted trees · '+ts.flowers+'/'+TF.CAP.flowers+' planted flowers · '+ts.cells.toLocaleString()+'/'+TF.CAP.cells.toLocaleString()+' terrain cells · saved as '+(ts.bytes/1024).toFixed(1)+' KB of deltas.':'Void or ocean — seed this region before Mori can shape it.')+'</div>';
    h+='<div class="small">Performance: '+perfLine()+'</div>'; }
  h+='<div class="small">Built so far: '+(S.structs.length?S.structs.map(s=>W.STRUCTS[s.type].label).join(', '):'nothing yet')+'</div>';
  b.innerHTML=h;
  b.querySelectorAll('[data-q]').forEach(x=>x.onclick=()=>{ const [k,w]=x.dataset.q.split(':'); queueJob(k,w); log('Queued for Mori: '+jobLabel({kind:k,what:w})); });
  b.querySelectorAll('[data-rm]').forEach(x=>x.onclick=()=>{ jobs.splice(+x.dataset.rm,1); renderJobs(); });
  $('trustCb').onchange=e=>{ S.trust=e.target.checked; };
  b.querySelectorAll('[data-seednext]').forEach(x=>x.onclick=()=>{ const id=seedCandidate(); if(id<0) return log('Nothing seedable right now.'); queueJob('seed',id); log('Queued for Mori: '+jobLabel({kind:'seed',what:id})); renderJobs(); });
  b.querySelectorAll('[data-globe]').forEach(x=>x.onclick=()=>openGlobe());
  b.querySelectorAll('[data-tf]').forEach(x=>x.onclick=()=>{ queueTF(x.dataset.tf); renderJobs(); });
  bindCraftStations(b);
}

/* ---------- treasure → inventory ---------- */
const ROBERT_FX={'Weedwake Draught':{buff:'weedwake'},'Tokenbloom Elixir':{buff:'tokenbloom'},'Fence-Safe Charm':{ac:1},'Zero-Return Band':{zeroKeep:1},'Quiet Path Marker':{speed:0.1},"Mori's Green Veil":{ac:1},'Template Stylus':{},'Skinbinder Needle':{}};
/* MMO-style rarity tiers (Robert's house rule) */
const RARITY=[{k:'mundane',name:'Mundane',c:'#9d9d9d'},{k:'masterwork',name:'Masterwork',c:'#ffffff'},{k:'minor',name:'Minor magic',c:'#1eff00'},
  {k:'enhanced',name:'Enhanced + spell',c:'#2f8fff'},{k:'major',name:'Major',c:'#a335ee'},{k:'epic',name:'Epic / Artifact',c:'#ff8000'}];
function rarity(it){ const b=it.bonus||0, sp=(it.spells||[]).length+(it.special?1:0);
  if(it.mw&&sp===0&&it.cat!=='Crafted') return RARITY[1];
  if(b>=5||it.epic||it.artifact||/artifact|epic/i.test(it.cat||'')) return RARITY[5];
  if(b>=3||sp>=2) return RARITY[4];
  if(b>=1&&sp>=1) return RARITY[3];
  if(b>=1||sp>=1||/^(Potion|Ring|Wondrous Item|Magic|Robert)/.test(it.cat||'')||it.kind==='potion'||it.kind==='charm'||(it.fx&&Object.keys(it.fx).length&&it.cat!=='Equipment'&&!it.mw)) return RARITY[2];
  if(it.mw||/Masterwork/i.test(it.name||'')) return RARITY[1];
  return RARITY[0]; }
function rName(it,tag){ const r=rarity(it); return '<b style="color:'+r.c+'" title="'+r.name+' · '+(it.cat||'')+(it.value?' · '+it.value.toLocaleString()+' gp':'')+'">'+it.name+'</b>'+(tag?' <span class="small" style="color:'+r.c+'">['+r.name+']</span>':''); }
function charLevel(){ return 3+(S.clears||0)+Math.floor((S.qxp||0)/1000); } // v3.5: quest XP, guild pace 1,000 XP per level
// green-and-up gear starts dropping around character level 4-5: below treasure level 4, magic gear rolls come out as masterwork
function lootRoll(level){ const t=SRD.rollTreasure(level);
  if(level<4&&/^(Magic Weapon|Magic Armor)$/.test(t.cat)){ const w=t.kind==='weapon'; Object.assign(t,{cat:'Equipment', name:'Masterwork '+t.name.replace(/^\+\d+ /,'').replace(t.special?t.special+' ':'',''), bonus:0, special:'', mw:true, value:w?315:160, gated:true}); }
  else if(level<4&&/^(Ring|Wondrous Item)$/.test(t.cat)){ Object.assign(t,{cat:'Potion', name:'Potion of Cure Light Wounds', kind:'potion', value:50, fx:{heal:'1d8+1'}, gated:true}); }
  return t; }
function takeTreasure(t){
  if(t.gold){ S.gold+=t.gold; return t.name+' (gold)'; }
  const it={name:t.name, cat:t.cat, kind:t.kind==='armor'&&/Shield|Buckler/i.test(t.name)?'shield':t.kind, bonus:t.bonus||0, special:t.special||'', value:t.value||0, fx:Object.assign({}, t.fx||ROBERT_FX[t.name]||{}), curse:t.curse||'', note:t.note||''};
  if(t.name==='Template Stylus'){ const nt=TEMPLATES.find(x=>!S.templates.includes(x)); if(nt){ S.templates.push(nt); it.name+=' (taught '+nt+')'; } }
  addItem(it); return it.name; }
function rollHtml(t){ const r=rarity(t); return '<div class="rollbox" style="border-color:'+r.c+'88"><div class="pct">d% '+t.rolls.map(r=>'<b>'+String(r).padStart(2,'0')+'</b>').join(' → ')+'</div><div><b>'+t.cat+'</b>: '+(t.gold?t.name:rName(t,true))+(t.gated?' <span class="small">(magic gear drops from character level 4+)</span>':'')+(t.value?' <span class="small">('+t.value.toLocaleString()+' gp)</span>':'')+'</div></div>'; }
function walkUnlock(){ const r=Math.random(); if(r<0.34){ const d=DYES.find(x=>!S.dyes.includes(x.name)); if(d){ S.dyes.push(d.name); return 'Dye: '+d.name; } }
  else if(r<0.67){ const t=TEMPLATES.find(x=>!S.templates.includes(x)); if(t){ S.templates.push(t); return 'Template: '+t; } }
  else { const i=INSTRUMENTS.find(x=>!S.instruments.includes(x)); if(i){ S.instruments.push(i); return 'Instrument: '+i; } }
  S.larpy+=1; return '+1 LARPy'; }

/* ---------- modal ---------- */
function modal(html, wire){ $('modalCard').innerHTML=html+'<div class="row" style="justify-content:flex-end"><button id="mClose">Close</button></div>'; $('modal').classList.add('open'); $('mClose').onclick=closeModal; if(wire) wire($('modalCard')); }
function closeModal(){ $('modal').classList.remove('open'); }
$('modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });

function dollShop(){
  const line=DOLL_LINES[Math.floor(Math.random()*DOLL_LINES.length)];
  const goods=[['ww','Weedwake Draught',3,'+1 to every gather for 2 min'],['tb','Tokenbloom Elixir',4,'double Life from weeds for 2 min'],['fs','Fence-Safe Charm',5,'+1 AC, Robert-approved'],['zr','Zero-Return Band',12,'keep your gold when you Zero-Return'],['lt','Lawn Token ×5',1,'proof you stayed off the lawn (currency fluff)'],['ko','"+5 HAT" (knockoff)',1,'cursed: loyal follower of Delroth'],['kc','Knockoff Cloak of the Clan',2,'cursed: loyal follower of Delroth'],['kr','Rose of False Favor',1,'cursed: loyal follower of Delroth'],['ks','Scorpion Pin (plastic)',1,'cursed: loyal follower of Delroth']];
  LORE.unlock('npc_doll'); modal('<h3>🪆 Mori Doll · No Refunds</h3><div class="quote">"'+line+'"</div><div class="small">Lawn tokens: '+(S.lawnTokens||0)+' · '+(S.follower?'<i>loyal follower of Delroth</i>':'curse-free')+'</div>'+
   '<div class="sec">Exchange — Life → LARPy at 5 : 1</div><div class="row"><button class="pri" id="ex1">Trade 5 Life → 1 LARPy</button><button id="exAll">Trade all</button></div><div class="small">You have '+S.life+' Life · '+S.larpy+' LARPy</div>'+
   '<div class="sec">Goods (LARPy)</div>'+goods.map(g=>'<div class="q"><span>'+g[1]+' <span class="small">— '+g[3]+'</span></span><button data-buy="'+g[0]+'">'+g[2]+' 🎟</button></div>').join(''),
  c=>{ c.querySelector('#ex1').onclick=()=>{ if(S.life>=5){ S.life-=5; S.larpy++; log('Mori Doll: "Fine. One LARPy."'); dollShop(); } else log('Mori Doll: "Five. Life. Can you count?"'); };
       c.querySelector('#exAll').onclick=()=>{ const n=Math.floor(S.life/5); S.life-=n*5; S.larpy+=n; log('Traded '+n*5+' Life for '+n+' LARPy.'); dollShop(); };
       c.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{ const g=goods.find(x=>x[0]===b.dataset.buy); if(S.larpy<g[2]){ log('Mori Doll: "Not enough LARPy. Shoo."'); return; } S.larpy-=g[2];
         if(g[0]==='lt'){ S.lawnTokens=(S.lawnTokens||0)+5; log('Mori Doll: "Fine. Five lawn tokens. Stay off my lawn."'); LORE.unlock('npc_doll'); dollShop(); return; }
         if(g[0]==='ko'||g[0]==='kc'||g[0]==='kr'||g[0]==='ks'){ S.follower=true; S.curses=(S.curses||0)+1; takeTreasure({name:g[1], cat:"Robert's World", kind:'cursed', value:0, curse:'You are now a loyal follower of Delroth', note:'cheap knockoff · curse'});
           modal('<h3>'+g[1]+'</h3><div class="quote">A voice from the tavern whispers:<br><b>"You are now a loyal follower of Delroth."</b></div><div class="small">Curse is cosmetic. Mostly. Mori Doll: "Stay off my lawn."</div>'); LORE.unlock('npc_doll'); return; }
         takeTreasure({name:g[1], cat:"Robert's World", kind:g[0]==='zr'?'ring':g[0]==='fs'?'charm':'potion', value:0}); log('Bought '+g[1]+'. Mori Doll: "No refunds. Stay off my lawn."'); LORE.unlock('npc_doll'); dollShop(); }); });
}
function outpostShop(){
  const goods=[['holoTape','Holo Tape +1 Reach',45,'+15 range on swings (and +1 to hit)'],['legionBoots','Legion Boots',60,'you and friends move faster'],['dye','Gothic Rose Dye',20,'unlock the dye for the Template Painter'],['synth','Synth: Hologram',35,'friends hum; shadows flee (unlocks instrument)'],['goldPick','Gold Pick (real value)',80,'Mori mines ore in one swing (+1 ore)']];
  modal('<h3>🏕 Guild Outpost</h3><div class="small">Robert\'s originals, priced in LARPy. You have '+S.larpy+' 🎟 · '+S.gold+' gold.</div>'+
   goods.map(g=>{ const own=g[0]==='dye'?S.dyes.includes('Gothic Rose'):g[0]==='synth'?S.instruments.includes('Synth: Hologram'):S.outpost[g[0]]; return '<div class="q"><span>'+g[1]+' <span class="small">— '+g[3]+'</span></span>'+(own?'<span class="small">owned ✓</span>':'<button data-buy="'+g[0]+'">'+g[2]+' 🎟</button>')+'</div>'; }).join('')+
   '<div class="sec">Random magic item (SRD d% tables)</div><div class="row"><button class="pri" id="rollShop">🎲 Roll — 100 gold</button><button id="rollFree">🎲 Practice roll (no buy)</button></div><div id="rollOut"></div>',
  c=>{ c.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{ const g=goods.find(x=>x[0]===b.dataset.buy); if(S.larpy<g[2]){ log('Need '+g[2]+' LARPy. Trade Life at the Mori Doll (5:1).'); return; } S.larpy-=g[2];
      if(g[0]==='dye') S.dyes.push('Gothic Rose'); else if(g[0]==='synth') S.instruments.push('Synth: Hologram'); else S.outpost[g[0]]=true; log('Bought '+g[1]+'!'); save(); outpostShop(); });
    const doRoll=buy=>{ if(buy&&S.gold<100){ log('Need 100 gold.'); return; } const t=lootRoll(charLevel()); let got=''; if(buy){ S.gold-=100; got='<div class="small">Added: '+takeTreasure(t)+'</div>'; }
      c.querySelector('#rollOut').innerHTML=rollHtml(t)+got; showRoll(t.roll,'d% '+t.rolls.join(' → ')+' · '+t.name,''); };
    c.querySelector('#rollShop').onclick=()=>doRoll(true); c.querySelector('#rollFree').onclick=()=>doRoll(false); });
}

/* ---------- Item Creation Bench ---------- */
let benchCfg=JSON.parse(JSON.stringify(CRAFT.PRESETS.strider)); benchCfg.enh=benchCfg.enh||0; benchCfg.name="Robert's Strider Armor";
const CRAFT_DAY_SEC=3; // guild pace: 1 crafting day ≈ 3 s of game time
function house(){ S.house=Object.assign({}, CRAFT.HOUSE_DEFAULT, S.house||{}); return S.house; }
function crafterName(k){ if(k!=='you') return CRAFT.CRAFTERS[k].name; const c=allChars().find(x=>x.id===CH.sel); return 'You'+(c?' ('+c.name+(c.cls?', '+c.cls:'')+')':''); }
function crafterCL(k){ k=k||benchCfg.crafter||'mori'; return k==='you'?charLevel():CRAFT.CRAFTERS[k].cl; }
/* v3.5 bench fix: default to the first recipe the chosen crafter can actually make; locked bases sort last with a clear reason */
function baseLock(k,ccl){ const b=CRAFT.BASES[k], f=CRAFT.FEATS[b.feat]; return f&&ccl<f.cl?'needs '+f.name+' (caster level '+f.cl+'+); crafter is CL '+ccl:''; }
function benchOrder(ccl){ const ks=Object.keys(CRAFT.BASES); return ks.filter(k=>!baseLock(k,ccl)).concat(ks.filter(k=>baseLock(k,ccl))); }
function benchFit(force){ const C=CRAFT, HR=house(), ccl=crafterCL(); const cur=C.price(benchCfg,HR,ccl); if(!force&&!cur.featLocked&&!cur.issues.some(i=>/above the crafter/.test(i))) return false;
  const spellsByCost=Object.keys(C.SPELLS).sort((a,b)=>C.SPELLS[a].lvl-C.SPELLS[b].lvl||(a<b?-1:1)); let okAny=null, okAfford=null;
  for(const k of benchOrder(ccl)){ if(baseLock(k,ccl)) break; const b=C.BASES[k]; const use=b.use||((b.kind==='armor'||b.kind==='weapon')?'continuous':'use');
    const keep=(benchCfg.spells||[]).filter(sp=>C.minCL(C.SPELLS[sp].lvl)<=ccl); const cands=(keep.length&&!['scroll','potion','wand'].includes(use)?[keep]:[]).concat(spellsByCost.map(sp=>[sp]));
    for(const sp of cands){ const cfg=Object.assign({},benchCfg,{base:k,use,spells:sp,meta:[],enh:0,clBonus:0,ritual:false}); const pr=C.price(cfg,HR,ccl); if(!pr.ok) continue; if(!okAny) okAny=cfg; if(pr.guildGold<=S.gold){ okAfford=cfg; break; } }
    if(okAfford) break; }
  const pickCfg=okAfford||okAny; if(!pickCfg) return false; const nm=benchCfg.name; benchCfg=pickCfg; if(!nm||nm==="Robert's Strider Armor"||nm==='My Wondrous Item'||force) benchCfg.name=C.BASES[pickCfg.base].name+' of '+C.SPELLS[pickCfg.spells[0]].name; return true; }
function retitleBench(){ if(!CRAFT.staleBenchName||!CRAFT.staleBenchName(benchCfg.name, benchCfg.base)) return; const sp=benchCfg.spells&&benchCfg.spells[0]&&CRAFT.SPELLS[benchCfg.spells[0]]; benchCfg.name=CRAFT.titledName(benchCfg.base, sp&&sp.name); }
function benchUI(){
  benchFit(false); retitleBench();
  const C=CRAFT, HR=house(), ccl=crafterCL(), p=C.price(benchCfg, HR, ccl);
  const opt=(o,sel)=>Object.keys(o).map(k=>'<option value="'+k+'" '+(k===sel?'selected':'')+'>'+o[k].name+(o[k].price!==undefined?' ('+o[k].price+' gp)':'')+'</option>').join('');
  const metaOff=!HR.dmMeta&&(p.use==='continuous'||p.use==='use');
  let h='<h3>🔮 Item Creation Bench</h3><div class="small">SRD 3.5 pricing: spell level × caster level × base (use-activated/continuous 2,000 gp · command word 1,800 gp; charges/day ÷ (5/charges); continuous duration ×4 rounds, ×2 1 min/lvl, ×1.5 10 min/lvl). Metamagic raises effective spell level. Enhancement: bonus² × 1,000 gp (armor) / × 2,000 gp (weapon). Crafting time: 1 day per 1,000 gp of base price.</div>';
  h+='<div class="sec">Robert\'s House Rules</div><div class="row">'+[['maxEnh5','Max +5 enhancement'],['budget','Spell-level budget (5 +2 wiggle)'],['ritual','Quickened Ritual available'],['dmMeta','DM ruling: metamagic on continuous/use-activated']].map(([k,l])=>'<label class="chip"><input type="checkbox" data-hr="'+k+'" '+(HR[k]?'checked':'')+'> '+l+'</label>').join('')+'</div>';
  h+='<div class="row"><button class="pri" id="bpStrider">★ Preset: Robert\'s Strider Armor</button><button id="bpClear">Clear</button></div>';
  h+='<div class="row"><label>Name <input id="bName" value="'+(benchCfg.name||'').replace(/"/g,'&quot;')+'" style="width:190px"></label></div>';
  h+='<div class="row"><label>Crafter <select id="bCrafter">'+Object.keys(C.CRAFTERS).map(k=>'<option value="'+k+'" '+(k===(benchCfg.crafter||'mori')?'selected':'')+'>'+crafterName(k)+' · CL '+crafterCL(k)+'</option>').join('')+'</select></label></div>';
  h+='<div class="row"><label>Base <select id="bBase">'+benchOrder(ccl).map(k=>{ const b=C.BASES[k], f=C.FEATS[b.feat], lk=baseLock(k,ccl); return '<option value="'+k+'" '+(k===benchCfg.base?'selected':'')+'>'+(lk?'🔒 ':'')+b.name+(b.price?' ('+b.price+' gp)':'')+(lk?' — '+lk:(f?' · '+f.name+' CL'+f.cl:''))+'</option>'; }).join('')+'</select></label>'+(C.BASES[benchCfg.base].use?'<span class="small">'+C.USES[p.use].name+'</span>':'<label>Use <select id="bUse">'+Object.keys(C.USES).filter(k=>!C.USES[k].fixed).map(k=>'<option value="'+k+'" '+(k===p.use?'selected':'')+'>'+C.USES[k].name+'</option>').join('')+'</select></label>')+(p.use==='charges'?'<label>Charges/day <select id="bCh">'+[1,2,3,4,5].map(n=>'<option '+(n==benchCfg.charges?'selected':'')+'>'+n+'</option>').join('')+'</select></label>':'')+'</div>';
  if(p.base.kind==='armor'||p.base.kind==='weapon') h+='<div class="row"><label>Enhancement bonus <select id="bEnh">'+Array.from({length:p.enhMax+1},(_,n)=>'<option value="'+n+'" '+(n==Math.min(benchCfg.enh||0,p.enhMax)?'selected':'')+'>+'+n+'</option>').join('')+'</select></label><span class="small">max +'+p.enhMax+(HR.maxEnh5?' (house rule)':' (house rule off)')+'</span></div>';
  h+='<div class="sec">SRD spells</div><div class="row">'+Object.keys(C.SPELLS).map(k=>{ const s=C.SPELLS[k], on=benchCfg.spells.includes(k); return '<button type="button" class="chip'+(on?' on':'')+'" data-sp="'+k+'">'+s.name+' <span class="small">'+s.lvl+'</span></button>'; }).join('')+'</div>';
  h+='<div class="sec">Metamagic on the item\'s spells</div>'+(metaOff?'<div class="lock">DM ruling is off: no metamagic on '+C.USES[p.use].name.toLowerCase()+' items.</div>':'')+'<div class="row">'+Object.keys(C.METAMAGIC).map(k=>'<label class="chip"><input type="checkbox" data-mm="'+k+'" '+(benchCfg.meta.includes(k)?'checked':'')+' '+(metaOff?'disabled':'')+'> '+C.METAMAGIC[k].name+' <span class="small">+'+C.METAMAGIC[k].up+'</span></label>').join('')+'</div>';
  h+='<div class="row"><label>Caster level above minimum: <input type="range" id="bCl" min="0" max="10" value="'+(benchCfg.clBonus||0)+'"> +'+(benchCfg.clBonus||0)+'</label></div>';
  // budget bar
  const B=p.budget, pct=v=>Math.min(100,v/(B.max+2)*100);
  const bcol=B.state==='ok'?'#a3ff12':B.state==='wiggle'?'#facc15':'#ff4d6d';
  h+='<div class="sec">Spell-level budget'+(B.on?'':' (house rule off)')+'</div><div id="bBudget" style="position:relative;height:14px;background:#221a30;border-radius:7px;overflow:hidden"><i style="position:absolute;left:0;top:0;bottom:0;width:'+pct(B.used)+'%;background:'+bcol+'"></i><b style="position:absolute;left:'+pct(B.cap)+'%;top:0;bottom:0;width:2px;background:#fff"></b><b style="position:absolute;left:'+pct(B.max)+'%;top:0;bottom:0;width:2px;background:#ff4d6d"></b></div><div class="small">'+B.used+' effective spell levels · budget '+B.cap+' (+'+(B.max-B.cap)+' wiggle room = '+B.max+') · '+(B.state==='ok'?'within budget':B.state==='wiggle'?'using wiggle room':'over budget')+'</div>';
  // ritual
  h+='<div class="sec">Crafting ritual</div>'+(HR.ritual?'<label class="chip"><input type="checkbox" id="bRitual" '+(benchCfg.ritual?'checked':'')+'> ⚡ Quickened Ritual: instant crafting, +'+(C.RITUAL.gp*100)+'% gp & +'+(C.RITUAL.xp*100)+'% XP</label><div class="small">This speeds up the ritual itself. It is not Quicken Spell on the item\'s spell (e.g. a quickened true strike).</div>':'<div class="small">Quickened Ritual is turned off in the house rules.</div>');
  h+='<div class="sec">Price breakdown</div><table class="pt"><tr><th>Ability</th><th>Formula</th><th>gp</th><th>×</th></tr>'+p.lines.map(l=>'<tr><td>'+l.name+' (eff. lvl '+l.eff+')</td><td class="small">'+l.note+'</td><td>'+l.gp.toLocaleString()+'</td><td>'+(l.factor*100)+'%</td></tr>').join('')+(p.enh?'<tr><td>+'+p.enh+' enhancement</td><td class="small">'+p.enh+'² × '+(p.base.kind==='weapon'?'2,000':'1,000')+'</td><td>'+p.enhGp.toLocaleString()+'</td><td>100%</td></tr>':'')+'</table>';
  { const pv={name:benchCfg.name||p.base.name, bonus:p.enh, spells:p.lines.map(l=>l.name), cat:'Crafted', value:p.total}; h+='<div class="row">Result: '+rName(pv,true)+'</div>'; }
  h+='<div>Base item: '+p.base.price.toLocaleString()+' gp · Magic: '+p.magic.toLocaleString()+' gp<br><b>Market price: '+p.total.toLocaleString()+' gp</b><br>Craft cost: <b>'+p.craftGp.toLocaleString()+' gp + '+p.xp.toLocaleString()+' XP</b>'+(p.ritual?' <span class="small">(incl. ritual surcharge '+p.surchargeGp.toLocaleString()+' gp + '+p.surchargeXp.toLocaleString()+' XP)</span>':'')+'<br>Crafting time: <b id="bTime">'+p.time.label+'</b>'+(p.time.instant||!p.magic?'':' <span class="small">(guild pace: 1 day ≈ '+CRAFT_DAY_SEC+' s, so about '+fmtSec(p.time.days*CRAFT_DAY_SEC)+')</span>')+'</div>';
  if(p.issues.length) h+='<div class="lock">'+p.issues.join('<br>')+'</div>';
  h+='<div class="small">Effect in game: '+(Object.entries(p.fx).map(([k,v])=>(k==='speed'?'+'+Math.round(v*100)+'% speed':'+'+v+' '+k.toUpperCase())).join(', ')||'flavor only')+'</div>';
  const busy=(S.crafting||[]).length>0;
  h+='<div class="row"><button class="pri" id="bCraft" '+(p.ok&&!busy?'':'disabled')+'>⚒ Craft for '+p.guildGold+' gold'+(p.time.instant?' (instant)':' ('+p.time.label+')')+'</button></div><div class="small">Guild rate: 1 gold per 1,000 gp of craft cost. You have '+S.gold+' gold.'+(busy?' The bench is busy: '+S.crafting[0].name+', '+fmtSec(S.crafting[0].remain)+' left.':'')+'</div>';
  modal(h, c=>{
    const re=()=>benchUI();
    c.querySelectorAll('[data-hr]').forEach(x=>x.onchange=()=>{ S.house[x.dataset.hr]=x.checked; if(!S.house.ritual) benchCfg.ritual=false; save(); re(); });
    c.querySelector('#bpStrider').onclick=()=>{ benchCfg=JSON.parse(JSON.stringify(CRAFT.PRESETS.strider)); re(); };
    c.querySelector('#bpClear').onclick=()=>{ benchCfg={name:'My Wondrous Item',base:'cloak',use:'use',spells:[],meta:[],clBonus:0,charges:3,enh:0,ritual:false,crafter:benchCfg.crafter||'mori'}; re(); };
    c.querySelector('#bName').oninput=e=>{ benchCfg.name=e.target.value; };
    c.querySelector('#bBase').onchange=e=>{ benchCfg.base=e.target.value; re(); };
    const bu=c.querySelector('#bUse'); if(bu) bu.onchange=e=>{ benchCfg.use=e.target.value; re(); };
    c.querySelector('#bCrafter').onchange=e=>{ benchCfg.crafter=e.target.value; benchFit(true); re(); };
    const en=c.querySelector('#bEnh'); if(en) en.onchange=e=>{ benchCfg.enh=+e.target.value; re(); };
    const rt=c.querySelector('#bRitual'); if(rt) rt.onchange=e=>{ benchCfg.ritual=e.target.checked; re(); };
    const ch=c.querySelector('#bCh'); if(ch) ch.onchange=e=>{ benchCfg.charges=+e.target.value; re(); };
    c.querySelectorAll('[data-sp]').forEach(x=>x.onclick=()=>{ const k=x.dataset.sp; benchCfg.spells=benchCfg.spells.includes(k)?benchCfg.spells.filter(s=>s!==k):benchCfg.spells.concat(k); re(); });
    c.querySelectorAll('[data-mm]').forEach(x=>x.onchange=()=>{ const k=x.dataset.mm; benchCfg.meta=x.checked?benchCfg.meta.concat(k):benchCfg.meta.filter(s=>s!==k); re(); });
    c.querySelector('#bCl').onchange=e=>{ benchCfg.clBonus=+e.target.value; re(); };
    c.querySelector('#bCraft').onclick=()=>craftItem();
  });
}
function fmtSec(t){ t=Math.ceil(t); return t<60?t+' s':Math.floor(t/60)+' min '+(t%60)+' s'; }
function craftItem(cfg){ cfg=JSON.parse(JSON.stringify(cfg||benchCfg)); const p=CRAFT.price(cfg, house(), crafterCL(cfg.crafter||'mori')); if(!p.ok){ log(p.issues[0]||'Pick at least one spell or an enhancement bonus.'); return null; }
  if((S.crafting||[]).length){ log('The bench is busy with '+S.crafting[0].name+'.'); return null; }
  if(S.gold<p.guildGold){ log('Need '+p.guildGold+' gold to craft that. Loot the Undercroft!'); return null; }
  S.gold-=p.guildGold; S.xpSpent=(S.xpSpent||0)+p.xp;
  const item={name:cfg.name||p.base.name, cat:'Crafted', kind:p.base.kind, bonus:p.enh||0, armorType:p.base.armorType, mw:!!p.base.mw||undefined, value:p.total, crafted:true,
    spells:p.lines.map(l=>l.name), meta:(p.metaBlocked?[]:(cfg.meta||[])).map(m=>CRAFT.METAMAGIC[m].name), use:CRAFT.USES[p.use].name, fx:Object.assign({},p.fx), crafter:crafterName(cfg.crafter||'mori'),
    craftNote:(p.ritual?'Quickened Ritual (instant)':p.time.label+' at the bench')+' · '+p.craftGp.toLocaleString()+' gp + '+p.xp.toLocaleString()+' XP'};
  if(!p.time.instant){ S.crafting=[{name:item.name, item, remain:p.time.days*CRAFT_DAY_SEC, total:p.time.days*CRAFT_DAY_SEC}];
    log((p.ritual?'Ritual begun: ':'Crafting begun: ')+item.name+'. '+p.time.label+' of crafting (about '+fmtSec(p.time.days*CRAFT_DAY_SEC)+' at guild pace).'); save(); if($('modal').classList.contains('open')) benchUI(); return {pending:true, name:item.name, remain:S.crafting[0].remain}; }
  return finishCraft(item); }
function finishCraft(item){ const it=addItem(item);
  S.inv.forEach(x=>{ if(x!==it&&x.equipped&&x.kind===it.kind&&(it.kind==='armor'||it.kind==='weapon')) x.equipped=false; }); it.equipped=true;
  S.crafted++; log('Crafted '+it.name+' ['+rarity(it).name+'] ('+it.value.toLocaleString()+' gp market value), saved to your bag.'); save(); if($('modal').classList.contains('open')&&$('modal').innerHTML.includes('Item Creation Bench')) benchUI(); return it; }
function updateCrafting(dt){ const c=(S.crafting||[])[0]; if(!c) return; c.remain-=dt; if(c.remain<=0){ S.crafting=[]; finishCraft(c.item); } }

/* ---------- Bag & Template Painter ---------- */
function renderBag(){ const b=$('bagBody'); const st=stats(); const ch=charById(CH.sel);
  let h='<div class="small">AC '+st.ac+' <span title="SRD: '+st.acNote+'">('+st.acNote+')</span> · Attack +'+st.atk+' · Damage 1d8+'+st.dmg+' · Speed +'+Math.round(st.speed*100)+'%'+(S.follower?' · <i>loyal follower of Delroth</i>':'')+'</div>';
  h+='<div class="sec">Items ('+S.inv.length+')</div>';
  h+='<div class="q barRow" data-bar-spell="1"><span class="barDrag" title="Spell. Not in the world yet."><b>Spell</b> <span class="small">Placeholder. Drag onto the 1–9 bar.</span></span></div>';
  h+=(S.inv.length?S.inv.map(it=>{ const salve=it.kind==='salve'; const tip=salve?'Salve. Heals over time. No roll.':'Drag onto the action bar'; return '<div class="q barRow" data-bar-id="'+it.id+'"><span class="barDrag" title="'+tip+'">'+(it.equipped?'✅ ':'')+(salve&&!/salve/i.test(it.name)?'Salve: ':'')+rName(it)+' <span class="small">'+rarity(it).name+' · '+(it.cat||'')+(it.spells?' · '+it.spells.join(', ')+(it.meta&&it.meta.length?' ['+it.meta.join(', ')+']':'')+' · '+it.use+(it.craftNote?' · '+it.craftNote:''):'')+(it.value?' · '+it.value.toLocaleString()+' gp':'')+(it.durability!=null?' · dur '+it.durability+'/'+it.maxDur+' · life '+((it.lifetime||0)-(it.uses||0))+' left':'')+'</span></span>'+
    (it.kind==='tablet'?'<button data-tablet="1">Open</button>':it.kind==='potion'||it.kind==='scroll'||it.kind==='thrown'||it.kind==='bandage'||it.kind==='salve'?'<button data-use="'+it.id+'">'+(it.kind==='scroll'?'Read':it.kind==='thrown'?'Throw':it.kind==='bandage'?'Bind':it.kind==='salve'?'Apply':'Drink')+'</button>':it.kind==='quest'?'<span class="small">quest item</span>':'<button data-eq="'+it.id+'">'+(it.equipped?'Unequip':'Equip')+'</button>')+(it.value>1&&!it.equipped?'<button data-sell="'+it.id+'" title="SRD: items sell for half their market price">Sell '+Math.floor(it.value/2).toLocaleString()+'</button>':'')+(it.crafted&&!it.equipped?'<button data-treas="'+it.id+'">Treasury buys</button>':'')+'</div>'; }).join(''):'<div class="small">Empty. Open chests in the Undercroft, roll at the Outpost or craft at the bench.</div>');
  h+=GATHERING.bagHTML();
  h+='<div class="sec">Template Painter — '+(ch.locked?'(locked preset: duplicate it in HeroLock to paint)':ch.name)+'</div>';
  h+='<div class="small">Templates owned: '+S.templates.join(', ')+'</div><div class="row">'+
    [['hairStyle','wolfcut','Hair: Wolfcut'],['corset',true,'Leather: Corset'],['pauldron',true,'Armor: Pauldron'],['bootStyle','stomper','Boots: Stomper']].map(([k,v,t])=>'<button data-tpl="'+k+'|'+v+'" '+(S.templates.includes(t)&&!ch.locked?'':'disabled')+'>'+(ch[k]===v?'✓ ':'')+t+'</button>').join('')+'</div>';
  h+='<div class="small">Dye slot: <select id="dyeSlot"><option value="top">Top</option><option value="armor">Armor</option><option value="boots">Boots</option><option value="hair">Hair</option></select></div><div class="row">'+
    DYES.map(d=>'<button data-dye="'+d.hex+'" title="'+d.name+'" '+(S.dyes.includes(d.name)&&!ch.locked?'':'disabled')+' style="border-left:14px solid '+d.hex+'">'+d.name+'</button>').join('')+'</div>';
  h+='<div class="small">Instruments: '+(S.instruments.join(', ')||'none yet')+' · Outpost: '+(Object.keys(S.outpost).join(', ')||'nothing yet')+'</div>';
  b.innerHTML=h;
  b.querySelectorAll('[data-tablet]').forEach(x=>x.onclick=()=>openTablet());
  b.querySelectorAll('[data-use]').forEach(x=>x.onclick=()=>{ drink(S.inv.find(i=>i.id===x.dataset.use)); renderBag(); });
  b.querySelectorAll('[data-sell]').forEach(x=>x.onclick=()=>{ const it=S.inv.find(i=>i.id===x.dataset.sell); if(!it) return; const g=Math.floor(it.value/2); S.inv.splice(S.inv.indexOf(it),1); S.gold+=g; log('Sold '+it.name+' for '+g.toLocaleString()+' gold (half its '+it.value.toLocaleString()+' gp price). 1 gold = 1 gp.'); save(); renderBag(); });
  b.querySelectorAll('[data-treas]').forEach(x=>x.onclick=()=>{ const it=S.inv.find(i=>i.id===x.dataset.treas); if(!it||!window.STATIONS) return; const r=STATIONS.treasuryBuyCrafted(it); if(!r.ok){ log('Treasury: '+ (r.why||'cannot buy')); return; } S.inv.splice(S.inv.indexOf(it),1); log('Guild treasury bought '+it.name+' for '+r.paid+' Mori Marks.'); save(); renderBag(); });
  b.querySelectorAll('[data-rsell]').forEach(x=>x.onclick=()=>{ const id=x.dataset.rsell, nm=GATHERING.R[id].name, n=S.reag[id]; const g=GATHERING.sell(id); log('Sold '+n+'× '+nm+' for '+g+' gold.'); noteCivic('trade', id); save(); renderBag(); });
  b.querySelectorAll('[data-eq]').forEach(x=>x.onclick=()=>{ const it=S.inv.find(i=>i.id===x.dataset.eq); const was=it.equipped; if(!was&&['weapon','armor','ring','shield'].includes(it.kind)) S.inv.forEach(o=>{ if(o.kind===it.kind) o.equipped=false; }); it.equipped=!was; renderBag(); save(); });
  b.querySelectorAll('[data-tpl]').forEach(x=>x.onclick=()=>{ const [k,v]=x.dataset.tpl.split('|'); const val=v==='true'?true:v; ch[k]=ch[k]===val?(k==='hairStyle'?'short':k==='bootStyle'?'plain':false):val; saveChars(); rebuildPlayer(); renderBag(); });
  b.querySelectorAll('[data-dye]').forEach(x=>x.onclick=()=>{ ch[$('dyeSlot').value]=x.dataset.dye; saveChars(); rebuildPlayer(); renderBag(); });
}
function bindCraftStations(root){ if(!window.STATIONS||!root) return;
  root.querySelectorAll('[data-pot]').forEach(b=>b.onclick=()=>{ const id=b.dataset.pot; const can=STATIONS.canUpgradeTo('pot',id); if(!can.ok&&!can.already&&id!==STATIONS.bag().pot){ log('Pot upgrade: '+(can.why||'locked')); return; }
    STATIONS.unlockNext('pot',id); log('⚗ Alchemy pot set to '+STATIONS.potTier().label+(STATIONS.canGreen()?' — green / magic unlocked!':'')); save(); renderJobs(); });
  root.querySelectorAll('[data-forge]').forEach(b=>b.onclick=()=>{ const id=b.dataset.forge; const can=STATIONS.canUpgradeTo('forge',id); if(!can.ok&&!STATIONS.hasUnlock(id)&&id!==STATIONS.bag().forge){ log('Forge upgrade: '+(can.why||'locked')); return; }
    STATIONS.unlockNext('forge',id); log('🔥 Forge set to '+STATIONS.forgeTier().label); save(); renderJobs(); });
  root.querySelectorAll('[data-encf]').forEach(b=>b.onclick=()=>{ STATIONS.enableEnchantForge(); STATIONS.gain('enchanting',5); log('✦ Enchanting Forge ready — magic weapons & armor.'); save(); renderJobs(); });
  root.querySelectorAll('[data-encc]').forEach(b=>b.onclick=()=>{ STATIONS.enableEnchantCircle(); STATIONS.gain('enchanting',5); log('◯ Enchanting Circle ready — wondrous items.'); save(); renderJobs(); });
  root.querySelectorAll('[data-smith]').forEach(b=>b.onclick=()=>{ const r=STATIONS.smithSword({kind:b.dataset.smith}); if(!r.ok){ showRoll(r.roll.d,r.msg,'foe'); log(r.msg); return; } addItem(r.item); showRoll(r.roll.d,r.msg,'crit'); log(r.msg); save(); renderJobs(); renderBag(); });
  root.querySelectorAll('[data-blend]').forEach(b=>b.onclick=()=>{ const r=HERBAL.brewBlend(b.dataset.blend,false); if(!r||!r.ok){ log('Missing reagents for that blend.'); return; } addItem(r.item); log('Brewed '+r.item.name+(r.item.kind==='salve'?' — Salve. Heals over time. No roll.':'')); save(); renderJobs(); renderBag(); });
  root.querySelectorAll('[data-blendmyth]').forEach(b=>b.onclick=()=>{ if(!STATIONS.canGreen()){ log('Magic-tier blends need a brass+ pot.'); return; } const r=HERBAL.brewBlend(b.dataset.blendmyth,true); if(!r||!r.ok){ log('Missing reagents (incl. mythical).'); return; } addItem(r.item); log('💚 Magic blend: '+r.item.name); save(); renderJobs(); renderBag(); });
}
function drink(it){
  /* v3.8 healing ladder: bandages / salves / grey HoT / green instant via HERBAL; thrown & buffs stay here */
  if(!it){ it=HERBAL.pickHotbar('potion')||potions().find(p=>p.fx&&(p.fx.heal||p.fx.hot))||potions()[0]; }
  if(!it){ log('No potions. Brew a grey draught, green cure (brass+ pot), or ask Mori for Cure Light.'); return; }
  const f=it.fx||ROBERT_FX[it.name]||{};
  if(it.kind==='bandage'||it.kind==='salve'||(it.kind==='potion'&&(f.heal||f.hot||it.tier==='green'||it.tier==='grey'))){
    HERBAL.useHealItem(it); save(); renderHotbar(); return; }
  S.inv.splice(S.inv.indexOf(it),1);
  if(f.thrown){ let best=null, bd=8; (mode==='dungeon'?mobs:GATHERING.crit).forEach(m=>{ if(!m.alive) return; const d=Math.hypot(m.x-player.pos.x,m.z-player.pos.z); if(d<bd){ bd=d; best=m; } });
    if(!best){ log(it.name+' shatters on the ground and burns out. (No target within 8 m.)'); } else { const n=SRD.dice(f.thrown); best.m.hp-=n; best.hit=0.25; best.ag=true; showRoll(n,it.name+': '+n+' fire damage to '+best.m.name+' (SRD: 1d6 fire, ranged touch)',''); if(best.m.hp<=0) killMob(best,mode==='dungeon'); } }
  else if(f.buff){ S.buffs[f.buff]=120; log(it.name+'! '+(f.buff==='weedwake'?'Gathering +1 for 2 min.':f.buff==='tokenbloom'?'Weeds give double Life for 2 min.':f.buff==='atk'?'+2 attack for 2 min.':f.buff==='antitoxin'?'+5 on saves against poison (SRD alchemical bonus).':f.buff==='repose'?'Carcasses you make keep four times as long for skinning.':f.buff==='halt'?'Undead will not attack you for 2 min.':f.buff==='ease'?'Aches ease for a while.':f.buff==='clarity'?'Mind feels clearer.':'+2 AC for 2 min.')); }
  else if(f.heal){ const n=SRD.dice(f.heal); S.hp=Math.min(stats().maxHp,S.hp+n); showRoll(n,it.name+': healed '+f.heal+' = '+n,''); }
  save(); renderHotbar(); }
function useHotbar(slot){ const it=HERBAL.pickHotbar(slot); if(!it){ log(slot==='bandage'?'No bandages — craft linen bandages at the alchemy table.':slot==='salve'?'No salves. A salve heals over time, with no roll. Brew a lavender or yarrow blend.':'No potions.'); return; } drink(it); }
function renderHotbar(){ const h=HERBAL.hotbarHTML(); const phone=document.body.classList.contains('phone'); const b=$('bBandage'), s=$('bSalve'), p=$('bPotion');
  if(b){ b.textContent='Bandage'+(phone?'':' ('+h.bandage+')'); b.title='Bandage ('+h.bandage+'). Heal check, then healing over time.'; }
  if(s){ s.textContent='Salve'+(phone?'':' ('+h.salve+')'); s.title='Salve ('+h.salve+'). Heals over time. No roll.'; s.setAttribute('aria-label','Salve. Heals over time. No roll.'); }
  if(p){ p.textContent=phone?('🧪 '+h.potion):('🧪 Potion ('+h.potion+')'+(h.green?' 💚'+h.green:'')+(h.grey?' ⚪'+h.grey:'')); p.title='Potion ('+h.potion+')'; }
  renderBar(); }
function barCount(slot){ if(!slot||slot.type!=='item') return ''; if(slot.id&&S.inv.some(i=>i.id===slot.id)) return ''; const n=S.inv.filter(i=>slot.kind&&i.kind===slot.kind).length; return slot.kind?String(n):''; }
function renderBar(){ if(!window.HOTBAR||!$('barSlots')) return; if(!S.bars) S.bars=HOTBAR.restore(null); const row=S.bars.pages[S.bars.page]||[];
  const host=$('barSlots');
  const sig=S.bars.page+'|'+row.map(s=>HOTBAR.label(s)+':'+(s&&(s.id||s.kind||s.type)||'')+':'+barCount(s)).join(',');
  if(host.dataset.sig!==sig){ host.dataset.sig=sig;
    host.innerHTML=row.map((slot,i)=>{ const name=HOTBAR.label(slot)||''; const n=barCount(slot); const tip=HOTBAR.tip(slot)+(n!==''?' ('+n+')':'');
      return '<button type="button" class="barSlot'+(slot?'':' empty')+'" data-slot="'+i+'" title="'+tip.replace(/"/g,'')+'"><span class="k">'+(i+1)+'</span><span class="n">'+(name||'·')+'</span></button>'; }).join(''); }
  if($('barPage')) $('barPage').textContent=(S.bars.page+1)+'/'+HOTBAR.PAGES; }
function useSlot(i){ if(!S.bars) return; const slot=S.bars.pages[S.bars.page][i]; if(!slot){ log('That bar slot is empty. Drag an item from the bag.'); return; }
  if(slot.type==='attack'){ attack(); return; }
  if(slot.type==='spell'){ log('Spell. Not in the world yet. This slot is only a place holder.'); return; }
  let it=slot.id?S.inv.find(x=>x.id===slot.id):null;
  if(!it&&slot.kind) it=HERBAL.pickHotbar(slot.kind)||S.inv.find(x=>x.kind===slot.kind);
  if(!it){ log(HOTBAR.label(slot)+' is not in the bag.'); return; }
  if(it.kind==='bandage'||it.kind==='salve'||it.kind==='potion'||it.kind==='scroll'||it.kind==='thrown') drink(it);
  else log(it.name+' sits on the bar. Open the bag to equip it.');
  renderBar(); }
function turnBar(dir){ if(!window.HOTBAR) return; S.bars=HOTBAR.turn(S.bars, dir); save(); renderBar(); }

/* ---------- Talk / Beat / Blue room ---------- */
let chatHist=[], chatAlt=0, lastUser='', lastReply=null;
function addChat(who, text, npc, meta){ const d=document.createElement('div'); d.className='msg '+who; const prefix=(who==='mo'?'Mori: ':who==='npc'?(npc?npc.short||npc.name:'?')+': ':who==='sys'?'':'You: ');
  const t=document.createElement('span'); t.className='msgT'; t.textContent=prefix+text; d.appendChild(t);
  const id='c'+Date.now().toString(36)+Math.floor(Math.random()*999); d.dataset.id=id; d.dataset.who=who;
  if(who==='me'||who==='mo'||who==='npc'){ const ctl=document.createElement('span'); ctl.className='msgCtl';
    if(who==='me'){ const b=document.createElement('button'); b.textContent='✏️'; b.title='Edit'; b.onclick=()=>chatEdit(id); ctl.appendChild(b); }
    if(who==='mo'||who==='npc'){ const r=document.createElement('button'); r.textContent='🔄'; r.title='Regenerate'; r.onclick=()=>chatRegen(id); ctl.appendChild(r);
      const p=document.createElement('button'); p.title='Pin'; p.textContent='📌'; p.onclick=()=>chatPin(id); ctl.appendChild(p); }
    d.appendChild(ctl); }
  $('chatLog').appendChild(d); while($('chatLog').children.length>120) $('chatLog').firstChild.remove(); $('chatLog').scrollTop=1e6;
  const rec={id, who, text, npcId:npc&&npc.id, alts:(meta&&meta.alts)||[], intent:meta&&meta.intent}; chatHist.push(rec); if(chatHist.length>80) chatHist.shift();
  if(who==='me') lastUser=text; if(who==='mo'||who==='npc') lastReply=rec;
  if(who==='mo') speak(text); if(who==='npc') speak(text,npc&&npc.voice); return d; }
function chatEdit(id){ const rec=chatHist.find(x=>x.id===id); if(!rec||rec.who!=='me') return; const nv=prompt('Edit your message:', rec.text); if(nv==null) return; const v=String(nv).trim(); if(!v) return;
  const log=$('chatLog'); let drop=false; [...log.children].forEach(ch=>{ if(ch.dataset.id===id) drop=true; if(drop) ch.remove(); });
  let seen=false; chatHist=chatHist.filter(h=>{ if(h.id===id){ seen=true; return false; } return !seen; });
  addChat('sys','✏️ edited'); sendChat(v); }
function chatRegen(id){ const rec=chatHist.find(x=>x.id===id); if(!rec||(rec.who!=='mo'&&rec.who!=='npc')) return; chatAlt=(chatAlt+1);
  const el=[...$('chatLog').children].find(c=>c.dataset.id===id); if(!el) return;
  if(rec.who==='npc'&&chatNpc){ const d=NPCS.byId(chatNpc); const st=npcState(d); st.alt=chatAlt; st.d20=SRD.rnd(20); const res=NPCS.npcReply(d, lastUser||'', st);
    const apply=r=>{ if(!r) return; let txt=r.text; const alts=r.alts||[]; if(alts.length){ const seed=String(S.seed||'mori')+'|'+d.id+'|'+(r.intent||'')+'|'+chatAlt; let h=2166136261; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619);} txt=alts[Math.abs(h>>>0)%alts.length]; }
      el.querySelector('.msgT').textContent=(d.short||d.name)+': '+txt; rec.text=txt; rec.alts=alts; lastReply=rec; MEMORY.addMem(d.id,'[regen] '+String(txt).slice(0,120),'regen'); save(); };
    if(res&&typeof res.then==='function') res.then(apply); else apply(res); return; }
  const c=moriCtx(); c.n=(c.n||0)+chatAlt; let txt=MORICHAT.reply(lastUser||'what is your rule',c)||MORICHAT.fallback(c);
  const alts=(MORICHAT.alts&&MORICHAT.alts(lastUser||'',c))||[]; if(alts.length){ const seed=String(S.seed||'mori')+'|mori|'+(c.intent||'')+'|'+chatAlt; let h=2166136261; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619);} txt=alts[Math.abs(h>>>0)%alts.length]; }
  el.querySelector('.msgT').textContent='Mori: '+txt; rec.text=txt; lastReply=rec; save(); }
function chatPin(id){ const rec=chatHist.find(x=>x.id===id); if(!rec) return; const npcId=chatNpc||'mori'; MEMORY.onPinChat(npcId, rec.text); if(npcId!=='mori') MEMORY.addXP(npcId,1); addChat('sys','📌 pinned'); if($('memP')&&$('memP').classList.contains('open')) renderMemory(); save(); }
function sendChat(raw){ let v=(raw!=null?String(raw):$('chatIn').value).trim(); if(!v) return; if(raw==null) $('chatIn').value=''; addChat('me',v);
  if(chatNpc){ const mm=/^(mori)[,:!]\s*(.*)$/i.exec(v); if(/^(mori|back to mori|talk to mori)$/i.test(v)){ endNpc(); openMoriChat(); return; } if(mm&&mm[2]) v=mm[2]; else { npcSay(v); return; } }
  moriN++; const s=v.toLowerCase();
  if(S.blue&&!/wake/.test(s)){ addChat('mo','zzz… (blue room. press Wake Mori.)'); return; }
  if(/wake/.test(s)){ wakeMori(); return; }
  let m;
  if((m=/^remember (.+)/i.exec(v))){ if(confirm('Parent check: let Mori add a memory?\n\n"'+m[1]+'"')){ ENG.adjustSelf({addMemory:m[1]}); addChat('mo','ok i rember "'+m[1]+'". i am '+ENG.memoryLog.version+' now.'); } else addChat('mo','ok dad. i won\'t change.'); updBrain(); return; }
  if((m=/^add room (.+)/i.exec(v))){ if(confirm('Parent check: let Mori add a room?\n\n"'+m[1]+'"')){ ENG.adjustSelf({addRoom:m[1]}); addChat('mo','new room: '+m[1]+'!'); } else addChat('mo','ok. no new room.'); updBrain(); return; }
  // v3.5: personality first — her #1 rule, intros, greetings, help, the world, quests (skipped when the line is a build/gather/craft command)
  { const cmd=/\b(build|plant|grow|raise|dig|carve|flatten|level|smooth|forge|brew|gather|mine|chop|pull|seed|program|cleanse|purge|raid|terraform|make a|add a)\b/.test(s); const c=moriCtx();
    const r=MORICHAT.reply(v,c); if(r&&(!cmd||['rule','behave','intro','feel','friend','world'].includes(c.intent))&&!['gather','craft','combat','places','thanks','bye','mori'].includes(c.intent)){ addChat('mo',r,{intent:c.intent,alts:MORICHAT.alts&&MORICHAT.alts(v,c)}); LORE.unlock('npc_mori'); save(); return; } }
  // v3.4: Mori knows where the reagents are, plans gather runs, and talks about Gravenmoor / Havenwall
  if(/\b(where|find|any|look|nearest|see)\b/.test(s)){ const named=GATHERING.whereNamed&&GATHERING.whereNamed(s); if(named){ addChat('mo',named); return; } if(/(herb|flower|petal|leaf|root|ore|metal|iron|copper|tin|zinc|manganese|nickel|clay|silver|mithral|adamant|stone|rock|granite|marble|obsidian|wood|log|timber|tree|oak|pine|yew|mint|lavender)/.test(s)){ const a=GATHERING.where(s); if(a){ addChat('mo',a); return; } } }
  if(/\b(gather|herb|mining|ore|wood|lumber)(ing)? (run|trip)\b|\bgo gather/.test(s)){ addChat('mo',GATHERING.planRun(s)); return; }
  if(/\b(cleanse|purge)\b|\bclan raid\b/.test(s)){ addChat('mo',queueCleanse(/clan|raid/.test(s)?'clan':'kin',true)); return; }
  if(/gravenmoor|havenwall|demon clan|coilblight|\blegion\b|death of earth|moonfang|brakka|pale.*mantle/.test(s)){ addChat('mo',CLAN.moriLine()); return; }
  { const verb=/\b(plant|grow|raise|make|build|carve|dig|flatten|level|smooth|add|create|terraform|shape|lower|sink|put)\b/.test(s);
    let k=/\b(flowers?|meadow|blossoms?|wildflowers?|blooms?)\b/.test(s)?'meadow':/\b(trees?|grove|forest|woods|orchard)\b/.test(s)?'grove':/\bmountains?\b/.test(s)?'mountain':/\bhills?\b|\b(raise|lift)\b.*\b(earth|ground|land)\b/.test(s)?'hill':/\b(lake|pond)\b/.test(s)?'lake':/\b(river|riverbed|stream|creek)\b/.test(s)?'river':/\b(flatten|level|smooth)\b/.test(s)?'flatten':/\b(lower|sink)\b.*\b(earth|ground|land)\b/.test(s)?'lake':null;
    if(!k&&/\bterraform/.test(s)){ const t=tfSuggestion(); k=t?t.what.split('|')[0]:'grove'; }
    if(k&&verb){ const j=queueTF(k); if(j) addChat('mo','ok! '+TF.KINDS[k].label.toLowerCase()+' here in '+PL.regionInfo(curRegion()).name+'. watch the land!'); else addChat('mo','i can\'t shape this place yet.'); return; } }
  for(const k in W.STRUCTS){ if(s.includes('build')&&(s.includes(k)||s.includes(W.STRUCTS[k].label.toLowerCase()))){ queueJob('build',k); addChat('mo','ok i build a '+W.STRUCTS[k].label.toLowerCase()+'! added to my jobs.'); return; } }
  for(const k of ['timber','ore','herbs','weeds']) if(s.includes(k)&&/(get|gather|mine|pick|pull|chop)/.test(s)){ queueJob('gather',k); addChat('mo','going to get '+k+'!'); return; }
  for(const k in BREWS) if(s.includes(k)||(k==='clw'&&/heal/.test(s))){ queueJob('brew',k); addChat('mo','brewing '+BREWS[k].label.toLowerCase()+'.'); return; }
  for(const k in FORGES) if(s.includes(k)){ queueJob('forge',k); addChat('mo','grizzik! we forge a '+FORGES[k].label.toLowerCase()+'.'); return; }
  if(/\bseed|program/.test(s)){ const id=seedCandidate(); if(id<0){ addChat('mo','nothing to seed right now. the edge is all done!'); return; } queueJob('seed',id); addChat('mo','ok! i seed '+jobLabel({kind:'seed',what:id}).replace(/^\S+ Seed /,'').replace(' · ',' in ')+'. the world gets more real.'); return; }
  if(/\b(who|what) are you\b|\bdelroth\b/.test(s)&&/delroth/.test(s)){ addChat('mo','delroth is on the tavern stage. he is level sixty and his hat is +5. he is nice to me.'); return; }
  { const c=moriCtx(), r=MORICHAT.reply(v,c); if(r){ addChat('mo',r); save(); return; } }
  if(/\b(daw|beats?|nle|cut|yellow|226|blue room|build|proud)\b/.test(s)){ const r=ENG.talk(v); addChat('mo',r); return; }
  if(window.DICT&&DICT.ready){ const unk=DICT.unknownWord(s); if(unk){ addChat('mo','i don\'t know that word yet: "'+unk+'". i won\'t guess.'); return; } }
  addChat('mo',MORICHAT.fallback(moriCtx()));
}
/* ---------- v3.5: Mori's context, NPC chats, the quest log, voice input ---------- */
let moriN=0, chatNpc=null, npcChain=[];
function playerName(){ const c=allChars().find(x=>x.id===CH.sel); const n=c&&c.name&&!/^(Delroth|Mori)$/.test(c.name)?c.name:null; return (S.moriMem&&S.moriMem.name)||n||'friend'; }
function moriCtx(){ if(!S.moriMem) S.moriMem={}; const rid=curRegion(), inf=PL.regionInfo(rid); const here=NPCS.live.filter(n=>NPCS.present(n)).map(n=>n.d);
  const offers=here.filter(d=>QUESTS.offerFor(d.id)).length; const qc=QUESTS.counts(); const act=QUESTS.list.filter(q=>QUESTS.state(q.id)&&QUESTS.state(q.id).st==='active');
  const rdy=act.filter(q=>QUESTS.ready(q.id)); const nx=QUESTS.list.find(q=>!QUESTS.state(q.id)&&(QUESTS.PLACE[q.place]&&(q.place==='guild'||q.place==='bard')===atGuild()))||QUESTS.list.find(q=>!QUESTS.state(q.id));
  const questLine=(rdy.length?'"'+rdy[0].title+'" is ready! go see '+NPCS.byId(QUESTS.turnTo(rdy[0])).name+'. ':'')+(act.length?'you have '+act.length+' quest'+(act.length>1?'s':'')+': '+act.slice(0,3).map(q=>q.title+' ('+QUESTS.progress(q.id)+')').join('; ')+'. ':'no quests yet! ')+(nx?'ask '+NPCS.byId(nx.giver).name+' in '+QUESTS.PLACE[nx.place]+' — they need help. ':'')+'press L or 📜 for the quest log.';
  const sk=(S.gather&&S.gather.skills)||{}; const skills=['herbalism','mining','woodcutting','skinning'].map(k=>k+' '+GATHERING.level(sk[k]||0)).join(', ');
  const st=stats(); return { mem:S.moriMem, n:moriN, regionName:inf.name, place:(atGuild()?'the guild, in ':'')+inf.name, atGuild:atGuild(), busy:curJob&&!curJob.idle?jobLabel(curJob):'', openQuests:offers, questLine, skills, level:charLevel(), hereCity, cityList,
    combatTip:'your ac is '+st.ac+', attack +'+st.atk+', hp '+Math.round(S.hp)+'/'+st.maxHp+'.', people:here.length?here.map(d=>d.name+' ('+d.role+')').join(', '):'nobody nearby — try the guild, gravenmoor or havenwall', world:worldStats, suggest:nx?'try asking '+NPCS.byId(nx.giver).short+' for work.':'' }; }
function hereCity(){ const id=curRegion(), stg=stageOf(id); if(!(stg>=4||atGuild())) return {named:false, region:PL.regionInfo(id).name}; const cid=stg>=4?id:guildId; const cs=PL.cityState(cid,guildId); const civ=civicProfileFor(cid); return {named:true, name:cs.name, ruler:cs.ruler, motto:cs.motto, govName:cs.govName, race:civ&&civ.race, arts:(civ&&civ.arts)||[], region:PL.regionInfo(cid).name}; }
function cityList(){ const w=WD(), out=[]; for(const k in w.reg){ if((w.reg[k]|0)<4) continue; const id=+k, cs=PL.cityState(id,guildId), civ=civicProfileFor(id); out.push({name:cs.name, ruler:cs.ruler, motto:cs.motto, govName:cs.govName, race:civ&&civ.race, region:PL.regionInfo(id).name}); } return out; }
function worldStats(){ const w=WD(), reg=w.reg; const byStage=[0,0,0,0,0]; for(const k in reg) byStage[Math.min(4,reg[k]|0)]++; const programmed=Object.keys(reg).length;
  const cities=Object.keys(reg).filter(k=>reg[k]>=4).map(k=>({id:+k, name:PL.cityState(+k,guildId).name, gov:PL.cityState(+k,guildId).govName})); const pk=CLAN.ready?CLAN.pick():{};
  return { seed:S.seed, radiusKm:PL.RADIUS_KM, regions:PL.COUNT, programmed, blank:PL.COUNT-programmed, byStage:{void:PL.COUNT-programmed, terrain:byStage[1], roads:byStage[2], villages:byStage[3], cityStates:byStage[4]}, cities:cities.length, cityNames:cities.map(c=>c.name),
    guild:{id:guildId, name:PL.regionInfo(guildId).name}, clan:pk.clan, sister:pk.sister, explored:Object.keys(w.exp||{}).length, dungeonsUpTo:1+byStage[2]+byStage[3]+byStage[4], nodesStreamed:GATHERING.nodes.length, npcs:NPCS.counts(), quests:QUESTS.counts() }; }
function npcCoupon(f){ const day=Math.floor((S.npcT||0)/DAY); let mul=1; for(const d of NPCS.DEFS){ if(d.faction!==f||!d.merchant) continue; const m=(S.npcMem||{})[d.id]; if(m&&m.haggle&&m.haggle.won&&m.haggle.day===day) mul=Math.min(mul,0.9); mul=Math.min(mul,MEMORY.coupon(d.id)); } return mul; }
function playerPersona(){ const c=allChars().find(x=>x.id===CH.sel)||{}; const n=playerName();
  return {name:n, race:(HERO.RACES[c.race]||{}).label||c.race||'', cls:c.cls||'', background:c.background||c.flavor||'', bio:c.bio||'', chaMod:c.chaMod|0}; }
function npcState(d){ const m=(S.npcMem||(S.npcMem={}))[d.id]||{}; const offer=QUESTS.offerFor(d.id);
  const ready=QUESTS.list.filter(q=>QUESTS.ready(q.id)&&QUESTS.turnTo(q)===d.id).map(q=>({id:q.id,title:q.title,thanks:q.thanks}));
  const active=QUESTS.activeFor(d.id).filter(q=>!ready.some(r=>r.id===q.id)).map(q=>({id:q.id,title:q.title,prog:QUESTS.progress(q.id)}));
  const other=NPCS.DEFS.find(o=>o.id!==d.id&&o.home===d.home&&QUESTS.offerFor(o.id)); const fv=d.faction?(S.rep||{})[d.faction]||0:null;
  const bd=MEMORY.bond(d.id); const persona=playerPersona();
  const talkQuests=QUESTS.list.filter(q=>q.type==='talk'&&q.giver===d.id&&QUESTS.state(q.id)&&QUESTS.state(q.id).st==='active'&&!(QUESTS.state(q.id).n)).map(q=>({id:q.id,skill:q.skill,dc:q.dc,keywords:q.keywords,win:q.win,lose:q.lose,goal:q.goal,done:false}));
  const openTalk=(QUESTS.openTalk?QUESTS.openTalk(d.id):[]).map(q=>({id:q.id,skill:q.skill,dc:q.dc,keywords:q.keywords,offer:q.offer,desc:q.desc,win:q.win,lose:q.lose,goal:q.goal}));
  return { mem:m, player:persona.name, persona, phase:NPCS.phaseAt(d.id), hour:NPCS.hour(), place:QUESTS.PLACE[d.home], rep:fv, repTier:fv==null?null:CLAN.tier(fv), d20:SRD.rnd(20), day:Math.floor((S.npcT||0)/DAY),
    bondTier:bd.tier, bondName:bd.name, pins:MEMORY.pinned(d.id), level:charLevel(), alt:0, talkQuests, openTalk,
    offer:offer?{id:offer.id,title:offer.title,offer:offer.offer,desc:offer.desc}:null, offerById:offer?{[offer.id]:{desc:offer.desc}}:{}, active, ready, chain:npcChain.slice(), hint:other?'Try '+other.name+' — they could use a hand.':'',
    world:{pct:CLAN.ready?CLAN.pct():0, mantleBound:CLAN.ready&&CLAN.st().q>=4, doneWith:QUESTS.list.filter(q=>q.giver===d.id&&QUESTS.state(q.id)&&QUESTS.state(q.id).st==='done').map(q=>q.title), gold:Math.floor(S.gold)} }; }
function npcApply(d,res){ if(!res) return; S.npcMem[d.id]=res.mem||S.npcMem[d.id]; npcChain=[]; addChat('npc',res.text||'…',d,{alts:res.alts,intent:res.intent});
  MEMORY.onTalk(d.id); LORE.meet(d.id);
  (res.actions||[]).forEach(a=>{ if(a.type==='accept'){ const q=QUESTS.accept(a.id); if(q) addChat('sys','📜 Quest accepted: '+q.title+' (L for the quest log)'); }
    if(a.type==='turnIn'){ const r=QUESTS.turnIn(a.id,d.id); if(r){ addChat('sys','✦ Quest complete: '+r.q.title+' — '+r.reward); MEMORY.onQuest(d.id,r.q.title); noteCivic('quest', r.q.id); } }
    if(a.type==='haggle') log((a.won?'🤝 Haggle won: 10% off at ':'Haggle failed at ')+d.name+(a.won?' today.':'.'));
    if(a.type==='talkcheck'){ if(a.ok){ QUESTS.event('talkcheck',d.id,a.skill); addChat('sys','Talk goal met ('+a.skill+' '+a.roll+(a.mod>=0?'+':'')+a.mod+' vs DC '+a.dc+'). Turn in when ready.'); if($('questP').classList.contains('open')) renderQuests(); } else addChat('sys','Check failed — try again (new d20 each attempt).'); }
    if(a.type==='gift'){ if(S.reag&&(S.reag.marigold|0)>0){ S.reag.marigold--; MEMORY.onGift(d.id,'Marigold Petals'); addChat('sys','Gifted Marigold. Bond up.'); }
      else if(S.reag&&(S.reag.vinca_leaf|0)>0){ S.reag.vinca_leaf--; MEMORY.onGift(d.id,'Vinca Leaf'); addChat('sys','Gifted Vinca Leaf. Bond up.'); }
      else { MEMORY.addXP(d.id,1,'Kind words'); addChat('sys','No reagent gift in bag — kind words still count a little.'); } }
  });
  if($('questP').classList.contains('open')) renderQuests(); save(); return res; }
function npcSay(text){ const d=NPCS.byId(chatNpc); if(!d) return null; const res=NPCS.npcReply(d,text,npcState(d)); if(res&&typeof res.then==='function'){ res.then(r=>npcApply(d,r)).catch(()=>addChat('npc','…',d)); return null; } return npcApply(d,res); }
function openNpc(id){ const d=NPCS.byId(id); if(!d) return; if(chatNpc&&chatNpc!==id) endNpc(); const p=$('talkP'); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open')); p.classList.add('open'); if(chatNpc===id) return;
  chatNpc=id; const m=(S.npcMem||(S.npcMem={}))[id]||(S.npcMem[id]={}); m.met=(m.met||0)+1; m.talks=m.talks||0; npcChain=QUESTS.event('talk',id).map(q=>q.id); LORE.meet(id); MEMORY.onTalk(id); const ln=NPCS.liveOf(id); if(ln) ln.talking=true;
  $('talkTitle').textContent='💬 '+d.name; $('npcBar').style.display='flex'; $('npcWho').innerHTML='<b>'+d.role+'</b> · '+QUESTS.PLACE[d.home]+' · <span class="small">voiced by Mori</span>';
  const sh=$('npcShop'); const shops={brakka:['🛡 Shop & quest',()=>CLAN.brakkaUI&&CLAN.brakkaUI()], scribe:['📜 Scrolls',()=>CLAN.scribeUI&&CLAN.scribeUI()], forge:['⚒ Forge jobs',()=>togglePanel('jobsP')]}; const s=shops[d.shop];
  sh.style.display=s?'':'none'; if(s){ sh.textContent=s[0]; sh.onclick=s[1]; } $('chatIn').placeholder='say something to '+(d.short||d.name)+'… (try: any work? · rumors · haggle)'; addChat('sys','— talking to '+d.name+' ('+d.role+') —'); npcSay(''); }
function endNpc(quiet){ if(!chatNpc) return; const d=NPCS.byId(chatNpc); const ln=NPCS.liveOf(chatNpc); if(ln) ln.talking=false; NPCS.live.forEach(n=>{ if(n.d.id===chatNpc) n.talking=false; }); chatNpc=null;
  $('talkTitle').textContent='Talk to Mori'; $('npcBar').style.display='none'; $('chatIn').placeholder='say something… (try: build a house)'; if(!quiet) addChat('sys','— back to Mori —'); }
function openMoriChat(){ endNpc(true); const p=$('talkP'); if(!p.classList.contains('open')) togglePanel('talkP'); }
function npcWatch(){ if(!chatNpc) return; const ln=NPCS.liveOf(chatNpc); if(mode!=='world'||!ln){ if(chatNpc!=='grizzik'||mode!=='world'||!atGuild()) endNpc(); return; } const q=NPCS.posOf(ln); if(Math.hypot(q.x-player.pos.x,q.z-player.pos.z)>10) { addChat('sys','('+ln.d.short+' is out of earshot)'); endNpc(); } }

function renderQuests(){ $('questBody').innerHTML=QUESTS.panelHTML(); }
function renderLore(){ $('loreBody').innerHTML=LORE.panelHTML(); }
function renderMemory(){ $('memBody').innerHTML=MEMORY.panelHTML(); MEMORY.bindPanel($('memBody')); }
function renderPersona(){ const p=playerPersona(); const c=allChars().find(x=>x.id===CH.sel)||{};
  $('personaBody').innerHTML='<div id="personaCard"><div style="font-size:16px;font-weight:800">'+(p.name||'Adventurer')+'</div>'+
    '<div class="small">'+(p.race||'?')+' · '+(p.cls||'no class')+(p.background?' · '+p.background:'')+'</div>'+
    '<div style="margin-top:6px">'+(p.bio||'<i>No bio yet — set one in HeroLock.</i>')+'</div>'+
    '<div class="small" style="margin-top:8px">NPCs at Acquaintance+ will reference this card. Delroth stays locked canon — you are not Delroth.</div></div>'+
    '<div class="sec">Edit in HeroLock</div><div class="row"><button class="pri" id="persOpenCr">🧬 Open HeroLock</button></div>'+
    '<div class="small">Background and bio fields are on the character sheet (right panel).</div>';
  const b=$('persOpenCr'); if(b) b.onclick=()=>{ togglePanel('personaP'); openCreator(); }; }

const VOICE={ ok:!!(window.SpeechRecognition||window.webkitSpeechRecognition), rec:null, on:false, wake:false, last:'', err:'' };
function voiceSetup(){ const b=$('chatMic'), w=$('wakeOn'), st=$('micSt'); if(!VOICE.ok){ b.disabled=true; b.title='Voice input is not available in this browser'; w.disabled=true; st.textContent='🎤 voice input not available here — type instead'; return; }
  const R=window.SpeechRecognition||window.webkitSpeechRecognition; const mk=(cont)=>{ const r=new R(); r.lang='en-US'; r.interimResults=false; r.continuous=!!cont; r.maxAlternatives=1; return r; };
  const stop=()=>{ try{ VOICE.rec&&VOICE.rec.stop(); }catch(e){} VOICE.rec=null; VOICE.on=false; b.classList.remove('hot'); };
  const heard=(txt,wake)=>{ txt=String(txt||'').trim(); VOICE.last=txt; if(!txt) return; if(wake){ const m=/\bmori\b[,.!]?\s*(.*)$/i.exec(txt); if(!m) return; if(!$('talkP').classList.contains('open')) openMoriChat(); if(m[1]) sendChat(m[1]); else addChat('mo','yes? i\'m listening.'); return; } sendChat(txt); };
  const start=(wake)=>{ try{ const r=mk(wake); VOICE.rec=r; VOICE.on=true; b.classList.add('hot'); st.textContent=wake?'👂 listening for "Mori"…':'🎤 listening…';
      r.onresult=e=>{ const res=e.results[e.results.length-1]; heard(res[0].transcript, wake); }; r.onerror=e=>{ VOICE.err=e.error||'error'; st.textContent='🎤 '+(e.error==='not-allowed'?'microphone blocked — allow it in the browser, or type':e.error==='network'?'voice needs the browser\'s speech service (offline here) — type instead':'voice stopped ('+(e.error||'error')+')'); if(e.error==='not-allowed'){ VOICE.wake=false; w.checked=false; } };
      r.onend=()=>{ VOICE.on=false; b.classList.remove('hot'); if(VOICE.wake&&w.checked&&!VOICE.err) setTimeout(()=>{ if(VOICE.wake&&!VOICE.on) start(true); },400); else if(!VOICE.err) st.textContent=''; VOICE.err=''; }; r.start(); }catch(e){ VOICE.on=false; st.textContent='🎤 could not start voice input — type instead'; } };
  b.onclick=()=>{ if(VOICE.on){ VOICE.wake=false; w.checked=false; stop(); st.textContent=''; return; } start(false); };
  w.onchange=()=>{ VOICE.wake=w.checked; if(w.checked){ stop(); start(true); } else { stop(); st.textContent=''; } };
  VOICE.heard=heard; }
function updBrain(){ const b=ENG.memoryLog||{}; $('brainV').textContent=(b.version||'v1KB')+' · '+((b.memory||[]).length)+' memories · '+((b.rooms||[]).length)+' rooms'; }
$('chatSend').onclick=()=>sendChat(); $('chatIn').addEventListener('keydown',e=>{ if(e.key==='Enter') sendChat(); e.stopPropagation(); });
let beatStep=-1;
function renderBeat(){ const g=$('beatGrid'); if(!ENG.daw||!ENG.daw.tracks) return; g.innerHTML=ENG.daw.tracks.map(t=>'<div>'+t.name.padEnd(6,'\u00a0')+' '+t.pattern.map((v,i)=>'<span style="color:'+(i===beatStep?'#fff':v?'#ff8af0':'#555')+'">'+(v?'■':'·')+'</span>').join('')+'</div>').join(''); }
if(ENG.daw) ENG.daw.onStep=s=>{ beatStep=s; beatPulse=1; if($('beatP').classList.contains('open')) renderBeat(); };
let beatPulse=0;
$('beatPlay').onclick=async()=>{ if(S.blue){ log('Mori is OFF in the blue room.'); return; } try{ await ENG.playDAW(); log('Mori\'s beat is playing on the tavern stage 🎶'); }catch(e){ log('Audio blocked: tap again.'); } };
$('beatStop').onclick=()=>{ ENG.stopDAW&&ENG.stopDAW(); beatStep=-1; renderBeat(); };
$('beatMake').onclick=()=>{ ENG.makeBeat(); renderBeat(); };
ENG.onTalk&&ENG.onTalk((r,p)=>{ if(p==='made a beat') addChat('mo',r); if(p==='blue room') addChat('mo',r); });
function goBlue(){ S.blue=true; ENG.goToBlueRoom(); if(curJob&&curJob.kind==='tf'&&curJob.plan){ TF.finishNow(curJob.plan); finishJob(curJob); } if(curJob){ if(curJob.kind==='build'&&curJob.b){ /* keep partial build */ jobs.unshift(curJob); } else if(!curJob.idle) jobs.unshift(curJob); if(curJob.target&&curJob.target.claimed){ curJob.target.ready=true; curJob.target.claimed=false; } curJob=null; }
  if(suggestion){ suggestion=null; $('sugg').style.display='none'; } $('bBlue').textContent='☀ Wake Mori'; routeTo(W.STATIONS.moriHome.x,W.STATIONS.moriHome.z); save(); }
function wakeMori(){ S.blue=false; ENG.isMoriOnline=true; $('bBlue').textContent='🟦 Blue room'; addChat('mo','i\'m awake! back to work on the town.'); // resume interrupted build in place
  const bi=jobs.findIndex(j=>j.b); if(bi>=0){ const j=jobs.splice(bi,1)[0]; built.splice(built.indexOf(j.b),1); scene.remove(j.b.g); for(const k in needOf(j)) S[k]+=needOf(j)[k]; delete j.b; jobs.unshift(j); } save(); }
$('bBlue').onclick=()=>{ S.blue?wakeMori():goBlue(); };

/* ---------- panels ---------- */
function togglePanel(id){ if(id!=='seedP') closeGlobe(); const p=$(id); const open=!p.classList.contains('open'); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open')); if(open){ p.classList.add('open'); if(id==='jobsP') renderJobs(); if(id==='bagP') renderBag(); if(id==='beatP') renderBeat(); if(id==='talkP'){ updBrain(); if(!$('chatLog').children.length) addChat('mo',ENG.talk('')); } if(id==='questP') renderQuests(); if(id==='loreP') renderLore(); if(id==='memP') renderMemory(); if(id==='personaP') renderPersona(); } if(id==='talkP'&&!open) endNpc(true); }
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{ $(b.dataset.close).classList.remove('open'); if(b.dataset.close==='talkP') endNpc(true); });
$('bJobs').onclick=()=>togglePanel('jobsP'); $('bBag').onclick=()=>togglePanel('bagP'); $('bTalk').onclick=()=>{ if($('talkP').classList.contains('open')&&!chatNpc){ togglePanel('talkP'); return; } openMoriChat(); }; $('bQuests').onclick=()=>togglePanel('questP'); $('bLore').onclick=()=>togglePanel('loreP'); $('bMem').onclick=()=>togglePanel('memP'); $('bPersona').onclick=()=>togglePanel('personaP'); $('bBeat').onclick=()=>togglePanel('beatP');
$('bGlobe').onclick=()=>{ globeOpen?closeGlobe():openGlobe(); }; $('bHelp').onclick=help; if($('bTablet')) $('bTablet').onclick=()=>openTablet(); if($('bCull')) $('bCull').onclick=()=>{ if(window.OCCLUSION){ OCCLUSION.stats.debug=!OCCLUSION.stats.debug; log(OCCLUSION.stats.debug?'Cull counts on.':'Cull counts off.'); } }; $('bReset').onclick=()=>{ if(confirm('Reset the Guild? This erases your save (characters you made are kept).')){ store.del(SAVE_KEY); location.reload(); } };
function ensureTablet(){ if(!S.inv.some(i=>i.kind==='tablet')) S.inv.push({id:'obsidian_tablet', name:'Obsidian Tablet', cat:'Relic', kind:'tablet', value:0, note:'A dark glassy tablet. The runes wait for a yes.'}); if(!S.tablet) S.tablet={approved:[]}; }
let tabletDraft=null, tabletResult=null;
function tabletSlots(){ const h=hereCity(); return {ruler:h.ruler||'The Guild Charter (Seedkeeper Mori)', name:h.name||'Guildhold', motto:h.motto||'', gov:h.govName||'Guild Charter', race:h.race||'', region:h.region||'', arts:''}; }
function moriDraft(){ return {note:'one vocab finger', fingers:[
  {kind:'vocab', id:'ruler.n', add:['sovereign']},
  {kind:'intent', id:'ruler', any:['who is the sovereign'], template:'ruler'},
  {kind:'template', id:'ruler', text:'{ruler} rules {name}. the motto is "{motto}".'}
]}; }
function tinkerPack(){ return JSON.parse(JSON.stringify(window.TINKER_PACK)); }
function wornPatches(){ const all=(S.tablet&&S.tablet.approved)||[]; if(S.tablet&&S.tablet.wear==='tinker') return all; return all.filter(p=>p.note!=='tinker persona'); }
function applyWorn(){ if(window.FINGERS) FINGERS.reapply(wornPatches()); if(window.FURNITURE) FURNITURE.build(scene); }
function renderTablet(){ const el=$('tabletBody'); if(!el) return; const n=(S.tablet&&S.tablet.approved||[]).length; const wear=S.tablet&&S.tablet.wear==='tinker'; const face=tabletResult?(tabletResult.pass?'The runes hold. Every check passed.':'The runes reject this. '+((tabletResult.fails||[]).slice(0,3).join('; '))):(tabletDraft?'A draft is waiting. It has not been applied.':'The glass is dark. Ask Mori for one small change.');
  el.innerHTML='<div id="tabletFace">'+face+'</div><div class="small">Approved fingers: '+n+'. Wearing: '+(wear?'Tinker Gearwhistle (flavor, not a mind)':'Mori')+'. A finger is data. Nothing runs until you tap Approve.</div>'+
    '<div class="row"><button type="button" id="tabMori"'+(wear?'':' class="pri"')+'>Mori</button><button type="button" id="tabTinker"'+(wear?' class="pri"':'')+'>Tinker</button></div>'+
    '<div class="row"><button type="button" id="tabDraft">Ask Mori</button><button type="button" id="tabTinkerDraft">Tinker persona</button><button type="button" id="tabRun">Run checks</button><button type="button" class="pri" id="tabYes"'+(tabletResult&&tabletResult.pass?'':' disabled')+'>Approve</button><button type="button" id="tabNo">Revert</button></div>';
  $('tabMori').onclick=()=>{ S.tablet.wear='mori'; applyWorn(); save(); renderTablet(); };
  $('tabTinker').onclick=()=>{ const has=(S.tablet.approved||[]).some(p=>p.note==='tinker persona'); if(!has){ tabletDraft=tinkerPack(); tabletResult=null; log('Run checks, then Approve, before Tinker can be worn.'); renderTablet(); return; } S.tablet.wear='tinker'; applyWorn(); save(); renderTablet(); };
  $('tabDraft').onclick=()=>{ tabletDraft=moriDraft(); tabletResult=null; renderTablet(); };
  $('tabTinkerDraft').onclick=()=>{ tabletDraft=tinkerPack(); tabletResult=null; renderTablet(); };
  $('tabRun').onclick=()=>{ if(!tabletDraft){ tabletDraft=moriDraft(); } const slots=tabletSlots(); const tinker=tabletDraft.note==='tinker persona'; const cases=tinker?[{text:'hi', intent:'tinkerhi', includes:['tinker','gnome'], slots:{}},{text:'who rules here', intent:'ruler', includes:[slots.ruler, slots.name], slots}]:[{text:'who is the sovereign', intent:'ruler', includes:[slots.ruler, slots.name], slots}]; TABLET.check(tabletDraft, cases).then(r=>{ tabletResult=r; renderTablet(); }); };
  $('tabYes').onclick=()=>{ if(!tabletResult||!tabletResult.pass||!tabletDraft) return; S.tablet.approved.push(tabletDraft); if(tabletDraft.note==='tinker persona') S.tablet.wear='tinker'; applyWorn(); save(); tabletDraft=null; tabletResult=null; log('The tablet keeps that finger.'); renderTablet(); };
  $('tabNo').onclick=()=>{ if(S.tablet&&S.tablet.approved.length){ const gone=S.tablet.approved.pop(); if(gone&&gone.note==='tinker persona') S.tablet.wear='mori'; } applyWorn(); save(); tabletResult=null; log('The last finger is gone.'); renderTablet(); };
}
function openTablet(){ ensureTablet(); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open')); $('tabletP').classList.add('open'); renderTablet(); }
function help(){ modal('<h3>How to play</h3><ul class="help">'+
 '<li><b>Move</b>: WASD / arrows (phones: left-thumb joystick). <b>Look</b>: drag to orbit, wheel / pinch to zoom.</li>'+
 '<li><b>Loot rarity:</b> '+RARITY.map(r=>'<span style="color:'+r.c+'">■ '+r.name+'</span>').join(' · ')+'. Magic gear starts dropping around character level 4–5 (level = 3 + full dungeon clears). A full clear is the boss portal home. Clearing one room does not raise it.</li>'+
 '<li><b>E / Interact</b> near stalls, forges, the bench, Enchanting Forge/Circle, Mori, chests and the dungeon door. <b>Space / ⚔</b> attacks. The 1–9 bar holds items, Attack, and spell placeholders. <b>[ ]</b> or Shift+wheel changes page (4 pages). <b>R</b> bandage, <b>T</b> salve (heals over time, no roll), <b>Q</b> potion.</li>'+
 '<li><b>Mori builds the town</b> from her job queue: gather timber/ore/herbs, brew at the alchemy table, forge with Grizzik under the Dragon\'s Forge, then build houses, walls, lanterns, a market, a shrine… Approve her ideas or queue your own (🔨).</li>'+
 '<li><b>Life → LARPy 5:1</b> at the grumpy Mori Doll. LARPy buys Robert\'s Outpost items. Gold rolls SRD magic items and pays for crafting at the <b>Item Creation Bench</b>.</li>'+
 '<li><b>🧬 HeroLock</b>: sculpt a hero with sliders and 5 identity-lock angles. Locked presets (🔒 Delroth, Mori) can be duplicated to edit.</li>'+
 '<li><b>The Undercroft</b> is outside the north fence. d20 + attack vs AC; natural 20 doubles damage. Lyra, Juno and Kit copy your swings. At 0 HP you Zero-Return to the Guild.</li>'+
 '<li><b>🌍 World Seed</b> (G / M, or the Obelisk by the hall): the planet is a 3,185 km ball that starts as gray wireframe void. Mori programs it one layer per seed job — terrain → roads → villages → city-state. Tap a region on the globe to queue a job or travel there by waystone. City-states have rulers, banners, borders and ally / rival / vassal ties.</li>'+
 '<li><b>🟦 Blue room</b> turns Mori OFF (jobs pause) until you wake her. Progress auto-saves.</li></ul>'); }

/* ---------- input ---------- */
const keys={};
addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return; keys[e.code]=true;
  if(e.code==='KeyE') interact(); if(e.code==='Space'){ e.preventDefault(); attack(); } if(e.code==='KeyQ') useHotbar('potion'); if(e.code==='KeyR') useHotbar('bandage'); if(e.code==='KeyT') useHotbar('salve');
  if(window.HOTBAR){ const slot=HOTBAR.keyIndex(e.code); if(slot>=0){ e.preventDefault(); useSlot(slot); } const pg=HOTBAR.pageKey(e.code); if(pg){ e.preventDefault(); turnBar(pg); } }
  if(e.code==='KeyJ') togglePanel('jobsP'); if(e.code==='KeyL') togglePanel('questP'); if(e.code==='KeyB') togglePanel('bagP'); if(e.code==='KeyH') openCreator(); if(e.code==='KeyM'||e.code==='KeyG'){ globeOpen?closeGlobe():openGlobe(); } if(e.code==='Escape'){ closeModal(); if(crOpen) closeCreator(); closeGlobe(); } });
addEventListener('keyup',e=>{ keys[e.code]=false; });
let camYaw=S.player.yaw||0, camPitch=0.42, camDist=9;
const joy={id:null, x:0, y:0, cx:0, cy:0}; const pts=new Map(); let pinch0=0;
let gDown=null;
canvas.addEventListener('pointerdown',e=>{ canvas.setPointerCapture(e.pointerId);
  if(globeOpen){ pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); } gDown={x:e.clientX,y:e.clientY,m:0}; return; }
  if(!document.body.classList.contains('phone')&&e.pointerType!=='mouse'&&e.clientX<innerWidth*0.42&&e.clientY>innerHeight*0.45&&joy.id===null&&!crOpen){ joy.id=e.pointerId; joy.cx=e.clientX; joy.cy=e.clientY; const j=$('joy'); j.style.left=(e.clientX-55)+'px'; j.style.top=(e.clientY-55)+'px'; j.style.bottom='auto'; j.classList.add('on'); return; }
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); } });
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId===joy.id){ let dx=e.clientX-joy.cx, dy=e.clientY-joy.cy; const d=Math.hypot(dx,dy), m=45; if(d>m){ dx=dx/d*m; dy=dy/d*m; } joy.x=dx/m; joy.y=dy/m; $('joy').firstElementChild.style.transform='translate('+dx+'px,'+dy+'px)'; return; }
  const p=pts.get(e.pointerId); if(!p) return;
  if(globeOpen){ if(pts.size===2){ p.x=e.clientX; p.y=e.clientY; const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch0) SW.globe.zoom(pinch0/d); pinch0=d; if(gDown) gDown.m=99; return; }
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY; if(gDown) gDown.m+=Math.abs(dx)+Math.abs(dy); SW.globe.drag(dx,dy); return; }
  if(pts.size===2){ p.x=e.clientX; p.y=e.clientY; const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch0){ const k=pinch0/d; if(crOpen) crDist=Math.max(0.8,Math.min(5,crDist*k)); else camDist=Math.max(3.5,Math.min(22,camDist*k)); } pinch0=d; return; }
  const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
  if(crOpen){ crYaw-=dx*0.01; crPitch=Math.max(-0.8,Math.min(0.8,crPitch+dy*0.005)); } else { camYaw-=dx*0.006; camPitch=Math.max(0.05,Math.min(1.35,camPitch+dy*0.004)); } });
const endPtr=e=>{ if(globeOpen&&gDown&&gDown.m<8&&e.type==='pointerup'&&pts.size===1){ const id=SW.globe.pick(e.clientX,e.clientY); if(id>=0){ SW.globe.select(id); renderSeedPanel(); } } if(globeOpen) gDown=null; if(e.pointerId===joy.id){ joy.id=null; if(!padHeld()){ joy.x=joy.y=0; } if(!document.body.classList.contains('phone')){ $('joy').classList.remove('on'); $('joy').style.left=''; $('joy').style.top=''; $('joy').style.bottom=''; } $('joy').firstElementChild.style.transform=''; } pts.delete(e.pointerId); if(pts.size<2) pinch0=0; };
function stickMove(e){ if(e.pointerId!==joy.id) return; const r=$('joy').getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2; const v=PHONE.stickVector(e.clientX-cx, e.clientY-cy, r.width*0.42); joy.x=v.x; joy.y=v.y; const n=$('joy').firstElementChild; n.style.transform='translate('+(v.x*r.width*0.32)+'px,'+(v.y*r.height*0.32)+'px)'; }
if($('joy')){ $('joy').addEventListener('pointerdown',e=>{ if(!document.body.classList.contains('phone')||document.body.classList.contains('pad')) return; e.preventDefault(); e.stopPropagation(); joy.id=e.pointerId; $('joy').setPointerCapture(e.pointerId); stickMove(e); }); $('joy').addEventListener('pointermove',stickMove); $('joy').addEventListener('pointerup',endPtr); $('joy').addEventListener('pointercancel',endPtr); }
const pad={n:0,s:0,e:0,w:0}; const padHeld=()=>pad.n||pad.s||pad.e||pad.w;
function applyPad(){ if(!padHeld()){ if(joy.id==null) joy.x=joy.y=0; return; } const v=PHONE.padVector(pad); joy.x=v.x; joy.y=v.y; }
document.querySelectorAll('[data-pad]').forEach(b=>{ const dir=b.dataset.pad; const down=ev=>{ ev.preventDefault(); pad[dir]=1; applyPad(); }; const up=()=>{ pad[dir]=0; applyPad(); }; b.addEventListener('pointerdown',down); b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); });
if($('padMode')) $('padMode').onclick=()=>{ PHONE.setControl(PHONE.getControl()==='pad'?'stick':'pad'); refreshPhone(); };
function refreshPhone(){ if(!window.PHONE) return; let saved=null; try{ saved=localStorage.getItem('mori.phone'); }catch(e){}
  const on=PHONE.shouldPhone({touch:IS_TOUCH, coarse:matchMedia('(pointer:coarse)').matches, w:innerWidth, h:innerHeight, query:QS.get('phone'), saved});
  const wide=on&&Math.min(innerWidth,innerHeight)>=600;
  document.body.classList.toggle('phone', on); document.body.classList.toggle('land', innerWidth>innerHeight); document.body.classList.toggle('wide', wide); document.body.classList.toggle('pad', on&&PHONE.getControl()==='pad');
  const thumb=(PHONE.getControl()==='pad'?156:(innerWidth>innerHeight?112:128));
  const chrome=on?(wide||innerWidth>innerHeight?16+52+24:16+thumb+8+52+16):0;
  document.documentElement.style.setProperty('--chrome-bottom', chrome+'px');
  const pm=$('padMode'); if(pm) pm.textContent=PHONE.getControl()==='pad'?'◉':'✥';
  if($('bAttack')) $('bAttack').textContent=on?'⚔':'⚔ Attack';
  if($('bPotion')) $('bPotion').textContent=on?'🧪':'🧪 Potion';
  renderBar();
  if(!on){ document.body.classList.remove('menu'); document.body.classList.remove('stats'); }
  try{ if(sessionStorage.getItem('mori.stayport')==='1') document.body.classList.add('stayport'); }catch(e){}
  const sheet=$('statSheet'), top=$('top');
  if(sheet&&top){ const extras=on?[...top.querySelectorAll('.extra')]:[...sheet.querySelectorAll('.extra')]; extras.forEach(el=>(on?sheet:top).appendChild(el)); }
  const more=$('statMore'); if(more){ more.hidden=!on; more.setAttribute('aria-expanded', document.body.classList.contains('stats')?'true':'false'); more.textContent=document.body.classList.contains('stats')?'▴':'···'; }
  const stack=$('hudStack'); if(stack){ const h=on?Math.ceil(stack.getBoundingClientRect().height):0; document.documentElement.style.setProperty('--hud-top', h+'px'); } pinSheets(); }
if(window.ResizeObserver && $('hudStack')) new ResizeObserver(()=>{ if(!document.body.classList.contains('phone')){ document.documentElement.style.setProperty('--hud-top','0px'); return; } document.documentElement.style.setProperty('--hud-top', Math.ceil($('hudStack').getBoundingClientRect().height)+'px'); pinSheets(); }).observe($('hudStack'));
function pinSheets(){ const stack=$('hudStack'); if(!stack||!document.body.classList.contains('phone')) return; const min=Math.ceil(stack.getBoundingClientRect().height)+8; document.querySelectorAll('.panel').forEach(p=>{ if(!p.style.top) return; const top=parseFloat(p.style.top); if(top<min) p.style.top=min+'px'; }); }
if($('statMore')) $('statMore').onclick=()=>{ document.body.classList.toggle('stats'); refreshPhone(); };
if($('turnNo')) $('turnNo').onclick=()=>{ document.body.classList.add('stayport'); try{ sessionStorage.setItem('mori.stayport','1'); }catch(e){} };
if($('turnGo')) $('turnGo').onclick=async()=>{ try{ if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }catch(e){} try{ if(screen.orientation&&screen.orientation.lock) await screen.orientation.lock('landscape'); }catch(e){} };
if(window.visualViewport) visualViewport.addEventListener('resize', ()=>{ if(typeof resize==='function') resize(); });
if($('phoneMenu')) $('phoneMenu').onclick=()=>document.body.classList.toggle('menu');
addEventListener('resize', refreshPhone); refreshPhone();
document.addEventListener('gesturestart', e=>{ if(document.body.classList.contains('phone')) e.preventDefault(); });
document.addEventListener('touchmove', e=>{ if(!document.body.classList.contains('phone')) return; if(e.touches.length>1 && !e.target.closest('#chatLog,.panel .body,.modal .card,#bottom')) e.preventDefault(); }, {passive:false});
(function bindChat(){ const head=$('talkHead'); if(!head) return; let drag=null;
  head.addEventListener('pointerdown', e=>{ if(!document.body.classList.contains('phone')||e.target.closest('button')) return; const box=$('talkP').getBoundingClientRect(); drag={id:e.pointerId,x:e.clientX,y:e.clientY,l:box.left,t:box.top,w:box.width,h:box.height}; head.setPointerCapture(e.pointerId); });
  head.addEventListener('pointermove', e=>{ if(!drag||e.pointerId!==drag.id) return; const p=PHONE.placeChat({left:drag.l,top:drag.t,w:drag.w,h:drag.h}, e.clientX-drag.x, e.clientY-drag.y, {w:innerWidth,h:innerHeight}); const el=$('talkP'); el.style.left=p.left+'px'; el.style.top=p.top+'px'; el.style.right='auto'; el.style.bottom='auto'; });
  head.addEventListener('pointerup', ()=>{ drag=null; });
  if($('chatFold')) $('chatFold').onclick=()=>{ const el=$('talkP'); el.classList.toggle('collapsed'); $('chatFold').textContent=el.classList.contains('collapsed')?'+':'–'; }; }
)();
canvas.addEventListener('pointerup',endPtr); canvas.addEventListener('pointercancel',endPtr);
function barWheel(e){ if(!e.shiftKey||!window.HOTBAR) return false; e.preventDefault(); turnBar(e.deltaY>0?1:-1); return true; }
canvas.addEventListener('wheel',e=>{ e.preventDefault(); if(barWheel(e)) return; if(globeOpen){ SW.globe.zoom(1+e.deltaY*0.001); return; } if(crOpen) crDist=Math.max(0.8,Math.min(5,crDist*(1+e.deltaY*0.001))); else camDist=Math.max(3.5,Math.min(22,camDist*(1+e.deltaY*0.001))); },{passive:false});
addEventListener('wheel',e=>{ if(e.target===canvas) return; barWheel(e); },{passive:false});
$('bInteract').onclick=()=>interact(); $('bAttack').onclick=()=>attack(); $('bPotion').onclick=()=>useHotbar('potion'); if($('bBandage')) $('bBandage').onclick=()=>useHotbar('bandage'); if($('bSalve')) $('bSalve').onclick=()=>useHotbar('salve');
if($('barUp')) $('barUp').onclick=()=>turnBar(-1);
if($('barDown')) $('barDown').onclick=()=>turnBar(1);
let barDrag=null;
document.addEventListener('pointerdown', e=>{
  if(e.button>0) return;
  const slotEl=e.target.closest&&e.target.closest('[data-slot]');
  const dragEl=e.target.closest&&e.target.closest('.barDrag');
  if(!slotEl&&!dragEl) return;
  let entry=null, from=null;
  if(slotEl){ from=+slotEl.dataset.slot; entry=S.bars&&S.bars.pages[S.bars.page][from]; }
  else if(dragEl.closest('[data-bar-spell]')) entry={type:'spell', name:'Spell'};
  else { const host=dragEl.closest('[data-bar-id]'); const it=host&&S.inv.find(i=>i.id===host.dataset.barId); if(!it) return; entry={type:'item', id:it.id, kind:it.kind, name:it.name}; }
  barDrag={entry, from, x:e.clientX, y:e.clientY, moved:false, pid:e.pointerId};
});
document.addEventListener('pointermove', e=>{
  if(!barDrag||e.pointerId!==barDrag.pid) return;
  if(Math.hypot(e.clientX-barDrag.x, e.clientY-barDrag.y)<=8) return;
  barDrag.moved=true; const g=$('barGhost'); if(!g) return; g.hidden=false; g.textContent=window.HOTBAR?HOTBAR.label(barDrag.entry)||'·':'·'; g.style.left=(e.clientX+12)+'px'; g.style.top=(e.clientY+12)+'px';
});
document.addEventListener('pointerup', e=>{
  if(!barDrag||e.pointerId!==barDrag.pid) return;
  const drag=barDrag; barDrag=null; const g=$('barGhost'); if(g) g.hidden=true;
  const under=document.elementFromPoint(e.clientX, e.clientY);
  const slot=under&&under.closest&&under.closest('[data-slot]');
  const i=slot?+slot.dataset.slot:-1;
  if(drag.moved&&i>=0&&drag.entry){
    if(drag.from!=null&&drag.from!==i) S.bars=HOTBAR.swap(S.bars, drag.from, i);
    else if(drag.from==null) S.bars=HOTBAR.assign(S.bars, S.bars.page, i, drag.entry);
    save(); renderBar(); return; }
  if(drag.moved&&drag.from!=null&&i<0){ S.bars=HOTBAR.clear(S.bars, S.bars.page, drag.from); save(); renderBar(); return; }
  if(!drag.moved&&drag.from!=null) useSlot(drag.from);
});
document.addEventListener('contextmenu', e=>{ const slot=e.target.closest&&e.target.closest('[data-slot]'); if(!slot||!window.HOTBAR) return; e.preventDefault(); S.bars=HOTBAR.clear(S.bars, S.bars.page, +slot.dataset.slot); save(); renderBar(); });
let brandTaps=0; $('brand').onclick=()=>{ if(++brandTaps>=5&&!S.hatEgg){ S.hatEgg=true; log('🎩 +5 HAT unlocked in HeroLock! Weirdness resistance 5.'); save(); } };

/* ---------- interaction targets ---------- */
let mode='world'; // 'world' | 'dungeon'
function regionTargets(){ return SW.F.targets.map(t=>Object.assign({},t,{act:()=>regionAct(t)})); }
function regionAct(t){ if(t.kind==='globe') openGlobe(); else if(t.kind==='dungeon') enterDungeon({name:t.name, lvl:t.lvl, ret:SW.F.barrow});
  else if(t.kind==='city') cityModal(t.city); else if(t.kind==='village') log('Villagers wave. '+PL.regionInfo(curRegion()).name+' has roads and homes now — one more seed job and it could become a city-state.');
  else if(t.kind==='void') { log('▦ The void hums. Nothing here is programmed yet. Queue a seed job on the globe.'); openGlobe(); } }
function sitOn(t){ player.sit={x:t.x,z:t.z,name:t.name}; player.pos.x=t.x; player.pos.z=t.z; log(t.name+'. '+(t.flavor||'')); }
function worldTargets(){ const furn=window.FURNITURE?FURNITURE.targets().map(t=>Object.assign({},t,{act:()=>sitOn(t)})):[]; return GATHERING.targets().concat(resourceTargets(),NPCS.targets(),CLAN.targets(),furn,baseWorldTargets()); }
function resourceTargets(){ return nodes.filter(n=>n.rid&&window.ORES&&ORES.kind(n.rid)).map(n=>({x:n.x,z:n.z,r:2.6,label:n.ready?ORES.prompt(n.rid):'⏳ '+ORES.nameOf(n.rid),tip:ORES.tip(n.rid),act:()=>gatherNode(n)})); }
function gatherNode(n){ if(!n||!n.ready) return; const q=YIELD()+(n.type==='ore'&&S.outpost.goldPick?1:0); n.ready=false; n.crown.visible=false; n.stump.visible=true; if(n.label) n.label.visible=false; n.regrow=40;
  if(n.rid&&window.ORES&&ORES.kind(n.rid)){ if(!S.reag) S.reag={}; S.reag[n.rid]=(S.reag[n.rid]||0)+q; log(ORES.gatherLine(n.rid, q, n.place)); return; }
  S[n.type]+=q; log('+'+q+' '+n.type); }
function baseWorldTargets(){ if(!atGuild()) return regionTargets(); const st=W.STATIONS, sw=tav.userData.stageWorld; return regionTargets().concat([
  {x:st.seed.x+1.5,z:st.seed.z+1.5,r:3.4,label:'🌱 World Seed Obelisk (globe & seed)',act:()=>openGlobe()},
  {x:st.doll.x,z:st.doll.z+1.8,r:3.2,label:'🪆 Mori Doll shop',act:dollShop},
  {x:st.outpost.x,z:st.outpost.z+1.8,r:3.2,label:'🏕 Guild Outpost',act:outpostShop},
  {x:st.alchemy.x,z:st.alchemy.z+1.4,r:3,label:'⚗ Alchemy table (brew)',act:()=>{ togglePanel('jobsP'); log('Pick a brew for Mori in the job panel.'); }},
  {x:st.forge.x-1.5,z:st.forge.z,r:3.5,label:'🔥 Grizzik at the forge (talk · forge jobs)',act:()=>openNpc('grizzik')},
  {x:st.bench.x,z:st.bench.z+1.2,r:3.2,label:'🔮 Item Creation Bench',act:benchUI},
  {x:st.enchantForge.x,z:st.enchantForge.z+1.2,r:3,label:'✦ Enchanting Forge (magic arms)',act:()=>{ if(window.STATIONS){ STATIONS.enableEnchantForge(); } togglePanel('jobsP'); log('Enchanting Forge — craft magic weapons & armor (separate from Mori\'s pot).'); }},
  {x:st.enchantCircle.x,z:st.enchantCircle.z+1.2,r:3.2,label:'◯ Enchanting Circle (wondrous)',act:()=>{ if(window.STATIONS){ STATIONS.enableEnchantCircle(); } togglePanel('jobsP'); log('Enchanting Circle — wondrous items. Mori\'s pot is one high-tier pot among many.'); }},
  {x:sw[0]+2.5,z:sw[1],r:4.5,label:'🎭 Delroth (next monologue)',act:()=>{ delroth.line=(delroth.line+1)%DELROTH_LINES.length; delroth.t=0; LORE.unlock('npc_delroth'); LORE.unlockFlag('meet_delroth'); }},
  {x:sw[0]-1.5,z:sw[1],r:3.6,label:'☠ Dread Lord form (temporary)',act:()=>{ LORE.unlock('npc_delroth'); DREADLORD.toggle(); }},
  {x:sw[0]+3.5,z:sw[1]+2.5,r:2.5,label:'🥁 Stage: play Mori\'s beat',act:()=>togglePanel('beatP')},
  {x:st.dungeon.x,z:st.dungeon.z+2.2,r:3.2,label:'🕳 Enter the Undercroft',act:enterDungeon},
  {get x(){return mori.pos.x;}, get z(){return mori.pos.z;}, r:2.6,label:'💬 Talk to Mori',act:()=>openMoriChat()},
  {x:st.hall.x,z:st.hall.z+5.5,r:3,label:'🏛 Guild Hall (rest: full HP)',act:()=>{ S.hp=stats().maxHp; log('You re-center at the Guild Hall. HP full.'); }}
 ]); }
let curTarget=null;
function interact(){ if(crOpen) return; if(curTarget){ curTarget.act(); return; }
  if(mode==='world'){ // gather by hand near a node
    const n=nodes.find(n=>n.ready&&Math.hypot(n.x-player.pos.x,n.z-player.pos.z)<2.6); if(n){ gatherNode(n); return; }
    const w=weeds.find(w=>Math.hypot(w.x-player.pos.x,w.z-player.pos.z)<1.8); if(w){ scene.remove(w.g); weeds.splice(weeds.indexOf(w),1); const g=S.buffs.tokenbloom>0?2:1; S.life+=g; log('+'+g+' Life'); return; } } }

/* ---------- player movement ---------- */
const tmpV=new T.Vector3();
function collide(p, r){
  if(mode==='world'){ const CL=atGuild()?{circles:colliders.circles.concat(SW.F.colliders.circles),segs:colliders.segs.concat(SW.F.colliders.segs)}:SW.F.colliders;
    CL.circles.forEach(c=>{ const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz), m=c.r+r; if(d<m&&d>1e-4){ p.x=c.x+dx/d*m; p.z=c.z+dz/d*m; } });
    CL.segs.forEach(s=>{ const [x1,z1,x2,z2]=s; const vx=x2-x1, vz=z2-z1, L=vx*vx+vz*vz; let t=((p.x-x1)*vx+(p.z-z1)*vz)/L; t=Math.max(0,Math.min(1,t)); const cx=x1+vx*t, cz=z1+vz*t, dx=p.x-cx, dz=p.z-cz, d=Math.hypot(dx,dz); if(d<r&&d>1e-4){ p.x=cx+dx/d*r; p.z=cz+dz/d*r; } });
    p.x=Math.max(-2400,Math.min(2400,p.x)); p.z=Math.max(-2400,Math.min(2400,p.z)); }
}
function dungeonMove(p, nx, nz, r){ const D=dun; if(D.walk(nx+Math.sign(nx-p.x)*r, p.z)&&D.walk(nx,p.z)) p.x=nx; if(D.walk(p.x, nz+Math.sign(nz-p.z)*r)&&D.walk(p.x,nz)) p.z=nz; }
const groundY=(x,z)=>{ let h=W.height(x,z); if(SW.F.seaY!=null) h=Math.max(h,SW.F.seaY); const w=TF.waterAt(x,z); if(w!=null&&w-0.7>h) h=w-0.7; return h; }; // wade, don't sink, in Mori's lakes
function updatePlayer(dt){
  let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x, iz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y;
  const len=Math.hypot(ix,iz); if(len>1){ ix/=len; iz/=len; }
  const fx=-Math.sin(camYaw), fz=-Math.cos(camYaw), rx=Math.cos(camYaw), rz=-Math.sin(camYaw);
  const dx=fx*iz+rx*ix, dz=fz*iz+rz*ix; const sp=5.2*(1+stats().speed)*(keys.ShiftLeft?1.4:1);
  const moving=Math.hypot(dx,dz)>0.05;
  if(moving){ player.sit=null; const nx=player.pos.x+dx*sp*dt, nz=player.pos.z+dz*sp*dt; if(mode==='world'){ player.pos.x=nx; player.pos.z=nz; collide(player.pos,0.45); } else dungeonMove(player.pos,nx,nz,0.4); player.face=Math.atan2(dx,dz); }
  else if(player.sit){ player.pos.x=player.sit.x; player.pos.z=player.sit.z; }
  player.pos.y=mode==='world'?groundY(player.pos.x,player.pos.z):0;
  // tavern floor/stage
  if(mode==='world'&&tav.userData.inside(player.pos.x,player.pos.z)) player.pos.y=Math.max(player.pos.y, tav.userData.floorY||0.15);
  player.model.position.copy(player.pos); if(player.sit) player.model.position.y-=0.42; player.model.rotation.y=lerpAngle(player.model.rotation.y,player.face,Math.min(1,dt*12));
  HERO.animate(player.model, clockT, moving?Math.min(1.4,len*(1+stats().speed)):0);
  if(player.atkT>0){ player.atkT-=dt; const k=player.atkT/0.35; player.model.userData.hero.limbs.armR.rotation.x=-2.2*Math.sin(k*Math.PI); }
  // breadcrumbs for the companions
  const last=trail[0]; if(!last||Math.hypot(last.x-player.pos.x,last.z-player.pos.z)>0.35){ trail.unshift({x:player.pos.x,z:player.pos.z}); if(trail.length>60) trail.pop(); }
  comps.forEach((c,i)=>{ const crumb=trail[Math.min(trail.length-1,(i+1)*5)]||player.pos; const ddx=crumb.x-c.pos.x, ddz=crumb.z-c.pos.z, d=Math.hypot(ddx,ddz); let mv=0;
    if(d>0.15){ const s=Math.min(d, sp*1.05*dt*(d>3?1.6:1)); c.pos.x+=ddx/d*s; c.pos.z+=ddz/d*s; c.model.rotation.y=lerpAngle(c.model.rotation.y,Math.atan2(ddx,ddz),Math.min(1,dt*10)); mv=1; }
    if(d>14){ c.pos.x=crumb.x; c.pos.z=crumb.z; }
    c.pos.y=mode==='world'?groundY(c.pos.x,c.pos.z):0; c.model.position.copy(c.pos); HERO.animate(c.model, clockT+i, mv);
    if(c.atkT>0){ c.atkT-=dt; c.model.userData.hero.limbs.armR.rotation.x=-2.2*Math.sin(c.atkT/0.35*Math.PI); } });
}

/* ---------- dungeon ---------- */
let dun=null, mobs=[], chests=[], dunLvl=1;
let dunRet=null, dunName='The Undercroft';
function enterDungeon(o){ o=o&&o.ret?o:null;
  if(crOpen) return; dunRet=o?o.ret:null; dunName=o?o.name:'The Undercroft'; closeModal(); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open'));
  GATHERING.clearDungeon(); dun=W.buildDungeon(); mode='dungeon'; LORE.unlockFlag('enter_dungeon'); mobs=[]; chests=[]; dunLvl=1+S.clears+(o?o.lvl:0);
  const plan=[[0,['direrat','direrat']],[1,['skeleton','skeleton','direrat']],[2,['zombie','skeleton','zombie']],[3,['grayooze']]];
  const tmplFor=k=>{ if(k==='grayooze') return Math.random()<0.6?['halffiend','undead','fiendish'][SRD.rnd(3)-1]:'none'; if(Math.random()>0.35) return 'none';
    const opts=k==='direrat'?['fiendish','celestial','halffiend','zombie']:['fiendish','undead','halffiend','celestial']; return opts[SRD.rnd(opts.length)-1]; };
  // v3.2: progress is kept on retreat — slain foes stay slain, opened chests stay open, until the dungeon is cleared through the portal
  let DS=S.dun[dunName]; const resume=!!DS; if(!DS) DS=S.dun[dunName]={tm:[], dead:[], open:[], rested:false, lvl:dunLvl}; else dunLvl=Math.max(dunLvl,DS.lvl||dunLvl);
  let mi=0; plan.forEach(([ri,list])=>{ const r=dun.rooms[ri]; list.forEach((k,i)=>{ const idx=mi++; if(DS.tm[idx]==null) DS.tm[idx]=tmplFor(k); const m=SRD.makeMonster(k,DS.tm[idx]); const g=W.creatureMesh(m);
    const a=dun.tw(r.x0+1+SRD.rnd(r.x1-r.x0-2), r.y0+1+SRD.rnd(r.y1-r.y0-2)); if(ri===3){ a[0]=dun.center(r)[0]; a[1]=dun.center(r)[1]; }
    const dead=DS.dead.includes(idx); g.position.set(a[0],0,a[1]); g.visible=!dead; dun.scene.add(g); mobs.push({m, g, x:a[0], z:a[1], cd:1+Math.random(), alive:!dead, room:ri, hit:0, idx, ag:false}); }); });
  [[1,false],[2,false],[3,true]].forEach(([ri,big],ci)=>{ const r=dun.rooms[ri]; const a=dun.tw(r.x1-1, r.y0+1); const g=W.chestMesh(big); g.position.set(a[0],0,a[1]); dun.scene.add(g); const open=DS.open.includes(ci); if(open&&g.userData.lid) g.userData.lid.rotation.x=-1.9; chests.push({g,x:a[0],z:a[1],big,open,room:ri,ci}); });
  { const a=dun.tw(8,22), b=dun.tw(9,23); const cx=(a[0]+b[0])/2, cz=(a[1]+b[1])/2; const fire=new T.Group(); // mid-dungeon rest spot: a safe alcove between the Ossuary and the Chapel
    for(let i=0;i<5;i++){ const l=new T.Mesh(new T.CylinderGeometry(0.07,0.07,0.9,5), new T.MeshStandardMaterial({color:'#5a3a22'})); l.rotation.z=Math.PI/2; l.rotation.y=i*Math.PI/5*2; l.position.y=0.08; fire.add(l); }
    const fl=new T.Mesh(new T.ConeGeometry(0.3,0.8,7), new T.MeshStandardMaterial({color:'#ff9a3c', emissive:'#ff7a1a', emissiveIntensity:2})); fl.position.y=0.45; fire.add(fl);
    if(window.MT&&MT.on){ const a=MT.sprite('flame_fire',0.95,1.3), b=MT.sprite('flame_fire',0.6,0.85); if(a&&b){ fl.material.visible=false; a.position.y=-0.4; b.position.set(0.18,-0.4,0.1); fl.add(a,b); } } // Mori Templates: filmed flames
    const pl=new T.PointLight('#ffae5a',6,9); pl.position.y=1.0; fire.add(pl); fire.position.set(cx,0,cz); dun.scene.add(fire); dun.camp={x:cx,z:cz,g:fire,flame:fl,light:pl}; }
  if(resume) setTimeout(()=>log('You return to '+dunName+'. '+DS.dead.length+' foes are already down and '+DS.open.length+' chests already open — your progress was kept.'+(DS.rested?'':' The campfire alcove past the Ossuary is still unused.')),60);
  scene.remove(player.model); dun.scene.add(player.model); comps.forEach((c,i)=>{ scene.remove(c.model); dun.scene.add(c.model); c.pos.set(dun.start[0]-1+i,0,dun.start[1]+1); });
  player.pos.set(dun.start[0],0,dun.start[1]); player.face=Math.PI; camYaw=0; trail.length=0;
  if(!renderer.shadowMap.enabled) dun.lights.forEach(l=>l.castShadow=false);
  log(dunName+' — '+dun.rooms.map(r=>r.name).join(' → ')+'. Templates: '+([...new Set(mobs.map(x=>x.m.tmpl).filter(t=>t!=='none'))].map(t=>SRD.TEMPLATES[t].name).join(', ')||'none this time'));
}
function leaveDungeon(msg){ if(mode!=='dungeon') return; dunSaveState(); if(S.dun[dunName]) S.dun[dunName].rested=false; GATHERING.clearDungeon(); mode='world'; dismissRoll();
  const card=$('modalCard'); if(card&&/Loot chest|Boss chest/.test(card.textContent||'')) closeModal();
  dun.scene.remove(player.model); scene.add(player.model); comps.forEach((c,i)=>{ dun.scene.remove(c.model); scene.add(c.model); });
  const st=dunRet||{x:W.STATIONS.dungeon.x,z:W.STATIONS.dungeon.z+4}; player.pos.set(st.x,0,st.z); comps.forEach((c,i)=>c.pos.set(st.x-1+i,0,st.z+1.5)); camYaw=Math.PI; trail.length=0; dunRet=null;
  dun.scene.traverse(o=>{ if(o.geometry&&o.geometry.dispose) o.geometry.dispose(); }); dun=null; mobs=[]; chests=[]; if(msg) log(msg); save(); }
function zeroReturn(){ const keep=S.inv.some(i=>i.equipped&&i.fx&&i.fx.zeroKeep); const lost=keep?0:Math.floor(S.gold*0.1); S.gold-=lost; S.hp=stats().maxHp;
  if(mode==='dungeon'){ leaveDungeon(); } if(!atGuild()) travelTo(guildId,true); const h=W.STATIONS.hall; player.pos.set(h.x,0,h.z+7); comps.forEach((c,i)=>c.pos.set(h.x-1+i,0,h.z+8.5));
  modal('<h3>⭕ Zero-Return</h3><div class="quote">Your HP hit zero. The Guild calls you home to re-center.</div><div>'+(keep?'Your Zero-Return Band glows — you keep all your gold.':'You dropped '+lost+' gold on the way back.')+'</div>'); save(); }
function dungeonTargets(){ const t=GATHERING.targets(); chests.forEach(c=>{ if(!c.open) t.push({x:c.x,z:c.z,r:2.2,label:(c.big?'💎 Boss chest':'📦 Loot chest')+' — roll d%',act:()=>openChest(c)}); });
  if(dun.camp) t.push({x:dun.camp.x,z:dun.camp.z,r:2.6,label:(S.dun[dunName]||{}).rested?'🔥 Campfire (used this visit)':'🔥 Rest at the campfire (full heal, once this visit)',act:restAtCamp});
  t.push({x:dun.exitAt[0],z:dun.exitAt[1],r:2.6,label:dunRet?'🪜 Climb back out':'🪜 Climb back to the Guild',act:()=>leaveDungeon('You climb out of the Undercroft.')});
  if(!mobs.some(m=>m.alive&&m.m.boss)) t.push({x:dun.portalAt[0],z:dun.portalAt[1],r:2.4,label:'🌀 Portal home (cleared!)',act:()=>{ S.clears++; delete S.dun[dunName]; S.hp=stats().maxHp; leaveDungeon(dunName+' cleared! Level up: you are now level '+charLevel()+' ('+S.hp+' HP). Dungeons feel deeper next time (treasure level '+(S.clears+1)+').'); }});
  return t; }
function openChest(c){ if(c.room===3&&mobs.some(m=>m.alive&&m.m.boss)){ log('The ooze guards the boss chest. Defeat it first!'); return; }
  if(c.room<3&&mobs.some(m=>m.alive&&m.room===c.room)){ log('Clear the room before looting!'); return; }
  c.open=true; c.g.userData.lid.rotation.x=-1.9; dunSaveState(); const n=c.big?3:1; const res=[]; for(let i=0;i<n;i++) res.push(lootRoll(charLevel()+(c.big?1:0)));
  const got=res.map(t=>takeTreasure(t)); const bonus=walkUnlock(); showRoll(res[0].roll,'d% '+res[0].rolls.join(' → ')+' · '+res[0].name,'crit');
  modal('<h3>'+(c.big?'💎 Boss chest':'📦 Loot chest')+'</h3><div class="small">Random treasure, SRD-style d% tables (character level '+charLevel()+', treasure level '+(charLevel()+(c.big?1:0))+')</div>'+res.map(rollHtml).join('')+'<div class="small">Also found: '+bonus+'</div><div class="small">Added to bag: '+got.join(', ')+'</div>'); save(); }
let atkCd=0;
/* Mori Templates: a weapon carrying SRD spells throws a flame / bolt stream at the target (cosmetic only; the d20 roll is unchanged) */
function castSpellFx(target){ if(!(window.MT&&MT.on)) return; const w=S.inv.find(i=>i.equipped&&i.kind==='weapon'&&i.spells&&i.spells.length); if(!w) return;
  const sc=mode==='dungeon'&&dun?dun.scene:scene; const f=Math.sin(player.face), c=Math.cos(player.face); const from=new T.Vector3(player.pos.x+f*0.6,player.pos.y+1.3,player.pos.z+c*0.6);
  const to=target?new T.Vector3(target.x,(target.g?target.g.position.y:0)+0.9,target.z):new T.Vector3(player.pos.x+f*7,player.pos.y+1.1,player.pos.z+c*7); MT.cast(sc,from,to,MT.kindFor(w.spells)); }
function attack(){ if(crOpen||atkCd>0) return; atkCd=0.55; player.atkT=0.35; comps.forEach((c,i)=>setTimeout(()=>{ c.atkT=0.35; },80+i*90));
  const st=stats(); let best=null, bd=1e9; (mode==='dungeon'?mobs:GATHERING.crit).forEach(m=>{ if(!m.alive) return; const d=Math.hypot(m.x-player.pos.x,m.z-player.pos.z)-m.m.size*0.5; if(d<st.reach&&d<bd){ bd=d; best=m; } });
  if(!best){ castSpellFx(null); return; } player.face=Math.atan2(best.x-player.pos.x,best.z-player.pos.z); castSpellFx(best);
  const fl=comps.length?2:0, r=SRD.d20(), tot=r+st.atk+fl; const hit=r===20||(r!==1&&tot>=best.m.ac); const ab=st.atk+(fl?'+2 flank':'');
  if(!hit){ showRoll(r,'d20 '+r+' + '+ab+' = '+tot+' vs AC '+best.m.ac+' — <b>miss</b>'+(r===1?' (natural 1)':''),'miss'); return; }
  let dmg=SRD.dice('1d8')+st.dmg; if(r===20) dmg*=2; const friends=comps.length; dmg+=friends;
  best.m.hp-=dmg; best.hit=0.25;
  if(window.STATIONS){ const w=S.inv.find(i=>i.equipped&&i.kind==='weapon'); if(w) STATIONS.wearItem(w,1); }
  showRoll(r,'d20 '+r+' + '+ab+' = '+tot+' vs AC '+best.m.ac+' — <b>'+(r===20?'CRITICAL! ':'hit')+'</b> '+dmg+' dmg (Lyra, Juno & Kit copy: +'+friends+')',r===20?'crit':'');
  if(best.m.hp<=0) killMob(best, mode==='dungeon');
}
function killMob(best, inDun){ best.alive=false; GATHERING.addCarcass(best, inDun); const g=SRD.rnd(6)*best.m.xp; S.gold+=g;
  if(inDun){ dunSaveState(); S.larpy+=best.m.boss?3:0; if(best.room>=0&&!mobs.some(m=>m.alive&&m.room===best.room)){ QUESTS.event('room',best.room); noteRoomClear(dun&&dun.rooms[best.room]&&dun.rooms[best.room].name); } } const parts=GATHERING.partsFor(best.m).map(q=>GATHERING.R[q[0]].name).filter((v,i,a)=>a.indexOf(v)===i);
  log(best.m.name+' destroyed! +'+g+' gold'+(best.m.boss?' +3 LARPy — the boss chest unlocks and a portal opens.':'')+' · 🔪 Skin the carcass (E): '+parts.join(', ')); }
// shared SRD attack roll for any foe that reaches you (dungeon mobs and overworld critters)
function foeAttack(mb){ const st=stats(); if(S.buffs.halt>0&&mb.m.type==='undead'){ showRoll('✋',mb.m.name+' is held by Halt Undead','foe'); return; } const r=SRD.d20(), tot=r+mb.m.atk;
  if(r===20||(r!==1&&tot>=st.ac)){ const dm=Math.max(1,SRD.dice(mb.m.dmg)+mb.m.dmgBonus); S.hp-=dm; if(window.STATIONS){ const ar=S.inv.find(i=>i.equipped&&(i.kind==='armor'||i.kind==='shield')); if(ar) STATIONS.wearItem(ar,1); } const why=(mb.raid?'Bandit raid — ':'')+mb.m.name+' hits you for '+dm+' ('+Math.max(0,Math.round(S.hp))+'/'+st.maxHp+' HP)'; log('⚔ '+why); showRoll(r,why+' · d20 '+r+'+'+mb.m.atk+' = '+tot+' vs AC '+st.ac,'foe'); if(S.hp<=0){ S.hp=0; zeroReturn(); } }
  else showRoll(r,mb.m.name+': d20 '+r+'+'+mb.m.atk+' = '+tot+' vs AC '+st.ac+' — misses','foe'); }
function noteRoomClear(name){ S.roomClears=(S.roomClears||0)+1; log('🕳 Room cleared'+(name?': '+name:'')+' ('+S.roomClears+' so far). Full dungeon clears stay '+(S.clears||0)+' — those are the boss portal, and they are what raise your level.'); }
function dunRoomAt(x,z){ if(!dun) return -1; const tx=Math.floor(x/2+13), ty=Math.floor(z/2+23); return dun.rooms.findIndex(r=>tx>=r.x0&&tx<=r.x1&&ty>=r.y0&&ty<=r.y1); }
function dunRoomName(){ const i=dunRoomAt(player.pos.x,player.pos.z); return i>=0?dun.rooms[i].name:(dun&&dun.camp&&Math.hypot(player.pos.x-dun.camp.x,player.pos.z-dun.camp.z)<5?'campfire alcove':''); }
function dunSaveState(){ const DS=S.dun[dunName]; if(!DS) return; DS.dead=mobs.filter(m=>!m.alive).map(m=>m.idx); DS.open=chests.filter(c=>c.open).map(c=>c.ci); DS.lvl=dunLvl; }
function restAtCamp(){ const DS=S.dun[dunName]; if(DS&&DS.rested){ log('You already rested on this visit. Leave and come back if you need the fire again.'); return false; }
  if(mobs.some(m=>m.alive&&m.ag&&Math.hypot(m.x-player.pos.x,m.z-player.pos.z)<14)){ log('You can\'t rest with enemies hunting you!'); return false; }
  const mx=stats().maxHp, got=mx-S.hp; S.hp=mx; if(DS) DS.rested=true; if(dun.camp){ dun.camp.light.intensity=1.5; dun.camp.flame.scale.setScalar(0.4); }
  log('🔥 You rest at the campfire: +'+got+' HP (full). Once this visit — leaving the dungeon relights it.'); save(); return true; }
function updateDungeon(dt){
  const st=stats(); const proom=dunRoomAt(player.pos.x,player.pos.z);
  mobs.forEach(mb=>{ if(!mb.alive||mode!=='dungeon') return; const dx=player.pos.x-mb.x, dz=player.pos.z-mb.z, d=Math.hypot(dx,dz); const reach=mb.m.size*0.5+0.9;
    // v3.2 aggro: a mob wakes when you enter its room or come within 4.5 m, then hunts you until you leave it 18 m behind
    if(!mb.ag&&((proom===mb.room&&d<16)||d<4.5)) mb.ag=true; else if(mb.ag&&d>18) mb.ag=false;
    const g=mb.g; if(mb.hit>0){ mb.hit-=dt; g.scale.setScalar(1+mb.hit); } else g.scale.setScalar(1);
    if(mb.ag&&d>reach){ const nx=mb.x+dx/d*mb.m.speed*dt, nz=mb.z+dz/d*mb.m.speed*dt; const p={x:mb.x,z:mb.z}; dungeonMove(p,nx,nz,mb.m.size*0.3); mb.x=p.x; mb.z=p.z; g.rotation.y=Math.atan2(dx,dz); }
    g.position.set(mb.x, mb.m.shape==='slime'?0:0, mb.z); const t=clockT*6;
    if(g.userData.body&&mb.m.shape==='slime') g.userData.body.scale.set(1+Math.sin(t*0.5)*0.06,1-Math.sin(t*0.5)*0.06,1+Math.sin(t*0.5)*0.06);
    if(g.userData.arms) g.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(t+i*Math.PI)*0.6);
    if(g.userData.aura) g.userData.aura.rotation.y+=dt;
    mb.cd-=dt; if(mb.ag&&d<=reach+0.2&&mb.cd<=0){ mb.cd=1.7; foeAttack(mb); } });
  if(dun&&dun.camp&&!(S.dun[dunName]||{}).rested){ dun.camp.flame.scale.y=1+Math.sin(clockT*11)*0.15; dun.camp.light.intensity=5+Math.sin(clockT*7)*1.2; }
  if(dun){ dun.torch.position.set(player.pos.x,2.6,player.pos.z); dun.portal.rotation.z+=dt; const open=!mobs.some(m=>m.alive&&m.m.boss); dun.pDisc.material.opacity=open?0.55+Math.sin(clockT*3)*0.15:0.08; }
}

/* ---------- HeroLock creator ---------- */
let crOpen=false, crScene=null, crCam=null, crModel=null, crYaw=0, crPitch=0.05, crDist=2.6, crFocus='body', crEdit=null;
const VIEWS=[['Front',0,0.02],['L45',-Math.PI/4,0.02],['R45',Math.PI/4,0.02],['Up',0,-0.55],['Down',0,0.62]];
function setupCreator(){ crScene=new T.Scene(); crScene.background=new T.Color('#120d1c');
  crScene.add(new T.HemisphereLight('#e8e0ff','#302040',1.2)); const k=new T.DirectionalLight('#ffffff',1.8); k.position.set(2,3,3); crScene.add(k);
  const r=new T.DirectionalLight('#ff8af0',1.0); r.position.set(-3,2,-2); crScene.add(r);
  const disc=new T.Mesh(new T.CylinderGeometry(1.1,1.2,0.08,32),HERO.M('#2a1e36')); disc.position.y=-0.04; crScene.add(disc);
  const ring=new T.Mesh(new T.TorusGeometry(1.15,0.02,6,40),HERO.M('#ff8af0',{e:'#ff8af0',ei:1.2})); ring.rotation.x=Math.PI/2; crScene.add(ring);
  crCam=new T.PerspectiveCamera(35,innerWidth/innerHeight,0.05,50); }
function openCreator(){ if(mode==='dungeon'){ log('Finish the dungeon first.'); return; } if(!crScene) setupCreator(); crOpen=true; crEdit=charById(CH.sel); $('creator').classList.add('open'); document.body.classList.add('cr');
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open')); crFocus='head'; crYaw=0.35; crPitch=0.05; crDist=2.1; crRebuild(); crUI(); }
function closeCreator(){ crOpen=false; $('creator').classList.remove('open'); document.body.classList.remove('cr'); }
function crRebuild(){ if(crModel) crScene.remove(crModel); crModel=HERO.build(crEdit); crScene.add(crModel); }
function selectChar(id){ crEdit=charById(id); crRebuild(); crUI(); }
const SRD_CLASSES=['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Wizard'];
function clsLabel(c){ return HERO.RACES[c.race].label+(c.cls?' '+c.cls:'')+(c.flavor?' ('+c.flavor+')':''); }
function crUI(){ const p=crEdit, L=!!p.locked;
  $('crName').textContent=(L?'🔒 ':'')+p.name; $('crSub').textContent=(p.title||clsLabel(p))+(L?' · locked preset':'')+(CH.sel===p.id?' · ▶ playing':'');
  let l='<div class="sec">Characters</div>'+allChars().map(c=>'<div class="q'+(c.id===p.id?' sel':'')+'" data-ch="'+c.id+'"><span>'+(c.locked?'🔒 ':'')+c.name+'</span><span class="small">'+(c.title?HERO.RACES[c.race].label:clsLabel(c).replace(/ \(.*\)$/,''))+'</span></div>').join('');
  l+='<div class="row"><button id="crNew">＋ New</button><button id="crDup">⧉ Duplicate to edit</button>'+(L?'':'<button id="crDel">🗑 Delete</button>')+'</div><div class="row"><button class="pri" id="crPlay">▶ Play as '+p.name+'</button><button id="crDone">Done</button></div>';
  $('crLeft').innerHTML=l;
  const dis=L?'disabled':'';
  let r=(L?'<div class="lock">🔒 Locked preset — identity is sealed. Press <b>Duplicate to edit</b> to make your own copy.</div>':'');
  r+='<div class="row"><label>Name <input id="crNm" value="'+p.name.replace(/"/g,'&quot;')+'" '+dis+' style="width:150px"></label></div>';
  r+='<div class="sec">Race (3.5 SRD + Robert\'s world)</div><div class="row">'+Object.keys(HERO.RACES).map(k=>'<button data-race="'+k+'" '+dis+' class="'+(p.race===k?'pri':'')+'">'+HERO.RACES[k].label+'</button>').join('')+'</div>';
  r+='<div class="sec">Class (3.5 SRD · flavor only)</div><div class="row"><label>Class <select id="crCls" '+dis+'><option value="">—</option>'+SRD_CLASSES.map(c=>'<option '+(p.cls===c?'selected':'')+'>'+c+'</option>').join('')+'</select></label><label>Flavor <input id="crFlav" value="'+String(p.flavor||'').replace(/"/g,'&quot;')+'" placeholder="e.g. crafting focus" '+dis+' style="width:120px"></label></div><div class="small">Classes are flair for now: your level is 3 + full dungeon clears (the boss portal), not rooms cleared ('+(S.roomClears||0)+' rooms, '+(S.clears||0)+' full clears). That level is your caster level at the Item bench.</div>';
  r+='<div class="sec">Persona card (NPCs read this)</div><div class="row"><label>Background <input id="crBg" value="'+String(p.background||'').replace(/"/g,'&quot;')+'" placeholder="e.g. guild orphan" '+dis+' style="width:140px"></label></div><div class="row"><label style="flex:1">Bio <input id="crBio" value="'+String(p.bio||'').replace(/"/g,'&quot;')+'" placeholder="one short line NPCs can quote" '+dis+' style="width:100%"></label></div>';
  r+='<div class="sec">Face & body</div>'+HERO.SLIDERS.map(([k,lab,mn,mx])=>'<div class="sl"><span>'+lab+'</span><input type="range" data-sl="'+k+'" min="'+mn+'" max="'+mx+'" step="0.01" value="'+(p[k]!==undefined?p[k]:0.5)+'" '+dis+'></div>').join('');
  r+='<div class="sec">Colors</div><div class="row"><label>Fur/skin <input type="color" data-col="skin" value="'+p.skin+'" '+dis+'></label><label>Hair <input type="color" data-col="hair" value="'+p.hair+'" '+dis+'></label><label>Eye glow <input type="color" data-col="eyeGlow" value="'+p.eyeGlow+'" '+dis+'></label></div>';
  r+='<div class="sl"><span>Glow strength</span><input type="range" data-sl="glow" min="0" max="1" step="0.01" value="'+(p.glow||0)+'" '+dis+'></div>';
  r+='<div class="row"><label><input type="checkbox" data-cb="scars" '+(p.scars?'checked':'')+' '+dis+'> Scars</label><label><input type="checkbox" data-cb="beard" '+(p.beard?'checked':'')+' '+dis+'> Beard</label><label><input type="checkbox" data-cb="robe" '+(p.robe?'checked':'')+' '+dis+'> Robe</label><label><input type="checkbox" data-cb="veil" '+(p.veil?'checked':'')+' '+dis+'> Veil</label></div>';
  r+='<div class="sl"><span>Scar heaviness</span><input type="range" data-sl="scarHeavy" min="0" max="1" step="0.01" value="'+(p.scarHeavy||0)+'" '+dis+'></div>';
  r+='<div class="sec">Template Painter</div><div class="row"><label>Hair <select data-sel="hairStyle" '+dis+'>'+['none','short','wolfcut','long'].map(h=>'<option '+(p.hairStyle===h?'selected':'')+' '+(h==='wolfcut'&&!S.templates.includes('Hair: Wolfcut')&&!L?'disabled':'')+'>'+h+'</option>').join('')+'</select></label>'+
    '<label><input type="checkbox" data-cb="corset" '+(p.corset?'checked':'')+' '+(L||!S.templates.includes('Leather: Corset')?'disabled':'')+'> Corset</label><label><input type="checkbox" data-cb="pauldron" '+(p.pauldron?'checked':'')+' '+(L||!S.templates.includes('Armor: Pauldron')?'disabled':'')+'> Pauldron</label>'+
    '<label><input type="checkbox" data-cbv="bootStyle|stomper|plain" '+(p.bootStyle==='stomper'?'checked':'')+' '+(L||!S.templates.includes('Boots: Stomper')?'disabled':'')+'> Stompers</label>'+
    '<label><input type="checkbox" data-cbv="hat|plus5|none" '+(p.hat==='plus5'?'checked':'')+' '+(L||!S.hatEgg?'disabled':'')+'> +5 HAT'+(S.hatEgg?'':' (find it)')+'</label></div>';
  r+='<div class="row">'+['top','armor','boots'].map(k=>'<label>'+k+' <input type="color" data-col="'+k+'" value="'+p[k]+'" '+dis+'></label>').join('')+'</div>';
  r+='<div class="small">Templates not owned yet are greyed out — find them in Undercroft chests.</div>';
  $('crRight').innerHTML=r;
  $('crViews').innerHTML=VIEWS.map((v,i)=>'<button data-v="'+i+'">'+v[0]+'</button>').join('')+'<button data-v="body">Full body</button>';
  const L_=$('crLeft'), R_=$('crRight');
  L_.querySelectorAll('[data-ch]').forEach(x=>x.onclick=()=>selectChar(x.dataset.ch));
  $('crNew').onclick=()=>{ const n=Object.assign(HERO.params('human'),{id:'c_'+Date.now(),name:'New Hero'}); CH.list.push(n); saveChars(); selectChar(n.id); };
  $('crDup').onclick=()=>{ const n=JSON.parse(JSON.stringify(p)); n.id='c_'+Date.now(); n.locked=false; n.name=p.name+' (copy)'; delete n.title; CH.list.push(n); saveChars(); selectChar(n.id); log('Duplicated '+p.name+' — this copy is editable.'); };
  if($('crDel')) $('crDel').onclick=()=>{ if(!confirm('Delete '+p.name+'?')) return; CH.list=CH.list.filter(c=>c.id!==p.id); if(CH.sel===p.id) CH.sel=(CH.list[0]||HERO.PRESETS.delroth).id; saveChars(); selectChar(CH.sel); rebuildPlayer(); };
  $('crPlay').onclick=()=>{ CH.sel=p.id; saveChars(); rebuildPlayer(); log('You are now '+p.name+'.'); crUI(); };
  $('crDone').onclick=closeCreator;
  if(L) return;
  const ch=()=>{ saveChars(); crRebuild(); if(CH.sel===p.id) rebuildPlayer(); };
  $('crNm').oninput=e=>{ p.name=e.target.value||'Hero'; saveChars(); $('crName').textContent=p.name; };
  $('crCls').onchange=e=>{ p.cls=e.target.value; saveChars(); crUI(); }; $('crFlav').oninput=e=>{ p.flavor=e.target.value.slice(0,30); saveChars(); $('crSub').textContent=clsLabel(p)+(CH.sel===p.id?' · ▶ playing':''); };
  if($('crBg')) $('crBg').oninput=e=>{ p.background=e.target.value.slice(0,40); saveChars(); };
  if($('crBio')) $('crBio').oninput=e=>{ p.bio=e.target.value.slice(0,140); saveChars(); };
  R_.querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>{ const keep={id:p.id,name:p.name,cls:p.cls,flavor:p.flavor,background:p.background,bio:p.bio}; Object.assign(p,HERO.params(b.dataset.race),keep); ch(); crUI(); });
  R_.querySelectorAll('[data-sl]').forEach(s=>s.oninput=()=>{ p[s.dataset.sl]=+s.value; ch(); });
  R_.querySelectorAll('[data-col]').forEach(s=>s.oninput=()=>{ p[s.dataset.col]=s.value; ch(); });
  R_.querySelectorAll('[data-cb]').forEach(s=>s.onchange=()=>{ p[s.dataset.cb]=s.checked; if(s.dataset.cb==='scars'&&s.checked&&!p.scarHeavy) p.scarHeavy=0.5; ch(); });
  R_.querySelectorAll('[data-cbv]').forEach(s=>s.onchange=()=>{ const [k,on,off]=s.dataset.cbv.split('|'); p[k]=s.checked?on:off; ch(); });
  R_.querySelectorAll('[data-sel]').forEach(s=>s.onchange=()=>{ p[s.dataset.sel]=s.value; ch(); });
}
$('crViews').addEventListener('click',e=>{ const v=e.target.dataset&&e.target.dataset.v; if(v===undefined) return; if(v==='body'){ crFocus='body'; crDist=3.2; crYaw=0.4; crPitch=0.1; } else { const V=VIEWS[+v]; crFocus='head'; crYaw=V[1]; crPitch=V[2]; crDist=1.1; } });
$('bHero').onclick=openCreator;
function headY(){ const p=crEdit; return 1.64*(p.height||1); }
function placeCam(cam, yaw, pitch, dist, focus){ const fy=focus==='head'?headY():0.95*(crEdit.height||1);
  cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist, fy+Math.sin(pitch)*dist, Math.cos(yaw)*Math.cos(pitch)*dist); cam.lookAt(0,fy,0); }
const thumbCam=new T.PerspectiveCamera(30,1,0.05,20);
function renderCreator(){ const w=innerWidth,h=innerHeight; renderer.setScissorTest(false); renderer.setViewport(0,0,w,h);
  placeCam(crCam,crYaw,crPitch,crDist,crFocus); if(w<760){ crCam.setViewOffset(w,h,0,h*0.2,w,h); } else if(crCam.view&&crCam.view.enabled){ crCam.clearViewOffset(); } HERO.animate(crModel,clockT,0); renderer.render(crScene,crCam);
  // 5-selfie identity lock strip
  const s=IS_TOUCH?Math.min(62,(w-20)/5-6):92, gap=6, tot=5*s+4*gap, x0=(w-tot)/2, y0=IS_TOUCH?28:h-150-s; if(window.__noThumbs){ return; } renderer.setScissorTest(true);
  VIEWS.forEach((v,i)=>{ const x=x0+i*(s+gap); renderer.setViewport(x,h-y0-s,s,s); renderer.setScissor(x,h-y0-s,s,s); placeCam(thumbCam,v[1],v[2],0.95,'head'); thumbCam.aspect=1; thumbCam.updateProjectionMatrix(); renderer.render(crScene,thumbCam); });
  renderer.setScissorTest(false); renderer.setViewport(0,0,w,h);
  const lab=$('crThumbLab'); lab.style.top=(y0+s+2)+'px'; lab.style.left=x0+'px'; lab.style.width=tot+'px'; }

/* ---------- labels (speech bubbles) ---------- */
function label(id){ let e=$(id); if(!e){ e=document.createElement('div'); e.id=id; e.className='label3d'; document.body.appendChild(e); } return e; }
const lblD=label('lblDelroth'), lblM=label('lblMori'), lblDoll=label('lblDoll'), lblT=label('lblTarget');
{ const t=document.createElement('div'); t.id='crThumbLab'; t.className='small'; t.innerHTML='<div style="display:flex;justify-content:space-around">'+VIEWS.map(v=>'<span>'+v[0]+'</span>').join('')+'</div><div style="text-align:center">identity lock · 5 angles</div>'; $('creator').appendChild(t); }
function project(obj3, yOff, el, html){ tmpV.copy(obj3).setY(obj3.y+yOff).project(camera); if(tmpV.z>1||Math.abs(tmpV.x)>1.1||Math.abs(tmpV.y)>1.1){ el.style.display='none'; return; }
  el.style.display='block'; el.style.left=((tmpV.x+1)/2*innerWidth)+'px'; el.style.top=((1-tmpV.y)/2*innerHeight)+'px'; if(el._h!==html){ el.innerHTML=html; el._h=html; } }

/* ---------- day / night ---------- */
const DAY=240; const cDay=new T.Color('#8ec5ff'), cDusk=new T.Color('#ff9a6a'), cNight=new T.Color('#0b0a22'), skyC=new T.Color();
function updateSky(dt){ S.clock=(S.clock+dt)%DAY; const ph=S.clock/DAY, el=Math.sin(ph*Math.PI*2); // el>0 day
  const day=Math.max(0,Math.min(1,el*2.5+0.3)); skyC.copy(cNight).lerp(cDay,day); if(Math.abs(el)<0.3) skyC.lerp(cDusk,(0.3-Math.abs(el))/0.3*0.55);
  scene.background=skyC; scene.fog.color.copy(skyC); hemi.intensity=0.25+0.85*day; sun.intensity=2.2*day+0.05;
  sun.position.set(player.pos.x+Math.cos(ph*Math.PI*2)*40, Math.max(6,el*50), player.pos.z+12); sun.target.position.set(player.pos.x,0,player.pos.z);
  stars.material.opacity=1-day; stars.position.set(player.pos.x,0,player.pos.z);
  built.forEach(b=>{ if(b.g.userData.halo) b.g.userData.halo.material.opacity=0.15+0.6*(1-day); });
  $('sClock').textContent=(day>0.5?'☀ Day':el>-0.2&&el<0.2?'🌆 Dusk':'🌙 Night')+' '+String(Math.floor(ph*24)).padStart(2,'0')+':00';
  return day; }

/* ---------- HUD ---------- */
function hud(){ const st=stats(); $('sHp').textContent=S.hp+'/'+st.maxHp; $('hpbar').firstElementChild.style.width=(S.hp/st.maxHp*100)+'%';
  $('sLife').textContent=S.life; $('sLarpy').textContent=S.larpy; $('sGold').textContent=S.gold; $('sHerbs').textContent=S.herbs; $('sOre').textContent=(S.ore||0)+(window.GATHERING?GATHERING.stand('ore'):0); $('sTimber').textContent=S.timber;
  { const id=curRegion(), inf=PL.regionInfo(id), stg=stageOf(id); $('sRegion').textContent=mode==='dungeon'&&dun?'🕳 '+dunName+' · '+(dunRoomName()||'passage')+' · rooms '+(S.roomClears||0)+' · full clears '+(S.clears||0)+' · under '+inf.name:'🌍 '+(atGuild()?'The Guild · ':'')+inf.name+' · '+(stg?PL.BIOMES[inf.biome].name:'void')+' · '+STAGES[stg];
  if($('sWorld')&&window.IDLEBUILD) $('sWorld').textContent=IDLEBUILD.progressChip(); }
  const ri=rankInfo(); $('sRank').textContent='🔨 '+ri.name+' '+ri.p+'%'; renderHotbar(); $('bAttack').style.display=(document.body.classList.contains('phone')||mode==='dungeon')?'':'none'; }

/* ---------- World Seed: travel, globe map, seed panel (v3) ---------- */
function setTownVisible(v){ const skip=new Set([hemi,sun,sun.target,stars,player.model].concat(comps.map(c=>c.model)));
  scene.children.forEach(o=>{ if(skip.has(o)||o.isLight||o.userData.sw) return; o.visible=v; }); }
function tfFinishCur(){ if(curJob&&curJob.kind==='tf'&&curJob.plan){ TF.finishNow(curJob.plan); finishJob(curJob); } }
function travelTo(id, quiet){ if(mode==='dungeon'||crOpen) return; id=+id; tfFinishCur(); S.at=id===guildId?null:id; refreshFrameAt();
  if(id===guildId) LORE.unlockFlag('visit_guild'); else if(window.CLAN&&CLAN.site){ if(CLAN.site.kind==='clan') LORE.unlockFlag('visit_clan'); if(CLAN.site.kind==='haven'){ LORE.unlockFlag('visit_haven'); if(CLAN.pct&&CLAN.pct()>0) LORE.unlockFlag('see_blight'); } }
  const L=atGuild()?{x:W.STATIONS.hall.x,z:W.STATIONS.hall.z+8}:SW.landing(); player.pos.set(L.x,0,L.z); comps.forEach((c,i)=>c.pos.set(L.x-1-i,0,L.z+1+i)); trail.length=0; camYaw=0;
  WD().exp[id]=1; setTownVisible(atGuild()); globeDirty=true; const inf=PL.regionInfo(id); const st=stageOf(id);
  if(!quiet) log(atGuild()?'🌱 Back at the Guild — the planet\'s starting point.':'🗿 You step out of the waystone into '+inf.name+' · '+(st?PL.BIOMES[inf.biome].name+' · '+STAGES[st]:'unprogrammed void')+'.');
  closeGlobe(); save(); GATHERING.reset&&GATHERING.reset();
  if(!quiet&&!atGuild()) setTimeout(()=>{ if(curRegion()!==id) return; if(CLAN.isSister(id)) addChat('mo','this is havenwall. the purple stuff is the coilblight. '+CLAN.pct()+'% of the ground. press E on it to purge, or ask me to cleanse!'); else if(CLAN.isClan(id)) addChat('mo','gravenmoor! the demon clan lives here. legion is the smoke. be polite to the death of earth if you see it.'); else { const g=GATHERING.suggest(); if(g) addChat('mo',g); } },2600); }
function refreshFrameAt(){ SW.setFrame(curRegion(), atGuild()); SW.update(player.pos.x,player.pos.z,999); }
function openGlobe(){ if(crOpen||mode==='dungeon') return; closeModal(); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('open'));
  if(!SW.globe.G.mesh){ SW.globe.build(); globeDirty=false; } else if(globeDirty){ SW.globe.refresh(); globeDirty=false; }
  globeOpen=true; document.body.classList.add('globe'); if(SW.globe.G.sel<0) SW.globe.select(curRegion()); SW.globe.focus(SW.globe.G.sel); renderSeedPanel(); $('seedP').classList.add('open'); }
function closeGlobe(){ if(!globeOpen) return; globeOpen=false; document.body.classList.remove('globe'); $('seedP').classList.remove('open'); SW.globe.hideLabels(); }
const relWord={ally:'🤝 ally',rival:'⚔ rival',vassal:'👑 vassal',neutral:'· neutral'};
function cityRels(id){ const G=SW.globe.G; return (G.rels||[]).filter(r=>r.a===id||r.b===id).map(r=>{ const o=r.a===id?r.b:r.a; const cs=PL.cityState(o,guildId); let w=relWord[r.type];
  if(r.type==='vassal') w=r.vassal===id?'👑 vassal of':'👑 overlord of'; return {w, name:cs.name, type:r.type}; }); }
function civicProfileFor(id){ if(!window.GROUNDED) return null; const cs=PL.cityState(id,guildId), inf=PL.regionInfo(id);
  return GROUNDED.civicProfile({id, biome:inf.biome, gov:cs.gov, power:cs.power, guild:id===guildId, clan:!!cs.clan, sister:!!cs.sister, rng:PL.rngFor(PL.seed,'civic',id)}); }
function civicHTML(id){ const prof=civicProfileFor(id); if(!prof) return ''; const saved=(WD().civic||{})[id]; const d=GROUNDED.displayArts(prof, saved);
  const names=d.frontier.map(a=>{ const t=GROUNDED.techById(a); return t?t.name:a; }).slice(0,6).join(', ');
  const cap=GROUNDED.commandCapacity('grand');
  return '<div class="sec">Civic knowledge</div><div class="small">Dominant face: <b>'+prof.race+'</b>'+(prof.minorities&&prof.minorities.length?' · also '+prof.minorities.join(', '):'')+(prof.beast?' · a small '+prof.beast+' band':'')+'. Mixed company is welcome; the map still reads as one people.</div>'
    +'<div class="small">Arts at the frontier: '+names+'.</div>'
    +(d.taught.length?'<div class="small">Learned from trade or a teacher: '+d.taught.map(a=>GROUNDED.techById(a).name).join(', ')+'.</div>':'')
    +'<div class="small">Grand crest: '+cap.subordinateCrests+' captains, each leading a band of '+GROUNDED.CREST.personal.bandSize+'. Allies and teachers keep their own crest and do not fill those seats. No host is raised from a character level.</div>'; }
function noteCivic(via, hint){ if(!window.GROUNDED||via==='level') return null; const id=curRegion(); if(stageOf(id)<1) return null;
  const art=GROUNDED.artForHint(hint); if(!art) return null; const prof=civicProfileFor(id); if(!prof) return null;
  const w=WD(); if(!w.civic) w.civic={}; const saved=w.civic[id]||(w.civic[id]={taught:[], dev:0, log:[]});
  const res=GROUNDED.teachArt(prof.arts.concat(saved.taught), art, {via, teacherCulture:via==='teacher'?prof.culture:null});
  const cs=PL.cityState(id,guildId);
  if(res.ok){ saved.taught.push(art); saved.dev=(saved.dev||0)+1; saved.log.push({via, art}); if(saved.log.length>8) saved.log.shift();
    log('📘 '+cs.name+' learns '+GROUNDED.techById(art).name+' from '+via+'. A character level would not have taught it.'); }
  else if(res.reason==='prereq'&&!saved.log.some(l=>l.miss===art)){ saved.log.push({miss:art, via}); if(saved.log.length>8) saved.log.shift();
    log('📘 '+cs.name+' can use the '+String(hint).replace(/_/g,' ')+', but not yet: still needs '+res.missing.join(', ')+'.'); }
  return res; }
function cityModal(id){ if(!SW.globe.G.mesh) SW.globe.build(); else if(globeDirty){ SW.globe.refresh(); globeDirty=false; } const cs=PL.cityState(id,guildId); const rels=cityRels(id);
  modal('<h3>⚑ '+cs.name+'</h3><div class="row"><span class="chip" style="background:'+cs.banner[0]+';color:'+cs.banner[1]+'">banner</span><b>'+cs.govName+'</b></div><div>Ruled by <b>'+cs.ruler+'</b></div><div class="quote">“'+cs.motto+'”</div><div class="small">Power '+cs.power+'/10 · '+PL.regionInfo(id).name+'</div>'+civicHTML(id)+'<div class="sec">Relations</div>'+(rels.length?rels.map(r=>'<div>'+r.w+' <b>'+r.name+'</b></div>').join(''):'<div class="small">No neighbours close enough to care yet.</div>')+CLAN.cityHTML(id)); }
function renderSeedPanel(){ const b=$('seedBody'); if(!b) return; const G=SW.globe.G; const sel=G.sel; const n=programmedCount(); const cities=(G.cities||[]); const ex=Object.keys(WD().exp).length;
  let h='<div class="sec">World Seed</div><div class="row"><input id="seedIn" type="text" value="'+String(S.seed).replace(/"/g,'')+'" style="flex:1;min-width:0"><button id="seedApply">Apply</button><button id="seedRand">🎲 Randomize</button></div>';
  h+='<div class="small">Same seed → same planet, every time. Radius <b>3,185 km</b> (¼ of Earth\'s surface area). '+PL.COUNT+' regions of ~'+Math.round(PL.RADIUS_KM*Math.PI/2/PL.N)+' km. Only the seed and Mori\'s progress are saved; terrain, biomes and names are recomputed.</div>';
  h+='<div class="row small"><span class="chip">🌱 '+n+'/'+PL.COUNT+' programmed ('+(n/PL.COUNT*100).toFixed(1)+'%)</span><span class="chip">▦ '+(PL.COUNT-n)+' void</span><span class="chip">⚑ '+cities.length+' city-states</span><span class="chip">👣 '+ex+' explored</span></div>';
  if(sel>=0){ const inf=PL.regionInfo(sel), st=stageOf(sel); const own=G.own&&G.own.get(sel);
    h+='<div class="sec">Selected region</div><div><b>'+inf.name+'</b>'+(sel===guildId?' · 🏛 the Guild (start point)':'')+'</div><div class="small">'+(st?PL.BIOMES[inf.biome].name:'Unprogrammed void')+' · '+inf.lat.toFixed(1)+'°, '+inf.lon.toFixed(1)+'° · '+(st?(inf.e>0?Math.round(inf.e)+' m above sea':Math.round(-inf.e)+' m deep'):'no data yet')+'</div>';
    h+='<div class="small">Layer: <b>'+STAGES[st]+'</b> ('+st+'/'+maxStage(sel)+')'+(own!=null?' · claimed by <b>'+PL.cityState(own,guildId).name+'</b>':'')+(WD().exp[sel]?' · explored':'')+'</div>';
    h+='<div class="row">'+(seedable(sel)?'<button class="pri" id="seedQ">🌱 Queue seed job: '+STAGES[st+1]+'</button>':'<span class="small">'+(st>=maxStage(sel)?'Fully programmed for now.':'Not adjacent to programmed land yet.')+'</span>')+'<button id="seedGo">🗿 Travel here</button>'+(st>=4?'<button id="seedCity">⚑ City</button>':'')+'</div>'; }
  h+='<div class="sec">City-states</div>'+(cities.length?cities.map(id=>{ const cs=PL.cityState(id,guildId); const r=cityRels(id).filter(x=>x.type!=='neutral');
    return '<div class="q" data-city="'+id+'"><span><span class="chip" style="background:'+cs.banner[0]+';color:'+cs.banner[1]+'">⚑</span> <b>'+cs.name+'</b> — '+cs.govName+' · '+cs.ruler+(r.length?'<br><span class="small">'+r.map(x=>x.w+' '+x.name).join(' · ')+'</span>':'')+'</span></div>'; }).join(''):'<div class="small">None yet. Mori founds one when a region reaches its 4th layer.</div>');
  h+='<div class="sec">Legend</div><div class="small"><span style="color:#9aa3b5">▦ gray wireframe = void</span> · <span style="color:#a3ff12">— lime edge = programming frontier</span> · colored borders = city-state claims · <span style="color:#3dff7a">— ally</span> · <span style="color:#ff3b3b">— rival</span> · <span style="color:#ffd23b">- - vassal</span> · ⚪ explored</div>';
  if(window.IDLEBUILD) h+=IDLEBUILD.settingsHTML();
  if(window.POWER) h+=POWER.settingsHTML();
  if(window.PHONE) h+=PHONE.settingsHTML(document.body.classList.contains('phone'));
  h+='<div class="row"><button id="seedHome">🏛 Return to the Guild</button><button id="seedClose">✕ Close globe</button></div>';
  b.innerHTML=h;
  if(window.IDLEBUILD) IDLEBUILD.bindSettings(b);
  const pm=$('powerMode'); if(pm) pm.onchange=()=>{ POWER.setMode(pm.value); PERF.auto=pm.value==='auto'; applyQuality(POWER.framePlan(0).qualityMax, 'power '+pm.value); renderSeedPanel(); };
  const ph=$('phoneOn'); if(ph) ph.onchange=()=>{ try{ localStorage.setItem('mori.phone', ph.checked?'on':'off'); }catch(e){} refreshPhone(); };
  $('seedApply').onclick=()=>applySeed($('seedIn').value); $('seedRand').onclick=()=>applySeed(PL.randomSeed());
  if($('seedQ')) $('seedQ').onclick=()=>{ queueJob('seed',sel); log('Queued for Mori: '+jobLabel({kind:'seed',what:sel})); renderSeedPanel(); };
  if($('seedGo')) $('seedGo').onclick=()=>travelTo(sel); if($('seedCity')) $('seedCity').onclick=()=>cityModal(sel);
  $('seedHome').onclick=()=>travelTo(guildId); $('seedClose').onclick=closeGlobe;
  b.querySelectorAll('[data-city]').forEach(x=>x.onclick=()=>{ const id=+x.dataset.city; SW.globe.select(id); SW.globe.focus(id); renderSeedPanel(); }); }
function applySeed(v){ v=String(v||'').trim().slice(0,40); if(!v||v===S.seed) return; if(!confirm('Switch the World Seed to "'+v+'"? This makes a different planet. Progress on "'+S.seed+'" is kept and comes back if you switch back.')) return;
  tfFinishCur(); jobs=jobs.filter(j=>j.kind!=='seed'&&j.kind!=='tf'); if(curJob&&curJob.kind==='seed'){ curJob=null; mori.path=[]; }
  TF.reset(); S.seed=v; PL.setSeed(v); guildId=PL.startRegion(); WD(); S.at=null; SW.globe.G.sel=guildId; SW.globe.build(); globeDirty=false;
  log('🌍 New World Seed "'+v+'". The Guild now stands in '+PL.regionInfo(guildId).name+'.'); const wasOpen=globeOpen; travelTo(guildId,true); if(wasOpen) openGlobe(); }

/* ---------- main loop ---------- */
let clockT=0, last=performance.now(), saveT=0, hudT=0, weedT=0, townT=0;
let mtClock=0;

function spawnBanditRaid(info){ const n=info&&info.tier==='low'?3:2; const kinds=['wolf','direrat']; const out=[];
  for(let i=0;i<n;i++){ const ang=Math.random()*Math.PI*2, d=6+Math.random()*5; const x=player.pos.x+Math.cos(ang)*d, z=player.pos.z+Math.sin(ang)*d;
    if(window.GATHERING&&GATHERING.spawnHostile){ out.push(GATHERING.spawnHostile(kinds[i%kinds.length], x, z)); }
  }
  const msg=info.tier==='low'?'Bandits raid the road — they can smell a light Guild purse ('+info.marks+' Marks).':'Bandits on the road! The Guild purse can spare a fight.';
  log('⚔ '+msg); showRoll('⚔','Bandit raid!',info.tier==='low'?'foe':''); addChat('mo',info.tier==='low'?'ack — bandits. my treasury is lean, so the roads got bold. help me push them back?':'bandits! i minted marks for the guild — let\'s keep the roads kind.'); return out; }
let phaseN=0;
function step(dt){ phaseN++; const heavy={plan:window.POWER?POWER.framePlan(phaseN):{world:true,audio:true,build:true,chunk:4,bgMs:1.5}}; if(window.TWOSPEED&&heavy.plan.bgMs!=null) TWOSPEED.budget=heavy.plan.bgMs;
  mtClock+=dt; if(window.MT&&MT.on) MT.update(mtClock); // flame frames stay on the render clock; new audio buffers do not
  clockT+=dt; updateCrafting(dt); for(const k in S.buffs){ S.buffs[k]-=dt; if(S.buffs[k]<=0) delete S.buffs[k]; } if(window.HERBAL) HERBAL.tickHots(dt); /* auto-apply salve (no roll) when HP < 40% and a salve is on the hotbar */ if(window.HERBAL&&S.hotbar&&S.hotbar.salve!==false){ const st=stats(); if(S.hp<st.maxHp*0.4&&S.hp>0&&!(S.hots&&S.hots.length)){ const sv=HERBAL.pickHotbar('salve'); if(sv) HERBAL.useHealItem(sv); } } atkCd=Math.max(0,atkCd-dt);
  if(logT>0){ logT-=dt; if(logT<=0) $('log').style.opacity=0.35; } if(rollT>0){ rollT-=dt; if(rollT<=0) $('roll').className=''; }
  // world simulation keeps running in the dungeon (Mori keeps building)
  if(mode==='world'&&window.IDLEBUILD&&heavy.plan.build) IDLEBUILD.update(dt);
  if(mode==='world'&&window.TREASURY){ const r=TREASURY.tryRaid(dt); if(r) spawnBanditRaid(r); }
  updateMori(dt);
  nodes.forEach(n=>{ if(!n.ready&&!n.claimed&&n.regrow>0){ n.regrow-=dt; if(n.regrow<=0){ n.ready=true; n.crown.visible=true; n.stump.visible=false; if(n.label) n.label.visible=true; } } });
  weedT-=dt; if(weedT<=0){ weedT=4; if(weeds.length<26) spawnWeed(); }
  built.forEach(b=>{ if(b.g.userData.crystal) b.g.userData.crystal.rotation.y+=dt; });
  if(crOpen) return;
  updatePlayer(dt); GATHERING.update(dt); CLAN.update(dt); if(mode==='world'){ NPCS.update(dt); DREADLORD.update(dt); } npcWatch();
  if(mode==='dungeon') updateDungeon(dt); else { if(heavy.plan.world) SW.update(player.pos.x,player.pos.z, heavy.plan.chunk); if(heavy.plan.build) TF.update(dt,player.pos.x,player.pos.z); if(heavy.plan.world) IMPOSTORS.update(); townT-=dt; if(townT<=0){ townT=1; setTownVisible(atGuild()); } }
  // targets
  const tg=mode==='world'?worldTargets():dungeonTargets(); curTarget=null; let bd=1e9; tg.forEach(t=>{ const d=Math.hypot(t.x-player.pos.x,t.z-player.pos.z); if(d<t.r&&d<bd){ bd=d; curTarget=t; } });
  TS.pump(); // v3.4 two-speed: foreground jobs now, background jobs inside the frame budget
  const bi=$('bInteract'); bi.textContent=document.body.classList.contains('phone')?'E':(curTarget?(IS_TOUCH?'':'E · ')+curTarget.label:'E · Interact'); bi.classList.toggle('hot',!!curTarget); bi.title=curTarget&&curTarget.tip?curTarget.tip:'';
}
function renderWorld(which){ if(!window.OCCLUSION){ renderer.render(which, camera); return; } const cx=camera.position.x, cz=camera.position.z; OCCLUSION.beginView(which, camera, player.pos.x, player.pos.z); renderer.render(which, camera); camera.position.x=cx; camera.position.z=cz; OCCLUSION.endView(which); }
function render(day){ IMPOSTORS.setLight(0.32+0.68*day);
  if(crOpen){ renderCreator(); return; }
  if(globeOpen){ [lblD,lblM,lblDoll,lblT].forEach(e=>e.style.display='none'); obeliskAnim(); SW.globe.render(renderer); return; }
  const tgt=new T.Vector3(player.pos.x, player.pos.y+1.5, player.pos.z);
  let pitch=mode==='dungeon'?Math.max(camPitch,0.95):camPitch, dist=mode==='dungeon'?Math.min(camDist,7):camDist;
  if(mode==='world'&&window.DREADLORD&&DREADLORD.camera){ const dc=DREADLORD.camera(); if(dc){ dist=Math.max(dist, dc.dist); pitch=dc.pitch; } }
  camera.position.set(tgt.x+Math.sin(camYaw)*Math.cos(pitch)*dist, tgt.y+Math.sin(pitch)*dist, tgt.z+Math.cos(camYaw)*Math.cos(pitch)*dist);
  if(mode==='world'){ const gy=W.height(camera.position.x,camera.position.z)+0.6; if(camera.position.y<gy) camera.position.y=gy; }
  camera.lookAt(tgt);
  if(window.OCCLUSION&&mode==='world'){ OCCLUSION.update(scene, camera, {heightAt:(x,z)=>W.height(x,z), far:IS_TOUCH?120:200, budget:IS_TOUCH?12:20}); const rd=$('occRead'); if(rd){ rd.style.display=OCCLUSION.stats.debug?'block':'none'; if(OCCLUSION.stats.debug) rd.textContent='cull tested '+OCCLUSION.stats.tested+' · hidden '+OCCLUSION.stats.hidden+' · hill '+OCCLUSION.stats.hill+' · box '+OCCLUSION.stats.box+' · far '+OCCLUSION.stats.far; } }
  if(mode==='world'&&TF.shake>0){ const k=TF.shake*0.35; camera.position.x+=(Math.random()-0.5)*k; camera.position.y+=(Math.random()-0.5)*k; camera.position.z+=(Math.random()-0.5)*k; } // earth rumble
  if(mode==='world'&&!atGuild()){ [lblD,lblM,lblDoll].forEach(e=>e.style.display='none'); SW.animate(clockT); renderWorld(scene); }
  else if(mode==='world'){
    // tavern: roof hides when inside; neon lights drift
    const inT=tav.userData.inside(player.pos.x,player.pos.z)||tav.userData.inside(camera.position.x,camera.position.z); tav.userData.roof.visible=!inT;
    tav.userData.lights.forEach((o,i)=>{ const a=clockT*0.5+o.ph; o.l.position.set(Math.sin(a)*3.6, 2.6+Math.sin(a*1.7)*0.6, Math.cos(a*0.8)*2.6); o.l.intensity=(7+beatPulse*8)*(0.6+0.6*(1-day)); });
    tav.userData.edge.material.emissiveIntensity=1.2+beatPulse*2; beatPulse=Math.max(0,beatPulse-0.08);
    forge.userData.fire.material.emissiveIntensity=1+Math.sin(clockT*9)*0.3+Math.sin(clockT*23)*0.15;
    doll.userData.doll.rotation.y=Math.sin(clockT*0.7)*0.4; doll.userData.doll.position.y=1.0+Math.abs(Math.sin(clockT*2))*0.04;
    obeliskAnim(); SW.animate(clockT); outpost.userData.flag.rotation.y=Math.sin(clockT*2)*0.25; alch.userData.brew.material.emissiveIntensity=0.8+Math.sin(clockT*3)*0.4; bench.userData.rune.rotation.z+=0.02;
    if(!(curJob&&curJob.kind==='forge'&&curJob.phase==='work')) forge.userData.goblin.userData.arm.rotation.x=-Math.abs(Math.sin(clockT*3))*0.9;
    HERO.animate(delroth.model,clockT,0); delroth.model.userData.hero.limbs.armR.rotation.x=-0.6-Math.sin(clockT*1.3)*0.5; delroth.model.userData.hero.limbs.armR.rotation.z=0.3;
    // labels
    const dP=delroth.model.position; const dd=Math.hypot(dP.x-player.pos.x,dP.z-player.pos.z);
    if(dd<16){ delroth.t+=1/60; if(delroth.t>7){ delroth.t=0; delroth.line=(delroth.line+1)%DELROTH_LINES.length; } project(dP,2.4*1.0,lblD,'<b>Delroth</b> <span class="small">Undead Catfolk Dread Necromancer · Lv 60 (epic)</span><br>“'+DELROTH_LINES[delroth.line]+'”'); } else lblD.style.display='none';
    project(mori.pos,2.1,lblM, S.blue?'💤 zzz…':'<b>Mori</b>'+(curJob&&!curJob.idle?' · '+jobLabel(curJob):''));
    const dl=W.STATIONS.doll; if(Math.hypot(dl.x-player.pos.x,dl.z-player.pos.z)<7) project(new T.Vector3(dl.x,0,dl.z),2.2,lblDoll,'🪆 “'+DOLL_LINES[Math.floor(clockT/6)%DOLL_LINES.length]+'”'); else lblDoll.style.display='none';
    renderWorld(scene);
  } else { [lblD,lblM,lblDoll].forEach(e=>e.style.display='none'); renderWorld(dun.scene); }
  if(curTarget){ project(new T.Vector3(curTarget.x,mode==='world'?W.height(curTarget.x,curTarget.z):0,curTarget.z),1.0,lblT,curTarget.label); } else lblT.style.display='none';
}
function obeliskAnim(){ const u=obelisk.userData; u.orb.rotation.y=clockT*0.4; u.core.rotation.y=-clockT*0.3; u.ring.position.y=2.6+Math.sin(clockT*1.5)*0.6; const f=Math.min(1,programmedCount()/40); u.core.scale.setScalar(0.6+f*0.75); }
let dayNow=1;
function frame(now){ const raw=now-last, dt=Math.min(0.05,raw/1000); last=now; const t0=performance.now(); try{ dayNow=updateSky(dt); step(dt); const t1=performance.now(); hudT-=dt; if(hudT<=0){ hudT=0.2; hud(); } saveT+=dt; if(saveT>8){ saveT=0; save(); } render(dayNow); perfFrame(raw, t1-t0, performance.now()-t0); }catch(e){ console.error(e); } requestAnimationFrame(frame); }
/* ---------- v3.4 Phase 2 modules: two-speed scheduler, gathering, South Park cards ---------- */
const TS=TWOSPEED; TS.setup({renderer, camera, scene, budget:IS_TOUCH?1.0:1.5});
GATHERING.init({ scene, SW, player, S:()=>S, mode:()=>mode, mobile:IS_TOUCH, fence:W.FENCE||20, log, showRoll, save, foeAttack, clock:()=>clockT, cur:()=>mode==='dungeon'&&dun?dun.scene:scene, target:()=>curTarget, extraWarm:()=>CLAN.extraWarm(), region:()=>PL.regionInfo(curRegion()).name });
nodes.forEach(n=>{ if(!n.rid||!GATHERING.notePlace) return; const place=n.place?(n.place+', '+PL.regionInfo(guildId).name):PL.regionInfo(guildId).name; GATHERING.notePlace({rid:n.rid, x:n.x, z:n.z, type:n.type, region:place, ready:()=>n.ready}); });
IMPOSTORS.init({ scene, SW, player, mode:()=>mode, mobile:IS_TOUCH, quality:()=>QUAL[PERF.q].name, far:()=>scene.fog.far, flowerR:()=>QUAL[PERF.q].flowerR });
QUESTS.init({ S:()=>S, log, addItem, save, rep:(f,n)=>CLAN.rep(f,n), showRoll });
NPCS.init({ scene, S:()=>S, player, mode:()=>mode, atGuild, mobile:IS_TOUCH, DAY, STATIONS:W.STATIONS, openNpc:id=>openNpc(id), hAt:(x,z)=>{ const h=W.height(x,z); return atGuild()&&tav.userData.inside(x,z)?Math.max(h,0.3):h; } });
MEMORY.init({ S:()=>S, save, log, npcName:id=>{ const d=NPCS.byId(id); return d?d.name:id; }, renderMemory:()=>renderMemory() });
LORE.init({ S:()=>S, save, log });
HERBAL.init({ S:()=>S, save, log, showRoll, stats });
STATIONS.init({ S:()=>S, save, log });
DREADLORD.init({ scene, delroth, log, showRoll });
LORE.unlockFlag('visit_guild', true); LORE.unlock('npc_mori', true);
TREASURY.init({ S:()=>S, log, mode:()=>mode });
IDLEBUILD.init({
  S:()=>S, save, log, modal, addChat, player, PL, WD:()=>WD(), STAGES, PERF,
  guildId:()=>guildId, curRegion, stageOf, seedable, advanceRegion, programmedCount,
  curJob:()=>curJob, jobs:()=>jobs,
  clearIdleJob:()=>{ if(curJob&&curJob.idle) curJob=null; },
  renderSeedPanel:()=>renderSeedPanel()
});
ensureTablet(); applyWorn(); if(window.FURNITURE) FURNITURE.build(scene); if(player.model) player.model.userData.noCull=true;
setTimeout(()=>{ if(window.DICT&&DICT.load) DICT.load().catch(()=>{}); }, 600);
voiceSetup(); $('npcBack').onclick=()=>{ endNpc(); openMoriChat(); };
if(CLAN.site) refreshFrame(); // the first frame was built before the Clan / NPCs knew the player (no-op otherwise)
addEventListener('resize',resize); resize(); hud(); updBrain();
if(S.blue){ $('bBlue').textContent='☀ Wake Mori'; }
setTownVisible(atGuild()); SW.update(player.pos.x,player.pos.z,999);
(S.jobs||[]).forEach(j=>{ if(j&&j.kind&&j.what) jobs.push({kind:j.kind,what:j.what,id:S.nid++}); });
if(!store.get(SAVE_KEY)) setTimeout(help,400);
addEventListener('beforeunload',()=>{ tfFinishCur(); save(); }); document.addEventListener('visibilitychange',()=>{ if(document.hidden){ tfFinishCur(); if(window.IDLEBUILD) IDLEBUILD.stampSeen(); save(); } else { if(window.IDLEBUILD) IDLEBUILD.stampSeen(); } });
requestAnimationFrame(frame);

/* test hook */
window.__g={ castSpellFx, placeStructure, get PLOTS(){return PLOTS;}, get guildRoads(){return guildRoads;}, get S(){return S;}, get dun(){return dun;}, W, get target(){return curTarget&&curTarget.label;}, stats, get dl(){return DELROTH_LINES[delroth.line];}, get jobs(){return jobs;}, get cur(){return curJob;}, get mode(){return mode;}, get mobs(){return mobs;}, get chests(){return chests;}, built, player, mori, camera,
  step:(sec,dt)=>{ dt=dt||0.05; for(let t=0;t<sec;t+=dt){ updateSky(dt); step(dt); } hud(); render(dayNow); }, queueJob, acceptSuggestion, openCreator, closeCreator, selectChar, enterDungeon, leaveDungeon, attack, openChest, benchUI, craftItem, lootRoll, rarity, charLevel, dollShop, outpostShop, goBlue, wakeMori, renderBar, useSlot,
  setCam:(y,p,d)=>{ camYaw=y; camPitch=p; camDist=d; }, setCr:(y,p,d,f)=>{ crYaw=y; crPitch=p; crDist=d; crFocus=f; }, teleport:(x,z)=>{ player.pos.set(x,0,z); }, CRAFT, save,
  SW, PL, get guildId(){ return guildId; }, stageOf, travelTo, openGlobe, closeGlobe, applySeed, advanceRegion, seedCandidate, programmedCount, renderSeedPanel, cityModal, get globeOpen(){ return globeOpen; }, makeSuggestion, delroth, TF, PERF, QUAL, applyQuality, perfLine, queueTF, tfSuggestion, sendChat:(v)=>{ $('chatIn').value=v; sendChat(); }, renderJobs, restAtCamp, startNow:(kind,what)=>{ if(curJob&&!curJob.plan){ if(curJob.target&&curJob.target.claimed){ curJob.target.ready=true; curJob.target.claimed=false; } curJob=null; mori.path=[]; } startJob({kind,what,id:S.nid++}); return curJob; }, dunRoomAt, armorInfo, get dunName(){ return dunName; }, renderer, scene, GA:GATHERING, IMP:IMPOSTORS, CLAN, TS, killMob, foeAttack, drink, renderBag, missing, spend, BREWS, FORGES, queueCleanse, get curRegion(){ return curRegion(); }, get dayNow(){ return dayNow; },
  NPCS, QUESTS, MORICHAT, MEMORY, LORE, DREADLORD, IDLEBUILD, TREASURY, HERBAL, STATIONS, openNpc, npcSay, endNpc, openMoriChat, get chatNpc(){ return chatNpc; }, get benchCfg(){ return benchCfg; }, set benchCfg(v){ benchCfg=v; }, benchFit, benchOrder, crafterCL, worldStats, VOICE, moriCtx, npcCoupon, chatSend:(v)=>sendChat(v), DAY, addItem, renderQuests, renderLore, renderMemory, renderPersona, playerPersona, chatEdit, chatRegen, chatPin, charLevelQ:()=>charLevel(), noteCivic, noteRoomClear, civicProfileFor, civicHTML };
})();
