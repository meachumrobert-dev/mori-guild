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
function fog(name){ const p=preset(name); return {near:p.near, far:p.far}; }
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
function makeSky(T){
  const geo=new T.SphereGeometry(400, 10, 6);
  const pos=geo.attributes.position, col=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const k=Math.max(0, Math.min(1, pos.getY(i)/400*0.5+0.5));
    col[i*3]=0.42+k*0.28; col[i*3+1]=0.58+k*0.24; col[i*3+2]=0.78+k*0.18;
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(col,3));
  const mat=new T.MeshBasicMaterial({vertexColors:true, side:T.BackSide, fog:false, depthWrite:false});
  const mesh=new T.Mesh(geo, mat);
  mesh.name='sky'; mesh.frustumCulled=false; mesh.userData.sw=true;
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
root.LOOK={PRESET, pick, preset, fog, slope, shade, applyRenderer, makeSky, scatter};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LOOK;
})(typeof window!=='undefined'?window:globalThis);
