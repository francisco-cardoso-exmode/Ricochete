import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LEVEL, SPAWN, BALL_RADIUS, foldRotation, hingeSegments, transformUpper } from './level.js';
import {CHARACTERS, CHARACTER_RADIUS, STRIKE_DURATION} from './characters.js';
const dark=new THREE.MeshStandardMaterial({color:0x35393b,roughness:.55,metalness:.45});
const edgeMaterial=new THREE.LineBasicMaterial({color:0x24272a,transparent:true,opacity:.8});
const materials=new Map();
function material(color){if(!materials.has(color)){const c=new THREE.Color(color);const v=(c.r+c.g+c.b)/3;c.setRGB(v,v,v);materials.set(color,new THREE.MeshStandardMaterial({color:c,roughness:.43,metalness:.3}));}return materials.get(color);}
const geometries=new Map();
function rounded(w,h,d){const key=[w,h,d].join('/');if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,3,Math.min(.085,w/8,h/8,d/8)));return geometries.get(key);}
function mesh(geo,mat,outline=true){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;if(outline){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,22),edgeMaterial);m.add(edges);}return m;}
function box(w,h,d,color=0xaaaaaa){return mesh(rounded(w,h,d),material(color));}
function torus(r,t,mat=dark){return mesh(new THREE.TorusGeometry(r,t,8,36),mat,false);}
function cylinder(r,h,mat=dark){return mesh(new THREE.CylinderGeometry(r,r,h,28),mat);}
function at(parent,obj,p){obj.position.set(...p);parent.add(obj);return obj;}
function bolt(parent,x,y,z){const b=mesh(new THREE.CylinderGeometry(.033,.033,.022,6),dark,false);b.rotation.x=Math.PI/2;at(parent,b,[x,y,z]);}
export class Graphics {
 constructor(canvas,simulation){
  this.canvas=canvas;this.sim=simulation;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.94;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x191d22);
  const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.env=pmrem.fromScene(environment,.04);this.scene.environment=this.env.texture;this.scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x242629,.65));
  const light=new THREE.DirectionalLight(0xffffff,2.05);light.position.set(-10,18,20);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-17;light.shadow.camera.right=17;light.shadow.camera.top=19;light.shadow.camera.bottom=-17;light.shadow.camera.far=60;light.shadow.bias=-.00015;light.shadow.normalBias=.025;light.shadow.radius=3;this.scene.add(light);this.scene.add(light.target);
  const fill=new THREE.DirectionalLight(0xe5e9ef,.75);fill.position.set(10,10,-10);this.scene.add(fill);
  this.base=new THREE.Group();this.upper=new THREE.Group();this.hinge=new THREE.Group();this.scene.add(this.base,this.upper,this.hinge);this.upper.rotation.x=foldRotation(simulation.angle);
  this.pieces=new Map();this.dynamics=new Map();this.chains=[];this.bellRings=new Map();
  for(const item of LEVEL){const obj=this.piece(item);obj.userData=item;this.pieces.set(item.id,obj);if(item.dynamic||item.suspended){this.scene.add(obj);this.dynamics.set(item.id,obj);}else(item.side==='upper'?this.upper:this.base).add(obj);}
  this.addDetails();this.makeLauncher();this.makeHinge();this.makeCharacters();
  this.ball=mesh(new THREE.SphereGeometry(BALL_RADIUS,32,24),new THREE.MeshStandardMaterial({color:0xf2f4f6,emissive:0xb4bdc4,emissiveIntensity:.12,metalness:.85,roughness:.16}),false);this.scene.add(this.ball);
  const glow=torus(BALL_RADIUS*1.05,.012,new THREE.MeshBasicMaterial({color:0xecfbd2}));this.ball.add(glow);glow.rotation.x=.6;
  this.topCamera=new THREE.PerspectiveCamera(40,1,.08,100);this.bottomCamera=new THREE.PerspectiveCamera(40,1,.08,100);this.overviewCamera=new THREE.PerspectiveCamera(40,1,.08,140);
  this.path=new THREE.Group();this.scene.add(this.path);
  const aimMaterial=new THREE.MeshBasicMaterial({color:0xf0f2f4,transparent:true,opacity:.9});
  this.aimStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,8),aimMaterial);
  this.aimTip=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,12),aimMaterial);
  this.path.add(this.aimStem,this.aimTip);
  this.trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf1ffce,transparent:true,opacity:.65}));this.scene.add(this.trail);this.history=[];
  this.pulses=[];this.overview=true;this.lastAngle=-1;this.resize();this.sync();
 }
 piece(item){
  const g=new THREE.Group(),{shape,size,color,pos}=item,mat=material(color);
  if(shape==='box'){
   const body=box(...size,color);g.add(body);
   if(item.crate){
    const [w,h,d]=size;
    for(const sign of [-1,1]){const bar=box(w*.92,.095,.06,0x61686a);bar.rotation.z=sign*Math.atan2(h*.8,w*.88);bar.scale.x=Math.hypot(w*.88,h*.8)/(w*.92);at(g,bar,[0,0,d/2+.025]);}
    for(const x of [-1,1])for(const y of [-1,1])bolt(g,x*(w/2-.1),y*(h/2-.1),d/2+.04);
   }else if(!item.shell&&size[1]>.4&&size[2]>.4){for(const x of [-1,1])for(const y of [-1,1])bolt(g,x*(size[0]/2-.1),y*(size[1]/2-.1),size[2]/2+.012);}
  }
  if(shape==='arch'){
   const axis=item.axis==='z',r=axis?size[2]/2:size[0]/2;
   for(let i=0;i<9;i++){
    const a=Math.PI*(i+.5)/9;const block=box(axis?size[0]:r*Math.PI/9+.05,.36,axis?r*Math.PI/9+.05:size[2],color);
    block.position.set(axis?0:Math.cos(a)*r,Math.sin(a)*r,axis?Math.cos(a)*r:0);
    if(axis)block.rotation.x=-a;else block.rotation.z=a+Math.PI/2;g.add(block);
   }
  }
  if(shape==='target'){
   const disc=cylinder(size[0],size[1],mat);disc.rotation.x=Math.PI/2;g.add(disc);
   for(const [r,t,c] of [[size[0]*.79,.055,0x3f4547],[size[0]*.5,.048,0x4a5052]])at(g,torus(r,t,material(c)),[0,0,size[1]/2+.045]);
   const center=cylinder(size[0]*.23,.05,dark);center.rotation.x=Math.PI/2;at(g,center,[0,0,.13]);
   const mount=box(.35,.4,.6,0x6b7376);at(g,mount,[0,0,-.3]);
  }
  if(shape==='bumper'){
   g.add(cylinder(size[0]*1.1,.14,dark));
   for(let i=0;i<5;i++){const ring=torus(size[0]*.59,.026,material(0xa6b0b3));ring.rotation.x=Math.PI/2;at(g,ring,[0,-.17+i*.075,0]);}
   at(g,cylinder(size[0],.17,mat),[0,.21,0]);const cap=torus(size[0]*.86,.035,dark);cap.rotation.x=Math.PI/2;at(g,cap,[0,.3,0]);
  }
  if(shape==='hoop'){
   const hoop=torus(size[0],size[1],mat);hoop.rotation.x=Math.PI/2;g.add(hoop);
   const bottom=torus(size[0]*.52,size[1]*.65,mat);bottom.rotation.x=Math.PI/2;at(g,bottom,[0,-.7,0]);
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a)*size[0],0,Math.sin(a)*size[0]),new THREE.Vector3(Math.cos(a)*size[0]*.8,-.5,Math.sin(a)*size[0]*.8),new THREE.Vector3(Math.cos(a)*size[0]*.52,-.7,Math.sin(a)*size[0]*.52)]);g.add(mesh(new THREE.TubeGeometry(curve,8,.028,5,false),mat,false));}
   at(g,box(.13,.6,.5,0x6b7374),[0,-.3,-size[0]]);
  }
  if(shape==='bell'){
   const profile=[[.05,.35],[.2,.31],[.26,.19],[.29,-.1],[.42,-.25],[.44,-.3]].map(p=>new THREE.Vector2(...p));
   g.add(mesh(new THREE.LatheGeometry(profile.reverse(),24),mat));
   const rim=torus(.42,.04,dark);rim.rotation.x=Math.PI/2;at(g,rim,[0,-.28,0]);
   const clapper=new THREE.Group();clapper.name='clapper';g.add(clapper);
   at(clapper,mesh(new THREE.CylinderGeometry(.025,.025,.32,8),dark),[0,-.19,0]);
   at(clapper,mesh(new THREE.SphereGeometry(.1,12,8),dark),[0,-.39,0]);
  }
  g.position.set(...pos);if(item.rotation)g.rotation.set(...item.rotation);
  if(item.suspended){const links=[];for(let i=0;i<12;i++){const link=torus(.065,.018,material(0x7d8585));this.scene.add(link);links.push(link);}this.chains.push({item,links});}
  return g;
 }
 addDetails(){
  // Fine inset panel grid and frame rails make cavity depth legible from either camera.
  const gridMat=new THREE.LineBasicMaterial({color:0x4d5255,transparent:true,opacity:.46});
  const addGrid=(parent,upper)=>{
   const pts=[];
   for(let x=-5;x<=5;x++){pts.push(new THREE.Vector3(x,upper?0:.009,upper?.001:0),new THREE.Vector3(x,upper?11:.009,upper?.001:12));}
   for(let v=0;v<=12;v++){pts.push(new THREE.Vector3(-5,upper?v:.009,upper?.001:v),new THREE.Vector3(5,upper?v:.009,upper?.001:v));}
   parent.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),gridMat));
  };addGrid(this.base,false);addGrid(this.upper,true);
  for(const x of [-5.35,5.35]){
   at(this.base,box(.13,.18,12.6,0x2c3134),[x,.8,6]);at(this.upper,box(.13,11.7,.18,0x2c3134),[x,5.5,2.5]);
   at(this.base,box(.055,.06,12.5,0xb6bec4),[x-.05,.91,6]);at(this.upper,box(.055,11.65,.06,0xb6bec4),[x-.05,5.5,2.61]);
  }
  at(this.upper,box(10.7,.14,.16,0x272d32),[0,11.54,2.48]);
  for(const x of [-5.25,5.25]){const hinge=cylinder(.38,.75,material(0x3d4448));hinge.rotation.z=Math.PI/2;at(this.scene,hinge,[x,0,0]);const inner=cylinder(.27,.78,material(0xa4adb1));inner.rotation.z=Math.PI/2;at(this.scene,inner,[x,0,0]);}
  // Studio ground receives shadows from both physical halves.
  const floor=mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x25292f,roughness:1}),false);floor.rotation.x=-Math.PI/2;floor.position.y=-1;floor.receiveShadow=true;floor.castShadow=false;this.scene.add(floor);
 }
 makeLauncher(){
  this.launcher=new THREE.Group();this.launcher.position.set(SPAWN.x,0,SPAWN.z);this.base.add(this.launcher);
  at(this.launcher,box(1.8,.18,1.4,0x858d90),[0,.05,0]);
  at(this.launcher,cylinder(.68,.16,dark),[0,.19,0]);const ring=torus(.58,.055,material(0xb8c0c5));ring.rotation.x=Math.PI/2;at(this.launcher,ring,[0,.28,0]);
  for(const x of [-.95,.95]){at(this.launcher,box(.17,.55,1.15,0xbfc5c8),[x,.32,.1]);at(this.launcher,cylinder(.12,.65,dark),[x,.35,-.4]);}
  // Reticle printed onto the floor around the launch socket.
  const reticle=torus(1.2,.014,new THREE.MeshBasicMaterial({color:0xe0e6e2}));reticle.rotation.x=Math.PI/2;at(this.base,reticle,[0,.02,10.35]);
 }
 makeCharacters(){
  this.crew=CHARACTERS.map((info,index)=>{
   const group=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:index===0?0xd3d6d9:0x858b94,roughness:.4,metalness:.3});
   const body=mesh(new THREE.SphereGeometry(CHARACTER_RADIUS,28,20),skin,false);group.add(body);
   const face=new THREE.Group();face.rotation.x=-.83;group.add(face);
   const pupils=[];
   for(const x of [-.21,.21]){
    const eye=mesh(new THREE.SphereGeometry(.18,14,10),material(0xf3f3e8),false);eye.scale.set(1,1.2,.55);at(face,eye,[x,.15,.56]);
    const pupil=mesh(new THREE.SphereGeometry(.085,12,8),dark,false);at(face,pupil,[x,.15,.66]);pupils.push(pupil);
    const brow=box(.26,.05,.06,0x363b3b);brow.rotation.z=(index===0?1:-1)*x*.8;at(face,brow,[x,.37,.56]);
   }
   const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.24,-.16,.565),new THREE.Vector3(0,-.27,.595),new THREE.Vector3(.24,-.13,.565)]);
   face.add(mesh(new THREE.TubeGeometry(smile,14,.032,6,false),dark,false));
   const halo=torus(.83,.022,new THREE.MeshBasicMaterial({color:0xe0e4e8,transparent:true,opacity:.35}));halo.rotation.x=Math.PI/2;this.scene.add(halo);
   this.scene.add(group);return {group,body,pupils,halo,index};
  });
  const drain=box(9.85,.09,.45,0x25282b);at(this.base,drain,[0,-.18,11.65]);
  for(let x=-4.6;x<4.7;x+=.48){const stripe=box(.22,.015,.34,0xc9c4b2);stripe.rotation.y=.5;at(this.base,stripe,[x,-.125,11.65]);}
 }
 characterScreen(index){
  const v=this.crew[index].group.position.clone();v.y+=.7;v.project(this.overview?this.overviewCamera:this.bottomCamera);
  return {x:(v.x+1)*this.width/2,y:this.overview?(1-v.y)*this.height/2:this.height*(.75-v.y*.25)};
 }
 makeHinge(){
  this.hingeParts=[];for(let i=0;i<24;i++){const obj=box(9.9,.16,.22,0x949b9d);this.hinge.add(obj);this.hingeParts.push(obj);}
 }
 updateHinge(){
  const parts=hingeSegments(this.sim.angle);this.hingeParts.forEach((mesh,i)=>{mesh.visible=!!parts[i];if(parts[i]){mesh.position.set(...parts[i].pos);mesh.rotation.x=parts[i].rotation;mesh.scale.z=parts[i].size[2]/.22;}});
 }
 resize(){
  const rect=this.canvas.parentElement.getBoundingClientRect();this.width=rect.width;this.height=rect.height;
  this.renderer.setSize(this.width,this.height,false);this.updateCameras();
 }
 updateCameras(){
  const aspect=this.width/(this.height/2);this.topCamera.aspect=aspect;this.bottomCamera.aspect=aspect;this.overviewCamera.aspect=this.width/this.height;
  // Frame the INSIDE of each box, not the whole object sitting in a studio.
  // The side walls extend past the viewport edges; perspective depth is retained.
  const distance=5.05/(Math.tan(THREE.MathUtils.degToRad(20))*aspect);
  const a=this.sim.angle;
  const eye=transformUpper({x:1.6,y:6.8,z:distance+1.05},a);
  const target=transformUpper({x:0,y:5.6,z:0},a),up=transformUpper({x:0,y:1,z:0},a);
  this.topCamera.position.copy(eye);this.topCamera.up.set(up.x,up.y,up.z);this.topCamera.lookAt(target.x,target.y,target.z);
  // Near top-down perspective: depth comes from solid walls, faces and shadows,
  // rather than an oblique view of a small board surrounded by empty space.
  this.bottomCamera.position.set(1.1,distance+.5,10.0);
  this.bottomCamera.up.set(0,0,-1);this.bottomCamera.lookAt(0,0,7.1);
  // One camera sees the actual folded board. Fit its corners, not a screen-space ball.
  const corners=[];
  for(const x of [-5.35,5.35])for(const z of [-.5,12.1])for(const y of [-.7,1.6])corners.push(new THREE.Vector3(x,y,z));
  for(const x of [-5.35,5.35])for(const y of [0,11.65])for(const z of [-.7,2.6]){const p=transformUpper({x,y,z},a);corners.push(new THREE.Vector3(p.x,p.y,p.z));}
  const bounds=new THREE.Box3().setFromPoints(corners),center=bounds.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(.10,.65,.76).normalize();
  this.overviewCamera.position.copy(center).addScaledVector(direction,50);this.overviewCamera.lookAt(center);this.overviewCamera.updateMatrixWorld(true);
  const right=new THREE.Vector3().setFromMatrixColumn(this.overviewCamera.matrixWorld,0),vertical=new THREE.Vector3().setFromMatrixColumn(this.overviewCamera.matrixWorld,1);
  const tan=Math.tan(THREE.MathUtils.degToRad(this.overviewCamera.fov/2));let distanceToBoard=0;
  for(const corner of corners){const d=corner.clone().sub(center),depth=d.dot(direction);distanceToBoard=Math.max(distanceToBoard,depth+Math.abs(d.dot(right))/(tan*this.overviewCamera.aspect)*1.045,depth+Math.abs(d.dot(vertical))/tan*1.10);}
  this.overviewCamera.position.copy(center).addScaledVector(direction,distanceToBoard);this.overviewCamera.lookAt(center);

  for(const c of [this.topCamera,this.bottomCamera,this.overviewCamera])c.updateProjectionMatrix();
 }
 setTrajectory(points){
  // A short direction marker painted on the base, not a floating prediction
  // spanning two cameras. The live ball remains fully physical.
  const ball=this.sim.ball.translation(),start=new THREE.Vector3(ball.x,.045,ball.z);
  const sample=points[Math.min(5,points.length-1)];if(!sample)return;
  const direction=new THREE.Vector3(sample.x-ball.x,0,sample.z-ball.z);
  const length=Math.min(3.2,Math.max(1.2,direction.length()));direction.normalize();
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  this.aimStem.position.copy(start).addScaledVector(direction,length/2);
  this.aimStem.quaternion.copy(rotation);this.aimStem.scale.y=length;
  this.aimTip.position.copy(start).addScaledVector(direction,length+.12);this.aimTip.quaternion.copy(rotation);
 }
 sync(){
  const sim=this.sim;this.ball.visible=!['lost','gameover'].includes(sim.state);this.ball.position.copy(sim.ball.translation());this.ball.quaternion.copy(sim.ball.rotation());
  this.upper.rotation.x=foldRotation(sim.angle);
  this.launcher.visible=sim.state==='ready';
  for(const c of sim.characters){const m=this.crew[c.index];m.group.position.copy(c.body.translation());const active=c.strikeAge<STRIKE_DURATION;const pulse=active?Math.sin(c.strikeAge/STRIKE_DURATION*Math.PI):0;m.body.scale.set(1-pulse*.08,1+pulse*.15,1-pulse*.08);m.group.rotation.z=Math.sin(sim.time*2+c.index)*.06;m.halo.position.set(m.group.position.x,.018,m.group.position.z);m.halo.material.opacity=c.cooldown>0?.22:.8;const delta=Math.max(-.04,Math.min(.04,(this.ball.position.x-m.group.position.x)*.01));m.pupils.forEach((p,i)=>{p.position.x=(i===0?-.21:.21)+delta;p.scale.y=Math.sin(sim.time*2.1+c.index)> .99?.12:1;});}

  if(Math.abs(sim.angle-this.lastAngle)>.005){this.lastAngle=sim.angle;this.updateHinge();this.updateCameras();}
  for(const [id,obj]of this.dynamics){const d=sim.dynamic.get(id);obj.position.copy(d.body.translation());obj.quaternion.copy(d.body.rotation());}
  for(const [id,hit]of this.bellRings){const age=sim.time-hit.time,clapper=this.pieces.get(id)?.getObjectByName('clapper');if(clapper)clapper.rotation.z=Math.sin(age*25)*.5*hit.intensity*Math.exp(-age*1.5);if(age>4)this.bellRings.delete(id);}
  for(const {item,links}of this.chains){const anchor=transformUpper(item.anchor,sim.angle),p=sim.dynamic.get(item.id).body.translation();links.forEach((link,i)=>{link.position.lerpVectors(new THREE.Vector3(anchor.x,anchor.y,anchor.z),new THREE.Vector3(p.x,p.y+.28,p.z),i/links.length);link.rotation.y=i%2*Math.PI/2;});}
  if(sim.state==='flying'){this.history.push(this.ball.position.clone());if(this.history.length>7)this.history.shift();}else this.history=[];
  this.trail.geometry.dispose();this.trail.geometry=new THREE.BufferGeometry().setFromPoints(this.history);
  this.path.visible=sim.state==='ready'&&this.showPath!==false;
  for(let i=this.pulses.length-1;i>=0;i--){const p=this.pulses[i];p.scale.multiplyScalar(1.04);p.material.opacity-=.025;if(p.material.opacity<=0){this.scene.remove(p);p.geometry.dispose();p.material.dispose();this.pulses.splice(i,1);}}
 }
 ring(item,intensity){this.bellRings.set(item.id,{time:this.sim.time,intensity});}
 hit(item){
  const obj=this.pieces.get(item.id);if(item.target!==undefined){obj.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(0x8fbd42);o.material.emissiveIntensity=.2;}});}
  const pulse=torus(.45,.025,new THREE.MeshBasicMaterial({color:0xe6ffb2,transparent:true,opacity:1}));pulse.position.copy(this.ball.position);this.scene.add(pulse);this.pulses.push(pulse);
 }
 render(){
  const r=this.renderer,w=this.width,h=this.height;r.setScissorTest(true);
  if(this.overview){r.clippingPlanes=[];r.setViewport(0,0,w,h);r.setScissor(0,0,w,h);r.render(this.scene,this.overviewCamera);return;}
  // Lab comparison only: two unmodified views of the same physical world.
  const bend=(180-this.sim.angle)*Math.PI/180,normal=new THREE.Vector3(0,Math.sin(bend/2),-Math.cos(bend/2));
  r.clippingPlanes=[new THREE.Plane(normal,0)];r.setViewport(0,h/2,w,h/2);r.setScissor(0,h/2,w,h/2);r.render(this.scene,this.topCamera);
  r.clippingPlanes=[new THREE.Plane(normal.clone().negate(),0)];r.setViewport(0,0,w,h/2);r.setScissor(0,0,w,h/2);r.render(this.scene,this.bottomCamera);
 }

 dispose(){this.renderer.dispose();this.env.dispose();this.scene.traverse(o=>{if(o.geometry&&!Array.from(geometries.values()).includes(o.geometry))o.geometry.dispose();});}
}
