/* SEEDWORLD — streams the seeded planet around the player (chunks + LOD), draws the gray wireframe void,
   places roads / villages / city-states / barrows for programmed regions, and renders the globe map.
   The local frame is a tangent plane at a region centre (the planet is 3,185 km in radius, so a few km of
   ground is flat to the eye). +x = east, -z = north, y = metres above the frame's reference height. */
(function(){
'use strict';
const T=THREE, P=PLANET, M=HERO.M;
const MTon=!!(window.MT&&MT.on), TX=(kind,hex,scale,o)=>MTon?MT.M(kind,hex,scale,o):M(hex,o); // Mori Templates (optional pack)
const smooth=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const CH=64; // chunk size in metres
let opt=null, scene=null, root=null, chunkRoot=null, siteRoot=null, water=null;
const F={ id:-1, guild:false, O:[0,0,1], E:[1,0,0], Nn:[0,1,0], e0:0, stage:0, seaY:null, A:{x:0,z:0}, L:{x:0,z:8}, roads:[], flats:[], targets:[], colliders:{segs:[],circles:[]}, info:null };
const corner=new Map(); // "ix,iz" -> {e, rough, col:[r,g,b], reg}
const chunks=new Map(); // key -> {lod, obj, reg}
const tmpC=new T.Color();
const BCOL={}; for(const k in P.BIOMES) BCOL[k]=new T.Color(P.BIOMES[k].c);

function toDir(x,z){ const R=P.R; const px=F.O[0]*R+F.E[0]*x-F.Nn[0]*z, py=F.O[1]*R+F.E[1]*x-F.Nn[1]*z, pz=F.O[2]*R+F.E[2]*x-F.Nn[2]*z; const l=Math.hypot(px,py,pz); return [px/l,py/l,pz/l]; }
function toLocal(d){ // unit dir -> local x,z (approximate, for directions)
  return {x:(d[0]*F.E[0]+d[1]*F.E[1]+d[2]*F.E[2])*P.R, z:-(d[0]*F.Nn[0]+d[1]*F.Nn[1]+d[2]*F.Nn[2])*P.R}; }
function stageOf(id){ return opt.stage(id)||0; }
function cornerAt(ix,iz){ const k=ix+','+iz; let c=corner.get(k); if(c) return c;
  const d=toDir(ix*CH,iz*CH); const s=P.sample(d[0],d[1],d[2]); const reg=P.regionOf(d[0],d[1],d[2]);
  const col=BCOL[s.biome]; c={e:s.e, rough:P.BIOMES[s.biome].rough, r:col.r, g:col.g, b:col.b, reg, biome:s.biome}; corner.set(k,c); return c; }
function regionAtLocal(x,z){ const d=toDir(x,z); return P.regionOf(d[0],d[1],d[2]); }
function chunkVoid(ix,iz){ const c=cornerAt(ix,iz); return stageOf(regionAtLocal((ix+0.5)*CH,(iz+0.5)*CH))===0; }
function rawH(x,z){ const ix=Math.floor(x/CH), iz=Math.floor(z/CH); if(chunkVoid(ix,iz)) return {h:0, v:true};
  const fx=x/CH-ix, fz=z/CH-iz; const a=cornerAt(ix,iz), b=cornerAt(ix+1,iz), c=cornerAt(ix,iz+1), d=cornerAt(ix+1,iz+1);
  const e=(a.e*(1-fx)+b.e*fx)*(1-fz)+(c.e*(1-fx)+d.e*fx)*fz, ro=(a.rough*(1-fx)+b.rough*fx)*(1-fz)+(c.rough*(1-fx)+d.rough*fx)*fz;
  const R=P.R; const px=F.O[0]*R+F.E[0]*x-F.Nn[0]*z, py=F.O[1]*R+F.E[1]*x-F.Nn[1]*z, pz=F.O[2]*R+F.E[2]*x-F.Nn[2]*z;
  let h=(e-F.e0)+P.detail(px,py,pz,ro)-F.d0; return {h, e, ro, fx, fz, a, b, c, d, v:false}; }
/* terraform hook (v3.2): TFD(x,z) = Mori's height delta for the current region (sparse grid, see terraform.js) */
let TFD=null;
function heightAt(x,z){ const h=baseHeightAt(x,z); return TFD?h+TFD(x,z):h; }
function baseHeightAt(x,z){ const r=rawH(x,z); if(r.v) return 0; let h=r.h;
  for(const f of F.flats){ const k=1-smooth(f.r0,f.r1,Math.hypot(x-f.x,z-f.z)); if(k>0) h=h*(1-k)+f.h*k; }
  if(F.guild&&opt.v2height){ const k=smooth(110,200,Math.hypot(x,z)); h=opt.v2height(x,z)*(1-k)+h*k; }
  return h; }
function roadDist(x,z){ let best=1e9; for(const s of F.roads){ const [x1,z1,x2,z2]=s; const vx=x2-x1, vz=z2-z1, L=vx*vx+vz*vz; let t=((x-x1)*vx+(z-z1)*vz)/L; t=Math.max(0,Math.min(1,t)); const d=Math.hypot(x-(x1+vx*t),z-(z1+vz*t)); if(d<best) best=d; } return best; }

/* ---------- chunks ---------- */
let matLand, matVoid, matVoidLine, voidPlaneG, voidLineG, treeG, trunkG, treeM, trunkM;
function mats(){ matLand=new T.MeshLambertMaterial({vertexColors:true});
  matVoid=new T.MeshBasicMaterial({color:'#2c2f36'}); matVoidLine=new T.LineBasicMaterial({color:'#9aa0aa', transparent:true, opacity:0.55});
  voidPlaneG=new T.PlaneGeometry(CH,CH,1,1); voidPlaneG.rotateX(-Math.PI/2); voidPlaneG.translate(CH/2,-0.02,CH/2);
  const pts=[]; const n=8; for(let i=0;i<=n;i++){ const t=i/n*CH; pts.push(t,0,0, t,0,CH, 0,0,t, CH,0,t); } voidLineG=new T.BufferGeometry(); voidLineG.setAttribute('position',new T.Float32BufferAttribute(pts,3));
  treeG=new T.ConeGeometry(1.6,4.6,6); treeG.translate(0,4.2,0); trunkG=new T.CylinderGeometry(0.25,0.32,2.2,5); trunkG.translate(0,1.1,0);
  treeM=new T.MeshLambertMaterial({color:'#ffffff'}); trunkM=new T.MeshLambertMaterial({color:'#5a3d24'}); }
const Q={R:5, near:1, refreshCap:2, refreshMs:2.5, poolMax:12}; // set by the game's frame-time governor
function lodFor(d){ return d<=Q.near?16:d<=3?8:4; }
const pool={}, idxCache={}; // reused land geometries per LOD (memory budget: at most Q.poolMax spare per LOD)
function idxFor(seg){ if(idxCache[seg]) return idxCache[seg]; const n=seg+1, a=new Uint16Array(seg*seg*6); let q=0;
  for(let j=0;j<seg;j++) for(let i=0;i<seg;i++){ const A=j*n+i, B=A+1, C=A+n, D=C+1; a[q++]=A; a[q++]=C; a[q++]=B; a[q++]=B; a[q++]=C; a[q++]=D; } return idxCache[seg]=a; }
function tint(col,k,d){ if(d>4){ const t=smooth(4,26,d); col[k]+=(0.47-col[k])*t; col[k+1]+=(0.45-col[k+1])*t; col[k+2]+=(0.42-col[k+2])*t;
    if(d>30){ const u=smooth(30,46,d); col[k]+=(0.94-col[k])*u; col[k+1]+=(0.95-col[k+1])*u; col[k+2]+=(0.98-col[k+2])*u; } }
  else if(d<-0.7){ const t=smooth(0.7,2.6,-d)*0.85; col[k]+=(0.40-col[k])*t; col[k+1]+=(0.34-col[k+1])*t; col[k+2]+=(0.24-col[k+2])*t; } }
function finishColor(col,k,bcol,d,h){ col[k]=bcol[k]; col[k+1]=bcol[k+1]; col[k+2]=bcol[k+2]; if(d) tint(col,k,d);
  if(F.seaY!=null&&h<F.seaY+1.2){ col[k]=col[k]*0.5+0.43; col[k+1]=col[k+1]*0.5+0.4; col[k+2]=col[k+2]*0.5+0.27; } }
const stat={refreshed:0, refreshTotal:0, built:0, builtTotal:0, pooled:0, reused:0};
const dummy=new T.Object3D();
function treeBlocked(x,z,h){ return (F.seaY!=null&&h<F.seaY+1)||(opt.tf&&opt.tf.blocks(x,z,h)); }
const CUT={x:0,z:0,r:1e9};
function placeChunkTrees(c,keepH){ const t=c.tl; if(!t) return; if(!t.h||!keepH){ t.h=new Float32Array(t.list.length); t.bl=new Uint8Array(t.list.length); t.list.forEach(([x,z],i)=>{ const h=heightAt(x,z); t.h[i]=h; t.bl[i]=treeBlocked(x,z,h)?1:0; }); }
  t.cut=CUT.r; t.cx=CUT.x; t.cz=CUT.z; let shown=0;
  t.list.forEach(([x,z,s],i)=>{ const h=t.h[i]; const bl=t.bl[i]||Math.hypot(x-CUT.x,z-CUT.z)>CUT.r; if(!bl) shown++;
    dummy.position.set(x-c.ix*CH,h-0.3,z-c.iz*CH); const k=bl?0.0001:s; dummy.scale.set(k,k*(t.taiga?1.4:1),k); dummy.rotation.set(0,i,0); dummy.updateMatrix(); t.cr.setMatrixAt(i,dummy.matrix); t.tr.setMatrixAt(i,dummy.matrix); });
  t.shown=shown; t.cr.instanceMatrix.needsUpdate=true; t.tr.instanceMatrix.needsUpdate=true; t.cr.computeBoundingSphere&&t.cr.computeBoundingSphere(); }
/* v3.4: 3D trees only inside the card distance; beyond it the impostor layer draws them (re-placed only when the cut moves 6 m) */
function cutTrees(px,pz,r){ CUT.x=px; CUT.z=pz; CUT.r=r; let n=0; for(const [,c] of chunks){ if(!c.tl) continue; const dx=(c.ix+0.5)*CH-px, dz=(c.iz+0.5)*CH-pz, dd=Math.hypot(dx,dz);
    const inside=dd+CH*0.72<r, outside=dd-CH*0.72>r; if(inside&&c.tl.mode==='in'&&c.tl.shown!=null) continue; if(outside&&c.tl.mode==='out') continue;
    c.tl.mode=inside?'in':outside?'out':'edge'; placeChunkTrees(c,true); n++; } return n; }
function cutSites(px,pz,r){ let hid=0; siteRoot.children.forEach(o=>{ const cd=o.userData.card; if(!cd) return; const v=Math.hypot(o.position.x-px,o.position.z-pz)<=r*(cd.big?1.6:1); if(o.visible!==v) o.visible=v; if(!v) hid++; }); return hid; }
/* v3.4: the seed's tree list for any chunk (near chunks draw it in 3D, far chunks hand it to the impostor cards) */
const tlCache=new Map();
function treeList(ix,iz){ const key=F.id+':'+ix+','+iz; let r=tlCache.get(key); if(r) return r; const cc=cornerAt(ix,iz); const B=P.BIOMES[cc.biome]; const cnt=chunkVoid(ix,iz)?0:Math.round((B.trees||0)*(opt.mobile?0.6:1)); const list=[];
  if(cnt>0){ const rnd=P.rngFor(P.seed,'tree',F.id,ix,iz);
    for(let t=0;t<cnt*2&&list.length<cnt;t++){ const x=ix*CH+rnd()*CH, z=iz*CH+rnd()*CH; const h=baseHeightAt(x,z); const s=0.7+rnd()*0.7;
      if(F.seaY!=null&&h<F.seaY+1) continue; if(F.flats.some(f=>Math.hypot(x-f.x,z-f.z)<f.r1*0.9)) continue; if(F.guild&&Math.hypot(x,z)<70) continue; if(F.roads.length&&roadDist(x,z)<5) continue; list.push([x,z,s]); } }
  r={list, biome:cc.biome}; tlCache.set(key,r); if(tlCache.size>900) tlCache.delete(tlCache.keys().next().value); return r; }
function buildChunk(ix,iz,seg,near){
  const g=new T.Group(); g.position.set(ix*CH,0,iz*CH); const rec={lod:seg, near, obj:g, ix, iz, seg};
  if(chunkVoid(ix,iz)){ const p=new T.Mesh(voidPlaneG,matVoid); g.add(p); const l=new T.LineSegments(voidLineG,matVoidLine); g.add(l); g.userData.void=true; return rec; }
  const n=seg+1; let geo=(pool[seg]||[]).pop(), pos, col; if(geo){ stat.reused++; pos=geo.attributes.position.array; col=geo.attributes.color.array; } else { pos=new Float32Array(n*n*3); col=new Float32Array(n*n*3); }
  const base=new Float32Array(n*n), bcol=new Float32Array(n*n*3);
  const a=cornerAt(ix,iz), b=cornerAt(ix+1,iz), c=cornerAt(ix,iz+1), d=cornerAt(ix+1,iz+1);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const lx=i/seg*CH, lz=j/seg*CH, x=ix*CH+lx, z=iz*CH+lz; const bh=baseHeightAt(x,z), dd=TFD?TFD(x,z):0, h=bh+dd; const v=j*n+i, k=v*3;
    base[v]=bh; pos[k]=lx; pos[k+1]=h; pos[k+2]=lz;
    const fx=lx/CH, fz=lz/CH;
    let r=(a.r*(1-fx)+b.r*fx)*(1-fz)+(c.r*(1-fx)+d.r*fx)*fz, gg=(a.g*(1-fx)+b.g*fx)*(1-fz)+(c.g*(1-fx)+d.g*fx)*fz, bb=(a.b*(1-fx)+b.b*fx)*(1-fz)+(c.b*(1-fx)+d.b*fx)*fz;
    const nz=(Math.sin(x*0.37)*Math.cos(z*0.29)+Math.sin(x*0.11+z*0.07))*0.03; r+=nz; gg+=nz; bb+=nz*0.5;
    if(F.guild&&Math.hypot(x,z)<120){ const t=1-smooth(60,120,Math.hypot(x,z)); r=r*(1-t)+0.33*t; gg=gg*(1-t)+0.5*t; bb=bb*(1-t)+0.24*t; }
    if(F.roads.length){ const rd=roadDist(x,z); if(rd<3.2){ const t=1-smooth(1.8,3.2,rd); r=r*(1-t)+0.5*t; gg=gg*(1-t)+0.4*t; bb=bb*(1-t)+0.27*t; } }
    bcol[k]=r; bcol[k+1]=gg; bcol[k+2]=bb; finishColor(col,k,bcol,dd,h); }
  if(!geo){ geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(pos,3)); geo.setAttribute('color',new T.BufferAttribute(col,3)); geo.setIndex(new T.BufferAttribute(idxFor(seg),1)); geo.userData.seg=seg; }
  else { geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true; }
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  const m=new T.Mesh(geo,matLand); m.receiveShadow=!opt.mobile; g.add(m); rec.land=m; rec.base=base; rec.bcol=bcol;
  if(near){ // biome trees (instanced, near chunks only)
    const cc=a; const list=treeList(ix,iz).list; {
      if(list.length){ const cr=new T.InstancedMesh(treeG,treeM,list.length), tr=new T.InstancedMesh(trunkG,trunkM,list.length);
        const tc=cc.biome==='taiga'?'#2f4f3a':cc.biome==='jungle'?'#2f7d2a':cc.biome==='savanna'?'#7d8a3a':cc.biome==='swamp'?'#3d5230':cc.biome==='mountain'?'#4a5e48':'#3b6b2c';
        list.forEach((_,i)=>cr.setColorAt(i,tmpC.set(tc).offsetHSL(0,0,(i%3-1)*0.03)));
        rec.tl={list, cr, tr, taiga:cc.biome==='taiga'}; placeChunkTrees(rec);
        cr.castShadow=!opt.mobile; g.add(cr); g.add(tr); } } }
  return rec; }
