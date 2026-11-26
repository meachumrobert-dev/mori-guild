/* Crew fight. They walk to a slot, they do not snap there.
   Juno holds the front, Kit keeps a bow's distance, Lyra mends and flicks a missile.
   A step is never longer than speed times the tick. */
(function(root){
'use strict';
const ROLES={
  support:{id:'support', speed:4.2, range:10, prefer:4.2, dmg:2, cd:1.4, heal:5, healAt:0.5, healCd:4.5, buffCd:8, spell:true, spellDmg:3, spellCd0:2.2},
  tank:{id:'tank', speed:4.4, range:1.7, prefer:1.25, dmg:5, cd:1.05, taunt:true},
  ranged:{id:'ranged', speed:4.8, range:9, prefer:6.4, dmg:3, cd:1.25, kite:true}
};
const AGGRO={aggressive:14, defensive:6, passive:0};
const STANCES=['aggressive','defensive','passive'];
const BLESS_RANGE=12;
const CATCH=20;
const STUCK=3;
function roleOf(mate){
  const n=String(mate.role||mate.name||'').toLowerCase();
  if(n==='tank'||n==='juno') return ROLES.tank;
  if(n==='ranged'||n==='kit') return ROLES.ranged;
  if(n==='support'||n==='lyra') return ROLES.support;
  return ROLES.support;
}
function blocked(x, z, list){
  for(let i=0;i<(list||[]).length;i++){
    const b=list[i];
    if(b.r!=null){ if(Math.hypot(x-b.x, z-b.z)<b.r+0.34) return true; }
    else if(Math.abs(x-b.x)<(b.hw||0.5)+0.34 && Math.abs(z-b.z)<(b.hd||0.5)+0.34) return true;
  }
  return false;
}
function walk(mate, tx, tz, dt, blockers, speed){
  const dx=tx-(mate.x||0), dz=tz-(mate.z||0);
  const dist=Math.hypot(dx, dz);
  if(dist<0.08) return {x:mate.x||0, z:mate.z||0, slid:false};
  const step=Math.min(speed*dt, dist);
  const ux=dx/dist, uz=dz/dist;
  let nx=(mate.x||0)+ux*step, nz=(mate.z||0)+uz*step, slid=false;
  if(blocked(nx, nz, blockers)){
    slid=true;
    const ax=(mate.x||0)+ux*step, az=mate.z||0;
    const bx=mate.x||0, bz=(mate.z||0)+uz*step;
    if(!blocked(ax, az, blockers)){ nx=ax; nz=az; }
    else if(!blocked(bx, bz, blockers)){ nx=bx; nz=bz; }
    else {
      nx=(mate.x||0)+(-uz)*step; nz=(mate.z||0)+ux*step;
      if(blocked(nx, nz, blockers)){ nx=mate.x||0; nz=mate.z||0; }
    }
  }
  return {x:nx, z:nz, slid};
}
function pace(base, behind){
  const d=behind||0;
  if(d>8) return Math.max(base, 5.8);
  if(d>4) return Math.max(base, 5.3);
  return base;
}
function route(canWalk, x, z, tx, tz){
  if(typeof canWalk!=='function') return null;
  const tile=2;
  const cell=(px,pz)=>[Math.floor(px/tile), Math.floor(pz/tile)];
  const key=(a,b)=>a+','+b;
  const [sx,sz]=cell(x,z), [gx,gz]=cell(tx,tz);
  if(sx===gx&&sz===gz) return {x:tx, z:tz};
  const q=[[sx,sz]], prev=new Map();
  prev.set(key(sx,sz), null);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  let found=null, guard=0;
  while(q.length&&guard++<500){
    const cur=q.shift();
    if(cur[0]===gx&&cur[1]===gz){ found=cur; break; }
    for(let i=0;i<dirs.length;i++){
      const nx=cur[0]+dirs[i][0], nz=cur[1]+dirs[i][1], k=key(nx,nz);
      if(prev.has(k)) continue;
      const wx=(nx+0.5)*tile, wz=(nz+0.5)*tile;
      if(!canWalk(wx, wz)) continue;
      prev.set(k, cur);
      q.push([nx,nz]);
    }
  }
  if(!found) return null;
  let step=found;
  while(prev.get(key(step[0],step[1]))){
    const p=prev.get(key(step[0],step[1]));
    if(p[0]===sx&&p[1]===sz) break;
    step=p;
  }
  return {x:(step[0]+0.5)*tile, z:(step[1]+0.5)*tile};
}
function shouldRegroup(dist, stuck){
  return dist>CATCH||(stuck||0)>STUCK;
}
function followSlot(player, i){
  const p=player||{x:0,z:0};
  const off=[[-1.5,1.7],[0.1,2.3],[1.5,1.7]][i%3];
  return {x:p.x+off[0], z:p.z+off[1]};
}
function inAggro(foe, mate, player, stance){
  const reach=AGGRO[stance]||0;
  if(reach<=0) return false;
  const nearYou=player?Math.hypot(foe.x-player.x, foe.z-player.z):1e9;
  const nearMe=Math.hypot(foe.x-(mate.x||0), foe.z-(mate.z||0));
  if(stance==='defensive') return nearYou<=reach;
  return nearYou<=reach||nearMe<=reach;
}
function pick(mate, foes, player, stance){
  let best=null, score=1e9;
  (foes||[]).forEach(f=>{
    if(!f||(f.hp!=null&&f.hp<=0)) return;
    if(!inAggro(f, mate, player, stance)) return;
    const d=Math.hypot(f.x-(mate.x||0), f.z-(mate.z||0));
    const s=d-((f.threat||0)*3);
    if(s<score){ score=s; best=f; }
  });
  return best;
}
function slotFor(role, foe, player, i){
  if(role.id==='tank'){
    const ang=Math.atan2((player?player.z:0)-foe.z, (player?player.x:0)-foe.x);
    return {x:foe.x+Math.cos(ang)*role.prefer, z:foe.z+Math.sin(ang)*role.prefer};
  }
  if(role.id==='ranged'){
    const ang=1.15+i*0.35;
    return {x:foe.x+Math.cos(ang)*role.prefer, z:foe.z+Math.sin(ang)*role.prefer};
  }
  const dx=foe.x-(player?player.x:0), dz=foe.z-(player?player.z:0);
  const d=Math.hypot(dx, dz)||1;
  return {x:foe.x-dx/d*role.prefer+(i-1)*1.3, z:foe.z-dz/d*role.prefer};
}
function lowest(allies, self){
  let best=null, ratio=0.5;
  (allies||[]).forEach(a=>{
    if(!a||a.id===self) return;
    const max=a.max||20;
    const r=(a.hp==null?max:a.hp)/max;
    if(r<ratio){ ratio=r; best=a; }
  });
  return best;
}
function isAlly(id, allies){
  return (allies||[]).some(a=>a&&a.id===id);
}
function tick(mates, ctx){
  ctx=ctx||{};
  const dt=Math.max(0, Math.min(0.2, ctx.dt==null?0.05:ctx.dt));
  const stance=STANCES.indexOf(ctx.stance)>=0?ctx.stance:'aggressive';
  const foes=(ctx.foes||[]).filter(f=>f&&(f.hp==null||f.hp>0));
  const events=[];
  (mates||[]).forEach((mate,i)=>{
    const role=roleOf(mate);
    const behind=ctx.player?Math.hypot((ctx.player.x||0)-(mate.x||0), (ctx.player.z||0)-(mate.z||0)):0;
    const speed=pace(role.speed, behind);
    mate.cd=Math.max(0,(mate.cd||0)-dt);
    mate.healCd=Math.max(0,(mate.healCd||0)-dt);
    mate.buffCd=Math.max(0,(mate.buffCd||0)-dt);
    mate.spellCd=Math.max(0,(mate.spellCd||0)-dt);
    const beforeX=mate.x||0, beforeZ=mate.z||0;
    const max=mate.max||20;
    const hp=mate.hp==null?max:mate.hp;
    let act='follow';
    let goal=followSlot(ctx.player, i);
    const hurt=hp/max<0.3;
    const foe=hurt||stance==='passive'?null:pick(mate, foes, ctx.player, stance);
    if(hurt){
      act='retreat';
      const p=ctx.player||{x:0,z:0};
      goal={x:p.x+(i-1)*1.5, z:p.z+3.4};
    } else if(foe){
      mate.target=foe.id;
      goal=slotFor(role, foe, ctx.player, i);
      const d=Math.hypot(foe.x-beforeX, foe.z-beforeZ);
      act=d>role.range?'engage':'attack';
    } else if(mate.target){
      act='return';
      mate.target=null;
    }
    if(role.heal){
      const low=lowest(ctx.allies, mate.name);
      if(low&&Math.hypot((low.x||0)-beforeX,(low.z||0)-beforeZ)>2.2&&Math.hypot((low.x||0)-beforeX,(low.z||0)-beforeZ)<=BLESS_RANGE) goal={x:(low.x||0)+0.9, z:(low.z||0)+0.9};
    }
    if(ctx.walk){ const wp=route(ctx.walk, beforeX, beforeZ, goal.x, goal.z); if(wp) goal=wp; }
    const step=walk(mate, goal.x, goal.z, dt, ctx.blockers, speed);
    if(step.slid&&act!=='retreat'&&act!=='follow') act='reposition';
    mate.x=step.x; mate.z=step.z;
    if(ctx.walk&&!ctx.walk(mate.x, mate.z)){
      const ax=beforeX+(step.x-beforeX), az=beforeZ;
      const bx=beforeX, bz=beforeZ+(step.z-beforeZ);
      if(ctx.walk(ax, az)){ mate.x=ax; mate.z=az; }
      else if(ctx.walk(bx, bz)){ mate.x=bx; mate.z=bz; }
      else { mate.x=beforeX; mate.z=beforeZ; }
    }
    const movedNow=Math.hypot(mate.x-beforeX, mate.z-beforeZ);
    mate.stuck=movedNow<0.02?(mate.stuck||0)+dt:0;
    if(ctx.player&&shouldRegroup(Math.hypot(mate.x-ctx.player.x, mate.z-ctx.player.z), mate.stuck)){
      const off=[[-1.2,1.4],[0.2,1.8],[1.2,1.4]][i%3];
      mate.x=ctx.player.x+off[0]; mate.z=ctx.player.z+off[1]; mate.stuck=0; mate.regrouped=true;
      events.push({type:'regroup', mate:mate.name, x:mate.x, z:mate.z});
    } else mate.regrouped=false;
    const moved=Math.hypot(mate.x-beforeX, mate.z-beforeZ);
    const cap=speed*dt+1e-4;
    if(!mate.regrouped&&moved>cap){
      const k=cap/moved;
      mate.x=beforeX+(mate.x-beforeX)*k;
      mate.z=beforeZ+(mate.z-beforeZ)*k;
    }
    if(!role.heal&&foe&&!isAlly(foe.id, ctx.allies)&&Math.hypot(foe.x-mate.x, foe.z-mate.z)<=role.range&&mate.cd<=0&&act!=='retreat'){
      const dmg=role.dmg+(mate.bless?1:0);
      foe.hp=(foe.hp==null?10:foe.hp)-dmg;
      foe.threat=(foe.threat||0)+(role.taunt?4:1);
      mate.cd=role.cd;
      events.push({type:'hit', mate:mate.name, foe:foe.id, dmg, kind:role.kite?'shot':role.spell?'missile':'melee', from:{x:mate.x,z:mate.z}, to:{x:foe.x,z:foe.z}});
    }
    if(role.heal){
      const low=lowest(ctx.allies, mate.name);
      if(low&&mate.healCd<=0){
        low.hp=Math.min(low.max||20, (low.hp==null?low.max||20:low.hp)+role.heal);
        mate.healCd=role.healCd;
        events.push({type:'heal', mate:mate.name, who:low.id, n:role.heal, at:{x:low.x||0,z:low.z||0}});
      }
      if(mate.buffCd<=0){
        mate.buffCd=role.buffCd;
        let any=false;
        (ctx.allies||[]).forEach(a=>{
          if(!a) return;
          if(Math.hypot((a.x||0)-mate.x,(a.z||0)-mate.z)>BLESS_RANGE) return;
          a.bless=1; any=true;
        });
        if(any) events.push({type:'bless', mate:mate.name});
      }
      const spellTarget=foe||foes.find(f=>inAggro(f, mate, ctx.player, stance)&&!isAlly(f.id, ctx.allies));
      if(spellTarget&&mate.spellCd<=0&&Math.hypot(spellTarget.x-mate.x, spellTarget.z-mate.z)<=role.range){
        spellTarget.hp=(spellTarget.hp==null?10:spellTarget.hp)-role.spellDmg;
        spellTarget.threat=(spellTarget.threat||0)+1;
        mate.spellCd=role.spellCd0;
        events.push({type:'hit', mate:mate.name, foe:spellTarget.id, dmg:role.spellDmg, kind:'missile', from:{x:mate.x,z:mate.z}, to:{x:spellTarget.x,z:spellTarget.z}});
      }
    }
    events.push({type:'move', mate:mate.name, act, x:mate.x, z:mate.z, target:mate.target||null});
  });
  return {events, foes};
}
function order(mate, ctx){
  ctx=ctx||{};
  const foes=ctx.foes||[];
  const hp=mate.hp==null?1:mate.hp;
  const max=mate.max||20;
  if(hp/max<0.3) return {act:'retreat', x:(ctx.player&&ctx.player.x)||0, z:((ctx.player&&ctx.player.z)||0)-4};
  if(!foes.length) return {act:'follow'};
  if(ctx.mode==='guard'){
    const p=ctx.player||{x:0,z:0};
    return {act:'guard', x:p.x+1.2, z:p.z-1.2};
  }
  let best=foes[0], bd=1e9;
  foes.forEach(f=>{ const d=Math.hypot(f.x-(mate.x||0), f.z-(mate.z||0)); if(d<bd){ bd=d; best=f; } });
  const side=(mate.slot||0)%2?1:-1;
  return {act:'flank', foe:best.id, x:best.x+side*1.4, z:best.z+side*0.4};
}
root.CREW={ROLES, STANCES, AGGRO, BLESS_RANGE, CATCH, STUCK, roleOf, walk, pace, route, shouldRegroup, tick, order, star:['roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.CREW;
})(typeof window!=='undefined'?window:globalThis);
