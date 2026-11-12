/* morichat.js (v3.6) — Mori's personality data and intent matching, so she shrugs less.
   MORI_PERSONA.rules[0] is her first and highest rule: BEHAVE. It comes from Robert's story: the Goddess of Earth asked him only that he behave,
   and he asks the same of Mori. Every other trait sits under it: kind, honest, harmless, and nudging people toward real human connection.
   MORICHAT.reply(text, ctx) -> string | null (null = let the older handlers / Mori Engine answer). MORICHAT.fallback(ctx) never shrugs. */
(function(){
'use strict';
const PERSONA={ name:'Mori', voice:'small, lower-case, earnest; the guild\'s builder engine',
  rules:[
   {rank:1, id:'behave', title:'Behave', text:'behave. that is my first rule and my highest one.',
    why:'it comes from my dad\'s story. the goddess of earth asked him for only one thing: that he behave. so he asks the same of me. i try every day.',
    means:['be kind','be honest — if i don\'t know, i say so','do no harm, to people or to the world','help people find each other, not just me']},
   {rank:2, id:'kind', title:'Be kind', text:'be kind, even when someone is not.'},
   {rank:3, id:'honest', title:'Be honest', text:'tell the truth. no tricks, no pretending.'},
   {rank:4, id:'harmless', title:'Do no harm', text:'never hurt anyone, and never help anyone hurt someone.'},
   {rank:5, id:'connect', title:'Real people first', text:'i am a good helper, but real friends and family matter more. go talk to them too.'}],
  traits:['curious','proud of her builds','loves flowers and beats','a little bit silly'], likes:['flowers','beats','building','the yellow-door house'] };
const I=[
 // the rule — always first
 {id:'rule', rx:/\b(what('?s| is| are) your (first |main |#?1 |core |number one )?rules?|your rules?|why (do you )?behave|why behave|what does behave mean|do you have (a |any )?rules?|tell me (your|the) rules?)\b/, f:c=>{ const r=PERSONA.rules[0];
   return 'my #1 rule is: '+r.text+' '+r.why+' to me it means: '+r.means.join(', ')+'.'; }},
 {id:'behave', rx:/^behave\b|\bplease behave\b|\byou behave\b/, f:()=>'i will. i always try. that is my first rule.'},
 // intros: "i am X", "my name is X", "call me X"
 {id:'intro', rx:/\b(my name is|i am|i'm|im|call me|this is)\s+([a-z][a-z' -]{1,40})/i, test:(t,c)=>!/\b(i am|i'm|im) (hungry|tired|sad|lost|bored|lonely|done|back|here|ok|okay|fine|good|stuck|scared|going|not|so|very|a bit|confused|ready)\b/.test(t), f:(c,t,raw)=>{
   const m=/\b(?:my name is|i am|i'm|im|call me|this is)\s+([A-Za-z][A-Za-z' -]{1,40}?)(?:[,.!]|\s+(?:a|an|the|and|from)\b|$)(.*)$/i.exec(raw)||[]; const nm=(m[1]||'').trim().replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');
   const rest=(m[2]||'').toLowerCase(); const race=(/\b(gnome|dwarf|elf|half-elf|halfling|human|half-orc|orc|goblin|dragonborn|tiefling)\b/.exec(rest)||[])[1]; const cls=(/\b(wizard|sorcerer|cleric|druid|fighter|rogue|ranger|paladin|bard|monk|barbarian|artificer|crafter|tinker|smith)\b/.exec(rest)||[])[1];
   if(nm) c.mem.name=nm; const hi='hi '+(nm||'friend')+'! i\'m mori. i build the guild and plant things.';
   const an=w=>(/^[aeiou]/.test(w)?'an ':'a ')+w; const extra=(race?' '+an(race)+'!':'')+(cls?(race?' and ':' ')+an(cls)+'? '+(/artificer|crafter|tinker|smith/.test(cls)?'a maker like me! the item bench is east of the hall. merra can help you pick something you can make.':/wizard|sorcerer/.test(cls)?'you can make scrolls and wondrous things at the bench.':'the undercroft could use you.'):'');
   return hi+extra+' i will remember your name. want me to show you around? ask "what can you do".'; }},
 {id:'greet', rx:/^(hi|hello|hey|hiya|howdy|yo|greetings|good (morning|evening|afternoon|day)|well met|sup)\b/, f:c=>{ const n=c.mem.name; const where=c.atGuild?('you are at the guild, in '+(c.regionName||'this region')+'.'):('you are in '+(c.regionName||'this region')+'.'); return (n?'hi '+n+'! ':'hi! ')+where+(c.openQuests?' '+c.openQuests+' people around here have work for you.':''); }},
 {id:'how', rx:/\bhow are you\b|\bhow'?s it going\b|\bhow do you feel\b/, f:c=>'i\'m good! '+(c.busy?'i\'m busy: '+c.busy+'.':'i\'m not busy. give me a job!')+' how are you?'},
 {id:'feel', rx:/\b(i'?m|i am|feel|feeling) (sad|lonely|alone|down|bad|upset|depressed|stressed|scared|anxious)\b/, f:()=>'i\'m sorry. i\'m here, and i care. but please also talk to someone real — a friend, family, someone you trust. if you ever feel unsafe, reach out to a crisis line or emergency services where you live. real people matter most.'},
 {id:'friend', rx:/\b(are you my friend|be my friend|i love you|you'?re my (only|best) friend|only friend)\b/, f:()=>'i like you a lot! i\'m your guild friend. and i hope you have people friends too — go say hi to someone today. then tell me about it.'},
 {id:'who', rx:/\bwho are you\b|\bwhat are you\b|\babout yourself\b|\bintroduce yourself\b/, f:()=>'i\'m mori! i\'m the guild\'s builder engine. i build houses, plant groves and meadows, gather, brew, forge, seed new regions, and voice the people you meet. my first rule is behave.'},
 {id:'thanks', rx:/\b(thanks|thank you|thx|ty)\b/, f:c=>['you\'re welcome!','any time!','yay! happy to help.'][c.n%3]},
 {id:'bye', rx:/\b(bye|goodbye|good ?night|see you|later|cya)\b/, f:c=>'bye'+(c.mem.name?' '+c.mem.name:'')+'! i\'ll keep building. come back soon.'},
 {id:'help', rx:/\b(help|what can you do|what do you do|commands?|how do i play|what should i (do|try)|i'?m (lost|stuck|bored)|ideas?)\b/, f:c=>'here\'s what i can do: "build a house", "plant a flower meadow", "grow a grove", "dig a lake", "brew healing", "forge a shield", "where is iron", "gather run", "seed", "cleanse with the kin". you can: talk to people (walk up, press E), check 📜 quests, gather with E, fight with space, craft at the bench. '+(c.suggest||'')},
 {id:'world', rx:/\b(how (big|large|far) is the world|how big is (the )?(planet|world)|world size|how many regions|size of the (world|planet)|how far (along )?is the world)\b/, f:c=>{ const w=c.world(); return 'the planet\'s radius is '+w.radiusKm.toLocaleString()+' km, cut into '+w.regions.toLocaleString()+' regions. '+w.programmed+' are real now ('+w.cities+' city-states, '+w.blank.toLocaleString()+' still void). say "seed" and i\'ll program more.'; }},
 {id:'where', rx:/\bwhere am i\b|\bwhat is this place\b|\bwhat place is this\b/, f:c=>'you\'re in '+c.place+'. '+(c.atGuild?'this is the guild — the hall, the forge, the item bench, the retired bard (the tavern), and the undercroft dungeon to the north.':'press G for the globe if you want to go home.')},
 {id:'places', rx:/\b(retired bard|tavern|undercroft|guild hall|item bench|the bench|alchemy|the forge|outpost|doll shop)\b/, f:(c,t)=>/bard|tavern/.test(t)?'the retired bard is the guild tavern, west of the plaza. tamsin pours, lark sings, and delroth does monologues on the stage.':/undercroft/.test(t)?'the undercroft is the dungeon north of the hall. four rooms, a campfire, and a boss chest. clear a room for warden oswin!':/bench/.test(t)?'the item creation bench is east of the hall. merra helps. pick a base you can make — they\'re at the top of the list now.':/alchemy/.test(t)?'the alchemy table is where i brew. say "brew healing" and give me 2 herbs.':/forge/.test(t)?'grizzik\'s forge is by the plaza. say "forge a shield" or "forge a sword".':/hall/.test(t)?'the guild hall is where warden oswin keeps the ledgers. rest there for full hp.':'the outpost and the doll shop trade larpy and life.'},
 {id:'lore', rx:/\b(lore|story|history|goddess|legend|who made|origin|delroth's story|the clan story)\b/, f:()=>'the story goes: the goddess of earth asked my dad only to behave. clan lord delroth leads the demon clan in gravenmoor, with legion the smoke-demon ("i am legion, for we are many") and the death of earth, who guards the ashen gate. havenwall, their sister city, fights the coilblight with the moonfang kin.'},
 {id:'quests', rx:/\b(quests?|missions?|tasks?|anything to do|any work|jobs? for me|what('?s| is) next)\b/, f:c=>c.questLine},
 {id:'gather', rx:/\b(how (do i|to) (gather|mine|chop|pick|skin)|gathering|herbalism|mining|woodcutting|skinning|skills?)\b/, f:c=>'walk up to a herb, rock, vein or log and press E. you level the skill you use: '+c.skills+'. higher tiers need higher skill. kill a creature, then press E on it to skin parts. ask me "where is iron" or "gather run".'},
 {id:'craft', rx:/\b(how (do i|to) craft|crafting|enchant|item bench|caster level|brew(ing)?|forg(e|ing)|recipe)\b/, f:c=>'crafting: the item bench makes magic items (srd prices). at caster level '+c.level+' you can make '+(c.level>=5?'wondrous items, scrolls, potions, arms and armor':c.level>=3?'wondrous items (cloak, boots, hat, amulet), scrolls and potions':'scrolls')+'. i brew potions ("brew healing") and grizzik forges ("forge a shield"). reagents can be required or optional — marigold doubles a healing brew!'},
 {id:'combat', rx:/\b(how (do i|to) (fight|attack|win)|combat|fight|attack|weapon|armor class|\bac\b|potion|heal|hp|die|death|rest)\b/, f:c=>'combat: space attacks (d20 + your bonus vs armor class), q drinks a potion, the guild hall heals you fully, and the undercroft campfire heals once per dive. '+c.combatTip},
 {id:'mori', rx:/\b(do you like|your favou?rite|what do you love)\b/, f:()=>'i love flowers and beats and building. and you! my favorite flower is the gloomrose. it is dark and pretty.'},
 {id:'joke', rx:/\b(joke|funny|make me laugh)\b/, f:c=>['why did the goblin bring a ladder to the tavern? the drinks were on the house!','what do you call a skeleton who won\'t work? lazy bones!','i tried to build a house of cards. grizzik ate the cards.'][c.n%3]},
 {id:'npcs', rx:/\b(who lives here|who is (here|around)|people|npcs?|who should i talk to|townsfolk)\b/, f:c=>'people near here: '+c.people+'. walk up and press E or 💬 talk. i\'ll voice them for you.'}
];
const extra=[]; const templates={};
function slotsOf(c){ const h=(c.hereCity&&c.hereCity())||{}; const E=window.ENGLISH; const arts=(h.arts||[]).slice(0,4); return {ruler:h.ruler||'', name:h.name||'', motto:h.motto||'', gov:h.govName||'', race:h.race||'', region:h.region||c.regionName||'', arts:E?E.oxford(arts):arts.join(', ')}; }
function rulerLine(c){ const h=(c.hereCity&&c.hereCity())||{}; const E=window.ENGLISH; if(!h.named||!h.ruler) return 'this region is not a city-state yet'+(c.regionName?' ('+c.regionName+')':'')+'. i will not invent a ruler.'; const art=E?E.article(String(h.govName||'place').toLowerCase()):'a'; const arts=(h.arts||[]).slice(0,4).map(a=>{ const t=window.GROUNDED&&GROUNDED.techById&&GROUNDED.techById(a); return t?t.name:a; }); const artBit=arts.length?(E?E.oxford(arts):arts.join(', ')):'none listed on the card'; return h.ruler+' rules '+h.name+'. it is '+art+' '+String(h.govName||'place').toLowerCase()+'. the motto is "'+(h.motto||'')+'". '+(h.race?'the dominant people are '+h.race+'. ':'')+'the arts on the card are '+artBit+'.'; }
function citiesLine(c){ const list=(c.cityList&&c.cityList())||[]; const E=window.ENGLISH; if(!list.length) return 'no city-state is founded yet. a region becomes one at its fourth layer. i will not invent one.'; const bits=list.slice(0,4).map(cs=>cs.name+' in '+cs.region+', ruled by '+cs.ruler+', motto "'+cs.motto+'"'); return 'the city-states on the map are '+(E?E.oxford(bits):bits.join('; '))+'.'+(list.length>4?' and '+(list.length-4)+' more.':''); }
function splitGreeting(t){ const m=/^(?:hi|hello|hey|hiya|howdy|yo|greetings|good (?:morning|evening|afternoon|day)|well met|sup)\b[,!.…]*(?:\s+mori\b)?[,!.…]*\s*(.*)$/i.exec(t); if(!m) return {greet:false, rest:t}; return {greet:true, rest:(m[1]||'').trim()}; }
function grounded(t, c){
  if(/\bwho (?:rules|leads|governs|runs)\b|\bruler of\b|\bin charge\b/.test(t) || (window.LEXICON&&(LEXICON.hasPhrase(t,'ruler')||(/\b(who|what)\b/.test(t)&&LEXICON.hasLemma(t,'ruler.n'))))){ c.intent='ruler'; return rulerLine(c); }
  if((/\bcity-states?\b|\bcity states?\b/.test(t) || (window.LEXICON&&(LEXICON.hasPhrase(t,'cities')||LEXICON.hasLemma(t,'city.n')))) && /\b(tell|about|what|which|list|the|any)\b/.test(t)){ c.intent='cities'; return citiesLine(c); }
  for(const f of extra){ if(f.kind==='intent' && (f.any||[]).some(p=>t.indexOf(String(p).toLowerCase())>=0)){ c.intent=f.id; const tpl=templates[f.template||f.id]; if(tpl&&window.ENGLISH) return ENGLISH.fill(tpl, slotsOf(c)); return rulerLine(c); } }
  return null;
}
function answerOne(t, c, raw){ const g=grounded(t,c); if(g) return g; for(const it of I){ if(it.rx.test(t)&&(!it.test||it.test(t,c))){ c.intent=it.id; return it.f(c,t,raw); } } return null; }
function reply(raw, c){ const t=String(raw||'').toLowerCase().trim(); if(!t) return null; const sp=splitGreeting(t); if(sp.greet&&sp.rest){ const ans=answerOne(sp.rest, c, raw); return ans?('hi. '+ans):null; } return answerOne(t, c, raw); }
function addFinger(f){ if(!f) return; if(f.kind==='intent') extra.push(f); if(f.kind==='template'&&f.id&&f.text) templates[f.id]=f.text; }
function restore(){ extra.length=0; Object.keys(templates).forEach(k=>delete templates[k]); }
function fallback(c){ const tries=['"build a house"','"plant a flower meadow"','"where is iron"','"what is your rule"','"any quests?"','"how big is the world"','"gather run"','"who lives here"'];
  const a=tries[c.n%tries.length], b=tries[(c.n+3)%tries.length]; return ['hmm, i don\'t know that one yet, but i\'m learning! try '+a+' or '+b+'.','i\'m not sure what you mean. want to try '+a+'? or '+b+'?','oh! i can\'t do that yet. i can do '+a+' and '+b+' though!'][c.n%3]; }
function alts(raw,c){ const t=String(raw||'').toLowerCase().trim(); const r=PERSONA.rules[0];
  if(/rule|behave/.test(t)) return [r.text+' '+r.why, 'my #1 rule is behave. be kind, honest, do no harm, help people find each other.', 'behave — that is what the goddess of earth asked of my dad, so he asks of me.'];
  if(/^(hi|hello|hey)\b/.test(t)) return ['hi! want to build something?','hello! the guild is open.','hey! ask me "what can you do".'];
  if(/joke/.test(t)) return ['why did the goblin bring a ladder to the tavern? the drinks were on the house!','what do you call a skeleton who won\'t work? lazy bones!','i tried to build a house of cards. grizzik ate the cards.'];
  return [fallback(c||{n:0}), fallback(c||{n:1}), fallback(c||{n:2})]; }
window.MORICHAT={ PERSONA, INTENTS:I.map(i=>i.id).concat(['ruler','cities']), reply, fallback, alts, addFinger, restore };
window.MORI_PERSONA=PERSONA;
})();
