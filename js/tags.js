/* One name tag. It goes away when the thing is taken, gone, far, or a menu opens. */
(function(root){
'use strict';
function fresh(){ return {id:null, text:'', shown:false}; }
function clear(tag){
  tag=tag||fresh();
  tag.id=null; tag.text=''; tag.shown=false;
  return tag;
}
function show(tag, opt){
  tag=tag||fresh();
  opt=opt||{};
  const far=opt.dist!=null&&opt.max!=null&&opt.dist>opt.max;
  if(!opt.text||far||opt.gone||opt.hidden||opt.menu||opt.occluded) return clear(tag);
  tag.id=opt.id||opt.text;
  tag.text=opt.text;
  tag.shown=true;
  return tag;
}
function pickup(tag, id){
  if(tag&&tag.id===id) return clear(tag);
  return tag||fresh();
}
function release(nodes){
  (nodes||[]).forEach(n=>{
    n.title='';
    if(n.bagTip||n.ghost) n.shown=false;
  });
  const visible=(nodes||[]).filter(n=>n.shown&&(n.bagTip||n.ghost||n.title)).length;
  return {visible};
}
root.TAGS={fresh, clear, show, pickup, release, star:['phone']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.TAGS;
})(typeof window!=='undefined'?window:globalThis);
