/* Mori flowers (v3.3): procedural low-poly flowers built from geometry — petals around a center, a stem and two leaves.
   One merged BufferGeometry per species-variant, drawn with ONE InstancedMesh each (max 14 draw calls for every flower on screen).
   Petal vertices are tinted per instance (petal colour picked by seed); center / stem / leaf colours are vertex colours.
   Colours come from the Mori Templates palette (pal.flowers, sampled from Robert's garden photos) with a procedural fallback. */
(function(){
'use strict';
const T=THREE, MTon=!!(window.MT&&MT.on);
const FB={ stems:['#5f8a25','#2f4f13','#647b1c'], leaves:['#87ad18','#5f8a25','#3f6a1a'],
  zinnia:{petals:['#c0142a','#990118','#e0452c'],center:'#d9a521',n:[12,18]}, marigold:{petals:['#e09a05','#f0b81a','#e2c403'],center:'#a56a09',n:[10,14]},
  vinca:{petals:['#de3c91','#f20f53','#f4e6ee'],center:'#c21e5a',n:[5,5]}, sunflower:{petals:['#e6bc03','#f2c81c'],center:'#4a2e14',n:[14,22]},
  canna:{petals:['#db301e','#ee5a2a'],center:'#a8221a',n:[4,6]}, gloomrose:{petals:['#6a2c5c','#b64a66','#4a2a5a'],center:'#2a1830',n:[6,9]},
  squash:{petals:['#e3bb02','#f0cf3a'],center:'#c08a00',n:[5,5]} };
// shape: h stem height (m), r petal length, w petal width, cup tilt (rad, + = up), rings, center radius
const SHAPE={ zinnia:{h:0.55,L:0.13,w:0.07,cup:0.25,rings:2,c:0.045},  marigold:{h:0.38,L:0.09,w:0.07,cup:0.55,rings:3,c:0.03},
  vinca:{h:0.28,L:0.10,w:0.10,cup:0.08,rings:1,c:0.018},   sunflower:{h:1.35,L:0.17,w:0.06,cup:0.12,rings:1,c:0.12},
  canna:{h:0.95,L:0.20,w:0.07,cup:1.05,rings:1,c:0.02},    gloomrose:{h:0.5,L:0.08,w:0.08,cup:0.9,rings:3,c:0.02},
  squash:{h:0.22,L:0.13,w:0.08,cup:0.75,rings:1,c:0.03} };
const NAMES=Object.keys(SHAPE);
function pal(){ const P=MTon&&window.MORI_TEMPLATES&&MORI_TEMPLATES.pal&&MORI_TEMPLATES.pal.flowers; const o={};
  NAMES.forEach(k=>{ const s=(P&&P[k])||{}; o[k]={petals:(s.petals&&s.petals.length)?s.petals:FB[k].petals, center:s.center||FB[k].center, n:s.n||FB[k].n}; });
  o.stems=(P&&P.stems)||FB.stems; o.leaves=(P&&P.leaves)||FB.leaves; return o; }
const PAL=pal();
/* --- geometry --- */
function build(name, n){ const S0=SHAPE[name], HK=1.3, S=Object.assign({},S0,{L:S0.L*HK,w:S0.w*HK,c:S0.c*HK}), P=PAL[name], pos=[], col=[], c=new T.Color(), v=new T.Vector3();
  const stemC=new T.Color(PAL.stems[NAMES.indexOf(name)%PAL.stems.length]), leafC=new T.Color(PAL.leaves[NAMES.indexOf(name)%PAL.leaves.length]), cenC=new T.Color(P.center);
  const tri=(a,b,d,cc)=>{ [a,b,d].forEach(p=>{ pos.push(p.x,p.y,p.z); col.push(cc.r,cc.g,cc.b); }); };
  const W=new T.Color(1,1,1); // marker: pure white vertex colour = "use the instance petal colour"
  // stem: 3-sided prism
  const sr=0.012+S.h*0.008; for(let i=0;i<3;i++){ const a0=i/3*Math.PI*2, a1=(i+1)/3*Math.PI*2; const p0=new T.Vector3(Math.cos(a0)*sr,0,Math.sin(a0)*sr), p1=new T.Vector3(Math.cos(a1)*sr,0,Math.sin(a1)*sr);
    const q0=p0.clone().multiplyScalar(0.6).setY(S.h), q1=p1.clone().multiplyScalar(0.6).setY(S.h); tri(p0,p1,q1,stemC); tri(p0,q1,q0,stemC); }
  // leaves: 2 diamonds angled out and down
  [[0.28,0.4,1.0],[0.5,2.6,0.8]].forEach(([hy,ang,k])=>{ const L=Math.max(0.09,S.h*0.32)*k, w=L*0.32, y=S.h*hy; const dx=Math.cos(ang), dz=Math.sin(ang), px=-dz, pz=dx;
    const b=new T.Vector3(0,y,0), m1=new T.Vector3(dx*L*0.45+px*w,y+L*0.18,dz*L*0.45+pz*w), m2=new T.Vector3(dx*L*0.45-px*w,y+L*0.18,dz*L*0.45-pz*w), tip=new T.Vector3(dx*L,y+L*0.1,dz*L);
    tri(b,m1,tip,leafC); tri(b,tip,m2,leafC); });
  // petals: rings of diamonds around the head
  const H=S.h; const rings=S.rings;
  for(let r=0;r<rings;r++){ const nn=Math.max(3,Math.round(n*(r===0?1:0.75/r))), L=S.L*(1-r*0.22), w=S.w*(1-r*0.15), cup=S.cup+r*0.35, off=r*0.5/nn*Math.PI*2, r0=S.c*(1-r*0.3)*0.8;
    for(let i=0;i<nn;i++){ const a=i/nn*Math.PI*2+off, ca=Math.cos(a), sa=Math.sin(a), pa=-sa, pb=ca; const cu=Math.cos(cup), su=Math.sin(cup);
      const at=(t,side)=>new T.Vector3(ca*(r0+t*cu)+pa*side, H+t*su+r*0.012, sa*(r0+t*cu)+pb*side);
      const base=at(0,0), m1=at(L*0.45,w/2), m2=at(L*0.45,-w/2), tip=at(L,0); tri(base,m1,tip,W); tri(base,tip,m2,W); } }
  // center: low hexagonal dome
  const cr=S.c, ch=cr*0.55+0.01; const top=new T.Vector3(0,H+ch,0); for(let i=0;i<6;i++){ const a0=i/6*Math.PI*2, a1=(i+1)/6*Math.PI*2;
    tri(new T.Vector3(Math.cos(a0)*cr,H,Math.sin(a0)*cr),top,new T.Vector3(Math.cos(a1)*cr,H,Math.sin(a1)*cr),cenC); }
  if(name==='canna'){ const s=new T.Vector3(0,H+S.L*0.9,0); for(let i=0;i<3;i++){ const a0=i/3*Math.PI*2, a1=(i+1)/3*Math.PI*2; tri(new T.Vector3(Math.cos(a0)*0.015,H,Math.sin(a0)*0.015),s,new T.Vector3(Math.cos(a1)*0.015,H,Math.sin(a1)*0.015),cenC); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3)); g.computeVertexNormals(); g.computeBoundingSphere();
  g.userData.tris=pos.length/9; return g; }
let MAT=null;
function material(){ if(MAT) return MAT;
  MAT=new T.MeshLambertMaterial({color:'#ffffff', vertexColors:true, flatShading:true, side:T.DoubleSide});
  MAT.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <color_vertex>',
    'vColor = vec3(1.0);\n#ifdef USE_COLOR\n vColor *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n if(color.r+color.g+color.b>2.97) vColor = instanceColor.xyz;\n#endif'); };
  MAT.customProgramCacheKey=()=>'mori-flower'; return MAT; }
