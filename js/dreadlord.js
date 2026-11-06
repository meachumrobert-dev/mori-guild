/* dreadlord.js (v3.6) — Delroth's temporary Dread Lord form.
   Default look stays locked canon (dark charcoal fur, no white, red scars, glowing green eyes, +5 HAT on).
   Form: horns grow in, +5 HAT comes off (no horn holes), eyes crackle neon yellow-green, self-centered Fireball
   with scorpion-staff shockwave, and Death (legless skeletal torso + scythe) floats in. Then he reverts. */
(function(){
'use strict';
const T=THREE;
let X=null, active=null, deathG=null;
function hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

function makeHorns(head){ const g=new T.Group(); g.name='dreadHorns';
  [-1,1].forEach(s=>{ const curve=new T.CatmullRomCurve3([new T.Vector3(s*0.06,0.14,-0.02), new T.Vector3(s*0.12,0.28,0.0), new T.Vector3(s*0.1,0.42,0.06), new T.Vector3(s*0.05,0.52,0.14)]);
    const tube=new T.Mesh(HERO.taperTube(curve,0.028,0.008,10,6), new T.MeshLambertMaterial({color:'#1a1a1f',emissive:'#2a0a10',emissiveIntensity:0.25})); g.add(tube); });
  head.add(g); return g; }

function makeDeath(){ const g=new T.Group(); g.name='deathOfEarth';
  const bone=new T.MeshLambertMaterial({color:'#e8e0d0'}); const dark=new T.MeshLambertMaterial({color:'#1a1a1f'});
  // legless skeletal torso
  const ribs=new T.Mesh(new T.BoxGeometry(0.55,0.7,0.28), bone); ribs.position.y=1.1; g.add(ribs);
  for(let i=0;i<4;i++){ const r=new T.Mesh(new T.BoxGeometry(0.5,0.04,0.06), bone); r.position.set(0,0.95+i*0.12,0.14); g.add(r); }
  const skull=new T.Mesh(new T.SphereGeometry(0.18,10,8), bone); skull.position.y=1.6; g.add(skull);
  [-1,1].forEach(s=>{ const e=new T.Mesh(new T.SphereGeometry(0.04,6,4), new T.MeshBasicMaterial({color:'#39ff6a'})); e.position.set(s*0.06,1.62,0.14); g.add(e); });
  // floating — no legs; a smoke skirt
  const skirt=new T.Mesh(new T.ConeGeometry(0.4,0.9,8,1,true), new T.MeshLambertMaterial({color:'#2a2230',transparent:true,opacity:0.55,side:T.DoubleSide})); skirt.position.y=0.55; skirt.rotation.x=Math.PI; g.add(skirt);
  // scythe
  const haft=new T.Mesh(new T.CylinderGeometry(0.025,0.03,1.8,6), dark); haft.position.set(0.45,1.2,0); haft.rotation.z=-0.25; g.add(haft);
  const blade=new T.Mesh(new T.BoxGeometry(0.7,0.08,0.02), new T.MeshLambertMaterial({color:'#c8d0d8',emissive:'#39ff6a',emissiveIntensity:0.3})); blade.position.set(0.7,2.0,0); blade.rotation.z=-0.9; g.add(blade);
  g.scale.setScalar(1.15); return g; }

function fireballFx(origin){ const g=new T.Group(); g.position.copy(origin);
  const core=new T.Mesh(new T.SphereGeometry(0.35,12,10), new T.MeshBasicMaterial({color:'#ff6a1a'})); g.add(core);
  const ring=new T.Mesh(new T.TorusGeometry(0.6,0.06,6,24), new T.MeshBasicMaterial({color:'#facc15'})); ring.rotation.x=Math.PI/2; g.add(ring);
  const shock=new T.Mesh(new T.RingGeometry(0.4,0.55,32), new T.MeshBasicMaterial({color:'#39ff6a',side:T.DoubleSide,transparent:true,opacity:0.85})); shock.rotation.x=-Math.PI/2; shock.position.y=0.05; g.add(shock);
  X.scene.add(g); return {g, core, ring, shock, t:0}; }

function start(){ if(active) return active; const model=X.delroth&&X.delroth.model; if(!model) return null;
  const U=model.userData.hero; if(!U||!U.head) return null;
  // remove +5 HAT (no horn holes)
  if(U.hat){ U.hat.visible=false; }
  const horns=makeHorns(U.head);
  // eyes crackle neon yellow-green
  const prevGlow=U.glow; U.glow=1.6; if(U.irisMat){ U._prevEi=U.irisMat.emissiveIntensity; U.irisMat.color.set('#d6ff3a'); U.irisMat.emissive.set('#c8ff1a'); U.irisMat.emissiveIntensity=2.2; }
  // Death floats in
  deathG=makeDeath(); const p=model.position; deathG.position.set(p.x-2.2, p.y+0.4, p.z+0.6); X.scene.add(deathG);
  const fx=fireballFx(new T.Vector3(p.x, p.y+1.2, p.z));
  // staff flourish
  if(U.limbs&&U.limbs.armR) U.limbs.armR.rotation.x=-2.2;
  active={t:0, dur:7.5, horns, fx, prevGlow, U, model};
  LORE&&LORE.unlockFlag&&LORE.unlockFlag('dread_lord');
  LORE&&LORE.unlock&&LORE.unlock('npc_delroth');
  X.log&&X.log('☠ Delroth\'s Dread Lord form — horns, no hat, neon eyes. Death of Earth floats in.');
  X.showRoll&&X.showRoll('☠','Dread Lord form','crit');
  return active; }

function end(){ if(!active) return; const {U,horns,fx,prevGlow}=active;
  if(horns&&horns.parent) horns.parent.remove(horns); if(horns&&horns.geometry) horns.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  if(U.hat) U.hat.visible=true;
  U.glow=prevGlow!=null?prevGlow:1; if(U.irisMat){ U.irisMat.color.set('#39ff6a'); U.irisMat.emissive.set('#39ff6a'); U.irisMat.emissiveIntensity=U._prevEi!=null?U._prevEi:1.2; }
  if(U.limbs&&U.limbs.armR) U.limbs.armR.rotation.x=0;
  if(fx&&fx.g&&fx.g.parent) fx.g.parent.remove(fx.g);
  if(deathG&&deathG.parent){ deathG.parent.remove(deathG); deathG=null; }
  active=null; X.log&&X.log('Delroth settles. The +5 HAT sits again. Canon restored.'); }

function update(dt){ if(!active) return; active.t+=dt; const a=active, k=Math.min(1,a.t/a.dur);
  // grow horns
  if(a.horns) a.horns.scale.setScalar(Math.min(1,a.t*1.4));
  // fireball pulse then shockwave expand
  if(a.fx){ const f=a.fx; f.t+=dt; const pulse=1+Math.sin(f.t*14)*0.08; f.core.scale.setScalar(pulse*(1.2-Math.min(1,f.t*0.35)));
    const sh=0.6+f.t*3.5; f.shock.scale.set(sh,sh,sh); f.shock.material.opacity=Math.max(0,0.9-f.t*0.35); f.ring.rotation.z+=dt*4;
    if(f.t>2.8&&f.g.parent) f.g.parent.remove(f.g); }
  // Death drifts and faces Delroth
  if(deathG){ deathG.position.y=0.4+Math.sin(a.t*1.7)*0.15; deathG.rotation.y=Math.atan2(a.model.position.x-deathG.position.x, a.model.position.z-deathG.position.z); }
  // eye crackle
  if(a.U.irisMat) a.U.irisMat.emissiveIntensity=1.6+Math.sin(a.t*22)*0.8+Math.random()*0.3;
  if(a.t>=a.dur) end(); }

function playing(){ return !!active; }
function toggle(){ if(active){ end(); return false; } start(); return true; }

window.DREADLORD={ init(o){ X=o; }, start, end, update, playing, toggle, hash };
})();
