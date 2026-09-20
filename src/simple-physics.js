import RAPIER from '@dimforge/rapier3d-compat';
export const RADIUS=.42, STEP=1/120, HALF=4.8;
export const floorHeight=(x,z)=>.035*(x*x+z*z);
export function bowlData(){
 const vertices=[],indices=[],n=40;
 for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const px=-HALF+2*HALF*x/n,pz=-HALF+2*HALF*z/n;vertices.push(px,floorHeight(px,pz),pz);}
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
 return {vertices:new Float32Array(vertices),indices:new Uint32Array(indices)};
}
let initialized;
export async function init(){initialized??=RAPIER.init();await initialized;}
export class SimplePhysics{
 constructor(puzzle=false){
  this.puzzle=puzzle;this.hits=new Set();this.solved=false;this.plateAngle=0;this.rings=[];this.events=new RAPIER.EventQueue(true);
  this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=STEP;this.world.numSolverIterations=8;
  const data=bowlData();this.world.createCollider(RAPIER.ColliderDesc.trimesh(data.vertices,data.indices).setFriction(.12).setRestitution(.24));
  for(const axis of ['x','z'])for(const side of [-1,1]){
   const d=axis==='x'?[.22,1.85,5.25]:[5.25,1.85,.22],p=axis==='x'?[side*5.02,1.05,0]:[0,1.05,side*5.02];
   this.world.createCollider(RAPIER.ColliderDesc.cuboid(...d).setTranslation(...p).setRestitution(.48).setFriction(.12));
  }
  this.ball=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,RADIUS+.015,0).setCcdEnabled(true).setLinearDamping(.6).setAngularDamping(.8).setCanSleep(false));
  this.world.createCollider(RAPIER.ColliderDesc.ball(RADIUS).setDensity(3).setFriction(.12).setRestitution(.4),this.ball);
  this.state='ready';this.time=0;
  if(puzzle){
   this.plate=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,floorHeight(0,-2.8)+.42,-2.8));
   this.plateCollider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(.95,.42,.1).setRestitution(.85).setFriction(.05).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.plate);
   this.bells=[[-1.4,-1.7],[1.4,-1.7]].map(([x,z],index)=>{
    const p={x,y:floorHeight(x,z)+.48,z};const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(.25).setTranslation(p.x,p.y,p.z).setRestitution(.65).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS));return {p,index,collider};
   });
  }
 }
 setPlate(angle){if(!this.puzzle||this.state!=='ready')return false;this.plateAngle=Math.max(-60,Math.min(60,angle));const a=this.plateAngle*Math.PI/360;this.plate.setRotation({x:0,y:Math.sin(a),z:0,w:Math.cos(a)},true);return true;}
 launch(power,angle){
  if(this.state!=='ready')return false;
  this.hits.clear();this.solved=false;this.touchedPlate=false;
  const speed=2.5+Math.max(0,Math.min(100,power))*.037,a=angle*Math.PI/180;
  this.ball.setLinvel({x:Math.sin(a)*speed,y:0,z:-Math.cos(a)*speed},true);this.ball.setAngvel({x:-Math.cos(a)*speed/RADIUS,y:0,z:-Math.sin(a)*speed/RADIUS},true);this.state='moving';return true;
 }
 step(){
  this.rings=[];this.world.step(this.events);this.time+=STEP;
  this.events.drainCollisionEvents((a,b,started)=>{if(!started||this.state!=='moving'||!this.puzzle)return;if(a===this.plateCollider.handle||b===this.plateCollider.handle)this.touchedPlate=true;const bell=this.bells.find(item=>item.collider.handle===a||item.collider.handle===b);if(bell&&!this.hits.has(bell.index)){this.hits.add(bell.index);this.rings.push(bell.index);if(this.hits.size===2)this.solved=true;}});
const p=this.ball.translation(),v=this.ball.linvel();
  if(this.state==='moving'&&Math.hypot(p.x,p.z)<.22&&Math.hypot(v.x,v.y,v.z)<.22){this.state='ready';return true;}return false;
 }
 dispose(){this.events.free();this.world.free();}
}
