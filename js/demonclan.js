/* demonclan.js (v3.4, Phase 2 Part B) — Gravenmoor, the Demon Clan city-state, and Havenwall, its besieged sister city.
   Everything here is fiction built from the Mori Templates lore, renamed so it borrows no trademarks: the Moonfang Kin (wolf-folk),
   the Coilblight (the corruption). SRD 3.5 necromancy is flavour only. Clan Lord Delroth is not re-modelled here (his model stays locked):
   he "holds court at the Retired Bard", and Gravenmoor keeps his seat. Only compact state is saved: S.clan[seed] = {b: corruption bitset
   (base64), ts, n (tiles purged), q (quest step)}, S.rep = {clan, kin, haven}. */
(function(){
'use strict';
const T=THREE, TS=window.TWOSPEED, P=()=>window.PLANET;
let X=null;
const TILE=8, CR=120, N=Math.ceil(CR*2/TILE); // corruption grid: 30×30 tiles of 8 m around Havenwall's heart, masked to a 120 m circle
const RATE={spread:10, kin:25, clan:30};   // seconds per event: the blight creeps 1 tile/10 s; the Kin cleanse 1/25 s from the center, Clan raids 1/30 s from the edges
const REP_T=[[-25,'Hostile'],[0,'Unfriendly'],[1,'Neutral'],[25,'Friendly'],[75,'Honored'],[150,'Revered']];
/* ---------- names (final) ---------- */
const CLAN={ name:'Gravenmoor', gov:'clan', govName:'The Demon Clan Compact', ruler:'Clan Lord Delroth', banner:['#1a1a1f','#7dff8f'], motto:'We are many.', power:8,
  hold:'the Hold of Many', lieutenant:'Legion', warden:'the Death of Earth', bannerName:'the Smokeskull' };
const HAVEN={ name:'Havenwall', gov:'sanctum', govName:'The Walled Sanctum', ruler:'the Forge-Wardens of Havenwall', banner:['#e8e2cc','#7a1a1a'], motto:'The wall holds.', power:5,
  forge:"the Dragon's Forge", smith:'Brakka Coalgrin', allies:'the Moonfang Kin', blight:'the Coilblight' };
const LEGION_LINE='I AM LEGION, FOR WE ARE MANY.';
const DEATH_LINES=['The Death of Earth inclines its hood. "Everything returns to the soil in its season. Not today. Walk on, friend of the Clan."',
  'The Death of Earth does not speak. It lifts the scythe a finger\'s width — a salute — and is gone.',
  'A voice like settling dust: "I keep the gate so the Clan may keep its promises. Be gentle with the living."'];
const BRAKKA_LINES=['"The rules of the shopkeeper: you break it, it\'s yours. You buy it, it\'s also yours. Everything is yours if you pay."','"Dragon\'s Forge don\'t care what you are. Fire\'s fire. Steel\'s steel."','"Coilblight eats leather. Not my leather. My leather bites back."'];
const SHOP=[['mwstud','Masterwork Studded Leather',175,{kind:'armor',armorType:'Studded Leather',mw:true}],['mwchain','Masterwork Chain Shirt',250,{kind:'armor',armorType:'Chain Shirt',mw:true}],
  ['mwbp','Masterwork Breastplate',350,{kind:'armor',armorType:'Breastplate',mw:true}],['mithral','Mithral Chain Shirt',1100,{kind:'armor',armorType:'Chain Shirt',mw:true,special:true}]];
const SCROLLS=[['ray','Scroll of Ray of Enfeeblement',25,{buff:'atk'},'necromancy 1 — your foes falter (+2 attack, 2 min)'],['fl','Scroll of False Life',150,{heal:'1d10+3'},'necromancy 2 — 1d10+3 vigor'],
  ['gr','Scroll of Gentle Repose',375,{buff:'repose'},'necromancy 3 — carcasses keep 4× longer for skinning'],['hu','Scroll of Halt Undead',375,{buff:'halt'},'necromancy 3 — undead can\'t attack you for 2 min']];
/* ---------- which regions ---------- */
const pc={};
function pick(){ const PL=P(), g=X.guildId(); const k=PL.seed+'|'+g; if(pc[k]) return pc[k];
  const gc=PL.regionCenter(g), r=PL.rngFor(PL.seed,'clanpick'); const land=[];
  for(let id=0;id<PL.COUNT;id++){ if(id===g) continue; const inf=PL.regionInfo(id); if(!inf.isLand||inf.land<0.99) continue; land.push({id, inf, a:PL.angle(gc,inf.c), k:r()}); }
  const off=(v,lo,hi)=>v<lo?lo-v:v>hi?v-hi:0; const dark=b=>['mountain','taiga','tundra','swamp','steppe'].includes(b)?0:0.4, fair=b=>['grass','forest','savanna','steppe'].includes(b)?0:0.4;
  land.forEach(c=>c.s=off(c.a,0.3,0.6)*10+dark(c.inf.biome)+c.k*0.3); land.sort((a,b)=>a.s-b.s); const clan=land.length?land[0].id:(g+1)%PL.COUNT; const cc=PL.regionCenter(clan);
  land.forEach(c=>{ const ac=PL.angle(cc,c.inf.c); c.s2=(c.id===clan?99:0)+off(c.a,0.3,0.7)*10+off(ac,0.3,0.6)*10+fair(c.inf.biome)+c.k*0.3; }); land.sort((a,b)=>a.s2-b.s2);
  const sister=land.length>1?land[0].id:(clan+1)%PL.COUNT; return pc[k]={clan, sister}; }
const isClan=id=>X&&+id===pick().clan, isSister=id=>X&&+id===pick().sister;
function ensure(w){ const p=pick(); [p.clan,p.sister].forEach(id=>{ if(!(w.reg[id]>=4)) w.reg[id]=4; w.exp[id]=1; }); }
/* banners: the Smokeskull and the Sanctum cross */
function paintSmokeskull(x,c){ x.fillStyle='#1a1a1f'; x.fillRect(0,0,c.width,c.height); const W=c.width, H=c.height;
  for(let i=0;i<18;i++){ const a=i*0.9, rr=14+i*2.2; x.fillStyle='rgba(150,160,170,'+(0.08+0.02*(i%3))+')'; x.beginPath(); x.arc(W/2+Math.sin(a)*rr*0.7, H*0.62-i*6, 16+i*0.9, 0, 7); x.fill(); }
  x.fillStyle='#7dff8f'; x.beginPath(); x.arc(W/2,H*0.5,30,Math.PI,0); x.lineTo(W/2+30,H*0.5+14); x.quadraticCurveTo(W/2+24,H*0.5+26,W/2+16,H*0.5+30); x.lineTo(W/2-16,H*0.5+30); x.quadraticCurveTo(W/2-24,H*0.5+26,W/2-30,H*0.5+14); x.closePath(); x.fill();
  x.fillRect(W/2-14,H*0.5+30,28,12); x.fillStyle='#1a1a1f'; x.beginPath(); x.ellipse(W/2-12,H*0.5+6,8,10,0,0,7); x.ellipse(W/2+12,H*0.5+6,8,10,0,0,7); x.fill();
  x.beginPath(); x.moveTo(W/2,H*0.5+16); x.lineTo(W/2-4,H*0.5+24); x.lineTo(W/2+4,H*0.5+24); x.fill(); for(let i=-2;i<=2;i++) x.fillRect(W/2+i*5-1,H*0.5+32,2,10);
  x.fillStyle='#7dff8f'; x.font='bold 15px Georgia,serif'; x.textAlign='center'; x.fillText('WE ARE MANY',W/2,H-14); }
function paintSanctum(x,c){ const W=c.width,H=c.height; x.fillStyle='#e8e2cc'; x.fillRect(0,0,W,H); x.fillStyle='#7a1a1a'; x.fillRect(W/2-9,20,18,H-70); x.fillRect(22,62,W-44,18);
  x.fillStyle='#5a5148'; x.fillRect(0,H-44,W,44); x.fillStyle='#e8e2cc'; for(let i=0;i<W;i+=22) x.fillRect(i,H-44,11,10); }
const csC={}, ORIG={};
function wrapPlanet(){ const PL=P(); if(PL.__clanWrapped) return; PL.__clanWrapped=true; ORIG.cs=PL.cityState; ORIG.rel=PL.relation;
  PL.cityState=function(id,gid){ id=+id; if(X&&id!==X.guildId()){ const p=pick(); if(id===p.clan||id===p.sister){ const k=PL.seed+'|'+id; if(!csC[k]){ const base=id===p.clan?CLAN:HAVEN; const inf=PL.regionInfo(id);
          csC[k]=Object.assign({id, biome:inf.biome, paint:id===p.clan?paintSmokeskull:paintSanctum, clan:id===p.clan, sister:id===p.sister}, base); } return csC[k]; } } return ORIG.cs.call(PL,id,gid); };
  PL.relation=function(a,b){ if(X){ const p=pick(), g=X.guildId(), s=new Set([+a,+b]); if((s.has(p.clan)&&s.has(p.sister))||(s.has(p.clan)&&s.has(g))||(s.has(p.sister)&&s.has(g))) return {type:'ally', why:s.has(p.clan)&&s.has(p.sister)?'sworn against the Coilblight':'old friends of the Guild'}; } return ORIG.rel.call(PL,a,b); }; }
/* ---------- state ---------- */
function st(){ const S=X.S(); if(!S.clan) S.clan={}; if(!S.rep) S.rep={clan:0,kin:0,haven:0}; const k=P().seed; let w=S.clan[k]; if(!w){ w=S.clan[k]={b:null, ts:Date.now(), n:0, q:0, qn:0, dn:0}; } if(!w.b) w.b=enc(initBits()); return w; }
let bits=null, bitsSeed=null, mask=null, maskN=0, tileR=null;
function grid(){ if(mask) return; mask=new Uint8Array(N*N); tileR=new Float32Array(N*N); for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const x=(i-N/2+0.5)*TILE, z=(j-N/2+0.5)*TILE, r=Math.hypot(x,z); tileR[j*N+i]=r; if(r<=CR){ mask[j*N+i]=1; maskN++; } } }
const tx=i=>(i%N-N/2+0.5)*TILE, tz=i=>(Math.floor(i/N)-N/2+0.5)*TILE;
function initBits(){ grid(); const r=P().rngFor(P().seed,'blight'); const ph=[r()*6.28,r()*6.28,r()*6.28,r()*6.28]; const sc=[];
  for(let i=0;i<N*N;i++){ if(!mask[i]) continue; const x=tx(i), z=tz(i); const nz=0.5+0.25*Math.sin(x*0.045+ph[0])*Math.cos(z*0.05+ph[1])+0.25*Math.sin((x+z)*0.08+ph[2])*Math.sin((x-z)*0.06+ph[3]); sc.push([i,tileR[i]/CR*0.9+nz*0.5]); }
  sc.sort((a,b)=>b[1]-a[1]); const b=new Uint8Array(Math.ceil(N*N/8)); const n=Math.round(sc.length*0.65); for(let q=0;q<n;q++){ const i=sc[q][0]; b[i>>3]|=1<<(i&7); } return b; }
function enc(b){ let s=''; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
function dec(s){ const t=atob(s); const b=new Uint8Array(Math.ceil(N*N/8)); for(let i=0;i<t.length&&i<b.length;i++) b[i]=t.charCodeAt(i); return b; }
function B(){ const w=st(); if(bitsSeed!==P().seed||!bits){ grid(); bits=dec(w.b); bitsSeed=P().seed; } return bits; }
const isC=i=>(B()[i>>3]>>(i&7))&1;
function setC(i,v){ const b=B(); if(v) b[i>>3]|=1<<(i&7); else b[i>>3]&=~(1<<(i&7)); st().b=enc(b); tilesDirty=true; }
function corruptCount(){ grid(); let n=0; for(let i=0;i<N*N;i++) if(mask[i]&&isC(i)) n++; return n; }
const pct=()=>{ grid(); return Math.round(corruptCount()/maskN*100); };
const nb4=i=>{ const x=i%N, y=Math.floor(i/N), o=[]; if(x>0) o.push(i-1); if(x<N-1) o.push(i+1); if(y>0) o.push(i-N); if(y<N-1) o.push(i+N); return o; };
function spread(){ grid(); const front=[]; for(let i=0;i<N*N;i++){ if(!mask[i]||!isC(i)) continue; nb4(i).forEach(q=>{ if(mask[q]&&!isC(q)&&tileR[q]>22) front.push(q); }); } // the heart of the city (22 m) never falls
  if(!front.length) return -1; const q=front[Math.floor(Math.random()*front.length)]; setC(q,1); stats.spread++; return q; }
/* the Moonfang Kin hold the center and push outward; Clan raids burn in from the edge. */
function cleanseStep(side, by){ grid(); let best=-1, bv=side==='clan'?-1:1e9; for(let i=0;i<N*N;i++){ if(!mask[i]||!isC(i)) continue; const r=tileR[i]; if(side==='clan'?r>bv:r<bv){ bv=r; best=i; } }
  if(best<0) return -1; setC(best,0); stats[side]++; stats.log.push({side, r:+bv.toFixed(1), by:by||'npc'}); if(stats.log.length>60) stats.log.shift(); if(by==='mori'||by==='player') checkDone(); return best; }
function checkDone(){ if(corruptCount()===0){ X.log('✨ Havenwall is free of the Coilblight! The Moonfang Kin howl from the walls.'); rep('kin',10); rep('haven',10); } }
let acc={spread:0,kin:0,clan:0};
function sim(sec){ acc.spread+=sec; acc.kin+=sec; acc.clan+=sec; let guard=0;
  while((acc.spread>=RATE.spread||acc.kin>=RATE.kin||acc.clan>=RATE.clan)&&guard++<500){ if(acc.spread>=RATE.spread){ acc.spread-=RATE.spread; spread(); } if(acc.kin>=RATE.kin){ acc.kin-=RATE.kin; cleanseStep('kin'); } if(acc.clan>=RATE.clan){ acc.clan-=RATE.clan; cleanseStep('clan'); } } }
const stats={spread:0, kin:0, clan:0, player:0, mori:0, log:[], catchup:0};
function blocks(x,z){ if(!X) return false; const F=X.SW.F; if(!isSister(F.id)) return false; const i=tileAt(x,z); return i>=0&&isC(i); }
function tileAt(x,z){ const i=Math.floor(x/TILE+N/2), j=Math.floor(z/TILE+N/2); if(i<0||j<0||i>=N||j>=N) return -1; const k=j*N+i; return mask&&mask[k]?k:-1; }
/* ---------- reputation ---------- */
function rep(f,n){ const S=X.S(); st(); const before=tier(S.rep[f]); S.rep[f]=(S.rep[f]||0)+n; const after=tier(S.rep[f]); if(after!==before) X.log('★ Reputation: '+FNAME[f]+' — you are now '+after+'.'); return S.rep[f]; }
const FNAME={clan:'the Demon Clan Compact', kin:'the Moonfang Kin', haven:'Havenwall'};
function tier(v){ v=v||0; let t='Hostile'; for(const [m,n] of REP_T) if(v>=m) t=n; return t; }
function repLine(){ const S=X.S(); st(); return ['clan','kin','haven'].map(f=>FNAME[f]+': <b>'+tier(S.rep[f])+'</b> ('+(S.rep[f]||0)+')').join(' · '); }
const disc=f=>{ const v=X.S().rep&&X.S().rep[f]||0; const c=X.coupon?X.coupon(f):1; return (v>=75?0.85:v>=25?0.92:1)*c; }; // v3.5: a won haggle gives 10% off for the day
/* ---------- site building (called by seedworld at the end of buildSite) ---------- */
let site=null; const dm=new T.Object3D(), qn=new T.Quaternion(), up=new T.Vector3(0,1,0), nv=new T.Vector3();
const lam=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{}));
function siteHook(F,kit){ site=null; if(!X) return; if(F.stage<4||F.guild) return; if(isClan(F.id)) buildClan(F,kit); else if(isSister(F.id)) buildHaven(F,kit); }
function darken(o){ const cache=new Map(); o.traverse(q=>{ if(!q.isMesh) return; const m=q.material; if(!m||!m.color) return; if(!cache.has(m)){ const c=m.clone(); c.color.multiplyScalar(0.42).lerp(new T.Color('#3a2f45'),0.25); cache.set(m,c); } q.material=cache.get(m); }); }
function buildClan(F,K){ const A=F.A, root=K.root, h=K.heightAt; site={kind:'clan', F, t:0};
  root.children.forEach(o=>{ if(o.userData.card&&o!==F.keep) darken(o); }); if(F.keep) darken(F.keep);
  // a skull on the keep (green-lit sockets), skull totems along the streets
  if(F.keep){ const k=F.keep; const bone=lam('#d9d2bf'); K.mk(new T.SphereGeometry(2.2,12,10),bone,0,13.2,6.4,k).scale.set(1,1,0.7); K.mk(new T.BoxGeometry(2.4,1.2,1.2),bone,0,11.4,6.6,k);
    [-0.8,0.8].forEach(s=>K.mk(new T.SphereGeometry(0.5,8,6),new T.MeshBasicMaterial({color:'#7dff8f'}),s,13.4,7.8,k)); }
  const totem=r=>{ const g=new T.Group(); const x=A.x+Math.cos(r)*30, z=A.z+Math.sin(r)*30; g.position.set(x,h(x,z),z); root.add(g); K.mk(new T.CylinderGeometry(0.12,0.16,4,5),lam('#2a2228'),0,2,0,g); K.mk(new T.SphereGeometry(0.42,8,6),lam('#d9d2bf'),0,4.2,0,g); K.mk(new T.SphereGeometry(0.1,5,4),new T.MeshBasicMaterial({color:'#7dff8f'}),0.15,4.25,0.36,g); K.mk(new T.SphereGeometry(0.1,5,4),new T.MeshBasicMaterial({color:'#7dff8f'}),-0.15,4.25,0.36,g); };
  for(let i=0;i<8;i++) totem(i/8*Math.PI*2+0.2);
  // the Hold of Many: Delroth's seat (empty — he holds court at the Retired Bard)
  const hx=A.x-12, hz=A.z+1; const hold=new T.Group(); hold.position.set(hx,h(hx,hz),hz); root.add(hold); K.mk(new T.BoxGeometry(3.4,0.5,3),lam('#2a2228'),0,0.25,0,hold); K.mk(new T.BoxGeometry(1.6,3.4,0.4),lam('#1a1a1f'),0,2.2,-1,hold); K.mk(new T.BoxGeometry(1.6,0.3,1.4),lam('#3a2f45'),0,1.1,-0.4,hold);
  const sb=new T.Mesh(new T.PlaneGeometry(1.4,2.1),new T.MeshLambertMaterial({map:K.bannerTex(P().cityState(F.id,X.guildId())),side:T.DoubleSide})); sb.position.set(0,3,-0.78); hold.add(sb);
  F.colliders.circles.push({x:hx,z:hz,r:1.8});
  // the scribe's stall (SRD necromancy scrolls)
  const sx=A.x+12, sz=A.z+2; const stall=new T.Group(); stall.position.set(sx,h(sx,sz),sz); root.add(stall); K.mk(new T.BoxGeometry(3,1,1.4),lam('#3a2a1a'),0,0.5,0,stall); K.mk(new T.BoxGeometry(3.2,0.1,1.8),lam('#2a2228'),0,2.6,0,stall);
  [-1.4,1.4].forEach(s=>K.mk(new T.CylinderGeometry(0.06,0.06,2.6,4),lam('#2a2228'),s,1.3,0.7,stall)); K.mk(new T.BoxGeometry(0.5,0.05,0.35),lam('#e8dcb5'),-0.6,1.03,0,stall); K.mk(new T.BoxGeometry(0.5,0.05,0.35),lam('#e8dcb5'),0.4,1.03,0.1,stall);
  F.colliders.circles.push({x:sx,z:sz,r:1.6});
  // Legion: a smoke-demon of many, instanced puffs + orbiting skull sprites
  const lx=A.x+18, lz=A.z-8; const LG=new T.Group(); LG.position.set(lx,h(lx,lz)+4,lz); root.add(LG); const PN=X.mobile?22:34;
  const puffs=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshLambertMaterial({color:'#4a4a52',transparent:true,opacity:0.55,depthWrite:false,emissive:'#102014'}),PN); puffs.frustumCulled=false; LG.add(puffs);
  const sk=[]; const skT=skullTex(); for(let i=0;i<5;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:skT,transparent:true,depthWrite:false,color:'#c8ffd2'})); s.scale.set(1.3,1.3,1); LG.add(s); sk.push(s); }
  const lbl=K.signSprite(['💨 Legion',LEGION_LINE],'#1a1a1f'); lbl.position.set(0,7,0); LG.add(lbl);
  // the Ashen Gate, kept by the Death of Earth (rarely seen)
  const ga=Math.atan2(-(F.L.z-A.z),-(F.L.x-A.x))+0.6, gx=A.x+Math.cos(ga)*56, gz=A.z+Math.sin(ga)*56; const gate=new T.Group(); gate.position.set(gx,h(gx,gz),gz); gate.rotation.y=-ga+Math.PI/2; root.add(gate);
  const ash=lam('#3b3838'); K.mk(new T.BoxGeometry(1.2,7,1.2),ash,-3,3.5,0,gate); K.mk(new T.BoxGeometry(1.2,7,1.2),ash,3,3.5,0,gate); K.mk(new T.BoxGeometry(7.6,1.1,1.4),ash,0,7.4,0,gate);
  const ashDisc=new T.Mesh(new T.CircleGeometry(5,20),lam('#6e6a66')); ashDisc.rotation.x=-Math.PI/2; ashDisc.position.y=0.06; gate.add(ashDisc);
  const sg=K.signSprite(['the Ashen Gate','kept by the Death of Earth'],'#3b3838'); sg.position.set(0,9.5,0); sg.scale.multiplyScalar(0.7); gate.add(sg); F.colliders.circles.push({x:gx+Math.cos(ga+Math.PI/2)*3,z:gz+Math.sin(ga+Math.PI/2)*3,r:0.9},{x:gx-Math.cos(ga+Math.PI/2)*3,z:gz-Math.sin(ga+Math.PI/2)*3,r:0.9});
  const D=deathMesh(); D.position.set(gx,h(gx,gz)+0.4,gz); root.add(D);
  const w=st(); const night=X.day&&X.day()<0.35; const seen=night||Math.random()<0.25||X.forceDeath; D.visible=seen; D.userData.op=seen?1:0;
  site=Object.assign(site,{hold:{x:hx,z:hz}, stall:{x:sx,z:sz}, legion:{x:lx,z:lz,g:LG,puffs,sk,PN,seed:Array.from({length:PN},(_,i)=>[Math.random()*6.28,Math.random()*6.28,0.6+Math.random()*1.4,1.2+Math.random()*2.6])}, gate:{x:gx,z:gz,a:ga}, death:D, spoke:false});
  F.clan='clan'; }
