/* PLANET — Mori's World Seed generator.
   One seed (number or string) -> the same planet every time. Nothing about the world is stored except
   which regions Mori has programmed; elevation, biomes, names and city-states are recomputed from the seed.
   Planet radius 3,185 km (about 1/4 of Earth's 6,371 km... by radius: 0.5; by surface area: 1/4).
   Regions: a cube-sphere grid, 6 faces x N x N cells. */
(function(){
'use strict';
const RADIUS_KM=3185, R=RADIUS_KM*1000, N=16, COUNT=6*N*N;

/* ---- seeded hashing / PRNG ---- */
function xmur3(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; }
  return function(){ h=Math.imul(h^(h>>>16),2246822507); h=Math.imul(h^(h>>>13),3266489909); return (h^=h>>>16)>>>0; }; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hashInt(seedStr, ...parts){ return xmur3(seedStr+'|'+parts.join('|'))(); }
function rngFor(seedStr, ...parts){ return mulberry32(hashInt(seedStr, ...parts)); }

/* ---- 3D simplex noise (Gustavson's public-domain algorithm), permutation from the seed ---- */
const G3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
function makeNoise(rand){ const p=new Uint8Array(256); for(let i=0;i<256;i++) p[i]=i; for(let i=255;i>0;i--){ const j=Math.floor(rand()*(i+1)); const t=p[i]; p[i]=p[j]; p[j]=t; }
  const perm=new Uint8Array(512), pm12=new Uint8Array(512); for(let i=0;i<512;i++){ perm[i]=p[i&255]; pm12[i]=perm[i]%12; }
  const F3=1/3, G=1/6;
  return function(x,y,z){ let n0,n1,n2,n3; const s=(x+y+z)*F3; const i=Math.floor(x+s), j=Math.floor(y+s), k=Math.floor(z+s); const t=(i+j+k)*G;
    const x0=x-(i-t), y0=y-(j-t), z0=z-(k-t); let i1,j1,k1,i2,j2,k2;
    if(x0>=y0){ if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0;} else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1;} else {i1=0;j1=0;k1=1;i2=1;j2=0;k2=1;} }
    else { if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1;} else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1;} else {i1=0;j1=1;k1=0;i2=1;j2=1;k2=0;} }
    const x1=x0-i1+G, y1=y0-j1+G, z1=z0-k1+G, x2=x0-i2+2*G, y2=y0-j2+2*G, z2=z0-k2+2*G, x3=x0-1+3*G, y3=y0-1+3*G, z3=z0-1+3*G;
    const ii=i&255, jj=j&255, kk=k&255;
    let t0=0.6-x0*x0-y0*y0-z0*z0; if(t0<0) n0=0; else { const g=G3[pm12[ii+perm[jj+perm[kk]]]]; t0*=t0; n0=t0*t0*(g[0]*x0+g[1]*y0+g[2]*z0); }
    let t1=0.6-x1*x1-y1*y1-z1*z1; if(t1<0) n1=0; else { const g=G3[pm12[ii+i1+perm[jj+j1+perm[kk+k1]]]]; t1*=t1; n1=t1*t1*(g[0]*x1+g[1]*y1+g[2]*z1); }
    let t2=0.6-x2*x2-y2*y2-z2*z2; if(t2<0) n2=0; else { const g=G3[pm12[ii+i2+perm[jj+j2+perm[kk+k2]]]]; t2*=t2; n2=t2*t2*(g[0]*x2+g[1]*y2+g[2]*z2); }
    let t3=0.6-x3*x3-y3*y3-z3*z3; if(t3<0) n3=0; else { const g=G3[pm12[ii+1+perm[jj+1+perm[kk+1]]]]; t3*=t3; n3=t3*t3*(g[0]*x3+g[1]*y3+g[2]*z3); }
    return 32*(n0+n1+n2+n3); }; }

