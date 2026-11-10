/* Mori terraforming (v3.2, Phase 1). Procedural only.
   Per-region edits are stored as compact deltas, never meshes:
     c : sparse height-delta grid, 3 m cells, packed (Int32 cell key + Int16 decimetres) -> base64
     t : Mori-planted trees  [x, z, scale, type]
     l : lakes [x, z, r, waterY]     r : rivers {p:[x,z,y,...], w}     f : features [kind, x, z, r]
   Edits are applied gradually by jobs (plan.steps), the terrain only re-meshes dirty chunks under a per-frame cap
   (SEEDWORLD.Q.refreshCap / refreshMs) by rewriting the existing vertex buffers in place. */
(function(){
const T=THREE, SW=SEEDWORLD;
const CELL=3, OFF=512, KW=1024;
const CAP={cells:12000, trees:360, feats:24, flowers:1500};
const KINDS={ grove:{label:'Plant Grove', icon:'🌳', dur:9}, hill:{label:'Raise Hill', icon:'⛰', dur:8}, mountain:{label:'Raise Mountain', icon:'🏔', dur:18},
  lake:{label:'Carve Lake', icon:'💧', dur:10}, river:{label:'Carve Riverbed', icon:'〰', dur:12}, flatten:{label:'Flatten for Town', icon:'▭', dur:7},
  meadow:{label:'Flower Meadow', icon:'🌼', dur:8} };
const KCODE={grove:0,hill:1,mountain:2,lake:3,river:4,flatten:5,meadow:6}, KNAME=Object.keys(KCODE);
let io=null, cur=null, quality={treeR:220, fx:1, flowerR:120, flowerCap:1600}, root=null, tfRoot=null;
const cache=new Map(); // decoded regions (LRU, max 4) - memory budget
const smooth=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
function hash(i){ let h=(i*374761393)^0x5bd1e995; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
/* ---------- encode / decode ---------- */
function b64(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
function unb64(s){ const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
// compact cell delta: keys sorted, stored as varint gaps (neighbouring cells cost 1 byte) + zigzag-varint decimetres → ~2.5 bytes/cell before base64
function encodeCells(m){ const keys=[...m.keys()].filter(k=>Math.abs(m.get(k))>=0.05).sort((a,b)=>a-b); const out=new Uint8Array(keys.length*8+8); let n=0;
  const vi=v=>{ while(v>=128){ out[n++]=(v&127)|128; v=Math.floor(v/128); } out[n++]=v; }; let prev=0;
  keys.forEach(k=>{ vi(k-prev); prev=k; const d=Math.max(-32000,Math.min(32000,Math.round(m.get(k)*10))); vi(d<0?-2*d-1:2*d); }); return b64(out.subarray(0,n)); }
function decodeCells(s,old){ const m=new Map(); if(!s) return m; const u=unb64(s);
  if(old){ const dv=new DataView(u.buffer); for(let i=0;i+6<=u.length;i+=6) m.set(dv.getInt32(i,true),dv.getInt16(i+4,true)/10); return m; } // first Phase-1 format (fixed 6 bytes/cell)
  let i=0; const rv=()=>{ let v=0, mul=1, b; do{ b=u[i++]; v+=(b&127)*mul; mul*=128; }while(b&128); return v; }; let k=0;
  while(i<u.length){ k+=rv(); const z=rv(); m.set(k,(z&1?-(z+1)/2:z/2)/10); } return m; }
function decode(id,raw){ raw=raw||{}; const r={id, cells:raw.c2!=null?decodeCells(raw.c2):decodeCells(raw.c,true), trees:(raw.t||[]).map(a=>a.slice()), lakes:(raw.l||[]).map(a=>a.slice()), rivers:(raw.r||[]).map(o=>({p:o.p.slice(),w:o.w})), feats:(raw.f||[]).map(a=>a.slice()), flowers:(raw.fl||[]).map(a=>a.slice()), dirty:false};
  bbox(r); return r; }
function bbox(r){ let a=1e9,b=-1e9,c=1e9,d=-1e9; for(const k of r.cells.keys()){ const i=Math.floor(k/KW)-OFF, j=k%KW-OFF; if(i<a)a=i; if(i>b)b=i; if(j<c)c=j; if(j>d)d=j; }
  r.bx0=(a-1)*CELL; r.bx1=(b+2)*CELL; r.bz0=(c-1)*CELL; r.bz1=(d+2)*CELL; }
function encode(r){ const q=v=>Math.round(v*10)/10; return {c2:encodeCells(r.cells), t:r.trees.map(a=>[q(a[0]),q(a[1]),q(a[2]),a[3]]), l:r.lakes.map(a=>a.map(q)), r:r.rivers.map(o=>({p:o.p.map(q),w:o.w})), f:r.feats.map(a=>[a[0],q(a[1]),q(a[2]),q(a[3])]), fl:r.flowers.map(a=>[q(a[0]),q(a[1]),a[2],a[3],Math.round(a[4]*100)/100])}; } // fl: Mori-planted flowers [x, z, species, variant, size]
function get(id){ const key=io.key()+':'+id; let r=cache.get(key); if(r){ cache.delete(key); cache.set(key,r); return r; }
  r=decode(id,io.load(id)); cache.set(key,r); while(cache.size>4){ const [k0,r0]=cache.entries().next().value; if(r0===cur) break; if(r0.dirty) io.save(r0.id,encode(r0)); cache.delete(k0); } return r; }
function flush(){ for(const r of cache.values()) if(r.dirty){ io.save(r.id,encode(r)); r.dirty=false; } }
/* ---------- sampling ---------- */
function deltaAt(x,z){ const r=cur; if(!r||!r.cells.size||x<r.bx0||x>r.bx1||z<r.bz0||z>r.bz1) return 0;
  const gx=x/CELL, gz=z/CELL, i=Math.floor(gx), j=Math.floor(gz), fx=gx-i, fz=gz-j, m=r.cells, k=(i+OFF)*KW+(j+OFF);
  const a=m.get(k)||0, b=m.get(k+KW)||0, c=m.get(k+1)||0, d=m.get(k+KW+1)||0; return (a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz; }
function segDist(px,pz,ax,az,bx,bz){ const dx=bx-ax, dz=bz-az, L=dx*dx+dz*dz||1; const t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/L)); return [Math.hypot(px-ax-dx*t,pz-az-dz*t),t]; }
function waterAt(x,z){ if(!cur) return null; let w=null;
  for(const l of cur.lakes){ const y=l.anim!=null?l.anim:l[3]; if(Math.hypot(x-l[0],z-l[1])<l[2]*1.05) w=Math.max(w==null?-1e9:w,y); }
  for(const rv of cur.rivers){ const p=rv.p, n=Math.floor((rv.show!=null?rv.show:1)*(p.length/3-1)); for(let i=0;i<n;i++){ const [d,t]=segDist(x,z,p[i*3],p[i*3+1],p[i*3+3],p[i*3+4]); if(d<rv.w*0.5){ const y=p[i*3+2]*(1-t)+p[i*3+5]*t; w=Math.max(w==null?-1e9:w,y); } } }
  return w; }
function blocks(x,z,h){ if(!cur) return false; const w=waterAt(x,z); if(w!=null&&w>h-0.4) return true;
  for(const f of cur.feats){ if(f[0]===KCODE.flatten&&Math.hypot(x-f[1],z-f[2])<f[3]) return true; if(f[0]===KCODE.lake&&Math.hypot(x-f[1],z-f[2])<f[3]*1.15) return true; }
  for(const rv of cur.rivers){ const p=rv.p; for(let i=0;i+5<p.length;i+=3) if(segDist(x,z,p[i],p[i+1],p[i+3],p[i+4])[0]<rv.w) return true; }
  return false; }
/* ---------- visuals: Mori trees (instanced, capped), water, FX, Mori's seed-self ---------- */
let pine=null, oak=null, trunk=null, waterM=null, lakeG=null, vis={lakes:[], rivers:[]}, needVis=false, lastTreeAt=null, treeTimer=0, growing=[];
let spark=null, dust=null, ring=null, avatar=null, avatarOn=false, flora=null, growingF=[], patchM={}, patchMesh=[], natCache=new Map(), lastFlAt=null, flDirty=null;
const PN=160, part={sp:null, du:null};
const TREECOL={pine:['#2f5a33'], oak:['#3f7a2c']}; // overridden by the Mori Templates palette when the pack is loaded
function mats(){ if(pine) return;
  const cone=new T.ConeGeometry(1.5,4.4,7); cone.translate(0,4.0,0); const ico=new T.IcosahedronGeometry(2.1,1); ico.translate(0,4.1,0); const tg=new T.CylinderGeometry(0.22,0.3,2.4,5); tg.translate(0,1.2,0);
  pine=new T.InstancedMesh(cone,new T.MeshLambertMaterial({color:'#ffffff'}),CAP.trees); oak=new T.InstancedMesh(ico,new T.MeshLambertMaterial({color:'#ffffff', flatShading:true}),CAP.trees); trunk=new T.InstancedMesh(tg,new T.MeshLambertMaterial({color:'#5a3d24'}),CAP.trees*2);
  [pine,oak,trunk].forEach(m=>{ m.count=0; m.frustumCulled=false; m.castShadow=true; m.instanceMatrix.setUsage(T.DynamicDrawUsage); });
  pine.setColorAt(0,new T.Color('#2f5a33')); oak.setColorAt(0,new T.Color('#3f7a2c'));
  waterM=new T.MeshLambertMaterial({color:'#2f7fc4', transparent:true, opacity:0.8, side:T.DoubleSide}); lakeG=new T.CircleGeometry(1,32); lakeG.rotateX(-Math.PI/2);
  const mkP=(col,size,add)=>{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(PN*3).fill(-9999),3));
    const p=new T.Points(g,new T.PointsMaterial({color:col,size,transparent:true,opacity:add?0.95:0.6,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending})); p.frustumCulled=false;
    return {pts:p, v:new Float32Array(PN*3), life:new Float32Array(PN), next:0, live:0}; };
  const MTon=!!(window.MT&&MT.on); // Mori Templates: palette colours + soft spark sprite for the particles
  part.sp=mkP(MTon?MT.pick('terraform.spark',0,['#9cff57']):'#9cff57',MTon?0.8:0.55,true); part.du=mkP(MTon?MT.pick('terraform.dust',0,['#a08560']):'#a08560',MTon?2.0:1.6,false);
  if(MTon){ const st=MT.stripTex('spark_white'); if(st){ [part.sp,part.du].forEach(P=>{ P.pts.material.map=st; P.pts.material.needsUpdate=true; }); } TREECOL.pine=MT.list('terraform.pine',TREECOL.pine); TREECOL.oak=MT.list('terraform.oak',TREECOL.oak); }
  if(window.FLORA){ flora=FLORA.createSet(2400); }
  if(MTon){ const fm=MT.mat('foliage','#ffffff',3,{detail:0.35}), bm=MT.mat('bark_gray','#5a3d24',1.2,{detail:0.3}); if(fm){ fm.flatShading=true; pine.material=fm; oak.material=fm; } if(bm) trunk.material=bm; // v2 templates: foliage canopies, grey-bark trunks
    patchM.meadow=MT.mat('clover','#6f9b45',3,{detail:0.4}); patchM.grove=MT.mat('leaf_litter','#7a6a48',3,{detail:0.4}); }
  ring=new T.Mesh(new T.TorusGeometry(1,0.08,6,40),new T.MeshBasicMaterial({color:'#a3ff12',transparent:true,opacity:0.7})); ring.rotation.x=-Math.PI/2; ring.visible=false; }
function attach(){ mats(); const r=SW.root; if(root===r&&tfRoot) return; root=r; tfRoot=new T.Group(); tfRoot.userData.sw=true; root.add(tfRoot);
  [pine,oak,trunk,part.sp.pts,part.du.pts,ring].forEach(o=>tfRoot.add(o)); if(flora) flora.meshes.forEach(m=>tfRoot.add(m)); }
function clearVis(){ vis.lakes.forEach(m=>tfRoot.remove(m)); vis.rivers.forEach(m=>{ tfRoot.remove(m); m.geometry.dispose(); }); vis={lakes:[], rivers:[]}; if(pine){ pine.count=oak.count=trunk.count=0; } growing=[]; lastTreeAt=null; growingF=[]; lastFlAt=null; natCache.clear(); if(flora) flora.set([]); clearPatches(); }
function lakeMesh(l){ const m=new T.Mesh(lakeG,waterM); m.position.set(l[0],l.anim!=null?l.anim:l[3],l[1]); m.scale.set(l[2]*1.08,1,l[2]*1.08); m.userData.lake=l; tfRoot.add(m); vis.lakes.push(m); return m; }
function riverMesh(rv){ const p=rv.p, n=p.length/3, pos=new Float32Array(n*2*3), idx=[]; for(let i=0;i<n;i++){ const a=Math.max(0,i-1), b=Math.min(n-1,i+1); let dx=p[b*3]-p[a*3], dz=p[b*3+1]-p[a*3+1]; const L=Math.hypot(dx,dz)||1; dx/=L; dz/=L;
    const hw=rv.w*0.42; pos.set([p[i*3]-dz*hw,p[i*3+2],p[i*3+1]+dx*hw, p[i*3]+dz*hw,p[i*3+2],p[i*3+1]-dx*hw],i*6); if(i<n-1) idx.push(i*2,i*2+1,i*2+2, i*2+1,i*2+3,i*2+2); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); const m=new T.Mesh(g,waterM); m.userData.river=rv;
  g.setDrawRange(0,Math.floor((rv.show!=null?rv.show:1)*(n-1))*6); tfRoot.add(m); vis.rivers.push(m); return m; }
function buildVis(){ attach(); clearVis(); if(!cur) return; cur.lakes.forEach(lakeMesh); cur.rivers.forEach(riverMesh); placeTrees(null,null,true); buildPatches(); placeFlowers(null,null); needVis=false; }
const dm=new T.Object3D(), tcol=new T.Color();
function placeTrees(px,pz,force){ if(!pine||!cur) return; if(px==null&&lastTreeAt){ px=lastTreeAt[0]; pz=lastTreeAt[1]; } if(px==null){ px=0; pz=0; }
  lastTreeAt=[px,pz]; const R=quality.treeR; let np=0, no=0, nt=0;
  for(let i=0;i<cur.trees.length;i++){ const t=cur.trees[i]; const [x,z,s,ty]=t; if(Math.hypot(x-px,z-pz)>R) continue; const g=t.g!=null?t.g:1; const k=Math.max(0.0001,s*g);
    dm.position.set(x,SW.heightAt(x,z)-0.25,z); dm.rotation.set(0,i*1.7,0); dm.scale.set(k,k*(ty===0?1.25:1),k); dm.updateMatrix();
    const M=ty===0?pine:oak, n=ty===0?np++:no++; M.setMatrixAt(n,dm.matrix); M.setColorAt(n,tcol.set(ty===0?TREECOL.pine[i%TREECOL.pine.length]:TREECOL.oak[i%TREECOL.oak.length]).offsetHSL(((i*7)%5-2)*0.008,0,0).multiplyScalar(1+((i*3)%5-2)*0.12)) /* v3.2: scale, not HSL-lightness (linear space made dark pines black) */; trunk.setMatrixAt(nt++,dm.matrix); }
  pine.count=np; oak.count=no; trunk.count=nt; [pine,oak,trunk].forEach(m=>{ m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true; }); }
/* ---------- flowers: Mori-planted (saved in the region delta) + natural meadow patches (from the world seed, never saved) ---------- */
const fr01=(x,z)=>{ const v=Math.sin(x*12.9898+z*78.233)*43758.5453; return v-Math.floor(v); };
function natPatch(ci,cj){ if(!window.FLORA) return []; const key=ci+','+cj; let p=natCache.get(key); if(p) return p; p=[]; const F=SW.F, G=44;
  const h=hash(((ci*73856093)^(cj*19349663)^(F.id*83492791))>>>0); const cx=(ci+0.2+hash(Math.floor(h*1e9)+1)*0.6)*G, cz=(cj+0.2+hash(Math.floor(h*1e9)+2)*0.6)*G;
  if(F.stage>=1&&!SW.isVoidAt(cx,cz)&&window.GROUNDED){ const town=F.guild&&Math.hypot(cx,cz)<75;
    const P=window.PLANET; const ctx={seed:P.seed, regionId:F.id, guild:!!F.guild, rng:P.rngFor, biomeAt:(x,z)=>SW.biomeAt(x,z)};
    const hit=GROUNDED.flowerWeight(cx,cz,ctx);
    if(hit&&hit.d<=hit.node.radius&&!town){ const n=Math.min(28, Math.round(6+hit.w*22)); let qi=0;
      const rnd=()=>hash(Math.floor(h*1e9)+800+(qi++));
      GROUNDED.clusterPoints(hit.node, n, rnd, (x,z)=>Math.floor(x/G)===ci&&Math.floor(z/G)===cj&&floraOK(x,z)).forEach(pt=>{
        const code=FLORA.code?FLORA.code(pt.species):-1; const sp=code>=0?code:(FLORA.BIOME_SP[hit.node.biome]||FLORA.BIOME_SP.grass)[0];
        p.push([pt.x,null,pt.z,sp,pt.r%1<0.5?0:1,0.75+(pt.suit||0.4)*0.5,fr01(pt.x,pt.z)]); }); } }
  if(F.guild&&ci===0&&cj===0) guildMeadow(p); // the Herb Meadow behind the Guild (north of the fence)
  natCache.set(key,p); if(natCache.size>300){ natCache.delete(natCache.keys().next().value); } return p; }
function guildMeadow(p){ for(let q=0;q<380;q++){ const x=-23+hash(9001+q)*46, z=27.5+hash(9501+q*7)*23; const sp=FLORA.BIOME_SP.guild, k=sp[Math.floor(hash(9901+q)*sp.length)]; if(SW.F.roads.length&&SW.roadDist(x,z)<2.5) continue;
    p.push([x,null,z,k,hash(9951+q)<0.5?0:1,0.8+hash(9971+q)*0.45,fr01(x,z)]); } }
function floraOK(x,z){ const F=SW.F; const h=SW.baseHeightAt(x,z); if(F.seaY!=null&&h<F.seaY+0.8) return false; if(F.roads.length&&SW.roadDist(x,z)<4) return false;
  if(F.flats.some(f=>Math.hypot(x-f.x,z-f.z)<f.r1*0.9)) return false; if(F.colliders.circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+0.5)) return false; return !blocks(x,z,SW.heightAt(x,z)); }
const flItems=[];
function placeFlowers(px,pz){ if(!flora||!cur) return; if(px==null&&lastFlAt){ px=lastFlAt[0]; pz=lastFlAt[1]; } if(px==null){ px=0; pz=0; } lastFlAt=[px,pz];
  const R=quality.flowerR, lim=quality.flowerCap; flItems.length=0;
  for(let i=0;i<cur.flowers.length;i++){ const f=cur.flowers[i]; if(Math.abs(f[0]-px)>R||Math.abs(f[1]-pz)>R) continue; if(f.y==null||inDirty(f[0],f[1])) f.y=SW.heightAt(f[0],f[1]); const g=f.g!=null?f.g:1;
    flItems.push([f[0],f.y,f[1],f[2],f[3],f[4]*g,fr01(f[0],f[1]),(f[0]-px)*(f[0]-px)+(f[1]-pz)*(f[1]-pz)]); }
  if(quality.natural!==false){ const G=44, i0=Math.floor((px-R)/G), i1=Math.floor((px+R)/G), j0=Math.floor((pz-R)/G), j1=Math.floor((pz+R)/G);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const p=natPatch(i,j); for(const f of p){ const dx=f[0]-px, dz=f[2]-pz; if(Math.abs(dx)>R||Math.abs(dz)>R) continue; if(f[1]==null||inDirty(f[0],f[2])) f[1]=SW.heightAt(f[0],f[2]);
      flItems.push([f[0],f[1],f[2],f[3],f[4],f[5],f[6],dx*dx+dz*dz]); } } }
  if(flItems.length>lim) flItems.sort((a,b)=>a[7]-b[7]); // nearest first when over the tier's budget
  flora.set(flItems,lim); flDirty=null; }