function refreshChunk(c){ const g=c.land.geometry, pos=g.attributes.position.array, col=g.attributes.color.array, n=c.seg+1, ox=c.ix*CH, oz=c.iz*CH;
  for(let v=0;v<n*n;v++){ const k=v*3; const d=TFD?TFD(ox+pos[k],oz+pos[k+2]):0; const h=c.base[v]+d; pos[k+1]=h; finishColor(col,k,c.bcol,d,h); }
  g.attributes.position.needsUpdate=true; g.attributes.color.needsUpdate=true; g.computeVertexNormals(); g.computeBoundingSphere(); if(c.tl) placeChunkTrees(c); }
function disposeChunk(c){ chunkRoot.remove(c.obj); c.obj.traverse(o=>{ if(o.isInstancedMesh){ o.dispose(); return; }
    if(o===c.land){ const sg=o.geometry.userData.seg; const pl=pool[sg]||(pool[sg]=[]); if(pl.length<Q.poolMax){ pl.push(o.geometry); stat.pooled++; } else o.geometry.dispose(); return; }
    if(o.geometry&&o.geometry!==voidPlaneG&&o.geometry!==voidLineG&&o.geometry!==treeG&&o.geometry!==trunkG) o.geometry.dispose(); }); }
const dirty=new Set();
function markDirty(x0,z0,x1,z1){ const a=Math.floor(x0/CH), b=Math.floor(x1/CH), c=Math.floor(z0/CH), d=Math.floor(z1/CH); for(let ix=a;ix<=b;ix++) for(let iz=c;iz<=d;iz++){ const k=ix+','+iz; if(chunks.has(k)) dirty.add(k); } }
function processDirty(){ stat.refreshed=0; if(!dirty.size) return 0; const t0=performance.now();
  for(const k of dirty){ if(stat.refreshed>=Q.refreshCap||performance.now()-t0>Q.refreshMs) break; dirty.delete(k); const c=chunks.get(k); if(c&&c.land){ refreshChunk(c); stat.refreshed++; stat.refreshTotal++; } }
  return stat.refreshed; }
