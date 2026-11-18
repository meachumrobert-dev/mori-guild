/* HeroLock share codes. Text only. Locked faces do not travel.
   Run: node tests_gallery.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const G=require('./js/gallery.js');
const face={name:'Fern', race:'elf', jawWidth:0.2, hair:'#e8dcb0', skin:'#f0cfb0', hairStyle:'long', height:1.05, locked:true, kit:'delroth'};
const code=G.pack(face);
ok(code.indexOf('locked')<0&&code.indexOf('delroth')<0, 'a share code leaves out locks and kits');
const back=G.unpack(code);
ok(back.ok&&back.preset.race==='elf'&&back.preset.jawWidth===0.2&&back.preset.name==='Fern', 'a code comes back as the same face');
ok(!G.unpack('not json').ok&&!G.unpack('{"v":1}').ok, 'a bad code is refused');
ok(!G.unpack('{"v":1,"race":"elf","locked":true}').ok, 'a locked payload is refused');
let list=[];
for(let i=0;i<G.CAP+3;i++) list=G.add(list, {name:'F'+i, race:'human'});
ok(list.length===G.CAP&&list[0].name==='F3', 'the gallery stays at twenty-four faces');
const look=require('./js/look.js');
ok(look.pick(true, null)==='low'&&look.pick(false, null)==='medium'&&look.pick(true, 'high')==='high', 'phones start on Low, and a saved choice wins');
const shaded=look.shade(0.3, 0.5, 0.2, 0.8, 0.3);
ok(shaded[1]<0.5, 'a steep slope bakes shade into the vertex color');
console.log('tests_gallery: '+n+' checks passed');
