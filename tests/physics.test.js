import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { initPhysics, Simulation } from '../src/physics.js';
import { LEVEL, SPAWN, STEP, transformUpper, hingeSegments } from '../src/level.js';
before(initPhysics);
const advance=(s,n)=>{for(let i=0;i<n;i++)s.step();};
for(const angle of [90,120,150,180]){
 test(`${angle}°: continuous hinge crossing with the same body and a real target collision`,()=>{
  const s=new Simulation(angle);try{
   advance(s,120);const handle=s.ball.handle;const count=s.world.bodies.len();s.launch(72,0);let previous={...s.ball.translation()},travel=0;
   for(let i=0;i<700;i++){s.step();const p=s.ball.translation();const distance=Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z);assert.ok(distance<.4,'No teleport or discontinuous transfer');travel+=distance;previous={...p};assert.equal(s.ball.handle,handle);}
   assert.ok(s.crossings>=1,'Ball enters upper cavity');assert.ok(s.targets.has(0),'Target hit via Rapier collision event');assert.equal(s.world.bodies.len(),count);assert.ok(travel>11);
  }finally{s.dispose();}
 });
 test(`${angle}°: prediction agrees with the live collision simulation`,()=>{
  const s=new Simulation(angle);try{advance(s,180);const before={...s.ball.translation()},count=s.world.bodies.len();const path=s.predict(72,0,1.5);assert.deepEqual({...s.ball.translation()},before);assert.equal(s.world.bodies.len(),count);s.launch(72,0);let sample=0,maxError=0;for(let i=0;i<180;i++){s.step();if(i%4===0){const p=s.ball.translation(),expected=path[sample++];maxError=Math.max(maxError,Math.hypot(p.x-expected.x,p.y-expected.y,p.z-expected.z));}}assert.ok(maxError<.003,`Prediction error ${maxError}`);}finally{s.dispose();}
 });
}
test('All three goals can be completed in one level with normal aim and power',()=>{
 const s=new Simulation();try{advance(s,240);for(const aim of [0,4,-10]){s.resetBall();assert.equal(s.launch(72,aim),true);for(let i=0;i<2160;i++){s.step();if(s.state==='lost'||s.state==='won')break;}}assert.equal(s.targets.size,3);assert.equal(s.state,'won');assert.ok(s.score>=450);assert.equal(s.shots,3);}finally{s.dispose();}
});
test('A scored target is not counted twice; resetting keeps the original ball',()=>{
 const s=new Simulation();try{const handle=s.ball.handle;for(let shot=0;shot<2;shot++){s.resetBall();s.launch(72,0);advance(s,600);}assert.equal(s.score,100);assert.equal(s.targets.size,1);s.resetBall();assert.equal(s.ball.handle,handle);assert.deepEqual({...s.ball.translation()},{x:Math.fround(SPAWN.x),y:Math.fround(SPAWN.y),z:Math.fround(SPAWN.z)});assert.equal(s.state,'ready');assert.equal(s.launch(),true);assert.equal(s.launch(),false);}finally{s.dispose();}
});
test('Moving hinge rotates the actual upper colliders, preserves the ball and stays finite in flight',()=>{
 const s=new Simulation();try{const handle=s.ball.handle;const target=[...s.colliders.entries()].find(([,i])=>i.target===2);const start=s.world.getCollider(target[0]).translation();s.launch(72,3);s.setAngle(180);advance(s,210);assert.equal(s.angle,180);const end=s.world.getCollider(target[0]).translation();assert.ok(Math.abs(start.y-end.y)>8);assert.ok(end.z< -8);assert.equal(s.ball.handle,handle);for(const v of Object.values(s.ball.translation()))assert.ok(Number.isFinite(v));assert.equal(s.world.bodies.len(),15);}finally{s.dispose();}
});
test('Quarter pipe has no physical gap at either tangent',()=>{
 for(const a of [90,120,150]){const parts=hingeSegments(a);assert.equal(parts.length,24);const first=parts[0],last=parts.at(-1);assert.ok(Math.abs(first.pos[1]+.08)<.01);const inverse=transformUpper(last.pos,180-a);assert.ok(Math.abs(inverse.z+.08)<.01);}
 assert.equal(hingeSegments(180).length,1);
});
test('Pendulums are constrained and props have simulated mass',()=>{
 const s=new Simulation();try{const bell=[...s.dynamic.values()].find(v=>v.item.shape==='bell');const before={...bell.body.translation()};bell.body.applyImpulse({x:1.2,y:0,z:.4},true);advance(s,120);const after=bell.body.translation();assert.ok(Math.abs(after.x-before.x)>.01);const a=bell.item.anchor;assert.ok(Math.hypot(after.x-a[0],after.y-a[1],after.z-a[2])<2.8);assert.equal(s.world.impulseJoints.len(),4);assert.ok([...s.dynamic.values()].filter(v=>v.item.crate).every(v=>v.body.mass()>0));}finally{s.dispose();}
});
test('Construction kit and timestep are complete',()=>{for(const shape of ['box','arch','hoop','target','bumper','bell'])assert.ok(LEVEL.some(p=>p.shape===shape));assert.ok(LEVEL.length>=80);assert.equal(STEP,1/120);});

