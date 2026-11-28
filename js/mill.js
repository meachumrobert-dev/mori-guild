/* One shaft, many loads. Wind, water, a treadwheel, or a horse.
   A calm day starves the wind shaft. Walking the treadwheel builds endurance. */
(function(root){
'use strict';
const LOADS=['bellows','pump','stones'];
function shaft(source, opt){
  opt=opt||{};
  let power=0, endurance=opt.endurance||0;
  if(source==='wind') power=opt.calm?0.25:1;
  else if(source==='water') power=1;
  else if(source==='tread'){ const steps=opt.steps||0; power=Math.min(1, steps/40); endurance+=steps*0.05; }
  else if(source==='horse'||source==='capstan') power=0.8;
  const loads=(opt.loads&&opt.loads.length?opt.loads:LOADS).slice();
  const share=loads.length?power/loads.length:0;
  const out={};
  loads.forEach(id=>{ out[id]=Math.round(share*100)/100; });
  return {source, power:Math.round(power*100)/100, loads:out, endurance:Math.round(endurance*100)/100};
}
function walk(state, steps){
  state=state||{endurance:0};
  const add=Math.max(0, steps||0);
  state.steps=Math.min(80, (state.steps||0)+add);
  state.endurance=Math.round(((state.endurance||0)+add*0.05)*100)/100;
  state.power=Math.round(Math.min(1, state.steps/40)*100)/100;
  const loads=LOADS.slice();
  const share=loads.length?state.power/loads.length:0;
  state.loads={};
  loads.forEach(id=>{ state.loads[id]=Math.round(share*100)/100; });
  return state;
}
root.MILL={LOADS, shaft, walk, star:['mundane']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.MILL;
})(typeof window!=='undefined'?window:globalThis);
