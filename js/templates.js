/* Mori Templates — optional texture / flame-sprite / palette pack built from Robert's approved "Mori templates" Drive images.
   Data lives in assets/templates/templates.js (window.MORI_TEMPLATES, data URIs so it works from file://).
   If that file is missing, or ?templates=0, MT.on is false and every caller keeps its procedural look. */
(function(){
'use strict';
const T=THREE, D=window.MORI_TEMPLATES||null;
const QS=new URLSearchParams(location.search);
const off=QS.get('templates')==='0'||(()=>{ try{ return localStorage.getItem('mori.templates')==='off'; }catch(e){ return false; } })();
const on=!!(D&&D.tex&&!off);
let tier=2, aniso=4; const texCache={}, matCache={}, live=[], pool=[], sprTex={};
const AVG={}; // average sRGB color of each texture, so tint * texture ≈ the original procedural color
function avgOf(img){ try{ const N=32, c=document.createElement('canvas'); c.width=c.height=N; const x=c.getContext('2d'); x.drawImage(img,0,0,N,N); const d=x.getImageData(0,0,N,N).data; let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){ r+=lin(d[i]/255); g+=lin(d[i+1]/255); b+=lin(d[i+2]/255); } const n=N*N; return [r/n,g/n,b/n]; }catch(e){ return null; } } // linear-light mean
function img(url,cb){ const im=new Image(); im.onload=()=>cb(im); im.src=url; return im; }
function placeholder(){ const c=document.createElement('canvas'); c.width=c.height=2; const x=c.getContext('2d'); x.fillStyle='#bdbdbd'; x.fillRect(0,0,2,2); return c; }
/* tiling texture for a material kind; resolution follows the quality tier (low = 256 px) */
function tex(kind){ if(!on||!D.tex[kind]) return null; if(texCache[kind]) return texCache[kind];
  const t=new T.Texture(placeholder()); t.wrapS=t.wrapT=T.RepeatWrapping; t.colorSpace=T.SRGBColorSpace; t.anisotropy=aniso; t.needsUpdate=true;
  t.userData.kind=kind; t.userData.res=0; texCache[kind]=t; loadRes(t); return t; }
function loadRes(t){ const want=tier===0?'256':'512'; if(t.userData.res===want) return; t.userData.res=want;
  img(D.tex[t.userData.kind][want],im=>{ if(t.userData.res!==want) return; t.dispose(); t.image=im; t.anisotropy=aniso; t.needsUpdate=true; // dispose: GPU storage is sized to the old image
    if(!AVG[t.userData.kind]){ const a=avgOf(im); if(a){ AVG[t.userData.kind]=a; retint(t.userData.kind); } } }); }
function lin(v){ return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); }
function retint(kind){ Object.values(matCache).forEach(m=>{ if(m.userData.mtKind===kind) tintMat(m); }); }
function tintMat(m){ const a=AVG[m.userData.mtKind]; const c=new T.Color(m.userData.mtHex); // c is linear
  if(!a){ m.color.copy(c); return; } const k=m.userData.mtDetail; // 1 = full photo color, 0 = keep procedural hue
  let r=c.r/Math.max(0.02,a[0]), g=c.g/Math.max(0.02,a[1]), b=c.b/Math.max(0.02,a[2]); const mx=Math.max(r,g,b); if(mx>2.6){ r*=2.6/mx; g*=2.6/mx; b*=2.6/mx; } // cap gain but keep the hue
  const l=Math.min(2.6,(c.r+c.g+c.b)/Math.max(0.03,a[0]+a[1]+a[2]));
  m.color.setRGB(Math.min(3,r*(1-k)+l*k),Math.min(3,g*(1-k)+l*k),Math.min(3,b*(1-k)+l*k)); m.needsUpdate=true; }
/* textured stand-in for HERO.M(hex): kind = texture name, scale = metres per texture tile */
function mat(kind,hex,scale,o){ o=o||{}; if(!on||!D.tex[kind]) return null; const key=kind+'|'+hex+'|'+(scale||2)+'|'+(o.detail||0)+'|'+(o.e||'')+'|'+(o.ei||0)+'|'+(o.side||0);
  if(matCache[key]) return matCache[key];
  const m=new T.MeshLambertMaterial({map:tex(kind), color:'#ffffff', emissive:o.e||'#000000', emissiveIntensity:o.ei||0, side:o.side||T.FrontSide});
  m.userData={mtKind:kind, mtHex:hex, mtScale:scale||2, mtDetail:o.detail||0}; tintMat(m); return matCache[key]=m; }
