import RAPIER from '@dimforge/rapier3d-compat';
export const STEP=1/120,RADIUS=.52,WIDTH=4.7,DEPTH=2.5,THETA=65*Math.PI/180,HOME_Z=2.5;
export const floorHeight=(x,z)=>.045*(z-HOME_Z)**2+.025*x*x;
let initialization;export async function init(){initialization??=RAPIER.init();await initialization;}
export const profile=[];
for(let i=0;i<=64;i++){const z=5-i*8/64;profile.push({y:.045*(z-HOME_Z)**2,z,theta:Math.atan(.09*(HOME_Z-z)),section:'base'});}
const start=profile.at(-1),radius=2.5;
for(let i=1;i<=24;i++){const t=start.theta+(THETA-start.theta)*i/24;profile.push({y:start.y+radius*(Math.cos(start.theta)-Math.cos(t)),z:start.z-radius*(Math.sin(t)-Math.sin(start.theta)),theta:t,section:'curve'});}
export const HINGE={...profile.at(-1)};
for(let i=1;i<=42;i++){const t=i/42*7.6;profile.push({y:HINGE.y+Math.sin(THETA)*t,z:HINGE.z-Math.cos(THETA)*t,theta:THETA,section:'upper'});}
export function upperPoint(x,height,depth=0){return {x,y:HINGE.y+Math.sin(THETA)*height+Math.cos(THETA)*depth,z:HINGE.z-Math.cos(THETA)*height+Math.sin(THETA)*depth};}
export function surfacePoint(x,row,depth=0){const d=.025*x*x+depth;return {x,y:row.y+Math.cos(row.theta)*d,z:row.z+Math.sin(row.theta)*d};}
export function surfaceData(rows=profile,depth=0){const v=[],indices=[],n=32;for(const row of rows)for(let j=0;j<=n;j++){const p=surfacePoint(-WIDTH+2*WIDTH*j/n,row,depth);v.push(p.x,p.y,p.z);}for(let i=0;i<rows.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}return {vertices:new Float32Array(v),indices:new Uint32Array(indices)};}
export const wallSegments=profile.slice(1).map((b,i)=>{const a=profile[i],theta=Math.atan2(b.y-a.y,a.z-b.z);return {y:(a.y+b.y)/2,z:(a.z+b.z)/2,theta,length:Math.hypot(b.y-a.y,b.z-a.z),section:b.section};});
const quatX=a=>({x:Math.sin(a/2),y:0,z:0,w:Math.cos(a/2)});
export class FoldPhysics{
 constructor(){
 this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=STEP;this.world.numSolverIterations=8;this.events=new RAPIER.EventQueue(true);this.time=0;this.state='ready';this.hits=new Set();this.rings=[];this.solved=false;this.plateAngle=0;this.visitedUpper=false;
 for(const depth of [0,DEPTH]){const d=surfaceData(profile,depth);this.world.createCollider(RAPIER.ColliderDesc.trimesh(d.vertices,d.indices).setFriction(.08).setRestitution(.12));}
 for(const s of wallSegments)for(const x of [-WIDTH-.15,WIDTH+.15])this.world.createCollider(RAPIER.ColliderDesc.cuboid(.15,DEPTH/2+.6,s.length/2+.012).setTranslation(x,s.y+Math.cos(s.theta)*(DEPTH/2+.28),s.z+Math.sin(s.theta)*(DEPTH/2+.28)).setRotation(quatX(s.theta)).setFriction(.04).setRestitution(.65));
 for(const row of [profile[0],profile.at(-1)])this.world.createCollider(RAPIER.ColliderDesc.cuboid(WIDTH+.3,DEPTH/2+.6,.2).setTranslation(0,row.y+Math.cos(row.theta)*DEPTH/2,row.z+Math.sin(row.theta)*DEPTH/2).setRotation(quatX(row.theta)).setRestitution(.55));
 this.ball=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,RADIUS+.015,HOME_Z).setCcdEnabled(true).setLinearDamping(.15).setAngularDamping(.25).setCanSleep(false));
 this.ballCollider=this.world.createCollider(RAPIER.ColliderDesc.ball(RADIUS).setDensity(3).setFriction(.1).setRestitution(.3).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.ball);
 this.platePosition=upperPoint(0,4.7,1.65);this.plate=this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(this.platePosition.x,this.platePosition.y,this.platePosition.z));
 this.plateCollider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.65,.18,.3).setRestitution(.8).setFriction(.03).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.plate);this.setPlate(0);
 this.bells=[[-1.7,2.6],[1.7,3.4]].map(([x,h],index)=>{const p=upperPoint(x,h,.85);const collider=this.world.createCollider(RAPIER.ColliderDesc.ball(.55).setTranslation(p.x,p.y,p.z).setRestitution(.8).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS));return {p,index,collider,height:h};});
 }
 setPlate(deg){if(this.state!=='ready')return false;this.plateAngle=Math.max(-45,Math.min(45,deg));const t=this.plateAngle*Math.PI/360,a=(THETA-Math.PI/2)/2;this.plate.setRotation({x:Math.sin(a)*Math.cos(t),y:-Math.sin(a)*Math.sin(t),z:Math.cos(a)*Math.sin(t),w:Math.cos(a)*Math.cos(t)},true);return true;}
 launch(power,aim){if(this.state!=='ready')return false;this.hits.clear();this.solved=false;this.visitedUpper=false;this.touchedPlate=false;this.shotAge=0;const speed=11+Math.max(0,Math.min(100,power))*.065,a=Math.max(-40,Math.min(40,aim))*Math.PI/180;this.ball.setLinvel({x:Math.sin(a)*speed,y:0,z:-Math.cos(a)*speed},true);this.ball.setAngvel({x:-Math.cos(a)*speed/RADIUS,y:0,z:-Math.sin(a)*speed/RADIUS},true);this.state='moving';return true;}
 step(){this.rings=[];const p0=this.ball.translation();this.ball.setLinearDamping(p0.y<2?.6:.06);this.world.step(this.events);this.time+=STEP;this.shotAge+=STEP;
 this.events.drainCollisionEvents((a,b,started)=>{if(!started||this.state!=='moving'||(a!==this.ballCollider.handle&&b!==this.ballCollider.handle))return;if(a===this.plateCollider.handle||b===this.plateCollider.handle)this.touchedPlate=true;const bell=this.bells.find(item=>item.collider.handle===a||item.collider.handle===b);if(bell&&!this.hits.has(bell.index)){this.hits.add(bell.index);this.rings.push(bell.index);this.solved=this.hits.size===2;}});
 const p=this.ball.translation(),v=this.ball.linvel();if(p.y>HINGE.y+1)this.visitedUpper=true;
 if(this.state==='moving'&&Math.hypot(p.x,p.z-HOME_Z)<.25&&Math.hypot(v.x,v.y,v.z)<.24){this.state='ready';return true;}return false;
 }
 dispose(){this.events.free();this.world.free();}
}
