/* HeroLock — geometry character builder (head + body) for Mori Guild 3D.
   Everything is built from three.js primitives: no external models needed. */
(function(){
'use strict';
const T = THREE;
const MC = {};
function M(color, o){ o=o||{}; const k=color+'|'+(o.e||'')+'|'+(o.ei||0)+'|'+(o.op||1)+'|'+(o.side||0)+'|'+(o.basic?1:0);
  if(MC[k]) return MC[k];
  let m;
  if(o.basic) m=new T.MeshBasicMaterial({color, transparent:(o.op||1)<1, opacity:o.op||1, side:o.side||T.FrontSide});
  else m=new T.MeshLambertMaterial({color, emissive:o.e||'#000000', emissiveIntensity:o.ei||0, transparent:(o.op||1)<1, opacity:o.op||1, side:o.side||T.FrontSide, depthWrite:(o.op||1)>=1});
  return MC[k]=m; }
function shade(hex, f){ const c=new T.Color(hex); if(f>1){ c.lerp(new T.Color('#ffffff'), Math.min(1,f-1)); } else c.multiplyScalar(f); return '#'+c.getHexString(); }
function mesh(g, m, x,y,z, p){ const o=new T.Mesh(g,m); o.position.set(x||0,y||0,z||0); if(p) p.add(o); return o; }
function sph(r, ws, hs){ return new T.SphereGeometry(r, ws||14, hs||10); }

const RACES = {
  human:   {label:'Human',   skin:'#d9a982', hair:'#4a2f1f', eyeGlow:'#5aa0ff', glow:0.0, earSize:0.4, earAngle:0, hornLen:0, hornCurve:0.3, height:1.0, hairStyle:'short', beard:false, tail:false, muzzle:false, catEars:false, pointy:0},
  elf:     {label:'Elf',     skin:'#f0cfb0', hair:'#e8dcb0', eyeGlow:'#8affd0', glow:0.3, earSize:0.75, earAngle:0.35, hornLen:0, hornCurve:0.3, height:1.05, hairStyle:'long', beard:false, tail:false, muzzle:false, catEars:false, pointy:1, jawWidth:0.3, cheek:0.7, eyeAngle:0.5},
  dwarf:   {label:'Dwarf',   skin:'#c98d6a', hair:'#8a3b1c', eyeGlow:'#ffb347', glow:0.0, earSize:0.55, earAngle:0, hornLen:0, hornCurve:0.3, height:0.82, hairStyle:'short', beard:true, tail:false, muzzle:false, catEars:false, pointy:0, jawWidth:0.85, noseLen:0.7, brow:-0.4},
  gnome:   {label:'Gnome',   skin:'#e2b48f', hair:'#d94f8a', eyeGlow:'#56c8ff', glow:0.1, earSize:0.7, earAngle:0.2, hornLen:0, hornCurve:0.3, height:0.66, hairStyle:'short', beard:false, tail:false, muzzle:false, catEars:false, pointy:0.45, noseLen:0.95, eyeSize:0.8},
  halfelf: {label:'Half-elf',skin:'#e6be9a', hair:'#3b2a4a', eyeGlow:'#7fd8a0', glow:0.1, earSize:0.55, earAngle:0.2, hornLen:0, hornCurve:0.3, height:1.0, hairStyle:'long', beard:false, tail:false, muzzle:false, catEars:false, pointy:0.4, cheek:0.6},
  halforc: {label:'Half-orc',skin:'#8a9a6a', hair:'#151515', eyeGlow:'#ff5a3a', glow:0.2, earSize:0.6, earAngle:0.3, hornLen:0, hornCurve:0.3, height:1.06, hairStyle:'wolfcut', beard:false, tail:false, muzzle:false, catEars:false, pointy:0.5, jawWidth:0.95, brow:-0.6, noseLen:0.3, tusks:true},
  halfling:{label:'Halfling',skin:'#e0ac84', hair:'#6a3d1e', eyeGlow:'#6aa0ff', glow:0.0, earSize:0.55, earAngle:0.15, hornLen:0, hornCurve:0.3, height:0.6, hairStyle:'short', beard:false, tail:false, muzzle:false, catEars:false, pointy:0.3, eyeSize:0.75, cheek:0.7},
  catfolk: {label:'Catfolk', skin:'#c88a4a', hair:'#7a4a22', eyeGlow:'#9cff57', glow:0.6, earSize:0.6, earAngle:0.1, hornLen:0, hornCurve:0.3, height:0.97, hairStyle:'none', beard:false, tail:true, muzzle:true, catEars:true, pointy:0, eyeSize:0.65, eyeAngle:0.35},
  undeadcat:{label:'Undead Catfolk', skin:'#4a4d4a', hair:'#1a1a1c', eyeGlow:'#39ff6a', glow:1.0, earSize:0.6, earAngle:0.25, hornLen:0, hornCurve:0.3, height:0.97, hairStyle:'none', beard:false, tail:true, muzzle:true, catEars:true, pointy:0, eyeSize:0.6, eyeAngle:0.45, undead:true, scars:true}
};
const DEFAULTS = {jawWidth:0.5, cheek:0.5, eyeAngle:0.2, eyeSize:0.5, eyeSpacing:0.5, brow:0, noseLen:0.5,
  scars:false, scarHeavy:0.5, top:'#efe6d2', armor:'#6b4a2b', boots:'#5a3b22', tape:'#facc15', hat:'none', veil:false,
  corset:false, pauldron:false, bootStyle:'plain', robe:false};
const SLIDERS = [
  ['jawWidth','Jaw width',0,1],['cheek','Cheekbones',0,1],['eyeAngle','Eye angle',-1,1],['eyeSize','Eye size',0,1],
  ['eyeSpacing','Eye spacing',0,1],['brow','Brow',-1,1],['noseLen','Nose length',0,1],['earSize','Ear size',0,1],
  ['earAngle','Ear angle',-1,1],['hornLen','Horn length',0,1],['hornCurve','Horn curve',0,1],['height','Height',0.75,1.1]];

function params(race, over){ return Object.assign({name:'Hero', race}, DEFAULTS, RACES[race]||RACES.human, over||{}); }

const PRESETS = {
  delroth: Object.assign(params('undeadcat'), {id:'preset_delroth', name:'Delroth', title:'Undead Catfolk Dread Necromancer · Lv 60 (epic)', locked:true,
    skin:'#2a2a2f', hair:'#0d0d10', eyeGlow:'#39ff6a', glow:1, scars:true, scarHeavy:1, kit:'delroth',
    jawWidth:0.62, cheek:0.75, eyeAngle:0.55, eyeSize:0.62, eyeSpacing:0.48, brow:-0.55, noseLen:0.45,
    earSize:0.72, earAngle:0.25, height:1.0, hairStyle:'wolfcut', top:'#1a1a1f', armor:'#26262c', boots:'#111114', tape:'#3a3a40',
    hat:'plus5', corset:false, pauldron:true, bootStyle:'stomper', robe:false}),
  mori: Object.assign(params('human'), {id:'preset_mori', name:'Mori', locked:true, skin:'#e7bf9b', hair:'#2e5d2a', eyeGlow:'#a3ff12', glow:0.5,
    top:'#efe6d2', armor:'#7a5230', boots:'#6b4426', veil:true, hairStyle:'long', jawWidth:0.35, cheek:0.6, eyeSize:0.7, height:0.95})
};

/* tapered tube (for horns / tails) */
function taperTube(curve, r0, r1, segs, rad){
  const g=new T.TubeGeometry(curve, segs, 1, rad, false);
  const pos=g.attributes.position, v=new T.Vector3();
  for(let i=0;i<pos.count;i++){
    const seg=Math.floor(i/(rad+1)); const t=seg/segs; const c=curve.getPointAt(Math.min(1,t));
    v.fromBufferAttribute(pos,i).sub(c).multiplyScalar(r0+(r1-r0)*t).add(c); pos.setXYZ(i,v.x,v.y,v.z);
  }
  g.computeVertexNormals(); return g;
}

function textTex(text, w, h, bg, fg, font){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
  x.fillStyle=bg; x.fillRect(0,0,w,h); x.fillStyle=fg; x.font=font||('bold '+Math.floor(h*0.55)+'px sans-serif'); x.textAlign='center'; x.textBaseline='middle'; x.fillText(text,w/2,h/2+2);
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t;
}

/* ---------- the +5 HAT (v3: matched to Robert's official reference art + the real hat) ---------- */
function buildRose(r, petalCol){ const g=new T.Group(); const petal=M(petalCol||'#a3101f',{e:'#3a0006',ei:0.35});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; mesh(sph(r,7,5), petal, Math.cos(a)*r*0.9,(i%2)*r*0.25,Math.sin(a)*r*0.9, g).scale.set(1,0.55,0.7); }
  mesh(sph(r*0.8,7,5), M('#7a0a16'), 0,r*0.35,0, g); return g; }
function buildHat(){
  const hat=new T.Group(); hat.name='plus5hat';
  const black=M('#111114'), velvet=M('#1b1b20'), band=M('#0a0a0c');
  mesh(new T.CylinderGeometry(0.33,0.335,0.016,32), black, 0,0,0, hat);               // wide brim
  const lip=mesh(new T.TorusGeometry(0.33,0.008,5,32), black, 0,0.004,0, hat); lip.rotation.x=Math.PI/2; lip.scale.z=0.6;
  mesh(new T.CylinderGeometry(0.13,0.14,0.24,22), black, 0,0.125,0, hat);              // tall top-hat crown
  mesh(new T.CylinderGeometry(0.132,0.132,0.006,22), velvet, 0,0.247,0, hat);
  mesh(new T.CylinderGeometry(0.143,0.143,0.04,22), band, 0,0.03,0, hat);              // hatband
  // crown of curved black horns/thorns around the crown
  const hornM=M('#0c0c0f');
  for(let i=0;i<9;i++){ const a=i/9*Math.PI*2+0.35; const big=i%2===0;
    const c=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0.02,0.07,0),new T.Vector3(0.055,big?0.15:0.11,0),new T.Vector3(0.05,big?0.21:0.15,0)]);
    const h=mesh(taperTube(c,0.022,0.002,8,5), hornM, Math.sin(a)*0.12,0.2,Math.cos(a)*0.12, hat); h.rotation.y=a-Math.PI/2; }
  // black velvet skull on the front of the crown
  const skull=new T.Group(); skull.position.set(0,0.13,0.135); hat.add(skull);
  mesh(sph(0.058,12,9), velvet, 0,0.01,0, skull).scale.set(1,1.05,0.65);
  mesh(new T.BoxGeometry(0.05,0.03,0.03), velvet, 0,-0.045,0.008, skull);
  [-0.022,0.022].forEach(x=>{ mesh(sph(0.015,8,6), M('#000'), x,0.008,0.033, skull); });
  mesh(new T.ConeGeometry(0.008,0.016,3), M('#000'), 0,-0.018,0.036, skull).rotation.x=Math.PI;
  for(let i=0;i<4;i++) mesh(new T.BoxGeometry(0.006,0.01,0.006), M('#2a2a30'), -0.015+i*0.01,-0.052,0.026, skull);
  // red roses with dark stems winding around the hatband
  const stem=mesh(new T.TorusGeometry(0.147,0.005,5,40), M('#14200f'), 0,0.03,0, hat); stem.rotation.x=Math.PI/2+0.12;
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+0.9; const rr=buildRose(0.016); rr.position.set(Math.sin(a)*0.15,0.035+Math.sin(i*2.1)*0.01,Math.cos(a)*0.15); rr.rotation.set(Math.PI/2,0,-a); hat.add(rr);
    const lf=mesh(new T.ConeGeometry(0.01,0.035,4), M('#173a14'), Math.sin(a+0.3)*0.152,0.02,Math.cos(a+0.3)*0.152, hat); lf.rotation.z=1.2; }
  // one big rose on the brim with an eyeball in its centre
  const rose=new T.Group(); rose.position.set(0.21,0.022,0.12); hat.add(rose);
  rose.add(buildRose(0.034));
  const eyeW=mesh(sph(0.02,12,9), M('#f2efe6'), 0,0.022,0, rose);
  const eyeI=mesh(sph(0.009,8,6), M('#39ff6a',{e:'#39ff6a',ei:1}), 0,0.034,0.008, rose);
  mesh(sph(0.004,6,4), M('#000'), 0,0.04,0.011, rose);
  rose.userData.eye=[eyeW,eyeI];
  // artificer goggles worn backwards (kept from v2, tucked at the back)
  const gog=new T.Group(); gog.position.set(0,0.06,-0.14); hat.add(gog);
  [-0.045,0.045].forEach(x=>{ const l=mesh(new T.CylinderGeometry(0.026,0.026,0.026,12), M('#8a6a3a'), x,0,-0.01, gog); l.rotation.x=Math.PI/2;
    const g=mesh(new T.CircleGeometry(0.02,12), M('#ff9b3a',{e:'#ff7a00',ei:0.8, side:T.DoubleSide}), x,0,-0.024, gog); g.rotation.y=Math.PI; });
  // little white tag reading +5 HAT
  const tag=new T.Group(); tag.position.set(-0.24,-0.01,0.12); hat.add(tag);
  mesh(new T.CylinderGeometry(0.0015,0.0015,0.04,4), M('#ddd'), 0,-0.02,0, tag);
  const tm=new T.MeshBasicMaterial({map:textTex('+5 HAT',128,64,'#ffffff','#111'), side:T.DoubleSide});
  const tg=mesh(new T.PlaneGeometry(0.075,0.038), tm, 0,-0.055,0, tag); tg.rotation.y=-0.5;
  hat.userData.tag=tag; hat.userData.rose=rose;
  return hat;
}