let lastPC=null;
function update(px,pz,budget){ if(F.id<0) return 0; const R=Q.R; const cx=Math.floor(px/CH), cz=Math.floor(pz/CH);
  const want=[]; for(let dz=-R;dz<=R;dz++) for(let dx=-R;dx<=R;dx++){ const d=Math.max(Math.abs(dx),Math.abs(dz)); if(Math.hypot(dx,dz)>R+0.5) continue; want.push([cx+dx,cz+dz,d]); }
  want.sort((a,b)=>a[2]-b[2]); const keep=new Set(); let built=0; budget=budget==null?(opt.mobile?2:4):budget;
  for(const [ix,iz,d] of want){ const k=ix+','+iz; keep.add(k); const lod=lodFor(d), near=d<=Q.near+1; const c=chunks.get(k);
    if(c&&c.lod===lod&&c.near===near) continue; if(c&&c.obj.userData.void){ continue; }
    if(built>=budget) continue; if(c){ disposeChunk(c); dirty.delete(k); } const rec=buildChunk(ix,iz,lod,near); chunkRoot.add(rec.obj); chunks.set(k,rec); built++; }
  for(const [k,c] of chunks){ if(!keep.has(k)){ disposeChunk(c); chunks.delete(k); dirty.delete(k); } }
  stat.built=built; stat.builtTotal+=built; processDirty();
  if(water){ water.position.x=Math.round(px/50)*50; water.position.z=Math.round(pz/50)*50; }
  if(corner.size>6000) corner.clear();
  return built; }
