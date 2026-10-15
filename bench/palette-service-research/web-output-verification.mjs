// Native Creator UI diagnostics. Never disables Chromium's sandbox or reads auth storage.
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const evidence = process.argv.includes('--continue') ? JSON.parse(readFileSync('bench/palette-service-research/web-output-verification-evidence.json','utf8')) : { date:new Date().toISOString(), browserSandbox:true, submissions:0, observations:[], network:[], downloads:[] };
evidence.attemptBound=5;
function sanitizedEvidence(value) {
 const observations=value.observations.filter(o=>/^before-submit-|^after-submit-.*-(5|20)s$/.test(o.label??'')||o.error).map(o=>({label:o.label,sidebar:o.sidebar,stage:o.stage,notices:(o.notices??[]).filter(n=>n.text),hit:o.hit,events:o.events,imageMutationCounts:o.imageEvents?{matchingOwnedDimensions:o.imageEvents.filter(n=>n.width===64&&n.height===32&&n.sourceKind==='data').length,otherDetailsOmitted:true}:o.imageMutationCounts,error:o.error}));
 const network=value.network.filter(n=>n.host==='api.pixellab.ai'&&/^\/(quantize-image|background-jobs|creator\/images)/.test(n.path)).map(n=>({...n,path:n.path.replace(/[a-f\d-]{20,}|\d{10,}/gi,'[id]')}));
 return {...value,observations,network};
}
const save = () => writeFileSync('bench/palette-service-research/web-output-verification-evidence.json',JSON.stringify(sanitizedEvidence(evidence),null,2)+'\n');
const cleanUrl = value => { try { const u=new URL(value); return {host:u.hostname,path:u.pathname.replace(/[a-f\d-]{20,}|\d{10,}/gi,'[id]')}; } catch{return{host:'local',path:'opaque'};} };
let context;
try {
 context=await chromium.launchPersistentContext('.tmp/pixellab-browser-profile-sandboxed',{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,chromiumSandbox:true,viewport:{width:1360,height:1000}});
 context.setDefaultTimeout(7000);
 const page=context.pages()[0]??await context.newPage();
 page.on('request',r=>{if(['xhr','fetch'].includes(r.resourceType()))evidence.network.push({event:'request',method:r.method(),...cleanUrl(r.url())});});
 page.on('response',async r=>{if(['xhr','fetch'].includes(r.request().resourceType())){const record={event:'response',status:r.status(),...cleanUrl(r.url())};evidence.network.push(record);if(/quantize-image|background-jobs/.test(new URL(r.url()).pathname)){try{const body=await r.json();record.responseKeys=Object.keys(body);record.metadata=Object.fromEntries(Object.entries(body).filter(([k,v])=>/^(cost|usage|credits|status|state|message|error|generations)$/i.test(k)&&(v===null||['number','boolean','string'].includes(typeof v))).map(([k,v])=>[k,typeof v==='string'?v.slice(0,300):v]));}catch{record.responseMetadata='unavailable';}}}});
 page.on('download',async d=>{const n=evidence.downloads.length;const file='bench/palette-service-research/web-output-verification-download-'+n+'.png';await d.saveAs(file);evidence.downloads.push({file,suggested:d.suggestedFilename()});save();});
 await page.goto('https://www.pixellab.ai/create?tool=reduce_colors');await page.waitForTimeout(3000);
 if(!new URL(page.url()).hostname.endsWith('pixellab.ai')){evidence.authentication='unavailable';save();console.log('AUTH_UNAVAILABLE');await context.close();process.exit(0);}
 const sidebar=page.getByRole('complementary').first();
 await sidebar.getByRole('button',{name:/^Generate ·/}).waitFor();
 await page.evaluate(()=>{
   window.__reducerEvents=[];window.__reducerImageEvents=[];
   for(const type of ['pointerdown','pointerup','click','invalid']) document.addEventListener(type,e=>{const b=e.target.closest?.('button');if(b?.textContent?.includes('Generate')||type==='invalid')window.__reducerEvents.push({type,trusted:e.isTrusted,prevented:e.defaultPrevented,target:b?'Generate':e.target.tagName});},true);
   new MutationObserver(records=>{for(const record of records){const nodes=record.type==='attributes'?[record.target]:[...record.addedNodes].filter(n=>n.nodeType===1).flatMap(n=>[n,...n.querySelectorAll('img,canvas')]);for(const n of nodes){if(!n.matches?.('img,canvas'))continue;const src=n.currentSrc||n.src||'';window.__reducerImageEvents.push({tag:n.tagName,alt:['Preview','reduce colors'].includes(n.alt)?n.alt:'other',width:n.naturalWidth??n.width,height:n.naturalHeight??n.height,sourceKind:src.startsWith('blob:')?'blob':src.startsWith('data:')?'data':src?'remote':'canvas',inSidebar:!!n.closest('aside,[role=complementary]')});}}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','width','height']});
 });
 async function inspect(label){
   const main=page.getByRole('main');
   // Retain only generic working-surface controls; never serialize gallery prompts.
   const stage=await main.locator('button').evaluateAll(ns=>[...new Set(ns.map(n=>n.getAttribute('aria-label')||n.innerText).filter(t=>/^(Gallery|Canvas|Download|Generate|Cancel|Close|Retry|Clear|View|Next|Previous|Processing|Queued)/i.test(t)))].map(t=>t.slice(0,100)));
   const notices=await page.locator('[role=alert],[role=status],[role=dialog]').evaluateAll(ns=>ns.map(n=>({role:n.getAttribute('role'),text:n.innerText.slice(0,700)})));
   const generate=sidebar.getByRole('button',{name:/^Generate ·/});
   const hit=await generate.evaluate(n=>{const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);return{enabled:!n.disabled,rect:{x:r.x,y:r.y,w:r.width,h:r.height},inViewport:x>=0&&y>=0&&x<innerWidth&&y<innerHeight,centerHitsSelf:top===n||n.contains(top),hitTag:top?.tagName,pointerEvents:getComputedStyle(n).pointerEvents};});
   const status=await page.evaluate(()=>({events:window.__reducerEvents,imageEvents:window.__reducerImageEvents,ownedNamedImageCount:[...document.querySelectorAll('img')].filter(n=>n.alt==='reduce colors').length,canvasDimensions:[...document.querySelectorAll('canvas')].map(n=>({w:n.width,h:n.height}))}));
   const observation={label,sidebar:await sidebar.ariaSnapshot(),stage,notices,hit,...status};evidence.observations.push(observation);save();
   console.log(JSON.stringify({label,sidebar:observation.sidebar,stage,notices:notices.filter(n=>n.text),hit,events:status.events}));
 }
 await inspect('initial');
 for await(const line of createInterface({input:process.stdin}))try{
   const c=JSON.parse(line);
   if(c.action==='close'){save();break;}
   if(c.action==='inspect')await inspect(c.label??'inspect');
   if(c.action==='select')await sidebar.getByRole('combobox',{name:c.name,exact:true}).selectOption(c.value);
   if(c.action==='fill')await sidebar.getByRole(c.role??'spinbutton',{name:c.name,exact:true}).fill(c.value);
   if(c.action==='upload')await sidebar.locator('input[type=file]').first().setInputFiles(c.path);
   if(c.action==='click')await page.getByRole(c.role??'button',{name:c.name,exact:true}).nth(c.index??0).click();
   if(c.action==='submit'){
     if(evidence.submissions>=5)throw Error('Five-attempt maximum');
     await inspect('before-submit-'+(evidence.submissions+1));
     const button=sidebar.getByRole('button',{name:/^Generate ·/});await button.scrollIntoViewIfNeeded();await button.screenshot({path:'bench/palette-service-research/web-output-verification-generate-target.png'});
     await button.click();evidence.submissions++;
     for(let i=0;i<4;i++){await page.waitForTimeout(5000);await inspect('after-submit-'+evidence.submissions+'-'+((i+1)*5)+'s');}
   }
   if(c.action==='wait'){await page.waitForTimeout(Math.min(c.ms??10000,30000));await inspect('continued-wait');}
   save();console.log('DONE '+c.action);
 }catch(e){evidence.observations.push({error:e.message.slice(0,350)});save();console.log(JSON.stringify({error:e.message.slice(0,350)}));}
}catch(e){evidence.failure=e.message.split('\n')[0];save();console.log(JSON.stringify({failure:evidence.failure}));}
finally{await context?.close();}
