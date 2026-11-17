const {chromium}=require('playwright');
const {execFileSync}=require('child_process');
const assert=require('assert'),crypto=require('crypto');
const base='https://biancanoor.no/hotell/';
const secret=execFileSync('security',['find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],{encoding:'utf8'}).trim();
const hotel='qa-devices-'+Date.now();
async function owner(action,fields={}){const r=await fetch(base+'owner.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify({action,hotel,...fields})});const d=await r.json();assert(d.ok);return d.result}
(async()=>{let browser;try{
await owner('create',{qa:true});browser=await chromium.launch({headless:true,channel:'chrome'});
const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),pc=await browser.newContext({viewport:{width:1280,height:800}}),other=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const p=await phone.newPage(),d=await pc.newPage(),l=await other.newPage();for(const page of [p,d,l])page.setDefaultTimeout(15000);
const read=async c=>(await(await c.request.get(base+'api.php')).json());
const act=async(c,action,fields={})=>{const state=await read(c);const r=await c.request.post(base+'api.php',{data:{action,id:crypto.randomUUID(),rev:state.state.rev,...fields},headers:{'X-CSRF-Token':state.csrf}});assert.equal(r.status(),200);return r.json()};
const invite=await owner('invite',{player:'bianca'});await p.goto(base);await p.evaluate(url=>location.href=url,invite.url);await p.locator('#activate').click();await p.locator('#device-button').click();await p.locator('#make-device-code').click();await p.locator('.device-code').waitFor();const code=await p.locator('.device-code').innerText();await p.locator('.close-dialog').click();
await d.goto(base);await d.locator('.device-pair summary').click();await d.locator('#pair-code').fill(code);await d.locator('#pair-form button').click();await d.locator('#active-player').waitFor();assert.equal((await read(pc)).me.id,'bianca');assert.equal((await read(phone)).me.id,'bianca');assert((await d.locator('#active-player').innerText()).includes('Bianca'));
const replay=await other.request.post(base+'api.php',{data:{action:'pairDevice',code}});assert.equal(replay.status(),401);
await act(phone,'decorate',{room:4,color:'rose'});await d.waitForFunction(()=>document.querySelector('[data-room="4"]').style.getPropertyValue('--wall')==='#e2b6c2');
await d.locator('#role-button').click();await d.locator('#role-select').selectOption('hage');await d.locator('.close-dialog').click();assert.equal((await read(phone)).state.players[0].role,'hage');
assert.equal((await read(pc)).state.players.filter(x=>x.online).length,1);
console.log('PASS live phone-to-PC code entry, same Bianca identity, two-way progress, one-use code, two devices count as one player');
const li=await owner('invite',{player:'leandra'});await l.goto(base);await l.evaluate(url=>location.href=url,li.url);await l.locator('#activate').click();await l.locator('#device-button').click();await l.locator('#make-device-code').click();await l.locator('.device-code').waitFor();const code2=await l.locator('.device-code').innerText();await l.locator('.close-dialog').click();
await d.locator('#device-button').click();await d.locator('#logout-device').click();await d.locator('.device-pair summary').click();assert.equal((await pc.request.get(base+'api.php')).status(),401);assert.equal((await read(phone)).me.id,'bianca');await d.locator('#pair-code').fill(code2);await d.locator('#pair-form button').click();await d.locator('#active-player').waitFor();assert.equal((await read(pc)).me.id,'leandra');assert.equal((await read(phone)).me.id,'bianca');assert.equal((await read(other)).me.id,'leandra');
assert.equal((await read(pc)).state.players.filter(x=>x.online).length,2);
console.log('PASS shared PC switches to Leandra while both phones retain correct identity; exactly two players');
await act(phone,'ready');await act(other,'ready');await act(phone,'propose',{kind:'event',choice:'b'});await act(pc,'vote',{choice:'a'});assert(!(await read(phone)).state.event.resolved);await act(other,'vote',{choice:'b'});assert((await read(phone)).state.event.resolved);console.log('PASS PC and phone share one vote; changing it updates the same character');
await owner('reset',{player:'leandra'});assert.equal((await pc.request.get(base+'api.php')).status(),401);assert.equal((await other.request.get(base+'api.php')).status(),401);assert.equal((await read(phone)).me.id,'bianca');console.log('PASS owner reset revokes only the selected girl across devices');
}catch(e){console.error(String(e.message).replace(/[a-f0-9]{64}/g,'[redacted]'));process.exitCode=1;}finally{await owner('delete-qa');console.log('QA device hotel removed; actual players untouched');if(browser)await browser.close();}})();