/* scale a primitive's UVs to world metres so textures keep a steady size (box, cylinder/cone, plane) */
function fit(geo,m){ if(!m||!m.userData||!m.userData.mtScale||!geo||geo.userData.mtFit) return; geo.userData.mtFit=true; const s=m.userData.mtScale, uv=geo.attributes.uv; if(!uv) return; const p=geo.parameters||{}, a=uv.array;
  if(geo.type==='BoxGeometry'){ const W=p.width, H=p.height, Dp=p.depth, ws=p.widthSegments||1, hs=p.heightSegments||1, ds=p.depthSegments||1;
    const faces=[[Dp,H,(ds+1)*(hs+1)],[Dp,H,(ds+1)*(hs+1)],[W,Dp,(ws+1)*(ds+1)],[W,Dp,(ws+1)*(ds+1)],[W,H,(ws+1)*(hs+1)],[W,H,(ws+1)*(hs+1)]]; let v=0;
    faces.forEach(([u,w,n])=>{ for(let i=0;i<n;i++,v++){ a[v*2]*=u/s; a[v*2+1]*=w/s; } }); }
  else if(geo.type==='CylinderGeometry'||geo.type==='ConeGeometry'){ const rt=geo.type==='ConeGeometry'?0:p.radiusTop, rb=geo.type==='ConeGeometry'?p.radius:p.radiusBottom, H=p.height, rs=p.radialSegments||8, hs=p.heightSegments||1;
    const n=(rs+1)*(hs+1), circ=Math.PI*(rt+rb), slant=Math.hypot(H,rb-rt); for(let v=0;v<uv.count;v++){ if(v<n){ a[v*2]*=circ/s; a[v*2+1]*=slant/s; } else { a[v*2]*=2*Math.max(rt,rb)/s; a[v*2+1]*=2*Math.max(rt,rb)/s; } } }
  else if(geo.type==='PlaneGeometry'){ for(let v=0;v<uv.count;v++){ a[v*2]*=p.width/s; a[v*2+1]*=p.height/s; } }
  uv.needsUpdate=true; }
/* palettes */
const PAL=on&&D.pal?D.pal:null;
function pick(path,i,fallback){ if(!PAL) return fallback[i%fallback.length]; let o=PAL; path.split('.').forEach(k=>{ o=o&&o[k]; }); if(o&&o.colors) o=o.colors; if(!Array.isArray(o)||!o.length) return typeof o==='string'?o:fallback[i%fallback.length]; return o[i%o.length]; }
function list(path,fallback){ if(!PAL) return fallback; let o=PAL; path.split('.').forEach(k=>{ o=o&&o[k]; }); if(o&&o.colors) o=o.colors; return Array.isArray(o)&&o.length?o:(typeof o==='string'?[o]:fallback); }
/* flame / spell sprites: animated strip, additive, one texture per kind shared by every sprite */
function stripTex(kind){ if(!on||!D.spr||!D.spr[kind]) return null; if(sprTex[kind]) return sprTex[kind]; const s=D.spr[kind];
  const t=new T.Texture(placeholder()); t.colorSpace=T.SRGBColorSpace; t.repeat.set(1/s.frames,1); t.userData={frames:s.frames,fps:s.fps||20};
  img(s.url,im=>{ t.dispose(); t.image=im; t.needsUpdate=true; (CLONES[kind]||[]).forEach(c=>{ c.dispose(); c.needsUpdate=true; }); }); t.needsUpdate=true; return sprTex[kind]=t; }
const CLONES={}; function cloneStrip(kind){ const b=stripTex(kind); if(!b) return null; const c=b.clone(); (CLONES[kind]=CLONES[kind]||[]).push(c); return c; }
function sprite(kind,w,h,o){ o=o||{}; const t=cloneStrip(kind); if(!t) return null; t.repeat.set(1/t.userData.frames,1);
  const m=new T.SpriteMaterial({map:t, color:o.color||'#ffffff', transparent:true, depthWrite:false, blending:o.normal?T.NormalBlending:T.AdditiveBlending, opacity:o.opacity==null?1:o.opacity});
  const sp=new T.Sprite(m); sp.scale.set(w||1,h||1.25,1); sp.center.set(0.5,o.center==null?0.08:o.center); sp.userData.mt={ph:Math.random()*10, fps:o.fps||t.userData.fps, t, frames:t.userData.frames, base:[w||1,h||1.25], flick:o.flick==null?0.08:o.flick};
  sp.renderOrder=3; live.push(sp); return sp; }
