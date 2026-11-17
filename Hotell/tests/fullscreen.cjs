const {chromium}=require('playwright');
const {execFileSync}=require('child_process');
const fs=require('fs');
const assert=require('assert');
const base='https://biancanoor.no/hotell/';
const key=execFileSync('security',['find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],{encoding:'utf8'}).trim();
const hotel='qa-browser-'+Date.now();
async function owner(action,fields={}){const r=await fetch(base+'owner.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action,hotel,...fields})});const d=await r.json();assert(d.ok);return d.result}
(async()=>{let browser;try{
await owner('create',{qa:true,seconds:16});browser=await chromium.launch({headless:true,channel:'chrome'});const contexts=[],pages=[],errors=[];
for(let i=0;i<3;i++){const c=await browser.newContext({viewport:{width:[320,390,1440][i],height:900}});contexts.push(c);const p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));const invite=await owner('invite',{player:['bianca','leandra','rebecca'][i]});await p.goto(invite.url);await p.locator('#activate').click();await p.locator('#team .person').first().waitFor();assert(!p.url().includes('invite'));}
const state=p=>p.evaluate(async()=> (await (await fetch('api.php')).json()).state);
await pages[0].locator('#hotel-name-input').fill('Sommerfuglenes hotell');await pages[0].locator('#hotel-name-input').blur();
await pages[1].waitForFunction(async()=> (await (await fetch('api.php')).json()).state.hotelName==='Sommerfuglenes hotell',null,{polling:1000});
await pages[0].locator('[data-do="ready"]').click();await pages[0].waitForFunction(async()=> (await (await fetch('api.php')).json()).state.players[0].ready,null,{polling:1000});
await pages[1].locator('#hotel-name-input').fill('Venninnenes sommerhotell');await pages[1].locator('#hotel-name-input').blur();
await pages[0].waitForFunction(async()=> {const s=(await (await fetch('api.php')).json()).state;return s.hotelName==='Venninnenes sommerhotell'&&!s.players[0].ready},null,{polling:1000});
await pages[0].reload();await pages[0].locator('#hotel-name-input').waitFor();assert.equal(await pages[0].locator('#hotel-name-input').inputValue(),'Venninnenes sommerhotell');
fs.mkdirSync('work/fullscreen',{recursive:true});
for(let i=0;i<3;i++){assert(await pages[i].evaluate(()=>{const r=document.querySelector('.scene-scroll').getBoundingClientRect();return Math.abs(r.height-innerHeight)<3&&r.width>=innerWidth-2}));await pages[i].screenshot({path:`work/fullscreen/hotel-${[320,390,1440][i]}.png`,fullPage:true});assert(await pages[i].evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
await pages[0].locator('#sheet-toggle').click();assert(await pages[0].locator('#game-sheet').evaluate(el=>getComputedStyle(el).visibility==='hidden'));
await pages[0].locator('[data-pan="garden"]').click();await pages[0].waitForFunction(()=>document.querySelector('.scene-scroll').scrollLeft>500);
await pages[0].locator('#sheet-toggle').click();assert(await pages[0].locator('#game-sheet').isVisible());
const guest=await browser.newContext({viewport:{width:390,height:844}});const landing=await guest.newPage();await landing.goto(base);await landing.screenshot({path:'work/fullscreen/landing-390.png'});await guest.close();
assert(await pages[0].evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log('PASS fullscreen UI at 320/390/1440px: viewport-sized hotel, no page overflow, panel toggle, garden navigation, name sync/readiness reset and no JS errors');
}finally{if(browser)await browser.close();await owner('delete-qa');console.log('Isolated QA hotel removed')}})().catch(e=>{console.error(e.stack);process.exitCode=1});
