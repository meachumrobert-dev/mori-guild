/* World builder: terrain, Guild, safe fence, The Retired Bard, stations, resource nodes, structures, dungeon. */
(function(){
'use strict';
const T=THREE, M=HERO.M;
/* Mori Templates: textured material when the optional pack is loaded, else the plain procedural colour */
const MTon=!!(window.MT&&MT.on), TX=(kind,hex,scale,o)=>MTon?MT.M(kind,hex,scale,o):M(hex,o);
function mesh(g,m,x,y,z,p){ if(MTon) MT.fit(g,m); const o=new T.Mesh(g,m); o.position.set(x||0,y||0,z||0); o.castShadow=true; o.receiveShadow=true; if(p) p.add(o); return o; }
const smooth=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
function height(x,z){
  const r=Math.hypot(x,z); const f=smooth(30,48,r);
  let h=(Math.sin(x*0.08)*Math.cos(z*0.07)*2.2+Math.sin(x*0.023+1)*3+Math.cos(z*0.031)*2.2)*f;
  h+=7*Math.exp(-((x*x)+(z+60)*(z+60))/260);
  return h;
}
const FENCE=20, GATE=2.4;
const STATIONS={ seed:{x:-15,z:-15}, hall:{x:0,z:-12}, doll:{x:-8,z:-3}, outpost:{x:8,z:-3}, alchemy:{x:-6,z:6}, forge:{x:9,z:9}, tavern:{x:-13,z:12}, dungeon:{x:0,z:-46}, moriHome:{x:-2.5,z:-7.5}, bench:{x:13,z:-11}, enchantForge:{x:14,z:6}, enchantCircle:{x:-14,z:-6} };

function signTex(text, w,h, bg, fg, glow){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
  x.fillStyle=bg; x.fillRect(0,0,w,h); x.font='bold '+Math.floor(h*0.42)+'px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle';
  if(glow){ x.shadowColor=glow; x.shadowBlur=18; } x.fillStyle=fg; x.fillText(text,w/2,h/2);
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }

function terrain(){
  const S=260, N=90; const g=new T.PlaneGeometry(S,S,N,N); g.rotateX(-Math.PI/2);
  const pos=g.attributes.position, col=[]; const c=new T.Color();
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); const y=height(x,z); pos.setY(i,y);
    const n=(Math.sin(x*0.5)*Math.cos(z*0.43)+1)*0.5; const r=Math.hypot(x,z);
    if(r<22) c.setRGB(0.36+n*0.05,0.52+n*0.06,0.26); else c.setRGB(0.24+n*0.08+y*0.012,0.42+n*0.08,0.2+y*0.01);
    if(z>27&&z<52&&Math.abs(x)<25) c.lerp(new T.Color('#4f7a32'),0.4);
    col.push(c.r,c.g,c.b); }
  g.setAttribute('color', new T.Float32BufferAttribute(col,3)); g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true})); m.receiveShadow=true; return m;
}

