const {chromium}=require('playwright');
const assert=require('assert');
const fs=require('fs');
const {execFileSync}=require('child_process');
const urls=['https://biancanoor.no/','https://biancanoor.no/hotell/','https://biancanoor.no/kafe/','https://remimarents.github.io/Bianca/Gjettespill/','https://remimarents.github.io/Bianca/Tetris/','https://remimarents.github.io/Bianca/Bilbingo/'];
const key=execFileSync('security',['find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],{encoding:'utf8'}).trim();
const hotel='qa-pwa-'+Date.now();
async function owner(action,fields={}){const r=await fetch(urls[1]+'owner.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action,hotel,...fields})});const d=await r.json();assert(d.ok);return d.result;}
(async()=>{let browser,created=false;try{
browser=await chromium.launchPersistentContext('work/pwa-profile-'+Date.now(),{headless:true,channel:'chrome',viewport:{width:390,height:844}});fs.mkdirSync('work/pwa-qa',{recursive:true});
for(let i=0;i<urls.length;i++){
 const c=browser;const p=await c.newPage();p.setDefaultTimeout(20000);
 await p.goto(urls[i],{waitUntil:'domcontentloaded'});
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const manifest=await p.evaluate(async()=>{const url=document.querySelector('link[rel=manifest]').href;return {url,data:await(await fetch(url)).json()}});
 assert.equal(new URL(manifest.data.start_url,manifest.url).href,urls[i]);assert.equal(manifest.data.display,'standalone');
 for(const icon of manifest.data.icons){assert(await p.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();return img.naturalWidth===img.naturalHeight&&[192,512].includes(img.naturalWidth)},new URL(icon.src,manifest.url).href));}
 const client=await c.newCDPSession(p);const errors=await client.send('Page.getInstallabilityErrors');assert.deepEqual(errors.installabilityErrors,[],JSON.stringify(errors));
 assert.equal(await p.locator('[data-install-pwa]').count(),0);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+urls[i]);await p.screenshot({path:`work/pwa-qa/${i}-page.png`});
 assert.deepEqual(await p.evaluate(()=>caches.keys()),[]);
 await c.setOffline(true);await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('heading',{level:1}).waitFor();assert((await p.locator('body').innerText()).includes('Du er uten nett akkurat nå'));
 await c.setOffline(false);await p.getByRole('link',{name:'Prøv igjen'}).click();await p.locator('main').waitFor();
 console.log('PASS manifest, icons, installability, no install buttons, mobile layout, offline/reconnect:',urls[i]);await p.close();
}
await owner('create',{qa:true,seconds:16});created=true;const invite=await owner('invite',{player:'bianca'});const c=browser;const p=await c.newPage();await p.goto(invite.url);await p.locator('#activate').click();await p.locator('#team .person').first().waitFor();await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.locator('#team .person').first().waitFor();assert.equal(await p.evaluate(async()=> (await fetch('api.php')).status),200);assert.deepEqual(await p.evaluate(()=>caches.keys()),[]);await p.screenshot({path:'work/pwa-qa/private-hotel.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.close();console.log('PASS hotel invitation, persistent auth with worker, private page and no cached state');
}catch(e){console.error("CHECK FAILED:",e.stack);throw e}finally{if(created){await owner('delete-qa');console.log('QA hotel removed')}if(browser)await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
