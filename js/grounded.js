/* grounded.js — seeded spatial rules for frames, settlements, wild patches, and civic knowledge.
   Pure rules first (no meshes). attachFrame() is the only three.js entry, and only when a caller asks.
   Sources and the line between "in the game" and "later" are in GROUNDING.md.
   These are original rules. No textbook text, no Bannerlord data, no real places, no real people. */
(function(root){
'use strict';
const DEG=Math.PI/180;

/* ---------- roof triangle (right-triangle trig) ---------- */
function pitchTriangle(run, theta){
  const rise=run*Math.tan(theta);          // tan = opposite / adjacent
  const rafter=run/Math.cos(theta);        // cos = adjacent / hypotenuse
  const hypot=Math.hypot(run, rise);       // distance from eave to ridge
  return {run, theta, rise, rafter, hypot, seam:Math.abs(rafter-hypot)};
}
const PITCH_DEG={snow:42, taiga:40, tundra:38, mountain:36, desert:24, beach:26, swamp:30};
function pitchFor(biome, u){
  const base=PITCH_DEG[biome]||34;
  const deg=Math.max(18, Math.min(48, base+((u==null?0.5:u)-0.5)*4));
  return {deg, rad:deg*DEG};
}
function roofEnds(part){
  // Box long axis is local Z. Positive rotation.x drops the +Z end.
  const out=[];
  [-1,1].forEach(end=>{
    const hz=part.sz/2*end, rx=part.rx||0;
    const y=part.y+(-hz*Math.sin(rx));
    const z=part.z+(hz*Math.cos(rx));
    out.push({end, x:part.x, y, z});
  });
  return out;
}

/* ---------- cottage frame as boxes. Load path is a heuristic, not a certificate. ---------- */
const SPAN={post:4.8, kingDepth:4.2, kingWidth:5.2};
function cottageFrame(o){
  const w=o.w, d=o.d, wallH=o.wallH, theta=o.pitch;
  const overhang=o.overhang==null?0.42:o.overhang;
  const doorW=Math.min(o.doorW||1.0, w*0.34);
  const run=d/2+overhang;
  const tri=pitchTriangle(run, theta);
  const plateY=wallH, ridgeY=plateY+tri.rise;
  const parts=[];
  const push=(kind,x,y,z,sx,sy,sz,rx,ry,rz)=>parts.push({kind,x,y,z,sx,sy,sz,rx:rx||0,ry:ry||0,rz:rz||0});
  push('stone',0,0.12,0,w+0.36,0.24,d+0.28);
  const ix=w/2-0.14, iz=d/2-0.14;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
    push('stone',sx*ix,0.06,sz*iz,0.46,0.14,0.46);
    push('timber',sx*ix,wallH/2,sz*iz,0.16,wallH,0.16);
    push('joint',sx*ix,plateY,sz*iz,0.28,0.18,0.28);
  });
  push('timber',0,plateY,-iz,w-0.2,0.14,0.16);
  push('timber',0,plateY,iz,w-0.2,0.14,0.16);
  push('timber',-ix,plateY,0,0.16,0.14,d-0.2);
  push('timber',ix,plateY,0,0.16,0.14,d-0.2);
  const sideW=(w-doorW)/2-0.08;
  if(sideW>0.25){
    push('wall',-(doorW/2+sideW/2),wallH/2,d/2-0.04,sideW,wallH-0.2,0.14);
    push('wall',(doorW/2+sideW/2),wallH/2,d/2-0.04,sideW,wallH-0.2,0.14);
  }
  push('lintel',0,Math.min(plateY-0.12,2.05),d/2-0.02,doorW+0.28,0.16,0.18);
  push('door',0,0.95,d/2+0.04,doorW*0.86,1.85,0.08);
  push('window',w*0.28,wallH*0.62,d/2+0.05,0.55,0.48,0.06);
  push('wall',0,wallH/2,-d/2+0.04,w-0.36,wallH-0.16,0.14);
  push('wall',-w/2+0.04,wallH/2,0,0.14,wallH-0.16,d-0.5);
  push('wall',w/2-0.04,wallH/2,0,0.14,wallH-0.16,d-0.5);
  // Door jambs carry the opening. A mid-wall post is added only when the clear span is long.
  [-1,1].forEach(s=>push('timber',s*(doorW/2+0.08),1.0,d/2-0.08,0.12,2.0,0.12));
  const mid=w>SPAN.post;
  if(mid){
    push('timber',0,wallH/2,-iz,0.14,wallH,0.14);
    push('joint',0,plateY,-iz,0.24,0.16,0.24);
  }
  if(d>SPAN.post){
    [-1,1].forEach(s=>{ push('timber',s*ix,wallH/2,0,0.14,wallH,0.14); push('joint',s*ix,plateY,0,0.22,0.16,0.22); });
  }
  const king=d>SPAN.kingDepth||w>SPAN.kingWidth;
  if(king){
    push('tie',0,plateY+0.02,0,0.14,0.14,d-0.55);
    push('king',0,(plateY+ridgeY)/2,0,0.14,Math.max(0.2,ridgeY-plateY),0.14);
    push('joint',0,ridgeY,0,0.24,0.16,0.24);
  }
  push('ridge',0,ridgeY,0,w+overhang,0.12,0.14);
  const nR=w>5.6?3:2;
  for(let i=0;i<nR;i++){
    const x=nR===2?(i?w/2-0.2:-w/2+0.2):(i-1)*(w/2-0.25);
    [-1,1].forEach(s=>{
      push('rafter',x,plateY+tri.rise/2-0.06,s*(run/2),0.1,0.1,tri.rafter,s*theta,0,0);
    });
  }
  [-1,1].forEach(s=>{
    push('roof',0,plateY+tri.rise/2,s*(run/2),w+overhang*2,0.12,tri.rafter,s*theta,0,0);
  });
  return {parts, tri, plateY, ridgeY, pitch:theta, king, mid, span:w, run,
    door:{x:0,z:d/2}, footprint:{w,d}, gable:{halfD:d/2, y0:plateY, y1:ridgeY, x:w/2}};
}

