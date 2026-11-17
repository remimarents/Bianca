const {webkit,chromium}=require('/Users/remimarents/node_modules/playwright');
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
for(let i=0;i<3;i++){const c=await browser.newContext({viewport:{width:[390,320,430][i],height:844},isMobile:true,hasTouch:true});contexts.push(c);const p=await Promise.race([c.newPage(),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Browser page setup timed out')),20000);t.unref()})]);console.log('Context',i);await c.addCookies([{name:'hotel_device',value:keys[i],url:base,httpOnly:true,sameSite:'Strict'}]);pages.push(p);p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.route('**/assets/ui-glass.css*',r=>r.fulfill({body:fs.readFileSync(path.join(root,'../assets/ui-glass.css')),contentType:'text/css'}));await p.goto(base);await p.locator('#hotel-name-input').waitFor({state:'attached'});}
const state=async i=>(await (await contexts[i].request.get(base+'api.php')).json()).state;
const act=async(i,action,fields={})=>{for(let n=0;n<3;n++){const d=await(await contexts[i].request.get(base+'api.php')).json();const r=await contexts[i].request.post(base+'api.php',{data:{action,id:crypto.randomUUID(),rev:d.state.rev,...fields},headers:{'X-CSRF-Token':d.csrf}});const v=await r.json();if(r.status()===409)continue;assert.equal(r.status(),200,JSON.stringify(v));return v.state;}throw Error('Repeated conflict')};
const p=pages[0];
for(let i=0;i<3;i++)await act(i,'ready');
for(const page of pages){await page.reload();await page.locator('.task-chip').first().waitFor();}
assert.equal(await p.locator('#game-sheet').evaluate(e=>e.classList.contains('collapsed')),true);
await p.locator('#event-peek').click();assert.equal(await p.locator('.service-tasks').count(),0);assert(!(await p.locator('#workbench').isVisible()));
await p.locator('[data-event="a"]').click();await p.locator('.vote-people').waitFor();assert((await p.locator('.vote-people').innerText()).includes('venter'));
assert(!(await state(0)).event.resolved);
await pages[1].locator('#event-peek').click();await pages[1].locator('[data-vote="a"]').click();assert(!(await state(0)).event.resolved);
await pages[2].locator('#event-peek').click();await pages[2].locator('[data-vote="b"]').click();await p.waitForFunction(async()=> (await(await fetch('api.php')).json()).state.event.resolved);await p.waitForFunction(()=>document.querySelector('#game-sheet').classList.contains('collapsed'));assert((await state(0)).event.resolved);
await p.locator('.task-chip').first().click();await p.locator('[data-task-answer="a"]').click();await p.waitForFunction(()=>!document.querySelector('#dialog').open);
assert(await p.locator('.task-chip').first().isVisible());await p.screenshot({path:'../hotel-separate-tasks.png'});
await p.locator('#sheet-toggle').click();assert(await p.locator('#workbench').isVisible());assert(!(await p.locator('#decision').isVisible()));assert.deepEqual(errors,[]);
console.log('PASS three players: separate task/discussion UI, personal votes, waits for all three, resolves majority, closes resolved choice and completed task, separate menu');
}catch(e){console.error(e.stack);process.exitCode=1;}finally{server.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});if(browser)await browser.close();}})();