/* ---- biomes ---- */
const BIOMES={
  deep:{name:'Deep Ocean',c:'#163a6b',rough:0}, ocean:{name:'Ocean',c:'#1f5590',rough:0}, beach:{name:'Coast',c:'#ddd29a',rough:1},
  grass:{name:'Grassland',c:'#62983d',rough:3,trees:2}, forest:{name:'Forest',c:'#3f6e2c',rough:7,trees:14}, jungle:{name:'Jungle',c:'#2c6a2a',rough:6,trees:18},
  savanna:{name:'Savanna',c:'#a9a24c',rough:3,trees:2}, desert:{name:'Desert',c:'#d8c27a',rough:4}, steppe:{name:'Steppe',c:'#9ba45c',rough:3,trees:1},
  taiga:{name:'Taiga',c:'#456a4c',rough:8,trees:12}, tundra:{name:'Tundra',c:'#8f9a86',rough:4}, swamp:{name:'Swamp',c:'#4d5e38',rough:1,trees:6},
  mountain:{name:'Mountains',c:'#7d7468',rough:30,trees:1}, snow:{name:'Snow & Ice',c:'#eef3f7',rough:10}
};

/* ---- the seeded planet ---- */
let SEED='mori', nC, nR, nT, nM, nD;
function setSeed(s){ SEED=String(s==null?'mori':s).trim()||'mori'; const r=rngFor(SEED,'noise');
  nC=makeNoise(r); nR=makeNoise(r); nT=makeNoise(r); nM=makeNoise(r); nD=makeNoise(r); cache.clear(); start=null; }
const cache=new Map();
function fbm(n,x,y,z,oct,lac,gain){ let a=1,f=1,s=0,w=0; for(let i=0;i<oct;i++){ s+=a*n(x*f,y*f,z*f); w+=a; a*=gain; f*=lac; } return s/w; }
function ridged(n,x,y,z,oct){ let a=1,f=1,s=0,w=0; for(let i=0;i<oct;i++){ const v=1-Math.abs(n(x*f,y*f,z*f)); s+=a*v*v; w+=a; a*=0.5; f*=2.1; } return s/w; }
function elevation(x,y,z){ // unit direction -> metres above sea level
  const c=fbm(nC,x*1.5+7.1,y*1.5,z*1.5,6,2.0,0.5)+0.08*nC(x*0.6,y*0.6+3,z*0.6)-0.02;
  let e=c*5200;
  if(c>0){ const rg=ridged(nR,x*3.2,y*3.2,z*3.2,5); const m=Math.min(1,c/0.22); e+=Math.pow(rg,2.2)*2600*m; }
  return e; }
function climate(x,y,z,e){ const lat=Math.asin(Math.max(-1,Math.min(1,y)));
  let t=Math.cos(lat)*1.5-0.62+0.25*fbm(nT,x*2,y*2,z*2,3,2,0.5)-Math.max(0,e)/4500;
  const m=0.5+0.6*fbm(nM,x*2.4+3,y*2.4,z*2.4,4,2,0.5);
  return {t, m:Math.max(0,Math.min(1,m)), lat}; }
function biomeOf(e,t,m){
  if(e<-900) return 'deep'; if(e<0) return 'ocean';
  if(t<-0.62) return 'snow'; if(e>3600) return 'snow'; if(e>2100) return 'mountain';
  if(e<35&&t>-0.3) return 'beach';
  if(t<-0.3) return 'tundra'; if(t<0.0) return m>0.45?'taiga':'steppe';
  if(t>0.55){ return m<0.28?'desert':m<0.5?'savanna':'jungle'; }
  if(m<0.3) return t>0.35?'desert':'steppe'; if(m<0.62) return m<0.4?'grass':'forest'; return e<250?'swamp':'forest'; }
function sample(x,y,z){ const e=elevation(x,y,z), c=climate(x,y,z,e); return {e, t:c.t, m:c.m, lat:c.lat, biome:biomeOf(e,c.t,c.m)}; }
function detail(x,y,z,rough){ // local metre-scale relief; x,y,z in metres on the sphere
  if(!rough) return 0; const k=1/140; return (fbm(nD,x*k,y*k,z*k,4,2.1,0.5)*rough)+(nD(x/37,y/37+11,z/37)*rough*0.15); }

/* ---- cube-sphere regions ---- */
function faceUV(x,y,z){ const ax=Math.abs(x), ay=Math.abs(y), az=Math.abs(z); let f,u,v;
  if(ax>=ay&&ax>=az){ f=x>0?0:1; u=(x>0?-z:z)/ax; v=y/ax; } else if(ay>=az){ f=y>0?2:3; u=x/ay; v=(y>0?-z:z)/ay; } else { f=z>0?4:5; u=(z>0?x:-x)/az; v=y/az; }
  // equal-angle warp keeps regions similar in size
  u=Math.atan(u)*4/Math.PI; v=Math.atan(v)*4/Math.PI; return [f,u,v]; }