function inDirty(x,z){ const b=flDirty; return !!b&&x>=b[0]&&x<=b[2]&&z>=b[1]&&z<=b[3]; }
/* textured ground under Mori's meadows (clover) and groves (leaf litter): one merged, terrain-draped mesh per kind */
function clearPatches(){ patchMesh.forEach(m=>{ tfRoot&&tfRoot.remove(m); m.geometry.dispose(); }); patchMesh=[]; }
function buildPatches(){ clearPatches(); if(!cur||!tfRoot) return; [['meadow',KCODE.meadow],['grove',KCODE.grove]].forEach(([k,code])=>{ const M=patchM[k]; if(!M) return; const fs=cur.feats.filter(f=>f[0]===code); if(!fs.length) return;
    const pos=[], col=[], uv=[], idx=[]; const RS=5, AS=18; fs.forEach(f=>{ const base=pos.length/3, R=f[3]*(k==='grove'?0.9:1.05);
      for(let r=0;r<=RS;r++) for(let a=0;a<AS;a++){ const t=r/RS, an=a/AS*Math.PI*2, wob=1+0.12*Math.sin(an*3+f[1]); const x=f[1]+Math.cos(an)*R*t*(r===0?0:wob), z=f[2]+Math.sin(an)*R*t*(r===0?0:wob);
        pos.push(x,SW.heightAt(x,z)+0.06,z); uv.push(x/3,z/3); const al=t<0.7?1:1-(t-0.7)/0.3; col.push(1,1,1,al); }
      for(let r=0;r<RS;r++) for(let a=0;a<AS;a++){ const a1=(a+1)%AS, i00=base+r*AS+a, i01=base+r*AS+a1, i10=base+(r+1)*AS+a, i11=base+(r+1)*AS+a1; idx.push(i00,i10,i11, i00,i11,i01); } });
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setAttribute('color',new T.Float32BufferAttribute(col,4)); g.setIndex(idx); g.computeVertexNormals();
    if(!M.userData.patch){ M.userData.patch=true; M.vertexColors=true; M.transparent=true; M.depthWrite=false; M.polygonOffset=true; M.polygonOffsetFactor=-2; M.polygonOffsetUnits=-2; M.needsUpdate=true; } // own cache key, only used here
    const me=new T.Mesh(g,patchM[k]); me.receiveShadow=true; me.renderOrder=1; me.userData.tfPatch=k; tfRoot.add(me); patchMesh.push(me); }); }