test('Ignoring the returning ball drains five lives exactly once each, then game over',()=>{
 const s=new Simulation();try{const handle=s.ball.handle;for(let life=5;life>0;life--){assert.equal(s.lives,life);assert.equal(s.launch(72,0),true);s.ball.setTranslation({x:2,y:.4,z:11.8},true);s.ball.setLinvel({x:0,y:0,z:4},true);for(let i=0;i<7200&&s.state==='flying';i++)s.step();assert.equal(s.lives,life-1);assert.equal(s.state,life===1?'gameover':'lost');advance(s,100);assert.equal(s.lives,life-1);assert.equal(s.ball.handle,handle);if(life>1)assert.equal(s.nextBall(),true);}assert.equal(s.launch(),false);assert.equal(s.nextBall(),false);}finally{s.dispose();}
});
test('A timed character headbutt makes physical contact and sends the SAME ball back',()=>{
 const s=new Simulation();try{const handle=s.ball.handle;s.launch(72,0);let pressed=false,saved=false;for(let i=0;i<1000;i++){const p=s.ball.translation(),v=s.ball.linvel();if(!pressed&&s.shotTime>1&&v.z>0&&p.z>8.5){assert.equal(s.headbutt(0),true);assert.equal(s.headbutt(0),false);pressed=true;}const events=s.step();if(events.some(e=>e.type==='save')){saved=true;assert.ok(s.ball.linvel().z< -18);assert.equal(s.lives,5);assert.equal(s.saves,1);assert.equal(s.ball.handle,handle);break;}}assert.equal(saved,true);const crossings=s.crossings;advance(s,90);assert.ok(s.crossings>crossings,'Saved ball traverses the hinge again');}finally{s.dispose();}
});
test('A headbutt at the wrong time is a miss, without remotely saving the ball',()=>{
 const s=new Simulation();try{s.launch();s.headbutt(0);s.headbutt(1);advance(s,100);assert.equal(s.saves,0);assert.equal(s.lives,5);for(let i=0;i<1000&&s.state==='flying';i++)s.step();assert.equal(s.state,'recovering');advance(s,60);assert.equal(s.state,'ready');assert.equal(s.saves,0);assert.equal(s.lives,5);}finally{s.dispose();}
});
test('Characters patrol predictably and targets survive a lost life',()=>{
 const s=new Simulation();try{const before={...s.characters[0].body.translation()};advance(s,180);assert.ok(Math.abs(before.x-s.characters[0].body.translation().x)>.5);s.launch();for(let i=0;i<1500&&s.state==='flying';i++)s.step();assert.ok(s.targets.has(0));advance(s,60);s.launch();s.ball.setTranslation({x:2,y:.4,z:11.8},true);s.ball.setLinvel({x:0,y:0,z:4},true);advance(s,60);s.nextBall();assert.ok(s.targets.has(0));assert.equal(s.lives,4);assert.equal(s.state,'ready');assert.equal(s.headbutt(0),false);}finally{s.dispose();}
});
test('Bells ring on repeated physical hits, swing, and award their bonus only once',()=>{
 const s=new Simulation();try{
  advance(s,180);s.launch();s.ball.setGravityScale(0,true);
  const bell=[...s.dynamic.values()].find(d=>d.item.shape==='bell');let rings=0,bonuses=0,maxMotion=0;
  for(let hit=0;hit<2;hit++){
   s.ball.setTranslation({x:0,y:15,z:8},true);s.ball.setLinvel({x:0,y:0,z:0},true);advance(s,35);
   const p={...bell.body.translation()};s.ball.setTranslation({x:p.x-1.1,y:p.y,z:p.z},true);s.ball.setLinvel({x:8,y:0,z:0},true);
   for(let i=0;i<35;i++){for(const e of s.step()){if(e.item?.id===bell.item.id){if(e.type==='ring')rings++;if(e.type==='bell')bonuses++;}}maxMotion=Math.max(maxMotion,Math.abs(bell.body.translation().x-p.x));}
  }
  assert.ok(rings>=2,'Every separated hit rings');assert.equal(bonuses,1,'No score farming');assert.ok(maxMotion>.03,'Bell physically swings');
 }finally{s.dispose();}
});
test('Manual defenders move smoothly, stay in their half and hold the chosen position',()=>{
 const s=new Simulation();try{
  const start=s.characters[0].body.translation().x;s.moveCharacter(0,-100);s.step();assert.ok(Math.abs(s.characters[0].body.translation().x-start)<=9*STEP+.001);
  advance(s,120);assert.ok(Math.abs(s.characters[0].body.translation().x+4.25)<.001);
  s.moveCharacter(0,-2.8);s.moveCharacter(1,2.7);advance(s,120);
  assert.ok(Math.abs(s.characters[0].body.translation().x+2.8)<.001);assert.ok(Math.abs(s.characters[1].body.translation().x-2.7)<.001);
  advance(s,120);assert.ok(Math.abs(s.characters[0].body.translation().x+2.8)<.001);
  s.moveCharacter(0,100);s.moveCharacter(1,-100);advance(s,120);
  assert.ok(s.characters[0].body.translation().x<=-.749);assert.ok(s.characters[1].body.translation().x>=.749);
 }finally{s.dispose();}
});
test('Prediction still matches live movement after manually positioning defenders',()=>{
 const s=new Simulation();try{s.moveCharacter(0,-3.5);s.moveCharacter(1,3.5);const path=s.predict(72,0,.8);s.launch();let sample=0;
  for(let i=0;i<96;i++){s.step();if(i%4===0){const p=s.ball.translation(),q=path[sample++];assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<.003);}}
 }finally{s.dispose();}
});
for(const [level,aims] of [[1,[0]],[2,[0,6]],[4,[0,4,-10]]]){
 test(`Learning box ${level} is winnable with normal aiming and its own target count`,()=>{
  const s=new Simulation(90,level);try{advance(s,180);for(const aim of aims){if(s.state==='won')break;s.resetBall();s.launch(72,aim);for(let i=0;i<2160&&s.state==='flying';i++)s.step();}
   assert.equal(s.state,'won');assert.equal(s.targets.size,s.lesson.targets);assert.ok(s.levelPieces.length<50);
  }finally{s.dispose();}
 });
}
test('Learning box 3 waits for an actual save after hitting the target',()=>{
 const s=new Simulation(90,3);try{s.moveCharacter(0,-.75);advance(s,180);s.launch();let pressed=false,targetBeforeSave=false;
  for(let i=0;i<1500&&s.state==='flying';i++){const p=s.ball.translation(),v=s.ball.linvel();if(s.targets.size===1&&s.saves===0)targetBeforeSave=true;
   if(!pressed&&s.shotTime>1&&v.z>0&&p.z>8.5){s.headbutt(0);pressed=true;}s.step();}
  assert.equal(targetBeforeSave,true);assert.equal(s.state,'won');assert.equal(s.saves,1);
 }finally{s.dispose();}
});
test('Holding a positioned defender saves by real contact and finishes the defence lesson',()=>{
 const s=new Simulation(90,3);try{s.moveCharacter(0,-.75);advance(s,180);s.launch();s.setDefending(0,true);for(let i=0;i<1500&&s.state==='flying';i++)s.step();assert.equal(s.state,'won');assert.equal(s.saves,1);}finally{s.dispose();}
});
test('A won ball continues its real rebound before settling, without extra scoring',()=>{
 const s=new Simulation(90,1);try{s.launch();while(s.state==='flying')s.step();assert.equal(s.state,'won');const p={...s.ball.translation()},score=s.score;advance(s,45);const q=s.ball.translation();assert.ok(Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)>.1);assert.equal(s.score,score);assert.equal(s.lives,5);}finally{s.dispose();}
});
test('Magazine feeds the same rigid body continuously into the launcher',()=>{
 const s=new Simulation(90,1);try{const body=s.ball.handle,count=s.world.bodies.len();s.beginFeed();assert.equal(s.launch(),false);let p={...s.ball.translation()};for(let i=0;i<100;i++){s.step();const q=s.ball.translation();assert.ok(Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<.1);p={...q};assert.equal(s.ball.handle,body);assert.equal(s.world.bodies.len(),count);}assert.equal(s.state,'ready');assert.equal(s.launch(),true);}finally{s.dispose();}
});