function clearChunks(){ for(const [k,c] of chunks) disposeChunk(c); chunks.clear(); corner.clear(); dirty.clear(); }

/* ---------- settlements ---------- */
function bannerTex(cs){ const c=document.createElement('canvas'); c.width=128; c.height=192; const x=c.getContext('2d');
  x.fillStyle=cs.banner[0]; x.fillRect(0,0,128,192); x.fillStyle=cs.banner[1];
  if(cs.paint){ cs.paint(x,c); const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }
  const r=P.rngFor(P.seed,'ban',cs.id); const pat=Math.floor(r()*4);
  if(pat===0) x.fillRect(0,0,64,192); else if(pat===1) x.fillRect(0,64,128,64); else if(pat===2){ x.beginPath(); x.moveTo(0,0); x.lineTo(128,192); x.lineTo(0,192); x.fill(); } else { x.beginPath(); x.arc(64,90,34,0,7); x.fill(); }
  x.fillStyle=cs.banner[1]===cs.banner[0]?'#fff':(pat===3?cs.banner[0]:cs.banner[1]); x.font='bold 54px Georgia,serif'; x.textAlign='center'; x.textBaseline='middle';
  const glyph={lord:'♜',council:'⚖',theocracy:'☀',guild:'⚒',clan:'☠',sanctum:'✠'}[cs.gov]||'✦'; x.fillStyle=pat===3?cs.banner[0]:'#ffffff'; x.globalAlpha=0.92; x.fillText(glyph,64,92);
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }
function signSprite(lines, col){ const c=document.createElement('canvas'); c.width=512; c.height=128; const x=c.getContext('2d');
  x.fillStyle='rgba(12,10,20,0.78)'; x.fillRect(0,0,512,128); x.strokeStyle=col||'#facc15'; x.lineWidth=6; x.strokeRect(3,3,506,122);
  x.fillStyle='#fff'; x.textAlign='center'; x.font='bold 44px Georgia,serif'; x.fillText(lines[0],256,52); x.font='26px Georgia,serif'; x.fillStyle='#e9e2cc'; x.fillText(lines[1]||'',256,98);
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; const s=new T.Sprite(new T.SpriteMaterial({map:t, depthWrite:false})); s.scale.set(16,4,1); return s; }
function mk(g,m,x,y,z,parent){ if(MTon) MT.fit(g,m); const o=new T.Mesh(g,m); o.position.set(x,y,z); o.castShadow=!opt.mobile; o.receiveShadow=!opt.mobile; (parent||siteRoot).add(o); return o; }
function house(x,z,rnd,scale){ const h=heightAt(x,z); const w=4+rnd()*3, d=4+rnd()*2.5, ht=2.6+rnd()*1.4; const g=new T.Group(); g.position.set(x,h,z); g.rotation.y=rnd()*Math.PI*2; siteRoot.add(g);
  const r1=rnd(), r2=rnd(); const WL=MTon?MT.list('buildings.walls',['#cdb48a']):['#cdb48a','#b9a07a','#d8cfbf','#a78462','#e2d6b8'], RL=MTon?MT.list('buildings.roofs',['#8a3b26']):['#8a3b26','#5a4a3a','#3d5a6b','#6b3a5a','#7a6a2a'];
  const wall=WL[Math.floor(r1*WL.length)], roof=RL[Math.floor(r2*RL.length)];
  mk(new T.BoxGeometry(w,ht,d),TX('plaster',wall,2.5),0,ht/2,0,g); const r=mk(new T.ConeGeometry(Math.hypot(w,d)/2*1.05,2.2,4),TX('roof_shingle',roof,1.5),0,ht+1.1,0,g); r.rotation.y=Math.PI/4; r.scale.z=d/w;
  mk(new T.BoxGeometry(1,1.8,0.1),TX('wood_planks','#4a3020',1),0,0.9,d/2+0.05,g); F.colliders.circles.push({x,z,r:Math.max(w,d)*0.55});
  g.userData.card={cell:opt.houseCell?opt.houseCell(x,z):4, w:Math.max(w,d)*1.15, h:ht+2.4, tint:wall}; return g; }
