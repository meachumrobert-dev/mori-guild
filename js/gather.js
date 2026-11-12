/* gather.js (v3.4, Phase 2) — gathering nodes, reagents, use-skills, monster parts, tool animation + synthesized sound, predictive warm-up.
   Nodes are placed by the world seed on a 26 m cell hash (same seed = same herbs/rocks/logs every visit). Only DEPLETION is saved:
   S.gather.dep[key] = game-time when that node regrows. Skills are Albion-style: you level what you use. D&D 3.5 SRD flavour only. */
(function(){
'use strict';
const T=THREE, TS=TWOSPEED, P=()=>window.PLANET, now=()=>performance.now();
/* ---------- reagents ---------- */
const TIER=[{n:'Poor',c:'#9d9d9d'},{n:'Common',c:'#ffffff'},{n:'Uncommon',c:'#1eff00'},{n:'Rare',c:'#2f8fff'},{n:'Epic',c:'#a335ee'}];
const REQ=[1,1,4,6,8];             // skill level needed for each tier (green ≈ level 4–5, like gear)
const RESPAWN=[45,60,90,150,240];  // game seconds until a node regrows
// id: [name, node type / family, tier, gp (SRD-ish trade value), weight lb, stack, extra]
const RDEF={
  vinca_leaf:['Vinca Leaf','herb',0,0.05,0.1,50,{sp:'vinca'}], marigold:['Marigold Petals','herb',1,0.1,0.1,50,{sp:'marigold'}], zinnia:['Zinnia Bloom','herb',1,0.2,0.1,50,{sp:'zinnia'}],
  squash_blossom:['Squash Blossom','herb',1,0.2,0.1,50,{sp:'squash'}], sunflower_seed:['Sunflower Seeds','herb',1,0.3,0.2,50,{sp:'sunflower'}], canna_root:['Canna Root','herb',2,2,0.3,40,{sp:'canna'}],
  gloomrose_thorn:['Gloomrose Thorn','herb',3,8,0.1,40,{sp:'gloomrose'}],
  /* v3.8 real-world herbal reagents */
  lavender:['Lavender','herb',1,0.2,0.1,50,{col:'#9b7ec8'}], frankincense:['Frankincense Resin','herb',2,2,0.1,40,{col:'#e8d9a8'}],
  chamomile:['Chamomile','herb',1,0.15,0.1,50,{col:'#f2e6a0'}], yarrow:['Yarrow','herb',1,0.2,0.1,50,{col:'#f5f0e0'}],
  comfrey:['Comfrey','herb',1,0.25,0.2,40,{col:'#6a8a4a'}], calendula:['Calendula','herb',1,0.2,0.1,50,{col:'#f0a020'}],
  sage:['Sage','herb',1,0.2,0.1,50,{col:'#7a9a6a'}], mint:['Mint','herb',0,0.1,0.1,50,{col:'#4fbf7a'}],
  rosemary:['Rosemary','herb',1,0.25,0.1,50,{col:'#3a6a4a'}], willow_bark:['Willow Bark','herb',1,0.3,0.2,40,{col:'#c8b090'}],
  aloe:['Aloe Leaf','herb',1,0.3,0.3,30,{col:'#6fbf6a'}], myrrh:['Myrrh Resin','herb',2,2.5,0.1,40,{col:'#8a5a2a'}],
  phoenix_ash:['Phoenix Ash','ichor',3,40,0.1,20,{col:'#ff6a20',note:'mythic'}], unicorn_tear:['Unicorn Tear','ichor',3,50,0.05,20,{col:'#e8f8ff',note:'mythic'}],
  dragon_scale_dust:['Dragon Scale Dust','scales',4,80,0.1,20,{col:'#5a8a2a',note:'mythic'}], basilisk_eye:['Basilisk Eye Jelly','ichor',3,45,0.2,10,{col:'#8aff3a',note:'mythic'}],
  zinc_ore:['Zinc Ore','ore',2,3,1,20,{col:'#a8b0a0'}], ironwood_log:['Ironwood Log','wood',3,12,2,10,{col:'#3a4a2a'}],
  iron_ore:['Iron Ore','ore',0,0.1,1,20,{col:'#a0522d'}], copper_ore:['Copper Ore','ore',1,0.5,1,20,{col:'#d9803a'}], silver_ore:['Silver Ore','ore',2,5,1,20,{col:'#e6eef5'}],
  mithral_ore:['Mithral Ore','ore',3,25,0.5,20,{col:'#8fd3ff'}], adamantine_ore:['Adamantine Ore','ore',4,60,1,10,{col:'#5b2a86'}],
  fieldstone:['Fieldstone','stone',0,0.01,2,10,{col:'#8d8a82'}], granite:['Granite Block','stone',1,0.05,3,10,{col:'#b9b2a6'}], marble:['Marble Slab','stone',2,1,3,10,{col:'#efeae2'}], obsidian:['Obsidian Shard','stone',3,4,1,20,{col:'#2a2030'}],
  deadfall:['Deadfall Branch','wood',0,0.01,2,20,{col:'#6b5236'}], oak_log:['Oak Log','wood',1,0.1,3,20,{col:'#7a5a34'}], yew_bough:['Yew Bough','wood',2,1,2,20,{col:'#9a4a2a'}], darkwood_log:['Darkwood Log','wood',3,10,1,20,{col:'#3a2a3a'}],
  rat_hide:['Dire Rat Hide','hide',0,0.2,0.5,20], rat_incisor:['Dire Rat Incisor','fang',0,0.1,0.1,50], wolf_pelt:['Wolf Pelt','hide',1,2,2,10], wolf_fang:['Wolf Fang','fang',1,0.5,0.1,50],
  lizard_hide:['Monitor Hide','hide',1,1.5,2,10], lizard_scales:['Monitor Scales','scales',1,1,0.5,50], beetle_chitin:['Fire Beetle Chitin','scales',0,0.3,1,20], fire_gland:['Fire Beetle Gland','ichor',1,1,0.2,20,{note:'glows for 1d6 days (SRD)'}],
  bone_shards:['Bone Shards','bone',0,0.05,0.5,50], grave_bone:['Grave Bone','bone',1,0.3,1,20], grave_dust:['Grave Dust','bone',2,3,0.1,50], ooze_ichor:['Gray Ooze Ichor','ichor',2,5,0.5,20,{note:'acidic'}],
  fiend_ichor:['Fiendish Ichor','ichor',3,15,0.2,20], celestial_ichor:['Celestial Ichor','ichor',3,15,0.2,20], fiend_horn:['Half-Fiend Horn','fang',3,20,0.5,10]
};
const R={}; for(const id in RDEF){ const d=RDEF[id]; R[id]=Object.assign({id, name:d[0], fam:d[1], tier:d[2], gp:d[3], wt:d[4], stack:d[5]}, d[6]||{}); }
const SKILL_OF={herb:'herbalism', ore:'mining', stone:'mining', wood:'woodcutting', part:'skinning'};
const TOOL_OF={herbalism:'sickle', mining:'pick', woodcutting:'axe', skinning:'knife'};
const SND_OF={sickle:'sickle', pick:'pick', axe:'axe', knife:'knife'};
const SKILLS=['herbalism','mining','skinning','woodcutting'];
const famGeneric={herb:'herbs', ore:'ore', wood:'timber'}; // which old generic counter a reagent can stand in for
/* ---------- biome tables ---------- */
const DENS={forest:0.7,jungle:0.7,grass:0.6,swamp:0.55,savanna:0.5,steppe:0.5,taiga:0.6,mountain:0.75,desert:0.35,tundra:0.35,snow:0.2,beach:0.25,guild:0.6};
const TYPEW={forest:[.35,.15,.1,.4],jungle:[.5,.05,.05,.4],grass:[.5,.15,.1,.25],swamp:[.6,.05,.05,.3],savanna:[.4,.15,.2,.25],steppe:[.4,.2,.2,.2],taiga:[.2,.2,.15,.45],
  mountain:[.15,.5,.25,.1],desert:[.2,.4,.4,0],tundra:[.15,.4,.45,0],snow:[0,.5,.5,0],beach:[.3,.1,.5,.1]}; // herb, ore, stone, wood
const HERBS={grass:['vinca_leaf','marigold','zinnia','sunflower_seed','squash_blossom','gloomrose_thorn','lavender','chamomile','yarrow','mint','calendula','sage','comfrey','rosemary'],forest:['vinca_leaf','zinnia','gloomrose_thorn','marigold','lavender','comfrey','willow_bark','mint','rosemary','sage'],jungle:['canna_root','vinca_leaf','zinnia','canna_root','mint','comfrey'],
  savanna:['sunflower_seed','marigold','squash_blossom','chamomile','frankincense','aloe','myrrh','calendula'],steppe:['marigold','sunflower_seed','squash_blossom','chamomile','yarrow','sage','lavender'],swamp:['gloomrose_thorn','canna_root','vinca_leaf','mint','willow_bark','comfrey'],taiga:['vinca_leaf','gloomrose_thorn','marigold','willow_bark','rosemary'],
  mountain:['vinca_leaf','gloomrose_thorn','yarrow','sage','frankincense','rosemary'],desert:['squash_blossom','sunflower_seed','frankincense','aloe','myrrh'],tundra:['vinca_leaf','yarrow'],beach:['vinca_leaf','marigold','rosemary','mint'],guild:['mint','lavender','chamomile','calendula','sage']};
const ORES={mountain:['iron_ore','copper_ore','silver_ore','zinc_ore','mithral_ore','adamantine_ore'], _:['iron_ore','copper_ore','zinc_ore','silver_ore']};
const STONES={mountain:['fieldstone','granite','marble','obsidian'],desert:['fieldstone','obsidian','marble'],taiga:['fieldstone','granite'],tundra:['fieldstone','granite'],_:['fieldstone','granite','marble']};
const WOODS={forest:['deadfall','oak_log','yew_bough','darkwood_log','ironwood_log'],jungle:['deadfall','yew_bough','darkwood_log','ironwood_log'],swamp:['deadfall','oak_log','darkwood_log'],taiga:['deadfall','yew_bough'],_:['deadfall','oak_log','ironwood_log']};
const TW=[1,0.55,0.2,0.06,0.02];
const CRIT={forest:'wolf',taiga:'wolf',grass:'wolf',steppe:'wolf',tundra:'wolf',jungle:'monitor',swamp:'monitor',savanna:'monitor',desert:'firebeetle',mountain:'firebeetle',beach:'monitor'};
/* monster parts by SRD creature type (+ specific creature, + template) */
const PARTS={ direrat:[['rat_hide',1,2],['rat_incisor',0,1]], wolf:[['wolf_pelt',1,1],['wolf_fang',1,2]], monitor:[['lizard_scales',1,3],['lizard_hide',0,1]],
  firebeetle:[['beetle_chitin',1,2],['fire_gland',0,1]], skeleton:[['bone_shards',2,4]], zombie:[['grave_bone',1,2],['bone_shards',0,2]], grayooze:[['ooze_ichor',1,2]],
  _animal:[['rat_hide',1,1]], _undead:[['bone_shards',1,3]], _ooze:[['ooze_ichor',1,1]], _vermin:[['beetle_chitin',1,1]] };
const TPL_PART={fiendish:'fiend_ichor', celestial:'celestial_ichor', halffiend:'fiend_horn', skeleton:'bone_shards', zombie:'grave_bone', undead:'grave_dust'};

let X=null; const CELL=26; const cells=new Map(); let nodes=[]; let crit=[]; const carc=[]; let lastPC=null, scanT=0, regionKey=null, dirty=true, warmT=0, depT=0;
const stats={actions:[], warm:[], cellsFg:0, cellsBg:0, drops:[]};
const G=()=>{ const s=X.S(); if(!s.gather) s.gather={t:0, skills:{herbalism:0,mining:0,skinning:0,woodcutting:0}, dep:{}}; if(!s.reag) s.reag={}; SKILLS.forEach(k=>{ if(s.gather.skills[k]==null) s.gather.skills[k]=0; }); return s.gather; };
const level=xp=>Math.min(20,1+Math.floor(Math.sqrt((xp||0)/25)));
const xpFor=l=>25*(l-1)*(l-1);
const skillLv=k=>level(G().skills[k]);
function pickW(rnd,list,wf){ let tot=0; const w=list.map(x=>{ const v=wf(x); tot+=v; return v; }); let r=rnd()*tot; for(let i=0;i<list.length;i++){ r-=w[i]; if(r<=0) return list[i]; } return list[list.length-1]; }
function pickHerb(biome, rnd){ const list=HERBS[biome]||HERBS.grass; const roll=typeof rnd==='function'?rnd:()=>Math.random(); return pickW(roll, list, id=>TW[R[id].tier]||0.2); }

/* ---------- meshes ---------- */
let grp=null, IM={}, flora=null, ring=null, beams=null, chips=null; const CAP=160;
const dm=new T.Object3D(), col=new T.Color();
function vmat(o){ return new T.MeshLambertMaterial(Object.assign({vertexColors:true},o||{})); }
function buildMeshes(){
  grp=new T.Group(); grp.name='gatherNodes'; grp.userData.sw=true; X.scene.add(grp);
  const rockG=TS.merge([TS.part(new T.IcosahedronGeometry(0.9,0),'#ffffff',0,0.35,0,0.3,0.5,0.2,1.15,0.7,0.95),TS.part(new T.IcosahedronGeometry(0.45,0),'#e8e8e8',0.85,0.15,0.35,0.8,0.1,0.4,1,0.7,1)]);
  const crysG=TS.merge([TS.part(new T.OctahedronGeometry(0.28,0),'#ffffff',0.15,0.95,0.1,0.2,0,0.3,0.7,1.6,0.7),TS.part(new T.OctahedronGeometry(0.2,0),'#ffffff',-0.35,0.8,0.25,-0.4,0,-0.2,0.7,1.5,0.7),TS.part(new T.OctahedronGeometry(0.16,0),'#ffffff',0.5,0.55,-0.3,0.5,0,0.5,0.7,1.4,0.7)]);
  const logG=TS.merge([TS.part(new T.CylinderGeometry(0.34,0.38,2.6,9),'#ffffff',0,0.34,0,0,0,Math.PI/2),TS.part(new T.CylinderGeometry(0.3,0.3,0.04,9),'#e9d3a0',1.31,0.34,0,0,0,Math.PI/2),
    TS.part(new T.CylinderGeometry(0.07,0.1,0.6,5),'#ffffff',0.3,0.62,0.18,0.5,0,0.3),TS.part(new T.CylinderGeometry(0.06,0.08,0.5,5),'#ffffff',-0.6,0.55,-0.15,-0.6,0,-0.2)]);
  const bushG=TS.merge([TS.part(new T.IcosahedronGeometry(0.5,1),'#4f8a2a',0,0.25,0,0,0,0,1.2,0.55,1.1),TS.part(new T.IcosahedronGeometry(0.32,1),'#3f7a24',0.42,0.2,0.2,0,0,0,1,0.6,1),TS.part(new T.IcosahedronGeometry(0.3,1),'#5a9a32',-0.38,0.18,-0.15,0,0,0,1,0.6,1)]);
  const mkIM=(g,m,name)=>{ const im=new T.InstancedMesh(g,m,CAP); im.count=0; im.frustumCulled=false; im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.setColorAt(0,col.set('#fff')); im.name=name; im.castShadow=!X.mobile; grp.add(im); return im; };
  IM.rock=mkIM(rockG,vmat(),'g_rock'); IM.crys=mkIM(crysG,vmat({emissive:'#222222'}),'g_crystal'); IM.log=mkIM(logG,vmat(),'g_log'); IM.bush=mkIM(bushG,vmat(),'g_bush');
  if(window.FLORA){ flora=FLORA.createSet(CAP*2); flora.meshes.forEach(m=>grp.add(m)); }
  ring=new T.Mesh(new T.TorusGeometry(1.25,0.05,6,32),new T.MeshBasicMaterial({color:'#facc15',transparent:true,opacity:0.8,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.visible=false; grp.add(ring);
  beams=new T.InstancedMesh(new T.CylinderGeometry(0.35,0.35,30,8,1,true),new T.MeshBasicMaterial({color:'#a3ff12',transparent:true,opacity:0.28,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),8); beams.count=0; beams.frustumCulled=false; grp.add(beams);
  chips=new T.InstancedMesh(new T.BoxGeometry(0.09,0.09,0.09),new T.MeshLambertMaterial({color:'#ffffff'}),48); chips.count=0; chips.frustumCulled=false; chips.userData.sw=true; chips.setColorAt(0,col.set('#fff')); grp.add(chips); chips.userData.p=[];
}
/* tools (built lazily — and pre-warmed when you approach something that needs them) */
const toolCache={};
function toolMesh(kind){ if(toolCache[kind]) return toolCache[kind]; const H='#6b4a2a', ST='#9aa3ad';
  const parts={ pick:[TS.part(new T.CylinderGeometry(0.035,0.04,0.95,6),H,0,0,0.42,Math.PI/2),TS.part(new T.ConeGeometry(0.05,0.42,5),ST,0,-0.2,0.86,Math.PI),TS.part(new T.ConeGeometry(0.05,0.3,5),ST,0,0.15,0.86)],
    sickle:[TS.part(new T.CylinderGeometry(0.03,0.035,0.38,6),H,0,0,0.15,Math.PI/2),TS.part(new T.TorusGeometry(0.2,0.025,4,12,Math.PI*1.1),ST,0,0.18,0.36,0,Math.PI/2,0)],
    axe:[TS.part(new T.CylinderGeometry(0.035,0.04,0.8,6),H,0,0,0.36,Math.PI/2),TS.part(new T.BoxGeometry(0.04,0.26,0.2),ST,0,-0.12,0.72)],
    knife:[TS.part(new T.CylinderGeometry(0.025,0.03,0.14,6),'#3a2a1a',0,0,0.06,Math.PI/2),TS.part(new T.BoxGeometry(0.012,0.05,0.26),'#d9dde2',0,0.005,0.26)] };
  const m=new T.Mesh(TS.merge(parts[kind]),vmat()); m.name='tool_'+kind; m.position.set(0.05,-0.55,0.07); m.visible=false;
  // the swing curve is precomputed too (the "animation" part of the warm-up)
  const curve=new Float32Array(64); for(let i=0;i<64;i++){ const ph=i/64; curve[i]=kind==='sickle'?Math.sin(ph*6.2832)*0.9:kind==='knife'?Math.sin(ph*12.566)*0.35:-1.6-1.0*Math.cos(ph*6.2832); }
  m.userData.curve=curve; toolCache[kind]=m; return m; }
/* icons: tiny canvas drawings per family, rarity-coloured rim */
const iconCache={};
function icon(rid){ if(iconCache[rid]) return iconCache[rid]; const r=R[rid]; const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  x.fillStyle='rgba(16,14,24,0.85)'; x.beginPath(); x.arc(32,32,30,0,7); x.fill(); x.lineWidth=4; x.strokeStyle=TIER[r.tier].c; x.stroke();
  const fc=r.col||(r.sp&&window.FLORA?FLORA.PAL[r.sp].petals[0]:null)||{hide:'#a87a4a',fang:'#f1ead2',bone:'#e8e2cc',ichor:'#7dff8f',scales:'#6f8a4a'}[r.fam]||'#ddd'; x.fillStyle=fc; x.strokeStyle='#1a1410'; x.lineWidth=2;
  const f=r.fam; x.beginPath();
  if(f==='herb'){ for(let i=0;i<6;i++){ const a=i/6*6.283; x.ellipse(32+Math.cos(a)*10,30+Math.sin(a)*10,7,4,a,0,7); } x.fill(); x.fillStyle='#4f8a2a'; x.fillRect(30,36,4,16); x.fillStyle='#f2c81c'; x.beginPath(); x.arc(32,30,5,0,7); x.fill(); }
  else if(f==='ore'||f==='stone'){ x.moveTo(14,44); x.lineTo(22,22); x.lineTo(36,16); x.lineTo(50,28); x.lineTo(48,46); x.closePath(); x.fill(); x.stroke(); if(f==='ore'){ x.fillStyle='#ffffff'; x.globalAlpha=0.6; x.fillRect(28,26,6,6); x.fillRect(38,34,4,4); x.globalAlpha=1; } }
  else if(f==='wood'){ x.fillRect(12,24,40,16); x.strokeRect(12,24,40,16); x.fillStyle='#e9d3a0'; x.beginPath(); x.ellipse(52,32,4,8,0,0,7); x.fill(); }
  else if(f==='hide'){ x.moveTo(18,18); x.quadraticCurveTo(32,10,46,18); x.lineTo(50,46); x.quadraticCurveTo(32,54,14,46); x.closePath(); x.fill(); x.stroke(); }
  else if(f==='fang'){ x.moveTo(24,14); x.quadraticCurveTo(46,22,34,52); x.quadraticCurveTo(30,30,24,14); x.fill(); x.stroke(); }
  else if(f==='bone'){ x.fillRect(22,28,20,8); [[20,28],[20,36],[44,28],[44,36]].forEach(([a,b])=>{ x.moveTo(a+5,b); x.arc(a,b,5,0,7); }); x.fill(); }
  else if(f==='ichor'){ x.moveTo(32,12); x.quadraticCurveTo(48,36,32,50); x.quadraticCurveTo(16,36,32,12); x.fill(); x.stroke(); }
  else { for(let i=0;i<3;i++){ x.moveTo(16+i*12,40); x.arc(22+i*10,40-i*6,8,Math.PI,0); } x.fill(); x.stroke(); }
  const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace; const mat=new T.SpriteMaterial({map:tex,depthWrite:false,transparent:true});
  return iconCache[rid]={c, tex, mat, url:null}; }
function iconURL(rid){ const i=icon(rid); if(!i.url) i.url=i.c.toDataURL(); return i.url; }
/* critter meshes (one merged mesh each) */
const critGeo={};
function critMesh(m){ const k=m.shape; if(!critGeo[k]){ const c=m.color, d='#2a241e', P=TS.part;
    critGeo[k]=TS.merge(k==='wolf'?[P(new T.CapsuleGeometry(0.28,0.8,4,8),c,0,0.75,0,Math.PI/2),P(new T.BoxGeometry(0.3,0.3,0.42),c,0,0.95,0.62),P(new T.ConeGeometry(0.12,0.32,6),d,0,0.9,0.95,Math.PI/2),
        P(new T.ConeGeometry(0.07,0.18,4),c,-0.1,1.17,0.58),P(new T.ConeGeometry(0.07,0.18,4),c,0.1,1.17,0.58),P(new T.CylinderGeometry(0.05,0.03,0.6,5),c,0,0.85,-0.75,-1),
        ...[[-0.15,0.4],[0.15,0.4],[-0.15,-0.4],[0.15,-0.4]].map(([x,z])=>P(new T.CylinderGeometry(0.06,0.05,0.55,5),d,x,0.28,z))]
      :k==='lizard'?[P(new T.CapsuleGeometry(0.22,1.0,4,8),c,0,0.32,0,Math.PI/2,0,0,1.3,1,0.8),P(new T.BoxGeometry(0.26,0.18,0.42),c,0,0.34,0.85),P(new T.ConeGeometry(0.12,1.1,6),c,0,0.3,-1.15,-Math.PI/2),
        ...[[-0.3,0.4],[0.3,0.4],[-0.3,-0.35],[0.3,-0.35]].map(([x,z])=>P(new T.BoxGeometry(0.28,0.08,0.1),d,x,0.18,z))]
      :[P(new T.SphereGeometry(0.4,10,8,0,Math.PI*2,0,Math.PI/2),c,0,0.18,0,0,0,0,1,0.8,1.3),P(new T.SphereGeometry(0.16,8,6),d,0,0.2,0.5),P(new T.SphereGeometry(0.07,6,6),'#ffb030',-0.18,0.3,0.15),P(new T.SphereGeometry(0.07,6,6),'#ffb030',0.18,0.3,0.15),
        ...[-0.25,0,0.25].flatMap(z=>[P(new T.BoxGeometry(0.4,0.04,0.04),d,-0.35,0.08,z,0,0,0.4),P(new T.BoxGeometry(0.4,0.04,0.04),d,0.35,0.08,z,0,0,-0.4)])]); }
  const g=new T.Group(); const mesh=new T.Mesh(critGeo[k],vmat()); mesh.castShadow=!X.mobile; g.add(mesh); g.userData.body=mesh; g.scale.setScalar(m.size); return g; }

/* ---------- placement ---------- */
function okSpot(x,z){ const SW=window.SEEDWORLD||X.SW, F=SW.F; if(SW.isVoidAt&&SW.isVoidAt(x,z)) return false; const h=SW.heightAt(x,z); if(F.seaY!=null&&h<F.seaY+0.6) return false;
  if(F.guild&&Math.abs(x)<X.fence+14&&Math.abs(z)<X.fence+14) return false; if(F.flats.some(f=>Math.hypot(x-f.x,z-f.z)<f.r0*0.95)) return false; if(F.roads.length&&SW.roadDist(x,z)<4.5) return false;
  if(F.colliders.circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+1.6)) return false; if(window.CLAN&&CLAN.blocks&&CLAN.blocks(x,z)) return false; return true; }
function genCell(ci,cj){ const SW=X.SW, F=SW.F, rnd=P().rngFor(P().seed,'gath',F.id,ci,cj), out=[]; if(F.stage<1) return out;
  for(let k=0;k<2;k++){ let x=(ci+0.12+rnd()*0.76)*CELL, z=(cj+0.12+rnd()*0.76)*CELL; const roll=rnd(), roll2=rnd(), rot=rnd()*6.283, s=0.8+rnd()*0.45; const b=F.guild&&Math.hypot(x,z)<200?'guild':SW.biomeAt(x,z);
    const B=b==='guild'?'grass':b; const dens=(DENS[b]||0.4)*(k?0.45:1)*(X.mobile?0.8:1); if(roll>dens) continue; if(!okSpot(x,z)) continue;
    const tw=TYPEW[B]||TYPEW.grass; const type=pickW(()=>roll2,['herb','ore','stone','wood'],t=>tw[['herb','ore','stone','wood'].indexOf(t)]); if(type==='wood'&&!(tw[3]>0)) continue;
    const list=(type==='herb'?HERBS[B]||HERBS.grass:type==='ore'?ORES[B]||ORES._:type==='stone'?STONES[B]||STONES._:WOODS[B]||WOODS._);
    let rid=pickW(rnd,list,id=>TW[R[id].tier]*(B==='mountain'&&R[id].fam==='ore'&&R[id].tier>=3?3:1));
    if(window.GROUNDED){
      const Gnd=GROUNDED, ctx={seed:P().seed, regionId:F.id, guild:!!F.guild, rng:P().rngFor, biomeAt:(x,z)=>SW.biomeAt(x,z), elevAt:(x,z)=>{ const d=SW.toDir(x,z); return P().elevation(d[0],d[1],d[2]); }};
      if(type==='herb'){ const hit=Gnd.flowerWeight(x,z,ctx); if(!hit) continue;
        const j=P().rngFor(P().seed,'flj',F.id,ci,cj,k); const spot=Gnd.clusterPoints(hit.node,1,j,(px,pz)=>okSpot(px,pz))[0];
        if(spot){ x=spot.x; z=spot.z; } else if(!okSpot(x,z)) continue;
        const herbBiome=b==='guild'?'guild':B; const patchRnd=P().rngFor(P().seed,'herbpatch',F.id,Math.floor(ci/2),Math.floor(cj/2)); rid=pickHerb(herbBiome, patchRnd);
        const farm=F.settlement&&F.settlement.farms&&F.settlement.farms.filter(f=>Math.hypot(f.x-x,f.z-z)<6)[0];
        if(farm&&farm.reagent&&R[farm.reagent]) rid=farm.reagent;
      } else if(type==='ore'){ const hit=Gnd.oreAt(x,z,ctx); if(!hit) continue;
        const j=P().rngFor(P().seed,'orej',F.id,ci,cj,k); const n=hit.node, along=(j()-0.5)*n.length*0.7, cross=(j()-0.5)*n.halfW*0.45;
        const c=Math.cos(n.strike), s=Math.sin(n.strike); const nx=n.x+along*c-cross*s, nz=n.z+along*s+cross*c;
        if(Gnd.inVein(n,nx,nz)&&okSpot(nx,nz)){ x=nx; z=nz; } else if(!okSpot(x,z)) continue;
        if(R[hit.rid]) rid=hit.rid;
      }
    }
    const r=R[rid];
    out.push({key:window.GROUNDED?GROUNDED.gatherKey(P().seed,F.id,ci,cj,k):P().seed+'|'+F.id+'|'+ci+','+cj+'|'+k, x, z, y:SW.heightAt(x,z), type, rid, tier:r.tier, req:REQ[r.tier], rot, s, sp:r.sp?FLORA.code(r.sp):-1}); }
  // critters (a few per region, by biome)
  const cr=P().rngFor(P().seed,'crit',F.id,ci,cj); if(cr()<(X.mobile?0.045:0.06)){ const x=(ci+0.5)*CELL+(cr()-0.5)*10, z=(cj+0.5)*CELL+(cr()-0.5)*10; const b=SW.biomeAt(x,z); const kind=CRIT[b];
    if(kind&&okSpot(x,z)&&!(F.guild&&Math.hypot(x,z)<90)) out.crit={key:'c|'+P().seed+'|'+F.id+'|'+ci+','+cj, kind, x, z}; }
  return out; }
function cellDist(ci,cj,px,pz){ return Math.hypot((ci+0.5)*CELL-px,(cj+0.5)*CELL-pz); }
function stream(px,pz,face,force){ const RANGE=X.mobile?72:96; const F=X.SW.F; const rk=P().seed+'|'+F.id+'|'+F.stage; if(rk!==regionKey){ clearAll(); regionKey=rk; }
  if(!force&&lastPC&&Math.hypot(px-lastPC[0],pz-lastPC[1])<3) return; lastPC=[px,pz];
  const c0=Math.floor((px-RANGE)/CELL), c1=Math.floor((px+RANGE)/CELL), r0=Math.floor((pz-RANGE)/CELL), r1=Math.floor((pz+RANGE)/CELL); const fx=Math.sin(face), fz=Math.cos(face);
  for(let i=c0;i<=c1;i++) for(let j=r0;j<=r1;j++){ const k=i+','+j; if(cells.has(k)) continue; const d=cellDist(i,j,px,pz); if(d>RANGE) continue;
    const dot=d>1?(((i+0.5)*CELL-px)*fx+((j+0.5)*CELL-pz)*fz)/d:1;
    if(d<34||(d<62&&dot>0.55)){ cells.set(k,addCell(i,j)); stats.cellsFg++; } // foreground: right now
    else { cells.set(k,null); TS.bg(()=>{ if(cells.get(k)===null&&regionKey===rk){ cells.set(k,addCell(i,j)); stats.cellsBg++; } },'gc:'+rk+':'+k); } } // background: a few per frame
  for(const [k,c] of cells){ const [i,j]=k.split(',').map(Number); if(cellDist(i,j,px,pz)>RANGE+40){ if(c) dropCell(c); cells.delete(k); } }
}
function addCell(i,j){ const list=genCell(i,j); list.forEach(n=>nodes.push(n)); if(list.crit) spawnCrit(list.crit); dirty=true; return list; }
function dropCell(list){ const s=new Set(list); nodes=nodes.filter(n=>!s.has(n)); if(list.crit){ const c=crit.find(q=>q.key===list.crit.key); if(c&&!carc.some(k=>k.mob===c)) removeCrit(c); } dirty=true; }
function clearAll(){ cells.clear(); nodes=[]; crit.slice().forEach(c=>removeCrit(c)); crit=[]; for(let i=carc.length-1;i>=0;i--) if(!carc[i].inDun){ X.scene.remove(carc[i].g); carc.splice(i,1); } lastPC=null; dirty=true; beamsFor([]); }
const ready=n=>{ const d=G().dep[n.key]; return !(d>G().t); };
function rebuild(){ if(!grp) return; dirty=false; const cnt={rock:0,crys:0,log:0,bush:0}; const fl=[];
  for(const n of nodes){ const rd=ready(n); const y=n.y;
    if(n.type==='ore'||n.type==='stone'){ const k=cnt.rock++; if(k>=CAP) continue; const s=n.s*(rd?1:0.5); dm.position.set(n.x,y-0.1,n.z); dm.rotation.set(0,n.rot,0); dm.scale.set(s,s*(rd?1:0.6),s); dm.updateMatrix(); IM.rock.setMatrixAt(k,dm.matrix);
      IM.rock.setColorAt(k,col.set(n.type==='stone'?R[n.rid].col:'#8b857c').multiplyScalar(rd?1:0.6));
      if(n.type==='ore'&&rd){ const q=cnt.crys++; if(q<CAP){ IM.crys.setMatrixAt(q,dm.matrix); IM.crys.setColorAt(q,col.set(R[n.rid].col)); } } }
    else if(n.type==='wood'){ const k=cnt.log++; if(k>=CAP) continue; const s=n.s*(rd?1:0.45); dm.position.set(n.x,y-0.05,n.z); dm.rotation.set(0,n.rot,0); dm.scale.set(s,rd?n.s:n.s*0.6,rd?n.s:n.s*0.6); dm.updateMatrix(); IM.log.setMatrixAt(k,dm.matrix); IM.log.setColorAt(k,col.set(R[n.rid].col).multiplyScalar(rd?1:0.55)); }
    else { const k=cnt.bush++; if(k>=CAP) continue; const s=n.s*(rd?1:0.6); dm.position.set(n.x,y-0.05,n.z); dm.rotation.set(0,n.rot,0); dm.scale.set(s,s,s); dm.updateMatrix(); IM.bush.setMatrixAt(k,dm.matrix); IM.bush.setColorAt(k,col.set(rd?'#ffffff':'#8a6a3a'));
      if(rd&&n.sp>=0){ for(let q=0;q<5;q++){ const a=n.rot+q*1.257, rr=0.25+(q%2)*0.3; fl.push([n.x+Math.cos(a)*rr,y+0.12,n.z+Math.sin(a)*rr,n.sp,q%2,1.35*n.s,(q*0.137+n.rot*0.1)%1]); } } } }
  for(const k in cnt){ const im=IM[k]; im.count=Math.min(CAP,cnt[k]); im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; im.visible=im.count>0; }
  if(flora) flora.set(fl); }
/* ---------- critters ---------- */
function spawnCrit(c){ if(crit.some(q=>q.key===c.key)) return; const dd=G().dep[c.key]; if(dd>G().t) return; if(crit.length>=(X.mobile?5:8)) return;
  const m=SRD.makeMonster(c.kind); const g=critMesh(m); TS.warm('crit:'+c.kind,false); g.position.set(c.x,X.SW.heightAt(c.x,c.z),c.z); g.name='critter_'+c.kind; g.userData.sw=true; X.scene.add(g);
  crit.push({key:c.key, kind:c.kind, m, g, x:c.x, z:c.z, hx:c.x, hz:c.z, alive:true, ag:false, cd:1.5, hit:0, wt:0, tx:c.x, tz:c.z, critter:true, room:-1}); }
function removeCrit(c){ X.scene.remove(c.g); const i=crit.indexOf(c); if(i>=0) crit.splice(i,1); }
function updateCrit(dt){ const p=X.player.pos; for(const c of crit){ if(!c.alive) continue; const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz);
    if(!c.ag&&(c.hit>0||(c.kind==='wolf'&&d<4.5))) c.ag=true; if(c.ag&&d>26) c.ag=false;
    const reach=c.m.size*0.6+0.9; let mx=0, mz=0, sp=0;
    if(c.ag&&d>reach){ mx=dx/d; mz=dz/d; sp=c.m.speed; }
    else if(!c.ag){ c.wt-=dt; if(c.wt<=0){ c.wt=3+Math.random()*4; c.tx=c.hx+(Math.random()-0.5)*12; c.tz=c.hz+(Math.random()-0.5)*12; } const ex=c.tx-c.x, ez=c.tz-c.z, ed=Math.hypot(ex,ez); if(ed>0.5){ mx=ex/ed; mz=ez/ed; sp=c.m.speed*0.25; } }
    if(sp){ c.x+=mx*sp*dt; c.z+=mz*sp*dt; c.g.rotation.y=Math.atan2(mx,mz); }
    c.g.position.set(c.x,X.SW.heightAt(c.x,c.z)+(sp?Math.abs(Math.sin(X.clock()*10))*0.05:0),c.z); if(c.hit>0){ c.hit-=dt; c.g.scale.setScalar(c.m.size*(1+c.hit)); } else c.g.scale.setScalar(c.m.size);
    c.cd-=dt; if(c.ag&&d<=reach+0.2&&c.cd<=0){ c.cd=1.8; X.foeAttack(c); } } }
/* ---------- carcasses + skinning ---------- */
function addCarcass(mob,inDun){ const g=mob.g; g.visible=true; g.rotation.z=1.45; g.position.y=(inDun?0:X.SW.heightAt(mob.x,mob.z))+mob.m.size*0.35; const c={x:mob.x, z:mob.z, mob, g, t:0, life:(X.S().buffs&&X.S().buffs.repose>0?960:240), inDun:!!inDun, skinned:false};
  carc.push(c); if(mob.critter){ G().dep[mob.key]=G().t+300; } TS.warm('tool:knife',true); return c; }
function partsFor(m){ const base=PARTS[m.kind]||PARTS['_'+m.type]||PARTS._animal; const out=base.map(([id,a,b])=>[id,a+Math.floor(Math.random()*(b-a+1))]);
  if(m.tmpl&&TPL_PART[m.tmpl]) out.push([TPL_PART[m.tmpl],1]); if(m.boss) out.forEach(o=>o[1]+=1); return out.filter(o=>o[1]>0); }
function clearDungeon(){ for(let i=carc.length-1;i>=0;i--) if(carc[i].inDun) carc.splice(i,1); }
/* ---------- the gather action ---------- */
let act=null;
function begin(o){ if(act) return false; const t0=now(); const sk=o.skill, kind=TOOL_OF[sk], key='tool:'+kind; const warmHit=TS.isWarm(key); if(!warmHit) TS.warm(key,true);
  const tool=toolMesh(kind); const U=X.player.model&&X.player.model.userData.hero; if(U&&U.limbs.armR){ if(tool.parent!==U.limbs.armR) U.limbs.armR.add(tool); tool.visible=true; if(U.staff) U.staff.visible=false; }
  const lv=skillLv(sk); const dur=(o.dur||1.3)*Math.max(0.6,1-0.03*(lv-1));
  X.player.face=Math.atan2(o.x-X.player.pos.x,o.z-X.player.pos.z);
  act=Object.assign(o,{kind, tool, t:0, dur, hits:0, warmHit, setupMs:+(now()-t0).toFixed(3), sx:X.player.pos.x, sz:X.player.pos.z, lastPh:0});
  stats.actions.push({skill:sk, kind, warmHit, setupMs:act.setupMs, rid:o.rid||null}); if(stats.actions.length>40) stats.actions.shift(); return true; }
function endTool(){ if(!act) return; act.tool.visible=false; const U=X.player.model&&X.player.model.userData.hero; if(U&&U.staff) U.staff.visible=true; }
function gather(n){ if(act) return; const sk=SKILL_OF[n.type]; const lv=skillLv(sk); const r=R[n.rid];
  if(!ready(n)){ X.log('⏳ '+r.name+' regrows in '+Math.ceil(G().dep[n.key]-G().t)+'s.'); return; }
  if(lv<n.req){ X.log('🔒 '+r.name+' needs '+cap(sk)+' '+n.req+' (you are '+lv+'). Gather '+TIER[Math.max(0,r.tier-1)].n.toLowerCase()+' nodes to level up.'); return; }
  begin({what:'node', n, skill:sk, rid:n.rid, x:n.x, z:n.z, dur:1.2+r.tier*0.3}); }
function skin(c){ if(act||c.skinned) return; begin({what:'carcass', c, skill:'skinning', x:c.x, z:c.z, dur:1.0+(c.mob.m.boss?0.8:0)}); }
function finish(){ const a=act; endTool(); act=null; const g=G(); const sk=a.skill; const lv0=skillLv(sk); let gained=[];
  if(a.what==='node'){ const n=a.n, r=R[n.rid]; let q=1+Math.floor((lv0-1)/3)+(Math.random()<0.12+0.04*lv0?1:0)+(n.type==='herb'&&X.S().buffs&&X.S().buffs.weedwake>0?1:0);
    addReag(n.rid,q); gained.push([n.rid,q]); if(n.type==='herb'&&window.HERBAL) HERBAL.onGather(n.rid); if(n.type==='ore'&&Math.random()<0.3){ addReag('fieldstone',1); gained.push(['fieldstone',1]); }
    g.dep[n.key]=g.t+RESPAWN[n.tier]; g.skills[sk]+=8+n.tier*14; dirty=true; burst(n.x,n.y+0.5,n.z,r.col||'#6fbf3a'); }
  else { const c=a.c, m=c.mob.m; c.skinned=true; c.life=Math.min(c.life,2.5); let ruined=[];
    partsFor(m).forEach(([id,q])=>{ const r=R[id]; if(lv0<REQ[r.tier]){ ruined.push(r.name); return; } q+=Math.floor((lv0-1)/4); addReag(id,q); gained.push([id,q]); });
    g.skills.skinning+=6+(m.xp||1)*5; if(ruined.length) X.log('🔪 You ruin the '+ruined.join(', ')+' — needs higher Skinning.'); stats.drops.push({mob:m.name, parts:gained.map(x=>x.join('×'))}); burst(c.x,(c.inDun?0:X.SW.heightAt(c.x,c.z))+0.4,c.z,'#8a1a1a'); }
  const lv1=skillLv(sk); gained.forEach(([id],i)=>popIcon(id,a.x,a.z,i)); TS.SFX.play('pop',1,0.6);
  X.log((a.what==='node'?({herbalism:'🌿',mining:'⛏',woodcutting:'🪓'})[sk]:'🔪')+' '+cap(sk)+': '+gained.map(([id,q])=>'+'+q+' '+R[id].name+' ('+TIER[R[id].tier].n+')').join(', ')+(gained.length?'':'nothing usable')+' · '+cap(sk)+' '+lv1+' ('+g.skills[sk]+'/'+xpFor(lv1+1)+' xp)');
  if(lv1>lv0) X.showRoll(lv1,'⬆ '+cap(sk)+' is now level '+lv1+(REQ.indexOf(lv1)>0?' — you can gather '+TIER[REQ.indexOf(lv1)].n.toLowerCase()+' nodes now':''),'crit');
  X.save(); }
function addReag(id,q){ const s=X.S(); s.reag[id]=(s.reag[id]||0)+q; }
const cap=s=>s[0].toUpperCase()+s.slice(1);
/* chips + floating icons */
const pops=[];
function burst(x,y,z,c){ for(let i=0;i<10;i++) chips.userData.p.push({x,y,z,vx:(Math.random()-0.5)*3,vy:2+Math.random()*2.5,vz:(Math.random()-0.5)*3,t:0.9,c}); if(chips.userData.p.length>48) chips.userData.p.splice(0,chips.userData.p.length-48); }
function popIcon(rid,x,z,i){ const ic=icon(rid); const s=new T.Sprite(ic.mat); const y=(X.mode()==='dungeon'?0:X.SW.heightAt(x,z)); s.position.set(x+(i-0.5)*0.7,y+1.6,z); s.scale.set(0.8,0.8,1); s.renderOrder=10; s.userData.sw=true; X.cur().add(s); pops.push({s,t:0,y0:y+1.6,par:X.cur()}); }
/* ---------- predictive warm-up: what you face or approach gets its tool, sound and icons ready ---------- */
function warmScan(){ const p=X.player.pos, fx=Math.sin(X.player.face), fz=Math.cos(X.player.face);
  const cand=[]; nodes.forEach(n=>{ const d=Math.hypot(n.x-p.x,n.z-p.z); if(d<40) cand.push({d,x:n.x,z:n.z,keys:['tool:'+TOOL_OF[SKILL_OF[n.type]],'icon:'+n.rid]}); });
  crit.forEach(c=>{ const d=Math.hypot(c.x-p.x,c.z-p.z); if(d<40) cand.push({d,x:c.x,z:c.z,keys:['crit:'+c.kind,'tool:knife'].concat(partsFor(c.m).map(q=>'icon:'+q[0]))}); });
  carc.forEach(c=>{ const d=Math.hypot(c.x-p.x,c.z-p.z); if(d<40) cand.push({d,x:c.x,z:c.z,keys:['tool:knife'].concat((PARTS[c.mob.m.kind]||[]).map(q=>'icon:'+q[0]))}); });
  (X.extraWarm?X.extraWarm():[]).forEach(e=>{ const d=Math.hypot(e.x-p.x,e.z-p.z); if(d<40) cand.push({d,x:e.x,z:e.z,keys:e.keys}); });
  cand.forEach(c=>{ const dot=c.d>0.5?((c.x-p.x)*fx+(c.z-p.z)*fz)/c.d:1; const fore=c.d<6||(c.d<16&&dot>0.6);
    c.keys.forEach(k=>{ if(TS.isWarm(k)) return; if(TS.warm(k,fore)&&stats.warm.length<200) stats.warm.push({k,fore,d:+c.d.toFixed(1)}); }); }); }
function registerWarm(){ ['pick','sickle','axe','knife'].forEach(k=>TS.register('tool:'+k,()=>({objs:[(()=>{ const m=toolMesh(k).clone(); m.visible=true; return m; })()], sfx:[SND_OF[k],'pop']})));
  for(const id in R) TS.register('icon:'+id,()=>{ const i=icon(id); return {tex:[i.tex], objs:[new T.Sprite(i.mat)]}; });
  ['wolf','monitor','firebeetle','direrat','skeleton','zombie','grayooze'].forEach(k=>TS.register('crit:'+k,()=>{ const m=SRD.makeMonster(k); return {objs:(['wolf','monitor','firebeetle'].includes(k)?[critMesh(m)]:[]), sfx:['knife']}; })); }
/* ---------- per-frame ---------- */
function update(dt){ if(!X) return; const g=G(); g.t+=dt; const mode=X.mode();
  if(mode==='world'){ stream(X.player.pos.x,X.player.pos.z,X.player.face); if(dirty) rebuild(); updateCrit(dt); grp.visible=true; }
  else if(grp) grp.visible=false;
  depT-=dt; if(depT<=0){ depT=1; for(const k in g.dep){ if(g.dep[k]<=g.t){ delete g.dep[k]; dirty=true; } } }
  warmT-=dt; if(warmT<=0){ warmT=0.1; warmScan(); }
  // action animation (runs after HERO.animate in game.js, so it overrides the walk swing)
  if(act){ act.t+=dt; const U=X.player.model&&X.player.model.userData.hero; const arm=U&&U.limbs.armR; const per=act.kind==='knife'?0.45:act.kind==='sickle'?0.5:0.6; const ph=(act.t%per)/per; const cv=act.tool.userData.curve;
    if(arm){ const v=cv[Math.floor(ph*63)]; if(act.kind==='sickle'){ arm.rotation.x=-1.1; arm.rotation.z=v; } else if(act.kind==='knife'){ arm.rotation.x=-0.9+v; X.player.model.position.y-=0.22; } else { arm.rotation.x=v; arm.rotation.z=0; } }
    const hitPh=act.kind==='sickle'?0.25:0.5; if(act.lastPh<hitPh&&ph>=hitPh){ act.hits++; TS.SFX.play(SND_OF[act.kind],0.92+Math.random()*0.16); if(act.what==='node') burst(act.x,act.n.y+0.4,act.z,R[act.rid].col||'#5f9a2a'); }
    act.lastPh=ph; if(Math.hypot(X.player.pos.x-act.sx,X.player.pos.z-act.sz)>1.2){ X.log('Gathering interrupted — you moved.'); endTool(); act=null; } else if(act.t>=act.dur) finish(); }
  // chips + icons + carcasses + beams
  const cp=chips.userData.p; let k=0; for(let i=cp.length-1;i>=0;i--){ const q=cp[i]; q.t-=dt; if(q.t<=0){ cp.splice(i,1); continue; } q.vy-=9.8*dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; }
  cp.forEach(q=>{ dm.position.set(q.x,q.y,q.z); dm.rotation.set(q.t*7,q.t*5,0); dm.scale.setScalar(1); dm.updateMatrix(); chips.setMatrixAt(k,dm.matrix); chips.setColorAt(k,col.set(q.c)); k++; });
  if(chips.parent!==X.cur()) X.cur().add(chips); chips.count=k; chips.instanceMatrix.needsUpdate=true; if(chips.instanceColor) chips.instanceColor.needsUpdate=true;
  for(let i=pops.length-1;i>=0;i--){ const o=pops[i]; o.t+=dt; o.s.position.y=o.y0+o.t*0.9; o.s.material.opacity=1; if(o.t>1.6){ o.par.remove(o.s); pops.splice(i,1); } }
  for(let i=carc.length-1;i>=0;i--){ const c=carc[i]; c.t+=dt; if(c.skinned) c.g.position.y-=dt*0.3; if(c.t>c.life){ if(c.inDun) c.g.visible=false; else { X.scene.remove(c.g); const ci=crit.indexOf(c.mob); if(ci>=0) crit.splice(ci,1); } carc.splice(i,1); } }
  if(ring){ const t=X.target&&X.target(); ring.visible=!!(t&&t.gnode&&mode==='world'); if(ring.visible){ ring.position.set(t.x,t.gnode.y+0.08,t.z); ring.scale.setScalar(1+Math.sin(X.clock()*5)*0.06); } }
  if(beams&&beams.count){ beams.material.opacity=0.2+Math.sin(X.clock()*3)*0.08; }
}
/* targets offered to game.js (E / tap) */
function targets(){ const out=[]; if(!X||X.mode()==='globe') return out; const p=X.player.pos;
  if(X.mode()==='world') nodes.forEach(n=>{ const d=Math.abs(n.x-p.x)+Math.abs(n.z-p.z); if(d>6) return; const r=R[n.rid], sk=SKILL_OF[n.type], lv=skillLv(sk), rd=ready(n);
    const verb={herb:'🌿 Pick',ore:'⛏ Mine',stone:'⛏ Quarry',wood:'🪓 Chop'}[n.type];
    out.push({x:n.x,z:n.z,r:2.4,gnode:n,label:!rd?'⏳ '+r.name+' (regrows in '+Math.ceil(G().dep[n.key]-G().t)+'s)':lv<n.req?'🔒 '+r.name+' — '+cap(sk)+' '+n.req+' (you '+lv+')':verb+' '+r.name+' · '+TIER[r.tier].n,act:()=>gather(n)}); });
  carc.forEach(c=>{ if(c.skinned) return; if(Math.abs(c.x-p.x)+Math.abs(c.z-p.z)>6) return; if(c.inDun!==(X.mode()==='dungeon')) return; out.push({x:c.x,z:c.z,r:2.3,label:'🔪 Skin the '+c.mob.m.name+' (Skinning '+skillLv('skinning')+')',act:()=>skin(c)}); });
  return out; }
/* ---------- Mori: where is stuff, gather runs ---------- */
const DIRS=['north','north-east','east','south-east','south','south-west','west','north-west'];
function dirTo(dx,dz){ const a=Math.atan2(dx,-dz); return DIRS[(Math.round(a/(Math.PI/4))+8)%8]; }
function famOf(word){ return /herb|flower|plant|petal|leaf|root|thorn/.test(word)?'herb':/ore|metal|iron|copper|silver|mithral|adamant/.test(word)?'ore':/stone|rock|granite|marble|obsidian/.test(word)?'stone':/wood|log|timber|tree|branch/.test(word)?'wood':null; }
function reagentMention(word){ const t=String(word||'').toLowerCase(); let best=null;
  for(const id in R){ const name=R[id].name.toLowerCase(), spaced=id.replace(/_/g,' ');
    if(t.includes(name)||t.includes(spaced)){ if(!best||name.length>best.name.length) best=R[id]; } }
  return best; }
function biomesFor(id){ const fam=R[id]&&R[id].fam; const table=fam==='herb'?HERBS:fam==='ore'?ORES:fam==='stone'?STONES:fam==='wood'?WOODS:null; const out=[];
  if(!table) return out; for(const b in table) if(b!=='_'&&b!=='guild'&&table[b].indexOf(id)>=0) out.push(b); return out; }
function whereNamed(word){ const r=reagentMention(word); if(!r) return null;
  const nodeType=['herb','ore','stone','wood'].includes(r.fam)?r.fam:null;
  const bios=biomesFor(r.id); const whereBio=bios.length?(window.ENGLISH?ENGLISH.oxford(bios.slice(0,4)):bios.slice(0,4).join(', ')):'no listed biome';
  if(!nodeType) return r.name.toLowerCase()+' is not something you pick off the ground.';
  const meadow=!!(X&&nodes.some(n=>n.rid===r.id&&Math.hypot(n.x,(n.z||0)-39)<22));
  const meadowBit=meadow?' a patch of it is in the guild meadow.':'';
  if(!X||X.mode()!=='world') return 'i have not looked at the ground. the gather list allows '+r.name.toLowerCase()+' in '+whereBio+'.'+meadowBit;
  const p=X.player.pos; const ls=nodes.filter(n=>n.type===nodeType&&n.rid===r.id&&ready(n)).map(n=>({n,d:Math.hypot(n.x-p.x,n.z-p.z)})).sort((a,b)=>a.d-b.d);
  if(!ls.length) return 'i don\'t see '+r.name.toLowerCase()+' loaded around you. the gather list allows it in '+whereBio+'.'+meadowBit;
  return r.name.toLowerCase()+' is '+Math.round(ls[0].d)+' m '+dirTo(ls[0].n.x-p.x,ls[0].n.z-p.z)+'. the gather list also allows it in '+whereBio+'.'+meadowBit; }
function where(word){ const t=famOf(word); if(!t) return null; const p=X.player.pos; if(X.mode()!=='world') return 'we are underground. i can only smell rocks. go outside first!';
  const ls=nodes.filter(n=>n.type===t&&ready(n)).map(n=>({n,d:Math.hypot(n.x-p.x,n.z-p.z)})).sort((a,b)=>a.d-b.d);
  if(!ls.length) return 'i don\'t see any '+(t==='herb'?'herbs':t)+' near here. try another region — '+(t==='ore'?'mountains have the good ore.':t==='herb'?'grass and jungle have lots of flowers.':'forests have logs.');
  const sk=SKILL_OF[t], lv=skillLv(sk); const ok=ls.find(q=>q.n.req<=lv), best=ls.slice().sort((a,b)=>b.n.tier-a.n.tier)[0];
  let s=ok?'there is '+R[ok.n.rid].name.toLowerCase()+' '+Math.round(ok.d)+' m '+dirTo(ok.n.x-p.x,ok.n.z-p.z)+' of you.':'';
  if(best&&best.n.tier>(ok?ok.n.tier:-1)) s+=' and '+R[best.n.rid].name.toLowerCase()+' ('+TIER[best.n.tier].n.toLowerCase()+') '+Math.round(best.d)+' m '+dirTo(best.n.x-p.x,best.n.z-p.z)+(best.n.req>lv?' — you need '+sk+' '+best.n.req+', you are '+lv+'.':'!');
  return s.trim()+' say "gather run" and i light the way.'; }
let run=null;
function planRun(word){ const t=famOf(word||'')||null; if(X.mode()!=='world') return 'gather runs are outside. come up first!'; const p=X.player.pos;
  let pool=nodes.filter(n=>ready(n)&&(!t||n.type===t)&&n.req<=skillLv(SKILL_OF[n.type])); if(!pool.length) return 'nothing ready that you can gather here. maybe come back when it regrows?';
  const pick=[]; let cx=p.x, cz=p.z; for(let i=0;i<4&&pool.length;i++){ pool.sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz)); const n=pool.shift(); pick.push(n); cx=n.x; cz=n.z; }
  run={nodes:pick, t:180}; beamsFor(pick); const tot=pick.reduce((s,n,i)=>s+Math.hypot(n.x-(i?pick[i-1].x:p.x),n.z-(i?pick[i-1].z:p.z)),0);
  return 'gather run! '+pick.map(n=>R[n.rid].name.toLowerCase()).join(' → ')+'. about '+Math.round(tot)+' m. follow the green lights.'; }
function beamsFor(list){ if(!beams) return; beams.count=0; list.forEach((n,i)=>{ dm.position.set(n.x,n.y+14,n.z); dm.rotation.set(0,0,0); dm.scale.setScalar(1); dm.updateMatrix(); beams.setMatrixAt(i,dm.matrix); beams.count=i+1; }); beams.instanceMatrix.needsUpdate=true; }
function suggest(){ if(!X||X.mode()!=='world'||!nodes.length) return null; const c={}; nodes.forEach(n=>{ if(ready(n)) c[n.type]=(c[n.type]||0)+1; }); const top=Object.keys(c).sort((a,b)=>c[b]-c[a])[0]; if(!top) return null;
  return 'this place has '+c[top]+' '+({herb:'herb patches',ore:'ore veins',stone:'stone outcrops',wood:'fallen logs'})[top]+' nearby. want a '+({herb:'herb',ore:'mining',stone:'quarry',wood:'wood'})[top]+' run? say "gather run".'; }
/* ---------- crafting hooks: reagents as required/optional components ---------- */
function count(key){ const s=X.S(); if(key.startsWith('r:')) return s.reag[key.slice(2)]||0; if(key.startsWith('f:')){ const f=key.slice(2); let n=0; for(const id in s.reag) if(R[id]&&R[id].fam===f) n+=s.reag[id]; return n; } return 0; }
function stand(k){ let n=0; const s=X.S(); for(const id in s.reag){ const r=R[id]; if(r&&famGeneric[r.fam]===k) n+=s.reag[id]; } return n; } // reagents that can stand in for a generic counter
function spendKey(key,n){ const s=X.S(); if(key.startsWith('r:')){ s.reag[key.slice(2)]-=n; return; } const f=key.startsWith('f:')?key.slice(2):null;
  const ids=Object.keys(s.reag).filter(id=>R[id]&&(f?R[id].fam===f:famGeneric[R[id].fam]===key)).sort((a,b)=>R[a].tier-R[b].tier); for(const id of ids){ const t=Math.min(n,s.reag[id]); s.reag[id]-=t; n-=t; if(!n) break; } }
function clean(){ const s=X.S(); for(const id in s.reag) if(!(s.reag[id]>0)) delete s.reag[id]; }
function weight(){ const s=X.S(); let w=0; for(const id in s.reag) if(R[id]) w+=s.reag[id]*R[id].wt; return Math.round(w*10)/10; }
function bagHTML(){ const s=X.S(); const ids=Object.keys(s.reag).filter(id=>s.reag[id]>0&&R[id]).sort((a,b)=>R[b].tier-R[a].tier||R[a].fam.localeCompare(R[b].fam));
  let h='<div class="sec">Reagents ('+ids.reduce((n,id)=>n+s.reag[id],0)+' · '+weight()+' lb)</div><div class="small">'+SKILLS.map(k=>cap(k)+' <b>'+skillLv(k)+'</b> <span style="opacity:.7">('+G().skills[k]+'/'+xpFor(skillLv(k)+1)+')</span>').join(' · ')+'</div>';
  h+=ids.length?ids.map(id=>{ const r=R[id], n=s.reag[id], st=Math.ceil(n/r.stack); return '<div class="q"><span><img src="'+iconURL(id)+'" width="22" height="22" style="vertical-align:middle"> <span style="color:'+TIER[r.tier].c+'">'+r.name+'</span> ×'+n+' <span class="small">'+TIER[r.tier].n+' · '+r.fam+' · stack '+r.stack+(st>1?' ('+st+' stacks)':'')+' · '+(Math.round(n*r.wt*10)/10)+' lb · '+fmtGp(r.gp)+' ea'+(r.note?' · '+r.note:'')+'</span></span><button data-rsell="'+id+'" title="SRD: trade goods sell at full price">Sell '+fmtGp(r.gp*n)+'</button></div>'; }).join(''):'<div class="small">No reagents yet. Walk out of town: ⛏ rocks, 🌿 herb patches, 🪓 fallen logs, and 🔪 skin what you defeat.</div>';
  return h; }
function fmtGp(g){ return g>=1?(Math.round(g*10)/10)+' gp':g>=0.1?Math.round(g*10)+' sp':Math.max(1,Math.round(g*100))+' cp'; }
function sell(id){ const s=X.S(); const n=s.reag[id]||0; if(!n) return 0; const g=Math.round(R[id].gp*n); delete s.reag[id]; s.gold+=g; return g; }

window.GATHERING={ R, TIER, REQ, RESPAWN, SKILLS, PARTS, CELL, HERBS, ORES, WOODS,
  init(o){ X=o; G(); buildMeshes(); registerWarm(); },
  update, targets, gather, skin, addCarcass, clearDungeon, partsFor, where, whereNamed, reagentMention, biomesFor, pickHerb, planRun, suggest, count, stand, spendKey, clean, weight, bagHTML, sell, iconURL, skillLv, level, xpFor,
  spawnHostile(kind,x,z){ try{ const m=SRD.makeMonster(kind); const g=critMesh(m); g.position.set(x,X.SW.heightAt(x,z),z); g.name='raid_'+kind; g.userData.sw=true; X.scene.add(g);
      const c={key:'raid_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), kind, m, g, x, z, hx:x, hz:z, alive:true, ag:true, cd:0.8, hit:0, wt:0, tx:x, tz:z, critter:true, room:-1, raid:true}; crit.push(c); return c; }catch(e){ return null; } },
  get nodes(){ return nodes; }, get crit(){ return crit; }, get carc(){ return carc; }, get act(){ return act; }, get run(){ return run; }, stats, ready, toolMesh,
  refresh(){ lastPC=null; regionKey=null; }, get cells(){ return cells; }, critMesh, genCell };
})();