/* ---------- settlement: terrain, water probe, haul, non-overlapping plots ---------- */
function gradeAt(x,z,heightAt){
  const e=4, hx=heightAt(x+e,z)-heightAt(x-e,z), hz=heightAt(x,z+e)-heightAt(x,z-e);
  const slope=Math.hypot(hx,hz)/(2*e);
  return {slope, phi:Math.atan(slope), h:heightAt(x,z)};
}
function wetAt(x,z,ctx){ const h=ctx.heightAt(x,z); return ctx.seaY!=null&&h<ctx.seaY+0.7; }
function doorOf(p){ return {x:p.x+Math.sin(p.yaw)*(p.d/2), z:p.z+Math.cos(p.yaw)*(p.d/2)}; }
function halfProj(o,ax,ay){
  const c=Math.cos(o.yaw), s=Math.sin(o.yaw);
  return Math.abs(c*ax-s*ay)*(o.w/2)+Math.abs(s*ax+c*ay)*(o.d/2);
}
function obbHit(a,b,gap){
  const dx=b.x-a.x, dz=b.z-a.z;
  const axes=[[Math.cos(a.yaw),-Math.sin(a.yaw)],[Math.sin(a.yaw),Math.cos(a.yaw)],[Math.cos(b.yaw),-Math.sin(b.yaw)],[Math.sin(b.yaw),Math.cos(b.yaw)]];
  for(let i=0;i<axes.length;i++){ const ax=axes[i][0], ay=axes[i][1];
    if(Math.abs(dx*ax+dz*ay)>halfProj(a,ax,ay)+halfProj(b,ax,ay)+(gap||0)) return false; }
  return true;
}
function walkable(a,b,ctx,slopeMax){
  for(let i=0;i<=4;i++){ const t=i/4, x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t;
    if(wetAt(x,z,ctx)) return false;
    if(gradeAt(x,z,ctx.heightAt).slope>(slopeMax==null?0.22:slopeMax)) return false; }
  return true;
}
/* Standing water or the civic well. Eight rays, not a watershed. */
function waterMetres(x,z,ctx){
  let best=1e9;
  if(ctx.well) best=Math.hypot(x-ctx.well.x,z-ctx.well.z);
  if(ctx.seaY==null) return best;
  for(let k=0;k<8;k++){ const a=k/8*Math.PI*2;
    for(let d=6;d<=48;d+=6){ const px=x+Math.cos(a)*d, pz=z+Math.sin(a)*d;
      if(ctx.heightAt(px,pz)<ctx.seaY+0.35){ if(d<best) best=d; break; } } }
  return best;
}
const SOIL={grass:0.85,forest:0.72,jungle:0.75,savanna:0.55,steppe:0.5,swamp:0.38,taiga:0.42,desert:0.22,beach:0.3,mountain:0.16,tundra:0.2,snow:0.08,guild:0.8};
function farmSuit(biome, waterM, reach){
  const soil=SOIL[biome]==null?0.4:SOIL[biome];
  const waterScore=Math.max(0, 1-waterM/Math.max(8,reach));
  const score=soil*0.55+waterScore*0.45;
  return {soil, waterM, waterScore, score, ok:score>=0.42&&waterScore>=0.12&&soil>=0.18&&waterM<=reach};
}
function cropFor(biome, waterScore){
  if(biome==='swamp') return {id:'reed-cane', reagent:'canna_root'};
  if(biome==='desert'||biome==='beach') return {id:'seep-melon', reagent:'squash_blossom'};
  if(biome==='jungle') return {id:'hearth-greens', reagent:'vinca_leaf'};
  if(waterScore>0.65&&(biome==='forest'||biome==='grass')) return {id:'hearth-greens', reagent:'marigold'};
  return {id:'sun-grain', reagent:'sunflower_seed'};
}
function blocked(x,z,blocks,r){ return (blocks||[]).some(b=>Math.hypot(x-b.x,z-b.z)<b.r+(r||0)); }
function planSettlement(ctx){
  const rng=ctx.rng, A=ctx.anchor, city=!!ctx.city;
  const reach=ctx.irrigationReach||26;
  const samples=[];
  for(let j=-2;j<=2;j++) for(let i=-2;i<=2;i++){
    const x=A.x+i*8, z=A.z+j*8; const g=gradeAt(x,z,ctx.heightAt);
    samples.push(g.phi); }
  samples.sort((a,b)=>a-b);
  const mid=samples[Math.floor(samples.length/2)];
  const road=ctx.nearestRoad?ctx.nearestRoad(A.x,A.z):null;
  const roadD=ctx.roadDist?ctx.roadDist(A.x,A.z):1e9;
  let form='nucleated';
  if(mid>7*DEG||ctx.biome==='mountain'||ctx.biome==='snow'||ctx.biome==='tundra') form='dispersed';
  else if(road&&roadD<26) form='linear';
  let civic={x:A.x,z:A.z};
  if(!city&&(wetAt(A.x,A.z,ctx)||gradeAt(A.x,A.z,ctx.heightAt).slope>0.16)){
    let best=null;
    for(let k=0;k<12;k++){ const a=k/12*Math.PI*2, rad=k<6?14:26, x=A.x+Math.cos(a)*rad, z=A.z+Math.sin(a)*rad;
      if(wetAt(x,z,ctx)) continue; const g=gradeAt(x,z,ctx.heightAt); const sc=g.slope+(wetAt(x,z,ctx)?5:0);
      if(!best||sc<best.sc) best={x,z,sc}; }
    if(best) civic=best;
  }
  const well={x:civic.x,z:civic.z};
  const local=Object.assign({},ctx,{well});
  const want=form==='dispersed'?4:(city?8:6);
  const plots=[];
  const paths=[];
  function tryPlot(p, houseSlope){
    if(wetAt(p.x,p.z,ctx)) return false;
    if(gradeAt(p.x,p.z,ctx.heightAt).slope>houseSlope) return false;
    if(ctx.roadDist&&ctx.roadDist(p.x,p.z)<Math.max(p.w,p.d)*0.32+2) return false;
    if(blocked(p.x,p.z,ctx.blocks,Math.max(p.w,p.d)*0.4)) return false;
    const cd=Math.hypot(p.x-civic.x,p.z-civic.z);
    if(cd<(city?16:7)) return false;
    if(city&&cd>56) return false;
    for(let i=0;i<plots.length;i++) if(obbHit(p,plots[i],2.2)) return false;
    const door=doorOf(p);
    let goal=civic;
    if(form==='linear'&&road) goal={x:road.px,z:road.pz};
    if(!walkable(door,goal,ctx,0.24)) return false;
    p.door=door; p.goal=goal; plots.push(p);
    paths.push([door.x,door.z,goal.x,goal.z]);
    return true;
  }
  const baseAng=rng()*Math.PI*2;
  for(let pass=0;pass<2;pass++){
    const slopeMax=pass?0.24:0.16;
    const n=pass?Math.max(0,want-plots.length):want;
    for(let i=0;i<n;i++){
      const u=rng();
      const w=3.6+rng()*1.8, d=3.2+rng()*1.3, wallH=2.35+rng()*0.45;
      let x,z,yaw;
      if(form==='linear'&&road){
        const along=(i-(n-1)/2)*(w+3.4);
        const side=rng()<0.5?1:-1;
        x=civic.x+road.tx*along+(-road.tz)*side*10;
        z=civic.z+road.tz*along+road.tx*side*10;
        yaw=Math.atan2(-side*(-road.tz), -side*road.tx);
      } else {
        const rad=form==='dispersed'?(18+rng()*16):(city?(i%2?36:26):(i%2?18:12));
        const a=baseAng+i*(Math.PI*2/Math.max(3,n))+(pass?0.4:0);
        x=civic.x+Math.cos(a)*rad; z=civic.z+Math.sin(a)*rad;
        yaw=Math.atan2(civic.x-x, civic.z-z);
      }
      tryPlot({x,z,yaw,w,d,wallH,role:'house',u}, slopeMax);
      if(plots.length>=want) break;
    }
    if(plots.length>=3) break;
  }
  if(!plots.length){
    const p={x:civic.x+10,z:civic.z,yaw:Math.atan2(-10,0),w:4,d:3.4,wallH:2.5,role:'house',u:0.5,forced:true};
    if(!wetAt(p.x,p.z,ctx)&&!blocked(p.x,p.z,ctx.blocks,2)){ p.door=doorOf(p); p.goal=civic; plots.push(p); paths.push([p.door.x,p.door.z,civic.x,civic.z]); }
  }
  if(plots.length){
    let wi=0, bd=1e9;
    plots.forEach((p,i)=>{ const d=ctx.roadDist?ctx.roadDist(p.x,p.z):Math.hypot(p.x-civic.x,p.z-civic.z); if(d<bd){ bd=d; wi=i; } });
    plots[wi].role='work'; plots[wi].w=Math.min(plots[wi].w,3.6); plots[wi].d=Math.min(plots[wi].d,3.0);
  }
  if(road&&Math.hypot(civic.x-A.x,civic.z-A.z)>6){
    if(walkable(civic,{x:A.x,z:A.z},ctx,0.24)) paths.push([civic.x,civic.z,A.x,A.z]);
  }
  const farms=[];
  const farmRings=city?[20,28,36]:[16,24];
  for(let i=0;i<10&&farms.length<2;i++){
    const a=rng()*Math.PI*2, rad=farmRings[i%farmRings.length]+rng()*4;
    const x=civic.x+Math.cos(a)*rad, z=civic.z+Math.sin(a)*rad;
    if(wetAt(x,z,ctx)) continue;
    if(gradeAt(x,z,ctx.heightAt).slope>0.2) continue;
    if(ctx.roadDist&&ctx.roadDist(x,z)<5) continue;
    if(blocked(x,z,ctx.blocks,3)) continue;
    const fp={x,z,yaw:a+Math.PI,w:7.5,d:5.2};
    if(plots.some(p=>obbHit(fp,p,1.6))) continue;
    if(farms.some(f=>obbHit(fp,f,1.6))) continue;
    const wm=waterMetres(x,z,local);
    const suit=farmSuit(ctx.biome||'grass', wm, reach);
    if(!suit.ok) continue;
    const door={x,z};
    if(!walkable(door,civic,ctx,0.24)) continue;
    const haul=Math.hypot(x-civic.x,z-civic.z);
    if(haul>46) continue;
    const crop=cropFor(ctx.biome||'grass', suit.waterScore);
    fp.yaw=Math.atan2(civic.x-x, civic.z-z);
    farms.push(Object.assign(fp,{role:'farm',crop:crop.id,reagent:crop.reagent,waterM:+wm.toFixed(1),soil:suit.soil,score:+suit.score.toFixed(2),haul:+haul.toFixed(1)}));
    paths.push([x,z,civic.x,civic.z]);
  }
  return {form, civic, well, plots, paths, farms, reach, irrigation:'probe+well'};
}

