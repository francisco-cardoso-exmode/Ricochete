import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Euler } from 'three';
import { LEVEL, SPAWN, BALL_RADIUS, STEP, foldRotation, transformUpper, hingeSegments, launchVelocity } from './level.js';
import {CHARACTERS, CHARACTER_RADIUS, STRIKE_DURATION, STRIKE_COOLDOWN, characterPose, applyReturnDraft} from './characters.js';
let initialization;
export async function initPhysics(){ initialization ??= RAPIER.init(); await initialization; }
const quat=(x=0,y=0,z=0)=>new Quaternion().setFromEuler(new Euler(x,y,z));
const vec=p=>({x:p[0],y:p[1],z:p[2]});
export class Simulation {
 constructor(angle=90){
  this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=STEP;
  this.world.numSolverIterations=8;
  this.events=new RAPIER.EventQueue(true);this.angle=angle;this.targetAngle=angle;
  this.base=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  this.upper=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setRotation(quat(foldRotation(angle))));
  this.colliders=new Map();this.dynamic=new Map();this.hingeBodies=[];this.targets=new Set();this.score=0;this.shots=0;this.shotTime=0;this.crossings=0;this.inUpper=false;this.state='ready';this.bonusSeen=new Set();this.bellLastHit=new Map();
  for(const item of LEVEL)this.createPiece(item);
  this.buildHinge();
  this.ball=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(SPAWN.x,SPAWN.y,SPAWN.z).setCcdEnabled(true).setLinearDamping(.04).setAngularDamping(.05).setCanSleep(false));
  this.ball.userData={kind:'ball'};
  this.ballCollider=this.world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setDensity(3).setRestitution(.43).setFriction(.16).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.ball);
  this.time=0;this.lives=5;this.saves=0;this.rally=0;this.stillTime=0;this.characters=CHARACTERS.map((info,index)=>{
   const p=characterPose(index,0);const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y,p.z));
   body.userData={kind:'character',index};const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(CHARACTER_RADIUS).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
   return {info,index,body,collider,strikeAge:Infinity,cooldown:0,connected:false,manualX:null};
  });
  this.resetBall();this.pending=[];
 }
 attach(desc,body,item){const c=this.world.createCollider(desc.setFriction(.3).setRestitution(item.bonus==='bumper'?1.12:.34).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);this.colliders.set(c.handle,{...item,sensor:c.isSensor()});return c;}
 createPiece(item){
  const {shape,pos,size,side}=item;let body=side==='upper'?this.upper:this.base;let p=vec(pos);let q=quat(...(item.rotation||[0,0,0]));
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
  this.ball.setTranslation(SPAWN,true);this.ball.setLinvel({x:0,y:0,z:0},true);this.ball.setAngvel({x:0,y:0,z:0},true);this.ball.resetForces(true);this.ball.resetTorques(true);this.ball.setGravityScale(0,true);this.ball.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);this.ball.setNextKinematicTranslation(SPAWN);this.state='ready';this.shotTime=0;this.inUpper=false;this.stillTime=0;this.rally=0;this.bonusSeen.clear();
 }
 launch(power=72,aim=0){
  if(this.state!=='ready'||this.lives<=0)return false;
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
 headbutt(index){
  const c=this.characters[index];if(!c||this.state!=='flying'||c.cooldown>0)return false;
  c.strikeAge=0;c.cooldown=STRIKE_COOLDOWN;c.connected=false;return true;
 }
 nextBall(){if(this.state!=='lost'||this.lives<=0)return false;this.resetBall();return true;}
 loseBall(){if(this.state!=='flying')return;this.lives--;this.state=this.lives>0?'lost':'gameover';this.pending.push({type:this.state});}
 updateCharacters(){
  const returning=this.state==='flying'&&this.ball.linvel().z>-.25;
  for(const c of this.characters){
   c.cooldown=Math.max(0,c.cooldown-STEP);c.strikeAge+=STEP;
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
  if(['won','gameover','lost'].includes(this.state))return this.pending;
  this.time+=STEP;this.updateCharacters();
  if(this.state==='flying')applyReturnDraft(this.ball);
  if(Math.abs(this.targetAngle-this.angle)>.005){
   this.angle+=Math.sign(this.targetAngle-this.angle)*Math.min(Math.abs(this.targetAngle-this.angle),STEP*65);
   this.upper.setNextKinematicRotation(quat(foldRotation(this.angle)));this.buildHinge();
  }
  this.world.step(this.events);
  this.events.drainCollisionEvents((a,b,started)=>{
   if(!started||this.state!=='flying')return;
   const other=a===this.ballCollider.handle?b:b===this.ballCollider.handle?a:null;if(other===null)return;
   const character=this.characters.find(c=>c.collider.handle===other);if(character){this.connectHeadbutt(character);return;}
   const item=this.colliders.get(other);if(!item)return;
   this.pending.push({type:'impact',item});
   if(item.shape==='bell'&&this.time-(this.bellLastHit.get(item.id)??-Infinity)>.16){
    this.bellLastHit.set(item.id,this.time);const v=this.ball.linvel();
    this.pending.push({type:'ring',item,intensity:Math.min(1,Math.max(.25,Math.hypot(v.x,v.y,v.z)/18))});
   }
   if(item.target!==undefined&&!this.targets.has(item.target)){
    this.targets.add(item.target);this.score+=item.points;this.pending.push({type:'target',item});
   }
   if(item.bonus&&(item.bonus!=='hoop'||item.sensor)&&!this.bonusSeen.has(item.id)){
    this.bonusSeen.add(item.id);this.score+=item.bonus==='hoop'?75:item.bonus==='bell'?50:10;this.pending.push({type:item.bonus,item});
   }
  });
  if(this.state==='flying'){
   this.shotTime+=STEP;const p=this.ball.translation();const local=transformUpper(p,180-this.angle);
   // Inverse upper rotation; a threshold past the curved throat identifies the upper cavity.
   const inUpper=local.y>2.7&&local.z<3.6&&local.z>-.6;
   if(inUpper&&!this.inUpper){this.crossings++;this.pending.push({type:'crossing'});}this.inUpper=inUpper;
   if(this.targets.size===3){this.state='won';this.pending.push({type:'won'});}
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
 predict(power,aim,duration=2.7){
  // A disposable snapshot never adds a second ball to the live world.
  const prediction=RAPIER.World.restoreSnapshot(this.world.takeSnapshot());
  prediction.timestep=STEP;
  const ball=prediction.getRigidBody(this.ball.handle);ball.setBodyType(RAPIER.RigidBodyType.Dynamic,true);ball.setGravityScale(1,true);ball.setLinvel(launchVelocity(power,aim),true);ball.setAngvel({x:-9,y:0,z:0},true);
  const points=[];
  for(let i=0;i<duration/STEP;i++){applyReturnDraft(ball);for(const c of this.characters){prediction.getRigidBody(c.body.handle).setNextKinematicTranslation(this.characterPosition(c,this.time+(i+1)*STEP,c.strikeAge+(i+1)*STEP,(i+1)*STEP));}prediction.step();if(i%4===0)points.push({...ball.translation()});}
  prediction.free();return points;
 }
 dispose(){this.events.free();this.world.free();}
}