function fence(scene, colliders){
  const grp=new T.Group(); scene.add(grp);
  const wood=TX('bark','#7a5634',1.2), wood2=TX('wood_planks','#5e4127',1.5), glow=M('#7dff8f',{e:'#3aff6a',ei:0.9});
  const post=new T.CylinderGeometry(0.12,0.14,1.5,6), rail=new T.BoxGeometry(1,0.1,0.08);
  const sides=[[[-FENCE,-FENCE],[FENCE,-FENCE]],[[FENCE,-FENCE],[FENCE,FENCE]],[[FENCE,FENCE],[-FENCE,FENCE]],[[-FENCE,FENCE],[-FENCE,-FENCE]]];
  sides.forEach(([a,b])=>{
    const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2; const dx=b[0]-a[0], dz=b[1]-a[1], L=Math.hypot(dx,dz);
    // two segments with a gate in the middle
    [[a,[mx-dx/L*GATE,mz-dz/L*GATE]],[[mx+dx/L*GATE,mz+dz/L*GATE],b]].forEach(([p,q])=>{
      colliders.segs.push([p[0],p[1],q[0],q[1]]);
      const sl=Math.hypot(q[0]-p[0],q[1]-p[1]), n=Math.ceil(sl/2);
      for(let i=0;i<=n;i++){ const x=p[0]+(q[0]-p[0])*i/n, z=p[1]+(q[1]-p[1])*i/n; mesh(post,wood,x,0.75,z,grp); }
      [0.5,1.05].forEach(y=>{ const r=mesh(rail,wood2,(p[0]+q[0])/2,y,(p[1]+q[1])/2,grp); r.scale.x=sl; r.rotation.y=-Math.atan2(q[1]-p[1],q[0]-p[0]); });
    });
    // gate lanterns (safe-fence glow)
    [-1,1].forEach(s=>{ const x=mx+s*dx/L*GATE, z=mz+s*dz/L*GATE; mesh(new T.CylinderGeometry(0.16,0.18,2.4,6),wood,x,1.2,z,grp); mesh(new T.OctahedronGeometry(0.22),glow,x,2.55,z,grp); });
  });
  // faint safe-zone shimmer on the ground
  const ring=new T.Mesh(new T.RingGeometry(FENCE*1.38,FENCE*1.42,4,1), new T.MeshBasicMaterial({color:'#7dff8f',transparent:true,opacity:0.25,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.rotation.z=Math.PI/4; ring.position.y=0.04; scene.add(ring);
}

function guildHall(scene){
  const g=new T.Group(); g.position.set(STATIONS.hall.x,0,STATIONS.hall.z); scene.add(g);
  const stone=TX('stone_block','#8d8a83',1.6), wood=TX('wood_planks','#6a4628',1.5), roof=TX('roof_shingle','#3d5a3a',1.6);
  const pitch=window.GROUNDED?GROUNDED.pitchFor('grass',0.4).rad:34*Math.PI/180;
  if(window.GROUNDED){
    const spec=GROUNDED.cottageFrame({w:11, d:6.4, wallH:3.5, pitch, overhang:0.55, doorW:1.6});
    GROUNDED.attachFrame(T, g, spec, {stone, timber:wood, wall:TX('plaster','#d8cfb8',2.5), roof, door:TX('wood_planks','#3a2412',1.2), window:M('#ffd27a',{e:'#ffb020',ei:0.7})}, {fit:MTon?MT.fit:null, shadow:true});
  } else {
    mesh(new T.BoxGeometry(12,0.5,7),stone,0,0.25,0,g);
    mesh(new T.BoxGeometry(11,4,6),TX('plaster','#d8cfb8',2.5),0,2.5,0,g);
    const r=mesh(new T.CylinderGeometry(0.01,7.2,3,4,1),roof,0,6.0,0,g); r.rotation.y=Math.PI/4; r.scale.set(1.12,1,0.62);
  }
  const s=new T.Mesh(new T.PlaneGeometry(4.4,0.9),new T.MeshBasicMaterial({map:signTex('ADVENTURE GUILD',512,104,'#2a1a0c','#facc15','#facc15')})); s.position.set(0,3.55,3.45); g.add(s);
  mesh(new T.CylinderGeometry(0.06,0.06,3,6),wood,5.2,g.userData.ridge||6,1,g); const f=mesh(new T.BoxGeometry(1.2,0.7,0.04),M('#7dff8f',{e:'#2a8a3a',ei:0.6}),5.8,(g.userData.ridge||6)+1,1,g); f.castShadow=false;
  return g;
}

function stall(scene, at, cloth, label, labelCol){
  const g=new T.Group(); g.position.set(at.x,0,at.z); scene.add(g);
  const wood=TX('wood_planks','#6a4628',1.5);
  mesh(new T.BoxGeometry(3,1,1.4),wood,0,0.5,0,g);
  [[-1.4,-0.6],[1.4,-0.6],[-1.4,0.6],[1.4,0.6]].forEach(([x,z])=>mesh(new T.CylinderGeometry(0.07,0.07,2.6,5),wood,x,1.3,z,g));
  const aw=mesh(new T.BoxGeometry(3.4,0.12,1.8),M(cloth),0,2.6,0,g); aw.rotation.x=0.15;
  const s=new T.Mesh(new T.PlaneGeometry(2.6,0.55),new T.MeshBasicMaterial({map:signTex(label,512,108,'#140e1c',labelCol,labelCol),side:T.DoubleSide})); s.position.set(0,2.95,0.85); g.add(s);
  return g;
}
function moriDoll(scene){
  const g=stall(scene, STATIONS.doll, '#2e7d32', 'MORI DOLL · NO REFUNDS', '#a3ff12');
  // the grumpy doll shopkeeper
  const d=new T.Group(); d.position.set(0,1.0,-0.1); g.add(d);
  mesh(new T.ConeGeometry(0.3,0.6,8),M('#3fbf5a'),0,0.3,0,d);
  mesh(new T.SphereGeometry(0.22,12,10),M('#f0d2b4'),0,0.78,0,d);
  mesh(new T.SphereGeometry(0.25,12,8,0,Math.PI*2,0,Math.PI*0.6),M('#2e5d2a'),0,0.82,-0.02,d);
  [-0.08,0.08].forEach(x=>{ mesh(new T.SphereGeometry(0.03,6,6),M('#111'),x,0.8,0.19,d); const b=mesh(new T.BoxGeometry(0.09,0.02,0.02),M('#222'),x,0.88,0.19,d); b.rotation.z=x>0?0.5:-0.5; });
  mesh(new T.BoxGeometry(0.1,0.02,0.02),M('#5a1a1a'),0,0.68,0.2,d);
  const sign=new T.Mesh(new T.PlaneGeometry(1.2,0.4),new T.MeshBasicMaterial({map:signTex('STAY OFF MY LAWN',256,84,'#f4ead0','#5a1a1a')}));
  sign.position.set(1.0,1.3,0.72); sign.rotation.z=-0.08; g.add(sign);
  g.userData.doll=d; return g;
}
function outpost(scene){
  const g=stall(scene, STATIONS.outpost, '#6d28d9', 'GUILD OUTPOST', '#ff8af0');
  mesh(new T.CylinderGeometry(0.06,0.06,4.2,6),M('#444'),1.8,2.1,0.6,g);
  const fl=mesh(new T.BoxGeometry(1.1,0.65,0.03),M('#ff8af0',{e:'#8b5cf6',ei:0.6}),2.35,3.8,0.6,g); g.userData.flag=fl;
  mesh(new T.BoxGeometry(0.6,0.5,0.6),M('#2a1e36'),-0.8,1.25,0,g);
  mesh(new T.BoxGeometry(0.6,0.12,0.6),M('#a78bfa'),-0.8,1.55,0,g);
  return g;
}
function alchemy(scene){
  const g=new T.Group(); g.position.set(STATIONS.alchemy.x,0,STATIONS.alchemy.z); scene.add(g);
  mesh(new T.BoxGeometry(2.4,0.9,1.2),M('#5a3b22'),0,0.45,0,g);
  const caul=mesh(new T.SphereGeometry(0.55,12,8,0,Math.PI*2,Math.PI*0.35,Math.PI*0.65),M('#26262c',{side:T.DoubleSide}),1.9,0.7,0,g);
  const brew=mesh(new T.CircleGeometry(0.45,14),M('#7dff8f',{e:'#3aff6a',ei:1}),1.9,0.95,0,g); brew.rotation.x=-Math.PI/2;
  ['#ff4d6d','#22d3ee','#a3ff12','#facc15'].forEach((c,i)=>{ mesh(new T.CylinderGeometry(0.07,0.1,0.3,6),M(c,{e:c,ei:0.5,op:0.85}),-0.8+i*0.4,1.05,0,g); });
  const s=new T.Mesh(new T.PlaneGeometry(2.2,0.45),new T.MeshBasicMaterial({map:signTex('ALCHEMY TABLE',512,104,'#102a14','#a3ff12','#a3ff12'),side:T.DoubleSide})); s.position.set(0,1.75,-0.4); g.add(s);
  mesh(new T.BoxGeometry(0.08,1.2,0.08),M('#5a3b22'),-1.0,1.1,-0.45,g); mesh(new T.BoxGeometry(0.08,1.2,0.08),M('#5a3b22'),1.0,1.1,-0.45,g);
  g.userData.brew=brew; return g;
}
function forge(scene){
  const g=new T.Group(); g.position.set(STATIONS.forge.x,0,STATIONS.forge.z); g.rotation.y=-Math.PI/2; scene.add(g);
  const stone=TX('stone_rubble','#5d5a57',1.4), dark=TX('ash','#2c2a29',1.4);
  mesh(new T.BoxGeometry(3,1.4,2),stone,0,0.7,-0.5,g);
  const fire=mesh(new T.BoxGeometry(1.6,0.3,1),M('#ff7a1a',{e:'#ff4a00',ei:1.2}),0,1.45,-0.5,g);
  // the Dragon's Forge: a great stone dragon head breathing into the hearth
  const dh=new T.Group(); dh.position.set(0,3.2,-1.4); g.add(dh);
  mesh(new T.BoxGeometry(1.6,1.2,1.6),stone,0,0,0,dh);
  const snout=mesh(new T.BoxGeometry(1.1,0.7,1.4),stone,0,-0.25,1.2,dh); snout.rotation.x=0.25;
  mesh(new T.BoxGeometry(1.0,0.2,1.2),dark,0,-0.72,1.0,dh).rotation.x=0.45;
  [-0.5,0.5].forEach(x=>{ mesh(new T.SphereGeometry(0.14,8,6),M('#ffb020',{e:'#ff8000',ei:1.5}),x,0.25,0.75,dh); const h=mesh(new T.ConeGeometry(0.18,1.1,6),dark,x*1.2,0.8,-0.4,dh); h.rotation.x=-0.9; h.rotation.z=-x*0.6; });
  mesh(new T.BoxGeometry(0.3,2.4,0.3),stone,0,1.2,-2.2,g);
  // anvil
  const an=new T.Group(); an.position.set(1.0,0,1.2); g.add(an);
  mesh(new T.BoxGeometry(0.4,0.6,0.4),dark,0,0.3,0,an); mesh(new T.BoxGeometry(0.9,0.25,0.4),M('#3a3a40'),0,0.72,0,an);
  const s=new T.Mesh(new T.PlaneGeometry(2.6,0.5),new T.MeshBasicMaterial({map:signTex("THE DRAGON'S FORGE",512,100,'#1a0a04','#ffb020','#ff6a00'),side:T.DoubleSide})); s.position.set(0,4.3,-0.5); g.add(s);
  // Goblin Armor Smith
  const gob=goblin(); gob.position.set(-0.9,0,1.1); gob.rotation.y=0.4; g.add(gob);
  g.userData.fire=fire; g.userData.goblin=gob; g.userData.anvil=an;
  if(MTon){ // Mori Templates: real flame sprites in the hearth and a flame stream from the dragon's jaws
    const fl=[]; [-0.5,0,0.5].forEach((x,i)=>{ const s=MT.sprite('flame_fire',0.75,1.05+(i===1?0.35:0)); if(s){ s.position.set(x,1.55,-0.5); g.add(s); fl.push(s); } });
    const br=MT.stream(g,new T.Vector3(0,2.75,0.05),new T.Vector3(0,1.7,-0.45),'flame_fire',5); g.userData.flames=fl; g.userData.breath=br; }
  return g;
}
function goblin(){
  const g=new T.Group(); const sk=M('#6f9a3a');
  mesh(new T.CapsuleGeometry(0.22,0.35,4,8),M('#5a3b22'),0,0.6,0,g);
  mesh(new T.BoxGeometry(0.5,0.35,0.05),M('#3a2a1a'),0,0.6,0.2,g); // apron
  const h=new T.Group(); h.position.y=1.15; g.add(h);
  mesh(new T.SphereGeometry(0.22,12,10),sk,0,0,0,h);
  [-1,1].forEach(s=>{ const e=mesh(new T.ConeGeometry(0.08,0.38,4),sk,s*0.28,0.04,0,h); e.rotation.z=-s*1.25; mesh(new T.SphereGeometry(0.04,6,6),M('#ffd23f',{e:'#ff9a00',ei:0.8}),s*0.08,0.04,0.19,h); });
  const n=mesh(new T.ConeGeometry(0.05,0.18,5),sk,0,-0.03,0.25,h); n.rotation.x=Math.PI/2;
  mesh(new T.CylinderGeometry(0.2,0.24,0.1,10),M('#444'),0,0.18,0,h);
  const arm=new T.Group(); arm.position.set(0.28,0.85,0); g.add(arm);
  mesh(new T.CapsuleGeometry(0.06,0.3,3,6),sk,0,-0.18,0,arm);
  mesh(new T.BoxGeometry(0.18,0.1,0.1),M('#777'),0,-0.42,0.06,arm); mesh(new T.CylinderGeometry(0.02,0.02,0.3,4),M('#5a3b22'),0,-0.36,0,arm);
  g.userData.arm=arm; return g;
}

function tavern(scene, colliders){
  const g=new T.Group(); g.position.set(STATIONS.tavern.x,0,STATIONS.tavern.z); g.rotation.y=Math.PI/2; scene.add(g); // front faces +x (the plaza)
  const stone=TX('stone_block','#7d776e',1.6), timber=TX('wood_planks','#5b3a1e',1.5), plaster=TX('plaster','#cdbb98',2.5), floor=TX('wood_planks','#6e4c2e',1.5);
  const W=11, D=9;
  mesh(new T.BoxGeometry(W,0.3,D),floor,0,0.15,0,g);
  // stone lower walls + timber frame upper walls on back and sides
  mesh(new T.BoxGeometry(W,1.6,0.5),stone,0,0.8,-D/2,g); mesh(new T.BoxGeometry(W,2.4,0.3),plaster,0,2.8,-D/2,g);
  [-1,1].forEach(s=>{ mesh(new T.BoxGeometry(0.5,1.6,D),stone,s*W/2,0.8,0,g); mesh(new T.BoxGeometry(0.3,2.4,D),plaster,s*W/2,2.8,0,g); });
  for(let i=0;i<=5;i++){ mesh(new T.BoxGeometry(0.3,4.2,0.3),timber,-W/2+i*W/5,2.1,D/2,g); mesh(new T.BoxGeometry(0.32,2.4,0.32),timber,-W/2+i*W/5,2.8,-D/2+0.1,g); }
  mesh(new T.BoxGeometry(W+0.4,0.35,0.4),timber,0,4.1,D/2,g); mesh(new T.BoxGeometry(W+0.4,0.35,0.4),timber,0,4.1,-D/2,g);
  [-1,1].forEach(s=>{ const x=mesh(new T.BoxGeometry(0.18,3,0.18),timber,s*W/2,2.8,0,g); x.rotation.x=0.9; });
  // roof (hidden when the player walks inside)
  const roof=new T.Group(); g.add(roof);
  // v3.3 fix: each slope must tip its OUTER edge down (rotation.x = +s*0.5). The old -s*0.5 raised the eaves and dropped the ridge, so the brown roof was an upside-down V.
  [-1,1].forEach(s=>{ const r=mesh(new T.BoxGeometry(W+1.2,0.25,D*0.62),TX('roof_shingle','#4a2f2a',1.6),0,5.4,s*D*0.26,roof); r.rotation.x=s*0.5; });
  { const sh=new T.Shape(); sh.moveTo(-D/2-0.1,4.0); sh.lineTo(D/2+0.1,4.0); sh.lineTo(0,6.55); sh.closePath(); // plaster gable ends under the ridge
    [-1,1].forEach(s=>{ const ge=new T.ExtrudeGeometry(sh,{depth:0.3,bevelEnabled:false}); ge.translate(0,0,-0.15); const o=mesh(ge,plaster,s*W/2,0,0,roof); o.rotation.y=Math.PI/2; }); }
  // big stage at the back
  const st=mesh(new T.BoxGeometry(7,0.8,3),M('#3b2614'),0,0.7,-D/2+1.9,g);
  const edge=mesh(new T.BoxGeometry(7.05,0.08,0.08),M('#22d3ee',{e:'#22d3ee',ei:1.5}),0,1.12,-D/2+3.42,g);
  mesh(new T.BoxGeometry(0.08,3,0.08),M('#ff3df0',{e:'#ff3df0',ei:1.5}),-3.5,2.3,-D/2+0.5,g);
  mesh(new T.BoxGeometry(0.08,3,0.08),M('#facc15',{e:'#facc15',ei:1.5}),3.5,2.3,-D/2+0.5,g);
  // tables & stools & bar
  for(let i=0;i<4;i++){ const x=-3.6+i*2.4, z=1.4+(i%2)*1.6; mesh(new T.CylinderGeometry(0.6,0.6,0.08,10),timber,x,0.95,z,g); mesh(new T.CylinderGeometry(0.08,0.12,0.8,6),timber,x,0.55,z,g);
    [-0.9,0.9].forEach(o=>mesh(new T.CylinderGeometry(0.22,0.22,0.5,8),M('#4a3018'),x+o,0.5,z,g)); mesh(new T.CylinderGeometry(0.07,0.06,0.18,6),M('#e6b450',{e:'#a0601a',ei:0.3}),x,1.08,z,g); }
  mesh(new T.BoxGeometry(0.8,1.1,4),timber,-W/2+0.9,0.85,1.2,g);
  // sign
  const s=new T.Mesh(new T.PlaneGeometry(4.6,0.9),new T.MeshBasicMaterial({map:signTex('The Retired Bard',512,100,'#1a0f1f','#ff8af0','#ff3df0')})); s.position.set(0,4.8,D/2+0.25); g.add(s);
  // drifting neon lights: blue, magenta, gold
  const lights=[]; [['#2f6bff',0],['#ff2bd6',2.1],['#ffc42b',4.2]].forEach(([c,ph])=>{
    const l=new T.PointLight(c,9,12,1.6); l.position.set(0,3,0); g.add(l);
    const orb=new T.Mesh(new T.SphereGeometry(0.16,8,6),new T.MeshBasicMaterial({color:c})); l.add(orb);
    lights.push({l,ph,orb}); });
  // walls as colliders (world coords) — front open
  const wx=STATIONS.tavern.x, wz=STATIONS.tavern.z; // rotation +90°: local (x,z) -> world (wx+z, wz-x)
  const L2W=(x,z)=>[wx+z, wz-x];
  [[[-W/2,-D/2],[W/2,-D/2]],[[-W/2,-D/2],[-W/2,D/2]],[[W/2,-D/2],[W/2,D/2]],[[-3.5,-D/2+3.4],[3.5,-D/2+3.4]]].forEach(([a,b],i)=>{ const p=L2W(a[0],a[1]), q=L2W(b[0],b[1]); colliders.segs.push([p[0],p[1],q[0],q[1], i===3?'stage':null]); });
  g.userData={roof,lights,W,D,edge, stageWorld:L2W(0,-D/2+1.9), inside:(x,z)=>{ const lx=-(z-wz), lz=(x-wx); return Math.abs(lx)<W/2&&Math.abs(lz)<D/2; }};
  return g;
}

function dungeonEntrance(scene, colliders){
  const at=STATIONS.dungeon; const y=height(at.x,at.z);
  const g=new T.Group(); g.position.set(at.x,y-0.3,at.z); scene.add(g);
  const st=M('#5a5650');
  [-1.6,1.6].forEach(x=>mesh(new T.BoxGeometry(0.9,3.4,1.2),st,x,1.7,0,g));
  mesh(new T.BoxGeometry(4.4,0.9,1.3),st,0,3.6,0,g);
  const dark=new T.Mesh(new T.PlaneGeometry(2.3,3),new T.MeshBasicMaterial({color:'#05030a'})); dark.position.set(0,1.5,0.1); g.add(dark);
  [-1.6,1.6].forEach(x=>{ mesh(new T.CylinderGeometry(0.08,0.08,0.6,5),M('#3a2412'),x,3.9+0.3,0.5,g); mesh(new T.OctahedronGeometry(0.16),M('#ff8a2a',{e:'#ff6a00',ei:1.5}),x,4.6,0.5,g); });
  const s=new T.Mesh(new T.PlaneGeometry(3,0.55),new T.MeshBasicMaterial({map:signTex('THE UNDERCROFT',512,94,'#0a0608','#ff8a2a','#ff4a00')})); s.position.set(0,3.6,0.67); g.add(s);
  return g;
}

/* ---------- resources ---------- */
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function oreSprite(text, col){
  const c=document.createElement('canvas'); c.width=512; c.height=96; const x=c.getContext('2d');
  x.fillStyle='rgba(12,10,18,0.86)'; x.fillRect(8,8,496,80);
  x.strokeStyle=col||'#f4e2c2'; x.lineWidth=6; x.strokeRect(8,8,496,80);
  x.fillStyle='#f4ead8'; x.font='bold 40px Georgia, serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(text, 256, 48);
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace;
  const s=new T.Sprite(new T.SpriteMaterial({map:t, depthWrite:false})); s.scale.set(3.4,0.64,1); s.position.y=2.35; s.name='oreLabel'; s.userData.tip=text; return s;
}
function resources(scene, colliders){
  const R=rng(42), woodR=rng(99), nodes=[];
  const trunk=M('#5b3a1e'), leafA=M('#2f6b34'), leafB=M('#3f8a3a'), stumpM=M('#7a5634');
  const tg=new T.CylinderGeometry(0.22,0.32,2,6), cg=new T.ConeGeometry(1.4,2.6,7), cg2=new T.ConeGeometry(1.0,2,7), ig=new T.IcosahedronGeometry(1.4,0);
  for(let i=0;i<46;i++){ const x=28+R()*48, z=-34+R()*68; const y=height(x,z);
    const g=new T.Group(); g.position.set(x,y,z); scene.add(g);
    const crown=new T.Group(); g.add(crown);
    mesh(tg,trunk,0,1,0,crown);
    if(R()<0.6){ mesh(cg,leafA,0,2.8,0,crown); mesh(cg2,leafB,0,4,0,crown); } else mesh(ig,leafB,0,3,0,crown);
    const stump=mesh(new T.CylinderGeometry(0.3,0.34,0.4,6),stumpM,0,0.2,0,g); stump.visible=false;
    const s=0.8+R()*0.5; crown.scale.setScalar(s);
    const sp=window.LUMBER?LUMBER.pick('forest', woodR):'oak';
    const rid=window.LUMBER&&LUMBER.species(sp)?LUMBER.species(sp).log:'oak_log';
    nodes.push({type:'timber', rid, x, z, g, crown, stump, ready:true, regrow:0, place:'Old Wood'}); colliders.circles.push({x,z,r:0.5}); }
  const rockM=M('#7a7f86'), oreM=M('#2dd4bf',{e:'#0f766e',ei:0.6}), goldM=M('#facc15',{e:'#a16207',ei:0.5});
  for(let i=0;i<16;i++){ const x=-30-R()*32, z=-26+R()*52; const y=height(x,z);
    const rid=window.ORES?ORES.starter(i):'bog_iron_ore';
    const spec=window.ORES?ORES.kind(rid):null;
    const fleck=spec?M(spec.col,{e:spec.col,ei:0.45}):oreM;
    const g=new T.Group(); g.position.set(x,y,z); g.name='ore_'+rid; scene.add(g); const crown=new T.Group(); g.add(crown);
    const r=mesh(new T.DodecahedronGeometry(1.1,0),rockM,0,0.6,0,crown); r.scale.set(1.2,0.8,1); r.rotation.y=R()*6;
    for(let k=0;k<4;k++){ const sh=mesh(new T.OctahedronGeometry(0.22),k%2?fleck:goldM,(R()-0.5)*1.4,0.9+R()*0.3,(R()-0.5)*1.2,crown); sh.rotation.set(R(),R(),R()); }
    const stump=mesh(new T.DodecahedronGeometry(0.5,0),rockM,0,0.2,0,g); stump.visible=false;
    const label=oreSprite(window.ORES?ORES.worldLabel(rid):'Bog Iron Ore', spec&&spec.col);
    g.add(label);
    g.userData.tip=window.ORES?ORES.tip(rid):'Bog Iron Ore.';
    nodes.push({type:'ore', rid, x, z, g, crown, stump, label, ready:true, regrow:0, place:'Grey Quarry'}); colliders.circles.push({x,z,r:1.1}); }
  const herbA=M('#4caf50'), flower=M('#c4ff5a',{e:'#7dff3a',ei:0.7}), flower2=M('#ff8af0',{e:'#ff3df0',ei:0.5});
  const herbIds=['mint','chamomile','lavender','calendula','yarrow','sage','comfrey','rosemary'];
  for(let i=0;i<16;i++){ const x=-22+R()*44, z=28+R()*22; const y=height(x,z);
    const g=new T.Group(); g.position.set(x,y,z); scene.add(g); const crown=new T.Group(); g.add(crown);
    for(let k=0;k<6;k++){ const l=mesh(new T.ConeGeometry(0.12,0.7,4),herbA,(R()-0.5)*0.6,0.3,(R()-0.5)*0.6,crown); l.rotation.set((R()-0.5)*0.6,0,(R()-0.5)*0.6); }
    mesh(new T.SphereGeometry(0.12,6,5),R()<0.5?flower:flower2,0,0.75,0,crown);
    const stump=mesh(new T.CylinderGeometry(0.2,0.25,0.06,6),M('#4a3018'),0,0.03,0,g); stump.visible=false;
    nodes.push({type:'herbs', rid:herbIds[i%herbIds.length], x, z, g, crown, stump, ready:true, regrow:0, place:'Herb Meadow'}); }
  return nodes;
}

/* ---------- buildable structures ---------- */
const STRUCTS={
  house:     {label:'House',      cost:{timber:6, ore:2},           time:9,  r:2.6, desc:'Timber cottage. More Guild folk.'},
  wall:      {label:'Stone Wall', cost:{ore:4},                     time:6,  r:2.2, desc:'A stout wall section.'},
  lantern:   {label:'Neon Lantern',cost:{timber:1, ore:1},          time:4,  r:0.4, desc:'Lights the night, neon.'},
  market:    {label:'Market',     cost:{timber:8, ore:3, larpy:2},  time:12, r:3.2, desc:'Stalls for traders.'},
  shrine:    {label:'Shrine',     cost:{timber:3, ore:6, herbs:2},  time:12, r:2.4, desc:'A quiet shrine. Re-centering.'},
  tower:     {label:'Watchtower', cost:{timber:8, ore:4},           time:12, r:1.8, desc:'See the dungeon road.'}
};
function buildStructure(type, seed){
  const R=rng(seed||7); const g=new T.Group(); const wood=TX('wood_planks','#7a5634',1.5), dark=TX('bark','#4a2f1a',1.2), stone=TX('stone_block','#8d8a83',1.6), castle=TX('stone_castle','#8d8a83',2.2);
  if(type==='house'){
    const r1=R(), r2=R(); const WL=MTon?MT.list('buildings.walls',['#d8cfb8']):['#d8cfb8','#cdbb98','#e0d6c2'], RL=MTon?MT.list('buildings.roofs',['#8b3a2a']):['#8b3a2a','#3d5a3a','#4a3a6a'];
    const wc=WL[Math.floor(r1*WL.length)], rc=RL[Math.floor(r2*RL.length)];
    const pitch=window.GROUNDED?GROUNDED.pitchFor('grass',r1).rad:34*Math.PI/180;
    if(window.GROUNDED){
      const spec=GROUNDED.cottageFrame({w:4.0, d:3.4, wallH:2.5, pitch, overhang:0.4, doorW:0.95});
      GROUNDED.attachFrame(T, g, spec, {stone, timber:dark, wall:TX('plaster',wc,2.5), roof:TX('roof_shingle',rc,1.4), door:dark, window:M('#ffd27a',{e:'#ffb020',ei:0.8})}, {fit:MTon?MT.fit:null, shadow:true});
    } else {
      mesh(new T.BoxGeometry(4,0.3,3.4),stone,0,0.15,0,g); mesh(new T.BoxGeometry(3.6,2.4,3),TX('plaster',wc,2.5),0,1.5,0,g);
      const r=mesh(new T.CylinderGeometry(0.01,3.2,1.8,4),TX('roof_shingle',rc,1.4),0,3.6,0,g); r.rotation.y=Math.PI/4; r.scale.z=0.9;
      g.userData.h=4.6;
    }
  } else if(type==='wall'){
    mesh(new T.BoxGeometry(4.4,1.8,0.8),castle,0,0.9,0,g);
    for(let i=0;i<4;i++) mesh(new T.BoxGeometry(0.7,0.5,0.9),castle,-1.65+i*1.1,2.05,0,g);
    g.userData.h=2.3;
  } else if(type==='lantern'){
    mesh(new T.CylinderGeometry(0.08,0.12,2.8,6),M('#2a2a30'),0,1.4,0,g);
    mesh(new T.BoxGeometry(0.6,0.08,0.08),M('#2a2a30'),0.25,2.75,0,g);
    const c=['#22d3ee','#ff3df0','#facc15','#a3ff12'][Math.floor(R()*4)];
    const lamp=mesh(new T.OctahedronGeometry(0.25),M(c,{e:c,ei:1.6}),0.5,2.45,0,g); lamp.castShadow=false;
    const halo=new T.Mesh(new T.SphereGeometry(0.7,10,8),new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.15,depthWrite:false,blending:T.AdditiveBlending})); halo.position.copy(lamp.position); g.add(halo);
    g.userData.lamp=lamp; g.userData.halo=halo; g.userData.h=3;
  } else if(type==='market'){
    const cl=['#ff4d6d','#22d3ee','#facc15'];
    for(let i=0;i<3;i++){ const x=(i-1)*2.2; mesh(new T.BoxGeometry(1.8,0.9,1),wood,x,0.45,0,g);
      [-0.85,0.85].forEach(o=>mesh(new T.CylinderGeometry(0.05,0.05,2.2,5),dark,x+o,1.1,-0.4,g));
      const a=mesh(new T.BoxGeometry(2,0.08,1.4),M(cl[i]),x,2.2,0.1,g); a.rotation.x=0.25;
      for(let k=0;k<3;k++) mesh(new T.SphereGeometry(0.13,6,5),M(['#ff7a1a','#a3ff12','#ff4d6d'][k]),x-0.5+k*0.5,1.0,0.1,g); }
    g.userData.h=2.5;
  } else if(type==='shrine'){
    mesh(new T.CylinderGeometry(2,2.2,0.4,8),TX('stone_flag','#8d8a83',1.6),0,0.2,0,g);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; mesh(new T.CylinderGeometry(0.18,0.2,2.4,6),TX('plaster','#c9c2b0',1.5),Math.cos(a)*1.6,1.6,Math.sin(a)*1.6,g); }
    mesh(new T.CylinderGeometry(1.9,1.9,0.25,8),stone,0,2.9,0,g);
    const cr=mesh(new T.OctahedronGeometry(0.45),M('#7dff8f',{e:'#3aff6a',ei:1.4}),0,1.3,0,g); cr.castShadow=false; g.userData.crystal=cr;
    mesh(new T.BoxGeometry(0.8,0.7,0.8),stone,0,0.75,0,g); g.userData.h=3.1;
  } else if(type==='tower'){
    mesh(new T.CylinderGeometry(1.2,1.5,6,8),castle,0,3,0,g);
    mesh(new T.CylinderGeometry(1.7,1.7,0.3,8),wood,0,6.1,0,g);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; mesh(new T.BoxGeometry(0.3,0.6,0.3),castle,Math.cos(a)*1.5,6.5,Math.sin(a)*1.5,g); }
    mesh(new T.ConeGeometry(1.8,1.6,8),TX('roof_shingle','#4a2f2a',1.4),0,7.8,0,g);
    const f=mesh(new T.BoxGeometry(0.8,0.5,0.03),M('#7dff8f',{e:'#3aff6a',ei:0.6}),0.45,9.1,0,g); mesh(new T.CylinderGeometry(0.03,0.03,1.2,4),dark,0,8.9,0,g);
    g.userData.h=9.4;
  }
  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  return g;
}
/* building plots: grid cells that avoid the fixed buildings, fence line and roads, nearest first */
function plots(){
  const fixed=[[-15,-15,3.4],[0,-12,7],[-8,-3,2.8],[8,-3,2.8],[-6,6,2.4],[9,9,3.6],[-13,12,7.6],[0,-46,4],[0,0,5],[13,-11,2.4]];
  const out=[];
  for(let x=-42;x<=42;x+=6) for(let z=-40;z<=42;z+=6){
    const px=x+((z/6)%2?3:0), pz=z; const r=Math.hypot(px,pz); if(r>44||r<7) continue;
    if(Math.abs(px)<3.2||Math.abs(pz)<3.2) continue;                 // roads through the gates
    if(Math.abs(Math.abs(px)-FENCE)<3&&Math.abs(pz)<FENCE+3) continue;
    if(Math.abs(Math.abs(pz)-FENCE)<3&&Math.abs(px)<FENCE+3) continue;
    if(fixed.some(([fx,fz,fr])=>Math.hypot(px-fx,pz-fz)<fr+3)) continue;
    if(px>26||px<-28||pz>26) continue;                                   // leave the forest, quarry and herb meadow
    if(Math.abs(px)<8&&pz<-24) continue;                                 // dungeon road
    out.push({x:px,z:pz,r});
  }
  out.sort((a,b)=>a.r-b.r);
  return out;
}

