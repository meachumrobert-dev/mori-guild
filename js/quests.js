/* quests.js (v3.6) — small quests across the Guild, the Retired Bard, Gravenmoor and Havenwall, plus the quest log.
   Quest types: fetch (reagents in your bag), cleanse (purge blight tiles), deliver (carry an item to another NPC), craft (have Mori brew/forge
   something after you accept, then hand it over), room (clear a dungeon room), chain (talk to NPCs in order).
   State is compact: S.quests[id] = {st:'active'|'done', n:counter, step, t}. NPCs offer and take quests through npcReply() actions. */
(function(){
'use strict';
let X=null;
const PLACE={guild:'the Guild', bard:'the Retired Bard', clan:'Gravenmoor', haven:'Havenwall'};
const Q=[
 {id:'pell_seeds', title:'Seeds for the Spring Beds', giver:'pell', place:'guild', type:'fetch', obj:{reag:{vinca_leaf:3, marigold:1}},
  desc:'Pell wants 3 Vinca Leaf and 1 Marigold Petals for the Guild herb beds.', offer:'My beds are bare as a bald dwarf. Bring me three Vinca Leaf and a handful of Marigold Petals? Herbs grow all round the Guild.',
  thanks:'Oh, lovely and fresh! These will root by morning.', reward:{gold:40, xp:150, item:{name:'Potion of Cure Light Wounds', cat:'Potion', kind:'potion', value:50, fx:{heal:'1d8+1'}}}},
 {id:'grizzik_ore', title:'Ore for the Forge', giver:'grizzik', place:'guild', type:'fetch', obj:{reag:{copper_ore:2}},
  desc:'Grizzik needs 2 Copper Ore for rivets.', offer:'Grizzik out of copper! Two Copper Ore, yes? Rocks with orange bits. You hit, you bring.',
  thanks:'Shiny! Good rivets now. Grizzik give you sharpening stone — very good stone, only bit chewed.', reward:{gold:60, xp:200, item:{name:"Grizzik's Whetstone", cat:'Trinket', kind:'trinket', value:2, note:'a sharpening stone, slightly chewed'}}},
 {id:'bard_song', title:'A Song for the House', giver:'lark', place:'bard', type:'chain', steps:['lark','tamsin','lark'],
  stepText:['Ask Tamsin at the bar what song the house wants.','Bring Tamsin\'s answer back to Lark.'],
  desc:'Lark wants to know which song the regulars like best. Ask Tamsin, then tell Lark.', offer:'I need a crowd-pleaser tonight. Would you ask Tamsin what the regulars actually want? She hears every grumble.',
  thanks:'"The Ballad of the Crooked Walls"? Of course it is. Thank you, friend — here, take a copy.', reward:{gold:25, xp:100, item:{name:"Lark's Song Sheet", cat:'Trinket', kind:'trinket', value:1, note:'The Ballad of the Crooked Walls'}}},
 {id:'oswin_room', title:'Sweep the Undercroft', giver:'oswin', place:'guild', type:'room', obj:{n:1},
  desc:'Warden Oswin asks you to clear one room of a dungeon (every foe in it defeated).', offer:'Something keeps scratching under the Undercroft floor. Clear one room down there, every foe in it, and the Guild will pay.',
  thanks:'Quiet below at last. Well done. The Guild keeps its word.', reward:{gold:80, xp:300, item:{name:'Potion of Cure Light Wounds', cat:'Potion', kind:'potion', value:50, fx:{heal:'1d8+1'}}}},
 {id:'vesk_bones', title:'Ink of the Grave', giver:'vesk', place:'clan', type:'fetch', obj:{reag:{bone_shards:3}},
  desc:'Vesk grinds bone for scroll ink. Bring 3 Bone Shards (skin skeletons or zombies).', offer:'My ink is running thin. Three Bone Shards would do it. The Undercroft\'s skeletons won\'t miss them.',
  thanks:'Excellent. Proper ink at last. A scroll for your trouble — read it from your bag.', reward:{xp:150, rep:{clan:5}, item:{name:'Scroll of False Life', cat:'Scroll', kind:'scroll', value:150, fx:{heal:'1d10+3'}}}},
 {id:'korrin_report', title:'The Gate Report', giver:'korrin', place:'clan', type:'deliver', to:'sefa', item:'Sealed Gate Report',
  desc:'Carry Korrin\'s sealed report to Sefa Greymane, the Moonfang Kin scout at Havenwall.', offer:'I can\'t leave the gate. Take this sealed report to Sefa Greymane at Havenwall. The Kin need to know where the blight walks at night.',
  thanks:'Korrin\'s seal. Good. Now we know where to hunt tonight.', reward:{gold:30, xp:150, rep:{clan:5, kin:5}}},
 {id:'dagna_shield', title:'Steel for the Siege', giver:'dagna', place:'clan', type:'craft', ev:'forge', what:'shield', hand:'Heavy Steel Shield (Grizzik)',
  desc:'Have Mori forge a Heavy Steel Shield (3 ore + 1 timber at Grizzik\'s forge), then bring it to Dagna for Havenwall\'s wall.', offer:'Havenwall\'s wall-wardens need shields and my anvil is buried in orders. Have your Mori and that goblin forge a Heavy Steel Shield, then bring it to me.',
  thanks:'Good weight, good rim. Goblin work, but honest. It goes to the wall tonight.', reward:{gold:120, xp:250, rep:{clan:5, haven:3}}},
 {id:'sefa_burn', title:'Burn It Back', giver:'sefa', place:'haven', type:'cleanse', obj:{n:6},
  desc:'Purge 6 tiles of the Coilblight at Havenwall (press E on blighted ground, or send Mori with the Kin).', offer:'The Kin hold the center, but the blight keeps creeping. Purge six tiles with us. Stand on the purple ground and press E.',
  thanks:'Six tiles. I smelled the difference from the wall. Take this — the Kin give it only to friends.', reward:{gold:40, xp:200, rep:{kin:8}, item:{name:'Moonfang Token', cat:'Trinket', kind:'trinket', value:10, note:'a wolf-tooth token of the Moonfang Kin'}}},
 {id:'wren_potion', title:'Warm Hands', giver:'wren', place:'haven', type:'craft', ev:'brew', what:'clw', hand:'Potion of Cure Light Wounds',
  desc:'Have Mori brew a Potion of Cure Light Wounds (2 herbs at the alchemy table) after accepting, and give it to Wren for the refugee tents.', offer:'Old Tobin\'s cough is getting worse and we have no healer. Could your Mori brew a Cure Light Wounds potion? I\'d trade you something I wove.',
  thanks:'Bless you. Tobin will sleep tonight. Here, it\'s not much, but I wove it myself.', reward:{gold:20, xp:150, rep:{haven:5}, item:{name:'Woven Wall Charm', cat:'Trinket', kind:'trinket', value:5, note:'woven by Wren of Havenwall'}}},
 {id:'oswin_fence', title:'A Word for the Fence', giver:'oswin', place:'guild', type:'talk', skill:'diplomacy', dc:12,
  keywords:/\b(persuade|diplomacy|please|reason|for the guild|fence fund|fund the fence|help the fence|consider|i ask|on behalf)\b/,
  goal:'Persuade Warden Oswin (Diplomacy) to open a fence-repair ledger.',
  desc:'Talk Oswin into funding fence repairs. Use Diplomacy — ask reasonably, for the Guild.', offer:'The south fence leans. I will not spend Guild gold on a hunch. Persuade me it is worth a ledger line.',
  thanks:'…Very well. A line in the ledger for fence timber. Well argued.', reward:{gold:35, xp:120},
  win:'(Diplomacy d20 {roll}{mod} = {tot} vs DC {dc}) Hmm. You argue like someone who pays dues. I will open a fence fund.',
  lose:'(Diplomacy d20 {roll}{mod} = {tot} vs DC {dc}) Not yet. Bring a clearer case — talk of the Guild, the fence, reason.'},
 {id:'korrin_path', title:'The Night Path', giver:'korrin', place:'clan', type:'talk', skill:'intimidate', dc:13,
  keywords:/\b(intimidate|scare|threaten|or else|tell me|blight path|night path|where (does|do) (it|the blight)|speak|demand)\b/,
  goal:'Intimidate Korrin (Intimidate) into naming tonight\'s blight path.',
  desc:'Press Korrin at the Ashen Gate until he names where the Coilblight walks tonight.', offer:'I do not gossip. If you want the night path, make me talk.',
  thanks:'East ditch, then the forge-wall. Now go. Do not make me regret this.', reward:{gold:25, xp:150, rep:{clan:3}},
  win:'(Intimidate d20 {roll}{mod} = {tot} vs DC {dc}) …Fine. East ditch, then the forge-wall. Do not die on it.',
  lose:'(Intimidate d20 {roll}{mod} = {tot} vs DC {dc}) No. The gate does not scare.'},
 {id:'tamsin_tab', title:'The Tab That Wasn\'t', giver:'tamsin', place:'bard', type:'talk', skill:'bluff', dc:14,
  keywords:/\b(bluff|lie|trick|pretend|i already paid|my tab|clan lord said|delroth said|on the house|believe me|honest)\b/,
  goal:'Bluff Tamsin (Bluff) into marking a tab "on the house".',
  desc:'Trick Tamsin — carefully — into wiping a small tab. Behave still applies: it is a game of wit, not cruelty.', offer:'You want a free bowl? Then lie well, love. I have heard every story twice.',
  thanks:'Ha! All right, one bowl on the house. Do not try that twice.', reward:{gold:15, xp:130, item:{name:"Tamsin's Free Bowl Marker", cat:'Trinket', kind:'trinket', value:1, note:'one free stew, already used'}},
  win:'(Bluff d20 {roll}{mod} = {tot} vs DC {dc}) …That almost sounded true. Fine. One bowl on the house. Shoo.',
  lose:'(Bluff d20 {roll}{mod} = {tot} vs DC {dc}) Nice try. I have heard worse from Legion. Pay like everyone else.'},

];
const BY={}; Q.forEach(q=>BY[q.id]=q);
const S=()=>{ const s=X.S(); if(!s.quests) s.quests={}; return s.quests; };
const st=id=>S()[id]||null;
function has(name){ return X.S().inv.some(i=>i.name===name||i.quest===name); }
function ready(id){ const q=BY[id], s=st(id); if(!q||!s||s.st!=='active') return false;
  if(q.type==='fetch'){ const R=X.S().reag||{}; return Object.entries(q.obj.reag).every(([k,n])=>(R[k]||0)>=n); }
  if(q.type==='cleanse'||q.type==='room') return (s.n||0)>=q.obj.n;
  if(q.type==='deliver') return X.S().inv.some(i=>i.quest===id);
  if(q.type==='craft') return (s.n||0)>=1&&has(q.hand);
  if(q.type==='chain') return (s.step||0)>=q.steps.length-2;
  if(q.type==='talk') return !!(s.n); return false; }
function turnTo(q){ return q.type==='deliver'?q.to:q.type==='chain'?q.steps[q.steps.length-1]:q.giver; }
function progress(id){ const q=BY[id], s=st(id); if(!s) return 'not started'; if(s.st==='done') return 'complete ✓'; const R=X.S().reag||{};
  if(q.type==='fetch') return Object.entries(q.obj.reag).map(([k,n])=>Math.min(n,R[k]||0)+'/'+n+' '+(window.GATHERING?GATHERING.R[k].name:k)).join(', ');
  if(q.type==='cleanse') return Math.min(q.obj.n,s.n||0)+'/'+q.obj.n+' tiles purged'; if(q.type==='room') return Math.min(q.obj.n,s.n||0)+'/'+q.obj.n+' rooms cleared';
  if(q.type==='deliver') return ready(id)?'bring the '+q.item+' to '+npcName(q.to):'(the item is lost — ask '+npcName(q.giver)+' again)';
  if(q.type==='craft') return (s.n?'made ✓':'ask Mori to '+(q.ev==='brew'?'brew':'forge')+' it')+(s.n&&!has(q.hand)?' — but it is not in your bag':'')+' · then give it to '+npcName(q.giver);
  if(q.type==='chain') return q.stepText[Math.min(q.stepText.length-1,s.step||0)];
  if(q.type==='talk') return (s.n?'talk goal met — turn in to '+npcName(q.giver):'Talk goal: '+q.goal+' (try keywords for '+q.skill+')'); return ''; }
const npcName=id=>window.NPCS&&NPCS.byId(id)?NPCS.byId(id).name:id;
function offerFor(npcId){ return Q.find(q=>q.giver===npcId&&!st(q.id))||null; }
function activeFor(npcId){ return Q.filter(q=>st(q.id)&&st(q.id).st==='active'&&(q.giver===npcId||turnTo(q)===npcId||(q.type==='chain'&&q.steps.includes(npcId)))); }
function accept(id){ const q=BY[id]; if(!q||st(id)) return null; S()[id]={st:'active', n:0, step:0, t:Date.now()};
  if(q.type==='deliver') X.addItem({name:q.item, cat:'Quest', kind:'quest', value:0, quest:id});
  X.log('📜 Quest accepted: '+q.title+' — '+q.desc); X.save(); return q; }
function reward(q){ const r=q.reward||{}, out=[]; const s=X.S(); if(r.gold){ const pay=(window.TREASURY?TREASURY.payBounty(r.gold):{gold:r.gold,tier:'ok'}); s.gold+=pay.gold; out.push('+'+pay.gold+' gold'+(pay.tier==='healthy'&&pay.gold>(r.gold|0)?' (treasury bonus)':pay.tier==='low'&&pay.gold<(r.gold|0)?' (lean treasury)':'')+' · from Guild Marks'); } if(r.xp){ s.qxp=(s.qxp||0)+r.xp; out.push('+'+r.xp+' XP'); }
  if(r.rep) for(const f in r.rep){ X.rep(f,r.rep[f]); out.push((f==='clan'?'Clan':f==='kin'?'Moonfang Kin':'Havenwall')+' +'+r.rep[f]); }
  if(r.item){ X.addItem(JSON.parse(JSON.stringify(r.item))); out.push(r.item.name); } return out.join(' · '); }
function turnIn(id, npcId){ const q=BY[id]; if(!q||!ready(id)||turnTo(q)!==npcId) return null; const s=X.S();
  if(q.type==='fetch'){ for(const k in q.obj.reag) s.reag[k]-=q.obj.reag[k]; }
  if(q.type==='deliver'){ const i=s.inv.findIndex(x=>x.quest===id); if(i>=0) s.inv.splice(i,1); }
  if(q.type==='craft'){ const i=s.inv.findIndex(x=>x.name===q.hand&&!x.equipped); const j=i>=0?i:s.inv.findIndex(x=>x.name===q.hand); if(j>=0) s.inv.splice(j,1); }
  st(id).st='done'; st(id).done=Date.now(); const rw=reward(q); X.log('✦ Quest complete: '+q.title+' — '+rw); X.showRoll&&X.showRoll('📜',q.title+' complete: '+rw,'crit'); X.save(); return {q, reward:rw}; }
/* events from the game: purge / cleanse (tiles), room (dungeon room cleared), brew / forge (job finished), talk (chain steps) */
function event(type, a, b){ const out=[]; Q.forEach(q=>{ const s=st(q.id); if(!s||s.st!=='active') return;
  if(type==='purge'&&q.type==='cleanse'){ s.n=(s.n||0)+(a||1); out.push(q); }
  if(type==='room'&&q.type==='room'){ s.n=(s.n||0)+1; out.push(q); }
  if((type==='brew'||type==='forge')&&q.type==='craft'&&q.ev===type&&q.what===a){ s.n=(s.n||0)+1; out.push(q); }
  if(type==='talk'&&q.type==='chain'){ const nx=q.steps[(s.step||0)+1]; if(nx===a&&(s.step||0)<q.steps.length-2){ s.step=(s.step||0)+1; out.push(q); } }
  if(type==='talkcheck'&&q.type==='talk'&&q.giver===a&&!s.n){ s.n=1; s.skill=b; out.push(q); } });
  out.forEach(q=>{ if(ready(q.id)) X.log('📜 '+q.title+': ready to turn in to '+npcName(turnTo(q))+'.'); }); if(out.length) X.save(); return out; }
function counts(){ const s=S(); let a=0,d=0; Q.forEach(q=>{ if(s[q.id]) (s[q.id].st==='done'?d++:a++); }); return {total:Q.length, active:a, done:d, open:Q.length-a-d}; }
function panelHTML(){ const s=S(); const row=q=>{ const x=s[q.id]; const rd=ready(q.id); const r=q.reward||{};
    const gPay=r.gold?(window.TREASURY?TREASURY.scaleGold(r.gold):r.gold):0;
    const rw=[r.gold?gPay+' gold'+(window.TREASURY?TREASURY.rewardNote(r.gold):''):'', r.xp?r.xp+' XP':'', r.rep?Object.entries(r.rep).map(([f,n])=>(f==='clan'?'Clan':f==='kin'?'Kin':'Havenwall')+' +'+n).join(', '):'', r.item?r.item.name:''].filter(Boolean).join(' · ');
    const goal=q.type==='talk'?('<div class="small"><b>Talk goal:</b> '+q.goal+' · '+q.skill+' DC '+q.dc+'</div>'):'';
    return '<div class="qrow '+(x?x.st:'open')+'" data-q="'+q.id+'"><div><b>'+(x&&x.st==='done'?'✓ ':rd?'★ ':x?'• ':'○ ')+q.title+'</b> <span class="small">'+PLACE[q.place]+' · '+npcName(q.giver)+'</span></div>'+goal+
      '<div class="small">'+(x?progress(q.id)+(rd?' — <b>ready to turn in to '+npcName(turnTo(q))+'</b>':''):'Talk to '+npcName(q.giver)+' ('+PLACE[q.place]+') to start.')+'</div><div class="small">Reward: '+rw+'</div></div>'; };
  const c=counts(); let h=(window.TREASURY?TREASURY.panelHTML():'')+'<div class="small">'+c.active+' active · '+c.done+' complete · '+c.open+' not started. Talk to people (E or 💬 Talk near them) to take quests; ask them "any work?". Quest gold comes from the Guild treasury.</div>';
  const act=Q.filter(q=>s[q.id]&&s[q.id].st==='active'), open=Q.filter(q=>!s[q.id]), done=Q.filter(q=>s[q.id]&&s[q.id].st==='done');
  if(window.CLAN&&CLAN.ready){ const w=CLAN.st(); h+='<div class="sec">Main quest</div><div class="qrow '+(w.q>=4?'done':w.q?'active':'open')+'"><div><b>'+(w.q>=4?'✓ ':'• ')+'The Promise of the Pale Mantle</b> <span class="small">Havenwall · Brakka Coalgrin</span></div><div class="small">'+(['Talk to Brakka at the Dragon\'s Forge in Havenwall.','Take the Mantle from the Hold of Many in Gravenmoor.','Cleanse the Coilblight at Havenwall ('+Math.min(12,w.qn||0)+'/12).','Bring the Mantle back to Brakka.','complete ✓'][Math.min(4,w.q||0)])+'</div></div>'; }
  if(act.length) h+='<div class="sec">Active</div>'+act.map(row).join(''); if(open.length) h+='<div class="sec">Not started</div>'+open.map(row).join(''); if(done.length) h+='<div class="sec">Complete</div>'+done.map(row).join(''); return h; }
function openTalk(npcId){ return Q.filter(q=>q.type==='talk'&&q.giver===npcId&&!st(q.id)); }
window.QUESTS={ init(o){ X=o; }, list:Q, byId:id=>BY[id], state:st, ready, progress, offerFor, openTalk, activeFor, accept, turnIn, turnTo, event, counts, panelHTML, PLACE, reward, reset(){ X.S().quests={}; } };
})();
