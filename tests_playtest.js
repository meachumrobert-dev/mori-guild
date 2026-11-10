/* Regressions for the 2026-11-07 playtest.
   Node covers the away-timer (it must not finish the planet).
   The browser half clicks Talk, a spell chip, the loot toast, and the campfire.
   Run: node tests_playtest.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }

/* ---------- away timer ---------- */
const document={hidden:false, getElementById:()=>({classList:{remove(){}}})};
const context={console, Math, Date, document, navigator:undefined, performance:{now:()=>0}};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/idlebuild.js'),'utf8'), context);
const I=context.IDLEBUILD;
const advances=[]; const modals=[];
const state={seed:'mori', blue:false, idleBuild:{on:true, speed:'normal', stats:{ticks:0, terrain:0, roads:0, villages:0, cities:0, pois:0}}};
const X={
  S:()=>state, modal:(h)=>modals.push(h), addChat:()=>{}, log:()=>{},
  programmedCount:()=>5, PL:{COUNT:1536, regionInfo:()=>({name:'Test Reach', isLand:true, c:[0,0,1]}), neighbors:()=>[2], angle:()=>0.2, regionCenter:()=>[0,0,1]},
  stageOf:id=>id===1?1:0, seedable:()=>true, advanceRegion:(id)=>{ advances.push(id); state.worlds={mori:{reg:{}}}; state.worlds.mori.reg[id]=1; return true; },
  curRegion:()=>1, player:{pos:{x:0,z:8}}, PERF:{q:2}, curJob:()=>null, jobs:()=>[],
  STAGES:['void','terrain','roads','villages','city'], WD:()=>({reg:{1:1}})
};
I.init(X);
ok(I.absenceMs(undefined, 1e12)===0, 'a missing stamp is not an absence');
ok(I.absenceMs(0, Date.now())===0, 'a zero stamp is not the unix epoch');
ok(I.absenceMs(null, Date.now())===0, 'null is not the cap');
const cap=I.absenceMs(Date.now()-10*24*3600*1000, Date.now());
ok(cap===I.AWAY_CAP_MS, 'a real long gap still caps at 24 h');
ok(advances.length===0 && modals.length===0, 'init with no lastSeen programs nothing and shows no card');
ok(state.idleBuild.lastSeen>0, 'the missing stamp is filled with now');

delete state.idleBuild.lastSeen;
const again=I.beginCatchUp();
ok(again.owed===0 && again.missing && advances.length===0, 'a second load without lastSeen still owes nothing');

state.idleBuild.lastSeen=Date.now()-48*3600*1000;
const away=I.beginCatchUp();
ok(away.owed===4800, '48 h away is the 24 h cap of ticks, not more');
ok(modals.length===1 && advances.length===0, 'the away card is up at login, before any region is programmed');
for(let i=0;i<40;i++) I.update(0.5);
ok(advances.length>0 && advances.length<=40, 'catch-up steps one region at a time');
ok(advances.length<100, 'forty seconds does not finish the planet');
ok(modals.length===1, 'the card does not pop again while she is still working');

/* a finished planet must not burn the 24 h cap */
let progN=5;
X.programmedCount=()=>progN;
progN=1536;
state.idleBuild.lastSeen=Date.now()-48*3600*1000;
const stamped=advances.length;
const doneWorld=I.beginCatchUp();
ok(doneWorld.owed===0 && doneWorld.finished===true && doneWorld.skipped===4800, 'a finished planet skips the 4800 tick cap');
ok(/already finished/.test(modals[modals.length-1]) && /did not spend the 4800/.test(modals[modals.length-1]), 'the card says the world was already finished');
ok(!/queued 4800/.test(modals[modals.length-1]), 'the card does not promise build steps on a finished world');
for(let i=0;i<20;i++) I.update(0.5);
ok(advances.length===stamped && I.catchLeft===0, 'no regions are stamped after a finished-world catch-up');

