/* Houses along a street. Footprints vary. Each one faces the road,
   keeps a yard, and stays clear of its neighbors. */
(function(root){
'use strict';
function rngOf(rng){ return typeof rng==='function'?rng:function(){ return 0.5; }; }
function along(roads, rng, opt){
  opt=opt||{};
  const rnd=rngOf(rng);
  const blocks=opt.blocks||[];
  const plots=[], yards=[], fences=[];
  (roads||[]).forEach(seg=>{
    const x1=seg[0], z1=seg[1], x2=seg[2], z2=seg[3];
    const L=Math.hypot(x2-x1, z2-z1)||1;
    if(L<12||L>90) return;
    const tx=(x2-x1)/L, tz=(z2-z1)/L;
    const n=Math.max(1, Math.min(3, Math.floor(L/16)));
    for(let i=0;i<n;i++){
      const side=i%2?1:-1;
      const t=(i+1)/(n+1);
      const px=x1+(x2-x1)*t, pz=z1+(z2-z1)*t;
      const w=+(3.2+rnd()*2.1).toFixed(2);
      const d=+(2.8+rnd()*1.3).toFixed(2);
      const x=px+(-tz)*side*(d/2+3.4);
      const z=pz+tx*side*(d/2+3.4);
      if(blocks.some(b=>Math.hypot(b.x-x, b.z-z)<(b.r||7))) continue;
      if(plots.some(o=>Math.hypot(o.x-x, o.z-z)<(o.w+w)/2+3)) continue;
      const yaw=Math.atan2((-tz)*side, tx*side);
      const plot={x, z, yaw, w, d, wallH:+(2.3+rnd()*0.45).toFixed(2), role:plots.length%5===0?'work':'house'};
      plots.push(plot);
      const yx=x+Math.sin(yaw)*(d/2+1.1), yz=z+Math.cos(yaw)*(d/2+1.1);
      yards.push({x:yx, z:yz, w:w+0.8, d:2.1, yaw, role:'yard'});
      fences.push({x, z, hw:w/2+1.3, hd:d/2+2.1, yaw, role:'fence'});
    }
  });
  return {plots, yards, fences};
}
function spaced(list, gap){
  gap=gap==null?2.5:gap;
  for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){
    const need=(list[i].w+list[j].w)/2+gap;
    if(Math.hypot(list[i].x-list[j].x, list[i].z-list[j].z)<need) return false;
  }
  return true;
}
function doorFaces(plot){
  const dx=Math.sin(plot.yaw), dz=Math.cos(plot.yaw);
  return {x:plot.x+dx*(plot.d/2), z:plot.z+dz*(plot.d/2)};
}
root.HOUSES={along, spaced, doorFaces};
if(typeof module!=='undefined'&&module.exports) module.exports=root.HOUSES;
})(typeof window!=='undefined'?window:globalThis);