function emit(P,x,y,z,n,spread,up){ n=Math.max(1,Math.round(n*quality.fx)); const a=P.pts.geometry.attributes.position.array;
  for(let q=0;q<n;q++){ const i=P.next; P.next=(P.next+1)%PN; a[i*3]=x+(Math.random()-0.5)*spread; a[i*3+1]=y+Math.random()*0.6; a[i*3+2]=z+(Math.random()-0.5)*spread;
    P.v[i*3]=(Math.random()-0.5)*1.2; P.v[i*3+1]=up*(0.6+Math.random()); P.v[i*3+2]=(Math.random()-0.5)*1.2; if(P.life[i]<=0) P.live++; P.life[i]=1.2+Math.random()*0.9; }
  P.pts.geometry.attributes.position.needsUpdate=true; }
function stepParts(P,dt,grav){ if(!P.live) return; const a=P.pts.geometry.attributes.position.array; let live=0;
  for(let i=0;i<PN;i++){ if(P.life[i]<=0) continue; P.life[i]-=dt; if(P.life[i]<=0){ a[i*3+1]=-9999; continue; } live++; P.v[i*3+1]-=grav*dt; a[i*3]+=P.v[i*3]*dt; a[i*3+1]+=P.v[i*3+1]*dt; a[i*3+2]+=P.v[i*3+2]*dt; }
  P.live=live; P.pts.geometry.attributes.position.needsUpdate=true; }