function buildSite(){
  const id=F.id, st=F.stage, inf=F.info; const rnd=P.rngFor(P.seed,'site',id); const A=F.A;
  // the waystone you arrive at
  if(!F.guild){ const L=F.L; const ws=new T.Group(); ws.position.set(L.x+3,heightAt(L.x+3,L.z-2),L.z-2); siteRoot.add(ws);
    mk(new T.CylinderGeometry(0.5,0.8,2.6,6),M('#6f7480'),0,1.3,0,ws); const rune=mk(new T.TorusGeometry(0.7,0.06,6,20),M('#a3ff12',{e:'#a3ff12',ei:1}),0,2.0,0,ws); ws.userData.rune=rune; F.waystone=ws;
    F.colliders.circles.push({x:L.x+3,z:L.z-2,r:0.9}); F.targets.push({x:L.x+3,z:L.z-1,r:3.2,label:'🗿 Waystone — open the Globe',kind:'globe'}); }
  if(st===0){ if(!F.guild) F.targets.push({x:F.L.x,z:F.L.z-8,r:6,label:'▦ Unprogrammed void — ask Mori to seed it',kind:'void'}); return; }
  if(!inf.isLand) return;
  // roads to programmed neighbours
  if(st>=2){ const nb=P.neighbors(id).filter(n=>stageOf(n)>=2&&P.regionInfo(n).isLand); const dirs=nb.map(n=>{ const l=toLocal(P.regionCenter(n)); const m=Math.hypot(l.x,l.z)||1; return [l.x/m,l.z/m]; });
    if(!dirs.length) dirs.push([1,0],[-0.3,-0.95]);
    dirs.forEach(([dx,dz])=>F.roads.push([A.x,A.z,A.x+dx*900,A.z+dz*900]));
    if(F.guild) F.roads.push([0,22,A.x,A.z]);
    // milestones
    F.roads.forEach(([x1,z1,x2,z2])=>{ const L=Math.hypot(x2-x1,z2-z1); for(let s=90;s<L;s+=120){ const x=x1+(x2-x1)*s/L+3, z=z1+(z2-z1)*s/L; mk(new T.BoxGeometry(0.6,1.2,0.4),TX('stone_rubble','#8d8a80',1),x,heightAt(x,z)+0.5,z); } });
    if(MTon) MT.road(siteRoot,F.roads,heightAt,{width:4.6,step:4,scale:4,lift:0.09}); } // Mori Templates gravel ribbons over the tinted road bed
  // barrow dungeon
  if(st>=2&&!F.guild&&rnd()<0.75){ const bx=A.x-80, bz=A.z-70; F.flats.push({x:bx,z:bz,r0:8,r1:18,h:rawH(bx,bz).h});
    const g=new T.Group(); g.position.set(bx,heightAt(bx,bz),bz); siteRoot.add(g); const stone=TX('stone_rubble','#5d5a56',1.4);
    mk(new T.SphereGeometry(7,12,6,0,Math.PI*2,0,Math.PI/2),M('#4f6b38'),0,-1,0,g).scale.y=0.55;
    mk(new T.BoxGeometry(0.9,3.4,0.9),stone,-1.8,1.7,5.6,g); mk(new T.BoxGeometry(0.9,3.4,0.9),stone,1.8,1.7,5.6,g); mk(new T.BoxGeometry(4.6,0.8,1.1),stone,0,3.6,5.6,g);
    mk(new T.PlaneGeometry(2.7,2.8),new T.MeshBasicMaterial({color:'#050508'}),0,1.4,5.5,g);
    const nm=P.regionName(id).replace(/^The /,'').split(' ')[0]+' Barrow'; const lv=Math.min(9,1+Math.round(P.angle(P.regionCenter(id),P.regionCenter(opt.guildId()))*4));
    F.colliders.circles.push({x:bx,z:bz,r:6.4}); F.targets.push({x:bx,z:bz+8,r:3.4,label:'🕳 Enter the '+nm+' (danger +'+lv+')',kind:'dungeon',name:nm,lvl:lv}); F.barrow={x:bx,z:bz+9}; }
  // villages
  if(st>=3){ const n=st>=4?14:9; for(let i=0;i<n;i++){ const a=rnd()*Math.PI*2, r=18+rnd()*(st>=4?44:40); const x=A.x+Math.cos(a)*r, z=A.z+Math.sin(a)*r; if(F.roads.length&&roadDist(x,z)<5) continue; house(x,z,rnd); }
    const wl=mk(new T.CylinderGeometry(1.2,1.3,1,10),TX('stone_block','#8d8a80',1.2),A.x,heightAt(A.x,A.z)+0.5,A.z); F.colliders.circles.push({x:A.x,z:A.z,r:1.5});
    if(st<4) F.targets.push({x:A.x,z:A.z+2.5,r:4,label:'🏘 Village of '+P.regionName(id).replace(/^The |^High |^Low |^Old /,'').split(' ')[0],kind:'village'}); }
  // city-state
  if(st>=4){ const cs=P.cityState(id,opt.guildId()); const stone=TX('stone_castle','#9a958a',3), dark=TX('stone_castle','#6e6a62',3); const h0=heightAt(A.x,A.z); const RW=72, segs=28;
    const gates=F.roads.filter(r=>r[0]===A.x&&r[1]===A.z).map(r=>Math.atan2(r[3]-r[1],r[2]-r[0]));
    for(let i=0;i<segs;i++){ const a0=i/segs*Math.PI*2, a1=(i+1)/segs*Math.PI*2, am=(a0+a1)/2; if(gates.some(g=>Math.abs(Math.atan2(Math.sin(am-g),Math.cos(am-g)))<0.12)) continue;
      const x0=A.x+Math.cos(a0)*RW, z0=A.z+Math.sin(a0)*RW, x1=A.x+Math.cos(a1)*RW, z1=A.z+Math.sin(a1)*RW; const L=Math.hypot(x1-x0,z1-z0); const mx=(x0+x1)/2, mz=(z0+z1)/2;
      const w=mk(new T.BoxGeometry(L+0.6,6,1.6),stone,mx,heightAt(mx,mz)+2.6,mz); w.rotation.y=-Math.atan2(z1-z0,x1-x0); F.colliders.segs.push([x0,z0,x1,z1]);
      if(i%4===0){ mk(new T.CylinderGeometry(2.2,2.5,9,8),dark,x0,heightAt(x0,z0)+4,z0); mk(new T.ConeGeometry(2.8,3,8),M(cs.banner[0]),x0,heightAt(x0,z0)+10,z0); } }
    // keep
    const kp=new T.Group(); kp.position.set(A.x,h0,A.z-10); siteRoot.add(kp); kp.userData.card={cell:cs.gov==='clan'?7:5, w:20, h:21, big:true}; F.keep=kp;
    mk(new T.BoxGeometry(14,12,12),stone,0,6,0,kp); [[-7,-6],[7,-6],[-7,6],[7,6]].forEach(([x,z])=>{ mk(new T.CylinderGeometry(2,2.2,16,8),dark,x,8,z,kp); mk(new T.ConeGeometry(2.7,4,8),M(cs.banner[0]),x,18,z,kp); });
    mk(new T.BoxGeometry(3,5,0.4),TX('wood_planks','#3a2a1a',1.5),0,2.5,6.1,kp);
    const bm=new T.MeshLambertMaterial({map:bannerTex(cs), side:T.DoubleSide}); [[-4.2],[4.2]].forEach(([x])=>{ const b=mk(new T.PlaneGeometry(2.6,4.2),bm,x,8,6.15,kp); });
    const pole=mk(new T.CylinderGeometry(0.15,0.15,8,5),M('#3a3a3a'),0,16,0,kp); const flag=mk(new T.PlaneGeometry(4.5,3),bm,2.3,18.5,0,kp); F.flag=flag;
    const sg=signSprite([(cs.guild?'⚒ ':'⚑ ')+cs.name, cs.govName+' · '+cs.ruler], cs.banner[0]); sg.position.set(0,25,0); kp.add(sg);
    F.colliders.circles.push({x:A.x,z:A.z-10,r:10}); F.targets.push({x:A.x,z:A.z-2,r:5,label:'⚑ '+cs.name+' — '+cs.ruler,kind:'city',city:id});
    F.city=cs; }
  if(opt.siteHook) opt.siteHook(F,{root:siteRoot,mk,M,TX,heightAt,signSprite,bannerTex,house,rnd});
}