/* named herbs */
function GCtor(){}
const gctx={console, Math, performance:{now:()=>0}, THREE:{Object3D:GCtor, Color:GCtor}, TWOSPEED:{}, window:{}};
gctx.window=gctx;
vm.createContext(gctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/gather.js'),'utf8'), gctx);
const G=gctx.GATHERING;
const cham=G.reagentMention('where can I find chamomile?');
const willow=G.reagentMention('where is willow bark?');
ok(cham&&cham.id==='chamomile', 'chamomile is recognized by name');
ok(willow&&willow.id==='willow_bark', 'willow bark is recognized by name');
ok(G.biomesFor('chamomile').indexOf('grass')>=0, 'chamomile is tied to grass');
ok(G.biomesFor('willow_bark').indexOf('forest')>=0, 'willow bark is tied to forest');
const chamLine=G.whereNamed('where can I find chamomile?');
const wilLine=G.whereNamed('where can I find willow bark');
ok(/chamomile/.test(chamLine) && /grass|guild meadow|savanna|steppe/.test(chamLine), 'chamomile gets a place: '+chamLine);
ok(/willow bark/.test(wilLine) && /forest|swamp|taiga/.test(wilLine), 'willow bark gets a place: '+wilLine);

/* Oswin matches the quest state */
const nctx={console, Math, THREE:{}, window:{}};
nctx.window=nctx;
vm.createContext(nctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/npcs.js'),'utf8'), nctx);
const O=nctx.NPCS.byId('oswin');
const fence={id:'oswin_fence', title:'A Word for the Fence', offer:'The south fence leans. Persuade me.', desc:'Talk Oswin into the fence.'};
const readyQ=[{id:'oswin_room', title:'Sweep the Undercroft', thanks:'Quiet below at last. Well done.'}];
function ost(extra){ return Object.assign({mem:{met:2, talks:4}, player:'Tinker', phase:'work', hour:12, d20:12, ready:[], active:[], offer:fence, openTalk:[], talkQuests:[], world:{doneWith:[]}}, extra||{}); }
const opened=nctx.NPCS.npcReply(O, '', ost({ready:readyQ}));
ok(!opened.actions.some(a=>a.type==='turnIn'), 'opening Oswin does not pay the quest by itself');
ok(/ready/.test(opened.text) && /Sweep the Undercroft/.test(opened.text), 'opening Oswin says the sweep is ready to turn in');
const claimed=nctx.NPCS.npcReply(O, 'I cleared a room in the Undercroft', ost({ready:readyQ, mem:opened.mem}));
ok(claimed.actions.some(a=>a.type==='turnIn'&&a.id==='oswin_room'), 'I cleared a room turns the ready quest in');
ok(!/not in my ledger/i.test(claimed.text), 'a real room clear is in the ledger');
const paid=nctx.NPCS.npcReply(O, 'turn in the quest', ost({world:{doneWith:['Sweep the Undercroft']}}));
ok(!paid.actions.some(a=>a.type==='turnIn'||a.type==='accept'), 'turn in after it is paid does not start the fence quest');
ok(/already in the ledger/i.test(paid.text) && !/south fence/i.test(paid.text), 'turn in after payment says it is already paid');
const work=nctx.NPCS.npcReply(O, 'any work?', ost({world:{doneWith:['Sweep the Undercroft']}}));
ok(/fence/i.test(work.text), 'asking for work can still offer the fence');

console.log('tests_playtest logic: '+n+' checks passed');

/* ---------- browser half ---------- */
async function browser(){
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }catch(e){ console.log('browser half skipped (puppeteer-core not installed)'); return; }
  const exe=process.env.CHROME||'/usr/bin/google-chrome';
  const browser=await puppeteer.launch({executablePath:exe, headless:'new', args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage();
  page.setDefaultTimeout(20000);
  await page.setViewport({width:1280, height:720});
  const errs=[]; page.on('pageerror', e=>errs.push(String(e)));
  await page.goto('file://'+path.join(__dirname,'index.html')+'?quality=low', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g&&window.__g.player);
  await page.evaluate(()=>{ const g=window.__g; g.teleport(0,-6.2); g.step(0.2); });
  await page.click('#bTalk');
  const title=await page.$eval('#talkTitle', e=>e.textContent);
  ok(/Mori/i.test(title) && !/Oswin/i.test(title), 'Talk opens Mori, not Oswin: '+title);
  await page.evaluate(()=>document.querySelector('[data-close="talkP"]').click());

  await page.evaluate(()=>{ window.__g.benchCfg={name:'Test Cloak', base:'cloak', use:'use', spells:[], meta:[], clBonus:0, charges:3, enh:0, ritual:false, crafter:'you'}; window.__g.benchUI(); });
  await page.waitForSelector('[data-sp]');
  await page.click('[data-sp="light"]');
  const spells=await page.evaluate(()=>window.__g.benchCfg.spells.slice());
  ok(spells.indexOf('light')>=0, 'a spell chip sticks: '+JSON.stringify(spells));
  await page.evaluate(()=>{ const b=document.getElementById('mClose'); if(b) b.click(); });

  await page.evaluate(()=>{
    const g=window.__g; g.enterDungeon(); g.showRoll&&g.step(0.05);
  });
  // showRoll is not on __g. Open a chest only if the room is clear; otherwise fire the toast the same way the chest does.
  await page.evaluate(()=>{
    const roll=document.getElementById('roll'); roll.className='show'; roll.querySelector('#rollText').textContent='d% 33 · Masterwork Light Crossbow';
    document.getElementById('modalCard').innerHTML='<h3>📦 Loot chest</h3>'; document.getElementById('modal').classList.add('open');
    window.__g.leaveDungeon('out');
  });
  const rollClass=await page.$eval('#roll', e=>e.className);
  const modalOpen=await page.$eval('#modal', e=>e.classList.contains('open'));
  ok(rollClass.indexOf('show')<0, 'loot toast is dismissed on the way out');
  ok(!modalOpen, 'loot modal does not stay over the yard');

  const rest=await page.evaluate(()=>{
    const g=window.__g; g.enterDungeon();
    const a=g.restAtCamp(); const b=g.restAtCamp();
    const locked=g.S.dun['The Undercroft'].rested===true;
    g.leaveDungeon('out');
    const cleared=g.S.dun['The Undercroft'].rested===false;
    g.enterDungeon();
    const c=g.restAtCamp();
    g.leaveDungeon('out');
    return {a,b,locked,cleared,c};
  });
  ok(rest.a===true && rest.b===false && rest.locked, 'one rest per visit');
  ok(rest.cleared && rest.c===true, 'a later visit may rest again');

  const herbs=await page.evaluate(()=>{
    const g=window.__g; const log=document.getElementById('chatLog'); const before=log.children.length;
    g.chatSend('where can I find chamomile?'); g.chatSend('where can I find willow bark?');
    return [...log.children].slice(before).filter(n=>n.dataset.who==='mo').map(n=>n.textContent).join(' | ');
  });
  ok(/chamomile/i.test(herbs) && /willow bark/i.test(herbs) && !/don't know that one/i.test(herbs), 'Mori names a place for chamomile and willow bark: '+herbs);

  const room=await page.evaluate(()=>{
    const g=window.__g; const before=g.S.clears||0; g.noteRoomClear('The Ossuary');
    return {rooms:g.S.roomClears, clears:g.S.clears, before, log:document.getElementById('log').textContent};
  });
  ok(room.rooms>=1 && room.clears===room.before, 'a cleared room is not a full dungeon clear');
  ok(/Room cleared/i.test(room.log) && /Full dungeon clears stay/.test(room.log), 'the log says rooms and full clears apart');

  const hit=await page.evaluate(()=>{
    const g=window.__g; g.S.hp=20; let guard=0;
    while(g.S.hp===20 && guard++<40) g.foeAttack({m:{name:'Wolf', atk:40, dmg:'1d4', dmgBonus:3, type:'animal', ac:10, size:1}, raid:true});
    return {hp:g.S.hp, log:document.getElementById('log').textContent};
  });
  ok(hit.hp<20 && hit.hp>=0, 'a bandit-raid wolf can hit');
  ok(/Bandit raid/.test(hit.log) && /Wolf/.test(hit.log) && /HP/.test(hit.log), 'the hit is logged with a cause: '+hit.log);
  ok(!errs.length, 'no page errors: '+errs.join(' | '));
  await browser.close();
  console.log('tests_playtest browser: passed');
}
browser().then(()=>{ console.log('tests_playtest: '+n+' checks passed'); }).catch(e=>{ console.error(e); process.exit(1); });