/* ---------- spot picking ---------- */
const RAD={grove:16, hill:24, mountain:70, lake:22, river:40, flatten:30, meadow:15};
const DIST={meadow:[20,50], grove:[24,60], hill:[45,95], mountain:[140,220], lake:[38,85], river:[35,75], flatten:[30,70]};
function spotOK(kind,x,z,r){ const F=SW.F; if(Math.abs(x)>1300||Math.abs(z)>1300) return false;
  if(F.guild&&Math.hypot(x,z)<140+r) return false; if(F.stage>=3&&Math.hypot(x-F.A.x,z-F.A.z)<(F.stage>=4?150:115)+r*0.7) return false;
  if(F.flats.some(f=>Math.hypot(x-f.x,z-f.z)<f.r1+r*0.6)) return false; if(Math.hypot(x-F.L.x,z-F.L.z)<r+14) return false;
  if(F.colliders.circles.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+r*0.8)) return false; if(F.targets.some(t=>Math.hypot(x-t.x,z-t.z)<t.r+r*0.8)) return false;
  if(F.roads.length&&kind!=='grove'&&kind!=='meadow'&&SW.roadDist(x,z)<r+6) return false; if(F.roads.length&&SW.roadDist(x,z)<10) return false;
  for(const [a,b] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){ if(SW.isVoidAt(x+a,z+b)) return false; const h=SW.baseHeightAt(x+a,z+b); if(F.seaY!=null&&h<F.seaY+2) return false; }
  if(cur&&cur.feats.some(f=>Math.hypot(x-f[1],z-f[2])<(f[3]+r)*(kind==='grove'||kind==='meadow'||f[0]===KCODE.grove||f[0]===KCODE.meadow?0.6:0.85))) return false;
  if(cur) for(const rv of cur.rivers){ const q=rv.p; for(let i=0;i+5<q.length;i+=3) if(segDist(x,z,q[i],q[i+1],q[i+3],q[i+4])[0]<rv.w+r*(kind==='grove'||kind==='meadow'?0.5:0.8)) return false; } // keep clear of the whole riverbed, not just its source
  return true; }