/* ---------- flowers: coarse metadata nodes, clusters around them ---------- */
const FL_CELL=168;
const FLOWER_SUIT={grass:1,forest:0.72,jungle:0.7,savanna:0.55,steppe:0.5,swamp:0.4,taiga:0.28,beach:0.14,desert:0.07,tundra:0.05,mountain:0.08,snow:0,ocean:0,deep:0,guild:1};
const FLOWER_SP={
  grass:['zinnia','marigold','vinca','sunflower','squash'], forest:['vinca','gloomrose','zinnia','marigold'],
  jungle:['canna','vinca','zinnia'], savanna:['sunflower','marigold','squash'], steppe:['marigold','sunflower','squash'],
  swamp:['gloomrose','canna','vinca'], taiga:['vinca','gloomrose'], desert:['squash','sunflower'],
  beach:['marigold','vinca'], mountain:['gloomrose','vinca'], guild:['marigold','vinca','zinnia','lavender']
};
const SPECIES_REAGENT={zinnia:'zinnia',marigold:'marigold',vinca:'vinca_leaf',sunflower:'sunflower_seed',canna:'canna_root',gloomrose:'gloomrose_thorn',squash:'squash_blossom'};
const flCache=new Map();
function clearFlowerCache(){ flCache.clear(); }
function flowerNode(ci,cj,ctx){
  const id=ctx.seed+'|'+ctx.regionId+'|'+ci+','+cj;
  if(flCache.has(id)) return flCache.get(id);
  const rnd=ctx.rng(ctx.seed,'flnode',ctx.regionId,ci,cj);
  const cx=(ci+0.5)*FL_CELL, cz=(cj+0.5)*FL_CELL;
  const biome=ctx.biomeAt?ctx.biomeAt(cx,cz):'grass';
  const suit=FLOWER_SUIT[biome]||0;
  let node=null;
  if(suit>0&&rnd()<=suit*0.58){
    const list=FLOWER_SP[biome]||FLOWER_SP.grass;
    node={meta:true, kind:'flower-node', id, x:cx+(rnd()-0.5)*FL_CELL*0.55, z:cz+(rnd()-0.5)*FL_CELL*0.55,
      radius:14+rnd()*12, biome, suit, species:list[Math.floor(rnd()*list.length)], alt:list[Math.floor(rnd()*list.length)]};
  }
  flCache.set(id,node); if(flCache.size>800) flCache.clear();
  return node;
}
function guildMeadowNode(){ return {meta:true, kind:'flower-node', id:'guild-meadow', x:0, z:39, radius:18, biome:'guild', suit:1, species:'marigold', alt:'vinca'}; }
function flowerWeight(x,z,ctx){
  if(ctx.guild&&Math.hypot(x,z-39)<22){ const n=guildMeadowNode(), d=Math.hypot(x-n.x,z-n.z), sigma=9;
    return {node:n, d, w:n.suit*Math.exp(-(d*d)/(2*sigma*sigma))}; }
  const ci=Math.floor(x/FL_CELL), cj=Math.floor(z/FL_CELL);
  let best=null;
  for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){
    const n=flowerNode(ci+i,cj+j,ctx); if(!n) continue;
    const d=Math.hypot(x-n.x,z-n.z); if(d>n.radius) continue;
    const sigma=n.radius*0.45, w=n.suit*Math.exp(-(d*d)/(2*sigma*sigma));
    if(!best||w>best.w) best={node:n,d,w};
  }
  return best;
}
function clusterPoints(node, n, rnd, ok){
  const out=[], sigma=node.radius*0.42, cap=Math.min(36,n);
  for(let q=0;q<cap*5&&out.length<cap;q++){
    const u1=Math.max(1e-6,rnd()), u2=rnd();
    const r=Math.sqrt(-2*Math.log(u1))*sigma;
    if(r>node.radius) continue;
    const edge=Math.exp(-(r*r)/(2*sigma*sigma));
    if(rnd()>0.25+0.75*edge) continue;
    const a=u2*Math.PI*2, x=node.x+Math.cos(a)*r, z=node.z+Math.sin(a)*r;
    if(ok&&!ok(x,z)) continue;
    out.push({x,z,r,species:rnd()<0.75?node.species:node.alt, suit:node.suit*edge});
  }
  return out;
}