function fromFace(f,u,v){ u=Math.tan(u*Math.PI/4); v=Math.tan(v*Math.PI/4); let x,y,z;
  if(f===0){ x=1; z=-u; y=v; } else if(f===1){ x=-1; z=u; y=v; } else if(f===2){ y=1; x=u; z=-v; } else if(f===3){ y=-1; x=u; z=v; } else if(f===4){ z=1; x=u; y=v; } else { z=-1; x=-u; y=v; }
  const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
function regionOf(x,y,z){ const [f,u,v]=faceUV(x,y,z); const i=Math.min(N-1,Math.floor((u+1)/2*N)), j=Math.min(N-1,Math.floor((v+1)/2*N)); return f*N*N+j*N+i; }
function regionCenter(id){ const f=Math.floor(id/(N*N)), r=id%(N*N), j=Math.floor(r/N), i=r%N; return fromFace(f,(i+0.5)/N*2-1,(j+0.5)/N*2-1); }
function regionCorners(id){ const f=Math.floor(id/(N*N)), r=id%(N*N), j=Math.floor(r/N), i=r%N; const a=i/N*2-1, b=(i+1)/N*2-1, c=j/N*2-1, d=(j+1)/N*2-1; return [fromFace(f,a,c),fromFace(f,b,c),fromFace(f,b,d),fromFace(f,a,d)]; }
const nbCache=new Map();
function neighbors(id){ if(nbCache.has(id)) return nbCache.get(id); const c=regionCenter(id); const out=new Set();
  // step off the centre along two tangent axes
  const up=Math.abs(c[1])<0.9?[0,1,0]:[1,0,0]; let e=cross(up,c); e=norm(e); const n=cross(c,e); const s=Math.PI/(2*N)*1.05;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{ const p=norm([c[0]+(e[0]*a+n[0]*b)*s,c[1]+(e[1]*a+n[1]*b)*s,c[2]+(e[2]*a+n[2]*b)*s]); const r=regionOf(p[0],p[1],p[2]); if(r!==id) out.add(r); });
  const arr=[...out]; nbCache.set(id,arr); return arr; }
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; };
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])));
function regionInfo(id){ const k='r'+id; if(cache.has(k)) return cache.get(k); const c=regionCenter(id); const s=sample(c[0],c[1],c[2]);
  // land fraction from 9 sub-samples
  let land=0; const cs=regionCorners(id); const pts=[c].concat(cs.map(q=>norm([q[0]*0.6+c[0]*0.4,q[1]*0.6+c[1]*0.4,q[2]*0.6+c[2]*0.4])));
  pts.forEach(p=>{ if(elevation(p[0],p[1],p[2])>0) land++; });
  const inf={id, c, e:s.e, biome:s.biome, t:s.t, m:s.m, lat:s.lat*180/Math.PI, lon:Math.atan2(c[0],c[2])*180/Math.PI, land:land/pts.length, isLand:s.e>0, name:regionName(id)};
  cache.set(k,inf); return inf; }

/* ---- names ---- */
const SY1=['Vel','Kar','Ash','Mor','Thal','Ser','Dun','Eld','Bran','Cor','Hal','Ist','Lyr','Ost','Quen','Rav','Sol','Tor','Ulm','Wyn','Yar','Zev','Gal','Fen','Bel','Nor','Cael','Dra'];
const SY2=['a','e','i','o','u','ae','ia','or','en','ar','ir','ul'];
const SY3=['mont','dale','reach','gard','holm','wick','stead','mere','ford','crest','haven','spire','march','fall','vale','moor','keep','port'];
function word(r){ return SY1[Math.floor(r()*SY1.length)]+(r()<0.5?SY2[Math.floor(r()*SY2.length)]:'')+SY3[Math.floor(r()*SY3.length)]; }
function regionName(id){ const r=rngFor(SEED,'rn',id); const pre=['the','the','the','High','Low','Old'][Math.floor(r()*6)]; const kind=['Marches','Reach','Wilds','Downs','Expanse','Shelf','Basin','Coast','Heights','Fields'][Math.floor(r()*10)];
  const w=word(r); return (pre==='the'?'The ':pre+' ')+w+' '+kind; }

