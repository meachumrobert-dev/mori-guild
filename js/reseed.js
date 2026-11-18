/* A new world must come up lit, with ground, even if one layer fails.
   A seed stage that throws is logged and skipped. A job that runs long is dropped. */
(function(root){
'use strict';
const STAGES=['terrain','roads','villages','city'];
const DAY=240;
function sky(clock, dt){
  if(!Number.isFinite(clock)) clock=40;
  const step=Number.isFinite(dt)?dt:0;
  clock=(clock+step)%DAY;
  if(!Number.isFinite(clock)||clock<0) clock=40;
  const el=Math.sin((clock/DAY)*Math.PI*2);
  let day=Math.max(0, Math.min(1, el*2.5+0.3));
  if(!Number.isFinite(day)) day=1;
  return {clock, day, light:0.25+0.85*day, sun:2.2*day+0.05};
}
function stages(hooks){
  hooks=hooks||{};
  const errors=[];
  let chunks=0, ground=false, lights=false;
  STAGES.forEach(name=>{
    try{
      const r=(hooks[name]&&hooks[name]())||{};
      if(r.chunks) chunks+=r.chunks;
      if(r.ground) ground=true;
      if(r.lights) lights=true;
    }catch(e){
      errors.push(name);
    }
  });
  let fallback=false;
  if(!(chunks>0)||!ground||!lights){
    fallback=true;
    chunks=Math.max(1, chunks);
    ground=true;
    lights=true;
  }
  return {chunks, ground, lights, errors, fallback};
}
function jobTimeout(job, extra){
  if(!job) return false;
  const dur=Number.isFinite(job.dur)?job.dur:5;
  const t=Number.isFinite(job.t)?job.t:0;
  return t>dur+(extra==null?8:extra);
}
root.RESEED={STAGES, DAY, sky, stages, jobTimeout, star:['mundane']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.RESEED;
})(typeof window!=='undefined'?window:globalThis);