function pickSpot(kind,px,pz,yaw){ const [d0,d1]=DIST[kind], r=RAD[kind]; for(let t=0;t<60;t++){ const a=(yaw!=null&&t<30?yaw+(Math.random()-0.5)*1.6:Math.random()*Math.PI*2), d=d0+Math.random()*(d1-d0)*(1+t/60);
    let x=px+Math.sin(a)*d, z=pz+Math.cos(a)*d;
    if(SW.F.guild){ const g=Math.hypot(x,z), need=140+r+8+Math.random()*30; if(g<need){ const k=need/Math.max(1,g); x*=k; z*=k; } } // at the Guild: push the work out past the town, same direction
    if(spotOK(kind,x,z,r)) return {x,z}; } return null; }
/* ---------- plans ---------- */
function addCell(map,i,j,dd){ if(Math.abs(dd)<0.02) return; const k=(i+OFF)*KW+(j+OFF); map.set(k,(map.get(k)||0)+dd); }
function plan(kind,px,pz,yaw,spot){ if(!cur) return {err:'This region is not loaded.'}; const F=SW.F; if(F.stage<1) return {err:'This region is still void — seed it first.'}; if(!F.info.isLand) return {err:'Open ocean — there is no land here to shape.'};
  if(cur.feats.length>=CAP.feats) return {err:'This region already holds '+CAP.feats+' of my works (the per-region budget).'};
  if(kind==='grove'&&cur.trees.length>=CAP.trees) return {err:'This region has reached its tree cap ('+CAP.trees+').'};
  if(kind==='meadow'&&cur.flowers.length>=CAP.flowers) return {err:'This region has reached its flower cap ('+CAP.flowers+').'};
  const s=spot||pickSpot(kind,px,pz,yaw); if(!s) return {err:'I could not find a clear spot for that near you (I keep away from towns, roads, sites and the sea).'};
  const K=KINDS[kind], P={kind, x:s.x, z:s.z, r:RAD[kind], i:0, steps:kind==='grove'||kind==='meadow'?0:40, t:0, dur:K.dur, cells:new Map(), trees:[], flowers:[], seed:Math.floor(Math.random()*1e6)};
  const rr=(n)=>hash(P.seed+n), h0=SW.heightAt(s.x,s.z);
  const each=(R,fn)=>{ const i0=Math.floor((s.x-R)/CELL), i1=Math.ceil((s.x+R)/CELL), j0=Math.floor((s.z-R)/CELL), j1=Math.ceil((s.z+R)/CELL);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const x=i*CELL, z=j*CELL, d=Math.hypot(x-s.x,z-s.z); if(d<=R) fn(i,j,x,z,d); } };
  if(kind==='hill'){ const R=P.r=20+rr(1)*8, H=7+rr(2)*5; each(R,(i,j,x,z,d)=>{ const t=d/R; addCell(P.cells,i,j,H*(1-t*t)*(1-t*t)*(0.9+0.1*Math.sin(Math.atan2(z-s.z,x-s.x)*3+P.seed))); }); }
  else if(kind==='mountain'){ const R=P.r=62+rr(1)*16, H=40+rr(2)*16, ph=rr(3)*6;
    each(R,(i,j,x,z,d)=>{ const t=d/R, a=Math.atan2(z-s.z,x-s.x); const ridge=1+0.22*Math.sin(a*5+ph)*t+0.12*Math.sin(a*11+ph*2)*t; const base=Math.pow((Math.cos(t*Math.PI)+1)/2,1.25);
      addCell(P.cells,i,j,H*base*ridge); }); }
  else if(kind==='lake'){ const R=P.r=16+rr(1)*8; let rim=1e9; for(let q=0;q<16;q++){ const a=q/16*Math.PI*2; rim=Math.min(rim,SW.heightAt(s.x+Math.cos(a)*R,s.z+Math.sin(a)*R)); }
    const depth=3.6, wy=rim-0.6; P.lake=[s.x,s.z,R,wy]; P.bed=rim-depth;
    each(R*1.25,(i,j,x,z,d)=>{ const t=d/R; const cur0=SW.heightAt(x,z); const target=t<1?rim-depth*(1-t*t)-0.2:rim-0.3+(t-1)*4; const dd=Math.min(0,target-cur0); addCell(P.cells,i,j,t<1?dd:dd*(1-smooth(1,1.25,t))); }); }
  else if(kind==='flatten'){ const R=P.r=28+rr(1)*6; let sum=0,n=0; each(R*0.5,(i,j,x,z)=>{ sum+=SW.heightAt(x,z); n++; }); const target=n?sum/n:h0;
    each(R*1.3,(i,j,x,z,d)=>{ const t=d/R; addCell(P.cells,i,j,(target-SW.heightAt(x,z))*(1-smooth(0.85,1.3,t))); }); }
  else if(kind==='river'){ const pts=[[s.x,s.z]]; let a=yaw!=null?yaw:rr(1)*Math.PI*2, x=s.x, z=s.z;
    for(let q=0;q<16;q++){ let best=null; for(const da of [-0.5,-0.25,0,0.25,0.5]){ const b=a+da, nx=x+Math.sin(b)*9, nz=z+Math.cos(b)*9; const h=SW.heightAt(nx,nz)+Math.abs(da)*0.6;
        if(!spotOK('grove',nx,nz,4)) continue; if(!best||h<best[2]) best=[nx,nz,h,b]; } if(!best) break; x=best[0]; z=best[1]; a=best[3]; pts.push([x,z]); }
    if(pts.length<5) return {err:'No room to run a riverbed from here.'}; const W=8, p=[]; let lastY=1e9;
    pts.forEach(([x,z])=>{ lastY=Math.min(lastY,SW.heightAt(x,z)-0.9); p.push(x,z,lastY); }); P.river={p,w:W}; P.r=W;
    const seen=new Set(); for(let q=0;q+1<pts.length;q++){ const [ax,az]=pts[q], [bx,bz]=pts[q+1];
      const i0=Math.floor((Math.min(ax,bx)-W)/CELL), i1=Math.ceil((Math.max(ax,bx)+W)/CELL), j0=Math.floor((Math.min(az,bz)-W)/CELL), j1=Math.ceil((Math.max(az,bz)+W)/CELL);
      for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const k=i*KW+j; if(seen.has(k)) continue; const xx=i*CELL, zz=j*CELL; let best=1e9, by=0;
        for(let m=0;m+1<pts.length;m++){ const [d,t]=segDist(xx,zz,pts[m][0],pts[m][1],pts[m+1][0],pts[m+1][1]); if(d<best){ best=d; by=p[m*3+2]*(1-t)+p[m*3+5]*t; } }
        if(best>W) continue; seen.add(k); const t=best/W; const target=by-1.5*(1-t*t); const dd=Math.min(0,target-SW.heightAt(xx,zz)); addCell(P.cells,i,j,dd*(1-smooth(0.7,1,t))); } }
    P.x=pts[Math.floor(pts.length/2)][0]; P.z=pts[Math.floor(pts.length/2)][1]; P.x0=s.x; P.z0=s.z; }
  else if(kind==='grove'){ const B=SW.biomeAt(s.x,s.z); const n=Math.min(CAP.trees-cur.trees.length,14+Math.floor(rr(1)*10)); const pineBias=B==='taiga'||B==='mountain'?0.85:B==='jungle'||B==='savanna'?0.1:0.45;
    for(let q=0;q<n*3&&P.trees.length<n;q++){ const a=rr(10+q)*Math.PI*2, d=Math.sqrt(rr(200+q))*P.r; const x=s.x+Math.cos(a)*d, z=s.z+Math.sin(a)*d;
      if(P.trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<3.2)) continue; if(blocks(x,z,SW.heightAt(x,z))) continue; if(SW.F.roads.length&&SW.roadDist(x,z)<5) continue; P.trees.push([x,z,0.8+rr(400+q)*0.7,rr(600+q)<pineBias?0:1]); }
    if(!P.trees.length) return {err:'No clear ground for a grove there.'}; P.steps=P.trees.length; P.dur=Math.max(5,P.trees.length*0.45);
    // grove floor flowers: shade-loving species in little clumps between the trees
    const sp=window.FLORA?FLORA.BIOME_SP.grove:[0], nf=Math.min(CAP.flowers-cur.flowers.length,18+Math.floor(rr(5)*14)); for(let q=0;q<nf*3&&P.flowers.length<nf;q++){ const a=rr(800+q)*Math.PI*2, d=(0.25+0.85*Math.sqrt(rr(900+q)))*P.r; const x=s.x+Math.cos(a)*d, z=s.z+Math.sin(a)*d;
      if(P.trees.some(t=>Math.hypot(t[0]-x,t[1]-z)<1.2)) continue; if(blocks(x,z,SW.heightAt(x,z))||(SW.F.roads.length&&SW.roadDist(x,z)<4)) continue; const k=rr(1000+q); P.flowers.push([x,z,sp[Math.floor(rr(1100+Math.floor(q/5))*sp.length)],k<0.5?0:1,0.75+k*0.45]); } }
  else if(kind==='meadow'){ const B=SW.biomeAt(s.x,s.z), sp=(window.FLORA&&(FLORA.BIOME_SP[B]||FLORA.BIOME_SP.grass))||[0]; const R=P.r=13+rr(1)*5; const n=Math.min(CAP.flowers-cur.flowers.length,130+Math.floor(rr(2)*70));
    const drifts=[]; for(let q=0;q<5;q++){ const a=rr(20+q)*Math.PI*2, d=Math.sqrt(rr(30+q))*R*0.7; drifts.push([s.x+Math.cos(a)*d,s.z+Math.sin(a)*d,sp[Math.floor(rr(40+q)*sp.length)]]); } // species grow in drifts
    for(let q=0;q<n*3&&P.flowers.length<n;q++){ const a=rr(100+q)*Math.PI*2, d=Math.sqrt(rr(3000+q))*R; const x=s.x+Math.cos(a)*d, z=s.z+Math.sin(a)*d;
      if(blocks(x,z,SW.heightAt(x,z))||(SW.F.roads.length&&SW.roadDist(x,z)<4)) continue; let best=drifts[0], bd=1e9; drifts.forEach(D=>{ const dd=Math.hypot(D[0]-x,D[1]-z)*(0.7+rr(5000+q)*0.6); if(dd<bd){ bd=dd; best=D; } });
      const k=rr(7000+q); P.flowers.push([x,z,best[2],k<0.5?0:1,0.7+k*0.6]); }
    if(!P.flowers.length) return {err:'No clear ground for a meadow there.'}; P.steps=P.flowers.length; P.dur=Math.max(6,P.flowers.length*0.05); }
  if(P.cells.size&&cur.cells.size+P.cells.size>CAP.cells) return {err:'This region\'s terrain budget is full ('+CAP.cells.toLocaleString()+' cells).'};
  P.keys=[...P.cells.keys()]; P.dd=Float32Array.from(P.keys.map(k=>P.cells.get(k))); P.cells=null;
  let a=1e9,b=-1e9,c=1e9,d=-1e9; P.keys.forEach(k=>{ const i=Math.floor(k/KW)-OFF, j=k%KW-OFF; a=Math.min(a,i); b=Math.max(b,i); c=Math.min(c,j); d=Math.max(d,j); });
  P.box=P.keys.length?[(a-1)*CELL,(c-1)*CELL,(b+2)*CELL,(d+2)*CELL]:[s.x-P.r,s.z-P.r,s.x+P.r,s.z+P.r];
  { const dx=px-P.x, dz=pz-P.z, L=Math.hypot(dx,dz)||1, off=P.kind==='river'?0:P.r+4; P.ax=(P.x0!=null?P.x0:P.x)+dx/L*off; P.az=(P.z0!=null?P.z0:P.z)+dz/L*off; }
  P.region=cur.id; return P; }
