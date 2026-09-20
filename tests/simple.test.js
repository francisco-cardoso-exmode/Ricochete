import test from 'node:test';import assert from 'node:assert/strict';
import {SimplePhysics,init,STEP} from '../src/simple-physics.js';
await init();
test('The simple box returns every supported launch to its centre under gravity without resetting the body',()=>{
 for(const power of [0,40,70,100])for(const aim of [-65,-30,0,30,65]){
  const s=new SimplePhysics(),handle=s.ball.handle;try{assert.ok(s.launch(power,aim));let previous={...s.ball.translation()};
   for(let i=0;i<60/STEP&&s.state!=='ready';i++){s.step();const p=s.ball.translation();assert.ok(Math.abs(p.x)<5.3&&Math.abs(p.z)<5.3&&p.y>-.1,'Contained by real walls');assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.12,'No teleport');assert.equal(s.ball.handle,handle);previous={...p};}
   assert.equal(s.state,'ready',`Returns at power ${power}, aim ${aim}`);assert.ok(Math.hypot(s.ball.translation().x,s.ball.translation().z)<.22);assert.ok(s.launch(50,0),'Reusable same ball');
  }finally{s.dispose();}
 }
});
test('The two-bell puzzle can be solved using the adjustable plate, then the same ball returns',()=>{
 const s=new SimplePhysics(true);try{s.setPlate(-30);s.launch(80,25);for(let i=0;i<7200&&s.state!=='ready';i++)s.step();assert.ok(s.solved);assert.ok(s.touchedPlate);assert.equal(s.hits.size,2);assert.equal(s.state,'ready');const handle=s.ball.handle;assert.ok(s.launch(20,0));assert.equal(s.hits.size,0);assert.equal(s.ball.handle,handle);}finally{s.dispose();}
});
test('Puzzle misses at all plate presets remain contained and return without consuming a ball',()=>{
 for(const plate of [-60,-30,0,30,60])for(const aim of [-65,-30,0,30,65]){const s=new SimplePhysics(true);try{s.setPlate(plate);s.launch(100,aim);for(let i=0;i<7200&&s.state!=='ready';i++){s.step();const p=s.ball.translation();assert.ok(Math.abs(p.x)<5.3&&Math.abs(p.z)<5.3&&p.y>-.1);}assert.equal(s.state,'ready',`${plate}/${aim}`);}finally{s.dispose();}}
});
