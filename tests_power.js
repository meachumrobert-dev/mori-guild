/* Power budget: render, audio compile, and world-building never share a frame.
   Run: node tests_power.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const store={};
const context={console, Math, localStorage:{getItem:k=>store[k]||null, setItem:(k,v)=>{ store[k]=v; }}};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/js/power.js','utf8'), context);
const P=context.POWER;
ok(P.boot('')==='auto', 'default mode is auto');
for(let i=0;i<12;i++){
  const p=P.framePlan(i);
  const hot=[p.world,p.audio,p.build].filter(Boolean).length;
  ok(hot===1, 'frame '+i+' runs exactly one heavy clock');
  if(!p.audio) ok(p.bgMs===0, 'audio compile is closed on non-audio frames');
  if(p.audio) ok(p.bgMs>0 && !p.world && !p.build, 'audio compile does not share a frame with chunks or building');
}
P.setMode('gaming');
const g=P.framePlan(1);
ok(g.qualityMax===1 && g.shadow===false && g.flower<1 && g.chunk===1, 'gaming caps quality, shadows, flowers, and chunks');
ok(g.catchGap>=0.8, 'gaming slows background steps');
P.setMode('low');
ok(P.framePlan(2).qualityMax===0 && P.pace().gap>=1, 'low power is stricter than gaming');
P.setMode('nope');
ok(P.getMode()==='auto', 'unknown mode falls back to auto');
P.boot('?power=gaming');
ok(P.getMode()==='gaming', 'the URL can pin gaming mode');
console.log('tests_power: '+n+' checks passed');
