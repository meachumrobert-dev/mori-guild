/* Small towns share people. A farmer can also mill.
   Each extra hat takes a share of the day, so that job yields less.
   A job with nobody on it is simply not in that town.
   A big town gives each person one job. */
(function(root){
'use strict';
const BIG=12;
const MAX_HATS=2;
function assign(people, needed){
  const posts=(people||[]).map((p,i)=>({id:p.id||('p'+i), jobs:[], rate:0}));
  const jobs=(needed||[]).slice();
  const covered={};
  if(!posts.length){
    return {posts, missing:jobs.slice(), covered, specialized:false};
  }
  if(posts.length>=BIG){
    posts.forEach((p,i)=>{ p.jobs=[jobs[i%jobs.length]]; p.rate=1; });
    posts.forEach(p=>p.jobs.forEach(j=>{ covered[j]=(covered[j]||0)+p.rate; }));
    return {posts, missing:[], covered, specialized:true};
  }
  jobs.forEach((job, i)=>{
    const p=posts[Math.floor(i/MAX_HATS)];
    if(p) p.jobs.push(job);
  });
  posts.forEach(p=>{ p.rate=p.jobs.length?1/p.jobs.length:0; });
  posts.forEach(p=>p.jobs.forEach(j=>{ covered[j]=(covered[j]||0)+p.rate; }));
  const missing=jobs.filter(j=>!covered[j]);
  return {posts, missing, covered, specialized:false};
}
function output(assignment, job, full){
  const rate=(assignment.covered&&assignment.covered[job])||0;
  return Math.round((full||0)*rate*100)/100;
}
function service(assignment, job){
  return !!((assignment.covered&&assignment.covered[job])>0);
}
root.DUTIES={BIG, MAX_HATS, assign, output, service, star:['mundane','connected']};
if(typeof module!=='undefined'&&module.exports) module.exports=root.DUTIES;
})(typeof window!=='undefined'?window:globalThis);
