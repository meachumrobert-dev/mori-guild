/* treasury.js (v3.7) — Mori's guild treasury, funded by Mori Marks her building mints.
   Quest gold bounties are paid from this purse. Low balance scales bounties down (with a floor so
   quests are never unpaid) and nudges bandit-raid chance up; a healthy treasury allows bonus bounties.
   No energy timers, no paywalls. */
(function(){
'use strict';
const MINT={1:8,2:12,3:22,4:45}; // Marks minted per seed-stage advance
const LOW=100, HEALTHY=500, FLOOR_MULT=0.4, BONUS_MULT=1.15, START=180;
let X=null, raidAcc=0;
function bag(){ const s=X.S(); if(!s.treasury) s.treasury={marks:START, paid:0, minted:0, raids:0, lastRaid:0}; if(s.treasury.marks==null) s.treasury.marks=START; return s.treasury; }
function balance(){ return bag().marks|0; }
function mint(n, why){ const t=bag(); const a=Math.max(0,n|0); t.marks+=a; t.minted=(t.minted||0)+a; if(why&&a&&X.log&&Math.random()<0.2) X.log('🪙 Guild treasury +'+a+' Mori Marks ('+why+').'); return t.marks; }
function mintStage(st, name){ const a=MINT[st]|0; if(a) mint(a, 'seeded '+(name||('stage '+st))); return a; }
function tier(){ const m=balance(); return m>=HEALTHY?'healthy':m>=LOW?'ok':'low'; }
function bountyMult(){ const t=tier(); return t==='healthy'?BONUS_MULT:t==='low'?FLOOR_MULT:1; }
function scaleGold(base){ base=base|0; if(!base) return 0; const m=bountyMult(); let pay=Math.round(base*m); const floor=Math.max(1, Math.round(base*FLOOR_MULT)); if(pay<floor) pay=floor; return pay; }
/* Pay a quest bounty from the treasury. Always pays at least the floor; treasury can hit 0 but the adventurer is never stiffed. */
function payBounty(base){ const want=scaleGold(base); const t=bag(); const took=Math.min(t.marks, want); t.marks-=took; t.paid=(t.paid||0)+want;
  const short=want-took; // covered by Mori's word (floor guarantee)
  return {gold:want, fromTreasury:took, covered:short, mult:bountyMult(), tier:tier(), base:base|0}; }
function raidChance(){ const t=tier(); return t==='low'?0.11:t==='ok'?0.04:0.015; } // per check (~every few seconds scaled in tryRaid)
function tryRaid(dt){ if(!X||(X.mode&&X.mode()!=='world')) return null; raidAcc+=dt; if(raidAcc<4.5) return null; raidAcc=0;
  const ch=raidChance(), roll=Math.random(); if(roll>=ch) return null;
  const t=bag(); const now=Date.now(); if(t.lastRaid&&now-t.lastRaid<45000) return null; // cooldown
  t.lastRaid=now; t.raids=(t.raids||0)+1; return {chance:ch, roll, tier:tier(), marks:balance()}; }
function panelHTML(){ const t=bag(), m=balance(), tr=tier(), mult=bountyMult();
  const tip=tr==='healthy'?'Healthy — bonus bounties (+'+Math.round((BONUS_MULT-1)*100)+'%).':tr==='low'?'Low — bounties scaled down (floor '+Math.round(FLOOR_MULT*100)+'%), bandits smell it.':'Steady — full bounties.';
  return '<div class="sec">Guild treasury</div><div class="row"><span class="chip">🪙 '+m+' Mori Marks</span><span class="chip">'+tr+' · ×'+mult.toFixed(2)+'</span><span class="chip">bandit risk '+(raidChance()*100).toFixed(0)+'%</span></div>'+
    '<div class="small">Quest gold is paid from Mori\'s Marks (minted when she builds the world). '+tip+' Quests are never unpaid. Minted '+(t.minted||0)+' · paid out '+(t.paid||0)+' · raids '+(t.raids||0)+'.</div>'; }
function rewardNote(base){ if(!base) return ''; const p=scaleGold(base), t=tier(); if(t==='healthy'&&p>base) return ' · bounty +'+(p-base)+' (healthy treasury)'; if(t==='low'&&p<base) return ' · bounty '+p+'/'+base+' (lean treasury)'; return ''; }
function buyCrafted(it){ if(window.STATIONS) return STATIONS.treasuryBuyCrafted(it); return {ok:false}; }
window.TREASURY={ MINT, LOW, HEALTHY, FLOOR_MULT, BONUS_MULT, START, init(o){ X=o; bag(); }, balance, mint, mintStage, tier, bountyMult, scaleGold, payBounty, raidChance, tryRaid, panelHTML, rewardNote, bag, buyCrafted };
})();
