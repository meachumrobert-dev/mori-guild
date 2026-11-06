/* twospeed.js (v3.4) — two-speed work scheduler, predictive warm-up cache, synthesized SFX and a tiny geometry merger.
   FOREGROUND jobs run the same frame they are queued (what the player is about to touch).
   BACKGROUND jobs run a little per frame inside a millisecond budget (everything else), round-robin. Classic script, no modules. */
(function(){
'use strict';
const T=THREE, now=()=>performance.now();
const Q={fg:[], bg:[]}; const ST={fgRun:0, bgRun:0, bgMs:0, fgMs:0, frames:0, maxBgMs:0, slowMs:0, slowKey:null};
let budget=1.2;
function fg(fn){ Q.fg.push(fn); }
function bg(fn,key){ if(key&&Q.bg.some(t=>t.key===key)) return false; Q.bg.push({fn,key}); return true; }
function pump(){ const t0=now(); let n=0; while(Q.fg.length&&n++<64){ Q.fg.shift()(); ST.fgRun++; } const t1=now(); ST.fgMs=t1-t0;
  let guard=Q.bg.length; while(Q.bg.length&&guard-->0&&now()-t1<budget){ const t=Q.bg.shift(); let more=false; const tj=now(); try{ more=t.fn()===true; }catch(e){ console.warn('bg job',t.key,e); } const dj=now()-tj; if(dj>ST.slowMs){ ST.slowMs=dj; ST.slowKey=t.key; } ST.bgRun++; if(more) Q.bg.push(t); }
  ST.bgMs=now()-t1; ST.maxBgMs=Math.max(ST.maxBgMs,ST.bgMs); ST.frames++; }

/* ---------- synthesized sounds (WebAudio, no files) ---------- */
const SR=22050; const rand=(()=>{ let s=1234567; return ()=>{ s=(s*1103515245+12345)>>>0; return s/4294967296*2-1; }; })();
const GEN={
  pick(n=Math.floor(SR*0.34)){ const a=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/SR; const e=Math.exp(-t*26);
      a[i]=(Math.sin(6.2832*2210*t)*0.45+Math.sin(6.2832*3370*t)*0.3+Math.sin(6.2832*5150*t)*0.16)*e+rand()*Math.exp(-t*95)*0.55+Math.sin(6.2832*140*t)*Math.exp(-t*30)*0.45; } return a; },
  sickle(n=Math.floor(SR*0.3)){ const a=new Float32Array(n); let y=0; for(let i=0;i<n;i++){ const t=i/n, x=rand(); const k=0.04+0.5*t; y+=k*(x-y); const env=Math.pow(Math.sin(Math.PI*t),2); a[i]=(x-y)*env*0.8; } return a; },
  knife(n=Math.floor(SR*0.2)){ const a=new Float32Array(n); let y=0; for(let i=0;i<n;i++){ const t=i/SR, x=rand(); y+=0.3*(x-y); a[i]=(x-y)*Math.exp(-t*22)*0.7+Math.sin(6.2832*(170-260*t)*t)*Math.exp(-t*16)*0.4; } return a; },
  axe(n=Math.floor(SR*0.4)){ const a=new Float32Array(n); let y=0, ph=0; for(let i=0;i<n;i++){ const t=i/SR, x=rand(); y+=0.08*(x-y); ph+=6.2832*(70+90*Math.exp(-t*20))/SR; a[i]=Math.sin(ph)*Math.exp(-t*12)*0.7+y*Math.exp(-t*40)*2.2; } return a; },
  pop(n=Math.floor(SR*0.22)){ const a=new Float32Array(n); let ph=0; for(let i=0;i<n;i++){ const t=i/SR; ph+=6.2832*(560+1500*t/0.22)/SR; a[i]=Math.sin(ph)*Math.exp(-t*9)*0.45; } return a; },
  cleanse(n=Math.floor(SR*0.6)){ const a=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/SR; const e=Math.sin(Math.PI*i/n); a[i]=(Math.sin(6.2832*880*t)+Math.sin(6.2832*1320*t)*0.6+Math.sin(6.2832*1760*t)*0.3)*e*0.22*(0.7+0.3*Math.sin(6.2832*9*t)); } return a; },
  smoke(n=Math.floor(SR*0.9)){ const a=new Float32Array(n); let y=0, y2=0; for(let i=0;i<n;i++){ const t=i/n, x=rand(); y+=0.02*(x-y); y2+=0.02*(y-y2); a[i]=y2*Math.sin(Math.PI*t)*7; } return a; }
};
const SFX={ ctx:null, bufs:{}, vol:0.32, played:[], made:{},
  has(n){ return !!this.bufs[n]; },
  buffer(n){ if(this.bufs[n]) return this.bufs[n]; const t0=now(); const d=GEN[n](); let b=null;
    try{ b=new AudioBuffer({length:d.length, sampleRate:SR, numberOfChannels:1}); b.copyToChannel(d,0); }catch(e){ b={fake:true, length:d.length}; }
    this.bufs[n]=b; this.made[n]=now()-t0; return b; },
  play(n,rate,vol){ const cold=!this.bufs[n]; const b=this.buffer(n); this.played.push({n,cold,t:Math.round(now())}); if(this.played.length>60) this.played.shift();
    try{ if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return cold; this.ctx=new AC(); } if(this.ctx.state==='suspended') this.ctx.resume();
      if(b.fake) return cold; const s=this.ctx.createBufferSource(); s.buffer=b; s.playbackRate.value=rate||1; const g=this.ctx.createGain(); g.gain.value=(vol||1)*this.vol; s.connect(g); g.connect(this.ctx.destination); s.start(); }catch(e){}
    return cold; } };

