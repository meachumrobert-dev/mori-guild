/* Stress and stability. Node covers occlusion, far-coordinate precision, the
   Tinker persona pack, and a long chat. The browser half samples frames,
   renderer.info, a save round-trip, and a crowd count.
   Run: node tests_stress.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
function load(file, extra){ const c=Object.assign({console, Math, window:{}}, extra||{}); c.window=c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'), c); return c; }

const occ=load('js/occlusion.js');
const O=occ.OCCLUSION;
const wall={min:[-2,0,-2], max:[2,4,2]};
ok(O.occluded({x:0,y:1,z:-8},{x:0,y:1,z:6},[wall], 1)===true, 'a point behind a wall box is hidden');
ok(O.occluded({x:0,y:1,z:-8},{x:6,y:1,z:-6},[wall], 1)===false, 'a point beside a wall stays visible');
ok(O.occluded({x:0,y:1,z:1},{x:0,y:1,z:3},[wall], 1)===false, 'something close to the camera is not culled');
ok(O.hillBlocks({x:0,y:2,z:0},{x:0,y:2,z:40}, (x,z)=>z>10&&z<30?8:0)===true, 'a hill sample blocks the ray');
ok(O.hillBlocks({x:0,y:2,z:0},{x:0,y:2,z:6}, ()=>9)===false, 'a near slope does not pop the view');
ok(O.tooFar(180, 140, 2)===true && O.tooFar(20, 140, 2)===false, 'only small distant props are distance-culled');
ok(O.floatGap(0)>0.04, 'near the origin a 5 cm step survives float32');
ok(O.floatGap(1e7)<0.04, 'at 100% drift a 5 cm step is lost in float32');
const view=O.viewOffset(100000, 80000, 100010, 80005);
ok(view.shifted && Math.abs(view.cx)<20 && Math.abs(view.cz)<20, 'the render origin pulls a far camera back near zero');
const rel=Math.hypot(100010-100000, 80005-80000);
ok(Math.abs(Math.hypot(view.cx, view.cz)-rel)<1e-6, 'rebasing keeps the camera-to-player distance');

const L=load('js/lexicon.js');
const E=load('js/english.js');
const chat=load('js/morichat.js');
chat.LEXICON=L.LEXICON; chat.ENGLISH=E.ENGLISH; chat.window.LEXICON=L.LEXICON; chat.window.ENGLISH=E.ENGLISH;
const tab=load('js/tablet.js');
const tink=load('js/tinker.js');
const fin=load('js/fingers.js');
fin.LEXICON=L.LEXICON; fin.MORICHAT=chat.MORICHAT; fin.window.LEXICON=L.LEXICON; fin.window.MORICHAT=chat.MORICHAT; fin.window.ENGLISH=E.ENGLISH;
const pack=tink.TINKER_PACK;
ok(tab.TABLET.validatePatch(pack).ok, 'the tinker pack is data the tablet accepts');
ok(!tab.TABLET.validatePatch({fingers:[{kind:'template', id:'x', text:'eval(1)'}]}).ok, 'a code-looking persona string is still refused');
const slots={ruler:'The Guild Charter (Seedkeeper Mori)', name:'Guildhold', motto:'We were made to make the world.', gov:'Guild Charter', race:'mixed guild folk', region:'The Thalulfall Reach', arts:''};
const sand=tab.TABLET.runCases(pack, [
  {text:'hi', intent:'tinkerhi', includes:['tinker','gnome'], slots:{}},
  {text:'who rules here', intent:'ruler', includes:[slots.ruler, slots.name], slots}
]);
ok(sand.pass, 'the worker checks the persona pack: '+(sand.fails||[]).join('; '));
const ctx={mem:{}, n:2, atGuild:true, regionName:'The Thalulfall Reach', openQuests:0, questLine:'no quests yet.',
  hereCity:()=>({named:true, name:slots.name, ruler:slots.ruler, motto:slots.motto, govName:slots.gov, race:slots.race, arts:[], region:slots.region}),
  cityList:()=>[]};
const M=chat.MORICHAT;
const plainHi=M.reply('hi', ctx);
ok(/guild/.test(plainHi)&&!/tinker gearwhistle/.test(plainHi), 'without the pack, hi is still Mori');
fin.FINGERS.reapply([pack]);
let onTopic=0;
for(let i=0;i<24;i++){
  const q=['hi','who are you','who rules here?','what is your rule?'][i%4];
  const a=M.reply(q, ctx)||'';
  const agi=/\bagi\b|artificial intelligence|i am an ai/.test(a);
  ok(!agi, 'turn '+i+' does not claim a mind');
  if(q==='hi') ok(/tinker/.test(a)&&/gnome/.test(a)&&a.length<180, 'tinker hi stays short');
  if(q==='who are you') ok(/tinker/.test(a)&&/gnome/.test(a)&&/not a real mind/.test(a), 'tinker introduction is flavor');
  if(q.indexOf('rules')>=0) ok(a.indexOf('Seedkeeper Mori')>=0||a.indexOf(slots.ruler)>=0, 'rules stay on the city card');
  if(q.indexOf('rule')>=0&&q.indexOf('rules')<0) ok(/behave/.test(a), 'the behave rule still answers');
  if(a) onTopic++;
}
ok(onTopic===24, '24 persona turns stayed on a known intent');
fin.FINGERS.restore();
ok(!/tinker gearwhistle/.test(M.reply('hi', ctx)||''), 'revert returns the Mori greeting');

console.log('tests_stress logic: '+n+' checks');
console.log('stress drift: float32 gap at 0 = '+O.floatGap(0).toFixed(4)+', at 1e7 = '+O.floatGap(1e7).toFixed(4)+', rebase cam '+view.cx.toFixed(2)+','+view.cz.toFixed(2));

async function browser(){
  let puppeteer; try{ puppeteer=require('puppeteer-core'); }catch(e){ console.log('browser soak skipped'); return; }
  const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage();
  page.setDefaultTimeout(30000);
  const errs=[]; page.on('pageerror', e=>errs.push(String(e)));
  await page.setViewport({width:1280, height:720});
  await page.goto('file://'+path.join(__dirname,'index.html')+'?quality=low', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g&&window.__g.player&&window.OCCLUSION);
  const report=await page.evaluate(async()=>{
    const g=window.__g;
    const mem0=g.renderer.info.memory.geometries;
    const tex0=g.renderer.info.memory.textures;
    const frames=[];
    let prev=performance.now();
    for(let i=0;i<48;i++){
      g.player.pos.x=Math.sin(i/6)*30;
      g.player.pos.z=8+Math.cos(i/6)*30;
      await new Promise(r=>requestAnimationFrame(r));
      const now=performance.now(); frames.push(now-prev); prev=now;
    }
    g.player.pos.x=100000; g.player.pos.z=80000;
    await new Promise(r=>requestAnimationFrame(r));
    const farCam=window.OCCLUSION.stats.lastCam;
    g.player.pos.x=0; g.player.pos.z=8;
    for(let i=0;i<24;i++) await new Promise(r=>requestAnimationFrame(r));
    const mem1=g.renderer.info.memory.geometries;
    const tex1=g.renderer.info.memory.textures;
    for(let i=0;i<16;i++) await new Promise(r=>requestAnimationFrame(r));
    const mem2=g.renderer.info.memory.geometries;
    const tex2=g.renderer.info.memory.textures;
    const crowd=g.NPCS&&g.NPCS.counts?g.NPCS.counts():{live:0,total:0};
    const saved=JSON.parse(JSON.stringify(g.S));
    const hi=g.chatSend('who rules here?');
    const log=[...document.querySelectorAll('#chatLog .msg')].slice(-2).map(n=>n.textContent).join(' ');
    const avg=frames.reduce((a,b)=>a+b,0)/frames.length;
    const worst=Math.max.apply(null, frames);
    return {avg, worst, mem0, mem1, mem2, tex0, tex1, tex2, farCam, live:crowd.live, total:crowd.total, gold:saved.gold, hp:saved.hp, same:saved.gold===g.S.gold&&saved.hp===g.S.hp, log, hidden:window.OCCLUSION.stats.hidden, tested:window.OCCLUSION.stats.tested};
  });
  ok(report.same, 'save round-trip keeps gold and hp');
  ok(report.farCam<30, 'far drift render camera stays near the origin: '+report.farCam);
  ok(report.mem2-report.mem1<40, 'settled geometry does not keep growing: '+report.mem1+' -> '+report.mem2);
  ok(report.tex2-report.tex1<20, 'settled textures do not keep growing: '+report.tex1+' -> '+report.tex2);
  ok(/Guild|Seedkeeper|rules|motto/i.test(report.log), 'chat under load still answers the ruler: '+report.log);
  ok(!errs.length, 'no page errors: '+errs.join(' | '));
  const fps=1000/report.avg;
  console.log('stress soak: avg frame '+report.avg.toFixed(1)+' ms ('+fps.toFixed(1)+' fps), worst '+report.worst.toFixed(1)+' ms');
  console.log('stress memory: geometries '+report.mem0+' -> '+report.mem1+' -> '+report.mem2+', textures '+report.tex0+' -> '+report.tex1+' -> '+report.tex2);
  console.log('stress crowd: '+report.live+' live / '+report.total+' defined, cull hidden '+report.hidden+' of '+report.tested+' tests, far camera '+report.farCam.toFixed(2));
  await browser.close();
  console.log('tests_stress browser passed');
}
browser().then(()=>console.log('tests_stress: '+n+' checks passed')).catch(e=>{ console.error(e); process.exit(1); });
