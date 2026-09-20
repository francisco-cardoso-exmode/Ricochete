import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL||'http://localhost:5173'}/?debug=1`);
 await page.waitForFunction(()=>!!window.__ricochete);
 assert.equal(await page.locator('.controls').isVisible(),false);
 assert.equal(await page.locator('#lives-label').textContent(),'5 BOLAS');
 const bounds=await page.locator('#game').boundingBox();
 await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.82);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.85,{steps:6});await page.mouse.up();
 await page.waitForFunction(()=>window.__ricochete.snapshot().shots===1);
 await page.waitForFunction(()=>window.__ricochete.snapshot().lives===4);
 await page.waitForFunction(()=>window.__ricochete.snapshot().state==='ready');
 assert.equal(await page.locator('#player-score').textContent(),'0100');
 assert.equal(await page.locator('#goal-0').getAttribute('class'),'hit');
 await page.locator('#player-help').click();assert.equal(await page.locator('#help-dialog').isVisible(),true);await page.locator('#close-help').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log(`PASS ${viewport.width}x${viewport.height}: player UI, gesture, scoring, life loss, next ball, help, overflow`);await page.close();
}}finally{await browser.close();}
