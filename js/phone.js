/* phone.js — Galaxy S21 Ultra layout (about 412×915 CSS px).
   Touch devices turn this on by themselves. A saved choice or ?phone=1 / ?phone=0 overrides that.
   Desktop stays on the existing bars unless the player asks for the phone layout.
   Joystick and D-pad numbers are plain vectors. The page only draws them. */
(function(root){
'use strict';
const MIN=48;
const S21={w:412, h:915};
let control='stick';
function shouldPhone(o){
  o=o||{};
  const q=o.query==null?'':String(o.query);
  const saved=o.saved==null?'':String(o.saved);
  if(q==='0'||q==='off'||saved==='off') return false;
  if(q==='1'||q==='on'||saved==='on') return true;
  if(o.touch||o.coarse) return true;
  const w=o.w||0, h=o.h||0;
  if(w&&h&&Math.min(w,h)<=500) return true;
  return false;
}
function stickVector(dx, dy, radius){
  const r=radius||52;
  const d=Math.hypot(dx, dy)||0;
  const k=d>r?r/d:1;
  return {x:(dx*k)/r, y:(dy*k)/r, clamped:d>r};
}
function padVector(pad){
  pad=pad||{};
  let x=(pad.e?1:0)-(pad.w?1:0), y=(pad.s?1:0)-(pad.n?1:0);
  const len=Math.hypot(x,y);
  if(len>1){ x/=len; y/=len; }
  return {x, y};
}
function placeChat(box, dx, dy, bounds){
  const w=box.w, h=box.h, bw=bounds.w, bh=bounds.h;
  const left=Math.max(8, Math.min(bw-w-8, box.left+dx));
  const top=Math.max(8, Math.min(bh-52, box.top+dy));
  return {left, top};
}
function overlapArea(a, b){
  const x=Math.min(a.x+a.w, b.x+b.w)-Math.max(a.x, b.x);
  const y=Math.min(a.y+a.h, b.y+b.h)-Math.max(a.y, b.y);
  if(x<=0||y<=0) return 0;
  return x*y;
}
function layout(w, h){
  const land=w>h;
  const joy=land?112:128;
  return {land, min:MIN, joy, dpad:48, attack:land?56:64, s21:w===S21.w&&h===S21.h||w===S21.h&&h===S21.w};
}
function settingsHTML(on){
  return '<div class="sec">Phone layout</div><div class="small">For a phone about 412×915, like a Galaxy S21 Ultra. Joystick or D-pad on the left, actions on the right. Chat can be dragged and folded. Desktop bars stay as they are until this is on.</div>'+
    '<div class="row"><label><input type="checkbox" id="phoneOn" '+(on?'checked':'')+'> Phone controls</label></div>';
}
const api={MIN, S21, shouldPhone, stickVector, padVector, placeChat, overlapArea, layout, settingsHTML,
  getControl(){ return control; },
  setControl(c){ control=c==='pad'?'pad':'stick'; return control; }
};
root.PHONE=api;
if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
