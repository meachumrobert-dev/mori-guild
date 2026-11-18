/* A road is a curve, then a graded bed cut into the ground.
   The bed cannot float and it cannot sink out of sight.
   Water and a steep gap become a bridge. */
(function(root){
'use strict';
const MAX_SLOPE=0.12, FILL=0.2, CUT=2.2, DECK=1.5, LIFT=0.06, HALF=1.45, SHOULDER=HALF*2.6;
function bend(x1, z1, x2, z2, sway){
  const mx=(x1+x2)/2, mz=(z1+z2)/2;
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz)||1;
  return {x:mx+(-dz/len)*sway, z:mz+(dx/len)*sway};
}
function at(x1, z1, cx, cz, x2, z2, t){
  const u=1-t;
  return {x:u*u*x1+2*u*t*cx+t*t*x2, z:u*u*z1+2*u*t*cz+t*t*z2};
}
function samples(seg, opt){
  opt=opt||{};
  const x1=seg[0], z1=seg[1], x2=seg[2], z2=seg[3];
  const len=Math.hypot(x2-x1, z2-z1)||1;
  const step=opt.step||24;
  const n=Math.max(2, Math.min(opt.cap||28, Math.round(len/step)));
  const sway=opt.sway||0;
  const c=bend(x1,z1,x2,z2,sway);
  const heightAt=opt.heightAt||function(){ return 0; };
  const out=[];
  for(let i=0;i<=n;i++){
    const p=at(x1,z1,c.x,c.z,x2,z2,i/n);
    out.push({x:p.x, z:p.z, ground:heightAt(p.x, p.z)});
  }
  return out;
}
function grade(pts, opt){
  opt=opt||{};
  const slope=opt.maxSlope==null?MAX_SLOPE:opt.maxSlope;
  const step=opt.step||24;
  const sea=opt.seaY;
  const gapT=opt.gap==null?4:opt.gap;
  const ys=pts.map(p=>p.ground);
  for(let i=1;i<ys.length;i++){ const cap=ys[i-1]+slope*step; if(ys[i]>cap) ys[i]=cap; }
  for(let i=ys.length-2;i>=0;i--){ const cap=ys[i+1]+slope*step; if(ys[i]>cap) ys[i]=cap; }
  const bridges=[];
  const points=pts.map((p,i)=>{
    const prev=i?pts[i-1].ground:p.ground;
    const next=i<pts.length-1?pts[i+1].ground:p.ground;
    const water=sea!=null&&p.ground<sea+0.4;
    const ravine=p.ground+gapT<prev&&p.ground+gapT<next;
    const bridge=!!(water||ravine);
    let y=ys[i];
    if(bridge) y=Math.max(y, (water&&sea!=null?sea:Math.max(p.ground, prev))+DECK);
    const cut=p.ground-y;
    const row={x:p.x, z:p.z, y, ground:p.ground, cut, bank:Math.max(0, cut), bridge};
    if(bridge) bridges.push({id:'br-'+i, x:p.x, z:p.z, y, span:step, r:7});
    return row;
  });
  return {points, bridges};
}
function lay(seg, opt){
  opt=opt||{};
  const pts=samples(seg, opt);
  return grade(pts, opt);
}
/* One opaque ribbon, tops facing up. Shoulders are vertex colors on that
   same surface, so a camera on the left and the right see the same road. */
const MAT={transparent:false, opacity:1, depthWrite:true, side:'front', polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2, lift:LIFT};
function ribbon(points, opt){
  opt=opt||{};
  const half=opt.half==null?HALF:opt.half;
  const lift=opt.lift==null?LIFT:opt.lift;
  const pos=[], col=[], idx=[], nor=[];
  const dirt=[0.45,0.36,0.24], edge=[0.34,0.46,0.26];
  const across=[[-1,edge],[-0.42,dirt],[0,dirt],[0.42,dirt],[1,edge]];
  const span=across.length;
  for(let i=0;i<points.length;i++){
    const p=points[i], q=points[Math.min(points.length-1,i+1)], r=points[Math.max(0,i-1)];
    let tx=q.x-r.x, tz=q.z-r.z, len=Math.hypot(tx,tz)||1; tx/=len; tz/=len;
    const y=p.y+lift;
    across.forEach(([s,c])=>{
      pos.push(p.x+(-tz)*half*s, y, p.z+tx*half*s);
      nor.push(0,1,0);
      col.push(c[0],c[1],c[2]);
    });
    if(i<points.length-1){
      for(let k=0;k<span-1;k++){
        const a=i*span+k;
        idx.push(a, a+1, a+span, a+1, a+span+1, a+span);
      }
    }
  }
  return {pos, nor, col, idx, material:Object.assign({}, MAT)};
}
function sample(mesh, eye){
  const pos=mesh.pos, col=mesh.col, idx=mesh.idx, out=[];
  for(let t=0;t<idx.length;t+=3){
    const ia=idx[t], ib=idx[t+1], ic=idx[t+2];
    const ax=pos[ia*3], ay=pos[ia*3+1], az=pos[ia*3+2];
    const bx=pos[ib*3], by=pos[ib*3+1], bz=pos[ib*3+2];
    const cx=pos[ic*3], cy=pos[ic*3+1], cz=pos[ic*3+2];
    const nx=(by-ay)*(cz-az)-(bz-az)*(cy-ay);
    const ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);
    const nz=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
    const ex=eye.x-(ax+bx+cx)/3, ey=eye.y-(ay+by+cy)/3, ez=eye.z-(az+bz+cz)/3;
    if(nx*ex+ny*ey+nz*ez<=0) continue;
    out.push([(col[ia*3]+col[ib*3]+col[ic*3])/3, (col[ia*3+1]+col[ib*3+1]+col[ic*3+1])/3, (col[ia*3+2]+col[ib*3+2]+col[ic*3+2])/3, ny]);
  }
  return out;
}
/* One ribbon per segment. A second gravel pass, a shoulder, or a verge is a stray.
   Bridge rows are real decks, and only those rows. */
