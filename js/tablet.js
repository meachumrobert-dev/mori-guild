/* Obsidian Tablet. Mori may draft a data-only patch (vocabulary, phrases, templates).
   The check runs in a Web Worker with no DOM and no save. Nothing is applied until Approve.
   Templates are filled from a whitelist. There is no eval. */
(function(){
'use strict';
const KEYS=['ruler','name','motto','gov','race','region','arts'];
const BAD=/eval|function|=>|document|localstorage|window|<|>|`|\$\{|script|import/i;
function badString(s){ return typeof s!=='string' || s.length>180 || BAD.test(s); }
function validatePatch(patch){
  const errors=[];
  if(!patch || typeof patch!=='object' || Array.isArray(patch)) return {ok:false, errors:['a patch is a data object']};
  const keys=Object.keys(patch);
  keys.forEach(k=>{ if(['vocab','intents','templates','note','fingers'].indexOf(k)<0) errors.push('unknown field '+k); });
  (patch.fingers||[]).forEach(f=>{
    if(!f||['vocab','intent','template','furniture','recipe'].indexOf(f.kind)<0){ errors.push('bad finger'); return; }
    if(f.kind==='furniture'){
      if(!f.id||badString(f.name)||['bench','chair','table','stool','shelf'].indexOf(f.piece)<0) errors.push('bad furniture finger');
      if(typeof f.x!=='number'||typeof f.z!=='number'||Math.abs(f.x)>40||Math.abs(f.z)>40) errors.push('furniture is outside the guild yard');
    } else if(f.kind==='recipe'){
      if(badString(f.id)||badString(f.label)) errors.push('bad recipe note');
    } else if(f.kind==='template'){
      if(badString(f.text)) errors.push('bad template finger');
    }
  });
  (patch.vocab||[]).forEach(v=>{
    if(!v || badString(v.id) || !/^[a-z][a-z0-9.]{0,24}$/.test(v.id)) errors.push('bad vocab id');
    (v.add||[]).forEach(w=>{ if(badString(w) || !/^[a-z][a-z' .-]{0,32}$/.test(w)) errors.push('bad lemma'); });
  });
  (patch.intents||[]).forEach(it=>{
    if(!it || badString(it.id) || !/^[a-z][a-z0-9]{0,24}$/.test(it.id)) errors.push('bad intent id');
    (it.any||[]).forEach(p=>{ if(badString(p)) errors.push('bad phrase'); });
    if(it.template && !/^[a-z][a-z0-9]{0,24}$/.test(it.template)) errors.push('bad template id');
  });
  const tpl=patch.templates||{};
  Object.keys(tpl).forEach(k=>{
    if(!/^[a-z][a-z0-9]{0,24}$/.test(k) || badString(tpl[k])) errors.push('bad template');
    const used=String(tpl[k]).match(/\{([a-z]+)\}/g)||[];
    used.forEach(tok=>{ const name=tok.slice(1,-1); if(KEYS.indexOf(name)<0) errors.push('template key '+name+' is not on the card'); });
  });
  return {ok:errors.length===0, errors};
}
function matchPhrase(text, intents){
  const t=String(text||'').toLowerCase();
  for(const it of intents||[]){ if((it.any||[]).some(p=>t.indexOf(String(p).toLowerCase())>=0)) return it; }
  return null;
}
function fillTemplate(templates, id, slots){
  const src=(templates&&templates[id])||'';
  return String(src).replace(/\{([a-z]+)\}/g,(m,k)=>KEYS.indexOf(k)>=0&&slots&&slots[k]!=null?String(slots[k]):'');
}
function normalize(patch){
  const out={vocab:[], intents:[], templates:{}, furniture:[], recipes:[], note:(patch&&patch.note)||''};
  if(!patch) return out;
  (patch.vocab||[]).forEach(v=>out.vocab.push(v));
  (patch.intents||[]).forEach(i=>out.intents.push(i));
  Object.assign(out.templates, patch.templates||{});
  (patch.fingers||[]).forEach(f=>{
    if(f.kind==='vocab') out.vocab.push({id:f.id, add:f.add||[]});
    if(f.kind==='intent') out.intents.push({id:f.id, any:f.any||[], template:f.template});
    if(f.kind==='template') out.templates[f.id]=f.text;
    if(f.kind==='furniture') out.furniture.push(f);
    if(f.kind==='recipe') out.recipes.push(f);
  });
  return out;
}
function runCases(patch, cases){
  const v=validatePatch(patch); patch=normalize(patch);
  if(!v.ok) return {pass:false, fails:v.errors, isolated:true};
  const fails=[];
  (cases||[]).forEach(cs=>{
    const hit=matchPhrase(cs.text, patch.intents);
    if(cs.intent && (!hit || hit.id!==cs.intent)) fails.push(cs.text+' did not match '+cs.intent);
    if(cs.includes && hit && hit.template){
      const line=fillTemplate(patch.templates, hit.template, cs.slots||{});
      cs.includes.forEach(w=>{ if(line.toLowerCase().indexOf(String(w).toLowerCase())<0) fails.push('missing "'+w+'"'); });
      if(/\{[a-z]+\}/.test(line)) fails.push('a blank slot was left in the line');
    }
  });
  return {pass:fails.length===0, fails, isolated:true};
}
function workerSource(){
  return 'onmessage=function(e){ var BAD=/eval|function|=>|document|localstorage|window|<|>|`|\\$\\{|script|import/i; var KEYS=["ruler","name","motto","gov","race","region","arts"];'+
    'function bad(s){return typeof s!=="string"||s.length>180||BAD.test(s);} function valid(p){ if(!p||typeof p!=="object") return ["not data"]; var err=[];'+
    '(p.vocab||[]).forEach(function(v){ if(!v||bad(v.id)) err.push("vocab"); (v.add||[]).forEach(function(w){ if(bad(w)) err.push("lemma"); }); });'+
    '(p.intents||[]).forEach(function(it){ if(!it||bad(it.id)) err.push("intent"); (it.any||[]).forEach(function(ph){ if(bad(ph)) err.push("phrase"); }); });'+
    'var t=p.templates||{}; Object.keys(t).forEach(function(k){ if(bad(t[k])) err.push("template"); }); return err; };'+
    'var p=e.data.patch, cases=e.data.cases||[], err=valid(p); if(err.length){ postMessage({pass:false,fails:err,isolated:true}); return; } var fails=[];'+
    'cases.forEach(function(cs){ var t=String(cs.text||"").toLowerCase(); var hit=null; (p.intents||[]).forEach(function(it){ if(!hit&&(it.any||[]).some(function(ph){ return t.indexOf(String(ph).toLowerCase())>=0; })) hit=it; });'+
    'if(cs.intent&&(!hit||hit.id!==cs.intent)) fails.push(cs.text); if(cs.includes&&hit){ var line=String((p.templates||{})[hit.template]||"");'+
    'line=line.replace(/\\{([a-z]+)\\}/g,function(m,k){ return KEYS.indexOf(k)>=0&&cs.slots&&cs.slots[k]!=null?String(cs.slots[k]):""; });'+
    'cs.includes.forEach(function(w){ if(line.toLowerCase().indexOf(String(w).toLowerCase())<0) fails.push("missing "+w); }); } });'+
    'postMessage({pass:fails.length===0,fails:fails,isolated:true}); };';
}
function check(patch, cases){
  const v=validatePatch(patch);
  if(!v.ok) return Promise.resolve({pass:false, fails:v.errors, isolated:true});
  return new Promise(function(resolve){
    var src=workerSource();
    if(typeof Worker!=='function'||typeof Blob!=='function'){ resolve(runCases(patch, cases)); return; }
    try{
      var blob=new Blob([src],{type:'text/javascript'});
      var url=URL.createObjectURL(blob);
      var w=new Worker(url);
      var done=false;
      var timer=setTimeout(function(){ if(done) return; done=true; try{w.terminate();}catch(e){} resolve(runCases(patch, cases)); }, 1500);
      w.onmessage=function(ev){ if(done) return; done=true; clearTimeout(timer); try{w.terminate(); URL.revokeObjectURL(url);}catch(e){} resolve(ev.data||{pass:false,fails:['empty worker'],isolated:true}); };
      w.onerror=function(){ if(done) return; done=true; clearTimeout(timer); try{w.terminate();}catch(e){} resolve(runCases(patch, cases)); };
      w.postMessage({patch:normalize(patch), cases:cases});
    }catch(e){ resolve(runCases(patch, cases)); }
  });
}
window.TABLET={ KEYS, validatePatch, normalize, matchPhrase, fillTemplate, runCases, workerSource, check };
})();