/* ---------- ore: region geology, then a patchy vein ---------- */
const OR_CELL=220;
const GEO={
  mountain:{ores:['iron_ore','copper_ore','tin_ore','silver_ore','zinc_ore','manganese_ore','nickel_ore'], rare:true, p:0.82},
  snow:{ores:['iron_ore','silver_ore'], p:0.3},
  desert:{ores:['copper_ore','tin_ore','zinc_ore'], p:0.5},
  taiga:{ores:['iron_ore','copper_ore','silver_ore','manganese_ore'], p:0.42},
  tundra:{ores:['iron_ore'], p:0.26},
  swamp:{ores:['bog_iron_ore','iron_ore','clay'], p:0.48},
  forest:{ores:['bog_iron_ore','iron_ore','copper_ore','tin_ore'], p:0.2},
  grass:{ores:['bog_iron_ore','copper_ore','tin_ore','clay'], p:0.16},
  jungle:{ores:['copper_ore','zinc_ore'], p:0.18},
  savanna:{ores:['copper_ore','zinc_ore'], p:0.22},
  steppe:{ores:['iron_ore','copper_ore'], p:0.16},
  beach:{ores:['clay','copper_ore'], p:0.05},
  ocean:{ores:[], p:0}, deep:{ores:[], p:0}, guild:{ores:['bog_iron_ore','copper_ore','tin_ore','clay'], p:0.12}
};
const oreCache=new Map();
function clearOreCache(){ oreCache.clear(); }
function oreNode(ci,cj,ctx){
  const id='od|'+ctx.regionId+'|'+ci+','+cj;
  const key=ctx.seed+'|'+id;
  if(oreCache.has(key)) return oreCache.get(key);
  const rnd=ctx.rng(ctx.seed,'oredep',ctx.regionId,ci,cj);
  const cx=(ci+0.5)*OR_CELL, cz=(cj+0.5)*OR_CELL;
  const biome=ctx.biomeAt?ctx.biomeAt(cx,cz):'grass';
  const elev=ctx.elevAt?ctx.elevAt(cx,cz):0;
  const g=GEO[biome]||GEO.grass;
  let node=null;
  const gate=g.p*(biome==='mountain'&&elev>1800?1.1:1);
  if(g.ores.length&&rnd()<=gate){
    let primary=g.ores[Math.floor(rnd()*g.ores.length)];
    if(g.rare&&elev>2400&&rnd()<0.22) primary=(elev>3200&&rnd()<0.35)?'adamantine_ore':'mithral_ore';
    const secondary=g.ores[Math.floor(rnd()*g.ores.length)];
    node={meta:true, kind:'ore-deposit', id, x:cx+(rnd()-0.5)*OR_CELL*0.35, z:cz+(rnd()-0.5)*OR_CELL*0.35,
      strike:rnd()*Math.PI, length:42+rnd()*48, halfW:6+rnd()*6, primary, secondary, biome, elev};
  }
  oreCache.set(key,node); if(oreCache.size>800) oreCache.clear();
  return node;
}
function hash01(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return ((h>>>0)%100000)/100000; }
function inVein(node,x,z){
  const dx=x-node.x, dz=z-node.z, c=Math.cos(node.strike), s=Math.sin(node.strike);
  const along=dx*c+dz*s, cross=-dx*s+dz*c;
  if(Math.abs(along)>node.length*0.5) return null;
  const shoot=Math.floor(along/7);
  const h=hash01(node.id+'|'+shoot);
  const width=node.halfW*(0.35+0.65*h);
  if(Math.abs(cross)>width||h<0.18) return null;
  return {along, cross, h, rid:h>0.86?node.secondary:node.primary};
}
function oreAt(x,z,ctx){
  const ci=Math.floor(x/OR_CELL), cj=Math.floor(z/OR_CELL);
  let best=null;
  for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){
    const n=oreNode(ci+i,cj+j,ctx); if(!n) continue;
    const hit=inVein(n,x,z); if(!hit) continue;
    const score=1-Math.abs(hit.cross)/Math.max(0.1,n.halfW);
    if(!best||score>best.score) best={node:n, score, rid:hit.rid, along:hit.along, cross:hit.cross};
  }
  return best;
}