/* ---------- Delroth's outfit (v3, from the reference art) ---------- */
function gear(r, mat, teeth){ const g=new T.Group(); const ring=mesh(new T.TorusGeometry(r,r*0.28,4,teeth*2), mat, 0,0,0, g);
  for(let i=0;i<teeth;i++){ const a=i/teeth*Math.PI*2; const t=mesh(new T.BoxGeometry(r*0.35,r*0.35,r*0.3), mat, Math.cos(a)*r*1.3,Math.sin(a)*r*1.3,0, g); t.rotation.z=a; } return g; }
function delrothKit(p, U, torso, body){
  const gold=M('#c9a227',{e:'#5a4300',ei:0.35}), coat=M('#121216',{side:T.DoubleSide}), vest=M('#08080a');
  // long black coat to the boots, open at the front
  const c=mesh(new T.CylinderGeometry(0.2,0.34,0.95,16,1,true,Math.PI*0.62,Math.PI*1.76), coat, 0,-0.12,0, torso); c.scale.z=0.82; c.rotation.y=Math.PI;
  const coll=mesh(new T.CylinderGeometry(0.17,0.21,0.14,14,1,true,Math.PI*0.7,Math.PI*1.6), coat, 0,0.62,-0.01, torso); coll.rotation.y=Math.PI;
  // black vest + gold buttons
  const v=mesh(new T.BoxGeometry(0.2,0.34,0.03), vest, 0,0.28,0.112, torso);
  for(let i=0;i<4;i++) mesh(sph(0.009,6,4), gold, 0,0.17+i*0.065,0.13, torso);
  // gold filigree lapels and hem
  [-1,1].forEach(s=>{ const l=mesh(new T.BoxGeometry(0.012,0.5,0.012), gold, s*0.11,0.22,0.125, torso); l.rotation.z=s*0.12;
    for(let k=0;k<5;k++){ const sw=mesh(new T.TorusGeometry(0.018,0.003,4,10,Math.PI*1.3), gold, s*0.155,-0.05-k*0.11,0.2+k*0.012, torso); sw.rotation.z=k*1.1; }
    const hem=mesh(new T.BoxGeometry(0.01,0.8,0.01), gold, s*0.21,-0.2,0.22, torso); hem.rotation.z=-s*0.14; hem.rotation.x=0.18; });
  const hemR=mesh(new T.TorusGeometry(0.34,0.006,4,30,Math.PI*1.7), gold, 0,-0.59,0, torso); hemR.rotation.x=Math.PI/2; hemR.rotation.z=Math.PI*0.65; hemR.scale.y=0.82;
  // gears / clockwork on the coat
  [[0.16,0.36,0.1,0.03,9],[-0.17,0.0,0.14,0.024,8],[0.2,-0.3,0.18,0.03,10],[-0.12,0.47,0.09,0.018,7]].forEach(([x,y,z,r,n])=>{ const g=gear(r,gold,n); g.position.set(x,y,z); g.rotation.y=x>0?0.5:-0.5; torso.add(g); });
  // pocket watches on the chest with chains
  [[-0.07,0.36],[0.065,0.25],[-0.06,0.15]].forEach(([x,y],i)=>{ const w=new T.Group(); w.position.set(x,y,0.15); w.scale.setScalar(1.35); torso.add(w);
    const cs=mesh(new T.CylinderGeometry(0.024,0.024,0.01,14), gold, 0,0,0, w); cs.rotation.x=Math.PI/2;
    const f=mesh(new T.CircleGeometry(0.019,14), M('#e9e2cc'), 0,0,0.0055, w);
    mesh(new T.BoxGeometry(0.002,0.015,0.001), M('#111'), 0,0.006,0.007, w); const hh=mesh(new T.BoxGeometry(0.002,0.011,0.001), M('#111'), 0.003,0,0.007, w); hh.rotation.z=-1.2+i;
    const ch=mesh(new T.TorusGeometry(0.045,0.002,3,12,Math.PI), gold, 0.045*(x<0?1:-1),0.01,0, w); ch.rotation.z=Math.PI; });
  // twisted black staff with a scorpion emblem in a crescent + crystal
  const st=new T.Group(); st.position.set(0.05,-0.53,0.07); st.rotation.z=-0.14; U.limbs.armR.add(st); U.staff=st;
  const pts=[]; for(let i=0;i<=10;i++){ const t=i/10; pts.push(new T.Vector3(Math.sin(t*9)*0.012,(t-0.42)*1.7,Math.cos(t*9)*0.012)); }
  const shaft=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,0.017,6,false), M('#0d0d10'), 0,0,0, st);
  const vine=[]; for(let i=0;i<=40;i++){ const t=i/40; vine.push(new T.Vector3(Math.cos(t*30)*0.024,(t-0.42)*1.7,Math.sin(t*30)*0.024)); }
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(vine),80,0.006,4,false), M('#1c1c22'), 0,0,0, st);
  const top=new T.Group(); top.position.set(0,1.0,0); st.add(top);
  const cres=mesh(new T.TorusGeometry(0.11,0.016,6,24,Math.PI*1.45), M('#15151a',{e:'#0a3a14',ei:0.3}), 0,0.1,0, top); cres.rotation.z=-Math.PI*0.22;
  const crys=mesh(new T.OctahedronGeometry(0.05,0), M('#6dff8f',{e:'#39ff6a',ei:1.1, op:0.75}), 0,0.1,0, top); crys.scale.set(0.7,1.4,0.7); U.crystal=crys;
  // the scorpion emblem
  const sc=new T.Group(); sc.position.set(0,0.1,0.035); sc.scale.setScalar(0.5); top.add(sc); const sm=M('#c9a227',{e:'#6a5000',ei:0.4});
  for(let i=0;i<3;i++) mesh(sph(0.03-i*0.004,6,4), sm, 0,-0.03+i*0.04,0, sc).scale.z=0.5;
  const tail=new T.CatmullRomCurve3([new T.Vector3(0,0.07,0),new T.Vector3(0,0.13,0),new T.Vector3(0.04,0.18,0),new T.Vector3(0.07,0.14,0)]);
  mesh(taperTube(tail,0.014,0.004,10,4), sm, 0,0,0, sc); const sting=mesh(new T.ConeGeometry(0.01,0.03,4), sm, 0.075,0.125,0, sc); sting.rotation.z=2.6;
  [-1,1].forEach(s=>{ const cl=mesh(new T.TorusGeometry(0.03,0.007,4,8,Math.PI*1.2), sm, s*0.05,-0.07,0, sc); cl.rotation.z=s>0?-0.6:Math.PI+0.6;
    for(let k=0;k<3;k++){ const lg=mesh(new T.BoxGeometry(0.05,0.006,0.006), sm, s*0.04,-0.02+k*0.025,0, sc); lg.rotation.z=s*(0.4-k*0.3); } });
  // necrotic lightning aura (green bolts, re-rolled in animate)
  const bolts=new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({color:'#5dff7a', transparent:true, opacity:0.85, blending:T.AdditiveBlending, depthWrite:false}));
  bolts.geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6*12*3),3)); body.add(bolts); U.bolts=bolts; U.boltT=0; U.kitWisp=true;
}
function rollBolts(U){ const a=U.bolts.geometry.attributes.position; let k=0;
  for(let b=0;b<6;b++){ const ang=Math.random()*Math.PI*2, r=0.35+Math.random()*0.25; let x=Math.cos(ang)*r, y=0.2+Math.random()*1.4, z=Math.sin(ang)*r;
    for(let s=0;s<6;s++){ const nx=x+(Math.random()-0.5)*0.16, ny=y+0.07+Math.random()*0.09, nz=z+(Math.random()-0.5)*0.16; a.setXYZ(k++,x,y,z); a.setXYZ(k++,nx,ny,nz); x=nx; y=ny; z=nz; } }
  a.needsUpdate=true; U.bolts.geometry.computeBoundingSphere(); }

