const {webkit,chromium}=require('playwright');
const {execFileSync}=require('child_process');
const fs=require('fs');
const assert=require('assert');
const base='https://biancanoor.no/hotell/';
const key=execFileSync('security',['find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],{encoding:'utf8'}).trim();
const hotel='qa-browser-'+Date.now();
async function owner(action,fields={}){const r=await fetch(base+'owner.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action,hotel,...fields})});const d=await r.json();assert(d.ok);return d.result}
(async()=>{let browser;try{
await owner('create',{qa:true,seconds:16});browser=process.env.HOTEL_ENGINE==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,channel:'chrome'});const c1=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c1.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(base);const invite=await owner('invite',{player:'bianca'});await p.goto(invite.url);await p.locator('#activate').click();await p.locator('#hotel-name-input').waitFor();
const input=p.locator('#hotel-name-input');await input.fill('Venninnenes drømmehotell');
const c2=await browser.newContext({viewport:{width:320,height:700},isMobile:true,hasTouch:true});const p2=await c2.newPage();const i2=await owner('invite',{player:'leandra'});await p2.goto(i2.url);await p2.locator('#activate').click();await p2.locator('#team .person').first().waitFor();
await p2.evaluate(async()=>{const d=await(await fetch('api.php')).json();await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':d.csrf},body:JSON.stringify({action:'decorate',id:crypto.randomUUID(),rev:d.state.rev,room:4,color:'sky'})})});
await p.waitForFunction(()=>document.querySelector('[data-room="4"]').style.getPropertyValue('--wall')==='#b2d2dc');assert.equal(await input.inputValue(),'Venninnenes drømmehotell');assert(await input.evaluate(el=>document.activeElement===el));await input.blur();await p.waitForFunction(()=>document.querySelector('#hotel-name').textContent==='Venninnenes drømmehotell');
await p.locator('[data-install-pwa]').click();assert(!(await p.locator('#pwa-install-dialog').innerText()).includes('Android'));await p.locator('#pwa-install-dialog button').click();
await c2.close();
const departureDeadline=Date.now()+65000;
while(true){const d=await(await c1.request.get(base+'api.php')).json();if(!d.state.players[1].online)break;if(Date.now()>departureDeadline)throw Error('Departed player remained online');await new Promise(r=>setTimeout(r,1000));}
await p.locator('[data-do="ready"]').click();await p.locator('[data-event="b"]').waitFor();

let posts=0;await p.route('**/api.php',async route=>{if(route.request().method()!=='POST')return route.continue();posts++;const response=await p.request.get(base+'api.php');const data=await response.json();data.state.day++;data.state.rev++;data.ok=false;data.error='Hotellet ble oppdatert';await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify(data)})});
await p.locator('[data-event="b"]').click();await p.getByText('Hotellet har gått videre. Se på det nye valget før du trykker igjen.',{exact:true}).waitFor();assert.equal(posts,1);await p.unroute('**/api.php');await p.reload();await p.locator('#team .person').first().waitFor();
await c1.setOffline(true);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Prøver'),null,{timeout:10000});await c1.setOffline(false);await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('tilkoblet'),null,{timeout:10000});
assert.deepEqual(errors,[]);fs.mkdirSync('work/audit',{recursive:true});await p.screenshot({path:'work/audit/iphone-hotel.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await c1.close();console.log('PASS mobile browser: same-page invitation, name draft/focus during remote changes, iPhone-only help, solo after departure, no stale-action retry across day, offline/reconnect, no JS errors');
}catch(e){console.error(e.stack);throw e}finally{await owner('delete-qa');console.log('QA audit hotel removed');if(browser)await browser.close()}})().catch(()=>process.exitCode=1);