/* apply steps [i0,i1) of a plan */
let shake=0, flT=0;
function plantF(P,r,visual){ const f=P.flowers[P.fi=(P.fi||0)]; P.fi++; if(!f) return; const c=f.slice(); c.g=visual?0.05:1; r.flowers.push(c); if(visual){ growingF.push(c); if(P.fi%3===0) emit(part.sp,c[0],SW.heightAt(c[0],c[1])+0.3,c[1],3,1.2,1.4); } }
function applySteps(P,n,visual){ const r=cur; if(!r||r.id!==P.region) return; const m=r.cells;
  for(let q=0;q<n&&P.i<P.steps;q++){ P.i++;
    if(P.kind==='grove'){ const t=P.trees[P.i-1].slice(); t.g=visual?0.05:1; r.trees.push(t); if(visual){ growing.push(t); emit(part.sp,t[0],SW.heightAt(t[0],t[1])+0.5,t[1],10,2.5,2.2); }
      const want=Math.floor(P.i/P.steps*P.flowers.length); while((P.fi||0)<want) plantF(P,r,visual); }
    else if(P.kind==='meadow'){ plantF(P,r,visual); }
    else { const f=1/P.steps; for(let k=0;k<P.keys.length;k++){ const key=P.keys[k]; m.set(key,(m.get(key)||0)+P.dd[k]*f); } } }
  if(P.kind!=='grove'&&P.kind!=='meadow'){ flDirty=flDirty?[Math.min(flDirty[0],P.box[0]),Math.min(flDirty[1],P.box[1]),Math.max(flDirty[2],P.box[2]),Math.max(flDirty[3],P.box[3])]:P.box.slice(); r.bx0=Math.min(r.bx0,P.box[0]); r.bz0=Math.min(r.bz0,P.box[1]); r.bx1=Math.max(r.bx1,P.box[2]); r.bz1=Math.max(r.bz1,P.box[3]); SW.markDirty(P.box[0],P.box[1],P.box[2],P.box[3]); treeTimer=treeTimer>0?Math.min(treeTimer,0.3):0.3; }
  const fr=P.i/P.steps; if(P.lake){ if(!P.lakeRec){ P.lakeRec=P.lake.slice(); r.lakes.push(P.lakeRec); P.lakeRec.anim=P.bed; if(tfRoot) P.lakeMesh=lakeMesh(P.lakeRec); } P.lakeRec.anim=fr<0.6?P.bed:P.bed+(P.lake[3]-P.bed)*smooth(0.6,1,fr); if(P.lakeMesh) P.lakeMesh.position.y=P.lakeRec.anim; if(fr>=1) delete P.lakeRec.anim; }
  if(P.river){ if(!P.riverRec){ P.riverRec={p:P.river.p.slice(),w:P.river.w,show:0}; r.rivers.push(P.riverRec); if(tfRoot) P.riverMesh=riverMesh(P.riverRec); } P.riverRec.show=smooth(0.3,1,fr); if(P.riverMesh){ const n=P.riverRec.p.length/3; P.riverMesh.geometry.setDrawRange(0,Math.floor(P.riverRec.show*(n-1))*6); } if(fr>=1) delete P.riverRec.show; }
  r.dirty=true; }