/* ---------- frames ---------- */
function setFrame(id, guild){
  clearChunks(); tlCache.clear(); while(siteRoot.children.length){ const o=siteRoot.children.pop(); o.traverse(q=>{ if(q.geometry) q.geometry.dispose(); }); }
  F.id=id; F.guild=!!guild; F.info=P.regionInfo(id); F.stage=stageOf(id); F.roads=[]; F.flats=[]; F.targets=[]; F.colliders={segs:[],circles:[]}; F.city=null; F.barrow=null; F.flag=null; F.waystone=null; F.keep=null; F.clan=null;
  const O=P.regionCenter(id); F.O=O; let E=P.cross([0,1,0],O); if(Math.hypot(...E)<1e-3) E=[1,0,0]; E=P.norm(E); F.E=E; F.Nn=P.cross(O,E);
  F.e0=F.stage>0?P.elevation(O[0],O[1],O[2]):0; F.d0=0; F.d0=F.stage>0?(rawH(0,0).h):0;
  const inf=F.info; F.seaY=(F.stage>0&&F.e0<400)?-F.e0:null;
  TFD=(opt.tf&&F.stage>0)?opt.tf.bind(id):(opt.tf&&opt.tf.bind(-1),null);
  F.A=guild?{x:170,z:140}:{x:0,z:0}; F.L=guild?{x:0,z:8}:{x:0,z:F.stage>=4?55:F.stage>=3?50:26};
  if(F.stage>0&&inf.isLand&&F.stage>=3) F.flats.push({x:F.A.x,z:F.A.z,r0:F.stage>=4?84:66,r1:F.stage>=4?140:110,h:rawH(F.A.x,F.A.z).h});
  if(!guild&&F.stage>0) F.flats.push({x:F.L.x,z:F.L.z,r0:6,r1:20,h:rawH(F.L.x,F.L.z).h});
  if(water){ root.remove(water); water=null; }
  if(F.seaY!=null){ water=new T.Mesh(new T.PlaneGeometry(1600,1600),new T.MeshLambertMaterial({color:'#2a6db5',transparent:true,opacity:0.82})); water.rotation.x=-Math.PI/2; water.position.y=F.seaY; water.userData.sw=true; root.add(water); }
  buildSite(); lastPC=null; }
function landing(){ const L=F.L; return {x:L.x, z:L.z}; }

/* ---------- globe ---------- */
const G={ scene:null, cam:null, grp:null, mesh:null, samples:null, lines:null, labels:[], open:false, dist:4.3, sel:-1 };
const GRES=48;
function buildGlobe(){
  if(!G.scene){ G.scene=new T.Scene(); G.scene.background=new T.Color('#05060c'); G.cam=new T.PerspectiveCamera(38,1,0.01,100); G.cam.position.set(0,0,G.dist);
    G.scene.add(new T.HemisphereLight('#ffffff','#334',1.2)); const dl=new T.DirectionalLight('#fff',1.6); dl.position.set(3,2,4); G.scene.add(dl);
    const sp=[]; const r=P.rngFor('stars','x'); for(let i=0;i<900;i++){ const d=P.norm([r()-0.5,r()-0.5,r()-0.5]); sp.push(d[0]*40,d[1]*40,d[2]*40); }
    const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.Float32BufferAttribute(sp,3)); G.scene.add(new T.Points(sg,new T.PointsMaterial({color:'#cfd8ff',size:1.3,sizeAttenuation:false})));
    G.grp=new T.Group(); G.scene.add(G.grp);
    const atm=new T.Mesh(new T.SphereGeometry(1.09,40,24),new T.MeshBasicMaterial({color:'#5fa8ff',transparent:true,opacity:0.08,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false})); G.scene.add(atm); }
  if(G.mesh){ G.grp.remove(G.mesh); G.mesh.geometry.dispose(); }
  // cube-sphere mesh, GRES cells per face (3 per region)
  const pos=[], idx=[], smp=[]; const n=GRES+1;
  for(let f=0;f<6;f++){ const base=pos.length/3; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const u=i/GRES*2-1, v=j/GRES*2-1; const d=fromFace(f,u,v); pos.push(d[0],d[1],d[2]);
      // region of a point nudged toward the cell centre so shared edges stay consistent per face
      const uc=Math.max(-0.999,Math.min(0.999,u+(i<GRES?1:-1)*0.5/GRES)), vc=Math.max(-0.999,Math.min(0.999,v+(j<GRES?1:-1)*0.5/GRES)); const dc=fromFace(f,uc,vc);
      const s=P.sample(d[0],d[1],d[2]); smp.push({d, e:s.e, biome:s.biome, reg:P.regionOf(dc[0],dc[1],dc[2])}); }
    for(let j=0;j<GRES;j++) for(let i=0;i<GRES;i++){ const a=base+j*n+i, b=a+1, c=a+n, d=c+1; idx.push(a,b,c, b,d,c); } }
  const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(pos.length),3)); geo.setIndex(idx);
  G.samples=smp; G.mesh=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true})); G.grp.add(G.mesh); refreshGlobe(); }
