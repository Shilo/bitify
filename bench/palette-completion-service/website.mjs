// Native, sandboxed UI only. Reuses the user's previously authorized owned profile.
// Never reads cookies/storage, frontend source, private gallery text or credentials.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
const { chromium }=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dir=import.meta.dirname;
fs.mkdirSync(`${dir}/website`,{recursive:true});
const evidence=process.argv.includes('--continue')?JSON.parse(fs.readFileSync(`${dir}/website-evidence.json`,'utf8')):{at:new Date().toISOString(),browserSandbox:true,headless:true,submissions:0,maxSubmissions:5,observations:[],network:[],downloads:[]};
const save=()=>fs.writeFileSync(`${dir}/website-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
let context;
try{
 context=await chromium.launchPersistentContext('.tmp/pixellab-browser-profile-sandboxed',{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true,viewport:{width:1360,height:1000}});
 context.setDefaultTimeout(10000);
 const page=await context.newPage();
 page.on('framenavigated',frame=>{if(frame===page.mainFrame()){const u=new URL(frame.url());evidence.observations.push({navigation:{host:u.hostname,path:u.pathname}});save();}});
 page.on('response',r=>{try{const u=new URL(r.url());if(u.hostname==='api.pixellab.ai'&&/^\/(quantize-image|background-jobs)/.test(u.pathname))evidence.network.push({status:r.status(),method:r.request().method(),path:u.pathname.replace(/[a-f\d-]{20,}|\d{10,}/gi,'[id]')});}catch{}});
 await page.goto('https://www.pixellab.ai/create?tool=reduce_colors',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(5000);
 const sidebar=page.getByRole('complementary').first();
 const available=await sidebar.getByRole('button',{name:/^Generate ·/}).isVisible().catch(()=>false);
 if(!available){evidence.authentication='unavailable';evidence.location={host:new URL(page.url()).hostname,path:new URL(page.url()).pathname};save();console.log('AUTH_UNAVAILABLE');}
 else{
  evidence.authentication='available';
  async function inspect(label){const u=new URL(page.url());const observation={label,location:{host:u.hostname,path:u.pathname},sidebar:await sidebar.ariaSnapshot().catch(()=>'(no reducer sidebar)'),dialogs:await page.getByRole('dialog').allTextContents(),workingActions:await page.getByRole('main').getByRole('button').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label')||n.innerText).filter(t=>/^(Download|Gallery view|Generate|Cancel|Close|Processing)/i.test(t)).map(t=>t.slice(0,100)))};evidence.observations.push(observation);save();console.log(JSON.stringify(observation));}
  await inspect('initial');
  for await(const line of createInterface({input:process.stdin}))try{
   const c=JSON.parse(line);
   if(c.action==='close')break;
   if(c.action==='inspect')await inspect(c.label??'inspect');
   if(c.action==='select')await sidebar.getByRole('combobox',{name:c.name,exact:true}).selectOption(c.value);
   if(c.action==='fill')await page.getByRole(c.role??'textbox',{name:c.name,exact:true}).fill(c.value);
   if(c.action==='upload')await page.locator(c.selector??'aside input[type=file]').nth(c.index??0).setInputFiles(c.paths);
   if(c.action==='click')await page.getByRole(c.role??'button',{name:c.name,exact:true}).nth(c.index??0).click();
   if(c.action==='submit'){if(evidence.submissions>=5)throw Error('Attempt bound');await inspect('before-submit');await sidebar.getByRole('button',{name:/^Generate ·/}).click();evidence.submissions++;await page.waitForTimeout(7000);await inspect('after-submit');}
   if(c.action==='wait'){await page.waitForTimeout(Math.min(c.ms??10000,30000));await inspect('wait');}
   if(c.action==='download'){if(!/^web-w[1-4](?:-[01]|-sheet)?\.png$/.test(c.file))throw Error('Owned output filename required');const downloadPromise=page.waitForEvent('download');downloadPromise.catch(()=>{});await page.getByRole('button',{name:'Download image',exact:true}).nth(c.index??0).click();const download=await downloadPromise;await download.saveAs(`${dir}/website/${c.file}`);evidence.downloads.push({file:`website/${c.file}`,suggested:download.suggestedFilename()});}
   save();console.log('DONE '+c.action);
  }catch(e){evidence.observations.push({error:e.message.split('\n')[0]});save();console.log(JSON.stringify({error:e.message.split('\n')[0]}));}
 }
}catch(e){evidence.failure=e.message.split('\n')[0];save();console.log(JSON.stringify({failure:evidence.failure}));}
finally{await context?.close();save();}