/* ---------- head ---------- */
function buildHead(p, U){
  const head=new T.Group(); head.name='head';
  const skin=M(p.skin), dark=M(shade(p.skin,0.55)), hairM=M(p.hair);
  const cat=p.muzzle;
  mesh(sph(0.13,24,18), skin, 0,0,0, head).scale.set(1,1.12,1.05);
  const jw=0.8+p.jawWidth*0.55;
  mesh(sph(0.11,20,14), skin, 0,-0.065,0.012, head).scale.set(jw*(cat?0.95:1),0.72,0.95);
  // cheekbones
  const cs=0.028+p.cheek*0.026;
  [-1,1].forEach(s=>mesh(sph(cs,12,8), skin, s*(0.072+p.cheek*0.022),-0.012,0.083, head).scale.set(1.3,0.8,0.8));
  // eyes
  const es=0.95+p.eyeSize*0.6, sp=0.034+p.eyeSpacing*0.03;
  const glowCol=new T.Color(p.eyeGlow);
  const iris=new T.MeshLambertMaterial({color:p.eyeGlow, emissive:p.eyeGlow, emissiveIntensity:0.2+p.glow*1.2});
  U.irisMat=iris; U.glow=p.glow;
  [-1,1].forEach(s=>{
    const eg=new T.Group(); eg.position.set(s*sp,0.018,0.112); eg.rotation.z=s*p.eyeAngle*0.45; head.add(eg);
    mesh(sph(0.021,14,10), M(cat?'#101010':'#f3f0ea'), 0,0,0, eg).scale.set(1.35*es,0.85*es,0.55);
    const ir=mesh(sph(0.0135,12,8), iris, 0,0,0.008, eg); ir.scale.set(es*(cat?1.25:1), es*(cat?0.95:1), 0.6);
    if(cat) mesh(new T.BoxGeometry(0.004,0.02*es,0.004), M('#050505'), 0,0,0.0175, eg);
    else mesh(sph(0.006,8,6), M('#08080a'), 0,0,0.017, eg).scale.set(es,es,0.5);
    if(p.glow>0.45){ const halo=mesh(sph(0.03,10,8), new T.MeshBasicMaterial({color:glowCol, transparent:true, opacity:0.1*p.glow, depthWrite:false, blending:T.AdditiveBlending}), 0,0,0.01, eg); halo.scale.set(1.2*es,0.8*es,0.3); }
    // brow
    const b=mesh(new T.BoxGeometry(0.05,0.009,0.014), hairM, s*sp,0.052+p.brow*0.012,0.118, head);
    b.rotation.z=-s*(p.brow*0.35 - p.eyeAngle*0.15);
  });
  // nose
  const nl=0.03+p.noseLen*0.05;
  if(cat){ mesh(sph(0.07,16,12), skin, 0,-0.04,0.085, head).scale.set(1,0.68,0.72);
    const n=mesh(new T.ConeGeometry(0.016,0.014,3), M('#0b0b0b'), 0,-0.022,0.135, head); n.rotation.x=Math.PI/2+0.3; n.rotation.y=Math.PI;
    [-1,1].forEach(s=>{ for(let k=0;k<2;k++){ const w=mesh(new T.CylinderGeometry(0.0012,0.0012,0.09,3), M('#555'), s*0.075,-0.04-k*0.012,0.12, head); w.rotation.z=Math.PI/2+s*(0.1+k*0.12); } });
  } else {
    const n=mesh(new T.ConeGeometry(0.017,nl,4), skin, 0,-0.018,0.128+nl*0.25, head); n.rotation.x=Math.PI/2+0.35; n.rotation.y=Math.PI/4;
  }
  mesh(new T.BoxGeometry(0.045,0.006,0.01), M('#4a1f22'), 0,-0.072,0.108+(cat?0.02:0), head);
  // ears
  const ez=0.6+p.earSize*0.9;
  if(p.catEars){
    [-1,1].forEach(s=>{ const g=new T.Group(); g.position.set(s*0.075,0.115,-0.01); g.rotation.z=-s*(0.25+p.earAngle*0.5); head.add(g);
      mesh(new T.ConeGeometry(0.045*ez,0.1*ez,4), skin, 0,0.04*ez,0, g).scale.z=0.5;
      mesh(new T.ConeGeometry(0.03*ez,0.07*ez,4), dark, 0,0.035*ez,0.012, g).scale.z=0.3; });
  } else if(p.pointy>0){
    [-1,1].forEach(s=>{ const g=new T.Group(); g.position.set(s*0.128,0.005,-0.005); g.rotation.z=-s*(1.15-p.earAngle*0.6); head.add(g);
      mesh(new T.ConeGeometry(0.026,0.07*ez*(0.6+p.pointy*0.8),5), skin, 0,0.035*ez*(0.6+p.pointy*0.8),0, g).scale.z=0.45; });
  } else {
    [-1,1].forEach(s=>{ const e=mesh(sph(0.028*ez,10,8), skin, s*0.128,0.0,-0.005, head); e.scale.set(0.45,1.1,0.8); e.rotation.z=s*p.earAngle*0.4; });
  }
  // horns
  if(p.hornLen>0.02){
    [-1,1].forEach(s=>{
      const L=0.08+p.hornLen*0.28, c=p.hornCurve;
      const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0), new T.Vector3(s*0.03, L*0.45, -L*0.15*c), new T.Vector3(s*(0.05+c*0.04), L*0.75, -L*0.55*c), new T.Vector3(s*(0.06+c*0.08), L*(1-c*0.35), -L*(0.2+c*0.9))]);
      mesh(taperTube(curve,0.024,0.002,14,8), M('#2a1a1a'), s*0.06,0.1,0.045, head);
    });
  }
  // hair
  if(p.hairStyle!=='none'){
    const cap=new T.SphereGeometry(0.138,20,12,0,Math.PI*2,0,Math.PI*0.52);
    mesh(cap, hairM, 0,0.012,-0.008, head).scale.set(1.02,1.12,1.08);
    if(p.hairStyle==='wolfcut'){
      for(let i=0;i<13;i++){ const a=-0.12*Math.PI+i/12*Math.PI*1.24; const r=0.125;
        const sh=mesh(new T.ConeGeometry(0.035,0.11+(i%3)*0.03,5), hairM, Math.cos(a)*r*0.95,-0.02-(i%2)*0.02,-Math.sin(a)*r*0.9+0.02, head);
        sh.rotation.x=Math.PI-Math.sin(a)*0.35; sh.rotation.z=-Math.cos(a)*0.45; }
      for(let i=0;i<4;i++){ const f=mesh(new T.ConeGeometry(0.026,0.05,4), hairM, -0.06+i*0.04,0.1,0.095, head); f.rotation.x=Math.PI-0.9; }
    } else if(p.hairStyle==='long'){
      mesh(new T.BoxGeometry(0.24,0.32,0.06), hairM, 0,-0.12,-0.1, head);
    }
  }
  if(p.beard){ const b=mesh(new T.ConeGeometry(0.1,0.22,10), hairM, 0,-0.17,0.06, head); b.rotation.x=Math.PI-0.25; b.scale.z=0.6; }
  if(p.tusks){ [-1,1].forEach(s=>{ const t=mesh(new T.ConeGeometry(0.009,0.035,5), M('#e9e0c4'), s*0.035,-0.07,0.11, head); t.rotation.z=s*0.15; }); }
  if(p.undead){ // sunken sockets, stitches and a spectral wisp
    [-1,1].forEach(s=>{ const r=mesh(new T.TorusGeometry(0.026,0.006,6,14), M('#141416'), s*sp,0.018,0.11, head); r.scale.set(1.3*es,0.9*es,1); r.rotation.z=s*p.eyeAngle*0.45; });
    for(let i=0;i<5;i++){ mesh(new T.BoxGeometry(0.003,0.016,0.004), M('#5a0d12'), -0.09+i*0.012,0.075,0.1-i*0.002, head).rotation.z=0.3; }
    const wisp=mesh(sph(0.2,12,8), new T.MeshBasicMaterial({color:p.eyeGlow, transparent:true, opacity:0.06, depthWrite:false, blending:T.AdditiveBlending}), 0,0,0, head); wisp.scale.set(1.1,1.2,1.1); U.wisp=wisp; }
  if(p.kit==='delroth'){ [-1,1].forEach(s=>{ const f=mesh(new T.ConeGeometry(0.007,0.03,4), M('#e8e4da'), s*0.022,-0.082,0.128, head); f.rotation.x=Math.PI; });
    const sm2=M('#b3121f',{e:'#6a0008',ei:0.6}); [[0.0,0.11,0.07,0.12,0.3,-0.9],[-0.04,0.12,0.03,0.1,-0.5,-1.2],[0.07,0.08,0.06,0.1,0.9,-0.7],[-0.075,0.0,0.1,0.08,1.4,-0.2],[0.03,-0.02,0.128,0.07,-1.0,-0.1]].forEach(([x,y,z,l,r,rx])=>{ const sc=mesh(new T.BoxGeometry(0.007,l,0.006), sm2, x,y,z, head); sc.rotation.z=r; sc.rotation.x=rx; }); }
  // scars
  if(p.scars){
    const sm=M('#9e1420',{e:'#5a0008',ei:0.5});
    const sc=[[0.05,0.03,0.13,0.11,0.6],[-0.06,-0.03,0.125,0.07,-0.9],[0.0,0.06,0.13,0.05,0.2],[0.085,-0.05,0.11,0.06,1.1]];
    sc.slice(0, p.scarHeavy>0.6?4:2).forEach(([x,y,z,l,r])=>{ const s=mesh(new T.BoxGeometry(0.006,l,0.006), sm, x,y,z, head); s.rotation.z=r; s.rotation.x=-0.2; });
    if(p.scarHeavy>0.6) for(let i=0;i<3;i++){ const s=mesh(new T.BoxGeometry(0.005,0.06,0.005), sm, 0.03+i*0.018,0.02,0.122, head); s.rotation.z=0.5; }
  }
  // Mori's green veil
  if(p.veil){
    const vm=M('#3fbf5a',{e:'#1f7a2c',ei:0.35, op:0.72, side:T.DoubleSide});
    const v=mesh(new T.CylinderGeometry(0.15,0.27,0.5,16,1,true,Math.PI*0.3,Math.PI*1.4), vm, 0,-0.12,-0.02, head);
    mesh(new T.TorusGeometry(0.135,0.012,6,24), M('#7dff8f',{e:'#3aff6a',ei:0.6}), 0,0.07,0, head).rotation.x=Math.PI/2-0.15;
  }
  if(p.hat==='plus5'){ const h=buildHat(); h.position.set(0,0.118,-0.01); h.rotation.x=-0.08; h.scale.setScalar(0.88); head.add(h); U.hat=h; }
  return head;
}

