import './simple.css';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SimplePhysics,init,bowlData,RADIUS,STEP,floorHeight} from './simple-physics.js';
import {limitedView} from './view-controls.js';
const $=s=>document.querySelector(s),canvas=$('#box');
await init();const sim=new SimplePhysics(true);
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,150);
const env=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(env,.04).texture;env.dispose();pmrem.dispose();scene.environmentIntensity=.75;
scene.add(new T.HemisphereLight(0xf5f7ff,0x25282d,1.2));
const key=new T.DirectionalLight(0xffffff,3);key.position.set(-8,16,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:16,bottom:-15,far:55});key.shadow.normalBias=.035;scene.add(key);
const fill=new T.DirectionalLight(0xc7d7ef,1);fill.position.set(10,8,-6);scene.add(fill);
const mat=(c,metal=.2,rough=.45)=>new T.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const graphite=mat(0x555b63,.55,.3),silver=mat(0xabb4bf,.8,.22),inside=mat(0x858c96,.12,.7);
function solid(w,h,d,material,parent,x,y,z,r=.12){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
const box=new T.Group();scene.add(box);
solid(10.5,.65,10.5,graphite,box,0,-.42,0,.2);
for(const side of [-1,1]){
 solid(.44,3.7,10.5,graphite,box,side*5.02,1.05,0);
 solid(10.5,3.7,.44,graphite,box,0,1.05,side*5.02);
 solid(.075,.075,10.18,silver,box,side*4.83,2.87,0,.03);
 solid(10.18,.075,.075,silver,box,0,2.87,side*4.83,.03);
}
const data=bowlData(),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(data.vertices,3));geometry.setIndex(new T.BufferAttribute(data.indices,1));geometry.computeVertexNormals();const bowl=new T.Mesh(geometry,inside);bowl.receiveShadow=true;box.add(bowl);
// Concentric engraved rings make the smooth slope and central low point visible.
for(const radius of [.77,1.05]){const ring=new T.Mesh(new T.TorusGeometry(radius,.017,8,80),silver);ring.rotation.x=-Math.PI/2;ring.position.y=floorHeight(radius,0)+.015;box.add(ring);}
solid(.7,.2,.12,silver,box,0,1.95,5.27,.05);
const lid=new T.Group();lid.position.set(0,2.98,-5.02);scene.add(lid);
solid(10.5,.38,10.5,graphite,lid,0,.12,5.02,.2);
solid(9.7,.06,9.7,inside,lid,0,-.1,5.02,.12);
for(const x of [-5.0,5.0])solid(.16,.35,10.3,silver,lid,x,-.05,5.02,.04);
for(const z of [0,10.05])solid(10.15,.35,.16,silver,lid,0,-.05,z,.04);
for(const x of [-3.5,3.5]){const hinge=new T.Mesh(new T.CylinderGeometry(.22,.22,1.1,24),silver);hinge.rotation.z=Math.PI/2;hinge.position.set(x,2.8,-5.08);scene.add(hinge);}
const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=160;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#c5cbd2';ctx.textAlign='center';ctx.font='600 68px sans-serif';ctx.fillText('R I C O C H E T E',512,105);const label=new T.Mesh(new T.PlaneGeometry(5.8,.91),new T.MeshBasicMaterial({map:new T.CanvasTexture(labelCanvas),transparent:true,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(0,.32,5);lid.add(label);
const ball=new T.Mesh(new T.SphereGeometry(RADIUS,48,32),new T.MeshStandardMaterial({color:0xd5dee8,metalness:1,roughness:.075,envMapIntensity:1.6}));ball.castShadow=true;ball.receiveShadow=true;scene.add(ball);
const puzzlePlate=new T.Group();puzzlePlate.position.copy(sim.plate.translation());scene.add(puzzlePlate);
solid(1.9,.84,.2,silver,puzzlePlate,0,0,0,.07);solid(1.6,.5,.025,graphite,puzzlePlate,0,0,.115,.03);
const axle=new T.Mesh(new T.CylinderGeometry(.15,.2,.3,24),silver);axle.position.set(0,-.43,0);puzzlePlate.add(axle);
const bellViews=sim.bells.map(({p,index})=>{
 const group=new T.Group();group.position.copy(p);scene.add(group);const metal=mat(0xb4b7b9,.85,.2);
 const profile=[[.08,.32],[.17,.24],[.22,0],[.34,-.2],[.35,-.24]].map(([x,y])=>new T.Vector2(x,y));
 const body=new T.Mesh(new T.LatheGeometry(profile.reverse(),32),metal);body.castShadow=true;group.add(body);
 const clapper=new T.Mesh(new T.SphereGeometry(.1,16,12),silver);clapper.position.y=-.2;group.add(clapper);
 solid(.07,.5,.07,graphite,group,0,.51,0,.02);solid(.8,.08,.6,graphite,group,0,.77,0,.03);
 const ring=new T.Mesh(new T.TorusGeometry(.5,.025,8,48),new T.MeshStandardMaterial({color:0x8b949d,emissive:0xbdd3a4,emissiveIntensity:0}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,floorHeight(p.x,p.z)+.03,p.z);scene.add(ring);
 return {group,body,ring,lastHit:-100,index};
});
const secret=new T.Group();secret.position.set(0,-.2,5);lid.add(secret);solid(2.7,.05,1.9,graphite,secret,0,0,0,.08);
const secretCover=solid(2.7,.09,1.9,inside,secret,0,-.23,0,.08);
const medal=new T.Mesh(new T.TorusGeometry(.5,.085,12,48),mat(0xcab889,.85,.2));medal.rotation.x=Math.PI/2;medal.position.y=-.07;secret.add(medal);
let secretProgress=0,audioContext;
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
 const corners=[];for(const x of [-5.3,5.3])for(const y of [-.75,3])for(const z of [-5.3,5.3])corners.push(new T.Vector3(x,y,z));
 lid.updateMatrixWorld();for(const x of [-5.3,5.3])for(const z of [-.2,10.3])corners.push(new T.Vector3(x,.35,z).applyMatrix4(lid.matrixWorld));
 const target=new T.Box3().setFromPoints(corners).getCenter(new T.Vector3());
 const orbit=new T.Spherical().setFromVector3(new T.Vector3(.8,13,16).normalize());orbit.theta+=smooth.yaw*Math.PI/180;orbit.phi+=smooth.pitch*Math.PI/180;
 const direction=new T.Vector3().setFromSpherical(orbit);camera.position.copy(target).addScaledVector(direction,40);camera.lookAt(target);camera.updateMatrixWorld();
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),tan=Math.tan(19*Math.PI/180);let distance=0;
 for(const p of corners){const delta=p.clone().sub(target),depth=delta.dot(direction);distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tan*camera.aspect*.88),depth+Math.abs(delta.dot(up))/(tan*.78));}
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
 if(drag&&!gesture){aim=Math.max(-65,Math.min(65,drag.aim+(e.clientX-drag.x)/Math.min(width,650)*100));power=Math.max(0,Math.min(100,drag.power+(e.clientY-drag.y)/140*100));refreshForce();}
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
 aim=Math.max(-65,Math.min(65,aim+(e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0)));
 power=Math.max(0,Math.min(100,power+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));$('#force').hidden=false;refreshForce();
});
let last=performance.now(),accumulator=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;
 if(opening){open=Math.min(1,open+dt/.7);if(open===1){opening=false;playing=true;$('#puzzle-controls').hidden=false;$('#progress').hidden=false;$('#instruction').textContent='Toca nas duas campainhas. Puxa a bola para trás e solta.';}}
 const eased=open*open*(3-2*open);lid.rotation.x=-eased*112*Math.PI/180;
 if(playing&&!document.hidden){accumulator+=dt;while(accumulator>=STEP){const returned=sim.step();for(const index of sim.rings){bellViews[index].lastHit=sim.time;ringSound(index);updatePuzzle();$('#instruction').textContent=sim.solved?'Resolvido! A caixa revelou um segredo.':'Uma tocou. Falta a outra!';}if(returned){updatePuzzle();$('#instruction').textContent=sim.solved?'Segredo descoberto. Podes experimentar outra trajetória.':'De volta ao centro. Ajusta a placa e tenta outra vez.';}accumulator-=STEP;}}
 puzzlePlate.quaternion.copy(sim.plate.rotation());
 for(const b of bellViews){b.body.rotation.z=Math.sin((sim.time-b.lastHit)*24)*.25*Math.exp(-(sim.time-b.lastHit)*3);b.ring.material.emissiveIntensity=sim.hits.has(b.index)?.9:0;}
 secretProgress+=(Number(sim.solved)-secretProgress)*Math.min(1,dt*3);secretCover.position.z=secretProgress*2;
 ball.position.copy(sim.ball.translation());ball.quaternion.copy(sim.ball.rotation());ball.visible=playing;
 aimGroup.visible=playing&&sim.state==='ready';const angle=aim*Math.PI/180;dots.forEach((dot,i)=>{const d=.6+i*(.07+power*.0017),x=Math.sin(angle)*d,z=-Math.cos(angle)*d;dot.position.set(x,floorHeight(x,z)+.04,z);});
 cameraUpdate();renderer.render(scene,camera);
}
$('#loading').remove();requestAnimationFrame(frame);