/* ---------- dungeon (tile grid, 2 m tiles) ---------- */
function buildDungeon(){
  const Wt=26, Ht=46, TILE=2; const grid=[]; for(let y=0;y<Ht;y++){ grid.push(new Array(Wt).fill(1)); }
  const carve=(x0,y0,x1,y1)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) grid[y][x]=0; };
  const rooms=[ {x0:9,y0:38,x1:16,y1:44,name:'Entry Vault'}, {x0:4,y0:26,x1:14,y1:33,name:'Ossuary'}, {x0:13,y0:14,x1:22,y1:21,name:'Drowned Chapel'}, {x0:4,y0:1,x1:17,y1:10,name:'Ooze Pit'} ];
  rooms.forEach(r=>carve(r.x0,r.y0,r.x1,r.y1));
  carve(11,34,12,37); carve(13,22,14,25); carve(8,22,14,23); carve(16,11,17,13); carve(10,11,17,12);
  const scene=new T.Scene(); scene.background=new T.Color('#07050b'); scene.fog=new T.Fog('#07050b',8,34);
  scene.add(new T.HemisphereLight('#6a6aa0','#1a1008',0.7)); scene.add(new T.AmbientLight('#403850',0.5));
  const wallG=new T.BoxGeometry(TILE,3.2,TILE), floorG=new T.BoxGeometry(TILE,0.2,TILE);
  let nw=0,nf=0; grid.forEach(r=>r.forEach(v=>v?nw++:nf++));
  const wM=TX('stone_castle','#4a4550',2.2), fM=TX('stone_flag','#2e2a30',2); if(MTon){ MT.fit(wallG,wM); MT.fit(floorG,fM); }
  const walls=new T.InstancedMesh(wallG,wM,nw), floors=new T.InstancedMesh(floorG,fM,nf);
  const m4=new T.Matrix4(); let iw=0,iF=0;
  const tw=(x,y)=>[(x-Wt/2)*TILE+TILE/2,(y-Ht/2)*TILE+TILE/2];
  for(let y=0;y<Ht;y++) for(let x=0;x<Wt;x++){ const [wx,wz]=tw(x,y);
    if(grid[y][x]){ const nb=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>grid[y+dy]&&grid[y+dy][x+dx]===0); m4.makeTranslation(wx, nb?1.6:-5, wz); walls.setMatrixAt(iw++,m4); }
    else { m4.makeTranslation(wx,-0.1,wz); floors.setMatrixAt(iF++,m4); } }
  walls.receiveShadow=floors.receiveShadow=true; scene.add(walls); scene.add(floors);
  const center=r=>{ const a=tw(r.x0,r.y0), b=tw(r.x1,r.y1); return [(a[0]+b[0])/2,(a[1]+b[1])/2]; };
  const lights=[]; rooms.forEach((r,i)=>{ const [cx,cz]=center(r); const c=i===3?'#7dff8f':'#ff8a2a';
    const l=new T.PointLight(c,i===3?14:9,i===3?22:16,1.5); l.position.set(cx,2.6,cz); scene.add(l); lights.push(l);
    const br=mesh(new T.CylinderGeometry(0.3,0.2,0.8,6),M('#3a3a40'),cx+((i%2)?3:-3),0.4,cz-2,scene); mesh(new T.OctahedronGeometry(0.25),M(c,{e:c,ei:1.6}),br.position.x,1.0,br.position.z,scene); });
  const torch=new T.PointLight('#ffb070',10,14,1.4); scene.add(torch);
  // exit stairs (entry) and portal (boss room)
  const [ex,ez]=center(rooms[0]); const stairs=new T.Group(); stairs.position.set(ex,0,ez+5); scene.add(stairs);
  for(let i=0;i<4;i++) mesh(new T.BoxGeometry(3,0.25,0.6),M('#5a5650'),0,0.12+i*0.25,-i*0.6+0.6,stairs);
  const [bx,bz]=center(rooms[3]); const portal=new T.Mesh(new T.TorusGeometry(1.1,0.12,8,24),M('#7dff8f',{e:'#3aff6a',ei:1.5})); portal.position.set(bx,1.5,bz-7); scene.add(portal);
  const pDisc=new T.Mesh(new T.CircleGeometry(1.0,20),new T.MeshBasicMaterial({color:'#3aff6a',transparent:true,opacity:0.35,side:T.DoubleSide})); pDisc.position.copy(portal.position); scene.add(pDisc);
  const walk=(wx,wz)=>{ const x=Math.floor(wx/TILE+Wt/2), y=Math.floor(wz/TILE+Ht/2); return !!(grid[y]&&grid[y][x]===0); };
  return {scene, grid, rooms, center, walk, torch, lights, stairs, portal, pDisc, start:[ex,ez+3], exitAt:[ex,ez+5.2], portalAt:[bx,bz-7], tw};
}

