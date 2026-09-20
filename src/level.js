// Coordinates: base X/Z, +Y up. Upper kit local X/Y with +Z cavity depth.
export const UPPER_DEPTH = 5.8;
export const BALL_RADIUS = 0.31;
export const SPAWN = { x: 0, y: 0.39, z: 10.35 };
export const STEP = 1 / 120;
export const LEVEL = [];
let serial = 0;
function add(side, shape, pos, size, extra = {}) {
  const item = { id: `piece-${serial++}`, side, shape, pos, size, color: 0xa9ada6, ...extra };
  LEVEL.push(item); return item;
}
const b = (side, x,y,z,w,h,d,extra={})=>add(side,'box',[x,y,z],[w,h,d],extra);
// Deep shells with a completely open throat at the hinge.
b('base',0,-.35,5.5,10.6,.7,11.5,{color:0x56595e,shell:true});
b('base',-5.15,.65,6.2,.35,1.7,13.1,{color:0x848e84,shell:true});
b('base',5.15,.65,6.2,.35,1.7,13.1,{color:0x848e84,shell:true});
// Open lower edge: a real drain, rather than a reset timer.
// Continuous external apron sits below the open playfield edge.
b('base',0,-.56,12.7,10.6,.38,.42,{color:0x484b50,shell:true});
b('upper',0,5.55,-.34,10.6,11.8,.65,{color:0x62666c,shell:true});
b('upper',-5.15,5.5,2.62,.35,11.7,5.8,{color:0x90998c,shell:true});
b('upper',5.15,5.5,2.62,.35,11.7,5.8,{color:0x90998c,shell:true});
b('upper',0,11.3,2.62,10.6,.35,5.8,{color:0x747f70,shell:true});
// Base: low rails guide returning balls; isolated blocks create readable rebounds.
// Keep the launch corridor open, with obstacles grounded rather than tall tunnels.
for(const side of [-1,1]){
 for(let row=0;row<3;row++)b('base',side*4.15,.28,3.7+row*.82,.65,.56,.76,{color:0xb9bbbe});
 add('base','piston',[side*2.6,-.82,9.8],[.85],{defender:side<0?0:1,color:0xbfc1c4});
 add('base','bumper',[side*4.1,.45,8.3],[.32,.75],{bonus:'bumper',color:0xbfc1c4});
}
b('base',-3.8,.42,2.8,.95,.84,.9,{color:0xc3c5c8});
b('base',-3.55,.3,3.6,.7,.6,.7,{color:0xb2b5b8});
b('base',-2.8,.24,3.5,1.45,.3,.72,{rotation:[0,.55,-.14],color:0xb9bcc0});
b('base',-2.9,.43,6.7,.85,.86,.8,{crate:true,dynamic:true,color:0xc4c6c9});
b('base',2.9,.42,7.65,.8,.84,.8,{crate:true,dynamic:true,color:0xc6c8ca});
b('base',-4,.31,7.2,.6,.62,.6,{crate:true,dynamic:true,color:0xbabdc0});
b('base',2.8,.4,4.0,.8,.8,.85,{color:0xc3c6c9});
add('base','bumper',[-2,.45,4.6],[.45,.45],{color:0xd0d2d4,bonus:'bumper'});
add('base','bumper',[2,.45,6.5],[.45,.45],{color:0xc5c8cb,bonus:'bumper'});
add('base','hoop',[3.5,.7,3.0],[.66,.08],{bonus:'hoop',color:0xcbd0d4});
// Upper brick towers: every course is separately bevelled and outlined.
for(const [x,start,end,depth] of [[-4,0,10,.8],[4,0,9,1.1],[-2.6,0,3,.55],[2.6,0,2,1.6]]) {
 for(let row=start;row<end;row++) {
  b('upper',x,(row+.5)*.8,depth,1.25,.74,1.15,{color:[0xa9b1a2,0xbec4b5,0x949f8e][row%3]});
 }
}
for(const [x,y,z,w] of [[-3.55,2.6,1.3,2.2],[3.6,3.5,1,2.2],[-3.6,6,1.2,2.2],[3,7.5,.9,3.4],[-2,10,1.05,3.8]]) {
 const count=Math.ceil(w/.9),width=w/count;
 for(let i=0;i<count;i++)b('upper',x-w/2+width*(i+.5),y,z,width-.035,.48,1.45,{color:i%2?0xbfc2c6:0xb1b5ba});
 // Rear bracket visually and physically connects each cantilever to the wall.
 b('upper',x,y-.32,.24,w*.7,.2,.5,{color:0x6f747a});
}
for(const [x,y,z] of [[-2.9,.5,1.35],[2.9,4.0,1.25]]) {
 b('upper',x-.67,y+.55,z,.42,1.2,.7,{color:0xc9cebd});
 b('upper',x+.67,y+.55,z,.42,1.2,.7,{color:0xc9cebd});
 add('upper','arch',[x,y+1.12,z],[1.8,.85,.75],{color:0xc1c7b5});
}
b('upper',-2.65,3.42,1.05,1.05,1.15,1.05,{crate:true,color:0x8f9d87});
b('upper',3.0,8.25,.9,1.05,1,1.0,{crate:true,color:0xc4cbb7});
b('upper',3.0,9.23,.55,.85,.85,.8,{crate:true,color:0x939f8b});
b('upper',-3.1,7.0,.9,.55,1.55,.75,{color:0xd3d6c5});
b('upper',-3.1,8,.9,1.1,.35,1.1,{color:0xb0bba4});
b('upper',2.2,1.6,.8,2.2,.25,1.6,{rotation:[0,0,.32],color:0xadb99f});
b('upper',-3,7.8,1.6,1.2,.25,1.25,{rotation:[0,0,-.22],color:0xa6b298});
// Shelves feed rebounds; hoops reward precise passes; bells are moving obstacles.
// Goals are physical discs. Clear central route makes the first shot rewarding.
add('upper','target',[0,4.2,.14],[.72,.16],{target:0,points:100,color:0xd6dacb});
add('upper','target',[1.65,6.1,.14],[.68,.16],{target:1,points:150,color:0xcdd4bf});
add('upper','target',[-1.4,9.25,.14],[.65,.16],{target:2,points:200,color:0xd9ddcb});
add('upper','hoop',[-1.9,5.75,1.9],[.78,.075],{bonus:'hoop',color:0xd4dbc5});
add('upper','hoop',[1.45,2.25,1.25],[.69,.075],{bonus:'hoop',color:0xcbd5bc});
add('upper','bumper',[3.6,4.3,2.2],[.45,.32],{rotation:[Math.PI/2,0,0],bonus:'bumper',color:0xdee0d0});
// Basket brackets join the rear panel instead of leaving hoops floating.
b('upper',-1.9,5.35,.62,.16,.18,1.28,{color:0x777c82});
b('upper',1.45,1.85,.38,.16,.18,.8,{color:0x777c82});
// Bolted top mounts carry the two long hanging chains.
b('upper',.6,10.75,.86,.75,.3,1.9,{color:0xa7abb0});
b('upper',-3.6,10.85,.92,.85,.3,2.0,{color:0xb6b9bd});
add('upper','bell',[.6,8.0,1.7],[.42,.55],{suspended:true,anchor:[.6,10.5,1.7],bonus:'bell',color:0xc6ceb9});
add('upper','bell',[-2.7,4.8,2.0],[.37,.5],{suspended:true,anchor:[-2.7,6.05,2.0],bonus:'bell',color:0x9ea4a6});
add('upper','bell',[3.25,6.15,2.0],[.37,.5],{suspended:true,anchor:[3.25,7.55,2.0],bonus:'bell',color:0xbac0c1});
add('upper','box',[-3.6,8.65,1.8],[.65,.65,.65],{suspended:true,anchor:[-3.6,10.6,1.8],crate:true,color:0xafbaa0});
for(const side of [-1,1])add('upper','bumper',[side*2.8,7.4,1.35],[.55,.4],{rotation:[Math.PI/2,0,0],bonus:'bumper',lessonTwo:true,color:0xbfc1c4});
// Facing angled plates form real front/back ricochet lanes inside the upper cavity.
for(const side of [-1,1]){
 b('upper',side*3.3,5.5,3.65,1.65,2.1,.24,{rotation:[.16,side*.42,0],rebound:true,depthKit:true,color:0xc2c2c2});
 b('upper',side*3.65,7.8,.8,1.5,1.8,.24,{rotation:[-.2,-side*.45,0],rebound:true,depthKit:true,color:0xa4a4a4});
 b('upper',side*4.7,5.5,2.2,.3,.25,3.1,{depthKit:true,color:0x676767});
}
// A small optional destructible wall, with a shelf fixed to the back panel.
for(const side of [-1,1])b('upper',side*3.8,2.72,.62,1.6,.25,1.45,{tutorialWall:true,color:0x727272});
for(const side of [-1,1])for(let row=0;row<3;row++)b('upper',side*3.8,3.25+row*.84,.68,1.3,.78,1.15,{breakable:true,tutorialWall:true,color:0xb7aea0});
for(const item of LEVEL){
 if(item.side==='upper'&&item.shape==='box'&&item.size[0]===1.25&&!item.shell)item.breakable=true;
 const c=item.color,r=(c>>16)&255,g=(c>>8)&255,b=c&255;
 const v=Math.round((r+g+b)/3);item.color=(v<<16)|(v<<8)|v;
}
export function foldRotation(angle) { return -(angle-90)*Math.PI/180; }
export function transformUpper(p,angle) {
 const a=foldRotation(angle),c=Math.cos(a),s=Math.sin(a);
 return {x:p.x??p[0],y:(p.y??p[1])*c-(p.z??p[2])*s,z:(p.y??p[1])*s+(p.z??p[2])*c};
}
export function hingeSegments(angle) {
 const bend=(180-angle)*Math.PI/180,r=2.5,t=r*Math.tan(bend/2),out=[];
 // At 180 degrees a straight short bridge replaces the quarter pipe.
 if(bend<.005)return [{pos:[0,-.08,0],size:[9.9,.16,.7],rotation:0}];
 for(let i=0;i<24;i++){
  const theta=bend*(i+.5)/24;
  out.push({pos:[0,r*(1-Math.cos(theta))-.08*Math.cos(theta),t-r*Math.sin(theta)-.08*Math.sin(theta)],size:[9.9,.16,r*bend/24+.025],rotation:theta});
 }
 return out;
}
export function launchVelocity(power=72,aim=0) {
 const speed=12+power*.15+Math.max(0,power-72)*.12,a=aim*Math.PI/180;
 return {x:Math.sin(a)*speed,y:.8,z:-Math.cos(a)*speed};
}

