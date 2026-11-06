/* impostors.js (v3.4) — the "South Park" layer: flat, outlined, camera-facing cut-out cards for trees, buildings and flower
   patches beyond mid distance. One procedural atlas, one quad, two instanced draws:
     FG mesh — cards just past the 3D cut (mid … mid+80 m): rebuilt immediately whenever you move 8 m,
     BG mesh — the far ring up to the fog: rebuilt a few chunks per frame in the background, double-buffered, swapped when done.
   The vertex shader billboards (cylindrical) and drops cards inside the 3D range, so the hand-off is exact. */
(function(){
'use strict';
const T=THREE, TS=TWOSPEED; const NC=8;
let X=null, atlas=null, mat=null, FG=null, BGa=null, BGb=null, BGcur=null, grp=null; const chunkCards=new Map();
const ST={fg:0, bg:0, fgBuilds:0, bgBuilds:0, bgSwaps:0, lastFgMs:0, chunkJobs:0, hidden3D:0, mid:90, midB:100, far:300, enabled:true, debug:false};
let lastFg=null, lastBg=null, lastCut=null, bgBuilding=false, frameKey='';
/* ---------- atlas: 8 cells of 128×256, flat colours, thick outlines ---------- */
function drawAtlas(){ const c=document.createElement('canvas'); c.width=128*NC; c.height=256; const x=c.getContext('2d'); x.lineJoin='round'; x.lineCap='round';
  const OL='#141414'; const cell=(i,fn)=>{ x.save(); x.translate(i*128,0); fn(); x.restore(); };
  const poly=(pts,fill)=>{ x.beginPath(); pts.forEach(([a,b],k)=>k?x.lineTo(a,b):x.moveTo(a,b)); x.closePath(); x.fillStyle=fill; x.fill(); x.lineWidth=7; x.strokeStyle=OL; x.stroke(); };
  const blob=(cx,cy,r,fill)=>{ x.beginPath(); x.arc(cx,cy,r,0,7); x.fillStyle=fill; x.fill(); x.lineWidth=7; x.strokeStyle=OL; x.stroke(); };
  // (canvas y grows downward; the quad's v=0 is the ground, so draw "upside up" and flip in the shader uv)
  cell(0,()=>{ poly([[56,250],[72,250],[72,200],[56,200]],'#6b4a2a'); poly([[64,20],[112,140],[16,140]],'#eeeeee'); poly([[64,70],[120,206],[8,206]],'#e2e2e2'); x.fillStyle='#ffffff'; x.globalAlpha=0.5; x.beginPath(); x.moveTo(64,30); x.lineTo(50,120); x.lineTo(60,120); x.fill(); x.globalAlpha=1; }); // pine (foliage tinted per biome)
  cell(1,()=>{ poly([[54,252],[74,252],[70,160],[58,160]],'#6b4a2a'); blob(64,110,50,'#eaeaea'); blob(34,140,26,'#e4e4e4'); blob(96,138,28,'#e4e4e4'); }); // oak
  cell(2,()=>{ poly([[60,252],[70,252],[76,70],[66,70]],'#8a6a3a'); [[-1,0.2],[1,0.2],[-0.7,-0.6],[0.7,-0.6],[0,-1]].forEach(([dx,dy])=>poly([[71,70],[71+dx*58,80+dy*-10+30],[71+dx*30,70+dy*-30]],'#4f9a3a')); }); // palm
  cell(3,()=>{ poly([[14,252],[114,252],[114,150],[14,150]],'#f2f2f2'); poly([[4,154],[64,84],[124,154]],'#9a3b26'); poly([[52,252],[76,252],[76,206],[52,206]],'#4a3020'); poly([[24,190],[42,190],[42,172],[24,172]],'#ffd75a'); poly([[86,190],[104,190],[104,172],[86,172]],'#ffd75a'); }); // house (walls tinted)
  cell(4,()=>{ poly([[30,252],[98,252],[98,90],[30,90]],'#a8a296'); poly([[22,96],[64,20],[106,96]],'#5a4a8a'); poly([[54,252],[74,252],[74,214],[54,214]],'#3a2a1a'); [[40,120],[80,120],[60,160]].forEach(([a,b])=>poly([[a,b],[a+10,b],[a+10,b+16],[a,b+16]],'#2a2a3a')); }); // tower / keep
  cell(5,()=>{ blob(64,236,40,'#4f8a2a'); for(let i=0;i<11;i++){ const a=i*2.4, r=10+(i%4)*9; blob(64+Math.cos(a)*r*1.3,212+Math.sin(a)*r*0.5,9,'#f4f4f4'); } }); // flower clump (petals tinted by species)
  cell(6,()=>{ poly([[14,252],[114,252],[114,150],[14,150]],'#23232a'); poly([[4,154],[64,80],[124,154]],'#111116'); poly([[52,252],[76,252],[76,206],[52,206]],'#0a0a0c'); poly([[24,190],[42,190],[42,172],[24,172]],'#7dff8f'); poly([[86,190],[104,190],[104,172],[86,172]],'#7dff8f'); }); // Gravenmoor house
  cell(7,()=>{ poly([[30,252],[98,252],[98,90],[30,90]],'#2a2a30'); poly([[22,96],[64,10],[106,96]],'#121216'); blob(64,140,16,'#e8e2cc'); x.fillStyle=OL; x.fillRect(56,136,5,6); x.fillRect(67,136,5,6); poly([[54,252],[74,252],[74,214],[54,214]],'#7dff8f'); }); // Gravenmoor keep (skull)
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; t.generateMipmaps=true; t.minFilter=T.LinearMipmapLinearFilter; t.anisotropy=1; return {c,t}; }
const VS=`attribute vec3 iPos; attribute vec2 iSize; attribute float iCell; attribute vec3 iTint; attribute float iMid;
uniform vec3 uP; uniform float uLo, uHi; varying vec2 vUv; varying vec3 vTint; varying float vFogDepth;
void main(){ float d=distance(iPos.xz,uP.xz); if(d<max(iMid,uLo)||d>=uHi){ gl_Position=vec4(2.0,2.0,2.0,1.0); return; }
  vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
  vec3 wp=iPos+right*position.x*iSize.x+vec3(0.0,position.y*iSize.y,0.0); vec4 mv=viewMatrix*vec4(wp,1.0); vFogDepth=-mv.z; gl_Position=projectionMatrix*mv;
  vUv=vec2((iCell+uv.x)/${NC}.0, uv.y); vTint=iTint; }`;
const FS=`uniform sampler2D uMap; uniform float uLight; uniform vec3 uDbg; uniform float uDbgK; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying vec2 vUv; varying vec3 vTint; varying float vFogDepth;
void main(){ vec4 t=texture2D(uMap,vUv); if(t.a<0.5) discard; float mx=max(t.r,max(t.g,t.b)), mn=min(t.r,min(t.g,t.b)); float k=(1.0-smoothstep(0.02,0.08,mx-mn))*smoothstep(0.35,0.6,mx);
  vec3 c=mix(t.rgb,t.rgb*vTint,k)*uLight; c=mix(c,uDbg,uDbgK); float f=smoothstep(fogNear,fogFar,vFogDepth); gl_FragColor=vec4(mix(c,fogColor,f),1.0);
  #include <colorspace_fragment>
}`;
function mkMesh(cap,name){ const q=new T.PlaneGeometry(1,1); q.translate(0,0.5,0); const g=new T.InstancedBufferGeometry(); g.index=q.index; g.setAttribute('position',q.attributes.position); g.setAttribute('uv',q.attributes.uv);
  const A=(n,s)=>{ const a=new T.InstancedBufferAttribute(new Float32Array(cap*s),s); a.setUsage(T.DynamicDrawUsage); g.setAttribute(n,a); return a; };
  A('iPos',3); A('iSize',2); A('iCell',1); A('iTint',3); A('iMid',1); g.instanceCount=0;
  const m=new T.Mesh(g,mat.clone()); m.material.uniforms=Object.assign({},mat.uniforms,{uLo:{value:0},uHi:{value:1e6}}); m.frustumCulled=false; m.name=name; m.userData.cap=cap; m.renderOrder=10; return m; } /* drawn after the opaque world so hidden cards fail the depth test */
/* ---------- card sources ---------- */
const TREE_TINT={taiga:'#2f4f3a',jungle:'#2f7d2a',savanna:'#7d8a3a',swamp:'#3d5230',mountain:'#4a5e48',_:'#3b6b2c'};
const tc=new T.Color();
function chunkList(ix,iz){ const key=frameKey+':'+ix+','+iz; let c=chunkCards.get(key); if(c) return c; const SW=X.SW; const tl=SW.treeList(ix,iz); const out=[];
  tc.set(TREE_TINT[tl.biome]||TREE_TINT._); const taiga=tl.biome==='taiga';
  tl.list.forEach(([x,z,s],i)=>{ const h=SW.heightAt(x,z); if(X.blocked&&X.blocked(x,z,h)) return; const k=1+((i*3)%5-2)*0.06; out.push(x,h-0.3,z,3.4*s,6.6*s*(taiga?1.35:1),0,tc.r*k,tc.g*k,tc.b*k,0); });
  c=new Float32Array(out); chunkCards.set(key,c); ST.chunkJobs++; if(chunkCards.size>700) chunkCards.delete(chunkCards.keys().next().value); return c; }
function siteCards(out){ const SW=X.SW; const r=SW.siteRoot; if(!r) return; r.children.forEach(o=>{ const cd=o.userData.card; if(!cd) return; tc.set(cd.tint||'#ffffff');
  out.push(o.position.x,o.position.y,o.position.z,cd.w,cd.h,cd.cell,tc.r,tc.g,tc.b,cd.big?ST.midB*1.6:ST.midB); }); }
function tfCards(out,px,pz,lo,hi){ if(!window.TERRAFORM||!TERRAFORM.cardSources) return; const s=TERRAFORM.cardSources(px,pz,lo,hi), SW=X.SW;
  s.trees.forEach(([x,z,sc,ty])=>{ const h=SW.heightAt(x,z); out.push(x,h-0.25,z,ty===0?3.4*sc:4.4*sc,ty===0?7.4*sc:6.2*sc,ty===0?0:1,ty===0?0.2:0.3,ty===0?0.42:0.55,ty===0?0.24:0.22,0); });
  s.fl.forEach(([x,z,rad,sp])=>{ const nm=FLORA.NAMES[sp]; tc.set(FLORA.PAL[nm]?FLORA.PAL[nm].petals[0]:'#ffd75a'); out.push(x,SW.heightAt(x,z)-0.1,z,rad*2.1,Math.max(1.2,rad*0.5),5,tc.r,tc.g,tc.b,X.flowerR?X.flowerR():ST.mid); }); }
function extraCards(out){ if(X.extra) X.extra(out); }
function fill(mesh,arr){ const g=mesh.geometry, cap=mesh.userData.cap; const n=Math.min(cap,arr.length/10|0); const P=g.attributes.iPos.array, S=g.attributes.iSize.array, C=g.attributes.iCell.array, K=g.attributes.iTint.array, M=g.attributes.iMid.array;
  for(let i=0;i<n;i++){ const o=i*10; P[i*3]=arr[o]; P[i*3+1]=arr[o+1]; P[i*3+2]=arr[o+2]; S[i*2]=arr[o+3]; S[i*2+1]=arr[o+4]; C[i]=arr[o+5]; K[i*3]=arr[o+6]; K[i*3+1]=arr[o+7]; K[i*3+2]=arr[o+8]; M[i]=arr[o+9]||ST.mid; }
  ['iPos','iSize','iCell','iTint','iMid'].forEach(k=>{ g.attributes[k].needsUpdate=true; g.attributes[k].addUpdateRange?(g.attributes[k].clearUpdateRanges(),g.attributes[k].addUpdateRange(0,n*g.attributes[k].itemSize)):0; }); g.instanceCount=n; return n; }
function pushChunks(out,px,pz,lo,hi,fgMode){ const CH=X.SW.CH; const R=Math.ceil(hi/CH)+1, ci=Math.floor(px/CH), cj=Math.floor(pz/CH); const missing=[];
  for(let i=ci-R;i<=ci+R;i++) for(let j=cj-R;j<=cj+R;j++){ const dx=Math.max(Math.abs((i+0.5)*CH-px)-CH/2,0), dz=Math.max(Math.abs((j+0.5)*CH-pz)-CH/2,0), dn=Math.hypot(dx,dz);
    const far=Math.hypot(Math.abs((i+0.5)*CH-px)+CH/2,Math.abs((j+0.5)*CH-pz)+CH/2); if(dn>hi||far<lo) continue; if(X.SW.isVoidAt((i+0.5)*CH,(j+0.5)*CH)) continue;
    const key=frameKey+':'+i+','+j; if(!chunkCards.has(key)&&!fgMode){ missing.push([i,j]); continue; }
    const c=chunkList(i,j); for(let k=0;k<c.length;k+=10){ const d=Math.hypot(c[k]-px,c[k+2]-pz); if(d<lo||d>hi) continue; for(let q=0;q<10;q++) out.push(c[k+q]); } }
  return missing; }
function buildFG(px,pz){ const t0=performance.now(); const lo=ST.mid-12, hi=ST.mid+95; const out=[]; pushChunks(out,px,pz,lo,hi,true); tfCards(out,px,pz,Math.min(lo,X.flowerR?X.flowerR()-12:lo),hi); siteCards(out); extraCards(out);
  ST.fg=fill(FG,out); ST.fgBuilds++; ST.lastFgMs=+(performance.now()-t0).toFixed(2); lastFg=[px,pz]; }
/* low tier: past mid+110 m keep every other tree card (a forest edge at 200 m reads the same at half density) */
function thin(out,px,pz,keepIn){ let w=0; for(let r=0,i=0;r<out.length;r+=10,i++){ if(out[r+5]===0&&(i&1)&&Math.hypot(out[r]-px,out[r+2]-pz)>keepIn) continue; if(w!==r) for(let q=0;q<10;q++) out[w+q]=out[r+q]; w+=10; } out.length=w; ST.thinned=(ST.thinned||0)+1; }
function startBG(px,pz){ if(bgBuilding) return; bgBuilding=true; const lo=ST.mid+60, hi=ST.far+30; const fk=frameKey; let stage=0; const out=[];
  TS.bg(()=>{ if(fk!==frameKey){ bgBuilding=false; return false; }
    if(stage===0){ const miss=pushChunks([],px,pz,lo,hi,false); if(miss.length){ miss.slice(0,2).forEach(([i,j])=>chunkList(i,j)); return true; } stage=1; return true; } // a couple of chunk lists per slice
    if(stage===1){ pushChunks(out,px,pz,lo,hi,false); tfCards(out,px,pz,lo,hi); if(ST.tier==='low') thin(out,px,pz,ST.mid+110); stage=2; return true; }
    const back=BGcur===BGa?BGb:BGa; ST.bg=fill(back,out); back.visible=ST.enabled; if(BGcur) BGcur.visible=false; BGcur=back; ST.bgSwaps++; ST.bgBuilds++; lastBg=[px,pz]; bgBuilding=false; return false; },'imp:bg'); }
function setDist(q){ const tier=q||'medium'; ST.tier=tier; ST.mid={low:60,medium:90,high:130}[tier]||90; ST.midB={low:70,medium:100,high:150}[tier]||100; ST.far=(X.far?X.far():300)*({low:0.72,medium:0.88,high:1}[tier]||0.88); /* the last stretch before fogFar is ~fully fogged: low tiers stop sooner */ lastFg=null; lastBg=null; lastCut=null; [FG,BGa,BGb].forEach(m=>m&&(m.material.uniforms.uHi.value=1e6)); }
function update(){ if(!X||!FG) return; const p=X.player.pos; const on=ST.enabled&&X.mode()==='world'; grp.visible=on; if(!on) return;
  const fk=X.SW.F.id+'|'+X.SW.F.stage+'|'+(window.PLANET?PLANET.seed:''); if(fk!==frameKey){ frameKey=fk; lastFg=lastBg=lastCut=null; chunkCards.clear(); if(BGcur) BGcur.material.uniforms.uHi.value=1e6; [BGa,BGb].forEach(m=>{ m.geometry.instanceCount=0; }); }
  const split=ST.mid+80; FG.material.uniforms.uLo.value=0; FG.material.uniforms.uHi.value=split; [BGa,BGb].forEach(m=>{ m.material.uniforms.uLo.value=split; m.material.uniforms.uHi.value=1e6; });
  [FG,BGa,BGb].forEach(m=>m.material.uniforms.uP.value.copy(p));
  if(!lastCut||Math.hypot(p.x-lastCut[0],p.z-lastCut[1])>6){ lastCut=[p.x,p.z]; X.SW.cutTrees(p.x,p.z,ST.mid); ST.hidden3D=X.SW.cutSites(p.x,p.z,ST.midB); }
  if(!lastFg||Math.hypot(p.x-lastFg[0],p.z-lastFg[1])>8) buildFG(p.x,p.z); // foreground: this frame
  if(!lastBg||Math.hypot(p.x-lastBg[0],p.z-lastBg[1])>30) startBG(p.x,p.z); } // background: over the next frames
function setLight(v){ if(mat) [FG,BGa,BGb].forEach(m=>m.material.uniforms.uLight.value=v); }
function debug(on){ ST.debug=!!on; [FG,BGa,BGb].forEach((m,i)=>{ m.material.uniforms.uDbgK.value=on?0.45:0; m.material.uniforms.uDbg.value.set(i===0?'#ff40c0':'#40c0ff'); }); }
window.IMPOSTORS={ ST,
  init(o){ X=o; atlas=drawAtlas(); mat=new T.ShaderMaterial({vertexShader:VS, fragmentShader:FS, fog:true, uniforms:Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog),{uMap:{value:atlas.t}, uP:{value:new T.Vector3()}, uLight:{value:1}, uDbg:{value:new T.Color('#ff40c0')}, uDbgK:{value:0}})});
    const mob=!!o.mobile; grp=new T.Group(); grp.name='impostors'; grp.userData.sw=true; FG=mkMesh(mob?1400:2400,'imp_fg'); BGa=mkMesh(mob?2600:5200,'imp_bg_a'); BGb=mkMesh(mob?2600:5200,'imp_bg_b'); BGb.visible=false; BGcur=BGa;
    [FG,BGa,BGb].forEach(m=>{ m.material.uniforms.uMap.value=atlas.t; m.material.uniforms.uP.value=new T.Vector3(); m.material.uniforms.uLight={value:1}; m.material.uniforms.uDbg={value:new T.Color()}; m.material.uniforms.uDbgK={value:0}; grp.add(m); });
    o.scene.add(grp); TS.register('imp:atlas',()=>({tex:[atlas.t], objs:[FG]})); TS.warm('imp:atlas',true); setDist(o.quality&&o.quality()); },
  update, setDist, setLight, debug, get fg(){ return FG; }, get bg(){ return BGcur; }, get atlas(){ return atlas; }, get group(){ return grp; },
  enable(on){ ST.enabled=!!on; if(!on){ X.SW.cutTrees(0,0,1e9); X.SW.cutSites(0,0,1e9); } lastCut=lastFg=lastBg=null; }, force(){ lastFg=lastBg=lastCut=null; } };
})();
