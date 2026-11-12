/* One router for Tablet fingers. Each finger is a single data change on one hook.
   The hooks themselves stay small. Existing hosts (GATHERING, QUESTS, TREASURY, …) are not wrapped. */
(function(){
'use strict';
const notes=[];
const RECIPENOTES={
  list(){ return notes.slice(); },
  add(p){ if(!p||notes.some(n=>n.id===p.id)) return null; notes.push({id:p.id, label:p.label, note:p.note||''}); return p; },
  restore(){ notes.length=0; }
};
function apply(f){
  if(!f||!f.kind) return false;
  if(f.kind==='vocab'&&window.LEXICON){ LEXICON.addLemmas(f.id, f.add||[]); return true; }
  if((f.kind==='intent'||f.kind==='template')&&window.MORICHAT){ MORICHAT.addFinger(f); return true; }
  if(f.kind==='furniture'&&window.FURNITURE){ return !!FURNITURE.addPiece({id:f.id, kind:f.piece, name:f.name, flavor:f.flavor||'', x:f.x, z:f.z}); }
  if(f.kind==='recipe'){ return !!RECIPENOTES.add(f); }
  return false;
}
function restore(){
  if(window.LEXICON&&LEXICON.restore) LEXICON.restore();
  if(window.MORICHAT&&MORICHAT.restore) MORICHAT.restore();
  if(window.FURNITURE&&FURNITURE.restore) FURNITURE.restore();
  RECIPENOTES.restore();
}
function reapply(patches){
  restore();
  (patches||[]).forEach(p=>{
    const fingers=(p&&p.fingers)||[];
    fingers.forEach(apply);
    (p.vocab||[]).forEach(v=>apply({kind:'vocab', id:v.id, add:v.add}));
    (p.intents||[]).forEach(it=>apply({kind:'intent', id:it.id, any:it.any, template:it.template}));
    if(p.templates) Object.keys(p.templates).forEach(id=>apply({kind:'template', id, text:p.templates[id]}));
  });
}
window.RECIPENOTES=RECIPENOTES;
window.FINGERS={ kinds:['vocab','intent','template','furniture','recipe'], apply, restore, reapply };
})();