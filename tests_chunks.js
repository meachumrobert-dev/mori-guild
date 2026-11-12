/* Chunk borders. Shared edge vertices use one global height and one global normal.
   A coarser neighbour stitches the fine edge onto its straight segments, and a
   region border blends instead of stepping. Run: node tests_chunks.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }

function Color(hex){ this.r=1; this.g=1; this.b=1;
  if(typeof hex==='string' && hex.charAt(0)==='#'){ const v=parseInt(hex.slice(1),16);
    this.r=((v>>16)&255)/255; this.g=((v>>8)&255)/255; this.b=(v&255)/255; } }
function Vector3(){}
function Object3D(){}
function Raycaster(){}

const ctx={console, Math, window:{}, performance:{now:()=>0}};
ctx.window=ctx;
vm.createContext(ctx);
function run(file){ vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'), ctx, {filename:file}); }
run('js/planet.js');
ctx.THREE={Color, Vector3, Object3D, Raycaster};
ctx.HERO={M:function(){ return {}; }};
run('js/seedworld.js');
const P=ctx.PLANET, SW=ctx.SEEDWORLD;
const id=P.startRegion();
SW.study(id);
const tint=SW.colorAt(12, -8);
ok(tint.length===3 && tint.every(v=>v>=0 && v<=1), 'ground tint is a real color ('+tint.map(v=>v.toFixed(2)).join(',')+')');
const eastTint=SW.seam(0,0,16,'e',16), westTint=SW.seam(1,0,16,'w',16);
let tintGap=0, badTint=0;
for(let i=0;i<eastTint.length;i++){
  const c1=SW.colorAt(eastTint[i].x, eastTint[i].z), c2=SW.colorAt(westTint[i].x, westTint[i].z);
  if(c1.some(v=>!(v>=0&&v<=1))||c2.some(v=>!(v>=0&&v<=1))) badTint++;
  tintGap=Math.max(tintGap, Math.abs(c1[0]-c2[0]), Math.abs(c1[1]-c2[1]), Math.abs(c1[2]-c2[2]));
}
ok(badTint===0 && tintGap<1e-6, 'shared edge tint matches ('+tintGap.toExponential(2)+')');

function maxAbs(a,b,key){ let m=0; for(let i=0;i<a.length;i++) m=Math.max(m, Math.abs(a[i][key]-b[i][key])); return m; }
function edgeMatch(a,b,label){
  ok(a.length===b.length, label+' edge vertex counts match');
  const dh=maxAbs(a,b,'h'), dn=Math.max(maxAbs(a,b,'nx'), maxAbs(a,b,'ny'), maxAbs(a,b,'nz'));
  ok(dh<1e-4, label+' heights match ('+dh.toExponential(2)+')');
  ok(dn<1e-4, label+' normals match ('+dn.toExponential(2)+')');
  let up=0, down=0; a.forEach(p=>{ up+=p.ny; if(!(p.ny>0)) down++; });
  ok(down===0 && up/a.length>0.35, label+' normals point up');
}
function crack(fine, coarse){
  const axis=Math.abs(fine[fine.length-1].x-fine[0].x)>Math.abs(fine[fine.length-1].z-fine[0].z)?'x':'z';
  const cs=coarse.slice().sort((p,q)=>p[axis]-q[axis]);
  let gap=0, shareH=0, shareN=0;
  fine.forEach(p=>{
    let a=cs[0], b=cs[cs.length-1];
    for(let i=0;i<cs.length-1;i++) if(cs[i][axis]<=p[axis]+1e-3 && cs[i+1][axis]+1e-3>=p[axis]){ a=cs[i]; b=cs[i+1]; break; }
    const span=(b[axis]-a[axis])||1, u=Math.max(0,Math.min(1,(p[axis]-a[axis])/span));
    gap=Math.max(gap, Math.abs(p.h-(a.h*(1-u)+b.h*u)));
  });
  coarse.forEach(p=>{
    let best=fine[0], bd=1e9;
    fine.forEach(f=>{ const d=Math.hypot(f.x-p.x, f.z-p.z); if(d<bd){ bd=d; best=f; } });
    shareH=Math.max(shareH, Math.abs(best.h-p.h));
    shareN=Math.max(shareN, Math.hypot(best.nx-p.nx, best.ny-p.ny, best.nz-p.nz));
  });
  return {gap, shareH, shareN};
}

[[16,'fine'],[8,'mid'],[4,'far']].forEach(([seg,name])=>{
  edgeMatch(SW.seam(0,0,seg,'e',seg), SW.seam(1,0,seg,'w',seg), name+' east/west');
  edgeMatch(SW.seam(0,0,seg,'s',seg), SW.seam(0,1,seg,'n',seg), name+' south/north');
  edgeMatch(SW.seam(-2,-1,seg,'e',seg), SW.seam(-1,-1,seg,'w',seg), name+' negative chunks');
});

[[16,4],[16,8],[8,4]].forEach(([fineSeg, coarseSeg])=>{
  const ew=crack(SW.seam(0,0,fineSeg,'e',coarseSeg), SW.seam(1,0,coarseSeg,'w',fineSeg));
  const ns=crack(SW.seam(2,-3,fineSeg,'s',coarseSeg), SW.seam(2,-2,coarseSeg,'n',fineSeg));
  ok(ew.gap<0.002, 'east LOD '+fineSeg+'/'+coarseSeg+' crack '+ew.gap.toExponential(2)+' m');
  ok(ns.gap<0.002, 'south LOD '+fineSeg+'/'+coarseSeg+' crack '+ns.gap.toExponential(2)+' m');
  ok(ew.shareH<1e-4 && ns.shareH<1e-4, 'shared LOD vertices keep the same height');
  ok(ew.shareN<1e-4 && ns.shareN<1e-4, 'shared LOD vertices keep the same normal');
});

let maxBorder=0, maxInner=0, at='';
[-128,-64,64,128,192].forEach(x=>{
  for(let z=-96; z<=220; z+=8){
    const g=SW.slopeGap(x,z,1,0), inner=SW.slopeGap(x+12,z,1,0);
    if(g>maxBorder){ maxBorder=g; at='x '+x+' z '+z; }
    if(inner>maxInner) maxInner=inner;
  }
});
[-64,64,128].forEach(z=>{
  for(let x=-96; x<=220; x+=8){
    const g=SW.slopeGap(x,z,0,1), inner=SW.slopeGap(x,z+12,0,1);
    if(g>maxBorder){ maxBorder=g; at='x '+x+' z '+z; }
    if(inner>maxInner) maxInner=inner;
  }
});

let border=null, prev=0, prevR=SW.regionAtLocal(0,0);
for(let x=4000; x<=480000 && !border; x+=4000){
  const r=SW.regionAtLocal(x,0);
  if(r!==prevR){
    let lo=prev, hi=x;
    for(let i=0;i<18;i++){ const mid=(lo+hi)/2; if(SW.regionAtLocal(mid,0)!==prevR) hi=mid; else lo=mid; }
    border={x:hi, from:prevR, to:SW.regionAtLocal(hi+2,0)};
  }
  prev=x; prevR=r;
}
ok(!!border, 'a neighbouring region is reachable on the tangent plane');
let maxRegion=0, maxVoid=0, meet=0;
if(border){
  for(let z=-80; z<=80; z+=10){
    const g=SW.slopeGap(border.x, z, 1, 0);
    if(g>maxRegion) maxRegion=g;
  }
  SW.study(id, rid=>rid===border.to?0:1);
  for(let z=-40; z<=40; z+=10){
    const g=SW.slopeGap(border.x, z, 1, 0);
    if(g>maxVoid) maxVoid=g;
    meet=Math.max(meet, Math.abs(SW.heightAt(border.x, z)));
  }
  ok(maxVoid<0.75, 'void border slope gap '+maxVoid.toFixed(3)+' (at '+border.x.toFixed(0)+')');
  ok(meet<1.5, 'void border height meets the empty side ('+meet.toFixed(2)+' m)');
  SW.study(id, ()=>1);
}

const SLOPE_LIMIT=0.4;
ok(maxBorder<SLOPE_LIMIT, 'chunk border slope gap '+maxBorder.toFixed(3)+' at '+at+' (limit '+SLOPE_LIMIT+')');
ok(maxRegion<SLOPE_LIMIT, 'region border slope gap '+maxRegion.toFixed(3)+' (limit '+SLOPE_LIMIT+')');
ok(maxBorder<=maxInner+0.35, 'chunk borders are no creasier than the ground inside a tile ('+maxBorder.toFixed(3)+' vs '+maxInner.toFixed(3)+')');

console.log('slope gap: chunk border '+maxBorder.toFixed(3)+', interior '+maxInner.toFixed(3)+', region border '+maxRegion.toFixed(3)+', void border '+maxVoid.toFixed(3)+', void meet '+meet.toFixed(2)+' m');
console.log('tests_chunks: '+n+' checks passed');
