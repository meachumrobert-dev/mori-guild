/* A road is a curve, then a graded bed cut into the ground.
   The bed cannot float and it cannot sink out of sight.
   Water and a steep gap become a bridge. */
(function(root){
'use strict';
const MAX_SLOPE=0.12, FILL=0.2, CUT=2.2, DECK=1.5;
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
    const water=sea!=null&&p.ground<sea+0.4;
    const gap=Math.abs(p.ground-prev)>gapT;
    const bridge=!!(water||gap);
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
root.ROADS={MAX_SLOPE, FILL, CUT, bend, at, samples, grade, lay};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ROADS;
})(typeof window!=='undefined'?window:globalThis);