/* a set of instanced meshes, one per species-variant (variant 0 = fewest petals, 1 = most) */
function createSet(cap){ const meshes=[], V=[]; NAMES.forEach((name,si)=>{ const nr=PAL[name].n; [0,1].forEach(vi=>{ const n=vi?nr[1]:nr[0]; if(vi&&nr[1]===nr[0]){ V.push(V[V.length-1]); return; }
      const m=new T.InstancedMesh(build(name,n),material(),cap); m.count=0; m.visible=false; m.frustumCulled=false; m.castShadow=false; m.receiveShadow=false; m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.setColorAt(0,new T.Color(PAL[name].petals[0])); m.userData={species:name, variant:vi, petals:n}; m.name='flowers_'+name+'_'+vi; meshes.push(m); V.push(m); }); });
  const dm=new T.Object3D(), c=new T.Color();
  return { meshes, cap,
    /* items: arrays [x,y,z,species,variant,size,seed] */
    set(items,lim){ const cnt=new Map(); meshes.forEach(m=>cnt.set(m,0)); let drawn=0, tris=0; lim=Math.min(lim==null?1e9:lim,items.length);
      for(let i=0;i<lim;i++){ const it=items[i], m=V[it[3]*2+(it[4]?1:0)]; const k=cnt.get(m); if(k>=cap) continue; const sd=it[6]||0, s=it[5];
        dm.position.set(it[0],it[1]-0.02,it[2]); dm.rotation.set(Math.sin(sd*12.9)*0.12,sd*6.283,Math.cos(sd*7.7)*0.12); dm.scale.set(s,s*(0.85+((sd*97)%1)*0.3),s); dm.updateMatrix(); m.setMatrixAt(k,dm.matrix);
        const pl=PAL[NAMES[it[3]]].petals; m.setColorAt(k,c.set(pl[Math.floor(sd*977)%pl.length]).multiplyScalar(0.88+((sd*53)%1)*0.24)); cnt.set(m,k+1); drawn++; tris+=m.geometry.userData.tris; }
      meshes.forEach(m=>{ m.count=cnt.get(m); m.visible=m.count>0; m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true; });
      this.drawn=drawn; this.tris=tris; return drawn; },
    get draws(){ return meshes.filter(m=>m.visible).length; } }; }
/* which species grow where (biome -> weighted species indices) */
const BIOME_SP={ grass:[0,1,2,3,5,6], forest:[2,5,0,1], jungle:[4,4,2,0], savanna:[3,3,1,6], steppe:[1,3,6], swamp:[5,5,4], guild:[0,1,2,3,4,6], grove:[2,5,0,1,4] };
const BIOME_P={ grass:0.42, forest:0.22, jungle:0.25, savanna:0.2, steppe:0.18, swamp:0.12 };
window.FLORA={ NAMES, SHAPE, PAL, build, createSet, BIOME_SP, BIOME_P, code:n=>NAMES.indexOf(n) };
})();
