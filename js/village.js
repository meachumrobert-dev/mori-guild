/* One door for the village loop. The page calls this. The pieces stay separate.
   Stockpile, elder, contracts, regard, tithe, and the workshop. */
(function(root){
'use strict';
const S=()=>root.STOCKPILE, E=()=>root.ELDER, C=()=>root.CONTRACTS, R=()=>root.REPUTATION, T=()=>root.TITHE, W=()=>root.WORKSHOP;
function migrate(save){
  if(!save) return save;
  S().migrate(save);
  R().migrate(save);
  if(!save.village.contracts) save.village.contracts=[];
  if(save.village.day==null) save.village.day=0;
  if(!save.village.tree) save.village.tree=['charter'];
  return save;
}
function town(save, id){ return S().ensure(save, id||'guild'); }
function specialty(id){ return String(id)==='guild'?'merchant':'adventurer'; }
function ensureContract(save, id, hasHall){
  const list=save.village.contracts;
  let c=list.find(x=>x.town===String(id)&&x.stage);
  if(!c){
    const t=town(save, id);
    const offer=E().offer(t);
    c=C().blank({town:id, specialty:hasHall?'merchant':specialty(id), kind:hasHall?'deliver':'clear', item:offer.item||'oak_beam', qty:offer.qty||40});
    if(!hasHall){ const a=E().adventurer(false); c.kind=a.kind; c.item=a.item; c.qty=a.qty; c.specialty='adventurer'; }
    list.push(c);
  }
  return c;
}
function sell(save, id, item, qty){
  const t=town(save, id);
  const have=(save.reag&&save.reag[item])||0;
  qty=Math.min(qty|0, have);
  if(qty<1) return {ok:false, why:'you do not have that'};
  const deal=S().sell(t, item, qty);
  if(!deal.ok) return deal;
  const mul=R().priceMul(R().ensure(save), id);
  const paid=Math.round(deal.paid*mul*100)/100;
  save.reag[item]-=qty;
  if(save.reag[item]<=0) delete save.reag[item];
  save.gold=Math.round(((save.gold||0)+paid)*100)/100;
  return {ok:true, paid, each:deal.each};
}
function craft(save, recipeId){
  if(!save.reag) save.reag={};
  return W().craft(save.reag, recipeId);
}
function deliver(save, id){
  const c=(save.village.contracts||[]).find(x=>x.id===id);
  if(!c) return {ok:false, why:'no such contract'};
  if(c.stage==='player'&&c.kind==='deliver'){
    const have=(save.reag&&save.reag[c.item])||0;
    if(have<c.qty) return {ok:false, why:'short of '+c.item};
    save.reag[c.item]-=c.qty;
    S().ensure(save, c.town).items[c.item]=(S().ensure(save, c.town).items[c.item]||0)+c.qty;
  }
  return C().handIn(c);
}
function onDay(save, id, hasHall){
  migrate(save);
  save.village.day=(save.village.day||0)+1;
  const day=save.village.day;
  const t=town(save, id);
  W().list().forEach(r=>{ if(!r.cap) S().produce(t, r); });
  T().apply(t);
  ensureContract(save, id, hasHall);
  const notes=[];
  save.village.contracts.forEach(c=>{
    if(c.town!==String(id)) return;
    const run=C().runCaravan(t, c, day);
    if(run.slow) notes.push('research slowed');
    if(run.ok&&c.specialty==='adventurer'){
      const hit=C().collateral(()=>((day*17+c.qty)%100)/100);
      if(hit){ t.happiness=Math.max(0,(t.happiness|0)-1); notes.push(hit.note); }
    }
  });
  return {day, notes};
}
function answer(save, id, hasHall){
  migrate(save);
  const t=town(save, id);
  let line=E().say(t, {hasHall:!!hasHall});
  if(root.LEGEND){ const extra=root.LEGEND.mention(save); if(extra) line+=' '+extra; }
  return line;
}
function elderHTML(save, id, hasHall){
  migrate(save);
  const t=town(save, id);
  const who=E().nameFor(id);
  const o=E().offer(t);
  const steps=E().nextSteps(t, {hasHall});
  const adv=E().adventurer(hasHall);
  const rumor=root.LEGEND?root.LEGEND.mention(save):'';
  let h='<p><b>'+who+'</b></p><p>'+o.text+'</p>';
  if(rumor) h+='<p>'+rumor+'</p>';
  if(adv) h+='<p>'+adv.text+'</p>';
  h+='<div class="sec">What next</div><ul>'+steps.map(s=>'<li>'+s+'</li>').join('')+'</ul>';
  h+='<div class="sec">Sell into the stockpile</div>';
  const reag=save.reag||{};
  const ids=Object.keys(reag).filter(k=>reag[k]>0);
  h+=ids.length?ids.slice(0,8).map(k=>'<div class="row"><span>'+k.replace(/_/g,' ')+' ×'+reag[k]+'</span><button type="button" data-sell="'+k+'">Sell 1</button></div>').join(''):'<p class="small">Nothing in the bag to sell.</p>';
  h+='<div class="sec">Workshop</div>';
  W().list().forEach(r=>{
    h+='<div class="row"><span>'+r.name+(r.cap?' (ceiling)':'')+'</span>';
    if(!r.cap) h+='<button type="button" data-craft="'+r.id+'">Make</button>';
    h+='</div>';
  });
  if(root.RECIPES&&root.RECIPES.panel) h+=root.RECIPES.panel(save);
  return h;
}
function boardHTML(save, id, hasHall){
  migrate(save);
  ensureContract(save, id, hasHall!==false&&String(id)==='guild');
  const spec=String(id)==='guild'?'merchant':'adventurer';
  const rows=C().board(save.village.contracts, spec);
  const tree=(save.village.tree||[]).join(', ');
  let h='<p>Shared tree: '+tree+'. This board keeps to '+spec+' work.</p>';
  h+=rows.length?rows.map(c=>'<div class="row"><span>'+c.kind+' · '+c.item+' ×'+c.qty+' · '+c.stage+' · '+c.done+'/'+C().NEED+'</span><button type="button" data-contract="'+c.id+'">Record</button></div>').join(''):'<p class="small">Nothing on the board yet. Deliver the elder\'s first job.</p>';
  const player=(save.village.contracts||[]).filter(c=>c.town===String(id)&&c.stage==='player');
  if(player.length) h+='<div class="sec">Your first delivery</div>'+player.map(c=>'<div class="row"><span>'+c.item+' ×'+c.qty+'</span><button type="button" data-contract="'+c.id+'">Deliver</button></div>').join('');
  return h;
}
function repHTML(save){
  const rep=R().ensure(save);
  const line=bag=>Object.keys(bag).map(k=>k+' '+bag[k]).join(', ')||'none yet';
  const rels=Object.keys(rep.rel).map(k=>k+' '+rep.rel[k]).join(', ')||'none seeded';
  return '<p>People: '+line(rep.personal)+'</p><p>Guilds: '+line(rep.guild)+'</p><p>Cities: '+line(rep.city)+'</p><p>Between cities: '+rels+'</p><p class="small">A quest can move regard by at most '+R().DAY_CAP+' in one day. Prices ease when a city likes you.</p>';
}
root.VILLAGE={migrate, town, sell, craft, deliver, onDay, answer, elderHTML, boardHTML, repHTML, ensureContract};
if(typeof module!=='undefined'&&module.exports) module.exports=root.VILLAGE;
})(typeof window!=='undefined'?window:globalThis);