export const LESSONS = [
 {name:'O sino e o ninho',hint:'Ajuda o Pingo: toca no sino e traz-o de volta ao ninho.',targets:1,saves:0,home:true},
 {name:'Escolhe o ângulo',hint:'Aponta à direita e puxa para baixo para subir ao segundo alvo.',targets:2,saves:0},
 {name:'Devolve a bola',hint:'Acerta no alvo e faz uma defesa com Bico ou Bola.',targets:1,saves:1},
 {name:'Ressaltos e sinos',hint:'Três alvos, cestos e sinos. Experimenta os ressaltos.',targets:3,saves:0},
 {name:'O playground',hint:'Usa tudo o que aprendeste para conquistar os três alvos.',targets:3,saves:0},
];
export function piecesForLesson(level=5){
 if(level===1)return [...LEVEL.filter(p=>p.shell),
 {id:'first-bell',side:'upper',shape:'bell',pos:[0,4.2,.5],size:[.55,.65],color:0xc6b68e,bonus:'bell',target:0,points:100},
 {id:'bell-bracket',side:'upper',shape:'box',pos:[0,5.2,.32],size:[1,.2,.65],color:0x777777},
 {id:'bell-cord',side:'upper',shape:'box',pos:[0,4.83,.5],size:[.06,.65,.06],color:0x777777},
 {id:'nest-floor',side:'base',shape:'box',pos:[0,-.7,11.85],size:[2.5,.25,1.45],color:0x888888},
 ...[-1,1].map(side=>({id:'nest-wall-'+side,side:'base',shape:'box',pos:[side*1.25,-.25,11.85],size:[.15,.85,1.45],color:0x737373})),
 {id:'nest-back',side:'base',shape:'box',pos:[0,-.25,12.55],size:[2.5,.85,.15],color:0x737373}
 ];
 if(level>=5)return LEVEL.filter(p=>!p.tutorialWall&&!p.lessonTwo);
 const lesson=LESSONS[level-1];
 return LEVEL.filter(p=>{
  if(p.shell)return true;
  if(p.depthKit)return level>=2;
  if(p.lessonTwo)return level===2;
  if(p.tutorialWall)return level===2||level===3;
  if(p.target!==undefined)return p.target<lesson.targets;
  // Keep a pair of low guide rails; no wall of decorative blocks in the first box.
  if(p.defender!==undefined)return level>=3;
  if(level===2&&p.side==='base'&&p.shape==='bumper')return true;
  if(level===4){
   if(['bell','hoop','bumper'].includes(p.shape))return true;
   if(p.side==='upper'&&p.shape==='box'&&(p.pos[1]>10||Math.abs(p.pos[1]-7.5)<.01||Math.abs(p.pos[1]-6)<.01||p.size[0]<.2))return true;
  }
  return false;
 }).map(p=>{
  if(level===2&&p.target===1)return {...p,pos:[1.65,6.1,.5],size:[1.05,.2]};
  if(level===4&&p.target!==undefined)return {...p,pos:[p.target===0?0:p.target===1?1.8:-1.8,4.2,.14]};
  if(level===4&&p.side==='upper'&&p.shape==='box'&&p.size[0]<.2&&p.pos[0]===1.45)return {...p,pos:[3.6,p.pos[1],p.pos[2]]};
  if(level===4&&p.side==='upper'&&p.shape==='hoop'&&p.pos[0]>0)return {...p,pos:[3.6,p.pos[1],p.pos[2]]};
  return p;
 });
}
