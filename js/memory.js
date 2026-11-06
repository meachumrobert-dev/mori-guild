/* memory.js (v3.6) — Memory book + bond meters. Memories are never silently wiped; the player forgets them.
   Bonds: Stranger → Acquaintance → Friend → Trusted → Sworn. Trusted unlocks a small perk (5% coupon or unique line). */
(function(){
'use strict';
const TIERS=['Stranger','Acquaintance','Friend','Trusted','Sworn'];
const NEED=[0,3,10,22,40]; // cumulative bond XP to reach each tier
let X=null;
function bag(){ const s=X.S(); if(!s.bonds) s.bonds={}; if(!s.memBook) s.memBook={}; return s; }
function entry(id){ const s=bag(); if(!s.bonds[id]) s.bonds[id]={xp:0, perk:false}; return s.bonds[id]; }
function book(id){ const s=bag(); if(!s.memBook[id]) s.memBook[id]=[]; return s.memBook[id]; }
function tierOf(xp){ let t=0; for(let i=0;i<NEED.length;i++) if(xp>=NEED[i]) t=i; return t; }
function bond(id){ const e=entry(id); return {xp:e.xp|0, tier:tierOf(e.xp|0), name:TIERS[tierOf(e.xp|0)], perk:!!e.perk, next:NEED[Math.min(NEED.length-1,tierOf(e.xp|0)+1)]}; }
function bondName(id){ return bond(id).name; }
function addXP(id, n, why){ const e=entry(id); const before=tierOf(e.xp|0); e.xp=(e.xp|0)+Math.max(0,n|0); const after=tierOf(e.xp); if(after>before){ X.log&&X.log('💛 Bond with '+(X.npcName?X.npcName(id):id)+' → '+TIERS[after]); if(after>=3&&!e.perk){ e.perk=true; X.log&&X.log('✦ Trusted perk: 5% off their prices / a private word.'); } } if(why) addMem(id, why, 'bond'); X.save&&X.save(); return bond(id); }
function addMem(id, text, src){ if(!text) return null; const list=book(id); const t=String(text).slice(0,240); if(list.some(m=>m.text===t&&!m.forgotten)) return list.find(m=>m.text===t); const m={id:'m'+Date.now().toString(36)+Math.floor(Math.random()*1e3).toString(36), text:t, src:src||'chat', t:Date.now(), pinned:false, forgotten:false}; list.push(m); if(list.length>80){ /* drop oldest unpinned forgotten-eligible only if forgotten; never silent-wipe live ones — cap by marking oldest non-pinned as archived */
  const live=list.filter(x=>!x.forgotten); if(live.length>60){ const old=live.filter(x=>!x.pinned).sort((a,b)=>a.t-b.t)[0]; if(old) old.archived=true; } }
  X.save&&X.save(); return m; }
function pinMem(id, mid){ const m=book(id).find(x=>x.id===mid); if(!m||m.forgotten) return null; m.pinned=true; addXP(id,1,'Pinned: '+m.text); X.save&&X.save(); return m; }
function unpinMem(id, mid){ const m=book(id).find(x=>x.id===mid); if(m) m.pinned=false; X.save&&X.save(); return m; }
function forgetMem(id, mid){ const m=book(id).find(x=>x.id===mid); if(!m) return null; m.forgotten=true; m.pinned=false; X.save&&X.save(); return m; }
function listMem(id, opts){ const all=book(id); const showForgotten=opts&&opts.forgotten; return all.filter(m=>showForgotten?m.forgotten:!m.forgotten&&!m.archived); }
function pinned(id){ return listMem(id).filter(m=>m.pinned); }
function onTalk(id){ return addXP(id,1); }
function onGift(id, itemName){ addMem(id,'You gave them '+(itemName||'a gift')+'.','gift'); return addXP(id,3,'Gift: '+(itemName||'something')); }
function onQuest(id, title){ addMem(id,'You finished "'+title+'" for them.','quest'); return addXP(id,5); }
function onPinChat(id, text){ return addMem(id, text, 'pin'); }
function coupon(id){ const b=bond(id); return b.tier>=3?0.95:1; } // Trusted+ → 5% off
function personaLine(persona){ if(!persona) return ''; const bits=[]; if(persona.name) bits.push(persona.name); if(persona.race) bits.push(persona.race); if(persona.cls) bits.push(persona.cls); if(persona.background) bits.push(persona.background); return bits.join(', '); }
function recallLine(id, persona){ const b=bond(id); const pins=pinned(id); const bits=[]; if(b.tier>=1&&persona&&persona.name) bits.push('I know you, '+persona.name+(persona.cls?' the '+persona.cls:'')+'.'); if(pins.length) bits.push('I still hold this: "'+pins[0].text+'"'); else { const live=listMem(id).slice(-2); if(live.length) bits.push('I remember: '+live.map(m=>'"'+m.text+'"').join('; ')+'.'); } if(b.tier>=3) bits.push('(Trusted — you have my ear.)'); return bits.join(' '); }
function panelHTML(){ const s=bag(); const ids=Object.keys(s.bonds).concat(Object.keys(s.memBook)); const uniq=[...new Set(ids)];
  let h='<div class="small">Memories are never wiped silently. You can forget any one. Bond rises from talk, gifts, quests and pins. Trusted unlocks a 5% perk.</div>';
  if(!uniq.length) return h+'<div class="small">No bonds yet — talk to someone (E).</div>';
  uniq.forEach(id=>{ const b=bond(id); const name=X.npcName?X.npcName(id):id; const live=listMem(id); const forg=listMem(id,{forgotten:true});
    h+='<div class="qrow"><div><b>'+name+'</b> · <span class="chip">'+b.name+'</span> <span class="small">'+b.xp+' XP'+(b.tier<4?' · next '+b.next:'')+(b.perk?' · perk ✓':'')+'</span></div>';
    if(live.length){ h+='<div class="sec">Memories</div>'+live.map(m=>'<div class="mem'+(m.pinned?' pin':'')+'" data-mid="'+m.id+'" data-npc="'+id+'"><span>'+(m.pinned?'📌 ':'')+m.text+'</span><span class="row"><button data-pinmem="'+(m.pinned?'0':'1')+'">'+(m.pinned?'Unpin':'Pin')+'</button><button data-forget="1">Forget</button></span></div>').join(''); }
    else h+='<div class="small">No memories yet.</div>';
    if(forg.length) h+='<div class="small">Forgotten ('+forg.length+') — kept for honesty, not shown to NPCs.</div>';
    h+='</div>'; });
  return h; }
function bindPanel(root){ if(!root) return; root.querySelectorAll('[data-forget]').forEach(b=>b.onclick=()=>{ const row=b.closest('[data-mid]'); forgetMem(row.dataset.npc, row.dataset.mid); if(X.renderMemory) X.renderMemory(); });
  root.querySelectorAll('[data-pinmem]').forEach(b=>b.onclick=()=>{ const row=b.closest('[data-mid]'); if(b.dataset.pinmem==='1') pinMem(row.dataset.npc, row.dataset.mid); else unpinMem(row.dataset.npc, row.dataset.mid); if(X.renderMemory) X.renderMemory(); }); }
window.MEMORY={ TIERS, NEED, init(o){ X=o; }, bond, bondName, addXP, addMem, pinMem, unpinMem, forgetMem, listMem, pinned, onTalk, onGift, onQuest, onPinChat, coupon, recallLine, personaLine, panelHTML, bindPanel, entry, book };
})();