function tick(P,dt,player){ if(!cur||cur.id!==P.region) return false; P.t+=dt; const want=Math.min(P.steps,Math.floor(P.t/P.dur*P.steps+0.0001)); if(want>P.i) applySteps(P,want-P.i,true);
  // effects at the edit spot
  P.fxT=(P.fxT||0)-dt; if(P.fxT<=0&&P.kind!=='grove'&&P.kind!=='meadow'){ P.fxT=0.12; const a=Math.random()*Math.PI*2, d=Math.sqrt(Math.random())*P.r*0.9; let x=P.x+Math.cos(a)*d, z=P.z+Math.sin(a)*d;
    if(P.river){ const p=P.river.p, q=Math.floor(Math.random()*Math.max(1,Math.floor((p.length/3)*Math.max(0.05,P.i/P.steps)))); x=p[q*3]; z=p[q*3+1]; }
    emit(part.du,x,SW.heightAt(x,z),z,6,4,1.2); if(P.kind==='flatten'||P.kind==='lake') emit(part.sp,x,SW.heightAt(x,z)+0.3,z,2,2,1.5);
    if(player){ const pd=Math.hypot(player.x-P.x,player.z-P.z); if(pd<140) shake=Math.max(shake,(P.kind==='mountain'?0.18:0.08)*(1-pd/140)); } }
  showAvatar(P,dt); if(P.i>=P.steps){ complete(P); return true; } return false; }
function finishNow(P){ if(!P||P.done) return; const was=cur; if(!cur||cur.id!==P.region){ cur=get(P.region); }
  applySteps(P,P.steps-P.i,false); if(P.lakeRec) delete P.lakeRec.anim; if(P.riverRec) delete P.riverRec.show; complete(P); cur=was; }
function complete(P){ if(P.done) return; P.done=true; const r=cache.get(io.key()+':'+P.region)||cur; growing.forEach(t=>t.g=1); growing=[]; while(P.kind==='grove'&&(P.fi||0)<P.flowers.length) plantF(P,r,false); growingF.forEach(f=>f.g=1); growingF=[];
  r.feats.push([KCODE[P.kind],P.x,P.z,P.r]); r.dirty=true; bbox(r); hideAvatar(); treeTimer=-1e9; if(r===cur){ placeTrees(null,null,true); if(P.kind!=='grove'&&P.kind!=='meadow') natCache.clear(); flDirty=[-1e9,-1e9,1e9,1e9]; buildPatches(); placeFlowers(null,null); } }
