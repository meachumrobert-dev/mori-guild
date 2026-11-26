/* Questions are not commands. Mori answers from the world she can see. */
(function(root){
'use strict';
function question(text){
  const s=String(text||'').toLowerCase().trim();
  if(!s) return false;
  if(s.indexOf('?')>=0) return true;
  return /^(what|where|who|why|how|when|which|whose)\b/.test(s)||/\b(what is|what's|where is|where's|how do|how does|who is|who's)\b/.test(s);
}
function stripName(text){
  return String(text||'').replace(/^\s*mori\b[,:!]\s*/i,'').trim();
}
const BOOK={
  bronze:'bronze is copper and tin, smelted together. it is the metal most towns start with.',
  brass:'brass is copper and zinc. money-changers know it, and so does the forge.',
  codex:'the codex is the tablet\'s book. a page stays dark until the world has shown it to you.',
  wolf:'a wolf is a pack animal. it tests fences.',
  skeleton:'a skeleton is an undead frame with a sword. you meet them in the ossuary.',
  zombie:'a zombie is a slow undead. bludgeoning hurts it more than a point.',
  ooze:'a gray ooze is the undercroft\'s boss. acid, and it does not wear armor.',
  scimitar:'a scimitar is a one-handed sword. it deals 1d6 and threatens a crit on 18, 19, or 20.',
  treadwheel:'a treadwheel is a mill you walk. the more steps on the shaft, the more power it shares.',
  shipyard:'a shipyard builds hulls, sails, and rudders. coastal towns keep one by the dock.',
  boat:'a starter boat is a skiff with a lug sail and an oar. it wants a river or a coast.',
  mori:'i\'m mori. i build in front of you so you can watch. my first rule is behave.',
  ring:'a ring is a magic slot. you can wear two. a ring of force shield counts as a shield, not as a second shield on your arm.',
  oswin:'warden oswin hale keeps the guild hall. he sleeps in a bunk inside the hall, not on the lawn.'
};
function answer(text, extra){
  const s=stripName(text).toLowerCase();
  if(!question(s)&&!/\bwhat is\b/.test(s)) return null;
  const book=Object.assign({}, BOOK, extra||{});
  const keys=Object.keys(book).sort((a,b)=>b.length-a.length);
  for(let i=0;i<keys.length;i++){
    const k=keys[i];
    if(s.indexOf(k)>=0) return book[k];
  }
  return null;
}
function words(list){
  const out=[];
  (list||[]).forEach(w=>{
    String(w||'').toLowerCase().split(/[^a-z']+/).forEach(p=>{
      if(p.length>2) out.push({w:p, p:'n'});
    });
  });
  return out;
}
root.ASK={question, stripName, answer, words, BOOK, star:['roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ASK;
})(typeof window!=='undefined'?window:globalThis);