test('A real ball impact fractures a brick into eight finite moving rigid bodies',()=>{
 const s=new Simulation(90,2);try{
  const brick=s.levelPieces.find(p=>p.breakable);s.launch();
  s.ball.setTranslation({x:brick.pos[0],y:brick.pos[1],z:brick.pos[2]+2},true);
  s.ball.setLinvel({x:0,y:0,z:-14},true);let broke=false;
  for(let i=0;i<40;i++)if(s.step().some(e=>e.type==='break')){broke=true;break;}
  assert.ok(broke);assert.ok(s.broken.has(brick.id));assert.ok(s.fragments.length>=8);
  const first=s.fragments[0],before={...first.body.translation()};advance(s,30);
  assert.ok(Math.hypot(first.body.translation().x-before.x,first.body.translation().y-before.y,first.body.translation().z-before.z)>.02);
  for(const f of s.fragments)assert.ok(Object.values(f.body.translation()).every(Number.isFinite));
  assert.equal(s.ball.userData.kind,'ball');
 }finally{s.dispose();}
});

test('Returning to the launch circle recovers the same ball without spending a life',()=>{
 const s=new Simulation(90,2);try{const handle=s.ball.handle;s.launch();s.shotTime=1;s.ball.setTranslation({x:.2,y:.4,z:9.5},true);s.ball.setLinvel({x:0,y:0,z:4},true);advance(s,90);assert.equal(s.state,'ready');assert.equal(s.lives,5);assert.equal(s.ball.handle,handle);assert.equal(s.launch(100,0),true);assert.ok(-s.ball.linvel().z>30);assert.ok(s.ballCollider.restitution()>.6);}finally{s.dispose();}
});