/* ---------- predictive warm-up ---------- */
const makers={}, WARM=new Map(); let R=null, CAM=null, SCN=null; const holder=new T.Group();
function setup(o){ R=o.renderer; CAM=o.camera; SCN=o.scene; if(o.budget) budget=o.budget; }
function register(key,fn){ makers[key]=fn; }
function isWarm(key){ return WARM.has(key); }
function doWarm(key,fore){ if(WARM.has(key)||!makers[key]) return; const t0=now(); const r=makers[key]()||{};
  try{ if(R){ (r.tex||[]).forEach(t=>R.initTexture(t)); if(r.objs&&r.objs.length){ r.objs.forEach(o=>holder.add(o)); holder.visible=true; R.compile(holder,CAM,SCN); r.objs.forEach(o=>holder.remove(o)); } } }catch(e){}
  (r.sfx||[]).forEach(n=>SFX.buffer(n));
  WARM.set(key,{ms:+(now()-t0).toFixed(2), fore:!!fore, frame:ST.frames, at:Math.round(now())}); }
function warm(key,fore){ if(WARM.has(key)||!makers[key]) return false; if(fore){ doWarm(key,true); return true; } bg(()=>doWarm(key,false),'w:'+key); return true; }
function reset(){ WARM.clear(); SFX.bufs={}; }

/* ---------- tiny merger: parts [{geo, m:Matrix4, color}] -> one vertex-coloured BufferGeometry ---------- */
const _v=new T.Vector3(), _q=new T.Quaternion(), _e=new T.Euler(), _s=new T.Vector3();
function part(geo,color,x,y,z,rx,ry,rz,sx,sy,sz){ sx=sx==null?1:sx; sy=sy==null?sx:sy; sz=sz==null?sx:sz;
  return {geo, color, m:new T.Matrix4().compose(_v.set(x||0,y||0,z||0),_q.setFromEuler(_e.set(rx||0,ry||0,rz||0)),_s.set(sx,sy,sz))}; }
function merge(parts){ let n=0; const gs=parts.map(p=>{ const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone(); g.applyMatrix4(p.m); n+=g.attributes.position.count; return g; });
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), col=new Float32Array(n*3); let o=0; const c=new T.Color();
  gs.forEach((g,i)=>{ const cnt=g.attributes.position.count; pos.set(g.attributes.position.array,o*3); nor.set(g.attributes.normal.array,o*3); c.set(parts[i].color||'#ffffff');
    for(let k=0;k<cnt;k++){ col[(o+k)*3]=c.r; col[(o+k)*3+1]=c.g; col[(o+k)*3+2]=c.b; } o+=cnt; g.dispose(); });
  const out=new T.BufferGeometry(); out.setAttribute('position',new T.BufferAttribute(pos,3)); out.setAttribute('normal',new T.BufferAttribute(nor,3)); out.setAttribute('color',new T.BufferAttribute(col,3));
  out.computeBoundingSphere(); out.userData.tris=n/3; return out; }

window.TWOSPEED={ fg, bg, pump, setup, register, warm, isWarm, reset, WARM, SFX, merge, part, ST, Q, get budget(){ return budget; }, set budget(v){ budget=v; } };
})();
