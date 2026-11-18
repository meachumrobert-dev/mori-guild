/* Small towns share jobs. Big towns do not. A missing hat means no service.
   Run: node tests_duties.js */
'use strict';
const assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const D=require('./js/duties.js');

const small=D.assign([{id:'bramble'},{id:'moss'}], ['farmer','miller','brewer','innkeeper','smith']);
ok(!small.specialized, 'a hamlet does not specialize');
const miller=small.posts.find(p=>p.jobs.indexOf('miller')>=0);
ok(miller&&miller.jobs.indexOf('farmer')>=0&&miller.rate===0.5, 'a farmer is also the miller, and splits the day');
const inn=small.posts.find(p=>p.jobs.indexOf('innkeeper')>=0);
ok(inn&&inn.jobs.indexOf('brewer')>=0&&inn.rate===0.5, 'the innkeeper is also the brewer');
ok(small.missing.indexOf('smith')>=0&&!D.service(small,'smith'), 'no smith means no repairs in that town');
ok(D.service(small,'farmer')&&D.output(small,'farmer',4)===2, 'a shared day yields half a full farmer');
ok(D.output(small,'miller',2)===1, 'the mill turns at the shared rate');

const bigPeople=[];
for(let i=0;i<D.BIG;i++) bigPeople.push({id:'p'+i});
const big=D.assign(bigPeople, ['farmer','miller','smith','baker']);
ok(big.specialized&&big.missing.length===0, 'a large town covers every job');
ok(big.posts.every(p=>p.jobs.length===1&&p.rate===1), 'each person in a large town keeps one job');
ok(D.service(big,'smith')&&D.output(big,'smith',3)>=3, 'specialists work a full day');

const empty=D.assign([], ['smith','baker']);
ok(empty.missing.length===2&&!D.service(empty,'baker'), 'an empty town has no services');

console.log('tests_duties: '+n+' checks passed');