/* creatures for the dungeon */
function creatureMesh(mon){
  const g=new T.Group(); const c=M(mon.color), dark=M(HERO.shade(mon.color,0.5));
  if(mon.shape==='rat'){
    mesh(new T.SphereGeometry(0.4,10,8),c,0,0.35,0,g).scale.set(1,0.75,1.5);
    const h=mesh(new T.ConeGeometry(0.22,0.5,8),c,0,0.4,0.65,g); h.rotation.x=Math.PI/2;
    [-0.12,0.12].forEach(x=>{ mesh(new T.SphereGeometry(0.05,6,6),M('#ff2a2a',{e:'#ff0000',ei:1}),x,0.5,0.6,g); mesh(new T.SphereGeometry(0.1,6,6),dark,x*1.4,0.62,0.45,g); });
    const t=mesh(new T.CylinderGeometry(0.03,0.01,0.9,4),M('#c98a8a'),0,0.3,-0.9,g); t.rotation.x=Math.PI/2.2;
  } else if(mon.shape==='skel'){
    const zomb=mon.kind==='zombie';
    mesh(new T.BoxGeometry(0.42,0.6,0.22),c,0,1.15,0,g);
    for(let i=0;i<3;i++) mesh(new T.BoxGeometry(0.46,0.04,0.25),dark,0,1.0+i*0.15,0,g);
    mesh(new T.SphereGeometry(0.2,10,8),c,0,1.65,0,g);
    [-0.07,0.07].forEach(x=>mesh(new T.SphereGeometry(0.045,6,6),M(zomb?'#ffe14a':'#7dff8f',{e:zomb?'#ffcc00':'#3aff6a',ei:1.5}),x,1.67,0.17,g));
    const arms=[]; [-0.28,0.28].forEach(x=>{ const a=new T.Group(); a.position.set(x,1.4,0); g.add(a); mesh(new T.BoxGeometry(0.08,0.65,0.08),c,0,-0.3,0,a); arms.push(a); });
    [-0.12,0.12].forEach(x=>mesh(new T.BoxGeometry(0.1,0.85,0.1),c,x,0.43,0,g));
    if(!zomb){ const sw=mesh(new T.BoxGeometry(0.05,0.7,0.12),M('#9aa0a8'),0,-0.7,0.15,arms[1]); sw.rotation.x=0.4; }
    g.userData.arms=arms;
  } else { // slime / ooze
    const body=mesh(new T.SphereGeometry(0.6,16,12),new T.MeshLambertMaterial({color:mon.color,transparent:true,opacity:0.8,emissive:mon.color,emissiveIntensity:0.2}),0,0.5,0,g);
    body.scale.set(1,0.75,1); g.userData.body=body;
    [-0.18,0.18].forEach(x=>mesh(new T.SphereGeometry(0.08,8,6),M('#111'),x,0.7,0.5,g));
    mesh(new T.OctahedronGeometry(0.15),M('#ffd23f',{e:'#ffb000',ei:1}),0,0.5,0,g);
  }
  if(mon.aura){ const a=new T.Mesh(new T.SphereGeometry(0.9,12,10),new T.MeshBasicMaterial({color:mon.aura,transparent:true,opacity:0.16,depthWrite:false,blending:T.AdditiveBlending})); a.position.y=0.7; g.add(a); g.userData.aura=a; }
  g.scale.setScalar(mon.size);
  return g;
}
function chestMesh(big){
  const g=new T.Group(); const s=big?1.4:1;
  mesh(new T.BoxGeometry(0.9*s,0.55*s,0.6*s),M('#6a4628'),0,0.28*s,0,g);
  const lid=new T.Group(); lid.position.set(0,0.55*s,-0.3*s); g.add(lid);
  mesh(new T.BoxGeometry(0.92*s,0.2*s,0.62*s),M('#7a5634'),0,0.1*s,0.3*s,lid);
  mesh(new T.BoxGeometry(0.15*s,0.18*s,0.05*s),M('#facc15',{e:'#a16207',ei:0.6}),0,0.0,0.62*s,g).position.y=0.45*s;
  g.userData.lid=lid; return g;
}