/* ---------- material tech graph ---------- */
const TECH_LIST=[
  {id:'clay_dig', name:'Clay digging', needs:[], inputs:['clay soil'], shifts:2, days:1},
  {id:'pottery', name:'Bonfire pottery', needs:['clay_dig'], inputs:['clay','fuel'], shifts:3, days:1, trade:true, station:'clay'},
  {id:'masonry', name:'Fieldstone courses', needs:[], inputs:['fieldstone'], shifts:6, days:3},
  {id:'kiln', name:'Kiln', needs:['pottery','masonry'], inputs:['clay','fieldstone','fuel'], shifts:10, days:6},
  {id:'roof_tile', name:'Roof tiles', needs:['kiln'], inputs:['clay','fuel'], shifts:8, days:4},
  {id:'clay_pipe', name:'Clay pipe', needs:['kiln'], inputs:['clay','fuel'], shifts:8, days:5},
  {id:'timber_join', name:'Pegged joints', needs:[], inputs:['timber'], shifts:4, days:2},
  {id:'saw', name:'Frame saw', needs:['timber_join'], inputs:['timber','iron'], shifts:8, days:6},
  {id:'mill', name:'Mill', needs:['masonry','timber_join'], inputs:['fieldstone','timber'], shifts:20, days:12},
  {id:'charcoal', name:'Charcoal mound', needs:[], inputs:['wood'], shifts:4, days:6},
  {id:'prospecting', name:'Prospecting', needs:[], inputs:[], shifts:3, days:2, trade:true},
  {id:'copper_fire', name:'Copper hearth', needs:['charcoal'], inputs:['copper ore','charcoal'], shifts:5, days:2, trade:true, station:'copper'},
  {id:'tin_sort', name:'Tin sorting', needs:['prospecting'], inputs:['tin ore'], shifts:4, days:2},
  {id:'bronze', name:'Bronze', needs:['copper_fire','tin_sort'], inputs:['copper','tin'], shifts:6, days:3, station:'bronze'},
  {id:'hide_scrape', name:'Hide scraping', needs:[], inputs:['hide'], shifts:2, days:1},
  {id:'rawhide', name:'Rawhide', needs:['hide_scrape'], inputs:['hide'], shifts:2, days:2},
  {id:'tan_bark', name:'Bark-tan leather', needs:['rawhide'], inputs:['hide','tannin bark','water'], shifts:8, days:20, culture:'greenweald'},
  {id:'cuir', name:'Hardened leather', needs:['tan_bark'], inputs:['tanned leather'], shifts:4, days:2},
  {id:'leather_armor', name:'Leather armor', needs:['tan_bark'], inputs:['tanned leather','cord'], shifts:8, days:6},
  {id:'scale_leather', name:'Scale leather', needs:['leather_armor'], inputs:['leather','scales','cord'], shifts:12, days:10},
  {id:'bellows', name:'Bellows', needs:['tan_bark','timber_join'], inputs:['leather','timber'], shifts:6, days:4},
  {id:'bloomery', name:'Bloomery', needs:['bellows','masonry','charcoal'], inputs:['stone','charcoal','bellows'], shifts:16, days:10},
  {id:'iron_bloom', name:'Iron bloom', needs:['bloomery'], inputs:['iron ore','charcoal'], shifts:8, days:2, station:'cast_iron'},
  {id:'steel_fold', name:'Folded steel', needs:['iron_bloom'], inputs:['iron bloom','charcoal'], shifts:14, days:6, station:'steel'},
  {id:'brass', name:'Brass', needs:['copper_fire'], inputs:['copper','zinc ore'], shifts:6, days:3, station:'brass'},
  {id:'mail', name:'Mail', needs:['iron_bloom'], inputs:['iron wire'], shifts:30, days:20},
  {id:'plate', name:'Plate', needs:['steel_fold','tan_bark'], inputs:['steel plate','leather straps'], shifts:40, days:30},
  {id:'furrow', name:'Irrigation furrow', needs:['clay_dig'], inputs:['a dry plot inside the water probe'], shifts:6, days:3, trade:true},
  {id:'seed_keeping', name:'Seed keeping', needs:['furrow'], inputs:['dry seed'], shifts:2, days:1, trade:true},
  {id:'charter_mark', name:'Charter mark', needs:[], inputs:[], shifts:1, days:1},
  {id:'beacon_watch', name:'Beacon watch', needs:['charcoal'], inputs:['charcoal'], shifts:3, days:1}
];
const TECH={}; TECH_LIST.forEach(t=>{ TECH[t.id]=t; });
function techById(id){ return TECH[id]||null; }
function expandArts(ids){
  const have=new Set(), pending=new Set(ids||[]);
  let guard=0, progress=true;
  while(pending.size&&progress&&guard++<48){
    progress=false;
    [...pending].forEach(id=>{ const t=TECH[id]; if(!t){ pending.delete(id); return; }
      if(t.needs.every(n=>have.has(n))){ have.add(id); pending.delete(id); progress=true; } });
  }
  return have;
}
function closure(id){
  const have=expandArts(collectChain(id));
  return [...have];
}
function collectChain(id, seen){
  seen=seen||new Set(); if(seen.has(id)||!TECH[id]) return [];
  seen.add(id); let out=[id]; TECH[id].needs.forEach(n=>{ out=out.concat(collectChain(n, seen)); }); return out;
}
function implies(fromId, toId){ return closure(fromId).indexOf(toId)>=0; }
function frontier(ids){
  const set=new Set(ids), used=new Set();
  ids.forEach(id=>{ const t=TECH[id]; if(!t) return; t.needs.forEach(n=>{ if(set.has(n)) used.add(n); }); });
  return ids.filter(id=>!used.has(id));
}
const STATION_ART={clay:'pottery', copper:'copper_fire', bronze:'bronze', cast_iron:'iron_bloom', steel:'steel_fold', brass:'brass'};
function citySupportsStation(arts, tierId){
  const need=STATION_ART[tierId]; if(!need) return {mapped:false, have:false, art:null};
  const have=expandArts(arts);
  return {mapped:true, art:need, have:have.has(need), name:TECH[need].name};
}

