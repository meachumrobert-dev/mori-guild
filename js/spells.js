/* SRD 3.5 spell names and schools, under the Open Game License.
   The lines here are flavor tags, not the SRD text. Effects stay small. */
(function(root){
'use strict';
const SCHOOLS=['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'];
const LIST=[
  {id:'prestidigitation', name:'Prestidigitation', school:'transmutation', level:0, flavor:'spark', cap:1},
  {id:'light', name:'Light', school:'evocation', level:0, flavor:'lantern', cap:1},
  {id:'detect_magic', name:'Detect Magic', school:'divination', level:0, flavor:'glint', cap:1},
  {id:'mage_armor', name:'Mage Armor', school:'conjuration', level:1, flavor:'sheen', cap:2},
  {id:'magic_missile', name:'Magic Missile', school:'evocation', level:1, flavor:'dart', cap:2},
  {id:'sleep', name:'Sleep', school:'enchantment', level:1, flavor:'hush', cap:2},
  {id:'shield', name:'Shield', school:'abjuration', level:1, flavor:'pane', cap:2},
  {id:'silent_image', name:'Silent Image', school:'illusion', level:1, flavor:'show', cap:1},
  {id:'cause_fear', name:'Cause Fear', school:'necromancy', level:1, flavor:'chill', cap:2},
  {id:'enlarge_person', name:'Enlarge Person', school:'transmutation', level:1, flavor:'loom', cap:2},
  {id:'web', name:'Web', school:'conjuration', level:2, flavor:'snare', cap:3},
  {id:'scorching_ray', name:'Scorching Ray', school:'evocation', level:2, flavor:'sear', cap:3},
  {id:'invisibility', name:'Invisibility', school:'illusion', level:2, flavor:'gone', cap:2},
  {id:'fireball', name:'Fireball', school:'evocation', level:3, flavor:'bloom', cap:4},
  {id:'fly', name:'Fly', school:'transmutation', level:3, flavor:'lift', cap:3},
  {id:'dispel_magic', name:'Dispel Magic', school:'abjuration', level:3, flavor:'unravel', cap:3},
  {id:'stoneskin', name:'Stoneskin', school:'abjuration', level:4, flavor:'hide', cap:4},
  {id:'wall_of_fire', name:'Wall of Fire', school:'evocation', level:4, flavor:'curtain', cap:4},
  {id:'teleport', name:'Teleport', school:'conjuration', level:5, flavor:'step', cap:4},
  {id:'heal', name:'Heal', school:'conjuration', level:6, flavor:'mend', cap:4},
  {id:'finger_of_death', name:'Finger of Death', school:'necromancy', level:7, flavor:'point', cap:4},
  {id:'polymorph_any', name:'Polymorph Any Object', school:'transmutation', level:8, flavor:'shift', cap:4},
  {id:'wish', name:'Wish', school:'universal', level:9, flavor:'ask', cap:4}
];
function bySchool(school){ return LIST.filter(s=>s.school===school); }
function byLevel(level){ return LIST.filter(s=>s.level===(level|0)); }
function cast(id, roll, caster){
  const spell=LIST.find(s=>s.id===id);
  if(!spell) return {ok:false, why:'unknown'};
  const bonus=(caster&&caster.level)||0;
  const dc=10+spell.level;
  const nat=roll|0;
  const ok=nat===20||(nat!==1&&nat+bonus>=dc);
  const effect=ok?Math.min(spell.cap, 1+Math.floor(spell.level/2)):0;
  return {ok, effect, cap:spell.cap, flavor:spell.flavor, school:spell.school, level:spell.level};
}
root.SPELLS={SCHOOLS, LIST, bySchool, byLevel, cast, star:['roleplay','uneven']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.SPELLS;
})(typeof window!=='undefined'?window:globalThis);
