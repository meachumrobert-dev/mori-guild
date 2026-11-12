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
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/hotbar.js'),'utf8'), context);
const P=context.PHONE, H=context.HOTBAR;
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
ok(P.overlapArea({x:0,y:0,w:10,h:10},{x:20,y:20,w:5,h:5})===0, 'separate boxes do not overlap');
ok(P.overlapArea({x:0,y:0,w:10,h:10},{x:5,y:5,w:10,h:10})===25, 'overlap area is the intersection');
[[412,780,'stick'],[915,360,'stick'],[768,1024,'stick'],[1024,768,'stick'],[412,915,'pad'],[915,412,'pad']].forEach(([w,h,mode])=>{
  const f=P.frames(w,h,mode);
  const thumb=mode==='pad'?{x:12,y:h-16-156,w:156,h:156}:f.joy;
  ok(f.inside, mode+' bar stays on screen at '+w+'×'+h);
  ok(P.overlapArea(f.bar, thumb)===0, mode+' bar clears the left control at '+w+'×'+h);
  ok(P.overlapArea(f.bar, f.atk)===0, mode+' bar clears the attack cluster at '+w+'×'+h);
});
const bar=H.fresh();
ok(bar.pages.length===4 && bar.pages.every(p=>p.length===9), 'four pages of nine slots');
ok(H.label(bar.pages[0][1])==='Salve' && H.tip(bar.pages[0][1])==='Salve. Heals over time. No roll.', 'the salve slot says Salve and explains the heal');
ok(H.label(bar.pages[1][0])==='Spell' && /not in the world yet/i.test(H.tip(bar.pages[1][0])), 'a spell slot is only a placeholder');
const put=H.assign(bar, 0, 8, {type:'item', id:'wound', kind:'salve', name:'Wound Salve'});
ok(put.pages[0][8].id==='wound' && put.pages[0][8].tip===H.SALVE_TIP, 'dragging a salve onto a slot keeps the Salve tip');
const swapped=H.swap(put, 8, 1);
ok(swapped.pages[0][1].id==='wound' && swapped.pages[0][8].kind==='salve', 'two slots can trade places');
const saved=H.restore(JSON.parse(JSON.stringify(put)));
ok(saved.pages[0][8].name==='Wound Salve' && saved.page===0, 'the bar layout round-trips through a save');
ok(H.turn(saved, 1).page===1 && H.turn(saved, -1).page===3 && H.turn(H.turn(saved, 1), 1).page===2, 'pages wrap across the four bars');
ok(H.keyIndex('Digit1')===0 && H.keyIndex('Digit9')===8 && H.keyIndex('Numpad5')===4 && H.keyIndex('KeyQ')===-1, 'keys 1–9 pick a slot');
ok(H.pageKey('BracketRight')===1 && H.pageKey('BracketLeft')===-1, 'bracket keys change page');
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
    await page.mouse.move(8, h-8);
    await page.evaluate(()=>{ const m=document.getElementById('modal'); if(m) m.classList.remove('open'); return new Promise(r=>requestAnimationFrame(r)); });
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
  async function overlap(w, h, file){
    await page.setViewport({width:w, height:h, isMobile:true, hasTouch:true, deviceScaleFactor:1});
    await page.goto('file://'+path.join(__dirname,'index.html')+'?phone=1&quality=low', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.body.classList.contains('phone'));
    await page.evaluate(()=>{
      document.getElementById('suggText').textContent='The cottage frame is still 99% unprogrammed. A plan from the Guild (auto-approves in a moment — I trust me)';
      document.getElementById('sugg').style.display='block';
    });
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const read=()=>page.evaluate((vw, vh)=>{
      const clip=el=>{
        const s=getComputedStyle(el);
        if(s.display==='none'||s.visibility==='hidden') return null;
        const raw=el.getBoundingClientRect();
        if(raw.width<2||raw.height<2) return null;
        let x=raw.x, y=raw.y, x2=raw.right, y2=raw.bottom;
        for(let p=el.parentElement; p&&p!==document.documentElement; p=p.parentElement){
          const ps=getComputedStyle(p);
          if(/(auto|scroll|hidden)/.test(ps.overflowX+' '+ps.overflowY+' '+ps.overflow)){
            const b=p.getBoundingClientRect();
            x=Math.max(x,b.x); y=Math.max(y,b.y); x2=Math.min(x2,b.right); y2=Math.min(y2,b.bottom);
          }
        }
        x=Math.max(0,x); y=Math.max(0,y); x2=Math.min(vw,x2); y2=Math.min(vh,y2);
        if(x2-x<2||y2-y<2) return null;
        return {id:el.id||el.getAttribute('aria-label')||el.textContent.slice(0,18), x, y, w:x2-x, h:y2-y};
      };
      const full=el=>{ const b=el.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; };
      const nodes=[];
      document.querySelectorAll('#top .st, #statSheet .st, #statMore, #phoneMenu, #moriStatus, #suggText, #suggOk, #suggNo, #joy, #ctx button, #padMode, #turnText, #turnGo, #turnNo, #log, #barUp, #barDown, #barPage, .barSlot').forEach(el=>{ const b=clip(el); if(b) nodes.push(b); });
      const pairs=[];
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
        const area=window.PHONE.overlapArea(nodes[i], nodes[j]);
        if(area>1) pairs.push(nodes[i].id+' × '+nodes[j].id);
      }
      const must=['suggOk','suggNo','joy','bAttack','statMore','phoneMenu'];
      const off=must.filter(id=>{ const el=document.getElementById(id); if(!el||getComputedStyle(el).display==='none') return false; const b=full(el); return b.x<-1||b.y<-1||b.x+b.w>vw+1||b.y+b.h>vh+1; });
      const ink=[...document.querySelectorAll('#top .st, #statSheet .st')].filter(el=>el.getClientRects().length&&el.scrollWidth>el.clientWidth+2).map(el=>el.id||el.textContent.replace(/\s+/g,' ').slice(0,24));
      const okb=full(document.getElementById('suggOk'));
      const joy=full(document.getElementById('joy'));
      const atk=full(document.getElementById('bAttack'));
      const hint=document.getElementById('turnText');
      return {pairs, off, ink, okh:okb.h, joyX:joy.x, atkX:atk.x, hint:!!hint && hint.getClientRects().length>0};
    }, w, h);
    let hits=await read();
    ok(hits.pairs.length===0, w+'×'+h+' HUD does not overlap'+(hits.pairs.length?': '+hits.pairs.join('; '):''));
    ok(hits.off.length===0, w+'×'+h+' HUD stays inside the viewport'+(hits.off.length?': '+hits.off.join(', '):''));
    ok(hits.ink.length===0, w+'×'+h+' stat text stays inside its pill'+(hits.ink.length?': '+hits.ink.join(', '):''));
    ok(hits.okh>=48, 'Approve is at least 48 px tall');
    ok(hits.joyX<w/2 && hits.atkX>w/2, 'joystick stays on the left thumb and attack on the right');
    if(h>w) ok(hits.hint, 'portrait offers a landscape suggestion');
    else ok(!hits.hint, 'landscape does not nag to rotate');
    await page.screenshot({path:path.join(out, file)});
    await page.click('#statMore');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    hits=await read();
    ok(hits.pairs.length===0, w+'×'+h+' expanded stats do not overlap'+(hits.pairs.length?': '+hits.pairs.join('; '):''));
    ok(hits.off.length===0, w+'×'+h+' expanded stats stay inside the viewport'+(hits.off.length?': '+hits.off.join(', '):''));
    ok(hits.ink.length===0, w+'×'+h+' expanded stat text stays inside its pill'+(hits.ink.length?': '+hits.ink.join(', '):''));
    await page.screenshot({path:path.join(out, file.replace('.png','-stats.png'))});
    const bar=await page.evaluate(()=>{
      const slots=[...document.querySelectorAll('.barSlot')];
      const salve=slots.find(s=>/Salve/.test(s.textContent));
      const pageEl=document.getElementById('barPage');
      const up=document.getElementById('barUp').getBoundingClientRect();
      return {n:slots.length, page:pageEl.textContent.trim(), tip:salve?salve.getAttribute('title'):'', text:salve?salve.textContent:'', up:up.height};
    });
    ok(bar.n===9, w+'×'+h+' shows nine action slots');
    ok(bar.page==='1/4', w+'×'+h+' starts on hotbar page 1 of 4');
    ok(/Salve/.test(bar.text) && /heals over time/i.test(bar.tip) && /no roll/i.test(bar.tip), w+'×'+h+' labels the salve and says it heals over time with no roll');
    ok(bar.up>=48, w+'×'+h+' page arrow is at least 48 px');
  }
  await overlap(412, 780, 'phone-s21-portrait.png');
  await page.evaluate(()=>{ const m=document.getElementById('modal'); if(m) m.classList.remove('open'); });
  await page.click('#barDown');
  const page2=await page.$eval('#barPage', el=>el.textContent.trim());
  ok(page2==='2/4', 'the down arrow opens hotbar page 2');
  await page.click('#barUp');
  const page1=await page.$eval('#barPage', el=>el.textContent.trim());
  ok(page1==='1/4', 'the up arrow returns to hotbar page 1');
  await page.keyboard.press('Digit1');
  const used=await page.evaluate(()=>window.__g.S.inv.filter(i=>i.kind==='bandage').length);
  ok(used===0, 'key 1 uses the bandage on the first slot');
  await page.evaluate(()=>{
    const S=window.__g.S;
    S.bars=window.HOTBAR.assign(S.bars, 0, 8, {type:'spell', name:'Spell'});
    S.bars=window.HOTBAR.turn(S.bars, 1);
    window.__g.save();
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g&&window.__g.S&&window.__g.S.bars&&window.__g.S.bars.pages);
  const kept=await page.evaluate(()=>({page:window.__g.S.bars.page, slot:window.__g.S.bars.pages[0][8]}));
  ok(kept.page===1 && kept.slot&&kept.slot.type==='spell', 'the hotbar page and slot come back from the save');
  await page.evaluate(()=>{ window.__g.S.bars=window.HOTBAR.fresh(); window.__g.renderBar(); const m=document.getElementById('modal'); if(m) m.classList.remove('open'); });
  await page.$eval('#barSlots', el=>{ el.scrollLeft=0; });
  const boxes=await page.evaluate(()=>{ const r=i=>{ const b=document.querySelector('[data-slot="'+i+'"]').getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; }; return {a:r(1), b:r(3), c:r(4)}; });
  await page.mouse.move(boxes.a.x+18, boxes.a.y+18);
  await page.mouse.down();
  await page.mouse.move(boxes.b.x+18, boxes.b.y+18, {steps:10});
  await page.mouse.up();
  const landed=await page.$eval('[data-slot="3"]', el=>el.textContent);
  ok(/Salve/.test(landed), 'dragging a hotbar slot moves Salve onto that slot');
  await page.click('#phoneMenu');
  await page.click('#bBag');
  await page.click('#phoneMenu');
  await page.waitForSelector('#bagP.open [data-bar-spell="1"] .barDrag');
  const chip=await (await page.$('[data-bar-spell="1"] .barDrag')).boundingBox();
  const empty=boxes.c;
  await page.mouse.move(chip.x+12, chip.y+12);
  await page.mouse.down();
  await page.mouse.move(empty.x+18, empty.y+18, {steps:12});
  await page.mouse.up();
  const spelled=await page.$eval('[data-slot="4"]', el=>el.textContent);
  ok(/Spell/.test(spelled), 'dragging the spell placeholder from the bag fills a slot');
  await page.evaluate(()=>{ window.__g.S.bars=window.HOTBAR.fresh(); window.__g.save(); });
  await overlap(915, 360, 'phone-s21-landscape.png');
  await overlap(768, 1024, 'tablet-portrait.png');
  await overlap(1024, 768, 'tablet-landscape.png');
  await page.setViewport({width:1280, height:720, isMobile:false, hasTouch:false});
  await page.goto('file://'+path.join(__dirname,'index.html')+'?phone=0&quality=low', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g);
  const desk=await page.evaluate(()=>{ const joy=getComputedStyle(document.getElementById('joy')); return {phone:document.body.classList.contains('phone'), joy:joy.display}; });
  ok(!desk.phone && desk.joy==='none', 'desktop with ?phone=0 keeps the old UI');
  const deskHud=await page.evaluate(()=>({more:getComputedStyle(document.getElementById('statMore')).display, extra:document.getElementById('sRank').parentElement.id, phone:document.body.classList.contains('phone')}));
  ok(!deskHud.phone && deskHud.more==='none' && deskHud.extra==='top', 'desktop keeps the stat pills in the top bar');
  await page.screenshot({path:path.join(out, 'desktop-unchanged.png')});
  await browser.close();
  console.log('tests_phone browser passed');
}
browser().then(()=>console.log('tests_phone: '+n+' checks passed')).catch(e=>{ console.error(e); process.exit(1); });
