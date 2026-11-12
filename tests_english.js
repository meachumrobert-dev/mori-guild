/* Mori's English, herb patches, the Strider bench, and the tablet sandbox.
   Run: node tests_english.js */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('assert'), path=require('path');
let n=0; function ok(cond, msg){ assert.ok(cond, msg); n++; }
function load(file, extra){ const c=Object.assign({console, Math, window:{}}, extra||{}); c.window=c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'), c); return c; }

const L=load('js/lexicon.js');
const E=load('js/english.js');
const chat=load('js/morichat.js', {LEXICON:L.LEXICON, ENGLISH:E.ENGLISH});
chat.LEXICON=L.LEXICON; chat.ENGLISH=E.ENGLISH; chat.window.LEXICON=L.LEXICON; chat.window.ENGLISH=E.ENGLISH;
const M=chat.MORICHAT, EN=E.ENGLISH;
ok(EN.article('elf')==='an' && EN.article('ruler')==='a', 'articles follow the first sound');
ok(EN.oxford(['roads','villages','cities'])==='roads, villages, and cities', 'lists use an Oxford comma');
ok(EN.plural('city',2)==='cities' && EN.plural('city',1)==='city', 'plurals agree with the count');

const ctx={mem:{}, n:1, atGuild:true, regionName:'The Thalulfall Reach', place:'the guild, in The Thalulfall Reach', openQuests:0, questLine:'no quests yet.',
  hereCity:()=>({named:true, name:'Guildhold', ruler:'The Guild Charter (Seedkeeper Mori)', motto:'We were made to make the world.', govName:'Guild Charter', race:'mixed guild folk', arts:['pottery'], region:'The Thalulfall Reach'}),
  cityList:()=>[{name:'Old Tor', ruler:'Lady Venn of Tor', motto:'Stone remembers.', govName:'Lordship', race:'human', region:'The Old Tor Marches'}]};
const rules=M.reply('who rules here?', ctx);
const charge=M.reply("who's in charge?", ctx);
const ofCity=M.reply('ruler of this city', ctx);
ok(/Seedkeeper Mori/.test(rules)&&/Guildhold/.test(rules)&&/We were made to make the world/.test(rules), 'who rules here reads the city card');
ok(/Seedkeeper Mori/.test(charge)&&/Seedkeeper Mori/.test(ofCity), 'in charge and ruler of are the same question');
ok(!/invent a ruler/.test(rules), 'a real card is not called an invention');
const cities=M.reply('tell me about the city-states', ctx);
ok(/Old Tor/.test(cities)&&/Lady Venn/.test(cities)&&/Stone remembers/.test(cities), 'city-states come from the map');
const hi=M.reply('hi', ctx);
ok(/Thalulfall/.test(hi)&&!/the guild is the guild/i.test(hi), 'the greeting does not say the guild is the guild');
ok(M.reply("hi Mori, where's chamomile?", ctx)===null, 'a greeting plus a question does not swallow the question');
const none=M.reply('who rules here?', {mem:{}, n:0, atGuild:false, regionName:'The Empty Shelf', hereCity:()=>({named:false, region:'The Empty Shelf'}), cityList:()=>[]});
ok(/not a city-state/.test(none)&&!/Lady /.test(none), 'no city card means no invented ruler');

const craft=load('js/craft.js');
ok(craft.CRAFT.staleBenchName("Robert's Strider Armor", 'cloak')&&!craft.CRAFT.staleBenchName("Robert's Strider Armor", 'chainshirt'), 'the armor name is stale on a cloak and fine on the chain shirt');
ok(craft.CRAFT.titledName('cloak','Light')==='Cloak of Light', 'a cloak is titled from its base');

const furn=load('js/furniture.js');
ok(furn.FURNITURE.proportions('bench').seat===0.45 && furn.FURNITURE.proportions('table').top===0.74, 'seats and tables use grounded heights');
ok(furn.FURNITURE.list().some(p=>p.name==="Robert's Strider Armor"&&p.kind==='bench'&&/fastest bench/.test(p.flavor)), 'the Strider Armor joke is a sittable bench');

function Ctor(){}
const g=load('js/gather.js', {THREE:{Object3D:Ctor, Color:Ctor}, TWOSPEED:{}});
const seen=new Set();
for(let i=0;i<8;i++) for(let j=0;j<8;j++){ let a=(i*17+j*13+9)>>>0; const rnd=()=>{ a=Math.imul(a^0x9e3779b9,0x85ebca6b)>>>0; return a/4294967296; }; seen.add(g.GATHERING.pickHerb('forest', rnd)); }
ok(seen.size>=3, 'a forest patch set mixes the herb table, not one species');
const sameA=g.GATHERING.pickHerb('forest', ()=>0.2), sameB=g.GATHERING.pickHerb('forest', ()=>0.2);
ok(sameA===sameB, 'the same patch roll keeps the same herb');
const named=g.GATHERING.whereNamed('where can I find chamomile?');
ok(/chamomile/.test(named)&&/grass/.test(named)&&!/guild meadow/.test(named), 'chamomile is not claimed in the guild meadow without a patch');

const tab=load('js/tablet.js');
const fin=load('js/fingers.js', {LEXICON:L.LEXICON, ENGLISH:E.ENGLISH, MORICHAT:M, FURNITURE:furn.FURNITURE, RECIPENOTES:null});
fin.LEXICON=L.LEXICON; fin.MORICHAT=M; fin.FURNITURE=furn.FURNITURE; fin.window.LEXICON=L.LEXICON; fin.window.MORICHAT=M; fin.window.FURNITURE=furn.FURNITURE;
ok(!tab.TABLET.validatePatch({fingers:[{kind:'template', id:'x', text:'eval(1)'}]}).ok, 'a patch that looks like code is refused');
const draft={fingers:[
  {kind:'vocab', id:'ruler.n', add:['grandee']},
  {kind:'intent', id:'ruler', any:['who is the grandee'], template:'ruler'},
  {kind:'template', id:'ruler', text:'{ruler} rules {name}.'}
]};
const slots={ruler:'Lady Venn', name:'Old Tor', motto:'Stone remembers.', gov:'Lordship', race:'human', region:'The Old Tor Marches', arts:''};
const checked=tab.TABLET.runCases(draft, [{text:'who is the grandee', intent:'ruler', includes:['Lady Venn','Old Tor'], slots}]);
ok(checked.pass&&checked.isolated, 'the sandbox passes a data finger');
const src=tab.TABLET.workerSource();
ok(src.indexOf('localStorage.getItem')<0 && src.indexOf('document.body')<0 && src.indexOf('eval(')<0, 'the worker source does not touch the save or the page');
fin.FINGERS.reapply([draft]);
ok(/Seedkeeper Mori/.test(M.reply('who is the grandee', ctx)), 'an approved finger answers with the live card');
const spare={fingers:[{kind:'furniture', id:'spare', piece:'stool', name:'Spare stool', flavor:'a spare', x:3, z:-3}]};
ok(tab.TABLET.validatePatch(spare).ok);
fin.FINGERS.reapply([spare]);
ok(furn.FURNITURE.list().some(p=>p.id==='spare'), 'an approved furniture finger plugs into the furniture list');
fin.FINGERS.restore();
ok(!furn.FURNITURE.list().some(p=>p.id==='spare') && furn.FURNITURE.list().some(p=>p.name==="Robert's Strider Armor"), 'revert drops the finger and keeps the built-in bench');
ok(M.reply('who is the grandee', ctx)===null, 'revert drops the extra phrase');

const dictCtx={console, Math, window:{}};
dictCtx.window=dictCtx;
vm.createContext(dictCtx);
['js/lexicon.js','js/english.js','js/morichat.js','js/dict.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'), dictCtx));
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'data/dict.json'),'utf8'));
dictCtx.DICT.install(raw);
ok(dictCtx.DICT.size>=8000, 'the common list has at least 8,000 lemmas');
ok(dictCtx.DICT.online.enabled===false && dictCtx.DICT.online.lookup==null, 'online lookup is off and makes no request');
ok(dictCtx.DICT.pos('person')==='n' && dictCtx.DICT.pos('be')==='v' && dictCtx.DICT.pos('the')==='f', 'parts of speech come from the list');
ok(dictCtx.DICT.lemmaOf('cities')==='city', 'a plural resolves to its lemma');
ok(dictCtx.DICT.synonyms('city').indexOf('metropolis')>=0, 'city keeps a WordNet synonym link');
ok(dictCtx.DICT.unknownWord('who rules here')===null, 'ordinary words are not called unknown');
ok(dictCtx.DICT.unknownWord('what is a flibbertigibbet')==='flibbertigibbet', 'an absent word is named, not guessed');
dictCtx.DICT.addPack([{w:'zzyzx', p:'n'}]);
ok(dictCtx.DICT.knows('zzyzx'), 'a tablet pack adds a word');
dictCtx.DICT.restorePacks();
ok(!dictCtx.DICT.knows('zzyzx'), 'revert drops the tablet pack');
const metro=dictCtx.MORICHAT.reply('tell me about the metropolis', ctx);
ok(/Old Tor/.test(metro), 'a WordNet synonym can reach the city intent');

console.log('tests_english: '+n+' checks passed');