/* Cultures are original labels for map readability. One dominant face per region. */
const CULTURES=[
  {id:'hearthfolk', race:'human', seeds:['clay_dig','pottery','furrow','seed_keeping','charcoal','hide_scrape','timber_join']},
  {id:'stonekind', race:'dwarf', seeds:['masonry','charcoal','copper_fire','prospecting','clay_dig','timber_join']},
  {id:'greenweald', race:'elf', seeds:['hide_scrape','rawhide','tan_bark','timber_join','charcoal','clay_dig','furrow']},
  {id:'sparkhand', race:'gnome', seeds:['clay_dig','pottery','prospecting','charcoal','copper_fire','timber_join']},
  {id:'hillfolk', race:'halfling', seeds:['clay_dig','furrow','seed_keeping','hide_scrape','rawhide','tan_bark','timber_join']},
  {id:'marchers', race:'half-orc', seeds:['hide_scrape','charcoal','prospecting','timber_join','clay_dig']}
];
function cultureById(id){ return CULTURES.filter(c=>c.id===id)[0]||CULTURES[0]; }
function cultureFor(regionId, biome, rnd){
  let i=Math.floor(rnd()*CULTURES.length);
  if(biome==='mountain'||biome==='taiga') i=1;
  else if(biome==='forest'||biome==='jungle') i=rnd()<0.6?2:0;
  else if(biome==='desert'||biome==='steppe') i=rnd()<0.5?5:0;
  const dominant=CULTURES[i%CULTURES.length];
  const minorities=[];
  const n=rnd()<0.45?0:rnd()<0.85?1:2;
  for(let k=0;k<n;k++){ const m=CULTURES[Math.floor(rnd()*CULTURES.length)]; if(m.id!==dominant.id&&minorities.indexOf(m.id)<0) minorities.push(m.id); }
  const beast=rnd()<0.12?'brush-kin':null;
  return {dominant, minorities, beast};
}
function artsFor(culture, gov, biome){
  const seeds=(culture.seeds||[]).slice();
  if(gov==='council'||gov==='guild') seeds.push('charter_mark');
  if(gov==='lord'||gov==='clan') seeds.push('beacon_watch');
  if(gov==='theocracy'||gov==='sanctum') seeds.push('seed_keeping','furrow','clay_dig');
  if(biome==='mountain') seeds.push('masonry');
  if(biome==='swamp') seeds.push('furrow','clay_dig');
  return [...expandArts(seeds)];
}
function civicProfile(o){
  const rnd=o.rng||Math.random;
  let culture, minorities=[], beast=null, race;
  if(o.guild){ culture=cultureById('hearthfolk'); race='mixed guild folk'; }
  else if(o.clan){ culture={id:'compact', race:'undead catfolk', seeds:['hide_scrape','charcoal','prospecting','timber_join','beacon_watch']}; race='undead catfolk'; beast=null; }
  else if(o.sister){ culture=cultureById('hearthfolk'); race='human'; minorities=['sanctum']; beast='moonfang kin'; }
  else { const c=cultureFor(o.id||0, o.biome, rnd); culture=c.dominant; minorities=c.minorities; beast=c.beast; race=culture.race; }
  const arts=artsFor(culture, o.gov||'lord', o.biome||'grass');
  const reach=arts.indexOf('furrow')>=0?42:26;
  return {culture:culture.id, race, minorities, beast, arts, irrigationReach:reach, thatch:arts.indexOf('roof_tile')<0,
    crest:{kind:'grand', subordinateCrests:CREST.grand.subordinateCrests, bandSize:CREST.personal.bandSize},
    dev:o.power||1, station:Object.keys(STATION_ART).map(id=>citySupportsStation(arts,id))};
}
function hamletProfile(o){
  const rnd=o.rng||Math.random;
  const c=cultureFor(o.id||0, o.biome, rnd);
  const arts=artsFor(c.dominant, 'hamlet', o.biome||'grass');
  return {culture:c.dominant.id, race:c.dominant.race, minorities:c.minorities, beast:c.beast, arts,
    irrigationReach:arts.indexOf('furrow')>=0?36:26, thatch:true, crest:{kind:'personal', subordinateCrests:0, bandSize:CREST.personal.bandSize}, dev:1};
}
function teachArt(known, artId, ctx){
  ctx=ctx||{}; const art=TECH[artId];
  if(ctx.via==='level') return {ok:false, reason:'level', detail:'A character level does not grant an art, a crest, or a throne.'};
  if(!art) return {ok:false, reason:'unknown'};
  const have=expandArts(known||[]);
  if(have.has(artId)) return {ok:false, reason:'known', arts:[...have]};
  if(art.culture&&ctx.teacherCulture!==art.culture) return {ok:false, reason:'culture', detail:art.name+' travels with a '+art.culture+' teacher, not as a loose bonus.'};
  const missing=art.needs.filter(n=>!have.has(n));
  if(missing.length) return {ok:false, reason:'prereq', missing};
  if(ctx.via==='trade'&&!art.trade) return {ok:false, reason:'not-trade'};
  have.add(artId);
  return {ok:true, reason:'taught', art:artId, dev:1, arts:[...have]};
}
function displayArts(profile, saved){
  const extra=saved&&saved.taught||[];
  const arts=[...expandArts((profile.arts||[]).concat(extra))];
  return {arts, frontier:frontier(arts), dev:(profile.dev||1)+((saved&&saved.dev)||0), taught:extra.filter(id=>arts.indexOf(id)>=0)};
}
const HINT_ART={copper_ore:'copper_fire', iron_ore:'iron_bloom', zinc_ore:'brass', hide:'tan_bark', herbs:'seed_keeping', vinca_leaf:'seed_keeping', marigold:'seed_keeping', pell_seeds:'seed_keeping', grizzik_ore:'prospecting'};
function artForHint(hint){ return HINT_ART[hint]||null; }

