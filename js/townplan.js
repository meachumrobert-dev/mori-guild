/* Starter town. One square, the hall, the elder, stalls, workshops,
   fields outside the palisade, and streets the same width as the road. */
(function(root){
'use strict';
function width(){ return root.ROADS&&root.ROADS.HALF?root.ROADS.HALF*2:2.9; }
function guild(){
  const F=20, w=width();
  return {
    width:w,
    square:{x:0, z:-2, w:12, d:12, role:'square'},
    hall:{x:0, z:-12, role:'hall', name:'Guild hall'},
    elder:{x:-9, z:-4, w:4.2, d:3.4, role:'elder', name:"Elder's house"},
    stalls:[
      {x:8, z:-3, role:'market', name:'Market stall'},
      {x:-8, z:2, role:'market', name:'Herb stall'}
    ],
    workshops:[
      {x:9, z:9, role:'workshop', name:'Forge'},
      {x:-6, z:6, role:'workshop', name:'Alchemy'},
      {x:13, z:-11, role:'workshop', name:'Item bench'}
    ],
    farms:[
      {x:0, z:36, w:12, d:7, role:'farm', crop:'sun-grain'},
      {x:34, z:6, w:9, d:6, role:'farm', crop:'hearth-greens'},
      {x:-34, z:6, w:9, d:6, role:'farm', crop:'sun-grain'}
    ],
    streets:[
      [0, 22, 0, -2],
      [26, 0, 2, -2],
      [-26, 0, -2, -2],
      [0, -26, 0, -2]
    ],
    gates:[
      {x:0, z:F, dir:'north'},
      {x:F, z:0, dir:'east'},
      {x:-F, z:0, dir:'west'},
      {x:0, z:-F, dir:'south'}
    ],
    watches:[
      {x:16, z:16}, {x:-16, z:16}, {x:16, z:-16}, {x:-16, z:-16}
    ],
    choke:{x:0, z:F, dir:'north'},
    wall:{half:F, gates:4}
  };
}
function check(plan){
  plan=plan||guild();
  const w=width();
  const roadsOk=Math.abs(plan.width-w)<0.05&&plan.streets.length>=4;
  const farmsOut=plan.farms.every(f=>Math.hypot(f.x,f.z)>plan.wall.half+4);
  const gate=plan.gates.some(g=>g.x===plan.choke.x&&g.z===plan.choke.z);
  const ok=roadsOk&&farmsOut&&gate&&plan.hall&&plan.elder&&plan.square&&plan.stalls.length>=2&&plan.workshops.length>=2&&plan.watches.length>=4&&plan.gates.length===4;
  return {ok, roadsOk, farmsOut, width:plan.width, roadWidth:w};
}
root.TOWNPLAN={width, guild, check};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TOWNPLAN;
})(typeof window!=='undefined'?window:globalThis);