test('Box 2 upper target accepts several nearby aim angles at medium and high power',()=>{
 for(const power of [50,72,85,100]){let hits=0;for(const aim of [4,5,6,7]){const s=new Simulation(90,2);try{s.launch(power,aim);for(let i=0;i<1400&&s.state==='flying';i++)s.step();if(s.targets.has(1))hits++;}finally{s.dispose();}}assert.ok(hits>=3,`Power ${power}: upper target needs a forgiving aiming window`);}
});

test('First box opens on bell contact but wins only after the same hero returns into the lowered nest',()=>{
 const s=new Simulation(90,1);try{const handle=s.ball.handle;s.launch(72,0);let opened=false;
 for(let i=0;i<180&&s.state==='flying';i++){const events=s.step();if(events.some(e=>e.type==='home-open')){opened=true;assert.equal(s.state,'flying');assert.ok(s.ball.translation().y>3);break;}}
 assert.ok(opened);for(let i=0;i<1800&&s.state==='flying';i++){const p=s.ball.translation();if(p.z>9&&s.ball.linvel().z>0)s.assistHome();s.step();}
 assert.equal(s.state,'won');assert.equal(s.ball.handle,handle);assert.equal(s.lives,5);assert.ok(s.ball.translation().z>11.35);assert.ok(s.ball.translation().y<.15);
 }finally{s.dispose();}
});
test('Missing the bell never opens the nest and an escaped hero spends exactly one life',()=>{
 const s=new Simulation(90,1);try{s.launch();s.ball.setTranslation({x:3,y:.4,z:11.9},true);s.ball.setLinvel({x:0,y:0,z:6},true);advance(s,120);assert.equal(s.homeOpen,false);assert.equal(s.state,'lost');assert.equal(s.lives,4);advance(s,120);assert.equal(s.lives,4);}finally{s.dispose();}
});
test('The bellows cannot remotely move a hero in the upper box and has a cooldown',()=>{
 const s=new Simulation(90,1);try{s.launch();s.ball.setTranslation({x:1,y:5,z:1},true);assert.equal(s.assistHome(),true);assert.equal(s.assistHome(),false);advance(s,40);assert.equal(s.saves,0);}finally{s.dispose();}
});