function remove(sp){ const i=live.indexOf(sp); if(i>=0) live.splice(i,1); if(sp&&sp.parent) sp.parent.remove(sp); const t=sp&&sp.material&&sp.material.map; if(t) for(const k in CLONES){ const j=CLONES[k].indexOf(t); if(j>=0){ CLONES[k].splice(j,1); t.dispose(); } } }
/* image swap after load: clones copy the placeholder, so refresh their image once the strip arrives */
function syncClones(){} // clones share the base texture's Source, so the loaded image reaches them automatically
/* spells: a flame head that flies from -> to, shedding sparks; pooled and capped by the quality tier */
const CAP=[6,14,24];
function kindFor(spells){ const s=(spells||[]).join(' ').toLowerCase();
  if(/fire|flame|burn|scorch|heat/.test(s)) return 'flame_fire'; if(/acid|poison|disease|necro|death|fel|bark|entangle|plant|strider|goodberry/.test(s)) return 'flame_fel';
  if(/cold|frost|ice|chill|snow/.test(s)) return 'flame_frost'; if(/shock|lightning|thunder|storm|electric/.test(s)) return 'bolt';
  if(/holy|light|bless|cure|heal|sun|daylight|bless/.test(s)) return 'flame_gold'; return 'flame_arcane'; }
const SPARK_COL={flame_fire:'#ffb35a',flame_fel:'#9cff57',flame_frost:'#9fe3ff',flame_gold:'#ffe07a',flame_arcane:'#d39bff',bolt:'#c8ff7a'};
function cast(parent,from,to,kind,o){ o=o||{}; if(!on) return null; kind=kind||'flame_arcane'; if(pool.length>=CAP[tier]) return null;
  const head=kind==='bolt'?null:sprite(kind,o.size||0.9,(o.size||0.9)*1.25,{center:0.5,fps:30}); const fx={kind,parent,from:from.clone(),to:to.clone(),t:0,dur:o.dur||Math.max(0.25,from.distanceTo(to)/(o.speed||16)),head,trail:[],bolt:null,done:false,onHit:o.onHit};
  if(head){ head.position.copy(from); parent.add(head); }
  if(kind==='bolt'){ const t=cloneStrip('bolt_fel'); if(t){ const m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}); m.map.repeat.set(1/4,1);
      const L=from.distanceTo(to); const g=new T.PlaneGeometry(L,Math.max(0.8,L*0.35)); const b=new T.Mesh(g,m); b.position.copy(from).lerp(to,0.5); b.lookAt(to); b.rotateY(Math.PI/2); b.renderOrder=3; const b2=new T.Mesh(g,m); b2.rotation.x=Math.PI/2; b.add(b2); parent.add(b); fx.bolt=b; fx.dur=0.35; } }
  pool.push(fx); return fx; }
/* a continuous flame stream (e.g. the dragon breathing into the forge hearth) */
function stream(parent,from,to,kind,n){ if(!on) return null; n=Math.max(2,Math.round((n||5)*[0.5,0.8,1][tier])); const g=new T.Group(); parent.add(g); const parts=[];
  for(let i=0;i<n;i++){ const s=sprite(kind||'flame_fire',0.5,0.62,{center:0.5,fps:24}); if(!s) break; g.add(s); parts.push({s,o:i/n}); }
  g.userData.mtStream={from:from.clone(),to:to.clone(),parts,on:true}; streams.push(g); return g; }
