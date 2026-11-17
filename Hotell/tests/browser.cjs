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
await pages[0].locator('[data-room="1"]').click();await pages[0].getByRole('button',{name:'Himmel',exact:true}).click();await pages[0].getByRole('button',{name:'Lukk',exact:true}).click();await pages[1].waitForFunction(async()=> (await (await fetch('api.php')).json()).state.rooms[0].color==='sky',null,{polling:1000});
await pages[0].reload();await pages[0].locator('#team .person').first().waitFor();assert.equal((await state(pages[0])).rooms[0].color,'sky');
for(let i=0;i<3;i++){await pages[i].locator('[data-do="ready"]').click();if(i<2)assert.equal((await state(pages[i])).phase,'planning');}
await pages[0].locator('[data-event="b"]').waitFor();await pages[0].locator('[data-event="b"]').click();await pages[1].locator('[data-vote="b"]').waitFor();await pages[1].locator('[data-vote="b"]').click();await pages[2].waitForFunction(async()=> (await (await fetch('api.php')).json()).state.event.resolved,null,{polling:1000});
fs.mkdirSync('work/visual',{recursive:true});
for(let i=0;i<3;i++){const p=pages[i];assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`work/visual/hotel-${[320,390,1440][i]}.png`,fullPage:true});}
for(let day=1;day<=5;day++){console.log('Checking day',day);await pages[0].waitForFunction(async d=>{const s=(await (await fetch('api.php')).json()).state;return s.day===d&&s.phase==='day'},day,{polling:1000,timeout:15000});await pages[0].waitForFunction(async()=> (await (await fetch('api.php')).json()).state.phase!=='day',{},{timeout:25000,polling:1000});const s=await state(pages[0]);assert.equal(s.day,day);console.log('Completed day',day);if(day<5){for(let i=0;i<3;i++){await pages[i].locator('[data-do="ready"]').waitFor();await pages[i].locator('[data-do="ready"]').click();}}}
await pages[0].locator('[data-do="newspaper"]').click();assert.equal(await pages[0].locator('.newspaper article').count(),5);await pages[0].locator('#dialog [data-do="newSeason"]').click();await pages[0].locator('[data-config="profile"]').waitFor();const s=await state(pages[0]);assert.equal(s.season,2);assert(s.keepsakes.length);assert.equal(s.rooms[0].color,'sky');assert.deepEqual(errors,[]);
console.log(JSON.stringify({pass:true,contexts:3,widths:[320,390,1440],jsErrors:errors,checks:['activation UI','reopen','sync decor','all ready','2/3 event vote','five days','newspaper','new season','keepsakes','no viewport overflow']}));
}finally{if(browser)await browser.close();await owner('delete-qa');console.log('Isolated QA hotel removed')}})().catch(e=>{console.error(e.stack);process.exitCode=1});
