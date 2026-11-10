/* npcs.js (v3.6) — living NPCs: names, daily routines (work / eat / sleep spots), personalities, memory, and a pluggable brain.
   THE BRAIN INTERFACE: npcReply(npc, text, state) -> {text, actions:[], mem, intent}
     npc   = the NPC definition (id, name, role, home, P = personality profile)
     text  = what the player typed (or '' when the chat opens)
     state = plain data: {mem (this NPC's memory of you), player, phase, hour, place, rep, repTier, d20, offer, active, ready, chain, world}
   The default brain below is scripted (no API key, no network). NPCS.setBrain(fn) swaps in any other function with the same signature —
   e.g. a local/offline model wrapper. It may return the object or a Promise of it; the game applies `actions` (accept / turnIn / haggle) itself,
   so a model never touches the save directly. Mori "voices" every NPC: replies are shown in the shared chat bar as that NPC, spoken in its voice. */
(function(){
'use strict';
const T=THREE;
let X=null;
/* ---------- the people ---------- */
// sched: [startHour, activity]. The guild clock runs 00–12 daylight, 12–24 night.
const DAYWORK=[[0.5,'work'],[5,'eat'],[6.5,'work'],[10.5,'eat'],[12.5,'sleep'],[23.5,'eat']];
const NIGHTWORK=[[0,'eat'],[1,'sleep'],[10,'eat'],[12,'work']];
const EVENING=[[1.5,'sleep'],[8.5,'eat'],[10,'work']];
const L={ human:{scale:1}, halfling:{scale:0.68}, gnome:{scale:0.66}, dwarf:{scale:0.8,wide:1.18}, halforc:{scale:1.08,wide:1.1}, halfelf:{scale:0.98,ears:true}, wolf:{scale:1.08,wolf:true} };
const DEFS=[
 {id:'oswin', name:'Warden Oswin Hale', short:'Oswin', role:'Guild Hall steward', home:'guild', race:'human', look:{skin:'#e0b48c',hair:'#8a8a8a',shirt:'#2f4a7a',pants:'#3a3028',beard:'#8a8a8a'}, voice:{pitch:0.85,rate:0.95},
  sched:DAYWORK, spots:{work:[[0,-6.5],[3,-6]],eat:[-10.2,13.4],sleep:[2.4,-9.6]},
  P:{traits:'formal, dutiful, dry humor', greet:['Well met. I am Oswin Hale, warden of this Guild Hall. I keep the ledgers and the peace.'], again:['Ah, {name}. Back again — visit {visits} by my ledger.','{name}. The hall is in order. How can I help?'],
   bye:['Mind the fence on your way.','Go well, {name}.'], self:['Warden of the Guild Hall. I keep the ledger of every job, every visitor and every coin. Mori keeps the town; I keep count.'],
   work:['Ledgers, mostly. Mori builds, I write it down, and the Guild remembers.'], place:['This is the Guild — the planet\'s starting point. Hall, forge, bench, the Retired Bard, and the Undercroft below.'],
   rumor:['The Undercroft scratches at night. Someone should sweep it.','Merra at the bench says crafting is mostly patience. I say it is mostly gold.','The Clan Lord drinks at the Retired Bard. Nobody asks for his tab.'],
   rules:'The Guild has three rules: pay your dues, mind the fence, and be kind to Mori. She asks only that everyone behave.', trusted:['Between us — the Undercroft boss drops a template more often than the ledger admits.'], food:['I take supper at the Retired Bard. Tamsin\'s stew is the only thing in my ledger marked "excellent".'],
   sleepy:'Hm? The hall is closed for the night… but I can spare a word.', thanks:['The Guild thanks you.'], compliment:['Kind of you. I will note it in the ledger.'], unknown:['That is not in my ledger.','I could not say. Ask Mori; she knows the land.'],
   mori:'Mori is the heart of this town. She builds, she plants, she listens. Treat her well.', delroth:'Clan Lord Delroth keeps a table at the Retired Bard. Sixty levels and a +5 hat. He pays in stories.', blight:'Havenwall fights the Coilblight. The Guild sends help when it can.'}},
 {id:'pell', name:'Pell Thistlewick', short:'Pell', role:'herb-keeper', home:'guild', race:'halfling', look:{skin:'#f0c8a0',hair:'#a0582a',shirt:'#5a8a3a',pants:'#6b4a2a',hat:'#c8a040'}, voice:{pitch:1.35,rate:1.12},
  sched:DAYWORK, spots:{work:[[-4.6,8.2],[-7.4,8.6]],eat:[-10.2,11.8],sleep:[-9.2,9.2]},
  P:{traits:'cheerful chatterbox, loves gardens', greet:['Oh! Hello hello! Pell Thistlewick, herb-keeper. Mind the seedlings, they\'re shy.'], again:['{name}! Goodness, you\'re back. The vinca missed you.','Hello again, {name}! Have you been picking? Show me, show me.'],
   bye:['Bye now! Water something on your way!','Off you go — and wipe your boots!'], self:['I keep the Guild\'s herb beds and help at the alchemy table. Vinca for antitoxin, marigold for healing, canna root when I can get it.'],
   work:['Weeding, mostly. And talking to the beds. They grow faster when you chat.'], place:['The herb beds are by the alchemy table. Wild herbs grow all round the Guild — ask Mori where.'],
   rumor:['Marigold doubles a healing brew, did you know? Optional, but lovely.','Gloomroses grow in the forests. Rare! Pretty! Thorny!','I heard Havenwall\'s refugees have no healer. Poor dears.'],
   food:['Second breakfast is the most important meal. Then elevenses.'], sleepy:'Mmh… is it morning? No? Then whisper, the beds are sleeping too.', thanks:['Oh, you\'re very welcome!'],
   compliment:['Goodness! You\'ll make me blush redder than a zinnia.'], unknown:['Goodness, I don\'t know! Ask me about herbs?','No idea, but I know which leaves cure a stomachache.'],
   mori:'Mori planted a whole meadow out of little triangle flowers! I nearly cried.', delroth:'He tips the bard in roses. Nobody knows where he grows them.', blight:'The Coilblight eats gardens. I hate it more than slugs.',
   topics:{'herb|flower|plant|garden|seed':['Herbs! Vinca Leaf is common, Marigold too. Canna Root likes jungles; Gloomrose likes dark forest. Herbalism grows as you pick.']}}},
 {id:'merra', name:'Merra Quill', short:'Merra', role:'bench artificer', home:'guild', race:'gnome', look:{skin:'#f2c9a8',hair:'#3aa0c8',shirt:'#6a3a8a',pants:'#3a3048',goggles:true}, voice:{pitch:1.4,rate:1.2},
  sched:DAYWORK, spots:{work:[[11.4,-9.4],[14.6,-9.2]],eat:[-11.2,14.6],sleep:[14.5,-14]},
  P:{traits:'precise, nerdy, helpful about crafting', greet:['Hello! Merra Quill, apprentice at the Item Creation Bench. Please don\'t touch the caster-level dial.'], again:['{name}! Come to craft? I re-sorted the bench: what you can make is at the top now.','Back again! Visit {visits}. I\'m keeping a chart.'],
   bye:['Measure twice, enchant once!','Bye! Mind the arcane residue.'], self:['I\'m Mori\'s bench apprentice. I price items by the SRD: spell level × caster level × the use multiplier, plus the base item.'],
   work:['Pricing, mostly. And explaining feats. Craft Wondrous Item needs caster level 3. Craft Magic Arms and Armor needs 5. Forge Ring needs 12.'], place:['The bench is east of the hall. Cloaks, boots, hats and amulets are wondrous items — the cheapest place to start.'],
   rumor:['Robert\'s Strider Armor costs over a hundred thousand gold. I check the math every morning.','Quickened Ritual makes crafting instant, but it costs half again in gold and XP.'],
   food:['I eat at the Retired Bard, at the corner table with the best lamp.'], sleepy:'Wha—? I was dreaming of perfectly balanced charge tables.', thanks:['Happy to help! Accuracy is its own reward. Well, and gold.'],
   compliment:['Oh! Thank you. I calibrated myself this morning.'], unknown:['Hmm, out of my field. Ask me about crafting?','I\'d need more data for that.'],
   mori:'Mori is CL 6 at the bench. She can make arms and armor; most new adventurers can\'t yet.', delroth:'Caster level sixty. His crafting math breaks my abacus.', blight:'Corruption is not my field. Ask Sefa, at Havenwall.',
   topics:{'craft|bench|enchant|cl\\b|caster level|feat|lock':['At caster level 3 you can make wondrous items (cloak, boots, hat, amulet) and scrolls. Pick a base at the top, add one low spell, and keep the craft cost under your gold.']}}},
 {id:'grizzik', name:'Grizzik', short:'Grizzik', role:'goblin smith', home:'guild', existing:'grizzik', race:'goblin', voice:{pitch:1.5,rate:1.25}, shop:'forge',
  sched:[[0,'work']], spots:{work:[[7.5,9]],eat:[7.5,9],sleep:[7.5,9]},
  P:{traits:'goblin smith, speaks of himself in third person, enthusiastic', greet:['Grizzik! Grizzik is Grizzik. Grizzik makes the hammer go BANG.'], again:['Friend {name}! Grizzik remembers you. You have ore? Grizzik smell ore.','Back! Grizzik happy. Forge happy. Everybody happy.'],
   bye:['Bye bye! Do not lick the anvil!','Go! Grizzik busy being amazing.'], self:['Grizzik is Guild smith. Mori brings ore, Grizzik makes swords and shirts and shields. Very good ones. Mostly.'],
   work:['Hammer, hammer, quench, HISS. That is the job.'], place:['This is Grizzik\'s forge. The Dragon\'s Forge in Havenwall is bigger. Grizzik is not jealous. Little bit jealous.'],
   rumor:['Brakka in Havenwall is Grizzik\'s cousin. Or aunt. Goblins do not keep track.','Darkwood makes light shields. Grizzik wants darkwood.'],
   food:['Grizzik eats charcoal. Joke! Grizzik eats sausages.'], sleepy:'Grizzik never sleeps. The forge never cools.', thanks:['Hehehe. Yes. You are welcome.'],
   compliment:['Grizzik knows! But say it again.'], unknown:['Grizzik does not know. Grizzik knows hammers.','Hmm? Ask Grizzik about forging!'],
   mori:'Mori is the boss. Grizzik likes the boss.', delroth:'Big necromancer. Big hat. Grizzik does not touch the hat.', blight:'Blight eats metal? No? Then Grizzik not worried. Little bit worried.',
   haggle:{dc:99, no:'Grizzik does not charge you! Mori pays Grizzik in sausages.'}}},
 {id:'tamsin', name:'Tamsin Alebright', short:'Tamsin', role:'barkeep of the Retired Bard', home:'bard', race:'dwarf', look:{skin:'#e8b890',hair:'#b04a2a',shirt:'#7a2a3a',pants:'#3a2a1a',apron:'#d8c8a8'}, voice:{pitch:0.95,rate:1.0}, merchant:true,
  sched:EVENING, spots:{work:[[-11.8,17.1],[-10.6,17.1]],eat:[-11.4,13.4],sleep:[-14.2,16.4]},
  P:{traits:'warm, no-nonsense, knows all the gossip', greet:['Welcome to the Retired Bard. I\'m Tamsin. Sit, drink, and keep your elbows off the stage.'], again:['{name}! Your usual stool\'s free.','Back again, {name}. Visit {visits}. I\'m starting to think you like my stew.'],
   bye:['Mind the step, love.','Come back thirsty.'], self:['I run the Retired Bard. Forty years pouring ale, and I\'ve heard every story twice.'],
   work:['Pouring, wiping, listening. Mostly listening.'], place:['The Retired Bard: best stage on the planet, the Clan Lord\'s favorite table, and the only stew in the Guild worth the name.'],
   rumor:['They say the Death of Earth showed itself at the Ashen Gate again. Bowed, even. That\'s rare.','Gravenmoor\'s smith, Dagna, wants shields for Havenwall\'s wall.','Lark has been writing a new verse every night. Same tune, though.'],
   food:['Stew, bread, and ale. If you want something fancy, go to Havenwall and ask Brakka to cook. Actually, don\'t.'], sleepy:'*yawns* Bar\'s shut, love. But I\'m awake now, so go on.', thanks:['Anytime.'],
   compliment:['Flattery gets you a second bowl. Nothing more.'], unknown:['Never heard of it, and I\'ve heard everything.','That\'s a question for Mori, not a barkeep.'],
   mori:'Mori brings beats for the stage. The regulars dance badly to every one of them.', delroth:'His table, his rules. He tips well and he behaves. That\'s all I ask of anyone.', blight:'Havenwall\'s folk drink here when they can. Every one of them talks about the blight.',
   trusted:['You have a stool with your name on it. Do not tell the Clan Lord.'], haggle:{dc:30, no:'Haggle with a dwarf over ale? Bold. No.'}, chain:{bard_song:'What do the regulars want? "The Ballad of the Crooked Walls", every night, same as always. Go tell Lark before they start throwing bread.'}}},
 {id:'lark', name:'Lark Fennimore', short:'Lark', role:'bard', home:'bard', race:'halfelf', look:{skin:'#f0d0b0',hair:'#e8d070',shirt:'#3a7a8a',pants:'#4a3a5a',hat:'#7a2a6a'}, voice:{pitch:1.15,rate:1.05},
  sched:EVENING, spots:{work:[[-10.1,13.3],[-11.4,14.9]],eat:[-11.3,17.4],sleep:[-14.4,9.8]},
  P:{traits:'dramatic, rhymes when excited, admires Delroth\'s monologues', greet:['A new face! Lark Fennimore, bard of no fixed fame. Sit — the next verse is about you.'], again:['{name}, my muse returns! Visit {visits} — I\'m writing it down in rhyme.','Ah, {name}! The tavern\'s brighter, the ale is lighter.'],
   bye:['Farewell! May your road have a chorus.','Go well, and come back with a story.'], self:['A bard! I sing between the Clan Lord\'s monologues. He gets the stage; I get the tables. It\'s a fair arrangement. He\'s sixty levels.'],
   work:['I play the lute at the corner table and try new verses on whoever can\'t escape.'], place:['The Retired Bard! Where bards retire, and then keep performing anyway.'],
   rumor:['Legion laughed at one of my songs once. With all its voices. Best review I ever got.','There\'s a refugee in Havenwall, Wren, who weaves charms. I want one for my lute.'],
   food:['I eat at the bar, where Tamsin can\'t pretend she doesn\'t hear me practicing.'], sleepy:'Mm… shh… the muse is asleep… and so was I…', thanks:['You\'re a gem, a hymn, a song!'],
   compliment:['Oh, stop. No, go on.'], unknown:['I don\'t know, but I could write a song about not knowing.','No idea! Ask me about songs.'],
   mori:'Mori makes beats with kick, snare and hat. I\'m teaching her a waltz. She calls it "the slow one".', delroth:'His monologues! Sixty levels of stage presence. I take notes.', blight:'The Coilblight is the villain of my next ballad. It will lose.'}},
 {id:'vesk', name:'Vesk Inkwell', short:'Vesk', role:'clan scribe', home:'clan', race:'human', look:{skin:'#d8d0c8',hair:'#1a1a22',shirt:'#2a2230',pants:'#1a1a1f',hat:'#3a2f45'}, voice:{pitch:0.8,rate:0.88}, merchant:true, shop:'scribe', faction:'clan',
  sched:DAYWORK, spots:{work:[{a:'stall',dx:0,dz:-1.7}],eat:{a:'A',dx:-2,dz:7},sleep:{a:'stall',dx:4.5,dz:-4.5}},
  P:{traits:'precise, whispery, loves old books', greet:['…Ah. A visitor. Vesk Inkwell, scribe of the Clan. I sell scrolls. SRD necromancy, nothing forbidden.'], again:['{name}. I wrote your name in the visitors\' book. Visit {visits}.','Back, {name}. The ink remembers.'],
   bye:['Mind the wet ink.','The Clan keeps its records. Go well.'], self:['I copy scrolls and keep the Clan\'s records. Ray of Enfeeblement, False Life, Gentle Repose, Halt Undead. Useful, all of them.'],
   work:['Copying. Grinding bone for ink. Copying again.'], place:['Gravenmoor. The Demon Clan Compact rules here; Clan Lord Delroth leads it, and Legion keeps the streets.'],
   rumor:['Gentle Repose keeps a carcass fresh four times longer. Skinners love it.','The Death of Earth bows to those who are gentle with the living. I have seen it twice.'],
   food:['I eat by the square, when I remember to eat.'], sleepy:'…I was asleep on a manuscript. Again. What is it?', thanks:['Noted.'],
   compliment:['…Thank you. Few people compliment a scribe.'], unknown:['That is not in the records.','I would have to look it up. It is not here.'],
   mori:'Your Mori is gentle. The Clan respects gentle things.', delroth:'The Clan Lord holds court at the Retired Bard. His seat in the Hold stays empty and dusted.', blight:'The Coilblight is necromancy gone wrong. Ours stays in scrolls, where it belongs.',
   haggle:{dc:14, win:'…Fine. Ten percent off at my stall today. Do not tell Legion.', lose:'No. Scroll prices are SRD prices.', done:'You already have today\'s price.'}}},
 {id:'korrin', name:'Korrin Ashhand', short:'Korrin', role:'gate guard of the Ashen Gate', home:'clan', race:'halforc', look:{skin:'#8aa070',hair:'#1a1a1a',shirt:'#3b3838',pants:'#2a2228',helm:'#5a5a60'}, voice:{pitch:0.7,rate:0.9}, faction:'clan',
  sched:NIGHTWORK, spots:{work:[{a:'gate',dx:3.6,dz:2.5},{a:'gate',dx:-3.6,dz:2.5}],eat:{a:'A',dx:3,dz:8},sleep:{a:'hold',dx:-5,dz:6}},
  P:{traits:'terse, loyal, respects the Death of Earth', greet:['Halt. Korrin Ashhand, Ashen Gate. You\'re the Guild\'s. Pass.'], again:['{name}. Pass.','You again. Good.'],
   bye:['Keep moving.','Stay out of the blight\'s way.'], self:['I guard the Ashen Gate. Night shift. The Warden keeps it at the hour of soil. I keep it the rest.'],
   work:['Watch. Wait. Watch.'], place:['Gravenmoor. Clan city. Behave and you\'re welcome.'],
   rumor:['The blight walks at night. Toward Havenwall. Always.','The Warden spoke to someone today. It doesn\'t do that.'],
   food:['Bread. Salt. Done.'], sleepy:'…On shift tonight. Sleeping now. Make it quick.', thanks:['Hm.'], compliment:['…Hm. Thanks.'], unknown:['Don\'t know.','Ask the scribe.'],
   mori:'Your Mori waved at me. Nobody waves at me.', delroth:'My lord. Nothing more to say.', blight:'It walks at night. We hunt it at the edges. Clan raids.',
   legion:'Legion is many. Don\'t count them. They hate that.'}},
 {id:'dagna', name:'Dagna Cinderjaw', short:'Dagna', role:'clan smith', home:'clan', race:'dwarf', look:{skin:'#d8a880',hair:'#2a2a2a',shirt:'#5a2a22',pants:'#2a2228',apron:'#3a2a1a',beard:'#2a2a2a'}, voice:{pitch:0.8,rate:0.95}, faction:'clan', anvil:true,
  sched:DAYWORK, spots:{work:[{a:'A',dx:-4,dz:14}],eat:{a:'A',dx:-1,dz:8},sleep:{a:'A',dx:-8,dz:17}},
  P:{traits:'blunt, proud, competitive with Brakka and Grizzik', greet:['Dagna Cinderjaw. Clan smith. If you\'re here to chat, chat while I hammer.'], again:['{name}. You\'re back. Still not a smith, I see.','{name}. Visit {visits}. Bring steel next time.'],
   bye:['Off with you.','Forge on.'], self:['I make shields and nails and the odd gate hinge. Good steel, no magic, no nonsense.'],
   work:['Shields for Havenwall\'s wall. Always shields.'], place:['Gravenmoor. Ugly, smoky, honest. Like my forge.'],
   rumor:['Brakka thinks the Dragon\'s Forge is the best forge on the planet. It\'s second best.','The goblin at your Guild, Grizzik? Decent rivets. Don\'t tell him I said so.'],
   food:['Meat and dark bread. Anything else is decoration.'], sleepy:'Hrmph. Woke me. Talk.', thanks:['Aye.'], compliment:['I know.'], unknown:['Don\'t know. Don\'t care. Ask me about steel.'],
   mori:'Your Mori lifts mountains. I lift hammers. We understand each other.', delroth:'He paid for this anvil. He never asks for anything back except good work.', blight:'The blight rots leather and rusts nails. I keep making more.',
   topics:{'shield|steel|forge|armor|weapon':['A Heavy Steel Shield is 3 ore and 1 timber at your goblin\'s forge. Bring me one and I\'ll send it to the wall.']}}},
 {id:'brakka', name:'Brakka Coalgrin', short:'Brakka', role:'goblin armor smith', home:'haven', existing:'brakka', race:'goblin', voice:{pitch:1.3,rate:1.1}, merchant:true, shop:'brakka', faction:'haven',
  sched:DAYWORK, spots:{work:[{a:'brakka0',dx:0,dz:0}],eat:{a:'A',dx:4,dz:5},sleep:{a:'forge',dx:-7,dz:-2}},
  P:{traits:'gruff humor, "the rules of the shopkeeper"', greet:['Brakka Coalgrin. Goblin Armor Smith of the Dragon\'s Forge. Rules of the shopkeeper: you break it, it\'s yours.'], again:['{name}! Back for steel or back for trouble?','You again. Visit {visits}. Brakka\'s counting, because Brakka counts everything.'],
   bye:['Don\'t die in my armor. Bad for business.','Go. The forge needs me.'], self:['I keep the Dragon\'s Forge fed and Havenwall in armor. Masterwork and mithral, SRD prices, no refunds.'],
   work:['Studded leather, chain shirts, breastplates. And binding a certain pale cloak, if someone ever cleanses enough blight.'], place:['Havenwall. Besieged, stubborn, mine. The Kin hold the center, the Clan raids the edges, and I keep everyone in armor.'],
   rumor:['The Clan Lord\'s got a cloak — the Pale Wolf\'s Mantle — for whoever saves my walls.','Sefa\'s scouts say the blight moves at night.','My cousin Grizzik at your Guild owes me three rivets.'],
   food:['I eat by the heart-fire. Burnt sausage is the best sausage.'], sleepy:'Grr. The forge sleeps, so Brakka sleeps. What?', thanks:['Yeah, yeah.'], compliment:['Flattery is not a currency. Gold is.'], unknown:['Brakka doesn\'t know. Brakka knows armor.','Ask me about armor or the Mantle.'],
   mori:'Your Mori sent the Kin out with a cleanse job. Good little engine.', delroth:'Clan Lord keeps his promises. That\'s rare. That\'s why I trust him.', blight:'Coilblight eats leather. Not my leather. My leather bites back. It\'s at {pct}% now.',
   trusted:['Trusted customers get first pick of mithral scraps. Do not tell Grizzik.'], haggle:{dc:15, win:'Hmph. Ten percent off today. Don\'t spread it around.', lose:'Rules of the shopkeeper: the price is the price.', done:'You already got today\'s discount. Greedy.'}}},
 {id:'sefa', name:'Sefa Greymane', short:'Sefa', role:'Moonfang Kin scout', home:'haven', race:'wolf', look:{skin:'#8a8a90',hair:'#5a5a62',shirt:'#3a4a3a',pants:'#2a3028'}, voice:{pitch:0.9,rate:1.0}, faction:'kin',
  sched:[[0,'work'],[4,'eat'],[5,'work'],[11,'eat'],[12.5,'sleep'],[20,'work']], spots:{work:[{a:'A',dx:26,dz:-18},{a:'A',dx:-24,dz:-14},{a:'A',dx:-8,dz:28}],eat:{a:'A',dx:2,dz:-4},sleep:{a:'A',dx:-6,dz:-8}},
  P:{traits:'watchful, short hunting metaphors, protective of the refugees', greet:['…You smell of the Guild. I am Sefa Greymane of the Moonfang Kin. I scout the blight\'s edge.'], again:['{name}. Your scent is known now.','Back, {name}. Good. The hunt needs hands.'],
   bye:['Run well.','Keep to the clean ground.'], self:['A scout of the Moonfang Kin. We hold Havenwall\'s center and push the blight outward, tile by tile.'],
   work:['Walk the edge. Find where the blight is thin. Burn it.'], place:['Havenwall. The wall holds. We make sure it keeps holding.'],
   rumor:['The blight moves at night, toward the forge. It hates the light.','The Clan raids from the edges, we cleanse from the center. Between us, we will meet.'],
   food:['Meat, raw if the Kin are watching, cooked if Wren is.'], sleepy:'*one eye opens* …Speak softly. Scouts sleep light.', thanks:['The Kin remember.'], compliment:['…Hm. You are kind.'], unknown:['I don\'t track that.','Ask me about the blight, or the Kin.'],
   mori:'Your Mori sends cleanse jobs with us. She is small, but she does not run.', delroth:'The Clan Lord is an ally. Allies are rare. We keep them.', blight:'The Coilblight holds {pct}% of the ground. Stand on purple ground and press E to purge it.'}},
 {id:'tobin', name:'Tobin Marsh', short:'Tobin', role:'refugee farmer', home:'haven', race:'human', look:{skin:'#d8b090',hair:'#d8d8d8',shirt:'#7a6a4a',pants:'#4a4030',beard:'#d8d8d8',hat:'#9a8a5a'}, voice:{pitch:0.75,rate:0.85}, faction:'haven',
  sched:DAYWORK, spots:{work:[{a:'A',dx:-15,dz:9},{a:'A',dx:-12,dz:12}],eat:{a:'A',dx:1,dz:7},sleep:{a:'A',dx:-9.5,dz:16}},
  P:{traits:'weary but hopeful, misses his fields', greet:['*cough* Afternoon. Tobin Marsh. I farmed the downs before the blight came. Now I mend walls.'], again:['{name}, good to see you. *cough*','Ah, you came back. Not many do.'],
   bye:['Mind yourself out there.','Thank you for stopping. Truly.'], self:['I grew barley out on the downs. The blight took the fields. Havenwall took us in.'],
   work:['I carry stones for the wall. My back complains; the wall doesn\'t.'], place:['Havenwall saved my family. I\'ll mend its walls till I drop.'],
   rumor:['Wren says the Guild has a healer called Mori. Is that true?','When the blight is gone, I\'m going home to plant barley.'],
   food:['Whatever the Kin bring. Grateful for all of it.'], sleepy:'*cough* …Is it morning already? No? Then sit a moment.', thanks:['No, thank you.'], compliment:['You\'re too kind to an old man.'], unknown:['I wouldn\'t know. I\'m just a farmer.'],
   mori:'If Mori can plant meadows, maybe she can plant my barley one day.', delroth:'The Clan Lord sends bread. People fear him. I don\'t.', blight:'It took my fields. It\'s at {pct}% here now. I pray it shrinks.'}},
 {id:'wren', name:'Wren Hollis', short:'Wren', role:'refugee weaver', home:'haven', race:'human', look:{skin:'#c89870',hair:'#3a2418',shirt:'#8a4a5a',pants:'#4a3a3a'}, voice:{pitch:1.2,rate:1.05}, faction:'haven',
  sched:DAYWORK, spots:{work:[{a:'A',dx:-13,dz:15}],eat:{a:'A',dx:2,dz:8},sleep:{a:'A',dx:-11,dz:17.5}},
  P:{traits:'kind, practical, organizes the tents', greet:['Hi! Wren Hollis. I weave, and I keep the refugee tents in order. Mind the ropes.'], again:['{name}! Welcome back. Visit {visits}, I\'m counting.','Hello again! Tobin asked about you.'],
   bye:['Take care out there.','Come back safe, okay?'], self:['I weave charms and blankets, and I make sure everyone in the tents gets fed. Somebody has to.'],
   work:['Weaving. And worrying about Tobin\'s cough.'], place:['Havenwall. It\'s crowded and it\'s scary, but people here help each other.'],
   rumor:['Lark, the bard at the Guild tavern, wants one of my charms. I\'ll make him one.','Sefa leaves fresh meat by the tents every morning. She thinks we don\'t notice.'],
   food:['Soup for the tents. There\'s always enough if everyone shares.'], sleepy:'Mm? Oh — hi. Whisper, Tobin\'s sleeping.', thanks:['Of course!'], compliment:['Aw, thank you!'], unknown:['I don\'t know, sorry! Ask Sefa or Brakka?'],
   mori:'Mori? Is she the one who sends the Kin? Tell her thank you from all of us.', delroth:'He sends bread every week. That\'s all I need to know about him.', blight:'It\'s at {pct}% now. Every tile you purge is one more family that can walk outside.'}}
];
const BYID={}; DEFS.forEach(d=>BYID[d.id]=d);
/* ---------- the scripted brain ---------- */
const RX={ greet:/^(hi|hello|hey|howdy|greetings|good (morning|evening|day|afternoon)|well met|yo|hiya|sup)\b/, bye:/\b(bye|goodbye|farewell|see you|see ya|later|good ?night)\b/, thanks:/\b(thanks|thank you|thx|cheers)\b/,
  yes:/^(yes|yeah|yep|sure|ok|okay|i accept|accept|i will|i'll do it|deal|alright|of course|aye)\b/, no:/^(no|nope|not now|maybe later|decline|nah)\b/,
  quest:/\b(quest|task|job for me|any work|work for (me|you)|need (help|anything)|can i help|help you|turn in|i'?m done|done|finished|brought|i have (it|them|the)|deliver|report|here you go|here it is|reward)\b/,
  haggle:/\b(haggle|discount|cheaper|bargain|lower (the )?price|better price|deal\?)\b/, who:/\b(who are you|your name|what'?s your name|introduce|tell me about yourself)\b/, work:/\b(what do you do|your job|your work|what are you doing|busy)\b/,
  place:/\b(where am i|this place|this town|this city|about (here|the town|the city|this)|what is this)\b/, rumor:/\b(rumou?rs?|news|gossip|heard anything|what'?s new|anything new)\b/,
  mori:/\bmori\b/, delroth:/\b(delroth|clan lord)\b/, blight:/\b(blight|coilblight|corruption|purge|cleanse)\b/, legion:/\b(legion|death of earth|warden)\b/,
  food:/\b(food|eat|hungry|drink|ale|stew|supper|lunch|breakfast)\b/, sleep:/\b(sleep|tired|bed|night)\b/, rep:/\b(think of me|like me|reputation|rep|standing|trust me)\b/, mem:/\b(remember me|do you remember|know me|met before)\b/,
  rules:/\b(rules?|behave|law|laws)\b/, compliment:/\b(nice|great|awesome|love|beautiful|cool|amazing|wonderful|you rock)\b/, insult:/\b(stupid|ugly|idiot|hate you|shut up|dumb|useless)\b/,
  gift:/\b(gift|present|for you|brought you|give you)\b/, persona:/\b(my (name|class|race|background|story|bio)|who am i|about me)\b/ };
function pick(arr, n){ if(!arr||!arr.length) return ''; if(typeof arr==='string') return arr; return arr[Math.abs(n|0)%arr.length]; }
function fill(s, st){ return String(s||'').replace(/\{name\}/g,st.player||'friend').replace(/\{visits\}/g,String(st.mem.met||1)).replace(/\{pct\}/g,String(st.world&&st.world.pct!=null?st.world.pct:'?')); }
function altPick(arr, seed){ if(!arr||!arr.length) return ''; if(typeof arr==='string') return arr; const i=Math.abs(seed|0)%arr.length; return {text:arr[i], i, n:arr.length, all:arr}; }
function skillMod(state, skill){ const cha=(state.persona&&state.persona.chaMod)|0; const lvl=state.level|0; const bond=state.bondTier|0;
  const rep=state.repTier==='Revered'?4:state.repTier==='Honored'?3:state.repTier==='Friendly'?2:0;
  const train=skill==='diplomacy'?2:skill==='bluff'?1:skill==='intimidate'?2:0;
  return cha+Math.floor(lvl/2)+bond+Math.floor(rep/2)+train+(state.skillBonus|0); }
function npcReply(npc, text, state){ const P=npc.P, m=Object.assign({met:0,talks:0,topics:{},haggle:{}}, JSON.parse(JSON.stringify(state.mem||{}))); const t=String(text||'').toLowerCase().trim(); const n=(m.talks||0)+(npc.id.length)+(state.alt|0);
  const out={text:'', actions:[], mem:m, intent:'fallback', alts:[]}; const say=s=>{ out.text+=(out.text?' ':'')+fill(s,Object.assign({},state,{mem:m})); };
  m.talks=(m.talks||0)+1; const asleep=state.phase==='sleep'&&npc.id!=='grizzik';
  const has=k=>RX[k].test(t); const intent=k=>{ out.intent=k; m.topics[k]=(m.topics[k]||0)+1; };
  const persona=state.persona||{}; const bondName=state.bondName||'Stranger'; const bondTier=state.bondTier|0;
  if(asleep&&!m.wokeAt) { m.wokeAt=state.hour; say(P.sleepy); } if(!asleep) delete m.wokeAt;
  if(state.pins&&state.pins.length&&t===''&&bondTier>=1){ say('I still hold what you pinned: "'+state.pins[0].text+'".'); }
  (state.chain||[]).forEach(q=>{ if(P.chain&&P.chain[q]) { say(P.chain[q]); out.intent='chain'; } });
  const ready=state.ready||[], active=state.active||[];
  const roomTalk=/\b(cleared (?:a |the )?(?:room|undercroft)|clear(?:ed)? (?:a |the )?room|swept|every foe)\b/.test(t);
  const askTurn=/\b(turn in|i'?m done|finished the quest|brought it|here you go|here it is)\b/.test(t);
  const doneWith=(state.world&&state.world.doneWith)||[];
  if(ready.length&&(askTurn||roomTalk||(has('yes')&&m.pendingTurnIn===ready[0].id))){ intent('turnIn'); delete m.pendingTurnIn; out.actions.push({type:'turnIn', id:ready[0].id}); say(ready[0].thanks); return out; }
  if(!ready.length&&(askTurn||roomTalk)){ intent('quest');
    if(doneWith.length) say('"'+doneWith[doneWith.length-1]+'" is already in the ledger, and it is paid. Ask me for work if you want another line.');
    else if(active.length) say('"'+active[0].title+'": '+active[0].prog+'. It is not ready to turn in yet.');
    else say('Nothing of yours is waiting in the ledger.');
    return out; }
  if(t===''){ intent('open'); if(ready.length) m.pendingTurnIn=ready[0].id; if(!m.met||m.met<=1&&m.talks<=1) say(pick(P.greet,n)); else say(pick(P.again,n));
    if(bondTier>=1&&persona.name&&persona.name!=='friend'){ say(bondTier>=2?('Good to see you, '+persona.name+(persona.cls?' the '+persona.cls:'')+'.'):('Ah — '+persona.name+', yes?')); }
    if(bondTier>=3&&P.trusted) say(pick(P.trusted,n));
    if(state.world&&state.world.mantleBound&&(npc.home==='haven'||npc.home==='clan')&&!m.saidMantle){ m.saidMantle=1; say('You\'re the one who bound the Pale Wolf\'s Mantle. Thank you.'); }
    if(ready.length) say('"'+ready[0].title+'" is ready. Say yes, or "turn in", and I will pay the ledger.');
    else if(state.offer&&!m.offered){ m.offered=state.offer.id; m.offer=state.offer.id; say(state.offer.offer+' (say "yes" to accept)'); } else if(active.length) say('How goes "'+active[0].title+'"? '+active[0].prog+'.');
    out.alts=(P.again||P.greet||[]).slice(); return out; }
  // v3.6: keyword-offer a talk-objective quest (overrides a pending non-talk offer so Diplomacy/etc. stay reachable)
  if(state.openTalk&&state.openTalk.length&&t){ for(const tq of state.openTalk){ if(tq.keywords&&tq.keywords.test(t)){ intent('offerTalk'); m.offer=tq.id; say(tq.offer+' (say "yes" to accept)'); return out; } } }
  if(m.offer&&has('yes')){ intent('accept'); out.actions.push({type:'accept', id:m.offer}); const q=m.offer; delete m.offer; say(pick(['Thank you. ','Good. ','Wonderful! '],n)+(state.offerById&&state.offerById[q]?state.offerById[q].desc:'')); return out; }
  if(m.offer&&has('no')){ intent('decline'); delete m.offer; m.offered=null; say('No harm done. Ask me about work if you change your mind.'); return out; }
  if(state.talkQuests&&state.talkQuests.length){
    for(const tq of state.talkQuests){ if(tq.done) continue; const hit=tq.keywords&&tq.keywords.test(t); if(!hit) continue;
      intent('talkcheck'); const roll=(state.d20|0)||10; const mod=skillMod(state,tq.skill); const tot=roll+mod; const ok=tot>=tq.dc;
      const modStr=mod>=0?' +'+mod:' '+mod; const fillT=s=>String(s).replace(/\{roll\}/g,roll).replace(/\{mod\}/g,modStr).replace(/\{tot\}/g,tot).replace(/\{dc\}/g,tq.dc);
      say(fillT(ok?tq.win:tq.lose)); out.actions.push({type:'talkcheck', id:tq.id, ok, roll, mod, dc:tq.dc, skill:tq.skill}); out.alts=[fillT(tq.win),fillT(tq.lose)]; return out; }
  }
  if(has('quest')){ intent('quest'); if(active.length){ say('"'+active[0].title+'": '+active[0].prog+'.'); return out; } if(state.offer){ m.offer=state.offer.id; say(state.offer.offer+' (say "yes" to accept)'); return out; }
    say(state.hint?'Nothing from me right now. '+state.hint:'Nothing from me right now. Thank you for asking.'); return out; }
  if(has('haggle')){ intent('haggle'); const H=P.haggle; if(!npc.merchant||!H){ say(H&&H.no?H.no:'I\'m not selling anything, friend.'); return out; } if(H.no&&!H.win){ say(H.no); return out; }
    const day=state.day|0; if(m.haggle.day===day&&m.haggle.won){ say(H.done||'You already have my best price today.'); return out; } if(m.haggle.day===day&&m.haggle.tries>=1){ say('You already tried today. Come back tomorrow.'); return out; }
    const bonus=state.repTier==='Revered'?6:state.repTier==='Honored'?4:state.repTier==='Friendly'?2:0; const bondBonus=bondTier>=3?2:bondTier>=2?1:0; const roll=(state.d20|0)||10, tot=roll+bonus+bondBonus;
    m.haggle={day, tries:1, won:tot>=H.dc, roll, bonus:bonus+bondBonus, dc:H.dc}; out.actions.push({type:'haggle', won:tot>=H.dc, roll, bonus:bonus+bondBonus, dc:H.dc}); say('(Diplomacy d20 '+roll+(bonus+bondBonus?' +'+(bonus+bondBonus)+' mod':'')+' = '+tot+' vs DC '+H.dc+') '+(tot>=H.dc?H.win:H.lose)); return out; }
  if(has('gift')){ intent('gift'); out.actions.push({type:'gift'}); say(bondTier>=2?'For me? You shouldn\'t have — but I will remember this.':'A gift? That is kind. I will remember.'); return out; }
  if(has('persona')){ intent('persona'); say(persona.name?'You are '+persona.name+(persona.race?', '+persona.race:'')+(persona.cls?' '+persona.cls:'')+(persona.background?', '+persona.background:'')+(persona.bio?'. '+persona.bio:'')+'.':'I do not know your name yet — tell Mori, or set it in HeroLock.'); return out; }
  if(has('bye')){ intent('bye'); say(pick(P.bye,n)); out.alts=P.bye||[]; return out; }
  if(has('thanks')){ intent('thanks'); say(pick(P.thanks,n)); out.alts=P.thanks||[]; return out; }
  if(has('greet')){ intent('greet'); say(m.met>1?pick(P.again,n):pick(P.greet,n)); out.alts=(m.met>1?P.again:P.greet)||[]; return out; }
  if(has('mem')){ intent('mem'); const done=(state.world&&state.world.doneWith||[]); const bits=['We\'ve talked '+(m.met||1)+' time'+((m.met||1)>1?'s':'')+'.']; if(done.length) bits.push('You did "'+done.join('", "')+'" for me.');
    if(state.pins&&state.pins.length) bits.push('You pinned: "'+state.pins.map(p=>p.text).join('"; "')+'".'); if(m.haggle&&m.haggle.tries) bits.push(m.haggle.won?'You talked me down on price once. I remember that.':'You tried to haggle with me. I remember that too.'); if(state.repTier) bits.push('Folk here think you\'re '+state.repTier.toLowerCase()+'.'); bits.push('Bond: '+bondName+'.'); say(bits.join(' ')); return out; }
  if(has('rep')){ intent('rep'); const tier=state.repTier; say(!tier?'You\'re a friend of the Guild. Bond: '+bondName+'.':tier==='Hostile'||tier==='Unfriendly'?'Honestly? People here don\'t know you yet. Help out and that changes. Bond: '+bondName+'.':tier==='Neutral'?'You\'re known here. Not famous. Known. Bond: '+bondName+'.':'You\'re '+tier.toLowerCase()+' here. Bond: '+bondName+'.'); return out; }
  if(has('who')){ intent('who'); say(pick(P.self,n)); out.alts=P.self||[]; return out; }
  if(has('work')){ intent('work'); say(pick(P.work,n)); out.alts=P.work||[]; return out; }
  if(P.topics) for(const k in P.topics){ if(new RegExp(k).test(t)){ intent('topic'); const ap=altPick(P.topics[k], n); say(ap.text||ap); out.alts=P.topics[k]; return out; } }
  if(has('legion')&&P.legion){ intent('legion'); say(P.legion); return out; }
  if(has('mori')){ intent('mori'); say(P.mori); return out; } if(has('delroth')){ intent('delroth'); say(P.delroth); return out; } if(has('blight')){ intent('blight'); say(P.blight); return out; }
  if(has('rules')&&P.rules){ intent('rules'); say(P.rules); return out; }
  if(has('place')){ intent('place'); say(pick(P.place,n)); out.alts=P.place||[]; return out; } if(has('rumor')){ intent('rumor'); say(pick(P.rumor,m.topics.rumor||0)); out.alts=P.rumor||[]; return out; }
  if(has('food')){ intent('food'); say(pick(P.food,n)); out.alts=P.food||[]; return out; } if(has('sleep')){ intent('sleep'); say(asleep?'I *was* sleeping.':'I sleep '+(npc.sched===NIGHTWORK?'by day; I work the night.':'when the guild clock turns dark.')); return out; }
  if(bondTier<1&&/\b(secret|trust|swear|promise me|your love)\b/.test(t)){ intent('bondgate'); say('We only just met. Talk a while — Acquaintance first.'); return out; }
  if(has('compliment')){ intent('compliment'); say(pick(P.compliment,n)); out.alts=P.compliment||[]; return out; }
  if(has('insult')){ intent('insult'); say('That\'s unkind. I\'ll forget it if you do. Let\'s talk about something else.'); return out; }
  intent('fallback'); say(pick(P.unknown,n)); say('Ask me about '+['my work','this place','rumors',npc.merchant?'a discount':'Mori','any work for you'].join(', ')+'.'); out.alts=P.unknown||[]; return out; }

let brain=npcReply;
/* ---------- bodies ---------- */
let vmat=null; const parts=[];
function bodyGeo(d){ const lk=d.look, R=L[d.race]||L.human, w=R.wide||1, p=[], P_=(g,c,x,y,z,rx,ry,rz,sx,sy,sz)=>p.push(TWOSPEED.part(g,c,x,y,z,rx||0,ry||0,rz||0,sx,sy,sz));
  [-0.1,0.1].forEach(s=>P_(new T.BoxGeometry(0.15,0.52,0.16),lk.pants,s*w,0.26,0));
  P_(new T.CylinderGeometry(0.19,0.23,0.6,8),lk.shirt,0,0.82,0,0,0,0,w,1,w*0.9); [-1,1].forEach(s=>P_(new T.BoxGeometry(0.1,0.52,0.11),lk.shirt,s*0.3*w,0.84,0,0,0,s*0.08));
  [-1,1].forEach(s=>P_(new T.SphereGeometry(0.06,6,4),lk.skin,s*0.31*w,0.56,0));
  if(lk.apron) P_(new T.BoxGeometry(0.34*w,0.5,0.03),lk.apron,0,0.72,0.22*w);
  P_(new T.SphereGeometry(0.17,10,8),lk.skin,0,1.3,0); P_(new T.SphereGeometry(0.03,4,3),'#1a1a1a',-0.06,1.33,0.155); P_(new T.SphereGeometry(0.03,4,3),'#1a1a1a',0.06,1.33,0.155);
  if(R.wolf){ P_(new T.BoxGeometry(0.12,0.1,0.18),lk.skin,0,1.26,0.18); P_(new T.SphereGeometry(0.03,4,3),'#111',0,1.29,0.28); [-1,1].forEach(s=>P_(new T.ConeGeometry(0.06,0.18,4),lk.hair,s*0.1,1.5,0,0,0,-s*0.25)); P_(new T.SphereGeometry(0.18,10,8),lk.hair,0,1.36,-0.03,0,0,0,1,0.8,1); }
  else P_(new T.SphereGeometry(0.175,10,8,0,Math.PI*2,0,Math.PI*0.55),lk.hair,0,1.33,-0.01);
  if(R.ears) [-1,1].forEach(s=>P_(new T.ConeGeometry(0.035,0.14,4),lk.skin,s*0.17,1.33,0,0,0,-s*1.2));
  if(lk.beard) P_(new T.BoxGeometry(0.2,0.16,0.08),lk.beard,0,1.2,0.13);
  if(lk.hat) { P_(new T.CylinderGeometry(0.26,0.26,0.03,10),lk.hat,0,1.46,0); P_(new T.CylinderGeometry(0.13,0.16,0.18,10),lk.hat,0,1.55,0); }
  if(lk.helm) P_(new T.SphereGeometry(0.19,10,6,0,Math.PI*2,0,Math.PI*0.45),lk.helm,0,1.34,0);
  if(lk.goggles) { [-1,1].forEach(s=>P_(new T.TorusGeometry(0.045,0.015,4,8),'#c8a040',s*0.065,1.36,0.15)); }
  return TWOSPEED.merge(p); }
function labelTex(d){ const c=document.createElement('canvas'); c.width=256; c.height=64; const x=c.getContext('2d'); x.fillStyle='rgba(16,12,24,0.72)'; x.beginPath(); x.roundRect?x.roundRect(4,4,248,56,14):x.rect(4,4,248,56); x.fill();
  x.fillStyle='#ffe9a8'; x.font='bold 24px sans-serif'; x.textAlign='center'; x.fillText(d.short||d.name,128,30); x.fillStyle='#c8c0d8'; x.font='16px sans-serif'; x.fillText(d.role,128,52); const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; }
function makeBody(d){ const g=new T.Group(); g.name='npc_'+d.id; const R=L[d.race]||L.human; const m=new T.Mesh(bodyGeo(d),vmat); m.castShadow=!X.mobile; g.add(m); g.scale.setScalar(R.scale);
  const lb=new T.Sprite(new T.SpriteMaterial({map:labelTex(d),depthWrite:false})); lb.scale.set(1.9/R.scale,0.48/R.scale,1); lb.position.y=1.95; lb.renderOrder=5; g.add(lb); g.userData.label=lb; g.userData.body=m; return g; }
/* ---------- the living layer ---------- */
const live=[]; let guildGrp=null, anvilG=null, tents=null;
function spotXY(s, A){ if(Array.isArray(s)) return {x:s[0], z:s[1]}; const a=A[s.a]||A.A; return {x:a.x+(s.dx||0), z:a.z+(s.dz||0)}; }
function nudge(p, F){ if(!F) return p; for(let k=0;k<3;k++) F.colliders.circles.forEach(c=>{ const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz), m=c.r+0.6; if(d<m){ const a=d>1e-3?Math.atan2(dz,dx):1; p.x=c.x+Math.cos(a)*m; p.z=c.z+Math.sin(a)*m; } }); return p; }
function resolve(d, A, F){ const S=d.spots, r={work:(S.work||[]).map(s=>nudge(spotXY(s,A),F)), eat:nudge(spotXY(S.eat,A),F), sleep:nudge(spotXY(S.sleep,A),F)}; return r; }
function phaseAt(d,h){ let a=d.sched[d.sched.length-1][1]; for(const [s,k] of d.sched) if(h>=s) a=k; return a; }
function hour(){ return (X.S().clock||0)/X.DAY*24; }
function spawn(d, g, A, F, root, existing){ const n={d, g, spots:resolve(d,A,F), x:0, z:0, yaw:0, act:'work', walking:false, existing:!!existing, F};
  const h=hour(), a=phaseAt(d,h), sp=target(n,a,h); n.x=sp.x; n.z=sp.z; n.act=a; place(n,0); if(root&&!existing) root.add(g); live.push(n); return n; }
function target(n,a,h){ if(a==='work'){ const w=n.spots.work; return w[Math.floor(h/1.5)%w.length]; } return n.spots[a]||n.spots.work[0]; }
function place(n,t){ const y=X.hAt(n.x,n.z), g=n.g; if(!g) return; const lie=n.act==='sleep'&&!n.walking&&n.d.id!=='grizzik', sit=n.act==='eat'&&!n.walking;
  g.position.set(n.x, y+(n.walking?Math.abs(Math.sin(t*7))*0.05:0)+(lie?0.18:0)-(sit?0.12:0), n.z); g.rotation.set(lie?-Math.PI/2:0, n.yaw, 0, 'YXZ');
  if(g.userData.label){ const p=X.player.pos; g.userData.label.visible=Math.hypot(p.x-n.x,p.z-n.z)<16; } }
function buildGuild(){ guildGrp=new T.Group(); guildGrp.name='npcs_guild'; X.scene.add(guildGrp); const st=X.STATIONS; const A={A:{x:0,z:0}};
  DEFS.filter(d=>d.home==='guild'||d.home==='bard').forEach(d=>{ if(d.existing==='grizzik'){ spawn(d,null,{A:{x:0,z:0}},null,null,true); return; } spawn(d, makeBody(d), A, null, guildGrp); }); }
function siteHook(F,K){ for(let i=live.length-1;i>=0;i--) if(live[i].d.home==='clan'||live[i].d.home==='haven') live.splice(i,1); anvilG=null; tents=null;
  const site=window.CLAN&&CLAN.site; if(!site||!X) return; const A={A:F.A}; ['hold','stall','gate','forge'].forEach(k=>{ if(site[k]) A[k]=site[k]; }); if(site.brakka) A.brakka0={x:site.brakka.x,z:site.brakka.z};
  const home=site.kind; if(home==='clan'){ const a=spotXY({a:'A',dx:-4,dz:14.8},A); anvilG=new T.Mesh(new T.BoxGeometry(0.9,0.6,0.45),new T.MeshLambertMaterial({color:'#3a3a3a'})); anvilG.position.set(a.x,K.heightAt(a.x,a.z)+0.3,a.z); K.root.add(anvilG); }
  if(home==='haven'){ tents=new T.Group(); [[-9.5,17],[-12,18.6],[-7,19.2]].forEach(([dx,dz],i)=>{ const x=F.A.x+dx, z=F.A.z+dz; const c=new T.Mesh(new T.ConeGeometry(1.6,2,4),new T.MeshLambertMaterial({color:['#c8b890','#a89878','#b8a080'][i]})); c.position.set(x,K.heightAt(x,z)+1,z); c.rotation.y=0.6+i; tents.add(c); }); K.root.add(tents); }
  DEFS.filter(d=>d.home===home).forEach(d=>{ if(d.existing==='brakka'){ spawn(d, site.brakka.g, A, F, K.root, true); return; } spawn(d, makeBody(d), A, F, K.root); }); }
function present(n){ if(!X||X.mode()!=='world') return false; const h=n.d.home; if(h==='guild'||h==='bard') return X.atGuild(); const s=window.CLAN&&CLAN.site; return !!s&&s.kind===h&&live.includes(n); }
function update(dt){ if(!X) return; const t=performance.now()/1000; X.S().npcT=(X.S().npcT||0)+dt; const h=hour();
  for(const n of live){ if(!present(n)) continue; const a=phaseAt(n.d,h); const tg=target(n,a,h); const dx=tg.x-n.x, dz=tg.z-n.z, d=Math.hypot(dx,dz);
    if(n.talking){ n.walking=false; const p=X.player.pos; n.yaw=Math.atan2(p.x-n.x,p.z-n.z); }
    else if(d>45){ n.x=tg.x; n.z=tg.z; n.act=a; n.walking=false; } /* after a long time-skip, don't march across the map */
    else if(d>0.2){ const sp=Math.min(d,2.4*dt); n.x+=dx/d*sp; n.z+=dz/d*sp; n.yaw=Math.atan2(dx,dz); n.walking=true; n.act=a; }
    else { n.walking=false; n.act=a; }
    if(n.existing&&n.d.existing==='brakka'&&CLAN.site&&CLAN.site.brakka){ CLAN.site.brakka.x=n.x; CLAN.site.brakka.z=n.z+1.6; }
    if(n.g) place(n,t); } }
function byId(id){ return BYID[id]; }
function liveOf(id){ return live.find(n=>n.d.id===id&&present(n)); }
function posOf(n){ if(n.d.existing==='grizzik'){ const st=X.STATIONS.forge; return {x:st.x-1.5, z:st.z}; } return {x:n.x, z:n.z}; }
function nearest(r){ const p=X.player.pos; let best=null, bd=r||3.2; live.forEach(n=>{ if(!present(n)) return; const q=posOf(n), d=Math.hypot(q.x-p.x,q.z-p.z); if(d<bd){ bd=d; best=n; } }); return best; }
function targets(){ const out=[]; if(!X||X.mode()!=='world') return out; live.forEach(n=>{ if(!present(n)||n.d.id==='brakka') return; /* Brakka keeps her shop target (demonclan); 💬 Talk or the shop's Talk button opens her chat */ const asleep=phaseAt(n.d,hour())==='sleep'&&n.d.id!=='grizzik';
  out.push({get x(){ return posOf(n).x; }, get z(){ return posOf(n).z; }, r:2.4, npc:n.d.id, label:'💬 Talk to '+n.d.name+' · '+n.d.role+(asleep?' (asleep)':''), act:()=>X.openNpc(n.d.id)}); }); return out; }
function counts(){ const by={guild:0,bard:0,clan:0,haven:0}; DEFS.forEach(d=>by[d.home]++); return {total:DEFS.length, by, live:live.length}; }
window.NPCS={ DEFS, init(o){ X=o; vmat=new T.MeshLambertMaterial({vertexColors:true}); buildGuild(); }, siteHook, update, targets, nearest, byId, liveOf, present, posOf, phaseAt:(id,h)=>phaseAt(BYID[id],h==null?hour():h), hour, counts,
  npcReply:(npc,text,state)=>brain(npc,text,state), scriptedReply:npcReply, setBrain(fn){ brain=typeof fn==='function'?fn:npcReply; }, get live(){ return live; }, RX };
})();
