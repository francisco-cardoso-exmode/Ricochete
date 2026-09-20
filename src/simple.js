import './simple.css';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {FoldPhysics,init,surfaceData,surfacePoint,profile,wallSegments,upperPoint,HINGE,THETA,DEPTH,WIDTH,HOME_Z,RADIUS,STEP,floorHeight} from './fold-physics.js';
import {limitedView} from './view-controls.js';
const $=s=>document.querySelector(s),canvas=$('#box');
await init();const sim=new FoldPhysics();
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,150);
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();scene.environmentIntensity=.75;
scene.add(new T.HemisphereLight(0xf5f7ff,0x25282d,1));
const key=new T.DirectionalLight(0xffffff,3);key.position.set(-8,16,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:16,bottom:-15,far:55});key.shadow.normalBias=.035;scene.add(key);
const fill=new T.DirectionalLight(0xc7d7ef,.65);fill.position.set(10,8,-6);scene.add(fill);
const mat=(c,metal=.2,rough=.45)=>new T.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const graphite=mat(0x30363e,.55,.3),silver=mat(0xabb4bf,.8,.22),inside=mat(0x65717e,.15,.56),dark=mat(0x202830,.25,.5);
function solid(w,h,d,material,parent,x,y,z,r=.12){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
const box=new T.Group(),lid=new T.Group();scene.add(box,lid);lid.position.set(0,HINGE.y,HINGE.z);
function local(p,parent){return parent===lid?{x:p.x,y:p.y-HINGE.y,z:p.z-HINGE.z}:p;}
function panel(rows,depth,parent,material){const data=surfaceData(rows,depth);if(parent===lid)for(let i=0;i<data.vertices.length;i+=3){data.vertices[i+1]-=HINGE.y;data.vertices[i+2]-=HINGE.z;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.vertices,3));g.setIndex(new T.BufferAttribute(data.indices,1));g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
const baseRows=profile.filter(p=>p.section!=='upper'),upperRows=[HINGE,...profile.filter(p=>p.section==='upper')];
inside.side=T.DoubleSide;
panel(baseRows,0,box,inside);panel(upperRows,0,lid,inside);
// Solid back and matching raised walls give both halves real box depth.
const back=solid(WIDTH*2+.6,.36,7.7,graphite,lid,0,0,0,.12);back.rotation.x=THETA;back.position.copy(local(upperPoint(0,3.8,-.2),lid));
solid(WIDTH*2+.6,.45,8.4,graphite,box,0,-.34,.9,.18);
function sideWalls(rows,parent){
 for(const side of [-1,1]){
  const vertices=[],indices=[],rails=[];
  for(const row of rows){
   for(const [x,d]of [[side*(WIDTH+.3),-.3],[side*(WIDTH+.3),DEPTH+.5],[side*WIDTH,DEPTH+.5],[side*WIDTH,-.3]]){const p=local({x,y:row.y+Math.cos(row.theta)*d,z:row.z+Math.sin(row.theta)*d},parent);vertices.push(p.x,p.y,p.z);}
   const p=local({x:side*(WIDTH+.04),y:row.y+Math.cos(row.theta)*(DEPTH+.5),z:row.z+Math.sin(row.theta)*(DEPTH+.5)},parent);rails.push(new T.Vector3(p.x,p.y,p.z));
  }
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=a+4,d=b+4;indices.push(a,b,c,b,d,c);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const material=graphite.clone();material.side=T.DoubleSide;const wall=new T.Mesh(geometry,material);wall.castShadow=true;wall.receiveShadow=true;parent.add(wall);
  const rail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rails),rows.length*2,.055,6,false),silver);parent.add(rail);
 }
}
sideWalls(baseRows,box);sideWalls(upperRows,lid);
const top=profile.at(-1),topP=local({x:0,y:top.y+Math.cos(top.theta)*DEPTH/2,z:top.z+Math.sin(top.theta)*DEPTH/2},lid);
const topWall=solid(WIDTH*2+.6,DEPTH+.8,.35,graphite,lid,topP.x,topP.y,topP.z,.1);topWall.rotation.x=top.theta;
solid(WIDTH*2+.6,.9,.35,graphite,box,0,.55,5.03,.12);
// Faint protective glazing follows the same continuous collision surface.
const glass=new T.MeshPhysicalMaterial({color:0xc5d5e3,transparent:true,opacity:.018,roughness:.1,metalness:.3,side:T.DoubleSide,depthWrite:false});panel(baseRows,DEPTH,box,glass);panel(upperRows,DEPTH,lid,glass);solid(WIDTH*2,2.3,.06,glass,box,0,2.1,5.05,.02);
for(const r of [.88,1.15]){const ring=new T.Mesh(new T.TorusGeometry(r,.028,8,80),silver);ring.rotation.x=-Math.PI/2;ring.position.set(0,.04,HOME_Z);box.add(ring);}
for(const x of [-3.8,3.8]){const hinge=new T.Mesh(new T.CylinderGeometry(.25,.25,1,24),silver);hinge.rotation.z=Math.PI/2;hinge.position.set(x,HINGE.y,HINGE.z);box.add(hinge);}
// Recessed seams follow the actual curved rear panel.
for(const h of [1,3,5,7]){const points=[];for(let x=-WIDTH+.1;x<=WIDTH-.1;x+=.12){const p=local(upperPoint(x,h,.025*x*x+.025),lid);points.push(new T.Vector3(p.x,p.y,p.z));}lid.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x56616d,transparent:true,opacity:.38})));}
const ball=new T.Mesh(new T.SphereGeometry(RADIUS,48,32),new T.MeshStandardMaterial({color:0xe4eaf0,metalness:1,roughness:.065,envMapIntensity:1.9}));ball.castShadow=true;ball.receiveShadow=true;scene.add(ball);
const puzzlePlate=new T.Group();puzzlePlate.position.copy(local(sim.platePosition,lid));lid.add(puzzlePlate);
solid(3.3,.36,.6,silver,puzzlePlate,0,0,0,.12);solid(2.9,.39,.07,dark,puzzlePlate,0,0,.29,.025);
const bellViews=sim.bells.map(({p,index,height})=>{
 const group=new T.Group();group.position.copy(local(p,lid));lid.add(group);const metal=mat(0xbfc1ba,.87,.23);
 const shape=[[.12,.5],[.25,.4],[.3,.12],[.48,-.28],[.58,-.36],[.59,-.43]].map(([x,y])=>new T.Vector2(x,y));
 const body=new T.Group();group.add(body);const shell=new T.Mesh(new T.LatheGeometry(shape.reverse(),32),metal);shell.castShadow=true;body.add(shell);
 const clapper=new T.Mesh(new T.SphereGeometry(.14,16,12),silver);clapper.position.y=-.4;body.add(clapper);
 for(let i=0;i<4;i++){const link=new T.Mesh(new T.TorusGeometry(.105,.035,6,12),silver);link.position.y=.62+i*.16;link.rotation.y=i%2*Math.PI/2;group.add(link);}
 solid(.9,.14,1.35,graphite,group,0,1.22,-.55,.06);
 const glowMat=new T.MeshStandardMaterial({color:0x9aa4a9,emissive:0xcbdcb2,emissiveIntensity:0});const ring=new T.Mesh(new T.TorusGeometry(.75,.04,10,48),glowMat);ring.position.copy(local(upperPoint(p.x,height,.12),lid));ring.rotation.x=THETA-Math.PI/2;lid.add(ring);
 return {group,body,ring,lastHit:-100,index};
});
// A clean exterior shell covers the interior mechanism while the box is closed.
const closedShell=new T.Group();scene.add(closedShell);
const shellMat=graphite.clone(),shellTrim=silver.clone();shellMat.transparent=true;shellTrim.transparent=true;
solid(10.05,2.85,9.9,shellMat,closedShell,0,1.05,.25,.24);
solid(10.12,.16,9.96,shellTrim,closedShell,0,2.49,.25,.07);
const closedLid=new T.Group();closedLid.position.set(0,2.55,-4.7);closedShell.add(closedLid);solid(10.12,.42,9.96,shellMat,closedLid,0,.15,4.95,.2);
solid(.8,.24,.15,shellTrim,closedShell,0,2.18,5.27,.05);
let audioContext;
function ringSound(index){try{audioContext??=new AudioContext();audioContext.resume();const t=audioContext.currentTime;for(const [ratio,volume]of [[1,.08],[2.76,.025]]){const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=(index?880:660)*ratio;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.2);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+1.3);}}catch{}}
function updatePuzzle(){
 $('#plate-angle').textContent=`${Math.round(sim.plateAngle)}°`;$('#plate').value=sim.plateAngle;$('#plate').disabled=sim.state!=='ready';
 for(let i=0;i<2;i++){$('#bell-'+i).classList.toggle('hit',sim.hits.has(i));$('#bell-'+i).setAttribute('aria-label',`Campainha ${i+1}${sim.hits.has(i)?' tocada':''}`);}
}
$('#plate').addEventListener('input',e=>{sim.setPlate(Number(e.target.value));updatePuzzle();});
const floor=new T.Mesh(new T.PlaneGeometry(1000,1000),mat(0x252b33,0,.9));floor.rotation.x=-Math.PI/2;floor.position.y=-.77;floor.receiveShadow=true;scene.add(floor);
const aimGroup=new T.Group();scene.add(aimGroup);const dots=[];for(let i=0;i<14;i++){const dot=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshBasicMaterial({color:0xe1e9ef}));aimGroup.add(dot);dots.push(dot);}
let open=0,opening=false,playing=false,power=60,aim=0,drag=null,plateDrag=null,orbitDrag=null,pinch=null,gesture=false,view=limitedView(),smooth=limitedView(),width=1,height=1;
const pointers=new Map(),ray=new T.Raycaster();
function resize(){width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function cameraUpdate(){
 for(const k of ['yaw','pitch','zoom'])smooth[k]+=(view[k]-smooth[k])*.13;
 const corners=[];
 for(const row of baseRows)for(const x of [-5,5])corners.push(new T.Vector3(x,row.y+2.8*Math.cos(row.theta),row.z+2.8*Math.sin(row.theta)));
 lid.updateMatrixWorld();for(const h of [0,7.8])for(const x of [-5,5])for(const d of [0,3]){const p=local(upperPoint(x,h,d),lid);corners.push(new T.Vector3(p.x,p.y,p.z).applyMatrix4(lid.matrixWorld));}
 corners.push(new T.Vector3(0,-.5,5.3));
 const target=new T.Box3().setFromPoints(corners).getCenter(new T.Vector3());
 const orbit=new T.Spherical().setFromVector3(new T.Vector3(.3,14,20).normalize());orbit.theta+=smooth.yaw*Math.PI/180;orbit.phi+=smooth.pitch*Math.PI/180;
 const direction=new T.Vector3().setFromSpherical(orbit);camera.position.copy(target).addScaledVector(direction,40);camera.lookAt(target);camera.updateMatrixWorld();
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),tan=Math.tan(19*Math.PI/180);let distance=0;
 for(const p of corners){const delta=p.clone().sub(target),depth=delta.dot(direction);distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tan*camera.aspect*.97),depth+Math.abs(delta.dot(up))/(tan*.9));}
 camera.position.copy(target).addScaledVector(direction,distance/smooth.zoom);camera.lookAt(target);camera.updateMatrixWorld();
}
function onBox(e){ray.setFromCamera(new T.Vector2(e.clientX/width*2-1,1-e.clientY/height*2),camera);return ray.intersectObjects([box,lid],true).length>0;}
function openBox(){try{audioContext??=new AudioContext();audioContext.resume();}catch{}if(opening||playing)return;opening=true;$('#open').hidden=true;}$('#open').onclick=openBox;
function refreshForce(){$('#amount').textContent=`${Math.round(power)}%`;$('#meter').value=power;}
function cancelAim(){drag=null;plateDrag=null;$('#force').hidden=true;}
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
 if(pointers.size===2){cancelAim();gesture=true;const p=[...pointers.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:view.zoom};orbitDrag=null;return;}
 if(!onBox(e)){gesture=true;orbitDrag={x:e.clientX,y:e.clientY,...view};return;}
 if(!playing){openBox();return;}if(sim.state!=='ready')return;
 ray.setFromCamera(new T.Vector2(e.clientX/width*2-1,1-e.clientY/height*2),camera);if(ray.intersectObject(puzzlePlate,true).length){plateDrag={x:e.clientX,angle:sim.plateAngle};return;}
 drag={x:e.clientX,y:e.clientY,power,aim};$('#force').hidden=false;refreshForce();
});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&pointers.size===2){const p=[...pointers.values()];view=limitedView(view.yaw,view.pitch,pinch.zoom*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/Math.max(1,pinch.distance));return;}
 if(orbitDrag){view=limitedView(orbitDrag.yaw+(e.clientX-orbitDrag.x)*.045,orbitDrag.pitch+(e.clientY-orbitDrag.y)*.035,view.zoom);return;}
 if(plateDrag&&!gesture){sim.setPlate(plateDrag.angle+(e.clientX-plateDrag.x)*.6);updatePuzzle();return;}
 if(drag&&!gesture){aim=Math.max(-40,Math.min(40,drag.aim+(e.clientX-drag.x)/Math.min(width,650)*100));power=Math.max(0,Math.min(100,drag.power+(e.clientY-drag.y)/140*100));refreshForce();}
});
function finish(e,cancel=false){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(drag&&!gesture&&!cancel){sim.launch(power,aim);updatePuzzle();$('#instruction').textContent='Toca nas duas campainhas no mesmo lançamento.';}cancelAim();orbitDrag=null;pinch=null;if(!pointers.size)gesture=false;}
canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
canvas.addEventListener('wheel',e=>{e.preventDefault();view=limitedView(view.yaw,view.pitch,view.zoom*Math.exp(-e.deltaY*.001));},{passive:false});canvas.addEventListener('dblclick',e=>{if(!onBox(e))view=limitedView();});
window.addEventListener('blur',()=>{cancelAim();pointers.clear();gesture=false;orbitDrag=null;pinch=null;});
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,e=>e.preventDefault(),{passive:false});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||!playing||sim.state!=='ready')return;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))return;e.preventDefault();
 if(e.key===' '){sim.launch(power,aim);updatePuzzle();$('#force').hidden=true;$('#instruction').textContent='Toca nas duas campainhas no mesmo lançamento.';return;}
 aim=Math.max(-40,Math.min(40,aim+(e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0)));
 power=Math.max(0,Math.min(100,power+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));$('#force').hidden=false;refreshForce();
});
let last=performance.now(),accumulator=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;
 if(opening){open=Math.min(1,open+dt/.7);if(open===1){opening=false;playing=true;$('#puzzle-controls').hidden=false;$('#progress').hidden=false;$('#instruction').textContent='Lança para cima. Toca nas duas campainhas.';}}
 const eased=open*open*(3-2*open);closedShell.visible=open<.5;shellMat.opacity=shellTrim.opacity=1-Math.min(open*2,1);closedLid.rotation.x=-eased*1.6;box.visible=lid.visible=open>0;lid.rotation.x=(1-eased)*(Math.PI-THETA);
 if(playing&&!document.hidden){accumulator+=dt;while(accumulator>=STEP){const returned=sim.step();for(const index of sim.rings){bellViews[index].lastHit=sim.time;ringSound(index);updatePuzzle();$('#instruction').textContent=sim.solved?'Conseguiste! As duas campainhas tocaram.':'Uma tocou. Falta a outra!';}if(returned){updatePuzzle();$('#instruction').textContent=sim.solved?'Conseguiste! A bola voltou. Experimenta outro ressalto.':'De volta ao centro. Ajusta a placa e tenta outra vez.';}accumulator-=STEP;}}
 puzzlePlate.quaternion.copy(sim.plate.rotation());
 for(const b of bellViews){b.body.rotation.z=Math.sin((sim.time-b.lastHit)*24)*.25*Math.exp(-(sim.time-b.lastHit)*3);b.ring.material.emissiveIntensity=sim.hits.has(b.index)?.9:0;}

 ball.position.copy(sim.ball.translation());ball.quaternion.copy(sim.ball.rotation());ball.visible=playing;
 aimGroup.visible=playing&&sim.state==='ready';const angle=aim*Math.PI/180;dots.forEach((dot,i)=>{const d=.7+i*(.08+power*.001),x=Math.sin(angle)*d,z=HOME_Z-Math.cos(angle)*d;dot.position.set(x,floorHeight(x,z)+.075,z);});
 cameraUpdate();renderer.render(scene,camera);
}
$('#loading').remove();requestAnimationFrame(frame);
