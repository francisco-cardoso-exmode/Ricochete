import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Euler } from 'three';
import { LEVEL, LESSONS, piecesForLesson, SPAWN, BALL_RADIUS, STEP, foldRotation, transformUpper, hingeSegments, launchVelocity } from './level.js';
import {CHARACTERS, CHARACTER_RADIUS, STRIKE_DURATION, STRIKE_COOLDOWN, characterPose, applyReturnDraft} from './characters.js';
let initialization;
export async function initPhysics(){ initialization ??= RAPIER.init(); await initialization; }
const quat=(x=0,y=0,z=0)=>new Quaternion().setFromEuler(new Euler(x,y,z));
const vec=p=>({x:p[0],y:p[1],z:p[2]});
export class Simulation {
 constructor(angle=90,level=5){
  this.level=Math.max(1,Math.min(5,level));this.lesson=LESSONS[this.level-1];this.levelPieces=piecesForLesson(this.level);
  this.ballRadius=this.level<=2?.38:BALL_RADIUS;this.spawn={...SPAWN,y:this.ballRadius+.08};
  this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=STEP;
  this.world.numSolverIterations=8;
  this.events=new RAPIER.EventQueue(true);this.angle=angle;this.targetAngle=angle;
  this.base=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  this.upper=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setRotation(quat(foldRotation(angle))));
  this.fragments=[];this.broken=new Set();this.pads=[];this.colliders=new Map();this.dynamic=new Map();this.hingeBodies=[];this.targets=new Set();this.score=0;this.shots=0;this.shotTime=0;this.crossings=0;this.inUpper=false;this.state='ready';this.bonusSeen=new Set();this.bellLastHit=new Map();
  for(const item of this.levelPieces)this.createPiece(item);
  this.buildHinge();
  this.ball=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(SPAWN.x,SPAWN.y,SPAWN.z).setCcdEnabled(true).setLinearDamping(.04).setAngularDamping(.05).setCanSleep(false));
  this.ball.userData={kind:'ball'};
  this.ballCollider=this.world.createCollider(RAPIER.ColliderDesc.ball(this.ballRadius).setDensity(3).setRestitution(.43).setFriction(.16).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.ball);
  this.time=0;this.lives=5;this.saves=0;this.rally=0;this.stillTime=0;this.characters=CHARACTERS.map((info,index)=>{
   const p=characterPose(index,0);const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y,p.z));
   body.userData={kind:'character',index};const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(CHARACTER_RADIUS).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
   return {info,index,body,collider,strikeAge:Infinity,cooldown:0,connected:false,manualX:null,held:false};
  });
  this.homeOpen=false;this.homeGatePhase=0;this.assistAge=Infinity;this.assistCooldown=0;
  if(this.lesson.home){
   this.homeGate=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.35,11.25));
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.2,.45,.09).setRestitution(.2),this.homeGate);
  }
  this.resetBall();this.pending=[];
 }
 attach(desc,body,item){const c=this.world.createCollider(desc.setFriction(.3).setRestitution(item.bonus==='bumper'?1.12:item.rebound?.88:.34).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);this.colliders.set(c.handle,{...item,sensor:c.isSensor()});return c;}
 createPiece(item){
  const {shape,pos,size,side}=item;let body=side==='upper'?this.upper:this.base;let p=vec(pos);let q=quat(...(item.rotation||[0,0,0]));
  if(item.defender!==undefined){
   body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...pos));
   this.dynamic.set(item.id,{body,item});this.pads.push({body,item,phase:0,lastHit:-100});p={x:0,y:0,z:0};q=quat();
  }
  if(item.dynamic||item.suspended){
   const initial=side==='upper'?transformUpper(p,this.angle):p;
   body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(initial.x,initial.y,initial.z).setLinearDamping(item.shape==='bell'?.06:.15).setAngularDamping(item.shape==='bell'?.12:.4).setCcdEnabled(true));
   this.dynamic.set(item.id,{body,item});
   if(item.suspended){
    const anchor=vec(item.anchor),length=item.anchor[1]-pos[1];
    const joint=RAPIER.JointData.spherical(anchor,{x:0,y:length,z:0});
    this.world.createImpulseJoint(joint,this.upper,body,true);
   }
   p={x:0,y:0,z:0};
  }
  const put=(desc,offset=[0,0,0],rotation=q)=>this.attach(desc.setTranslation(p.x+offset[0],p.y+offset[1],p.z+offset[2]).setRotation(rotation),body,item);
  if(shape==='box')put(RAPIER.ColliderDesc.roundCuboid(Math.max(.01,size[0]/2-.04),Math.max(.01,size[1]/2-.04),Math.max(.01,size[2]/2-.04),.04));
  if(shape==='target')put(RAPIER.ColliderDesc.cylinder(size[1]/2,size[0]),[0,0,0],quat(Math.PI/2));
  if(shape==='piston')put(RAPIER.ColliderDesc.ball(size[0]));
  if(shape==='bumper'||shape==='bell')put(RAPIER.ColliderDesc.cylinder(size[1]/2,size[0]));
  if(shape==='arch'){
   const axis=item.axis==='z'; const r=axis?size[2]/2:size[0]/2;
   for(let i=0;i<9;i++){
    const a=Math.PI*(i+.5)/9,px=Math.cos(a)*r,py=Math.sin(a)*r;
    put(RAPIER.ColliderDesc.cuboid(axis?size[0]/2:r*Math.PI/18+.035,.18,axis?r*Math.PI/18+.035:size[2]/2),axis?[0,py,px]:[px,py,0],axis?quat(-a,0,0):quat(0,0,a+Math.PI/2));
   }
  }
  if(shape==='hoop'){
   const r=size[0];
   for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2;put(RAPIER.ColliderDesc.ball(size[1]),[Math.cos(a)*r,0,Math.sin(a)*r]);
   }
   const sensor=RAPIER.ColliderDesc.cylinder(.1,r-.13).setSensor(true);put(sensor);
  }
 }
 buildHinge(){
  for(const body of this.hingeBodies)this.world.removeRigidBody(body);this.hingeBodies=[];
  for(const part of hingeSegments(this.angle)){
   const b=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...part.pos).setRotation(quat(part.rotation)));
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(...part.size.map(v=>v/2)).setRestitution(.02).setFriction(.02),b);this.hingeBodies.push(b);
  }
 }
 setAngle(angle,immediate=false){
  this.targetAngle=Math.max(90,Math.min(180,angle));
  if(immediate){this.angle=this.targetAngle;this.upper.setRotation(quat(foldRotation(this.angle)),true);this.upper.setNextKinematicRotation(quat(foldRotation(this.angle)));this.buildHinge();}
 }
 resetBall(){
  this.ball.setTranslation(this.spawn,true);this.ball.setLinvel({x:0,y:0,z:0},true);this.ball.setAngvel({x:0,y:0,z:0},true);this.ball.resetForces(true);this.ball.resetTorques(true);this.ball.setGravityScale(0,true);this.ball.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);this.ball.setNextKinematicTranslation(this.spawn);this.state='ready';this.shotTime=0;this.inUpper=false;this.stillTime=0;this.rally=0;this.bonusSeen.clear();
 }
 launch(power=72,aim=0){
  if(this.state!=='ready'||this.lives<=0)return false;
  if(this.lesson.home){this.homeOpen=false;this.targets.clear();}
  this.ballCollider.setRestitution(.43+Math.max(0,power-72)/28*.22);
  this.ball.setBodyType(RAPIER.RigidBodyType.Dynamic,true);this.ball.setGravityScale(1,true);this.ball.setLinvel(launchVelocity(power,aim),true);this.ball.setAngvel({x:-9,y:0,z:0},true);this.state='flying';this.shotTime=0;this.shots++;return true;
 }
 moveCharacter(index,x){
  const c=this.characters[index];if(!c||!Number.isFinite(x))return;
  c.manualX=index===0?Math.max(-4.25,Math.min(-.75,x)):Math.max(.75,Math.min(4.25,x));
 }
 characterPosition(c,time,strikeAge=c.strikeAge,dt=STEP){
  const p=characterPose(c.index,time,strikeAge);
  if(c.manualX!==null){const x=c.body.translation().x;p.x=x+Math.max(-dt*9,Math.min(dt*9,c.manualX-x));}
  return p;
 }
 setDefending(index,held){if(this.lesson.home)return;const c=this.characters[index];if(c)c.held=held;}
 headbutt(index){
  const c=this.characters[index];if(!c||this.state!=='flying'||c.cooldown>0)return false;
  c.strikeAge=0;c.cooldown=STRIKE_COOLDOWN;c.connected=false;return true;
 }
 beginFeed(){
  if(this.state!=='ready')return;this.state='feeding';this.feedTime=0;
  this.ball.setTranslation({x:0,y:-.5,z:12.15},true);this.ball.setNextKinematicTranslation({x:0,y:-.5,z:12.15});
 }
 assistHome(){
  if(!this.lesson.home||this.state!=='flying'||this.assistCooldown>0)return false;
  this.assistAge=0;this.assistCooldown=.8;return true;
 }
 recoverBall(){
  this.recoverStart={...this.ball.translation()};this.recoverAge=0;this.state='recovering';
  this.ball.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);this.ball.setLinvel({x:0,y:0,z:0},true);
  this.pending.push({type:'recovered'});
 }
 nextBall(){if(this.state!=='lost'||this.lives<=0)return false;this.resetBall();return true;}
 loseBall(){if(this.state!=='flying')return;this.lives--;this.state=this.lives>0?'lost':'gameover';this.pending.push({type:this.state});}
 updateCharacters(){
  const returning=this.state==='flying'&&this.ball.linvel().z>-.25;
  for(const c of this.characters){
   c.cooldown=Math.max(0,c.cooldown-STEP);c.strikeAge+=STEP;
   const ball=this.ball.translation();if(c.held&&returning&&ball.z>8.3&&Math.abs(ball.x-c.body.translation().x)<1.4&&c.cooldown===0)this.headbutt(c.index);
   const p=this.characterPosition(c,this.time);c.body.setNextKinematicTranslation(p);
   c.collider.setSensor(!(returning&&c.strikeAge<STRIKE_DURATION*.68&&!c.connected));
  }
 }
 connectHeadbutt(c){
  if(c.connected||c.strikeAge>=STRIKE_DURATION*.68||c.collider.isSensor())return;
  c.connected=true;const p=this.ball.translation(),head=c.body.translation(),v=this.ball.linvel();
  const offset=Math.max(-1,Math.min(1,(p.x-head.x)/.9));
  const speed=23.5-Math.abs(offset)*2.5;
  // The ability adds an impulse only AFTER real sphere-to-sphere contact.
  const wanted={x:offset*2.5,y:.85,z:-speed},m=this.ball.mass();
  this.ball.applyImpulse({x:(wanted.x-v.x)*m,y:(wanted.y-v.y)*m,z:(wanted.z-v.z)*m},true);
  this.saves++;this.rally++;const points=25*Math.min(this.rally,4);this.score+=points;this.pending.push({type:'save',character:c.index,points,rally:this.rally});
 }
 step(){
  this.pending=[];
  if(this.state==='won'){this.wonAge=(this.wonAge||0)+STEP;if(this.wonAge<2.5){this.time+=STEP;this.updateCharacters();this.world.step(this.events);}return this.pending;}
  if(['gameover','lost'].includes(this.state))return this.pending;
  this.time+=STEP;this.updateCharacters();
  if(this.lesson.home){
   this.assistAge+=STEP;this.assistCooldown=Math.max(0,this.assistCooldown-STEP);
   this.homeGatePhase=Math.min(1,Math.max(0,this.homeGatePhase+(this.homeOpen?1:-1)*STEP*2));
   this.homeGate.setNextKinematicTranslation({x:0,y:.35-this.homeGatePhase*1.3,z:11.25});
   const p=this.ball.translation(),v=this.ball.linvel();
   if(this.assistAge<.3&&this.state==='flying'&&p.z>8.8&&p.z<11.2&&p.y<.85&&v.z>0){
    const m=this.ball.mass();this.ball.applyImpulse({x:(-p.x*3-v.x)*m,y:(.5-v.y)*m,z:(4-v.z)*m},true);this.assistAge=Infinity;this.saves++;this.pending.push({type:'home-assist'});
   }
  }
  if(this.state==='recovering'){
   this.recoverAge+=STEP;const t=Math.min(1,this.recoverAge/.45),u=t*t*(3-2*t),p=this.recoverStart;
   this.ball.setNextKinematicTranslation({x:p.x+(SPAWN.x-p.x)*u,y:p.y+(SPAWN.y-p.y)*u,z:p.z+(SPAWN.z-p.z)*u});this.world.step(this.events);
   if(t===1){this.resetBall();this.pending.push({type:'loaded'});}return this.pending;
  }
  if(this.state==='feeding'){
   this.feedTime+=STEP;const t=Math.min(1,this.feedTime/.8),u=t*t*(3-2*t);
   this.ball.setNextKinematicTranslation({x:0,y:t<.6?-.5:-.5+(SPAWN.y+.5)*((t-.6)/.4),z:12.15+(SPAWN.z-12.15)*u});
   this.world.step(this.events);if(t===1){this.resetBall();this.pending.push({type:'loaded'});}return this.pending;
  }
  if(this.state==='flying')applyReturnDraft(this.ball);
  if(Math.abs(this.targetAngle-this.angle)>.005){
   this.angle+=Math.sign(this.targetAngle-this.angle)*Math.min(Math.abs(this.targetAngle-this.angle),STEP*65);
   this.upper.setNextKinematicRotation(quat(foldRotation(this.angle)));this.buildHinge();
  }
  for(const f of this.pads){const c=this.characters[f.item.defender],active=(c.held||c.strikeAge<.23)&&(this.state==='ready'||this.ball.linvel().z>-.25);
   f.phase+=Math.max(-STEP*6,Math.min(STEP*10,(active?1:0)-f.phase));
   f.body.setNextKinematicTranslation({x:c.body.translation().x,y:-.82+f.phase*.88,z:9.8-f.phase*.95});}
  const incoming={...this.ball.linvel()};
  this.world.step(this.events);
  const fractures=[];
  this.events.drainCollisionEvents((a,b,started)=>{
   if(!started||this.state!=='flying')return;
   const other=a===this.ballCollider.handle?b:b===this.ballCollider.handle?a:null;if(other===null)return;
   const character=this.characters.find(c=>c.collider.handle===other);if(character){this.connectHeadbutt(character);return;}
   const item=this.colliders.get(other);if(!item)return;
   this.pending.push({type:'impact',item});
   if(item.breakable&&!this.broken.has(item.id)&&Math.hypot(incoming.x,incoming.y,incoming.z)>4)fractures.push({item,handle:other,velocity:incoming});
   if(item.defender!==undefined){const f=this.pads.find(f=>f.item.id===item.id),c=this.characters[item.defender];if(!c.connected&&(c.held||c.strikeAge<.23)&&this.time-f.lastHit>.5&&incoming.z>0){
    f.lastHit=this.time;c.connected=true;const v=this.ball.linvel(),m=this.ball.mass(),offset=Math.max(-1,Math.min(1,(this.ball.translation().x-f.body.translation().x)/.9));
    this.ball.applyImpulse({x:(offset*2.5-v.x)*m,y:(.85-v.y)*m,z:(-23.5+Math.abs(offset)*2.5-v.z)*m},true);
    this.saves++;this.rally++;const points=25*Math.min(this.rally,4);this.score+=points;this.pending.push({type:'save',character:item.defender,points,rally:this.rally});}}


   if(item.shape==='bell'&&this.time-(this.bellLastHit.get(item.id)??-Infinity)>.16){
    this.bellLastHit.set(item.id,this.time);const v=this.ball.linvel();
    this.pending.push({type:'ring',item,intensity:Math.min(1,Math.max(.25,Math.hypot(v.x,v.y,v.z)/18))});
   }
   if(item.target!==undefined&&!this.targets.has(item.target)){
    if(this.lesson.home){this.homeOpen=true;this.pending.push({type:'home-open'});}
    this.targets.add(item.target);this.score+=item.points;this.pending.push({type:'target',item});
   }
   if(item.bonus&&(item.bonus!=='hoop'||item.sensor)&&!this.bonusSeen.has(item.id)){
    this.bonusSeen.add(item.id);this.score+=item.bonus==='hoop'?75:item.bonus==='bell'?50:10;this.pending.push({type:item.bonus,item});
   }
  });
  for(const f of fractures)this.breakBrick(f.item,f.handle,f.velocity);
  if(this.state==='flying'){
   this.shotTime+=STEP;const p=this.ball.translation();const local=transformUpper(p,180-this.angle);
   // Inverse upper rotation; a threshold past the curved throat identifies the upper cavity.
   const inUpper=local.y>2.7&&local.z<5.8&&local.z>-.6;
   if(inUpper&&!this.inUpper){this.crossings++;this.pending.push({type:'crossing'});}this.inUpper=inUpper;
   if(this.lesson.home&&this.homeOpen&&Math.abs(p.x)<1.12&&p.z>11.35&&p.z<12.5&&p.y<.15){this.state='won';this.pending.push({type:'won'});}
   else if(!this.lesson.home&&this.targets.size===this.lesson.targets&&this.saves>=this.lesson.saves){this.state='won';this.pending.push({type:'won'});}
   else if(!this.homeOpen&&this.shotTime>.4&&this.ball.linvel().z>0&&p.y<.9&&Math.hypot(p.x-SPAWN.x,p.z-SPAWN.z)<1.05)this.recoverBall();
   else if(p.z>12.25||p.y< -2.5||Math.abs(p.x)>16||p.z< -25)this.loseBall();
   else {
    const v=this.ball.linvel(),slow=v.x*v.x+v.y*v.y+v.z*v.z<.1;
    this.stillTime=slow?this.stillTime+STEP:0;
    if(this.stillTime>2){
     // Unstick, without taking a life or teleporting the ball.
     const m=this.ball.mass();this.ball.applyImpulse({x:0,y:m*.5,z:m*1.6},true);this.stillTime=0;
     this.pending.push({type:'unstuck'});
    }
   }
  }
  return this.pending;
 }
 breakBrick(item,handle,velocity){
  if(this.broken.has(item.id))return;
  this.broken.add(item.id);const collider=this.world.getCollider(handle),center=collider.translation(),rotation=collider.rotation();
  this.world.removeCollider(collider,true);this.colliders.delete(handle);
  // Eight separate convex chunks: real gravity, rotation and contact with the box.
  for(let i=0;i<8;i++){
   const size=item.size.map(v=>v*.46),offset={x:((i&1)?1:-1)*item.size[0]*.25,y:((i&2)?1:-1)*item.size[1]*.25,z:((i&4)?1:-1)*item.size[2]*.25};
   const q=new Quaternion(rotation.x,rotation.y,rotation.z,rotation.w),v=new Quaternion(offset.x,offset.y,offset.z,0);v.premultiply(q).multiply(q.clone().conjugate());
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x+v.x,center.y+v.y,center.z+v.z).setRotation(rotation).setCcdEnabled(true).setLinearDamping(.5).setAngularDamping(.6));
   this.world.createCollider(RAPIER.ColliderDesc.roundCuboid(...size.map(v=>Math.max(.02,v/2-.025)),.025).setDensity(.45).setRestitution(.24).setFriction(.6),body);
   body.setLinvel({x:velocity.x*.17+offset.x*3,y:Math.max(1,velocity.y*.1)+offset.y*2,z:velocity.z*.12+offset.z*3},true);body.setAngvel({x:i-3.5,y:(i%3)-1,z:3.5-i},true);
   this.fragments.push({body,size,color:item.color});
  }
  // Bounded debris budget on mobile.
  while(this.fragments.length>64){const old=this.fragments.shift();this.world.removeRigidBody(old.body);}
  this.score+=20;this.pending.push({type:'break',item});
 }
 predict(power,aim,duration=2.7){
  // A disposable snapshot never adds a second ball to the live world.
  const prediction=RAPIER.World.restoreSnapshot(this.world.takeSnapshot());
  prediction.timestep=STEP;
  prediction.getCollider(this.ballCollider.handle).setRestitution(.43+Math.max(0,power-72)/28*.22);
  const ball=prediction.getRigidBody(this.ball.handle);ball.setBodyType(RAPIER.RigidBodyType.Dynamic,true);ball.setGravityScale(1,true);ball.setLinvel(launchVelocity(power,aim),true);ball.setAngvel({x:-9,y:0,z:0},true);
  const points=[];
  for(let i=0;i<duration/STEP;i++){applyReturnDraft(ball);for(const c of this.characters){prediction.getRigidBody(c.body.handle).setNextKinematicTranslation(this.characterPosition(c,this.time+(i+1)*STEP,c.strikeAge+(i+1)*STEP,(i+1)*STEP));}prediction.step();if(i%4===0)points.push({...ball.translation()});}
  prediction.free();return points;
 }
 dispose(){this.events.free();this.world.free();}
}