/* ---------- grand crest: command span, not an army ---------- */
const CREST={
  personal:{bandSize:6, subordinateCrests:0},
  grand:{subordinateCrests:4, bandSize:0},
  hostIfFull:24
};
function commandCapacity(kind){
  if(kind==='ally'||kind==='teacher') return {directFighters:kind==='teacher'?0:6, subordinateCrests:0, stacksOnLiege:false};
  if(kind==='personal') return {directFighters:CREST.personal.bandSize, subordinateCrests:0, stacksOnLiege:true};
  return {directFighters:0, subordinateCrests:CREST.grand.subordinateCrests, stacksOnLiege:false, hostIfFull:CREST.hostIfFull};
}
function canAttach(liege, crest){
  if(crest.kind==='ally') return {ok:true, usesSlot:false, reason:'An ally keeps their own crest.'};
  if(crest.kind==='teacher') return {ok:true, usesSlot:false, reason:'A teacher opens an art. They do not add fighters.'};
  const used=(liege.subordinates||[]).length;
  if(used>=CREST.grand.subordinateCrests) return {ok:false, usesSlot:false, reason:'This grand crest already has 4 captains.'};
  return {ok:true, usesSlot:true, reason:'Captain '+((used+1))+' of 4.'};
}

function gatherKey(seed, regionId, ci, cj, k){ return seed+'|'+regionId+'|'+ci+','+cj+'|'+k; }

