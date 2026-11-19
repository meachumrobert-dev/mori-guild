/* Bag labels leave the screen when the bag closes. Zero-return bands can leave the pack.
   Run: node tests_bag.js */
'use strict';
const path=require('path'), assert=require('assert');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }

async function main(){
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }
  catch(e){ console.log('tests_bag skipped (no puppeteer)'); return; }
  const browser=await puppeteer.launch({
    executablePath:process.env.CHROME||'/usr/bin/google-chrome',
    headless:'new',
    args:['--no-sandbox','--disable-gpu','--disable-http-cache','--use-gl=angle','--use-angle=swiftshader']
  });
  const page=await browser.newPage();
  page.setDefaultTimeout(25000);
  const out=process.env.SHOTS||'/opt/cursor/artifacts';
  const names=['Feather Token','+5 HAT (knockoff)','Zero-Return Band'];
  await page.setViewport({width:1280, height:720});
  await page.goto('file://'+path.join(__dirname,'index.html')+'?phone=0&quality=low', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__g&&window.__g.S);
  await new Promise(r=>setTimeout(r, 600));
  await page.evaluate(()=>{ const m=document.getElementById('modal'); if(m) m.classList.remove('open'); });
  await page.evaluate((names)=>{
    window.__g.addItem({name:names[0], cat:'Wondrous Item', kind:'wondrous', value:0});
    window.__g.addItem({name:names[1], cat:"Robert's World", kind:'cursed', value:0});
    window.__g.addItem({name:names[2], cat:"Robert's World", kind:'ring', value:0, fx:{zeroKeep:1}});
  }, names);
  const priced=await page.evaluate(()=>{
    const S=window.__g.S;
    const band=S.inv.find(i=>/zero-return/i.test(i.name));
    const hat=S.inv.find(i=>/HAT/.test(i.name));
    return {band:band&&band.value, end:band&&band.end, hat:hat&&hat.value, worn:!!(band&&band.equipped)};
  });
  ok(priced.band>=8&&priced.end==='defense'&&priced.hat>=1&&priced.worn, 'a zero-value band is priced, purposed, and wearable');
  await page.click('#bBag');
  await page.waitForSelector('#bagP.open .bagName');
  const open=await page.evaluate((names)=>{
    function shown(el){
      if(!el||el.hidden) return false;
      const s=getComputedStyle(el);
      if(s.display==='none'||s.visibility==='hidden') return false;
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0;
    }
    const labels=[...document.querySelectorAll('#bagBody .bagName')];
    const row=document.querySelector('#bagBody .barRow');
    const band=window.__g.S.inv.find(i=>/zero-return/i.test(i.name));
    const buttons=band?[...document.querySelectorAll('[data-sell="'+band.id+'"], [data-drop="'+band.id+'"], [data-bin="'+band.id+'"]')].map(b=>b.textContent):[];
    return {
      labels:names.filter(nm=>labels.some(el=>shown(el)&&el.textContent.indexOf(nm)>=0)),
      tips:document.querySelectorAll('#bagBody [title]').length,
      buttons
    };
  }, names);
  ok(open.labels.length===3, 'opening the bag shows the item names');
  ok(open.tips>0&&open.buttons.length===3&&/Sell/.test(open.buttons[0])&&/Drop/.test(open.buttons[1])&&/Destroy/.test(open.buttons[2]), 'each item can be sold, dropped, or destroyed');
  await page.screenshot({path:path.join(out,'bag-open.png')});
  await page.click('#bagP [data-close="bagP"]');
  const closed=await page.evaluate((names)=>{
    function shown(el){
      if(!el||el.hidden) return false;
      const s=getComputedStyle(el);
      if(s.display==='none'||s.visibility==='hidden') return false;
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0;
    }
    const hits=[];
    document.querySelectorAll('body *').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(!names.some(nm=>t===nm||(el.classList&&el.classList.contains('bagName')&&t.indexOf(nm)>=0))) return;
      if(shown(el)) hits.push(t);
    });
    const ghost=document.getElementById('barGhost');
    return {
      hits,
      titles:[...document.querySelectorAll('#bagBody [title]')].length,
      rows:document.querySelectorAll('#bagBody .bagName, #bagBody .barRow').length,
      ghost:!(ghost&&shown(ghost)&&ghost.textContent),
      open:document.getElementById('bagP').classList.contains('open')
    };
  }, names);
  ok(!closed.open&&closed.hits.length===0&&closed.titles===0&&closed.rows===0&&closed.ghost, 'closing the bag hides every item label');
  await page.screenshot({path:path.join(out,'bag-closed.png')});
  await page.click('#bBag');
  await page.waitForSelector('#bagP.open .bagName');
  await page.click('#bJobs');
  const tabbed=await page.evaluate((names)=>{
    function shown(el){
      if(!el||el.hidden) return false;
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0;
    }
    const hits=[...document.querySelectorAll('.bagName')].filter(el=>shown(el)&&names.some(nm=>el.textContent.indexOf(nm)>=0));
    return {hits:hits.length, bag:document.getElementById('bagP').classList.contains('open'), jobs:document.getElementById('jobsP').classList.contains('open')};
  }, names);
  ok(tabbed.jobs&&!tabbed.bag&&tabbed.hits===0, 'switching sheets hides the bag labels');
  const streak=await page.evaluate(()=>{
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
    const hero=window.__g.player.model.userData.hero;
    if(!hero.bolts) hero.bolts={visible:true, geometry:{attributes:{position:{needsUpdate:false, setXYZ(){}}}, computeBoundingSphere(){}}, material:{opacity:1}};
    hero.bolts.visible=true;
    window.__g.player.model.userData.auraLeft=1;
    window.__g.step(0.1);
    const band=window.__g.S.inv.find(i=>i.fx&&i.fx.zeroKeep);
    return {on:hero.bolts.visible===true, aura:window.__g.player.model.userData.auraLeft||0, worn:!!(band&&band.equipped)};
  });
  ok(!streak.on&&streak.aura===0&&streak.worn, 'a worn band does not keep the green streak');
  await page.click('#bBag');
  await page.waitForSelector('#bagP.open [data-bin]');
  const before=await page.evaluate(()=>window.__g.S.inv.filter(i=>i.fx&&i.fx.zeroKeep).length);
  await page.evaluate(()=>{
    window.confirm=()=>true;
    const band=window.__g.S.inv.find(i=>i.fx&&i.fx.zeroKeep);
    document.querySelector('[data-bin="'+band.id+'"]').click();
  });
  const after=await page.evaluate(()=>{
    const bolts=window.__g.player.model.userData.hero.bolts;
    return {n:window.__g.S.inv.filter(i=>i.fx&&i.fx.zeroKeep).length, aura:window.__g.player.model.userData.auraLeft||0, bolts:!!(bolts&&bolts.visible)};
  });
  ok(before===1&&after.n===0&&after.aura===0&&after.bolts===false, 'destroying the band removes it');
  const hat=await page.evaluate(()=>window.__g.S.inv.find(i=>/HAT/.test(i.name)));
  const gold0=await page.evaluate(()=>window.__g.S.gold);
  await page.evaluate((id)=>{ document.querySelector('[data-sell="'+id+'"]').click(); }, hat.id);
  const sold=await page.evaluate((id)=>({gone:!window.__g.S.inv.some(i=>i.id===id), gold:window.__g.S.gold}), hat.id);
  ok(sold.gone&&sold.gold>gold0, 'selling the hat pays gold');
  const kept=await page.evaluate(()=>{
    window.confirm=()=>false;
    const it=window.__g.S.inv.find(i=>/Feather/.test(i.name));
    document.querySelector('[data-drop="'+it.id+'"]').click();
    return window.__g.S.inv.some(i=>i.id===it.id);
  });
  ok(kept, 'drop without a yes leaves the item');
  await page.evaluate(()=>{ window.confirm=()=>true; const it=window.__g.S.inv.find(i=>/Feather/.test(i.name)); document.querySelector('[data-drop="'+it.id+'"]').click(); });
  const dropped=await page.evaluate(()=>!window.__g.S.inv.some(i=>/Feather/.test(i.name)));
  ok(dropped, 'a confirmed drop removes the item');
  await page.evaluate(()=>{
    window.__g.addItem({name:'Feather Token', kind:'wondrous', value:0});
    window.__g.renderBag();
  });
  await page.evaluate(()=>{ window.confirm=()=>true; document.getElementById('bReset').click(); });
  await page.waitForFunction(()=>window.__g&&window.__g.S&&!window.__g.S.inv.some(i=>/Feather Token/.test(i.name)));
  const reset=await page.evaluate(()=>{
    function shown(el){
      if(!el||el.hidden) return false;
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0;
    }
    const hits=[...document.querySelectorAll('.bagName, #bagBody [title]')].filter(shown);
    const ghost=document.getElementById('barGhost');
    return {hits:hits.length, feather:window.__g.S.inv.some(i=>/Feather Token/.test(i.name)), bag:document.getElementById('bagP').classList.contains('open'), ghost:ghost&&shown(ghost)&&!!ghost.textContent};
  });
  ok(!reset.bag&&reset.hits===0&&!reset.feather&&!reset.ghost, 'reset clears the bag labels');
  await browser.close();
  console.log('tests_bag: '+n+' checks passed');
}
main().catch(e=>{ console.error(e); process.exit(1); });