function bench(scene){
  const g=new T.Group(); g.position.set(STATIONS.bench.x,0,STATIONS.bench.z); g.rotation.y=-0.6; scene.add(g);
  mesh(new T.BoxGeometry(2.6,0.12,1.3),M('#4a2f1a'),0,0.95,0,g);
  [[-1.2,-0.55],[1.2,-0.55],[-1.2,0.55],[1.2,0.55]].forEach(([x,z])=>mesh(new T.BoxGeometry(0.12,0.95,0.12),M('#3a2412'),x,0.47,z,g));
  const rune=mesh(new T.RingGeometry(0.25,0.35,6),M('#8b5cf6',{e:'#a78bfa',ei:1.4,side:T.DoubleSide}),-0.5,1.02,0,g); rune.rotation.x=-Math.PI/2;
  mesh(new T.OctahedronGeometry(0.16),M('#22d3ee',{e:'#22d3ee',ei:1.2}),-0.5,1.35,0,g);
  mesh(new T.BoxGeometry(0.5,0.06,0.35),M('#e8dcb0'),0.6,1.04,0.1,g);
  mesh(new T.CylinderGeometry(0.02,0.02,0.3,4),M('#c9a227'),0.9,1.15,-0.2,g).rotation.z=0.7;
  const s=new T.Mesh(new T.PlaneGeometry(2.6,0.45),new T.MeshBasicMaterial({map:signTex('ITEM CREATION BENCH',512,90,'#120a1f','#a78bfa','#8b5cf6'),side:T.DoubleSide})); s.position.set(0,1.9,-0.6); g.add(s);
  mesh(new T.BoxGeometry(0.08,1,0.08),M('#3a2412'),-1.2,1.4,-0.6,g); mesh(new T.BoxGeometry(0.08,1,0.08),M('#3a2412'),1.2,1.4,-0.6,g);
  g.userData.rune=rune; return g;
}
/* Mori Templates: gravel road ribbons through the four gates and up to the dungeon (pack only; nothing is added without it) */
function roads(scene,hf){ if(!MTon) return null; return MT.road(scene,[[0,FENCE+8,0,4.2],[FENCE+8,0,4.2,0],[-FENCE-8,0,-4.2,0],[0,-FENCE-8,0,-43],[0,-FENCE+1,0,-FENCE-8]],hf||((x,z)=>window.WORLD.height(x,z)),{width:3.6,step:1.5,scale:3,lift:0.05}); }