/* Mori's seed-self: a projection of Mori that appears at the edit spot */
function showAvatar(P,dt){ if(!tfRoot) return; if(!avatar){ avatar=HERO.build(Object.assign({},HERO.PRESETS.mori)); avatar.scale.setScalar(1.15); avatar.traverse(o=>{ if(o.material&&o.material.emissive){ o.material=o.material.clone(); o.material.emissive.set('#3a8a10'); o.material.emissiveIntensity=0.35; } }); }
  if(!avatarOn){ tfRoot.add(avatar); avatarOn=true; ring.visible=true; }
  const GR=P.kind==='grove'||P.kind==='meadow'; const ax=GR?P.x+Math.cos(P.t*0.6)*P.r*0.55:P.ax, az=GR?P.z+Math.sin(P.t*0.6)*P.r*0.55:P.az; const y=Math.max(SW.heightAt(ax,az),waterAt(ax,az)||-1e9);
  avatar.position.set(ax,y+0.2+Math.sin(P.t*2)*0.15,az); avatar.lookAt(P.x,y+0.2,P.z); HERO.animate(avatar,P.t,0);
  const U=avatar.userData.hero; if(U&&U.limbs.armL){ U.limbs.armL.rotation.x=-2.4+Math.sin(P.t*3)*0.25; U.limbs.armR.rotation.x=-2.4-Math.sin(P.t*3)*0.25; }
  ring.position.set(ax,y+0.15,az); ring.scale.setScalar(1.6+Math.sin(P.t*4)*0.25);
  if(Math.random()<0.5) emit(part.sp,ax,y+1.4,az,1,1.2,1.6); }
function hideAvatar(){ if(avatarOn&&tfRoot){ tfRoot.remove(avatar); avatarOn=false; ring.visible=false; } }
/* per-frame update: FX, growing trees, throttled near-player tree placement */
function update(dt,px,pz){ if(!tfRoot||!cur) return; if(needVis) buildVis(); stepParts(part.sp,dt,-0.6); stepParts(part.du,dt,1.4); shake=Math.max(0,shake-dt*0.5);
  if(growing.length){ growing.forEach(t=>t.g=Math.min(1,t.g+dt*0.8)); growing=growing.filter(t=>t.g<1); if(treeTimer<-1e8) treeTimer=0.05; }
  if(growingF.length){ growingF.forEach(f=>f.g=Math.min(1,f.g+dt*1.2)); growingF=growingF.filter(f=>f.g<1); flT=0; }
  flT-=dt; if(flT<=0||!lastFlAt||Math.hypot(px-lastFlAt[0],pz-lastFlAt[1])>10||(flDirty&&treeTimer<=0&&treeTimer>-1e8)){ placeFlowers(px,pz); flT=growingF.length?0.08:1e9; }
  treeTimer-=dt; const moved=!lastTreeAt||Math.hypot(px-lastTreeAt[0],pz-lastTreeAt[1])>12; if(moved||(treeTimer<=0&&treeTimer>-1e8)){ placeTrees(px,pz); treeTimer=growing.length?0.05:-1e9; } }
window.TERRAFORM={ KINDS, CAP, CELL,
  init(o){ io=o; }, reset(){ flush(); cache.clear(); cur=null; },
  bind(id){ if(id<0){ cur=null; if(tfRoot) clearVis(); hideAvatar(); return null; } attach(); cur=get(id); needVis=true; return deltaAt; },
  get cur(){ return cur; }, deltaAt, waterAt, blocks, plan, tick, finishNow, update, flush, pickSpot, get shake(){ return shake; },
  setQuality(q){ quality=Object.assign(quality,q); lastTreeAt=null; lastFlAt=null; },
  stats(){ return {region:cur&&cur.id, cells:cur?cur.cells.size:0, trees:cur?cur.trees.length:0, drawnTrees:pine?pine.count+oak.count:0, feats:cur?cur.feats.length:0, lakes:cur?cur.lakes.length:0, rivers:cur?cur.rivers.length:0, cached:cache.size,
    particles:part.sp?part.sp.live+part.du.live:0, flowers:cur?cur.flowers.length:0, drawnFlowers:flora?flora.drawn||0:0, flowerDraws:flora?flora.draws:0, flowerTris:flora?flora.tris||0:0, patches:patchMesh.length, bytes:cur?encodeCells(cur.cells).length:0}; },
  summary(id){ const r=id==null?cur:get(id); if(!r) return ''; const c={}; r.feats.forEach(f=>{ const k=KNAME[f[0]]; c[k]=(c[k]||0)+1; }); return {counts:c, trees:r.trees.length, flowers:r.flowers.length, cells:r.cells.size}; },
  encode, decode,
  /* v3.4: what the impostor layer draws beyond the 3D cut: Mori's planted trees + one clump card per natural flower patch */
  cardSources(px,pz,r0,r1){ const trees=[], fl=[]; if(!cur) return {trees,fl};
    for(const t of cur.trees){ const d=Math.hypot(t[0]-px,t[1]-pz); if(d<r0||d>r1) continue; const g=t.g!=null?t.g:1; if(g<0.3) continue; trees.push([t[0],t[1],t[2]*g,t[3]]); }
    if(quality.natural!==false&&window.FLORA){ const G=44, R=Math.min(r1,240), i0=Math.floor((px-R)/G), i1=Math.floor((px+R)/G), j0=Math.floor((pz-R)/G), j1=Math.floor((pz+R)/G);
      for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const cx=(i+0.5)*G, cz=(j+0.5)*G; const dd=Math.hypot(cx-px,cz-pz); if(dd>R+G||dd<r0-G) continue; const p=natPatch(i,j); if(p.length<4) continue;
        let sx=0, sz=0; const cnt={}; p.forEach(f=>{ sx+=f[0]; sz+=f[2]; cnt[f[3]]=(cnt[f[3]]||0)+1; }); sx/=p.length; sz/=p.length; const d=Math.hypot(sx-px,sz-pz); if(d<r0||d>R) continue;
        let rad=0; p.forEach(f=>{ rad=Math.max(rad,Math.hypot(f[0]-sx,f[2]-sz)); }); const sp=+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]; fl.push([sx,sz,Math.max(3,rad),sp,p.length]); } }
    return {trees,fl}; } };
})();
