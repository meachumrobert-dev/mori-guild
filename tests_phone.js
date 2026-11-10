/* Galaxy S21 Ultra phone layout. Node checks the rules. The browser half
   measures 412×915 portrait and 915×412 landscape, and a desktop control.
   Run: node tests_phone.js */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
const context={console, Math};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/phone.js'),'utf8'), context);
const P=context.PHONE;
ok(P.MIN>=48, 'minimum touch target is 48');
ok(P.shouldPhone({touch:true, w:412, h:915})===true, 'a touch phone turns the layout on');
ok(P.shouldPhone({coarse:true, w:1280, h:800})===true, 'a coarse pointer turns it on');
ok(P.shouldPhone({touch:false, w:1440, h:900})===false, 'a desktop pointer keeps the desktop UI');
ok(P.shouldPhone({touch:true, query:'0'})===false, '?phone=0 forces desktop');
ok(P.shouldPhone({touch:false, w:1440, h:900, saved:'on'})===true, 'the manual toggle can force the phone UI');
ok(P.shouldPhone({touch:true, saved:'off'})===false, 'the manual toggle can force desktop on a phone');
ok(P.shouldPhone({w:412, h:915})===true, 'a 412-wide viewport counts as the S21 size');
const v=P.stickVector(80, 0, 52);
ok(Math.abs(v.x-1)<1e-9 && v.y===0 && v.clamped, 'the stick clamps at the rim');
const small=P.stickVector(26, 0, 52);
ok(Math.abs(small.x-0.5)<1e-9 && !small.clamped, 'a half push is half speed');
const pad=P.padVector({n:1, e:1});
ok(Math.abs(pad.x-Math.SQRT1_2)<1e-9 && pad.y<0, 'north-east is forward and right');
const moved=P.placeChat({left:20, top:80, w:300, h:400}, 40, -30, {w:412, h:915});
ok(moved.left===60 && moved.top===50, 'chat drag follows the finger');
const edge=P.placeChat({left:300, top:10, w:300, h:200}, 400, -80, {w:412, h:915});
ok(edge.left===104 && edge.top===8, 'chat stays on screen');
const lay=P.layout(412, 915);
ok(!lay.land && lay.joy>=112 && lay.attack>=56, 'portrait gives a full stick and a large attack');
ok(P.layout(915, 412).land, '915×412 is landscape');
console.log('tests_phone logic: '+n+' checks');

async function browser(){
  let puppeteer; try{ puppeteer=require('puppeteer-core'); }catch(e){ console.log('browser half skipped'); return; }
  const browser=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage();
  page.setDefaultTimeout(25000);
  const out=process.env.SHOTS||'/opt/cursor/artifacts';
  async function measure(w, h, file){
    await page.setViewport({width:w, height:h, isMobile:true, hasTouch:true});
    await page.goto('file://'+path.join(__dirname,'index.html')+'?phone=1&quality=low', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body.classList.contains('phone'));
    const box=await page.evaluate(()=>{
      const r=el=>{ const b=el.getBoundingClientRect(); return {w:b.width, h:b.height, x:b.x, y:b.y}; };
      return {joy:r(document.getElementById('joy')), attack:r(document.getElementById('bAttack')), potion:r(document.getElementById('bPotion')), interact:r(document.getElementById('bInteract')), phone:document.body.classList.contains('phone'), land:document.body.classList.contains('land')};
    });
    ok(box.phone, w+'×'+h+' has phone layout');
    ok(box.land===(w>h), 'landscape class matches '+w+'×'+h);
    ok(box.joy.w>=48 && box.joy.h>=48, 'stick is at least 48 px');
    ok(box.attack.w>=48 && box.attack.h>=48, 'attack is at least 48 px');
    ok(box.potion.w>=48 && box.potion.h>=48, 'potion is at least 48 px');
    ok(box.interact.h>=48, 'interact is at least 48 px');
    ok(box.joy.x<w/2 && box.attack.x>w/2, 'stick is left, attack is right');
    await page.screenshot({path:path.join(out, file)});
    await page.click('#phoneMenu');
    await page.click('#bTalk');
    await page.click('#phoneMenu');
    await page.waitForSelector('#talkP.open');
    const chat=await page.evaluate(()=>{ const b=document.getElementById('talkP').getBoundingClientRect(); const log=getComputedStyle(document.getElementById('chatLog')); return {w:b.width, h:b.height, font:parseFloat(log.fontSize)}; });
    ok(chat.w>=200 && chat.h>=48 && chat.font>=16, 'chat is readable');
    const before=await page.evaluate(()=>document.getElementById('talkP').getBoundingClientRect().left);
    const head=await page.$('#talkHead');
    const hb=await head.boundingBox();
    await page.mouse.move(hb.x+80, hb.y+16);
    await page.mouse.down();
    await page.mouse.move(hb.x+140, hb.y+16, {steps:4});
    await page.mouse.up();
    const after=await page.evaluate(()=>document.getElementById('talkP').getBoundingClientRect().left);
    ok(after>before+20, 'chat header drag moves the sheet');
    await page.click('#chatFold');
    const folded=await page.evaluate(()=>document.getElementById('talkP').classList.contains('collapsed'));
    ok(folded, 'chat collapses');
    return box;
  }
  await measure(412, 915, 'phone-portrait.png');
  await page.click('#padMode');
  const dpad=await page.evaluate(()=>{ const b=document.querySelector('[data-pad="n"]').getBoundingClientRect(); return {w:b.width, h:b.height, pad:document.body.classList.contains('pad')}; });
  ok(dpad.pad && dpad.w>=48 && dpad.h>=48, 'D-pad buttons are at least 48 px');
  await page.screenshot({path:path.join(out, 'phone-portrait-pad.png')});
  await measure(915, 412, 'phone-landscape.png');
  await page.setViewport({width:1280, height:720, isMobile:false, hasTouch:false});
  await page.goto('file://'+path.join(__dirname,'index.html')+'?phone=0&quality=low', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g);
  const desk=await page.evaluate(()=>{ const joy=getComputedStyle(document.getElementById('joy')); return {phone:document.body.classList.contains('phone'), joy:joy.display}; });
  ok(!desk.phone && desk.joy==='none', 'desktop with ?phone=0 keeps the old UI');
  await page.screenshot({path:path.join(out, 'desktop-unchanged.png')});
  await browser.close();
  console.log('tests_phone browser passed');
}
browser().then(()=>console.log('tests_phone: '+n+' checks passed')).catch(e=>{ console.error(e); process.exit(1); });