const streams=[];
let lastT=0;
function update(t){ if(!on) return; const dt=Math.min(0.1,Math.max(0,t-lastT)); lastT=t; syncClones();
  for(let i=0;i<live.length;i++){ const sp=live[i]; if(!sp.visible||!sp.parent) continue; const u=sp.userData.mt; const f=Math.floor((t+u.ph)*u.fps)%u.frames; u.t.offset.x=f/u.frames;
    if(u.flick){ const k=1+Math.sin(t*13+u.ph)*u.flick+Math.sin(t*29+u.ph*2)*u.flick*0.5; sp.scale.set(u.base[0]*(2-k)*0.5+u.base[0]*0.5,u.base[1]*k,1); } }
  streams.forEach(g=>{ const S=g.userData.mtStream; if(!g.visible) return; S.parts.forEach(p=>{ const k=(t*1.6+p.o)%1; p.s.position.copy(S.from).lerp(S.to,k); p.s.position.y+=Math.sin(k*Math.PI)*0.25; const sc=0.35+k*0.9; p.s.scale.set(sc*0.8,sc,1); p.s.material.opacity=k<0.85?1:(1-k)/0.15; }); });
  for(let i=pool.length-1;i>=0;i--){ const fx=pool[i]; fx.t+=dt; const k=Math.min(1,fx.t/fx.dur);
    if(fx.head){ fx.head.position.copy(fx.from).lerp(fx.to,k); fx.head.position.y+=Math.sin(k*Math.PI)*0.4;
      if(fx.trail.length<[3,6,9][tier]&&Math.random()<0.7){ const s=sprite(fx.kind,0.45,0.56,{center:0.5,fps:30}); if(s){ s.position.copy(fx.head.position); fx.parent.add(s); s.userData.mt.age=0; fx.trail.push(s); } } }
    fx.trail.forEach(s=>{ s.userData.mt.age+=dt; const a=s.userData.mt.age; s.material.opacity=Math.max(0,1-a*2.5); s.position.y+=dt*0.8; });
    fx.trail=fx.trail.filter(s=>{ if(s.material.opacity<=0){ remove(s); s.material.dispose(); return false; } return true; });
    if(fx.bolt){ fx.bolt.material.map.offset.x=Math.floor(fx.t*14)%4/4; fx.bolt.material.opacity=1-k; }
    if(k>=1&&!fx.done){ fx.done=true; if(fx.head){ remove(fx.head); fx.head.material.dispose(); fx.head=null; } if(fx.bolt){ fx.parent.remove(fx.bolt); fx.bolt.geometry.dispose(); const bt=fx.bolt.material.map, j=(CLONES.bolt_fel||[]).indexOf(bt); if(j>=0) CLONES.bolt_fel.splice(j,1); bt.dispose(); fx.bolt.material.dispose(); fx.bolt=null; }
      const s=sprite(fx.kind==='bolt'?'flame_gold':fx.kind,1.6,2,{center:0.3,fps:30}); if(s){ s.position.copy(fx.to); fx.parent.add(s); s.userData.mt.age=0; fx.trail.push(s); } if(fx.onHit) try{ fx.onHit(); }catch(e){} }
    if(fx.done&&!fx.trail.length) pool.splice(i,1); } }
/* road ribbon that follows the ground (textured gravel); segs = [[x1,z1,x2,z2],...] */
function road(parent,segs,heightFn,o){ if(!on) return null; o=o||{}; const w=(o.width||5)/2, step=o.step||3, maxL=o.maxLen||1e9; const m=mat('road_gravel',o.color||'#8a7a5e',o.scale||4,{detail:0.5}); if(!m) return null;
  m.polygonOffset=true; m.polygonOffsetFactor=-2; m.polygonOffsetUnits=-2; const g=new T.Group();
  segs.forEach(([x1,z1,x2,z2])=>{ const L=Math.min(maxL,Math.hypot(x2-x1,z2-z1)); if(L<1) return; const n=Math.max(1,Math.ceil(L/step)); const dx=(x2-x1)/Math.hypot(x2-x1,z2-z1), dz=(z2-z1)/Math.hypot(x2-x1,z2-z1);
    const pos=new Float32Array((n+1)*6), uv=new Float32Array((n+1)*4), idx=[];
    for(let i=0;i<=n;i++){ const s=i/n*L, x=x1+dx*s, z=z1+dz*s; const ax=x-dz*w, az=z+dx*w, bx=x+dz*w, bz=z-dx*w;
      pos.set([ax,heightFn(ax,az)+(o.lift||0.07),az, bx,heightFn(bx,bz)+(o.lift||0.07),bz],i*6); uv.set([0,s/(o.scale||4), 2*w/(o.scale||4),s/(o.scale||4)],i*4);
      if(i<n) idx.push(i*2,i*2+2,i*2+1, i*2+1,i*2+2,i*2+3); }
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(pos,3)); geo.setAttribute('uv',new T.BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
    const me=new T.Mesh(geo,m); me.receiveShadow=true; me.userData.mtRoad=true; g.add(me); });
  parent.add(g); return g; }
function setTier(i){ tier=Math.max(0,Math.min(2,i)); aniso=[1,2,4][tier]; Object.values(texCache).forEach(t=>{ t.anisotropy=aniso; loadRes(t); }); }
function debug(){ return Object.values(matCache).map(m=>[m.userData.mtKind,m.userData.mtHex,m.color.getHexString(),AVG[m.userData.mtKind]&&AVG[m.userData.mtKind].map(v=>v.toFixed(3)).join(',')]); }
function stats(){ return {on, tier, textures:Object.keys(texCache).length, materials:Object.keys(matCache).length, sprites:live.length, spells:pool.length, streams:streams.length, loaded:Object.values(texCache).filter(t=>t.image&&t.image.width>2).length}; }
window.MT={on, tex, mat, fit, pick, list, sprite, remove, cast, stream, road, update, setTier, stats, debug, kindFor, SPARK_COL, stripTex,
  /* drop-in for HERO.M: textured when the pack is on, procedural otherwise */
  M(kind,hex,scale,o){ return (on&&mat(kind,hex,scale,o))||HERO.M(hex,o); } };
})();
