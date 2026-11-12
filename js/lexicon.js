/* Compact game lexicon. Synsets (a lemma plus paraphrases) are the idea behind
   Princeton WordNet, but this file is original text written for Mori Guild.
   It is not a copy of the WordNet database, so the WordNet license does not apply.
   See GROUNDING.md. */
(function(){
'use strict';
const SYNSETS=[
  {id:'greet.v', lemmas:['hi','hello','hey','hiya','howdy','yo','greetings','well met']},
  {id:'ruler.n', lemmas:['ruler','rules','rule','in charge','who leads','who governs','sovereign','governor','who runs']},
  {id:'city.n', lemmas:['city-state','city-states','city state','cities','city']},
  {id:'find.v', lemmas:['where','find','locate','look for','seek']},
  {id:'quest.n', lemmas:['quest','quests','mission','missions','task','tasks','any work']},
  {id:'herb.n', lemmas:['herb','herbs','flower','flowers','plant','plants']}
];
const PHRASES={
  ruler:['who rules','who rules here','who is in charge','who\'s in charge','whos in charge','ruler of','who leads','who governs','who runs this','in charge here'],
  cities:['city-states','city states','tell me about the cities','about the city','what cities','which cities','the cities'],
  quests:['quest status','my quests','how are my quests','what quests','any quests','anything to do']
};
function synset(id){ return SYNSETS.find(s=>s.id===id)||null; }
function covers(text, id){ const s=synset(id); const t=String(text||'').toLowerCase(); if(!s) return false; return s.lemmas.some(l=>t.indexOf(l)>=0); }
function phrases(id){ return (PHRASES[id]||[]).slice(); }
function hasPhrase(text, id){ const t=String(text||'').toLowerCase(); return phrases(id).some(p=>t.indexOf(p)>=0); }
function hasLemma(text, id){ const s=synset(id); const t=String(text||'').toLowerCase(); if(!s) return false;
  return s.lemmas.some(l=>{ if(l==='rule'||l==='rules') return false; if(l.includes(' ')) return t.indexOf(l)>=0; return new RegExp('\\b'+l.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(t); });
}
const BASE=SYNSETS.map(s=>({id:s.id, lemmas:s.lemmas.slice()}));
function restore(){ SYNSETS.length=0; BASE.forEach(s=>SYNSETS.push({id:s.id, lemmas:s.lemmas.slice()})); }
window.LEXICON={ SYNSETS, PHRASES, synset, covers, phrases, hasPhrase, hasLemma, restore,
  addLemmas(id, extra){ const s=synset(id); const add=(extra||[]).map(w=>String(w||'').toLowerCase().trim()).filter(w=>w && w.length<40); if(!s){ SYNSETS.push({id, lemmas:add}); return add; } add.forEach(w=>{ if(s.lemmas.indexOf(w)<0) s.lemmas.push(w); }); return s.lemmas.slice(); }
};
})();
