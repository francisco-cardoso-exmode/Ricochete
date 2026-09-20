import test from 'node:test';import assert from 'node:assert/strict';
import {foldScreenY} from '../src/screen-transfer.js';
test('Ball crosses exactly on the visible hinge, with no jump at its midpoint',()=>{
 for(const h of [667,844,932]){
  assert.equal(foldScreenY(200,600,h,.5),h/2);
  assert.ok(Math.abs(foldScreenY(200,600,h,.5-1e-6)-foldScreenY(200,600,h,.5+1e-6))<.001);
  let before=-Infinity;
  for(let i=0;i<=100;i++){const y=foldScreenY(h*.4,h*.6,h,i/100);assert.ok(y>=before);before=y;}
 }
});
test('Crossing cannot appear on the wrong half before or after the hinge',()=>{
 assert.ok(foldScreenY(700,100,844,.3)<422);
 assert.ok(foldScreenY(700,100,844,.7)>422);
});