function fromFace(f,u,v){ u=Math.tan(u*Math.PI/4); v=Math.tan(v*Math.PI/4); let x,y,z;
  if(f===0){ x=1; z=-u; y=v; } else if(f===1){ x=-1; z=u; y=v; } else if(f===2){ y=1; x=u; z=-v; } else if(f===3){ y=-1; x=u; z=v; } else if(f===4){ z=1; x=u; y=v; } else { z=-1; x=-u; y=v; }
  const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
function owners(){ // claimed regions: programmed land within reach of a city-state seat
  const cities=[]; for(let id=0;id<P.COUNT;id++) if(stageOf(id)>=4) cities.push(id);
  const own=new Map(); const cc=cities.map(c=>P.regionCenter(c));
  for(let id=0;id<P.COUNT;id++){ if(stageOf(id)<1) continue; const inf=P.regionInfo(id); if(!inf.isLand) continue; let best=-1, bd=0.3; cities.forEach((c,i)=>{ const a=P.angle(inf.c,cc[i]); if(a<bd){ bd=a; best=c; } }); if(best>=0) own.set(id,best); }
  return {cities, own}; }
function edgeNeighbor(id, k){ const cs=P.regionCorners(id), c=P.regionCenter(id); const a=cs[k], b=cs[(k+1)%4]; const m=P.norm([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]); const o=P.norm([m[0]+(m[0]-c[0])*0.15,m[1]+(m[1]-c[1])*0.15,m[2]+(m[2]-c[2])*0.15]); return P.regionOf(o[0],o[1],o[2]); }
function arc(a,b,r,steps){ const pts=[]; const om=P.angle(a,b); for(let i=0;i<=steps;i++){ const t=i/steps; let p; if(om<1e-4) p=a; else { const s1=Math.sin((1-t)*om)/Math.sin(om), s2=Math.sin(t*om)/Math.sin(om); p=[a[0]*s1+b[0]*s2,a[1]*s1+b[1]*s2,a[2]*s1+b[2]*s2]; }
    const l=r+Math.sin(t*Math.PI)*om*0.18; pts.push(new T.Vector3(p[0]*l,p[1]*l,p[2]*l)); } return pts; }
function refreshGlobe(){ if(!G.mesh) return; const {cities, own}=owners(); G.own=own; G.cities=cities;
  const col=G.mesh.geometry.attributes.color, pos=G.mesh.geometry.attributes.position; const c=new T.Color(), vc=new T.Color('#4a4e57');
  G.samples.forEach((s,i)=>{ const st=stageOf(s.reg); let r=1;
    if(st===0){ c.copy(vc); } else { c.copy(BCOL[s.biome]); if(s.e>0) r=1+Math.min(s.e,6000)/P.R*12; const o=own.get(s.reg); if(o!=null){ tmpC.set(P.cityState(o,opt.guildId()).banner[0]); c.lerp(tmpC,0.38); } if(st>=2&&s.e>0) c.offsetHSL(0,0,0.03); }
    col.setXYZ(i,c.r,c.g,c.b); pos.setXYZ(i,s.d[0]*r,s.d[1]*r,s.d[2]*r); });
  col.needsUpdate=true; pos.needsUpdate=true; G.mesh.geometry.computeVertexNormals(); G.mesh.geometry.computeBoundingSphere();
  // lines: void wireframe, region grid, borders, relations, markers
  if(G.lines){ G.grp.remove(G.lines); G.lines.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); G.labels.forEach(l=>l.el.remove()); G.labels=[]; }
  const L=new T.Group(); G.lines=L; G.grp.add(L);
  const vp=[], gp=[], bp=[], bc=[]; const SUB=3;
  for(let id=0;id<P.COUNT;id++){ const st=stageOf(id); const f=Math.floor(id/(P.N*P.N)), rr=id%(P.N*P.N), j=Math.floor(rr/P.N), i=rr%P.N;
    const u0=i/P.N*2-1, v0=j/P.N*2-1, du=2/P.N;
    if(st===0){ for(let k=0;k<=SUB;k++){ for(let s=0;s<SUB;s++){ const a=fromFace(f,u0+du*k/SUB,v0+du*s/SUB), b=fromFace(f,u0+du*k/SUB,v0+du*(s+1)/SUB); vp.push(a[0]*1.002,a[1]*1.002,a[2]*1.002,b[0]*1.002,b[1]*1.002,b[2]*1.002);
        const a2=fromFace(f,u0+du*s/SUB,v0+du*k/SUB), b2=fromFace(f,u0+du*(s+1)/SUB,v0+du*k/SUB); vp.push(a2[0]*1.002,a2[1]*1.002,a2[2]*1.002,b2[0]*1.002,b2[1]*1.002,b2[2]*1.002); } } }
    else { const o=own.get(id); const cs=P.regionCorners(id);
      for(let k=0;k<4;k++){ const nb=edgeNeighbor(id,k); const a=cs[k], b=cs[(k+1)%4];
        if(o!=null&&own.get(nb)!==o){ const cc=new T.Color(P.cityState(o,opt.guildId()).banner[0]); const pts=arc(a,b,1.012,3); for(let q=0;q<pts.length-1;q++){ bp.push(pts[q].x,pts[q].y,pts[q].z,pts[q+1].x,pts[q+1].y,pts[q+1].z); bc.push(cc.r,cc.g,cc.b,cc.r,cc.g,cc.b); } }
        else if(stageOf(nb)===0){ const pts=arc(a,b,1.006,3); for(let q=0;q<pts.length-1;q++) gp.push(pts[q].x,pts[q].y,pts[q].z,pts[q+1].x,pts[q+1].y,pts[q+1].z); } } } }
  const seg=(arr,mat)=>{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(arr,3)); const l=new T.LineSegments(g,mat); L.add(l); return l; };
  seg(vp,new T.LineBasicMaterial({color:'#9aa3b5',transparent:true,opacity:0.35}));
  seg(gp,new T.LineBasicMaterial({color:'#a3ff12',transparent:true,opacity:0.9}));
  if(bp.length){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(bp,3)); g.setAttribute('color',new T.Float32BufferAttribute(bc,3)); L.add(new T.LineSegments(g,new T.LineBasicMaterial({vertexColors:true}))); }
  // explored markers
  const ex=[]; for(let id=0;id<P.COUNT;id++) if(opt.explored(id)){ const c=P.regionCenter(id); ex.push(c[0]*1.02,c[1]*1.02,c[2]*1.02); }
  if(ex.length){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(ex,3)); L.add(new T.Points(g,new T.PointsMaterial({color:'#ffffff',size:5,sizeAttenuation:false}))); }
  // relations
  G.rels=[]; const RC={ally:'#3dff7a',rival:'#ff3b3b',vassal:'#ffd23b'};
  for(let a=0;a<cities.length;a++) for(let b=a+1;b<cities.length;b++){ const A=cities[a], B=cities[b]; const ang=P.angle(P.regionCenter(A),P.regionCenter(B)); if(ang>0.5) continue; const rel=relation(A,B); G.rels.push(Object.assign({a:A,b:B},rel)); if(rel.type==='neutral') continue;
    const pts=arc(P.regionCenter(A),P.regionCenter(B),1.03,24); const g=new T.BufferGeometry().setFromPoints(pts);
    const m=rel.type==='vassal'?new T.LineDashedMaterial({color:RC.vassal,dashSize:0.02,gapSize:0.012}):new T.LineBasicMaterial({color:RC[rel.type]}); const l=new T.Line(g,m); if(rel.type==='vassal') l.computeLineDistances(); L.add(l); }
  // pins + labels
  const pin=(d,colA,colB,text,sub,big)=>{ const g=new T.Group(); const up=new T.Vector3(d[0],d[1],d[2]); g.position.copy(up).multiplyScalar(1.0); g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),up); L.add(g);
    const h=big?0.11:0.08; const pole=new T.Mesh(new T.CylinderGeometry(0.0035,0.0035,h,5),new T.MeshBasicMaterial({color:'#ddd'})); pole.position.y=h/2; g.add(pole);
    const fl=new T.Mesh(new T.PlaneGeometry(0.045,0.03),new T.MeshBasicMaterial({color:colA,side:T.DoubleSide})); fl.position.set(0.023,h-0.016,0); g.add(fl);
    const st=new T.Mesh(new T.PlaneGeometry(0.045,0.008),new T.MeshBasicMaterial({color:colB,side:T.DoubleSide})); st.position.set(0.023,h-0.016,0.0005); g.add(st);
    const el=document.createElement('div'); el.className='glabel'; el.innerHTML='<b style="color:'+colA+'">'+text+'</b>'+(sub?'<br><span>'+sub+'</span>':''); document.body.appendChild(el); G.labels.push({el, p:new T.Vector3(d[0],d[1],d[2]).multiplyScalar(1+h)}); };
  const gid=opt.guildId(); if(!cities.includes(gid)) pin(P.regionCenter(gid),'#a3ff12','#1a1a1f','The Guild','start point · Seedkeeper Mori',true);
  cities.forEach(id=>{ const cs=P.cityState(id,gid); pin(P.regionCenter(id),cs.banner[0],cs.banner[1],cs.name,cs.govName, cs.guild); });
  selLines(); }
