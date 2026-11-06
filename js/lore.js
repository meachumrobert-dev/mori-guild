/* lore.js (v3.6) — Collectible lore / story cards. SRD-safe; uses Demon Clan canon names already in the game. */
(function(){
'use strict';
let X=null;
const CARDS=[
 // cities
 {id:'city_guild', kind:'city', title:'The Guild · Thalulfall Reach', blurb:'The planet\'s starting point. Hall, forge, Item Bench, the Retired Bard, and the Undercroft. Mori builds here; Warden Oswin keeps the ledger.', unlock:'visit_guild'},
 {id:'city_gravenmoor', kind:'city', title:'Gravenmoor', blurb:'Demon Clan city-state under the Compact. Clan Lord Delroth\'s seat (the Hold of Many) stays empty while he holds court at the Retired Bard. Legion keeps the streets; the Death of Earth wards the Ashen Gate.', unlock:'visit_clan'},
 {id:'city_havenwall', kind:'city', title:'Havenwall', blurb:'Sister city under siege by the Coilblight. Moonfang Kin hold the center; Clan raids the edges; Brakka Coalgrin keeps everyone in armor at the Dragon\'s Forge.', unlock:'visit_haven'},
 // factions
 {id:'fac_clan', kind:'faction', title:'The Demon Clan Compact', blurb:'Ruled by Clan Lord Delroth. Motto: "We are many." Allies of Havenwall and the Guild against the Coilblight. SRD necromancy on scrolls only — nothing trademarked.', unlock:'visit_clan'},
 {id:'fac_kin', kind:'faction', title:'Moonfang Kin', blurb:'Wolf-kin scouts who hold Havenwall\'s heart and burn the Coilblight outward, tile by tile. Led in the field by Sefa Greymane.', unlock:'meet_sefa'},
 {id:'fac_guild', kind:'faction', title:'The Guild', blurb:'Three rules: pay your dues, mind the fence, and be kind to Mori. She asks only that everyone behave.', unlock:'visit_guild'},
 // creatures / threats
 {id:'cre_coilblight', kind:'creature', title:'The Coilblight', blurb:'Necromancy gone wrong — a creeping purple corruption that eats gardens, leather and nails. Purge it by standing on blighted ground and pressing E, or send Mori with the Kin.', unlock:'see_blight'},
 {id:'cre_legion', kind:'creature', title:'Legion', blurb:'Smoke-demon lieutenant of Gravenmoor. "I am Legion, for we are many." Do not try to count them.', unlock:'visit_clan'},
 {id:'cre_death', kind:'creature', title:'The Death of Earth', blurb:'Warden of the Ashen Gate. A rarely-seen presence that bows to those gentle with the living. Appears beside Delroth\'s Dread Lord form.', unlock:'dread_lord'},
 {id:'cre_undercroft', kind:'creature', title:'Undercroft Foes', blurb:'Skeletons, zombies and a boss chest under the Guild. Clear a room for Warden Oswin. Bone Shards skin from the dead for Vesk\'s ink.', unlock:'enter_dungeon'},
 // NPCs (unlocked on meet)
 {id:'npc_oswin', kind:'npc', title:'Warden Oswin Hale', blurb:'Guild Hall steward. Formal, dutiful, dry humor. Keeps every job and visitor in the ledger.', unlock:'meet_oswin'},
 {id:'npc_pell', kind:'npc', title:'Pell Thistlewick', blurb:'Halfling herb-keeper. Talks to seedlings. Knows which leaves cure a stomachache.', unlock:'meet_pell'},
 {id:'npc_merra', kind:'npc', title:'Merra Quill', blurb:'Gnome bench artificer. Prices by the SRD. Re-sorted the bench so what you can make sits at the top.', unlock:'meet_merra'},
 {id:'npc_grizzik', kind:'npc', title:'Grizzik', blurb:'Goblin smith. Makes the hammer go BANG. Paid in sausages. Cousin-or-aunt of Brakka.', unlock:'meet_grizzik'},
 {id:'npc_tamsin', kind:'npc', title:'Tamsin Alebright', blurb:'Dwarf barkeep of the Retired Bard. Forty years of stew and gossip.', unlock:'meet_tamsin'},
 {id:'npc_lark', kind:'npc', title:'Lark Fennimore', blurb:'Half-elf bard. Sings between Delroth\'s monologues. Writing a ballad where the Coilblight loses.', unlock:'meet_lark'},
 {id:'npc_vesk', kind:'npc', title:'Vesk Inkwell', blurb:'Clan scribe. Sells SRD necromancy scrolls. Grinds bone for ink.', unlock:'meet_vesk'},
 {id:'npc_korrin', kind:'npc', title:'Korrin Ashhand', blurb:'Half-orc gate guard of the Ashen Gate. Night shift. Respects the Death of Earth.', unlock:'meet_korrin'},
 {id:'npc_dagna', kind:'npc', title:'Dagna Cinderjaw', blurb:'Clan smith. Competitive with Brakka and Grizzik. Always making shields for Havenwall\'s wall.', unlock:'meet_dagna'},
 {id:'npc_brakka', kind:'npc', title:'Brakka Coalgrin', blurb:'Goblin Armor Smith of the Dragon\'s Forge. Rules of the shopkeeper: you break it, it\'s yours. Holds the Pale Wolf\'s Mantle quest.', unlock:'meet_brakka'},
 {id:'npc_sefa', kind:'npc', title:'Sefa Greymane', blurb:'Moonfang Kin scout. Short hunting metaphors. Protective of the refugee tents.', unlock:'meet_sefa'},
 {id:'npc_tobin', kind:'npc', title:'Tobin Marsh', blurb:'Refugee farmer. Barley downs taken by blight. Mends Havenwall\'s stones.', unlock:'meet_tobin'},
 {id:'npc_wren', kind:'npc', title:'Wren Hollis', blurb:'Refugee weaver. Keeps the tents fed and ordered. Wants a Cure Light for Tobin\'s cough.', unlock:'meet_wren'},
 {id:'npc_delroth', kind:'npc', title:'Clan Lord Delroth', blurb:'Undead Catfolk Dread Necromancer · Lv 60 (epic). Dark charcoal fur, red scars, glowing green eyes, always the +5 HAT. Locked canon. His Dread Lord form is temporary.', unlock:'meet_delroth'},
 {id:'npc_mori', kind:'npc', title:'Mori', blurb:'Guild builder engine. Rule #1: behave. Kind, honest, harmless. Points people toward real human connection.', unlock:'meet_mori'},
 {id:'npc_doll', kind:'npc', title:'Mori Doll (shopkeeper)', blurb:'Grumpy stall by the Guild lawn. "Stay off my lawn." Trades Life→LARPy, sells lawn tokens and cheap cursed knockoffs that whisper "You are now a loyal follower of Delroth."', unlock:'meet_doll'}
];
const BY={}; CARDS.forEach(c=>BY[c.id]=c);
function unlocked(){ const s=X.S(); if(!s.lore) s.lore={}; return s.lore; }
function has(id){ return !!unlocked()[id]; }
function unlock(id, silent){ const c=BY[id]; if(!c) return null; const u=unlocked(); if(u[id]) return null; u[id]={t:Date.now()}; if(!silent) X.log&&X.log('🃏 Lore card: '+c.title); X.save&&X.save(); return c; }
function unlockFlag(flag, silent){ const out=[]; CARDS.forEach(c=>{ if(c.unlock===flag){ const r=unlock(c.id, silent); if(r) out.push(r); } }); return out; }
function meet(npcId){ return unlockFlag('meet_'+npcId); }
function list(kind){ return CARDS.filter(c=>(!kind||c.kind===kind)); }
function counts(){ const u=unlocked(); let n=0; CARDS.forEach(c=>{ if(u[c.id]) n++; }); return {total:CARDS.length, have:n}; }
function panelHTML(){ const u=unlocked(), c=counts(); const kinds=['city','faction','creature','npc','herb'];
  let h='<div class="small">'+c.have+'/'+c.total+' cards. Unlocked when you meet, gather or discover them. Herb entries are folklore — not medical advice. SRD-safe · Demon Clan canon.</div>';
  kinds.forEach(k=>{ const rows=list(k); h+='<div class="sec">'+k+'s</div>';
    rows.forEach(card=>{ const on=!!u[card.id]; h+='<div class="lorecard '+(on?'on':'off')+'"><div><b>'+(on?card.title:'???')+'</b> <span class="small">'+card.kind+'</span></div><div class="small">'+(on?card.blurb:'Meet or discover this to unlock.')+'</div></div>'; });
  }); return h; }
function register(card){ if(!card||!card.id||BY[card.id]) return false; CARDS.push(card); BY[card.id]=card; return true; }
window.LORE={ CARDS, init(o){ X=o; if(window.HERBAL){ HERBAL.loreCards().forEach(register); } }, has, unlock, unlockFlag, meet, list, counts, panelHTML, byId:id=>BY[id], register };
})();