function enchantForge(scene){
  const g=new T.Group(); g.position.set(STATIONS.enchantForge.x,0,STATIONS.enchantForge.z); scene.add(g);
  mesh(new T.BoxGeometry(2.2,1.0,1.4),M('#3a2a4a'),0,0.5,0,g);
  const rune=mesh(new T.TorusGeometry(0.55,0.06,8,24),M('#a3ff12',{e:'#a3ff12',ei:1.2}),0,1.35,0,g); rune.rotation.x=Math.PI/2;
  mesh(new T.CylinderGeometry(0.15,0.2,1.6,8),M('#2a1a3a',{e:'#3aff6a',ei:0.4}),0,1.4,0,g);
  const s=new T.Mesh(new T.PlaneGeometry(2.4,0.4),new T.MeshBasicMaterial({map:signTex('ENCHANTING FORGE',512,96,'#1a1020','#a3ff12','#7dff8f'),side:T.DoubleSide})); s.position.set(0,2.2,-0.6); g.add(s);
  g.userData.rune=rune; return g;
}
function enchantCircle(scene){
  const g=new T.Group(); g.position.set(STATIONS.enchantCircle.x,0,STATIONS.enchantCircle.z); scene.add(g);
  const ring=mesh(new T.TorusGeometry(1.6,0.08,8,40),M('#8b5cf6',{e:'#8b5cf6',ei:0.9}),0,0.05,0,g); ring.rotation.x=-Math.PI/2;
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; mesh(new T.CylinderGeometry(0.08,0.1,0.7,6),M('#c9a227',{e:'#c9a227',ei:0.5}),Math.cos(a)*1.6,0.35,Math.sin(a)*1.6,g); }
  const s=new T.Mesh(new T.PlaneGeometry(2.4,0.4),new T.MeshBasicMaterial({map:signTex('ENCHANTING CIRCLE',512,96,'#1a1028','#d8b4ff','#8b5cf6'),side:T.DoubleSide})); s.position.set(0,1.6,0); g.add(s);
  g.userData.ring=ring; return g;
}

window.WORLD={roads, bench, height, FENCE, GATE, STATIONS, terrain, fence, guildHall, moriDoll, outpost, alchemy, forge, enchantForge, enchantCircle, tavern, dungeonEntrance, resources, STRUCTS, buildStructure, plots, buildDungeon, creatureMesh, chestMesh, signTex, goblin};
})();
