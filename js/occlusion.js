/* Coarse occlusion and a camera-relative render origin.
   Frustum culling stays three.js's own. This only hides a small object when a
   building box or a hill sample sits on the ray, and only after two agreeing
   tests, so a ridge does not pop. The render origin subtracts the player so
   far coordinates stay precise. No network. */
(function(){
'use strict';
const stats={tested:0, hidden:0, shown:0, hill:0, box:0, far:0, debug:false, lastCam:0, origin:0};
const LIMIT=4096;
function slab(ox,oy,oz, dx,dy,dz, box){
  let t0=0, t1=1e9;
  const s=[dx,dy,dz], o=[ox,oy,oz], mn=[box.min[0],box.min[1],box.min[2]], mx=[box.max[0],box.max[1],box.max[2]];
  for(let i=0;i<3;i++){
    if(Math.abs(s[i])<1e-8){ if(o[i]<mn[i]||o[i]>mx[i]) return null; continue; }
    let a=(mn[i]-o[i])/s[i], b=(mx[i]-o[i])/s[i];
    if(a>b){ const t=a; a=b; b=t; }
    if(a>t0) t0=a; if(b<t1) t1=b; if(t0>t1) return null;
  }
  return t0>0?t0:t1>0?t1:null;
}
function occluded(cam, point, boxes, pad){
  const dx=point.x-cam.x, dy=point.y-cam.y, dz=point.z-cam.z;
  const dist=Math.hypot(dx,dy,dz)||1;
  if(dist<8) return false;
  const inv=1/dist, rdx=dx*inv, rdy=dy*inv, rdz=dz*inv;
  for(const box of boxes){
    const t=slab(cam.x,cam.y,cam.z, rdx,rdy,rdz, box);
    if(t!=null && t>0.5 && t<dist-pad) return true;
  }
  return false;
}
function hillBlocks(cam, point, heightAt){
  if(!heightAt) return false;
  const dx=point.x-cam.x, dz=point.z-cam.z, dist=Math.hypot(dx,dz);
  if(dist<10) return false;
  const mx=cam.x+dx*0.5, mz=cam.z+dz*0.5;
  const ground=heightAt(mx,mz);
  const rayY=cam.y+(point.y-cam.y)*0.5;
  return ground>rayY+1.4;
}
function tooFar(dist, limit, size){ return dist>limit && size<6; }
function floatGap(x){ const a=new Float32Array([x, x+0.05]); return a[1]-a[0]; }
function viewOffset(px, pz, cx, cz){
  if(Math.abs(px)<LIMIT && Math.abs(pz)<LIMIT) return {cx, cz, sx:0, sz:0, shifted:false};
  return {cx:cx-px, cz:cz-pz, sx:-px, sz:-pz, shifted:true};
}
let cursor=0, refresh=0, occluders=[], candidates=[];
function boxOf(T, obj){
  const b=new T.Box3().setFromObject(obj);
  if(!isFinite(b.min.x)||b.isEmpty()) return null;
  return {min:[b.min.x,b.min.y,b.min.z], max:[b.max.x,b.max.y,b.max.z], obj};
}
function consider(obj, out, T){
  if(!obj||!obj.visible||obj.userData&&(obj.userData.sw||obj.userData.noCull)) return;
  if(obj.isLight) return;
  const b=boxOf(T, obj); if(!b) return;
  const sx=b.max[0]-b.min[0], sy=b.max[1]-b.min[1], sz=b.max[2]-b.min[2];
  b.size=Math.max(sx,sy,sz);
  if(sy>2 && sx>1.6 && sz>1.6 && b.size<80) occluders.push(b);
  else if(b.size<30) out.push(b);
}
function update(scene, camera, opt){
  const T=window.THREE; if(!T||!scene||!camera||opt&&opt.off) return stats;
  refresh--;
  if(refresh<=0){
    refresh=45; occluders=[]; candidates=[];
    scene.children.forEach(o=>{
      if(!o.visible||o.userData&&(o.userData.sw||o.userData.noCull)||o.isLight) return;
      consider(o, candidates, T);
      if(o.children&&o.children.length&&o.children.length<40) o.children.forEach(c=>consider(c, candidates, T));
    });
  }
  const cam={x:camera.position.x, y:camera.position.y, z:camera.position.z};
  const far=(opt&&opt.far)||160;
  const budget=Math.min(candidates.length, (opt&&opt.budget)||16);
  let hidden=0;
  for(let n=0;n<budget;n++){
    if(!candidates.length) break;
    const item=candidates[cursor%candidates.length]; cursor++;
    stats.tested++;
    const c=item.obj; if(!c) continue;
    const cx=(item.min[0]+item.max[0])/2, cy=(item.min[1]+item.max[1])/2, cz=(item.min[2]+item.max[2])/2;
    const dist=Math.hypot(cx-cam.x, cy-cam.y, cz-cam.z);
    const pad=c.userData._occ?0.6:2.2;
    const byHill=hillBlocks(cam,{x:cx,y:cy,z:cz}, opt&&opt.heightAt);
    const byBox=occluded(cam,{x:cx,y:cy,z:cz}, occluders, pad);
    const byFar=tooFar(dist, far, item.size);
    const hide=byHill||byBox||byFar;
    if(hide){ if(byHill) stats.hill++; if(byBox) stats.box++; if(byFar) stats.far++; }
    if(hide){
      c.userData._occN=(c.userData._occN||0)+1;
      if(c.userData._occN>=2 && c.visible){ c.visible=false; c.userData._occ=1; stats.hidden++; hidden++; }
    } else {
      c.userData._occN=0;
      if(c.userData._occ){ c.visible=true; c.userData._occ=0; stats.shown++; }
    }
  }
  return stats;
}
function beginView(scene, camera, px, pz){
  const v=viewOffset(px, pz, camera.position.x, camera.position.z);
  scene.position.set(v.sx, 0, v.sz);
  camera.position.x=v.cx; camera.position.z=v.cz;
  stats.lastCam=Math.hypot(camera.position.x, camera.position.z);
  stats.origin=Math.hypot(px,pz);
  return v;
}
function endView(scene){ if(scene) scene.position.set(0,0,0); }
window.OCCLUSION={ stats, slab, occluded, hillBlocks, tooFar, floatGap, viewOffset, update, beginView, endView, LIMIT };
})();
