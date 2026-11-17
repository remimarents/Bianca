const {webkit,chromium}=require('playwright');
const {execFileSync,spawn}=require('child_process');
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hotel-journey-'));
const base='http://127.0.0.1:18469/';
const env={...process.env,HOTEL_DATA_DIR:dir,HOTEL_ASSET_DIR:root};
const db=JSON.parse(execFileSync('php',['-r',`require '${root}/core.php'; echo json_encode(['hotels'=>['qa'=>initial(true)],'keys'=>[],'invites'=>[]]);`],{env,encoding:'utf8'}));
db.keys={};
const keys=['bianca','leandra','rebecca'].map(player=>{let key=crypto.randomBytes(32).toString('hex');db.keys[crypto.createHash('sha256').update(key).digest('hex')]={hotel:'qa',player,csrf:crypto.randomBytes(32).toString('hex')};return key});
fs.writeFileSync(path.join(dir,'state.json'),JSON.stringify(db),{mode:0o600});
const server=spawn('php',['-S','127.0.0.1:18469','-t',root],{env,stdio:['ignore','ignore','pipe']});let logs='';server.stderr.on('data',b=>logs+=b.toString());
(async()=>{let browser;try{
for(let i=0;i<50;i++){try{await fetch(base);break}catch{await new Promise(r=>setTimeout(r,100))}}
browser=process.env.HOTEL_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,channel:'chrome'});console.log('Browser started');const pages=[],contexts=[],errors=[];
for(let i=0;i<3;i++){const c=await browser.newContext({viewport:{width:[390,320,430][i],height:844},isMobile:true,hasTouch:true});contexts.push(c);const p=await Promise.race([c.newPage(),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Browser page setup timed out')),20000);t.unref()})]);console.log('Context',i);await c.addCookies([{name:'hotel_device',value:keys[i],url:base,httpOnly:true,sameSite:'Strict'}]);pages.push(p);p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#hotel-name-input').waitFor();}
const state=async i=>(await (await contexts[i].request.get(base+'api.php')).json()).state;
const act=async(i,action,fields={})=>{for(let n=0;n<3;n++){const d=await(await contexts[i].request.get(base+'api.php')).json();const r=await contexts[i].request.post(base+'api.php',{data:{action,id:crypto.randomUUID(),rev:d.state.rev,...fields},headers:{'X-CSRF-Token':d.csrf}});const v=await r.json();if(r.status()===409)continue;assert.equal(r.status(),200,JSON.stringify(v));return v.state;}throw Error('Repeated conflict')};
const p=pages[0];await p.locator('#hotel-name-input').fill('Venninnenes hotell');await p.locator('[data-do="ready"]').click();await p.waitForFunction(()=>document.querySelector('#hotel-name').textContent==='Venninnenes hotell');
for(const page of pages.slice(1)){await page.locator('[data-do="ready"]').click();}
await p.locator('[data-event="b"]').waitFor();console.log('PASS iPhone planning, saved name, all three ready');
await p.locator('[data-event="b"]').click();await pages[1].locator('[data-vote="b"]').click();assert(!(await state(0)).event.resolved);await pages[2].locator('[data-vote="a"]').click();await p.locator('.result').first().waitFor();
await p.locator('[data-task]').first().click();await p.locator('[data-claim-task]').click();await p.locator('[data-task-answer="b"]').click();await p.locator('[data-do="closeTask"]').click();
await pages[1].locator('[data-task]').nth(1).click();await pages[1].locator('[data-task-answer="a"]').click();await pages[1].locator('[data-do="closeTask"]').click();
for(const page of pages)await page.locator('[data-do="next"]').first().click();
await p.waitForFunction(()=>document.querySelector('#decision').textContent.includes('Del 2 av 12'));
await p.locator('[data-do="pause"]').click();await pages[2].getByText('Hotellet har pause',{exact:true}).waitFor();await p.reload();await p.locator('[data-do="resume"]').click();await p.locator('[data-event="b"]').waitFor();assert.equal((await state(0)).encounter,1);
console.log('PASS all voices before majority, two tasks, cross-player sync, next scene, pause/reload/resume');
fs.mkdirSync('work/visual',{recursive:true});for(let i=0;i<3;i++)await pages[i].screenshot({path:`work/visual/journey-day-${[390,320,430][i]}.png`});
// Browser UI stale action protection: a conflict revealing a newer scene must not repeat a click.
let posts=0;await p.route('**/api.php',async route=>{if(route.request().method()!=='POST')return route.continue();posts++;const response=await contexts[0].request.get(base+'api.php');const d=await response.json();d.state.event.id='new-scene';d.state.encounter++;d.state.rev++;d.ok=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify(d)})});
await p.locator('[data-event="b"]').click();await p.getByText('Hotellet har gått videre. Se på det nye valget før du trykker igjen.',{exact:true}).waitFor();assert.equal(posts,1);await p.unroute('**/api.php');await p.reload();
// Complete the actual five-day state machine through its authenticated HTTP API.
for(let day=1;day<=5;day++){
 if(day>1)for(let i=0;i<3;i++)await act(i,'ready');
 for(let scene=day===1?1:0;scene<12;scene++){
  for(let i=0;i<3;i++)await state(i);
  await act(0,'propose',{kind:'event',choice:'b'});await act(1,'vote',{choice:'b'});let s=await act(2,'vote',{choice:'a'});
  for(let j=0;j<s.tasks.length;j++)await act(j%3,'task',{task:s.tasks[j].id,choice:'b'});
  for(let i=0;i<3;i++)await act(i,'next');
 }
 assert.equal((await state(0)).phase,day===5?'finished':'evening');
}
await p.reload();await p.locator('[data-do="newspaper"]').click();assert.equal(await p.locator('.newspaper article').count(),5);assert.equal(await p.locator('.newspaper details').count(),5);await p.locator('#dialog [data-do="newSeason"]').click();await p.locator('#hotel-name-input').waitFor();assert.equal((await state(0)).season,2);
await p.locator('#help').click();await p.frameLocator('.help-frame').getByText('Hvorfor blir sesongene forskjellige?',{exact:true}).click();assert((await p.frameLocator('.help-frame').locator('body').innerText()).includes('150 selvstendige'));await p.locator('.close-dialog').click();
fs.mkdirSync('work/visual',{recursive:true});
for(let i=0;i<3;i++){await pages[i].reload();assert(await pages[i].evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await pages[i].screenshot({path:`work/visual/journey-${[390,320,430][i]}.png`});}
await contexts[0].setOffline(true);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Prøver'));await contexts[0].setOffline(false);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('tilkoblet'));
assert.deepEqual(errors,[]);console.log('PASS browser 320/390/430: 5-day HTTP season, newspaper decisions, next season, help, no horizontal overflow, offline reconnect, no JavaScript errors');
}catch(e){console.error(e.stack);if(browser){for(const c of browser.contexts())for(const p of c.pages()){console.error((await p.locator('#decision').innerText().catch(()=>'')));await p.screenshot({path:'work/visual/journey-failure.png'}).catch(()=>{})}}process.exitCode=1;
}finally{server.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});if(browser)await browser.close();}})();
