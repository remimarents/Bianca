const {chromium}=require('playwright');const assert=require('assert');const fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});const page=await context.newPage();await page.clock.install({time:new Date('2026-11-17T12:00:00Z')});await page.goto('https://biancanoor.no/hotell/');
assert.equal(await page.locator('[data-days]').innerText(),'15');assert.equal(await page.locator('[data-hours]').innerText(),'11');assert.equal(await page.locator('[data-minutes]').innerText(),'00');
fs.mkdirSync('work/countdown',{recursive:true});await page.screenshot({path:'work/countdown/landing-390.png',fullPage:true});
for(const [width,height] of [[320,568],[1440,900]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const a=await page.locator('.opening-countdown').boundingBox(),b=await page.locator('main').boundingBox();assert(a.y+a.height<=b.y||a.x+a.width<=b.x,'banner overlaps entry panel');await page.screenshot({path:`work/countdown/landing-${width}.png`,fullPage:true});}
await page.clock.setFixedTime(new Date('2026-12-02T22:59:00Z'));await page.clock.runFor(1000);assert.equal(await page.locator('[data-minutes]').innerText(),'01');
await page.clock.setFixedTime(new Date('2026-12-02T23:00:00Z'));await page.clock.runFor(1000);assert.equal(await page.locator('[data-countdown-title]').innerText(),'Nå kan dere spille alle tre!');assert(await page.locator('[data-countdown-time]').isHidden());
await page.clock.setFixedTime(new Date('2026-12-04T12:00:00Z'));await page.clock.runFor(1000);assert(await page.locator('[data-countdown-time]').isHidden());
await page.screenshot({path:'work/countdown/open.png'});console.log('PASS countdown: exact Oslo midnight independent of device timezone, before/at/after opening, 320/390/1440 no overflow or overlapping panels');await context.close();
}catch(e){console.error(e.stack);throw e}finally{await browser.close()}})().catch(()=>process.exitCode=1);