/* ---- city-states (feudal governments) ---- */
const GOVS={ lord:{name:'Lordship', ruler:['Lord','Lady','Margrave','Count','Countess','Baron','Baroness']},
  council:{name:'Council', ruler:['Council of Nine','Council of Elders','Assembly of Burghers','Senate of Five']},
  theocracy:{name:'Theocracy', ruler:['High Prelate','Abbess-Regent','Hierophant','Oracle-Queen']},
  guild:{name:'Guild Charter', ruler:['Charter of the Masons','Charter of the Merchants','Charter of the Artificers','Charter of the Mariners']} };
const FAITHS=['the Dawn Choir','the Silver Flame of the Hearth','the Twin Moons','the Quiet Root','the Lantern Path'];
const BANNERS=['#c0392b','#1f6feb','#f1c40f','#2ecc71','#8e44ad','#e67e22','#ecf0f1','#111318','#16a085','#d35400','#b03a8a','#3b5bdb'];
const MOTTOS=['Stone remembers.','By charter and by blade.','Light before the gate.','We hold the ford.','Ink, iron, oath.','No tithe without a voice.','The roots run deep.','First to rise, last to fall.'];
function cityState(id, guildId){ const k='c'+id; if(cache.has(k)) return cache.get(k); const r=rngFor(SEED,'city',id); const inf=regionInfo(id);
  let cs;
  if(id===guildId){ cs={id, name:'Guildhold', gov:'guild', govName:'Guild Charter', ruler:'The Guild Charter (Seedkeeper Mori)', banner:['#a3ff12','#1a1a1f'], motto:'We were made to make the world.', power:6, guild:true}; }
  else { const gk=['lord','council','theocracy','guild'][Math.floor(r()*4)]; const G=GOVS[gk]; const nm=word(r);
    let ruler=G.ruler[Math.floor(r()*G.ruler.length)];
    if(gk==='lord') ruler+=' '+word(r).replace(/(mont|dale|reach|gard|holm|wick|stead|mere|ford|crest|haven|spire|march|fall|vale|moor|keep|port)$/,'')+' of '+nm;
    if(gk==='theocracy') ruler+=' of '+FAITHS[Math.floor(r()*FAITHS.length)];
    const b1=BANNERS[Math.floor(r()*BANNERS.length)]; let b2=BANNERS[Math.floor(r()*BANNERS.length)]; if(b2===b1) b2=b1==='#111318'?'#ecf0f1':'#111318';
    cs={id, name:nm, gov:gk, govName:G.name, ruler, banner:[b1,b2], motto:MOTTOS[Math.floor(r()*MOTTOS.length)], power:1+Math.floor(r()*10)}; }
  cs.biome=inf.biome; cache.set(k,cs); return cs; }
function relation(a,b){ const lo=Math.min(a,b), hi=Math.max(a,b); const h=hashInt(SEED,'rel',lo,hi)%100; const A=cityState(a), B=cityState(b);
  if(h<32) return {type:'ally'}; if(h<62) return {type:'rival'};
  if(h<82){ const lord=A.power>=B.power?a:b; return {type:'vassal', lord, vassal:lord===a?b:a}; } return {type:'neutral'}; }

/* ---- starting point: a temperate land region ---- */
let start=null;
function startRegion(){ if(start!=null) return start; let best=-1, bs=-1e9; const r=rngFor(SEED,'start');
  for(let id=0;id<COUNT;id++){ const inf=regionInfo(id); if(!inf.isLand||inf.land<0.99) continue; const okB=['grass','forest','steppe','savanna'].includes(inf.biome);
    const sc=(okB?2:0)-Math.abs(Math.abs(inf.lat)-30)/30+r()*0.3-(inf.e>1500?2:0); if(sc>bs){ bs=sc; best=id; } }
  if(best<0) best=0; start=best; return best; }

setSeed('mori');
window.PLANET={ R, RADIUS_KM, N, COUNT, BIOMES, GOVS, setSeed, get seed(){ return SEED; }, sample, elevation, detail, biomeOf, climate,
  regionOf, regionCenter, regionCorners, neighbors, regionInfo, regionName, cityState, relation, startRegion, angle, norm, cross, rngFor, hashInt,
  randomSeed(){ const w=['ember','vael','sora','kirito','aincrad','alfheim','moon','rose','gear','root','lantern','quartz']; return w[Math.floor(Math.random()*w.length)]+'-'+Math.floor(Math.random()*90000+10000); } };
})();