function skullTex(){ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#e8f5e8'; x.beginPath(); x.arc(32,28,20,Math.PI,0); x.lineTo(52,40); x.lineTo(42,50); x.lineTo(22,50); x.lineTo(12,40); x.closePath(); x.fill();
  x.fillStyle='#0b120c'; x.beginPath(); x.ellipse(24,32,6,7,0,0,7); x.ellipse(40,32,6,7,0,0,7); x.fill(); const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }
function deathMesh(){ const g=new T.Group(); g.name='deathOfEarth'; const robe=new T.MeshLambertMaterial({color:'#18161a',transparent:true}); const mk=(geo,m,x,y,z)=>{ const o=new T.Mesh(geo,m); o.position.set(x,y,z); g.add(o); return o; };
  mk(new T.ConeGeometry(0.9,3.2,10,1,true),robe,0,1.9,0); const hood=mk(new T.SphereGeometry(0.48,12,10,0,Math.PI*2,0,Math.PI*0.62),robe,0,3.55,0); hood.rotation.x=0.25;
  mk(new T.CircleGeometry(0.3,12),new T.MeshBasicMaterial({color:'#000000',transparent:true}),0,3.45,0.33);
  const soilM=new T.MeshLambertMaterial({color:'#5a4a33',transparent:true}); mk(new T.SphereGeometry(0.08,6,4),soilM,0,0.4,0.3); // earth falls from the hem
  const sc=new T.Group(); sc.position.set(0.85,2.2,0.2); g.add(sc); const shaft=new T.Mesh(new T.CylinderGeometry(0.05,0.05,4,6),new T.MeshLambertMaterial({color:'#3a2a1a',transparent:true})); sc.add(shaft); shaft.rotation.z=0.12;
  const blade=new T.Mesh(new T.TorusGeometry(0.9,0.06,4,16,Math.PI*0.75),new T.MeshLambertMaterial({color:'#9aa0a8',transparent:true})); blade.position.set(-0.55,1.85,0); blade.rotation.z=Math.PI*0.2; sc.add(blade);
  g.userData.mats=[robe,soilM,shaft.material,blade.material]; return g; }
