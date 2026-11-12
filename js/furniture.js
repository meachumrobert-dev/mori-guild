/* Guild furniture. Proportions are a seated person's scale: seat about 0.45 m,
   table about 0.74 m, shelf about 1.55 m. Meshes are built only when a scene is passed.
   Robert's Strider Armor is a bench you can sit on, not an item-bench label. */
(function(){
'use strict';
const KINDS={
  bench:{seat:0.45, depth:0.42, length:1.5, back:0.42, sit:true},
  chair:{seat:0.45, depth:0.46, length:0.46, back:0.5, sit:true},
  stool:{seat:0.48, depth:0.34, length:0.34, back:0, sit:true},
  table:{top:0.74, depth:0.7, length:1.2, thick:0.05, sit:false},
  shelf:{height:1.55, depth:0.32, length:0.9, sit:false}
};
const BASE=[
  {id:'strider-bench', kind:'bench', name:"Robert's Strider Armor", flavor:'the fastest bench in the realm', x:5, z:-5},
  {id:'guild-chair', kind:'chair', name:'Guild chair', flavor:'a plain chair', x:7.1, z:-5},
  {id:'guild-table', kind:'table', name:'Guild table', flavor:'a plain table', x:5, z:-7.1},
  {id:'guild-stool', kind:'stool', name:'Guild stool', flavor:'a plain stool', x:7.1, z:-7.1},
  {id:'guild-shelf', kind:'shelf', name:'Guild shelf', flavor:'a plain shelf', x:9, z:-6}
];
let extra=[]; const meshes=new Map();
function proportions(kind){ const k=KINDS[kind]; return k?Object.assign({kind}, k):null; }
function list(){ return BASE.concat(extra); }
function sanePiece(p){
  if(!p||!KINDS[p.kind]) return false;
  if(typeof p.name!=='string'||p.name.length<2||p.name.length>48) return false;
  if(typeof p.x!=='number'||typeof p.z!=='number'||!isFinite(p.x)||!isFinite(p.z)) return false;
  if(Math.abs(p.x)>40||Math.abs(p.z)>40) return false;
  return true;
}
function addPiece(p){ if(!sanePiece(p)||list().some(q=>q.id===p.id)) return null; extra.push({id:p.id, kind:p.kind, name:p.name, flavor:p.flavor||'', x:p.x, z:p.z, fromPatch:true}); return p; }
function restore(){ extra.forEach(p=>{ const g=meshes.get(p.id); if(g&&g.parent) g.parent.remove(g); meshes.delete(p.id); }); extra=[]; }
function box(T, parent, w,h,d, color, x,y,z){
  const m=new T.Mesh(new T.BoxGeometry(w,h,d), new T.MeshLambertMaterial({color}));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function meshFor(T, p){
  const g=new T.Group(); g.name='furn_'+p.id; const k=KINDS[p.kind]; const wood='#6b4a2a', dark='#3a2816';
  if(p.kind==='table'){
    box(T,g,k.length,k.thick,k.depth,wood,0,k.top,0);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>box(T,g,0.08,k.top,0.08,dark,sx*(k.length/2-0.08),k.top/2,sz*(k.depth/2-0.08)));
  } else if(p.kind==='shelf'){
    box(T,g,0.06,k.height,k.depth,dark,-k.length/2,k.height/2,0);
    box(T,g,0.06,k.height,k.depth,dark,k.length/2,k.height/2,0);
    [0.4,0.9,1.4].forEach(y=>box(T,g,k.length,0.04,k.depth,wood,0,y,0));
  } else {
    box(T,g,k.length,0.06,k.depth,wood,0,k.seat,0);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>box(T,g,0.06,k.seat,0.06,dark,sx*(k.length/2-0.06),k.seat/2,sz*(k.depth/2-0.06)));
    if(k.back) box(T,g,k.length,k.back,0.06,dark,0,k.seat+k.back/2,-k.depth/2);
  }
  g.userData.piece=p; return g;
}
function build(scene){
  const T=window.THREE; if(!T||!scene) return [];
  return list().filter(p=>!meshes.has(p.id)).map(p=>{ const g=meshFor(T,p); g.position.set(p.x,0,p.z); scene.add(g); meshes.set(p.id, g); return g; });
}
function targets(){
  return list().filter(p=>KINDS[p.kind].sit||true).map(p=>({
    id:p.id, x:p.x, z:p.z, r:1.5, sit:!!KINDS[p.kind].sit, seat:KINDS[p.kind].seat||0,
    label:(KINDS[p.kind].sit?'🪑 Sit: ':'▣ ')+p.name, name:p.name, flavor:p.flavor||''
  }));
}
window.FURNITURE={ KINDS, proportions, list, sanePiece, addPiece, restore, build, targets };
})();
