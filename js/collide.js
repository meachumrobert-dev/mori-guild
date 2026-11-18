/* Building footprints are boxes, not circles. A circle misses the corners.
   Walls push the walker out along the nearest face. */
(function(root){
'use strict';
function inside(p, r, b){
  const yaw=b.yaw||0, c=Math.cos(yaw), s=Math.sin(yaw);
  const dx=p.x-b.x, dz=p.z-b.z;
  const lx=dx*c+dz*s, lz=-dx*s+dz*c;
  const hw=(b.hw!=null?b.hw:b.w/2)+r, hd=(b.hd!=null?b.hd:b.d/2)+r;
  if(Math.abs(lx)>hw||Math.abs(lz)>hd) return null;
  return {lx, lz, hw, hd, c, s};
}
function pushBox(p, r, b){
  const hit=inside(p, r, b);
  if(!hit) return false;
  const px=hit.hw-Math.abs(hit.lx), pz=hit.hd-Math.abs(hit.lz);
  let lx=hit.lx, lz=hit.lz;
  if(px<pz) lx=(hit.lx<0?-1:1)*hit.hw;
  else lz=(hit.lz<0?-1:1)*hit.hd;
  p.x=b.x+(lx*hit.c-lz*hit.s);
  p.z=b.z+(lx*hit.s+lz*hit.c);
  return true;
}
function resolve(p, r, world){
  world=world||{};
  (world.circles||[]).forEach(c=>{
    const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz), m=(c.r||0)+r;
    if(d<m&&d>1e-4){ p.x=c.x+dx/d*m; p.z=c.z+dz/d*m; }
  });
  (world.segs||[]).forEach(s=>{
    const x1=s[0], z1=s[1], x2=s[2], z2=s[3];
    const vx=x2-x1, vz=z2-z1, L=vx*vx+vz*vz||1;
    let t=((p.x-x1)*vx+(p.z-z1)*vz)/L; t=Math.max(0,Math.min(1,t));
    const cx=x1+vx*t, cz=z1+vz*t, dx=p.x-cx, dz=p.z-cz, d=Math.hypot(dx,dz);
    if(d<r&&d>1e-4){ p.x=cx+dx/d*r; p.z=cz+dz/d*r; }
  });
  (world.boxes||[]).forEach(b=>pushBox(p, r, b));
  return p;
}
function cornerOpen(box){
  const hw=box.hw!=null?box.hw:box.w/2, hd=box.hd!=null?box.hd:box.d/2;
  const corner={x:box.x+hw*0.92, z:box.z+hd*0.92};
  const circleR=Math.max(hw,hd)*2*0.42;
  const missed=Math.hypot(corner.x-box.x, corner.z-box.z)>circleR;
  const blocked=!!inside(corner, 0.2, box);
  return {missedByCircle:missed, blockedByBox:blocked};
}
root.COLLIDE={inside, pushBox, resolve, cornerOpen};
if(typeof module!=='undefined'&&module.exports) module.exports=root.COLLIDE;
})(typeof window!=='undefined'?window:globalThis);