function buildHaven(F,K){ const A=F.A, root=K.root, h=K.heightAt; site={kind:'haven', F, t:0};
  // the Dragon's Forge — a stone forge-hall whose chimney is a dragon's head breathing the fire
  const fx=A.x+24, fz=A.z+8; const fg=new T.Group(); fg.position.set(fx,h(fx,fz),fz); fg.rotation.y=-0.4; root.add(fg); fg.userData.card={cell:4,w:12,h:12};
  const stone=K.TX?K.TX('stone_block','#7d776e',1.6):lam('#7d776e'), scale=lam('#5a2a22'), horn=lam('#d9d2bf'), fire=new T.MeshBasicMaterial({color:'#ffae3a'});
  K.mk(new T.BoxGeometry(10,6,8),stone,0,3,0,fg); K.mk(new T.BoxGeometry(10.6,0.6,8.6),lam('#4a3a2a'),0,6.2,0,fg);
  const head=new T.Group(); head.position.set(0,7.6,3.2); fg.add(head); K.mk(new T.BoxGeometry(2.6,2,3),scale,0,0,0,head); const sn=K.mk(new T.BoxGeometry(1.8,1.1,2.2),scale,0,-0.3,2.4,head);
  [-0.9,0.9].forEach(s=>{ const c=K.mk(new T.ConeGeometry(0.28,1.6,6),horn,s,1.4,-0.9,head); c.rotation.x=-0.6; K.mk(new T.SphereGeometry(0.22,6,4),new T.MeshBasicMaterial({color:'#ffd23f'}),s*0.7,0.45,1.45,head); });
  const mouth=K.mk(new T.BoxGeometry(1.4,0.35,0.2),fire,0,-0.75,3.45,head); const glow=K.mk(new T.BoxGeometry(3,3,0.2),fire,0,2.2,4.05,fg);
  F.colliders.circles.push({x:fx,z:fz,r:6}); const sg=K.signSprite(["🔥 The Dragon's Forge","Havenwall's heart-fire"],'#7a1a1a'); sg.position.set(0,12,0); fg.add(sg);
  // Brakka Coalgrin, goblin armor smith (WORLD.goblin, scaled, with a smith's pauldron)
  const bx=fx-Math.sin(-0.4)*0-2.5, bz=fz+6.5; const gob=window.WORLD&&WORLD.goblin?WORLD.goblin():new T.Group(); gob.scale.setScalar(1.35); gob.position.set(bx,h(bx,bz),bz); gob.rotation.y=Math.PI; root.add(gob);
  const pd=new T.Mesh(new T.SphereGeometry(0.2,8,6,0,Math.PI*2,0,Math.PI/2),lam('#8d8a80')); pd.position.set(0.25,0.95,0); gob.add(pd); const anvil=new T.Mesh(new T.BoxGeometry(0.9,0.6,0.45),lam('#3a3a3a')); anvil.position.set(bx+1.2,h(bx+1.2,bz)+0.3,bz); root.add(anvil);
  const bs=K.signSprite(['🛡 '+HAVEN.smith,'Goblin Armor Smith'],'#3a2a1a'); bs.position.set(bx,h(bx,bz)+3.4,bz); bs.scale.multiplyScalar(0.55); root.add(bs);
  F.colliders.circles.push({x:bx+1.2,z:bz,r:0.7});
  site=Object.assign(site,{forge:{x:fx,z:fz+5}, brakka:{x:bx,z:bz,g:gob}, head, mouth, glow});
  buildTiles(F,K); F.clan='haven'; }