const STRAY=/shoulder|verge|gravel|bank|slab|mtroad|cutwall|decal/i;
function build(segs, heightAt, opt){
  opt=opt||{};
  const height=heightAt||function(){ return 0; };
  const meshes=[], bridges=[];
  (segs||[]).forEach((seg,i)=>{
    const laid=lay(seg, Object.assign({heightAt:height}, opt));
    const id=opt.id?opt.id(seg,i):('road-'+i);
    const rib=ribbon(laid.points, opt);
    meshes.push({id, kind:'ribbon', seg, points:laid.points, pos:rib.pos, nor:rib.nor, col:rib.col, idx:rib.idx, material:rib.material});
    let run=null;
    const flush=()=>{
      if(!run||run.n<2){ run=null; return; }
      const yaw=Math.atan2(run.x1-run.x0, run.z1-run.z0);
      const b={id:'br-'+id+'-'+bridges.length, kind:'bridge', mesh:true, road:id, x:run.x, z:run.z, y:run.y, span:Math.max(6, run.n*(opt.step||24)), r:8, yaw, tech:opt.tech|0, style:bridgeStyle(opt.tech|0)};
      bridges.push(b);
      meshes.push(b);
      run=null;
    };
    laid.points.forEach(p=>{
      if(!p.bridge){ flush(); return; }
      if(!run) run={x:p.x,z:p.z,y:p.y,n:1,x0:p.x,z0:p.z,x1:p.x,z1:p.z};
      else { run.x=(run.x*run.n+p.x)/(run.n+1); run.z=(run.z*run.n+p.z)/(run.n+1); run.y=Math.max(run.y,p.y); run.n++; run.x1=p.x; run.z1=p.z; }
    });
    flush();
  });
  return {meshes, bridges};
}
function audit(list){
  const seen={}, bad=[];
  (list||[]).forEach(m=>{
    const kind=String(m.kind||''), name=String(m.name||'');
    if(STRAY.test(kind)||STRAY.test(name)) bad.push(m.id||kind||name);
    if(kind==='ribbon'){
      if(seen[m.id]) bad.push('dup:'+m.id);
      seen[m.id]=1;
    }
    if(kind==='bridge'&&!m.mesh) bad.push('bridge-without-mesh:'+(m.id||''));
  });
  return {ok:!bad.length, ribbons:Object.keys(seen).length, bad};
}
function bridgeStyle(tech){ return (tech|0)>=2?'arch':'trestle'; }
function earth(x, z, ground, lines){
  if(!lines||!lines.length) return {h:ground, t:0, cut:0, fill:0};
  let best=null;
  for(let n=0;n<lines.length;n++){
    const pts=lines[n].pts||lines[n];
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1], b=pts[i];
      if(a.bridge||b.bridge) continue;
      const vx=b.x-a.x, vz=b.z-a.z, L2=vx*vx+vz*vz||1;
      let t=((x-a.x)*vx+(z-a.z)*vz)/L2; t=t<0?0:t>1?1:t;
      const px=a.x+vx*t, pz=a.z+vz*t, d=Math.hypot(x-px, z-pz);
      if(!best||d<best.d) best={d, y:a.y+(b.y-a.y)*t};
    }
  }
  if(!best||best.d>=SHOULDER) return {h:ground, t:0, cut:0, fill:0};
  const inner=HALF*0.9;
  let k=1;
  if(best.d>inner){ const u=(best.d-inner)/(SHOULDER-inner); k=1-u*u*(3-2*u); }
  const h=ground*(1-k)+best.y*k;
  return {h, t:k, cut:Math.max(0, ground-h), fill:Math.max(0, h-ground)};
}
function pushBox(pos, idx, x, y, z, sx, sy, sz){
  const b=pos.length/3, hx=sx/2, hy=sy/2, hz=sz/2;
  [[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]].forEach(c=>pos.push(x+c[0], y+c[1], z+c[2]));
  [[0,1,2,0,2,3],[4,6,5,4,7,6],[0,4,5,0,5,1],[2,6,7,2,7,3],[0,3,7,0,7,4],[1,5,6,1,6,2]].forEach(f=>f.forEach(i=>idx.push(b+i)));
}
function bridgeGeom(b){
  b=b||{};
  const style=b.style||bridgeStyle(b.tech);
  const span=Math.max(4, b.span||8), w=b.width||HALF*2;
  const pos=[], idx=[];
  pushBox(pos, idx, 0, 0, 0, w, 0.16, span);
  if(style==='arch'){
    const rise=Math.min(2.4, span*0.28), n=6;
    for(let i=0;i<n;i++){
      const t=(i+0.5)/n, z=-span/2+t*span, arch=Math.sin(Math.PI*t)*rise;
      pushBox(pos, idx, 0, -rise+arch, z, w*0.7, 0.2, span/n*0.8);
    }
    pushBox(pos, idx, 0, -rise*0.45, -span/2, w*0.92, rise*0.9, 0.5);
    pushBox(pos, idx, 0, -rise*0.45, span/2, w*0.92, rise*0.9, 0.5);
  } else {
    for(let i=0;i<3;i++){
      const z=-span*0.32+i*span*0.32;
      pushBox(pos, idx, -w*0.36, -0.85, z, 0.16, 1.5, 0.16);
      pushBox(pos, idx, w*0.36, -0.85, z, 0.16, 1.5, 0.16);
      pushBox(pos, idx, 0, -0.16, z, w*0.86, 0.12, 0.14);
    }
  }
  return {style, pos, idx, span, width:w};
}
root.ROADS={MAX_SLOPE, FILL, CUT, LIFT, HALF, SHOULDER, MAT, bend, at, samples, grade, lay, ribbon, sample, build, audit, earth, bridgeStyle, bridgeGeom};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ROADS;
})(typeof window!=='undefined'?window:globalThis);
