/* A typed try. The world's law says if it can be attempted. A roll says if it lands.
   The effect stays small. */
(function(root){
'use strict';
const TRIES=[
  {id:'rent', re:/\brent\b/, law:['public','wild','lord']},
  {id:'claim', re:/\bclaim\b/, law:['wild']},
  {id:'bribe', re:/\bbribe\b/, law:['public','wild']},
  {id:'sneak', re:/\bsneak\b|\bslip past\b/, law:['public','wild','lord']},
  {id:'open', re:/\bunlock\b|\bopen the\b/, law:['public','wild']},
  {id:'place', re:/\bsnap\b|\bplace a\b/, law:['public','wild','lord']}
];
function read(text, ctx){
  ctx=ctx||{};
  const s=String(text||'').toLowerCase();
  const hit=TRIES.find(t=>t.re.test(s));
  if(!hit) return {intent:null};
  const law=ctx.law||'public';
  const plausible=hit.law.indexOf(law)>=0;
  return {intent:hit.id, plausible, law};
}
function resolve(act, opt){
  opt=opt||{};
  if(!act||!act.intent) return {ok:false, effect:0, line:'That is not a try.'};
  if(!act.plausible) return {ok:false, effect:0, line:'The law here does not allow that.'};
  const roll=opt.roll==null?10:opt.roll|0;
  const skill=opt.skill|0;
  const oppose=opt.oppose==null?12:opt.oppose|0;
  const total=roll+skill;
  const ok=roll===20||(roll!==1&&total>=oppose);
  const effect=ok?Math.min(3, 1+Math.floor(Math.max(0,total-oppose)/5)):0;
  return {ok, effect, cap:3, line:ok?'That lands, lightly ('+effect+').':'That does not land.'};
}
root.ROLE={TRIES, read, resolve, star:['roleplay']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.ROLE;
})(typeof window!=='undefined'?window:globalThis);
