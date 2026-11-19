/* Phone-safe picture controls. Low is the phone default.
   Terrain keeps its own vertex colors. This only tints them by slope
   and bakes a little shade into those colors so the ground is less flat. */
(function(root){
'use strict';
const PRESET={
  low:{name:'low', tone:true, exposure:1.0, shadow:false, grass:0, rocks:0, ao:0.2, bevel:false, near:80, far:260},
  medium:{name:'medium', tone:true, exposure:1.05, shadow:true, grass:48, rocks:12, ao:0.28, bevel:false, near:110, far:360},
  high:{name:'high', tone:true, exposure:1.08, shadow:true, grass:96, rocks:24, ao:0.36, bevel:true, near:140, far:440}
};
function pick(phone, saved){
  if(saved==='low'||saved==='medium'||saved==='high') return saved;
  return phone?'low':'medium';
}
function preset(name){ return PRESET[name]||PRESET.low; }
function fog(name){ const p=preset(name); return {near:Math.round(p.near*0.85), far:p.far}; }
function mix3(a,b,t){ return [a[0]*(1-t)+b[0]*t, a[1]*(1-t)+b[1]*t, a[2]*(1-t)+b[2]*t]; }
/* day is 0 at night and 1 at noon. elev is the sun's sine, near 0 at dusk.
   Night stays blue and lifted so a face is never a black silhouette.
   The fog color is the horizon, so the ground fades into the sky. */
function grade(day, elev, bright){
  day=Math.max(0, Math.min(1, day));
  const dusk=Math.max(0, 1-Math.abs(elev==null?1:elev)/0.35);
  const nightH=[0.18,0.26,0.48], nightZ=[0.06,0.10,0.24];
  const dayH=[0.74,0.86,0.98], dayZ=[0.38,0.62,0.96];
  const duskH=[0.90,0.50,0.40], duskZ=[0.32,0.26,0.50];
  let horizon=mix3(nightH, dayH, day), zenith=mix3(nightZ, dayZ, day);
  horizon=mix3(horizon, duskH, dusk*0.5);
  zenith=mix3(zenith, duskZ, dusk*0.22);
  const k=bright==null?1:Math.max(0.7, Math.min(1.5, bright));
  return {
    horizon, zenith, fog:horizon.slice(),
    fill:(0.62+0.22*day)*k,
    hemi:(0.72+0.4*day)*k,
    sun:(0.7+1.35*day)*k,
    sunColor:mix3([0.62,0.76,1],[1,0.95,0.8], day),
    skyColor:mix3([0.5,0.64,0.98],[0.86,0.92,1], day),
    groundColor:[0.22,0.26,0.16],
    exposure:(1.15+(1-day)*0.32)*k,
    day, dusk
  };
}
function slope(heightAt, x, z){
  const e=2;
  const dx=heightAt(x+e,z)-heightAt(x-e,z), dz=heightAt(x,z+e)-heightAt(x,z-e);
  return Math.max(0, Math.min(1, Math.hypot(dx,dz)/(e*2)));
}
function shade(r, g, b, sl, ao){
  const rock=Math.max(0, Math.min(1, (sl-0.22)/0.4));
  let R=r*(1-rock)+0.46*rock, G=g*(1-rock)+0.43*rock, B=b*(1-rock)+0.38*rock;
  const k=1-Math.max(0, Math.min(0.42, (ao==null?0.24:ao)*sl + sl*0.12));
  return [R*k, G*k, B*k];
}
function applyRenderer(renderer, T, name){
  const p=preset(name);
  if(T&&T.ACESFilmicToneMapping!=null){ renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=p.exposure; }
  if(T&&T.SRGBColorSpace!=null&&renderer.outputColorSpace!=null) renderer.outputColorSpace=T.SRGBColorSpace;
  return p;
}
function paintSky(mesh, horizon, zenith){
  if(!mesh||!mesh.geometry||!mesh.geometry.attributes.color) return;
  const pos=mesh.geometry.attributes.position, attr=mesh.geometry.attributes.color;
  const h=horizon||[0.74,0.86,0.98], z=zenith||[0.38,0.62,0.96];
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i);
    const k=Math.max(0, Math.min(1, (y+30)/430));
    const t=k*k*(3-2*k);
    attr.setXYZ(i, h[0]*(1-t)+z[0]*t, h[1]*(1-t)+z[1]*t, h[2]*(1-t)+z[2]*t);
  }
  attr.needsUpdate=true;
}
function makeSky(T){
  const geo=new T.SphereGeometry(400, 16, 10);
  const pos=geo.attributes.position, col=new Float32Array(pos.count*3);
  geo.setAttribute('color', new T.Float32BufferAttribute(col,3));
  const mat=new T.MeshBasicMaterial({vertexColors:true, side:T.BackSide, fog:false, depthWrite:false});
  const mesh=new T.Mesh(geo, mat);
  mesh.name='sky'; mesh.frustumCulled=false; mesh.userData.sw=true;
  paintSky(mesh, [0.74,0.86,0.98], [0.38,0.62,0.96]);
  return mesh;
}
function scatter(T, heightAt, opt, origin){
  const g=new T.Group(); g.name='scatter'; g.userData.sw=true;
  const o=origin||{x:0,z:0};
  const dummy=new T.Object3D();
  function fill(n, geo, mat, tall){
    if(!n) return;
    const im=new T.InstancedMesh(geo, mat, n);
    im.count=n; im.castShadow=false; im.frustumCulled=false;
    for(let i=0;i<n;i++){
      const a=i*2.39996, rad=3+(i%17)*1.15;
      const x=o.x+Math.cos(a)*rad, z=o.z+Math.sin(a)*rad;
      let y=0; try{ y=heightAt(x,z); }catch(e){ y=0; }
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, a, 0);
      dummy.scale.setScalar(tall?0.6+(i%4)*0.15:0.35+(i%3)*0.12);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate=true;
    g.add(im);
  }
  fill(opt.grass|0, new T.ConeGeometry(0.07, 0.42, 4), new T.MeshLambertMaterial({color:'#3d7a34'}), true);
  fill(opt.rocks|0, new T.DodecahedronGeometry(0.22, 0), new T.MeshLambertMaterial({color:'#8a8478'}), false);
  return g;
}
root.LOOK={PRESET, pick, preset, fog, grade, slope, shade, applyRenderer, makeSky, paintSky, scatter};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LOOK;
})(typeof window!=='undefined'?window:globalThis);