/* ---------- full character ---------- */
function build(p){
  p=Object.assign({}, DEFAULTS, RACES[p.race]||RACES.human, p);
  const U={limbs:{}}; const root=new T.Group(); root.userData.hero=U; root.userData.params=p;
  const body=new T.Group(); body.scale.setScalar(p.height); root.add(body); U.body=body;
  const skin=M(p.skin), top=M(p.top), arm=M(p.armor), boot=M(p.boots);
  // legs
  ['L','R'].forEach((side,i)=>{ const s=i?1:-1; const leg=new T.Group(); leg.position.set(s*0.09,0.86,0); body.add(leg);
    mesh(new T.CapsuleGeometry(0.06,0.6,4,8), M(shade(p.top==='#efe6d2'?'#6b4a2b':p.top,0.75)), 0,-0.38,0, leg);
    const st=p.bootStyle==='stomper';
    mesh(new T.BoxGeometry(st?0.15:0.12, st?0.2:0.13, st?0.25:0.2), boot, 0,-0.8+(st?0.04:0),0.04, leg);
    if(st){ mesh(new T.BoxGeometry(0.16,0.05,0.27), M('#0a0a0a'), 0,-0.85,0.045, leg); mesh(new T.BoxGeometry(0.155,0.02,0.02), M('#777'), 0,-0.72,0.12, leg); }
    U.limbs['leg'+side]=leg; });
  // torso
  const torso=new T.Group(); torso.position.y=0.86; body.add(torso); U.torso=torso;
  mesh(new T.CapsuleGeometry(0.17,0.32,4,12), top, 0,0.3,0, torso).scale.set(1,1,0.68);
  mesh(new T.CylinderGeometry(0.16,0.17,0.12,12), M(shade(p.armor,0.8)), 0,0.04,0, torso).scale.z=0.75; // belt/hips
  mesh(new T.BoxGeometry(0.06,0.06,0.03), M(p.tape), 0.12,0.05,0.12, torso); // tape measure on belt
  if(p.corset){ const c=mesh(new T.CylinderGeometry(0.168,0.158,0.2,14), arm, 0,0.2,0, torso); c.scale.z=0.72;
    for(let i=0;i<4;i++) mesh(new T.BoxGeometry(0.07,0.006,0.01), M('#c9a227'), 0,0.13+i*0.045,0.122, torso); }
  if(p.robe){ const r=mesh(new T.CylinderGeometry(0.19,0.3,0.62,14,1,true), M(shade(p.top,1.0),{side:T.DoubleSide}), 0,-0.2,0, torso); r.scale.z=0.8; }
  mesh(new T.CylinderGeometry(0.05,0.06,0.08,10), skin, 0,0.56,0, torso);
  // arms
  ['L','R'].forEach((side,i)=>{ const s=i?1:-1; const a=new T.Group(); a.position.set(s*0.22,0.5,0); torso.add(a);
    mesh(new T.CapsuleGeometry(0.05,0.42,4,8), top, 0,-0.25,0, a);
    mesh(sph(0.05,10,8), skin, 0,-0.52,0, a);
    if(p.scars){ for(let k=0;k<(p.scarHeavy>0.6?3:1);k++){ const sc=mesh(new T.BoxGeometry(0.105,0.006,0.008), M('#9e1420',{e:'#5a0008',ei:0.5}), 0,-0.15-k*0.09,0.0, a); sc.rotation.z=0.4; sc.rotation.y=s*0.6; } }
    U.limbs['arm'+side]=a; });
  if(p.pauldron){ const pd=new T.Group(); pd.position.set(0.24,0.55,0); torso.add(pd);
    mesh(new T.SphereGeometry(0.1,12,8,0,Math.PI*2,0,Math.PI/2), arm, 0,0,0, pd).scale.set(1,0.8,1);
    for(let i=0;i<3;i++){ const sp=mesh(new T.ConeGeometry(0.015,0.07,5), M('#9a9aa2'), -0.03+i*0.03,0.07,0, pd); sp.rotation.z=-0.3; } }
  if(p.undead){ for(let i=0;i<3;i++){ const rib=mesh(new T.TorusGeometry(0.12,0.006,4,16,Math.PI*0.9), M('#2a0a0e',{e:'#39ff6a',ei:0.15}), 0,0.28+i*0.06,0.03, torso); rib.rotation.z=Math.PI*0.05; rib.rotation.y=0; rib.scale.z=0.6; } }
  if(p.tail){ const tc=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,-0.15,-0.15),new T.Vector3(0,-0.2,-0.38),new T.Vector3(0,0.05,-0.55)]);
    const tl=mesh(taperTube(tc, p.muzzle?0.035:0.018, p.muzzle?0.022:0.006, 12, 6), p.muzzle?skin:M(shade(p.skin,0.8)), 0,0.02,-0.1, torso); U.tail=tl;
    if(!p.muzzle){ const sp=mesh(new T.ConeGeometry(0.03,0.06,3), M('#2a1a1a'), 0,0.07,-0.65, torso); sp.rotation.x=-0.6; } }
  if(p.kit==='delroth') delrothKit(p,U,torso,body);
  // head
  const head=buildHead(p,U); head.position.set(0,0.78,0.0); torso.add(head); U.head=head;
  root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; } });
  return root;
}

