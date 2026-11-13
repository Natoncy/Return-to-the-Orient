// transforms for stair piece meshes: local -> world and back
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qn=q=>{const l=Math.hypot(...q);return q.map(x=>x/l)};
const rot=(q,v)=>{const r=qmul(qmul(q,[...v,0]),[-q[0],-q[1],-q[2],q[3]]);return r.slice(0,3)};
const inv=q=>[-q[0],-q[1],-q[2],q[3]];
const QI=qn([0,0.991,0,0.131]);
const MODELS={var1:{p:[-0.02,-0.006,-0.43],q:qn([0,0.707107,0,0.707106])},mirror:{p:[0.04,0,-0.43],q:qn([0,0.707106,0,-0.707107])}};
const L=[-0.75/0.7762,-0.2/0.7762];
const toWorld=(inst,mdl,v)=>{const m=MODELS[mdl];const a=rot(m.q,v).map((x,k)=>x+m.p[k]);return rot(QI,a).map((x,k)=>x+[inst[0],0.75,inst[1]][k]);};
const toLocal=(inst,mdl,w)=>{const m=MODELS[mdl];const a=rot(inv(QI),w.map((x,k)=>x-[inst[0],0.75,inst[1]][k]));return rot(inv(m.q),a.map((x,k)=>x-m.p[k]));};
const lat=w=>w[0]*L[0]+w[2]*L[1],al=w=>-w[0]*L[1]+w[2]*L[0];
const fromLA=(la,y,a)=>[la*L[0]-a*L[1],y,la*L[1]+a*L[0]];
module.exports={toWorld,toLocal,lat,al,fromLA,rot,qn};
