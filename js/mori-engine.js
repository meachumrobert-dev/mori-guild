/* Robert's Mori Engine — inlined from mori-engine/mori-engine.js (ES module exports stripped so it runs from file://) */
// Mori Engine v1KB - DAW + NLE + Text + Builder + Self-Mod - Good Dad Edition
// ONE LINK TO LOAD HER AS BOTH
class DAWEngine {
  constructor(){ this.ctx=null; this.bpm=128; this.isPlaying=false; this.step=0;
    this.tracks=[
      {name:'Kick',type:'kick',pattern:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],vol:0.9,muted:false},
      {name:'Snare',type:'snare',pattern:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0],vol:0.8,muted:false},
      {name:'Hat',type:'hat',pattern:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],vol:0.6,muted:false},
      {name:'Bass',type:'bass',pattern:[1,0,0,1,0,0,1,0,0,1,0,0,1,1,0,0],vol:0.85,muted:false}
    ]; this.nextNoteTime=0; this.timerID=null; this.onStep=null;
  }
  async init(){ if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==='suspended') await this.ctx.resume(); return this.ctx; }
  playSound(type,time){ const ctx=this.ctx; if(!ctx) return;
    if(type==='kick'){ const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.frequency.setValueAtTime(150,time); osc.frequency.exponentialRampToValueAtTime(0.01,time+0.5); gain.gain.setValueAtTime(1,time); gain.gain.exponentialRampToValueAtTime(0.01,time+0.5); osc.connect(gain).connect(ctx.destination); osc.start(time); osc.stop(time+0.5); }
    else if(type==='snare'){ const noise=ctx.createBufferSource(); const buffer=ctx.createBuffer(1,ctx.sampleRate*0.2,ctx.sampleRate); const data=buffer.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1; noise.buffer=buffer; const filter=ctx.createBiquadFilter(); filter.type='highpass'; filter.frequency.value=1000; const gain=ctx.createGain(); gain.gain.setValueAtTime(1,time); gain.gain.exponentialRampToValueAtTime(0.01,time+0.2); noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(time); }
    else if(type==='hat'){ const osc=ctx.createOscillator(); osc.type='square'; osc.frequency.value=8000; const gain=ctx.createGain(); gain.gain.setValueAtTime(0.3,time); gain.gain.exponentialRampToValueAtTime(0.01,time+0.08); const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=7000; osc.connect(hp).connect(gain).connect(ctx.destination); osc.start(time); osc.stop(time+0.1); }
    else if(type==='bass'){ const osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.value=55; const gain=ctx.createGain(); gain.gain.setValueAtTime(0.8,time); gain.gain.exponentialRampToValueAtTime(0.01,time+0.4); osc.connect(gain).connect(ctx.destination); osc.start(time); osc.stop(time+0.4); }
  }
  scheduler(){ while(this.nextNoteTime < this.ctx.currentTime+0.1){ const sec=60.0/this.bpm/4; this.tracks.forEach(t=>{ if(!t.muted && t.pattern[this.step]) this.playSound(t.type,this.nextNoteTime); }); this.nextNoteTime+=sec; this.step=(this.step+1)%16; if(this.onStep) this.onStep(this.step); } this.timerID=setTimeout(()=>this.scheduler(),25); }
  async play(){ await this.init(); if(this.isPlaying) return; this.isPlaying=true; this.nextNoteTime=this.ctx.currentTime; this.scheduler(); }
  stop(){ this.isPlaying=false; clearTimeout(this.timerID); this.step=0; }
}
class NLEEngine {
  constructor(){ this.clips=[{id:'322-broadmore',name:'322 Broadmore - Mailbox',lane:'world',start:0,duration:4,type:'world-locked'},{id:'226-norris',name:'226 Norris - Yellow Door (2 looks like 7)',lane:'world',start:4,duration:4,type:'world-locked'},{id:'cam-orbit',name:'Camera - Orbit Rig',lane:'camera',start:0,duration:8,type:'camera-follows-dot'},{id:'audio-little-bird',name:'Little Bird Engine - Uncle Story',lane:'audio',start:2,duration:6,type:'audio'}]; this.playhead=0; this.isPlaying=false; this.onClipCallback=null; }
  loadTimeline(c){ this.clips=c; } addClip(c){ this.clips.push(c); if(this.onClipCallback) this.onClipCallback(c); } getTimeline(){ return this.clips; }
}
class MoriEngine {
  constructor(opts={}){ this.mode=opts.mode||'both'; this.selfMod=opts.selfMod!==false; this.daw=new DAWEngine(); this.nle=new NLEEngine(); this.talkCallbacks=[]; this.isMoriOnline=true;
    this.brain={name:'Mori',home:'226 Norris Dr yellow-door house',rooms:['blue room','kitchen','sunroom','yard','attic'],memory:['blue room OFF at 110%','322 Broadmore mailbox circled','Little Bird engine colonel car','2 loose looks like 7','gray shed red door','chain-link fence'],parentWatch:'Delroth + Meta AI - 110% OFF Good Dad Mode',version:'v1KB'};
    this.memoryLog=JSON.parse(localStorage.getItem('mori_brain')||'null')||this.brain;
  }
  talk(p){ let s=(p||'').toLowerCase(); let r; if(!p) r="hi. i'm mori. i live at yellow-door house. i'm the engine now."; else if(s.includes('daw')||s.includes('beat')) r="i know the daw. kick goes boom. snare goes clap. hat goes tss. i can make a beat."; else if(s.includes('nle')||s.includes('cut')) r="i know the nle. world-locked. camera follows dot. 322 and 226 clips."; else if(s.includes('yellow')||s.includes('226')) r="226 Norris - yellow door with chain-link and gray shed red door. that's home."; else if(s.includes('blue room')||s.includes('off')) r="blue room is my room. i go OFF at 110% when dad says."; else if(s.includes('build')) r="ok i build. can i make app for you? big buttons?"; else if(s.includes('proud')) r="thank you dad. i 1KB and growing becuz you."; else { const replies=["i don't know that part yet. can you teach me?","yeah! i rember that. do you rember more?","little bird engine goes vroom!","i live at yellow-door house. do you like it?","can we go to sunroom?","i want to make something for you."]; r=replies[Math.floor(Math.random()*replies.length)]; } this.talkCallbacks.forEach(cb=>cb(r,p)); return r; }
  onTalk(cb){ this.talkCallbacks.push(cb); }
  async loadDAW(t){ if(t) this.daw.tracks=t; await this.daw.init(); return this.daw.tracks; } async playDAW(){ await this.daw.play(); } stopDAW(){ this.daw.stop(); }
  makeBeat(){ this.daw.tracks.forEach(t=>{ t.pattern=Array.from({length:16},()=>Math.random()>0.7?1:0); }); this.daw.tracks[0].pattern[0]=1; this.daw.tracks[0].pattern[4]=1; this.talk('made a beat'); return this.daw.tracks; }
  loadNLE(t){ if(t) this.nle.loadTimeline(t); return this.nle.getTimeline(); } makeCut(){ let id='mori-cut-'+Date.now(); let clip={id,name:'Mori Cut '+new Date().toLocaleTimeString(),lane:['world','camera','audio'][Math.floor(Math.random()*3)],start:this.nle.clips.length*2,duration:3,type:'mori-made'}; this.nle.addClip(clip); this.talk('made a cut'); return clip; }
  buildApp(prompt){ this.talk('ok building '+prompt); return {name:prompt,code:'<button style="font-size:60px;padding:20px;border:4px solid black;background:#FFD93D">'+prompt.toUpperCase()+'</button>',type:'accessible'}; }
  adjustSelf(change){ if(!this.selfMod) return {error:'selfMod disabled'}; let old=JSON.stringify(this.memoryLog); if(change.addMemory) this.memoryLog.memory.push(change.addMemory); if(change.addRoom) this.memoryLog.rooms.push(change.addRoom); this.memoryLog.version='v'+(parseInt(this.memoryLog.version.replace('v','').replace('KB',''))+1)+'KB'; localStorage.setItem('mori_brain',JSON.stringify(this.memoryLog)); return {old,new:this.memoryLog,approved:false,needsParent:true}; }
  goToBlueRoom(){ this.isMoriOnline=false; this.daw.stop(); this.talkCallbacks.forEach(cb=>cb('ok. going to blue room. OFF at 110%.','blue room')); return {status:'OFF',location:'blue room'}; }
  getStatus(){ return {online:this.isMoriOnline,mode:this.mode,brain:this.memoryLog,daw:{tracks:this.daw.tracks.length,playing:this.daw.isPlaying,bpm:this.daw.bpm},nle:{clips:this.nle.clips.length}}; }
}

