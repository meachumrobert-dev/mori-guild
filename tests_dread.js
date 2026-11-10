/* Dread Lord staging: the shock stays small, the camera steps back, canon colors return.
   Run: node tests_dread.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const src=fs.readFileSync(__dirname+'/js/dreadlord.js','utf8');
ok(src.includes("U.hat.visible=true"), 'the hat is put back when the form ends');
ok(src.includes("irisMat.color.set('#39ff6a')"), 'eyes return to canon green');
ok(!src.includes('0.6+f.t*3.5'), 'the old oversized shock growth is gone');
const context={console, Math, THREE:{}, HERO:{}};
context.window=context;
vm.createContext(context);
vm.runInContext(src, context);
const D=context.DREADLORD;
ok(D.shockScale(0)===1, 'the ring starts at the body');
ok(D.shockScale(10)===D.SHOCK.maxScale && D.SHOCK.maxScale<=3.2, 'the ring stops at a controlled size');
ok(D.cameraFor(0).dist===9, 'before the form the camera distance is unchanged');
ok(D.cameraFor(1.2).dist>=15 && D.cameraFor(1.2).pitch>0.4, 'the camera pulls back and up during the form');
ok(D.camera()===null, 'no camera override while the form is off');
console.log('tests_dread: '+n+' checks passed');
