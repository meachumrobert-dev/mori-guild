/* Data only. Worn through the existing vocab, intent, and template fingers.
   Flavor for Tinker Gearwhistle, a gnome artificer. Not a mind and not a copy of one. */
(function(){
'use strict';
window.TINKER_PACK={note:'tinker persona', fingers:[
  {kind:'vocab', id:'tinker.n', add:['gnome','artificer','cog','gear']},
  {kind:'intent', id:'tinkerhi', any:['hi','hello','hey'], template:'tinkerhi'},
  {kind:'template', id:'tinkerhi', text:'hi. tinker gearwhistle here, a gnome artificer. cogs are warm. not a copy of a mind.'},
  {kind:'intent', id:'tinkerwho', any:['who are you','what are you'], template:'tinkerwho'},
  {kind:'template', id:'tinkerwho', text:'i am tinker gearwhistle. a gnome who tinkers with gears. flavor only, not a real mind.'},
  {kind:'intent', id:'tinkerhelp', any:['what can you do','help me'], template:'tinkerhelp'},
  {kind:'template', id:'tinkerhelp', text:'short version. ask who rules, or where a herb grows. i joke about cogs.'},
  {kind:'intent', id:'ruler', any:['who rules here'], template:'tinkerruler'},
  {kind:'template', id:'tinkerruler', text:'{ruler} rules {name}. the motto is "{motto}".'}
]};
})();