function relation(a,b){ const gid=opt.guildId(); P.cityState(a,gid); P.cityState(b,gid); return P.relation(a,b); }
function selLines(){ if(G.selL){ G.grp.remove(G.selL); G.selL.geometry.dispose(); G.selL=null; } if(G.sel<0) return; const cs=P.regionCorners(G.sel); const pts=[]; for(let k=0;k<4;k++) pts.push(...arc(cs[k],cs[(k+1)%4],1.016,4));
  G.selL=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#22d3ee'})); G.grp.add(G.selL); }
function focus(id){ const d=P.regionCenter(id); G.grp.rotation.set(Math.atan2(d[1],Math.hypot(d[0],d[2])),-Math.atan2(d[0],d[2]),0,'XYZ'); }
const tv=new T.Vector3(), tn=new T.Vector3();
function renderGlobe(renderer){ const w=innerWidth,h=innerHeight; const mob=w<760; G.cam.aspect=w/h; G.cam.position.set(0,0,G.dist*(mob?1.35:1)); G.cam.clearViewOffset();
  if(mob) G.cam.setViewOffset(w,h,0,h*0.2,w,h); else G.cam.setViewOffset(w,h,-w*0.17,0,w,h); G.cam.updateProjectionMatrix(); G.grp.updateMatrixWorld(true);
  renderer.render(G.scene,G.cam);
  G.labels.forEach(l=>{ tv.copy(l.p).applyMatrix4(G.grp.matrixWorld); tn.copy(tv).normalize(); const facing=tn.dot(tv.clone().sub(G.cam.position).normalize().negate())>0.15;
    tv.project(G.cam); if(!facing||tv.z>1){ l.el.style.display='none'; return; } l.el.style.display='block'; l.el.style.left=((tv.x+1)/2*w)+'px'; l.el.style.top=((1-tv.y)/2*h)+'px'; }); }
function hideLabels(){ G.labels.forEach(l=>l.el.style.display='none'); }
const ray=new T.Raycaster();
function pick(cx,cy){ const w=innerWidth,h=innerHeight; ray.setFromCamera(new T.Vector2(cx/w*2-1,-(cy/h)*2+1),G.cam); const hit=ray.intersectObject(G.mesh,false)[0]; if(!hit) return -1;
  const p=G.grp.worldToLocal(hit.point.clone()).normalize(); return P.regionOf(p.x,p.y,p.z); }

window.SEEDWORLD={ CH, F, Q, stat, markDirty, baseHeightAt, roadDist, treeList, cutTrees, cutSites, get siteRoot(){ return siteRoot; }, get CUT(){ return CUT; }, get root(){ return root; }, get chunks(){ return chunks; }, get dirtyCount(){ return dirty.size; }, get poolSize(){ return Object.values(pool).reduce((a,p)=>a+p.length,0); },
  biomeAt(x,z){ return cornerAt(Math.floor(x/CH),Math.floor(z/CH)).biome; },
  isVoidAt(x,z){ return chunkVoid(Math.floor(x/CH),Math.floor(z/CH)); }, setQuality(o){ Object.assign(Q,o); lastPC=null; },
  init(o){ opt=o; scene=o.scene; mats(); root=new T.Group(); root.userData.sw=true; scene.add(root); chunkRoot=new T.Group(); siteRoot=new T.Group(); root.add(chunkRoot); root.add(siteRoot); },
  setFrame, heightAt, update, landing, clearChunks, get chunkCount(){ return chunks.size; }, toDir, regionAtLocal,
  animate(t){ if(F.waystone) F.waystone.userData.rune.rotation.y=t*1.5; if(F.flag) F.flag.rotation.y=Math.sin(t*1.6)*0.25; },
  globe:{ G, build:buildGlobe, refresh:refreshGlobe, render:renderGlobe, pick, focus, hideLabels, select(id){ G.sel=id; selLines(); }, drag(dx,dy){ G.grp.rotation.y+=dx*0.005; G.grp.rotation.x=Math.max(-1.45,Math.min(1.45,G.grp.rotation.x+dy*0.005)); }, zoom(k){ G.dist=Math.max(1.55,Math.min(5,G.dist*k)); }, owners, relation } };
})();
