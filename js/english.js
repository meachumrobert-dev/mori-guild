/* Small American-English helpers for Mori. She still speaks in her own voice.
   These only keep agreement, articles, and lists honest. */
(function(){
'use strict';
function article(word){ const w=String(word||'').trim(); if(!w) return 'a'; return /^[aeiou]/i.test(w)?'an':'a'; }
function plural(word, n){ const w=String(word||''); if(n===1) return w; if(/[^aeiou]y$/i.test(w)) return w.slice(0,-1)+'ies'; if(/(s|x|z|ch|sh)$/i.test(w)) return w+'es'; return w+'s'; }
function oxford(items){ const a=(items||[]).filter(Boolean); if(!a.length) return ''; if(a.length===1) return a[0]; if(a.length===2) return a[0]+' and '+a[1]; return a.slice(0,-1).join(', ')+', and '+a[a.length-1]; }
function agree(n, one, many){ return (n===1?one:many); }
function fill(template, slots){ return String(template||'').replace(/\{([a-z]+)\}/g,(m,k)=>slots&&slots[k]!=null?String(slots[k]):''); }
window.ENGLISH={ article, plural, oxford, agree, fill };
})();