/* ---------- meshes (only when three.js is passed in) ---------- */
function mergeBoxes(T, parts, fit, mat){
  let n=0; const geos=parts.map(p=>{
    const g=new T.BoxGeometry(p.sx,p.sy,p.sz);
    if(fit&&mat) fit(g, mat);
    g.applyMatrix4(new T.Matrix4().compose(new T.Vector3(p.x,p.y,p.z), new T.Quaternion().setFromEuler(new T.Euler(p.rx||0,p.ry||0,p.rz||0)), new T.Vector3(1,1,1)));
    const ng=g.index?g.toNonIndexed():g; n+=ng.attributes.position.count; return ng;
  });
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2);
  let o=0;
  geos.forEach(g=>{ const c=g.attributes.position.count; pos.set(g.attributes.position.array,o*3);
    if(g.attributes.normal) nor.set(g.attributes.normal.array,o*3);
    if(g.attributes.uv) uv.set(g.attributes.uv.array,o*2); o+=c; g.dispose(); });
  const out=new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos,3));
  out.setAttribute('normal', new T.BufferAttribute(nor,3));
  out.setAttribute('uv', new T.BufferAttribute(uv,2));
  out.computeBoundingSphere();
  return out;
}
const MAT_OF={stone:'stone', timber:'timber', joint:'timber', lintel:'timber', tie:'timber', king:'timber', ridge:'timber', rafter:'timber', wall:'wall', roof:'roof', door:'door', window:'window'};
function attachFrame(T, parent, spec, mats, hooks){
  hooks=hooks||{};
  const groups={};
  spec.parts.forEach(p=>{ const k=MAT_OF[p.kind]||p.kind; (groups[k]||(groups[k]=[])).push(p); });
  Object.keys(groups).forEach(k=>{
    const mat=mats[k]||mats.timber; if(!mat) return;
    const geo=mergeBoxes(T, groups[k], hooks.fit, mat);
    if(hooks.fit) hooks.fit(geo, mat);
    const mesh=new T.Mesh(geo, mat);
    mesh.castShadow=!!hooks.shadow; mesh.receiveShadow=!!hooks.shadow;
    mesh.name='frame_'+k; parent.add(mesh);
  });
  if(T.Shape&&T.ExtrudeGeometry&&mats.wall){
    [-1,1].forEach(s=>{
      try{
        const sh=new T.Shape(); const g=spec.gable;
        sh.moveTo(-g.halfD, g.y0); sh.lineTo(g.halfD, g.y0); sh.lineTo(0, g.y1); sh.closePath();
        const geo=new T.ExtrudeGeometry(sh,{depth:0.16,bevelEnabled:false});
        geo.translate(0,0,-0.08); geo.rotateY(-Math.PI/2); geo.translate(s*g.x,0,0);
        if(hooks.fit) hooks.fit(geo, mats.wall);
        const mesh=new T.Mesh(geo, mats.wall); mesh.castShadow=!!hooks.shadow; mesh.receiveShadow=!!hooks.shadow; parent.add(mesh);
      }catch(e){}
    });
  }
  parent.userData.frame=true; parent.userData.pitch=spec.pitch; parent.userData.ridge=spec.ridgeY; parent.userData.h=spec.ridgeY+0.15;
  parent.userData.king=spec.king;
  return parent;
}

const api={
  pitchTriangle, pitchFor, roofEnds, cottageFrame, SPAN, gradeAt, obbHit, doorOf, walkable, waterMetres, farmSuit, cropFor, SOIL, planSettlement,
  FL_CELL, FLOWER_SUIT, flowerNode, flowerWeight, clusterPoints, clearFlowerCache, guildMeadowNode, SPECIES_REAGENT,
  OR_CELL, GEO, oreNode, oreAt, inVein, clearOreCache,
  TECH_LIST, TECH, techById, expandArts, closure, implies, frontier, STATION_ART, citySupportsStation,
  CULTURES, cultureFor, cultureById, civicProfile, hamletProfile, teachArt, displayArts, artForHint,
  CREST, commandCapacity, canAttach, gatherKey, attachFrame
};
root.GROUNDED=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
