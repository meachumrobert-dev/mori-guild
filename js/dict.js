/* Lazy common-English lexicon. The word list lives in data/dict.json (and
   data/dict.js for file://). It is not parsed at startup. A tablet vocab
   pack sits on top. Online lookup is a hook and is off: this file never
   calls the network. */
(function(){
'use strict';
let data=null, at=null, syn=null;
const packs=new Map();
const online={enabled:false, lookup:null};
function indexOf(json){
  at=new Map(); syn=new Map();
  json.w.forEach((w,i)=>at.set(w,i));
  const y=json.y||[];
  for(let i=0;i<y.length;i+=2){
    const a=json.w[y[i]], b=json.w[y[i+1]];
    if(!syn.has(a)) syn.set(a,[]);
    syn.get(a).push(b);
  }
}
function install(json){
  if(!json||!json.w||json.w.length<8000) throw new Error('dict is too small');
  data=json; indexOf(json); linkIntents(); return json;
}
/* Everyday clippings. Mori hears "tech" and means technology, not an unknown word. */
const CLIP={
  tech:'technology', info:'information', ammo:'ammunition', gear:'equipment',
  fridge:'refrigerator', phone:'telephone', bike:'bicycle', lab:'laboratory',
  exam:'examination', math:'mathematics', stats:'statistics', intro:'introduction',
  photo:'photograph', photos:'photograph', mic:'microphone', demo:'demonstration',
  promo:'promotion', gym:'gymnasium', flu:'influenza', specs:'specification',
  temp:'temperature', max:'maximum', min:'minimum', doc:'document', docs:'document',
  meds:'medicine', vet:'veterinarian', app:'application', pics:'picture',
  auto:'automobile', bio:'biography'
};
function expansion(w){
  const full=CLIP[w]; if(!full) return null;
  if((at&&at.has(full))||packs.has(full)) return full;
  return w;
}
function lemmaOf(word){
  const w=String(word||'').toLowerCase();
  if(!w) return null;
  if((at&&at.has(w))||packs.has(w)) return w;
  const clip=expansion(w); if(clip) return clip;
  const tries=[];
  if(/ies$/.test(w)&&w.length>4) tries.push(w.slice(0,-3)+'y');
  if(/es$/.test(w)&&w.length>3){ tries.push(w.slice(0,-2)); tries.push(w.slice(0,-1)); }
  if(/s$/.test(w)&&w.length>3) tries.push(w.slice(0,-1));
  if(/ing$/.test(w)&&w.length>5){ tries.push(w.slice(0,-3)); tries.push(w.slice(0,-3)+'e'); }
  if(/ed$/.test(w)&&w.length>4){ tries.push(w.slice(0,-2)); tries.push(w.slice(0,-1)); }
  for(const t of tries) if((at&&at.has(t))||packs.has(t)) return t;
  return null;
}
function knows(word){ return !!lemmaOf(word); }
function pos(word){
  const l=lemmaOf(word); if(!l) return null;
  if(packs.has(l)&&packs.get(l).p) return packs.get(l).p;
  if(!at||!at.has(l)) return packs.has(l)?'x':null;
  return data.p[at.get(l)]||null;
}
function synonyms(word){
  const l=lemmaOf(word); if(!l) return [];
  const base=syn&&syn.get(l)?syn.get(l).slice():[];
  const extra=packs.has(l)?(packs.get(l).syn||[]):[];
  return base.concat(extra).filter((x,i,a)=>a.indexOf(x)===i&&x!==l);
}
function unknownWord(text){
  if(!data&&!packs.size) return null;
  const words=String(text||'').toLowerCase().match(/[a-z][a-z'-]{2,}/g)||[];
  for(const w of words) if(!knows(w)) return w;
  return null;
}
function linkIntents(){
  if(!window.LEXICON||!syn) return;
  LEXICON.SYNSETS.forEach(s=>{
    const add=[];
    s.lemmas.forEach(l=>{ if(l.includes(' ')) return; synonyms(l).forEach(x=>{ if(s.lemmas.indexOf(x)<0&&add.indexOf(x)<0) add.push(x); }); });
    if(add.length) LEXICON.addLemmas(s.id, add.slice(0,12));
  });
}
function addPack(entries){
  (entries||[]).forEach(e=>{
    const w=String((e&&(e.w||e.word))||'').toLowerCase().trim();
    if(!w||w.length>40||/[^a-z' -]/.test(w)) return;
    const syns=(e.syn||[]).map(x=>String(x).toLowerCase()).filter(x=>/^[a-z][a-z' -]{0,32}$/.test(x));
    packs.set(w,{p:e.p||'x', syn:syns});
  });
}
function restorePacks(){ packs.clear(); }
function load(url){
  if(data) return Promise.resolve(data);
  if(load.p) return load.p;
  const jsonUrl=url||'data/dict.json';
  load.p=fetch(jsonUrl).then(r=>{ if(!r.ok) throw new Error('dict json'); return r.json(); }).catch(()=>new Promise((resolve,reject)=>{
    if(typeof document==='undefined'){ reject(new Error('dict')); return; }
    const s=document.createElement('script');
    s.src='data/dict.js';
    s.onload=()=>window.DICT_DATA?resolve(window.DICT_DATA):reject(new Error('dict'));
    s.onerror=()=>reject(new Error('dict'));
    (document.head||document.documentElement).appendChild(s);
  })).then(install).catch(e=>{ load.p=null; throw e; });
  return load.p;
}
window.DICT={
  get ready(){ return !!data; },
  get size(){ return data?data.w.length:0; },
  online, install, load, lemmaOf, knows, pos, synonyms, unknownWord, addPack, restorePacks, linkIntents, CLIP
};
})();
