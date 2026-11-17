const {chromium}=require('playwright');
const {execFileSync}=require('child_process');
const fs=require('fs');
const assert=require('assert');
const base='https://biancanoor.no/hotell/';
const key=execFileSync('security',['find-generic-password','-a','deploy','-s','biancanoor.hotell.owner','-w'],{encoding:'utf8'}).trim();
const hotel='qa-browser-'+Date.now();
async function owner(action,fields={}){const r=await fetch(base+'owner.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action,hotel,...fields})});const d=await r.json();assert(d.ok);return d.result}
(async()=>{let browser;try{
await owner('create',{qa:true,seconds:16});browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.locator('#landing-help').click();
const help=page.frameLocator('#help-dialog iframe');await help.getByRole('heading',{name:'Slik spiller dere',exact:true}).waitFor();
await help.getByText('Hvorfor lønner samarbeid seg?',{exact:true}).click();await help.getByText('Prøv dette når dere er uenige:',{exact:true}).waitFor();
fs.mkdirSync('work/help',{recursive:true});await page.screenshot({path:'work/help/landing-help-390.png'});
assert(await help.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('#close-help').click();assert(!(await page.locator('#help-dialog').evaluate(el=>el.open)));
const invite=await owner('invite',{player:'bianca'});await page.goto('about:blank');await page.goto(invite.url);await page.locator('#landing-help').click();await page.locator('#close-help').click();await page.locator('#activate').click();await page.locator('#team .person').first().waitFor();
await page.locator('#help').click();const privateHelp=page.frameLocator('#dialog iframe');await privateHelp.getByRole('heading',{name:'Slik spiller dere',exact:true}).waitFor();await privateHelp.getByText('Hva er en sesong?',{exact:true}).click();await privateHelp.getByText('En dag som allerede har startet, fortsetter selv om dere åpner hjelpen eller lukker siden.',{exact:true}).waitFor();
await page.screenshot({path:'work/help/game-help-390.png'});await page.locator('.close-dialog').click();assert(!(await page.locator('#dialog').evaluate(el=>el.open)));assert(await page.locator('#help').evaluate(el=>el===document.activeElement));
await page.setViewportSize({width:320,height:700});await page.locator('#help').click();assert(await privateHelp.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.close-dialog').click();
await page.setViewportSize({width:1440,height:900});await page.locator('#help').click();await page.screenshot({path:'work/help/game-help-1440.png'});await page.locator('.close-dialog').click();
assert.deepEqual(errors,[]);await context.close();console.log('PASS help: public/private access, expandable cooperation and season text, invitation survives opening help, close/focus restore, 320/390/1440 layout, no JS errors');
}finally{if(browser)await browser.close();await owner('delete-qa');console.log('Isolated QA hotel removed')}})().catch(e=>{console.error(e.stack);process.exitCode=1});
