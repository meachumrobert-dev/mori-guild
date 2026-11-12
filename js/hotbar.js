/* Action bar: 4 pages of slots 1–9. Items, the attack, and spell placeholders.
   The page draws it. This file only stores and moves the layout. */
(function(root){
'use strict';
const PAGES=4, SLOTS=9;
const SALVE_TIP='Salve. Heals over time. No roll.';
function emptyPages(){
  const pages=[];
  for(let p=0;p<PAGES;p++){ const row=[]; for(let i=0;i<SLOTS;i++) row.push(null); pages.push(row); }
  return pages;
}
function copySlot(s){
  if(!s||!s.type) return null;
  const o={type:s.type};
  if(s.id) o.id=String(s.id);
  if(s.kind) o.kind=String(s.kind);
  if(s.name) o.name=String(s.name);
  if(s.tip) o.tip=String(s.tip);
  if(o.type==='item'&&o.kind==='salve') o.tip=SALVE_TIP;
  if(o.type==='spell') o.name=o.name||'Spell';
  if(o.type==='attack') o.name='Attack';
  return o;
}
function fresh(){
  const pages=emptyPages();
  pages[0][0]={type:'item', kind:'bandage', name:'Bandage'};
  pages[0][1]={type:'item', kind:'salve', name:'Salve', tip:SALVE_TIP};
  pages[0][2]={type:'item', kind:'potion', name:'Potion'};
  pages[0][3]={type:'attack', name:'Attack'};
  pages[1][0]={type:'spell', name:'Spell'};
  return {page:0, pages};
}
function restore(raw){
  const pages=emptyPages();
  const src=raw&&raw.pages;
  if(src){ for(let p=0;p<PAGES;p++){ const row=src[p]||[]; for(let i=0;i<SLOTS;i++) pages[p][i]=copySlot(row[i]); } }
  else { const born=fresh(); for(let p=0;p<PAGES;p++) pages[p]=born.pages[p]; }
  let page=raw&&raw.page!=null?raw.page|0:0;
  if(page<0||page>=PAGES) page=0;
  return {page, pages};
}
function assign(bar, page, slot, entry){
  const next=restore(bar);
  next.page=(bar&&bar.page!=null?bar.page|0:0);
  if(next.page<0||next.page>=PAGES) next.page=0;
  if(page<0||page>=PAGES||slot<0||slot>=SLOTS) return next;
  next.pages[page][slot]=copySlot(entry);
  return next;
}
function clear(bar, page, slot){ return assign(bar, page, slot, null); }
function swap(bar, a, b){
  const next=restore(bar);
  if(a===b||a<0||b<0||a>=SLOTS||b>=SLOTS) return next;
  const row=next.pages[next.page];
  const t=row[a]; row[a]=row[b]; row[b]=t;
  return next;
}
function turn(bar, dir){
  const next=restore(bar);
  const d=dir|0; if(!d) return next;
  next.page=(next.page+d+PAGES*4)%PAGES;
  return next;
}
function keyIndex(code){
  if(typeof code!=='string') return -1;
  if(/^Digit[1-9]$/.test(code)) return +code.slice(5)-1;
  if(/^Numpad[1-9]$/.test(code)) return +code.slice(6)-1;
  return -1;
}
function pageKey(code){
  if(code==='BracketLeft') return -1;
  if(code==='BracketRight') return 1;
  return 0;
}
function label(slot){
  if(!slot) return '';
  if(slot.type==='attack') return 'Attack';
  if(slot.type==='spell') return 'Spell';
  if(slot.kind==='salve') return 'Salve';
  if(slot.kind==='bandage') return 'Bandage';
  if(slot.kind==='potion') return 'Potion';
  return slot.name||'Item';
}
function tip(slot){
  if(!slot) return 'Empty slot. Drag an item here from the bag.';
  if(slot.kind==='salve'||slot.tip===SALVE_TIP) return SALVE_TIP;
  if(slot.tip) return slot.tip;
  if(slot.type==='spell') return 'Spell. Not in the world yet.';
  if(slot.type==='attack') return 'Attack';
  return label(slot);
}
root.HOTBAR={PAGES, SLOTS, SALVE_TIP, fresh, restore, assign, clear, swap, turn, keyIndex, pageKey, label, tip};
if(typeof module!=='undefined'&&module.exports) module.exports=root.HOTBAR;
})(typeof window!=='undefined'?window:globalThis);