const tmpBlink={};
function animate(root, t, speed){
  const U=root.userData.hero; if(!U) return;
  const sw=Math.sin(t*9)*Math.min(1,speed||0)*0.7;
  if(U.limbs.legL){ U.limbs.legL.rotation.x=sw; U.limbs.legR.rotation.x=-sw; U.limbs.armL.rotation.x=-sw*0.8; U.limbs.armR.rotation.x=sw*0.8; }
  if(U.torso) U.torso.position.y=0.86+Math.sin(t*2)*0.006+(speed>0.1?Math.abs(Math.sin(t*9))*0.02:0);
  if(U.wisp){ U.wisp.material.opacity=(U.kitWisp?0.02:0.05)+Math.sin(t*1.7)*(U.kitWisp?0.01:0.03); }
  if(U.tail) U.tail.rotation.y=Math.sin(t*2.2)*0.35;
  if(U.irisMat && U.glow>0.4) U.irisMat.emissiveIntensity=0.6+U.glow*0.9+Math.sin(t*3)*0.25;
  if(U.hat){ const r=U.hat.userData.rose; const bl=(t%3.2)<0.14; r.userData.eye.forEach(e=>e.scale.y=bl?0.12:1);
    U.hat.userData.tag.rotation.z=Math.sin(t*2.5)*0.25; }
  if(U.bolts){ U.boltT-=1/60; if(U.boltT<=0){ U.boltT=0.08+Math.random()*0.12; rollBolts(U); } U.bolts.material.opacity=0.4+Math.random()*0.5; }
  if(U.crystal){ U.crystal.rotation.y=t*1.5; U.crystal.material.emissiveIntensity=0.9+Math.sin(t*4)*0.3; }
}

window.HERO={RACES, DEFAULTS, SLIDERS, PRESETS, params, build, animate, M, shade, textTex, taperTube};
})();
