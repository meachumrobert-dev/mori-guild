/* A road is a curve, then a graded bed cut into the ground.
   The bed cannot float and it cannot sink out of sight.
   Water and a steep gap become a bridge. */
(function(root){
'use strict';
const MAX_SLOPE=0.12, FILL=0.2, CUT=2.2, DECK=1.5, LIFT=0.06, HALF=1.45;
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
    else {
      if(y>p.ground+FILL) y=p.ground+FILL*0.5;
      if(y<p.ground-CUT) y=p.ground-CUT;
    }
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
    const y=(p.bridge?p.y:p.ground)+lift;
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
root.ROADS={MAX_SLOPE, FILL, CUT, LIFT, HALF, MAT, bend, at, samples, grade, lay, ribbon, sample};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ROADS;
})(typeof window!=='undefined'?window:globalThis);