/* corruption tiles: one instanced, slope-following quad per tile + a few tendrils; rebuilt only when a tile flips */
let tileMesh=null, tendril=null, tilesDirty=true, tileMat=null, tileH=null;
function blightTex(){ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#24102c'; x.fillRect(0,0,64,64); x.strokeStyle='#8b3aff'; x.lineWidth=2; x.globalAlpha=0.8;
  for(let i=0;i<7;i++){ x.beginPath(); let px=Math.random()*64, py=Math.random()*64; x.moveTo(px,py); for(let k=0;k<5;k++){ px+=(Math.random()-0.5)*26; py+=(Math.random()-0.5)*26; x.lineTo(px,py); } x.stroke(); }
  const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }
function buildTiles(F,K){ grid(); const g=new T.PlaneGeometry(TILE*1.02,TILE*1.02); g.rotateX(-Math.PI/2);
  tileMat=new T.MeshLambertMaterial({map:blightTex(),color:'#ffffff',emissive:'#1a0624',transparent:true,opacity:0.86,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  tileMesh=new T.InstancedMesh(g,tileMat,maskN); tileMesh.name='coilblight'; tileMesh.count=0; tileMesh.frustumCulled=false; tileMesh.renderOrder=2; tileMesh.receiveShadow=!X.mobile; K.root.add(tileMesh);
  tendril=new T.InstancedMesh(new T.ConeGeometry(0.22,2.4,4),new T.MeshLambertMaterial({color:'#3a1050',emissive:'#2a0a3a'}),maskN); tendril.count=0; tendril.frustumCulled=false; K.root.add(tendril);
  tileH=new Float32Array(N*N*4); for(let i=0;i<N*N;i++){ if(!mask[i]) continue; const x=tx(i), z=tz(i), e=2; const hc=K.heightAt(x,z); const nx=K.heightAt(x-e,z)-K.heightAt(x+e,z), nz=K.heightAt(x,z-e)-K.heightAt(x,z+e); tileH[i*4]=hc; tileH[i*4+1]=nx/(2*e); tileH[i*4+2]=nz/(2*e); tileH[i*4+3]=Math.abs(Math.sin(i*12.9898)*43758.5453)%1; }
  tilesDirty=true; site.tiles=tileMesh; }
function drawTiles(){ if(!tileMesh||!tilesDirty) return; tilesDirty=false; let k=0, q=0;
  for(let i=0;i<N*N;i++){ if(!mask[i]||!isC(i)) continue; const x=tx(i), z=tz(i); nv.set(tileH[i*4+1],1,tileH[i*4+2]).normalize(); qn.setFromUnitVectors(up,nv);
    dm.position.set(x,tileH[i*4]+0.16,z); dm.quaternion.copy(qn); dm.scale.set(1,1,1); dm.updateMatrix(); tileMesh.setMatrixAt(k++,dm.matrix);
    const hs=tileH[i*4+3]; if(hs<0.3){ dm.position.set(x+(hs-0.15)*30,tileH[i*4]+1,z+(0.15-hs)*22); dm.quaternion.setFromAxisAngle(up,hs*20); dm.rotateZ(0.25); dm.scale.set(1,0.6+hs*2,1); dm.updateMatrix(); tendril.setMatrixAt(q++,dm.matrix); } }
  tileMesh.count=k; tileMesh.instanceMatrix.needsUpdate=true; tendril.count=q; tendril.instanceMatrix.needsUpdate=true; }
/* ---------- per frame ---------- */
let simT=0, wT=0;
function update(dt){ if(!X) return; const w=st(); const now=Date.now();
  if(!stats.caught){ stats.caught=true; const away=Math.min(600,Math.max(0,(now-(w.ts||now))/1000)); stats.catchup=Math.round(away); if(away>1) sim(away); }
  sim(dt); w.ts=now; if(site&&site.kind==='haven') drawTiles();
  if(!site||X.mode()!=='world') return; const t=(site.t+=dt), p=X.player.pos;
  if(site.kind==='clan'){ const L=site.legion; const pf=L.puffs; for(let i=0;i<L.PN;i++){ const s=L.seed[i], a=s[0]+t*(0.4+s[2]*0.2), y=Math.sin(s[1]+t*0.9)*1.2+(i%5)*0.5; dm.position.set(Math.cos(a)*s[3],y,Math.sin(a)*s[3]); dm.quaternion.identity(); dm.scale.setScalar(s[2]*(0.9+0.15*Math.sin(t*2+i))); dm.updateMatrix(); pf.setMatrixAt(i,dm.matrix); } pf.instanceMatrix.needsUpdate=true;
    L.sk.forEach((s,i)=>{ const a=t*0.8+i*1.257; s.position.set(Math.cos(a)*3.2,1+Math.sin(t*1.3+i)*1.1,Math.sin(a)*3.2); s.material.opacity=0.55+0.4*Math.sin(t*2+i); });
    const D=site.death; if(D&&D.visible){ const d=Math.hypot(p.x-site.gate.x,p.z-site.gate.z); D.position.y=X.SW.heightAt(site.gate.x,site.gate.z)+0.4+Math.sin(t*1.1)*0.25; D.rotation.y=Math.atan2(p.x-site.gate.x,p.z-site.gate.z);
      if(d<14&&!site.spoke){ site.spoke=true; const ww=st(); ww.dn=(ww.dn||0)+1; X.log('☠ '+DEATH_LINES[(ww.dn-1)%DEATH_LINES.length]); TS&&TS.SFX.play('smoke',0.6,0.5); rep('clan',1); }
      if(site.spoke){ D.userData.op=Math.max(0,D.userData.op-dt*0.5); D.userData.mats&&D.userData.mats.forEach(m=>m.opacity=D.userData.op); if(D.userData.op<=0) D.visible=false; } } }
  else if(site.kind==='haven'){ const f=0.75+0.25*Math.sin(t*9)+0.1*Math.sin(t*23); site.mouth.scale.set(1,f,1); site.glow.material.color.setRGB(1,0.55+0.15*f,0.2); tileMat.emissive.setRGB(0.1+0.06*Math.sin(t*1.5),0.02,0.16+0.06*Math.sin(t*1.5));
    if(site.brakka) site.brakka.g.userData.arm&&(site.brakka.g.userData.arm.rotation.x=-Math.abs(Math.sin(t*3))*0.9);
    if(st().q===2&&st().qn>=12){ st().q=3; X.log('✦ The Mantle stirs — 12 tiles cleansed. Bring it back to Brakka Coalgrin at the Dragon\'s Forge.'); X.save(); } }
  wT-=dt; if(wT<=0){ wT=1; } }
/* ---------- interactions ---------- */
function purge(i){ const near=[i].concat(nb4(i)).filter(q=>mask[q]&&isC(q)); near.forEach(q=>setC(q,0)); stats.player+=near.length; const w=st(); w.n+=near.length; if(w.q===2) w.qn+=near.length;
  TS&&TS.SFX.play('cleanse',1,0.8); rep('kin',1); rep('haven',1); X.event&&X.event('purge',near.length); X.log('✦ You purge '+near.length+' tile'+(near.length>1?'s':'')+' of the Coilblight. Havenwall is '+pct()+'% blighted. (Moonfang Kin +1 · Havenwall +1'+(w.q===2?' · Mantle '+Math.min(12,w.qn)+'/12':'')+')'); checkDone(); X.save(); return near.length; }
function targets(){ const out=[]; if(!X||!site||X.mode()!=='world') return out; const p=X.player.pos;
  if(site.kind==='clan'){ out.push({x:site.hold.x,z:site.hold.z+2.4,r:3.2,label:'☠ The Hold of Many — Clan Lord Delroth\'s seat',act:holdUI});
    out.push({x:site.stall.x,z:site.stall.z+1.8,r:3,label:'📜 Clan scribe — SRD necromancy scrolls',act:scribeUI});
    out.push({x:site.legion.x,z:site.legion.z,r:6,label:'💨 Legion — "'+LEGION_LINE+'"',act:legionTalk});
    if(site.death&&site.death.visible) out.push({x:site.gate.x,z:site.gate.z,r:6,label:'☠ the Death of Earth (warden of the Ashen Gate)',act:()=>{ site.spoke=true; X.log('☠ '+DEATH_LINES[2]); }}); }
  else if(site.kind==='haven'){ out.push({x:site.brakka.x,z:site.brakka.z-1.6,r:3,label:'🛡 '+HAVEN.smith+' — Goblin Armor Smith',act:brakkaUI});
    out.push({x:site.forge.x,z:site.forge.z,r:3.4,label:'🔥 The Dragon\'s Forge',act:()=>X.log('🔥 The Dragon\'s Forge roars. Brakka keeps it fed; Havenwall keeps it safe. The Coilblight hates its light.')});
    const i=tileAt(p.x,p.z); let best=-1, bd=1e9; if(i>=0){ [i].concat(nb4(i)).forEach(q=>{ if(mask[q]&&isC(q)){ const d=Math.hypot(tx(q)-p.x,tz(q)-p.z); if(d<bd){ bd=d; best=q; } } }); }
    if(best>=0&&bd<7) out.push({x:p.x,z:p.z,r:1,label:'✦ Purge the Coilblight (Kin +1 · Havenwall +1)',act:()=>purge(best),purge:true}); }
  return out; }
function legionTalk(){ TS&&TS.SFX.play('smoke',1,0.8); X.showRoll('☠','<b>Legion:</b> "'+LEGION_LINE+'"','crit'); X.log('💨 Legion, the Clan\'s smoke-lieutenant, coils around you and laughs with a hundred voices. "The Clan Lord holds court at the Retired Bard. We hold the city. Raid the blight from its edges, little guild-friend."'); rep('clan',1); }
function holdUI(){ const w=st(), cs=CLAN; let qh='';
  if(w.q===1){ qh='<div class="quote">A clan-warden lays a pale wolf-skin cloak across your arms. "The Clan Lord set it aside for whoever would help Havenwall. It is not yet bound. Cleanse the blight and Brakka can bind it."</div><button class="pri" id="cTake">Take the Pale Wolf\'s Mantle (unbound)</button>'; }
  else if(w.q>=2) qh='<div class="small">Quest: <b>The Promise of the Pale Mantle</b> — '+(w.q===2?'cleanse the Coilblight at Havenwall ('+Math.min(12,w.qn)+'/12)':w.q===3?'bring the Mantle to Brakka':'complete ✓')+'</div>';
  X.modal('<h3>☠ '+cs.hold.replace(/^the /,'The ')+'</h3><div class="row"><span class="chip" style="background:#1a1a1f;color:#7dff8f">'+cs.bannerName+'</span><b>'+cs.govName+'</b></div><div>Clan Lord <b>Delroth</b> rules '+cs.name+'. His seat is empty tonight — he holds court at the Retired Bard.</div><div>Lieutenant: <b>Legion</b> (“'+LEGION_LINE+'”) · Warden: <b>'+cs.warden+'</b>, rarely seen, at the Ashen Gate.</div><div class="quote">“'+cs.motto+'”</div><div class="small">Allies: Havenwall (sworn against the Coilblight) and the Guild. '+repLine()+'</div>'+
    '<div class="sec">Raid the blight</div><div class="small">Clan raids cleanse Havenwall\'s corruption from the <b>edges in</b>. Ask Mori to ride with one.</div><div class="row"><button id="cRaid">⚔ Queue a Clan raid for Mori (Clan +4)</button></div>'+qh,
    c=>{ const r=c.querySelector('#cRaid'); if(r) r.onclick=()=>{ X.queueCleanse('clan'); X.closeModal(); }; const tk=c.querySelector('#cTake'); if(tk) tk.onclick=()=>{ w.q=2; w.qn=0; X.addItem({name:"the Pale Wolf's Mantle (unbound)",cat:'Quest',kind:'quest',value:0,quest:'mantle'}); rep('clan',5); X.log("☠ You receive the Pale Wolf's Mantle (unbound). Cleanse 12 tiles of the Coilblight at Havenwall."); X.save(); X.closeModal(); }; }); }
function scribeUI(){ const d=disc('clan'); X.modal('<h3>📜 Clan scribe</h3><div class="small">SRD necromancy, nothing else. You have '+Math.floor(X.S().gold)+' gold.'+(d<1?' Clan discount '+Math.round((1-d)*100)+'%.':'')+'</div>'+SCROLLS.map(s=>'<div class="q"><span>'+s[1]+' <span class="small">— '+s[4]+'</span></span><button data-scr="'+s[0]+'">'+Math.round(s[2]*d)+' gp</button></div>').join(''),
  c=>c.querySelectorAll('[data-scr]').forEach(b=>b.onclick=()=>{ const s=SCROLLS.find(q=>q[0]===b.dataset.scr), pr=Math.round(s[2]*d); if(X.S().gold<pr){ X.log('Need '+pr+' gold.'); return; } X.S().gold-=pr; X.addItem({name:s[1],cat:'Scroll',kind:'scroll',value:s[2],fx:Object.assign({},s[3])}); X.log('Bought '+s[1]+'. Read it from your bag.'); X.save(); scribeUI(); })); }
function brakkaUI(){ const w=st(), d=disc('haven'); const line=BRAKKA_LINES[Math.floor(Math.random()*BRAKKA_LINES.length)]; let q='';
  if(w.q===0) q='<div class="quote">"Clan Lord\'s got a cloak for the one who saves my walls. Pale wolf, old promise. Go to Gravenmoor, ask at the Hold of Many. Then come burn this blight off my doorstep."</div><button class="pri" id="bQ">Accept: The Promise of the Pale Mantle</button>';
  else if(w.q===1) q='<div class="small">Quest: get the Mantle from the Hold of Many in Gravenmoor.</div>';
  else if(w.q===2) q='<div class="small">Quest: cleanse the Coilblight — '+Math.min(12,w.qn)+'/12 tiles (press E on blighted ground).</div>';
  else if(w.q===3) q='<div class="quote">"That\'s twelve. Give it here." The Dragon\'s Forge flares.</div><button class="pri" id="bBind">Bind the Mantle</button>';
  else q='<div class="small">Quest complete: The Promise of the Pale Mantle ✓</div>';
  X.modal('<h3>🛡 '+HAVEN.smith+'</h3><div class="small">Goblin Armor Smith of the Dragon\'s Forge, Havenwall. '+line+'</div><div class="small">You have '+Math.floor(X.S().gold)+' gold.'+(d<1?' Havenwall discount '+Math.round((1-d)*100)+'%.':'')+' SRD prices.</div>'+
    SHOP.map(s=>'<div class="q"><span>'+s[1]+'</span><button data-arm="'+s[0]+'">'+Math.round(s[2]*d).toLocaleString()+' gp</button></div>').join('')+'<div class="row"><button id="bTalkB">💬 Talk to Brakka</button></div><div class="sec">Quest</div>'+q+'<div class="small">'+repLine()+' · Coilblight: '+pct()+'% of Havenwall\'s ground</div>',
    c=>{ c.querySelectorAll('[data-arm]').forEach(b=>b.onclick=()=>{ const s=SHOP.find(q=>q[0]===b.dataset.arm), pr=Math.round(s[2]*d); if(X.S().gold<pr){ X.log('Brakka: "'+pr+' gold. Rules of the shopkeeper."'); return; } X.S().gold-=pr;
        X.addItem(Object.assign({name:s[1]+' (Brakka)',cat:'Forged',bonus:0,value:s[2]},s[3])); X.log('Brakka: "Good steel. Don\'t die in it." — '+s[1]+' added to your bag.'); rep('haven',1); X.save(); brakkaUI(); });
      const tb=c.querySelector('#bTalkB'); if(tb) tb.onclick=()=>{ X.closeModal(); X.openNpc&&X.openNpc('brakka'); }; const a=c.querySelector('#bQ'); if(a) a.onclick=()=>{ w.q=1; X.log('Quest accepted: The Promise of the Pale Mantle. Go to the Hold of Many in Gravenmoor.'); X.save(); brakkaUI(); };
      const bb=c.querySelector('#bBind'); if(bb) bb.onclick=()=>{ const S=X.S(); const it=S.inv.find(i=>i.quest==='mantle'); if(it) S.inv.splice(S.inv.indexOf(it),1); X.addItem({name:"the Pale Wolf's Mantle",cat:'Wondrous',kind:'wondrous',value:2500,fx:{ac:1},note:'bound at the Dragon\'s Forge'}); w.q=4; rep('kin',10); rep('haven',10); TS&&TS.SFX.play('cleanse',0.7,0.9); X.showRoll('✦',"The Pale Wolf's Mantle is bound: +1 AC",'crit'); X.save(); brakkaUI(); }; }); }
function cityHTML(id){ if(!X) return ''; if(isClan(id)) return '<div class="sec">The Clan</div><div>Hold: <b>'+CLAN.hold+'</b> · Lieutenant: <b>Legion</b> · Warden: <b>'+CLAN.warden+'</b></div><div class="small">Banner: '+CLAN.bannerName+'. '+repLine()+'</div>';
  if(isSister(id)) return '<div class="sec">Besieged</div><div>'+HAVEN.blight.replace(/^t/,'T')+' covers <b>'+pct()+'%</b> of the ground around the walls. The Moonfang Kin cleanse from the center out; Clan raids from the edges in.</div><div class="small">Home of '+HAVEN.forge+' and '+HAVEN.smith+'. '+repLine()+'</div>'; return ''; }
function where(){ const p=pick(), PL=P(); return {clan:PL.regionInfo(p.clan).name, sister:PL.regionInfo(p.sister).name}; }
function moriLine(){ const p=pick(), PL=P(); const g=PL.regionCenter(X.guildId()); return 'gravenmoor is in '+PL.regionInfo(p.clan).name+' ('+Math.round(PL.angle(g,PL.regionCenter(p.clan))*PL.RADIUS_KM)+' km). havenwall is in '+PL.regionInfo(p.sister).name+' and the coilblight has '+pct()+'% of its ground. i can cleanse with the moonfang kin or ride with a clan raid. say "cleanse with the kin" or "clan raid".'; }
function extraWarm(){ if(!site) return []; if(site.kind==='clan') return [{x:site.legion.x,z:site.legion.z,keys:['sfx:smoke']}]; return [{x:site.forge.x,z:site.forge.z,keys:['sfx:cleanse']}]; }
window.CLAN={ init(o){ X=o; wrapPlanet(); grid(); if(TS){ TS.register('sfx:smoke',()=>({sfx:['smoke']})); TS.register('sfx:cleanse',()=>({sfx:['cleanse']})); } }, get ready(){ return !!X; },
  pick, isClan, isSister, ensure, siteHook, houseCell:(x,z)=>X&&isClan(X.SW.F.id)?6:4, update, targets, blocks, sim, spread, cleanseStep, corruptCount, pct, rep, tier, repLine, purge, tileAt, isC,
  cityHTML, where, moriLine, brakkaUI, scribeUI, extraWarm, stats, get site(){ return site; }, NAMES:{CLAN, HAVEN, LEGION_LINE}, RATE, get maskN(){ grid(); return maskN; }, tx, tz, st, reset(){ bits=null; bitsSeed=null; stats.caught=false; } };
})();
