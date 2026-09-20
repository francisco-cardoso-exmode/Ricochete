import test from 'node:test';
import assert from 'node:assert/strict';
import {limitedView} from '../src/view-controls.js';
test('Inspection remains limited even after extreme drags and pinch gestures',()=>{
 assert.deepEqual(limitedView(360,-90,8),{yaw:8,pitch:-5,zoom:1.1});
 assert.deepEqual(limitedView(-360,90,.01),{yaw:-8,pitch:5,zoom:.92});
 assert.deepEqual(limitedView(),{yaw:0,pitch:0,zoom:1});
});
