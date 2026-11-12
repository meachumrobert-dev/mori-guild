/* Build data/dict.json from a local WordNet 3.1 dict directory.
   Usage: node tools/build-dict.js /path/to/dict
   The WordNet files are not committed. The compact subset is. */
'use strict';
const fs=require('fs'), path=require('path'), readline=require('readline');
const dir=process.argv[2];
if(!dir){ console.error('need a WordNet dict directory'); process.exit(1); }
const POS={1:'n',2:'v',3:'a',4:'r',5:'a'};

function stream(file){
  return readline.createInterface({input:fs.createReadStream(path.join(dir,file)), crlfDelay:Infinity});
}
async function scores(){
  const tag=new Map(), best=new Map();
  for await(const line of stream('cntlist')){
    const bits=line.trim().split(/\s+/);
    if(bits.length<2) continue;
    const n=+bits[0]; if(!n) continue;
    const key=bits[1], cut=key.indexOf('%'); if(cut<1) continue;
    const lemma=key.slice(0,cut);
    if(lemma.includes('_')||!/^[a-z][a-z'-]{1,24}$/.test(lemma)) continue;
    const pos=POS[key.charCodeAt(cut+1)-48];
    tag.set(lemma,(tag.get(lemma)||0)+n);
    const b=best.get(lemma);
    if(!b||n>b.n) best.set(lemma,{n, pos:pos||'x'});
  }
  return {tag, best};
}
async function offsets(chosen, posFile, posChar){
  const want=new Map();
  const byLemma=new Map();
  for await(const line of stream(posFile)){
    if(line[0]===' '||!line.trim()) continue;
    const sp=line.indexOf(' ');
    const lemma=line.slice(0,sp);
    if(!chosen.has(lemma)||chosen.get(lemma)!==posChar) continue;
    const toks=line.trim().split(/\s+/);
    const pCnt=+toks[3];
    const offs=toks.slice(4+pCnt+2).filter(o=>/^[0-9]{8}$/.test(o)).slice(0,4);
    byLemma.set(lemma, offs);
    offs.forEach(o=>{ if(!want.has(o)) want.set(o, []); want.get(o).push(lemma); });
  }
  return {want, byLemma};
}
async function synsets(dataFile, offToLemma){
  const groups=new Map();
  for await(const line of stream(dataFile)){
    if(line[0]===' '||line.length<8) continue;
    const off=line.slice(0,8);
    if(!offToLemma.has(off)) continue;
    const toks=line.split(/\s+/);
    const wCnt=parseInt(toks[3],16);
    const words=[];
    for(let i=0;i<wCnt;i++){
      const w=toks[4+i*2];
      if(w&&/^[a-z][a-z'-]{1,24}$/.test(w)) words.push(w);
    }
    if(words.length) groups.set(off, words);
  }
  return groups;
}
async function main(){
  const {tag, best}=await scores();
  const ranked=[...tag.entries()].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1));
  const keep=ranked.slice(0,9000);
  if(keep.length<8000) throw new Error('only '+keep.length+' tagged lemmas');
  const chosen=new Map(keep.map(([w])=>[w, (best.get(w)||{}).pos||'x']));
  const files=[['index.noun','data.noun','n'],['index.verb','data.verb','v'],['index.adj','data.adj','a'],['index.adv','data.adv','r']];
  const synOf=new Map();
  for(const [idx, data, pos] of files){
    const {want, byLemma}=await offsets(chosen, idx, pos);
    const found=await synsets(data, want);
    for(const [lemma, offs] of byLemma){
      const bag=synOf.get(lemma)||[];
      for(const off of offs){
        for(const w of (found.get(off)||[])){
          if(w!==lemma&&chosen.has(w)&&bag.indexOf(w)<0) bag.push(w);
          if(bag.length>=6) break;
        }
        if(bag.length>=6) break;
      }
      if(bag.length) synOf.set(lemma, bag);
    }
  }
  const CLOSED=['a','an','the','of','to','and','or','but','if','so','than','then','not','no','yes','is','it','its','who','what','where','when','why','how','which','this','that','these','those','i','you','we','they','he','she','me','my','your','our','their','for','on','at','from','with','as','by','into','over','after','before','up','down','out','off','about','can','will','would','should','could','may','might','must','do','does','did','be','am','are','was','were','been','being','have','has','had'];
  CLOSED.forEach(w=>{ if(!chosen.has(w)){ chosen.set(w,'f'); keep.push([w,0]); } });
  const w=keep.map(([lemma])=>lemma);
  const index=new Map(w.map((lemma,i)=>[lemma,i]));
  const p=w.map(lemma=>chosen.get(lemma)||'x').join('');
  const y=[];
  w.forEach((lemma,i)=>{ (synOf.get(lemma)||[]).forEach(s=>{ const j=index.get(s); if(j!=null) y.push(i,j); }); });
  const out={v:1, src:'Princeton WordNet 3.1', license:'wordnet-3.1', n:w.length, w, p, y};
  const dest=path.join(__dirname,'..','data','dict.json');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const body=JSON.stringify(out);
  fs.writeFileSync(dest, body);
  fs.writeFileSync(path.join(__dirname,'..','data','dict.js'), 'window.DICT_DATA='+body+';\n');
  console.log('lemmas', w.length, 'syn-links', y.length/2, 'bytes', body.length);
  const ri=index.get('ruler');
  const rs=[]; for(let i=0;i<y.length;i+=2) if(y[i]===ri) rs.push(w[y[i+1]]);
  console.log('ruler syn', rs.join(','));
}
main().catch(e=>{ console.error(e); process.exit(1); });
