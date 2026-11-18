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
  else if(source==='horse') power=0.8;
  const loads=(opt.loads&&opt.loads.length?opt.loads:LOADS).slice();
  const share=loads.length?power/loads.length:0;
  const out={};
  loads.forEach(id=>{ out[id]=Math.round(share*100)/100; });
  return {source, power:Math.round(power*100)/100, loads:out, endurance:Math.round(endurance*100)/100};
}
root.MILL={LOADS, shaft, star:['mundane']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.MILL;
})(typeof window!=='undefined'?window:globalThis);
