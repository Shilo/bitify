// Physical USB Android / Brave. Owns only its new tabs and unique test downloads.
// App runs on5335; baseline is served from the frozen pre-task9 dist on5336.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve,decode,usedColors,fx,sha} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const followup=process.argv.includes('--follow-up');
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8'}),out=import.meta.dirname,tag='cfusability'+Date.now().toString(36);
await mkdir(out,{recursive:true});await mkdir(path.join(out,'android'),{recursive:true});
const report={date:new Date().toISOString(),tag,device:'USB Pixel 8 Pro / Brave155',serial,distSha:sha(await readFile('dist/index.html')),notes:['Physical Android renderer with per-tab CDP viewport/orientation overrides; OS rotation preferences unchanged.','Native downloads decoded with independent Sharp; test-only origin storage restored.'],checks:[],performance:[],errors:[]};
report.notes.push('Landscape checks verify DOM geometry and trusted touch dispatch in the physical Android renderer. Android compositor screenshots crop/repeat the virtual wide surface: they do not establish visual landscape or actual OS rotation acceptance. See android/landscape-probe.json and desktop landscape captures.');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0],owned=[],backups=new Map(),files=[];
// CDP-attached Android default contexts don't advertise hasTouch to Playwright.
// Route locator.tap through actual trusted CDP touch input in this harness only.
const sessions=new WeakMap();
const locatorPrototype=Object.getPrototypeOf(context.pages()[0].locator('html'));
locatorPrototype.tap=async function(){
 await this.waitFor({state:'visible'});await this.scrollIntoViewIfNeeded();const r=await this.boundingBox();
 const p=this.page();let s=sessions.get(p);if(!s){s=await context.newCDPSession(p);sessions.set(p,s);}
 await touch(s,'touchStart',r.x+r.width/2,r.y+r.height/2);await touch(s,'touchEnd');
};
const browserCDP=await browser.newBrowserCDPSession();await browserCDP.send('Browser.setDownloadBehavior',{behavior:'default'});
adb('reverse','tcp:5335','tcp:5335');adb('reverse','tcp:5336','tcp:5336');
const baseline=await serve(5336,path.resolve('.tmp/palette-settings-compact/before-dist'));
const base={family:'full-palette',paletteId:'preset-pico8',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,lastMaxColors:16,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
const instrument=()=>{
  window.__health={raf:[],lt:[],usage:0};
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())__health.lt.push({s:e.startTime,d:e.duration});}).observe({type:'longtask',buffered:true});}catch{}
  const loop=t=>{__health.raf.push(t);requestAnimationFrame(loop);};requestAnimationFrame(loop);
};
async function start(version='after'){
 const page=await context.newPage();owned.push(page);page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
 const url=version==='after'?'http://localhost:5335/':'http://localhost:5336/colorfetti/';
 await page.goto(url);await page.bringToFront();
 const origin=new URL(url).origin;if(!backups.has(origin))backups.set(origin,{page,values:await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))});
 await page.evaluate(seed=>{localStorage.setItem('colorfetti',JSON.stringify(seed));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1');},base);
 await page.addInitScript(instrument);await page.reload();await page.waitForTimeout(150);
 if(await page.getByRole('button',{name:'Got it',exact:true}).count())await page.getByRole('button',{name:'Got it',exact:true}).tap();
 const cdp=await context.newCDPSession(page);return{page,cdp,version};
}
const add=(page,files)=>page.locator('input[type=file]').first().setInputFiles(files);
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti')));
const settings=async page=>{if(!await page.locator('.palette-settings-panel').count())await page.getByRole('button',{name:'Palette settings',exact:true}).tap();};
async function select(page,name){const c=page.locator('.palette-setting-chip').filter({hasText:name}).first();if(await c.count())await c.tap();}
async function check(name,run){try{const detail=await run();report.checks.push({name,pass:true,...detail});console.log('PASS',name,JSON.stringify(detail));}catch(e){report.checks.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message.split('\n')[0]);}}
async function viewport(cdp,width,height){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2.25,mobile:true,screenOrientation:{type:width>height?'landscapePrimary':'portraitPrimary',angle:width>height?90:0}});await new Promise(r=>setTimeout(r,120));}
async function touch(cdp,type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x,y,radiusX:1,radiusY:1,force:1}]});}
async function draft(page){const e=page.locator('dialog.palette-import-modal');await e.waitFor();const colors=[];for(;;){colors.push(...await e.locator('.palette-review-swatch').evaluateAll(ns=>ns.map(n=>(n.getAttribute('aria-label')||'').split(' ').at(-1).toLowerCase()).filter(c=>/^#[\da-f]{6}$/.test(c))));const next=e.getByRole('button',{name:'Next',exact:true});if(!await next.count()||!await next.isEnabled())break;await next.tap();}return[...new Set(colors)].sort();}
async function saveNative(page,name){
 await page.getByRole('button',{name:`Image actions for ${name}`,exact:true}).tap();await page.locator('dialog.sheet').getByRole('button',{name:'Save',exact:true}).tap();
 const filename=name.replace(/\.(png|gif)$/,'-palette.$1'),remote='/sdcard/Download/'+filename,local=path.join(out,'android',filename);files.push(remote);
 for(let i=0;i<60;i++){try{const size=adb('shell','stat','-c','%s',remote).trim();if(+size>0){await new Promise(r=>setTimeout(r,350));adb('pull',remote,local);return readFile(local);}}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Native download missing '+filename);
}
async function health(page,t0,t1){return page.evaluate(({t0,t1})=>{const a=__health,lt=a.lt.filter(e=>e.s+e.d>=t0&&e.s<=t1),r=a.raf.filter(t=>t>=t0&&t<=t1),g=r.slice(1).map((t,i)=>t-r[i]).sort((a,b)=>a-b);return{duration:t1-t0,longtasks:lt.length,maxTask:Math.max(0,...lt.map(x=>x.d)),rafMax:g.at(-1)||0,rafP95:g[Math.floor(g.length*.95)]||0};},{t0,t1});}
try{
 report.userAgent=await(await start()).page.evaluate(()=>navigator.userAgent);
 if(!followup){
 const {page,cdp}=await start();await add(page,fx('alpha-sprite.png'));await settings(page);
 await check('compact portrait and landscape keep all controls accessible with44px targets',async()=>{
  const states=[];for(const [w,h]of[[448,819],[947,364],[390,844],[844,390]]){await viewport(cdp,w,h);for(const name of['Max colors','Matching','Cleanup','Dithering','Opacity','Opacity cut']){await select(page,name);const g=await page.evaluate(()=>{const p=document.querySelector('.palette-settings-panel'),r=p.getBoundingClientRect(),rows=[...p.querySelectorAll('.palette-setting-row')];return{compact:p.classList.contains('compact'),height:r.height,rows:rows.length,overflow:rows.some(n=>{const x=n.getBoundingClientRect();return x.left<r.left-1||x.right>r.right+1;}),targets:[...p.querySelectorAll('.palette-setting-chip,.palette-active-control button,.palette-active-control input[type=range]')].map(n=>n.getBoundingClientRect()).every(x=>x.height>=44&&x.width>=44)};});assert(g.compact&&g.rows===1&&!g.overflow&&g.targets);states.push({w,h,name,...g});}await page.screenshot({path:path.join(out,'android',`compact-${w}x${h}.png`)});}return{states};
 });
 await check('native touch range commits, conditional strength and Keep/Cut work, Reset focuses safe chip',async()=>{
  await viewport(cdp,448,819);await select(page,'Max colors');const range=await page.locator('#full-max-colors').boundingBox();await touch(cdp,'touchStart',range.x+range.width*.5,range.y+22);await touch(cdp,'touchMove',range.x+range.width*.3,range.y+22);await touch(cdp,'touchEnd');await page.waitForTimeout(300);const cap=(await stored(page)).maxColors;assert(cap>=2&&cap<16);
  await select(page,'Dithering');await page.getByRole('button',{name:'Dithering 4x4',exact:true}).tap();await select(page,'Dither strength');assert.equal(await page.locator('#full-dither-amount').count(),1);
  await page.evaluate(()=>{const n=document.querySelector('#full-dither-amount');n.value='90';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.palette-setting-chip[aria-label^="Matching:"]').click();});await page.waitForTimeout(300);assert.equal((await stored(page)).ditherStrength,50);
  await select(page,'Opacity');await page.getByRole('button',{name:'Keep',exact:true}).tap();assert.equal(await page.locator('.palette-setting-chip').filter({hasText:'Opacity cut'}).count(),0);await page.getByRole('button',{name:'Cut',exact:true}).tap();assert.equal(await page.locator('.palette-setting-chip').filter({hasText:'Opacity cut'}).count(),1);
  await select(page,'Dither strength');await page.getByRole('button',{name:'Reset palette settings',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Max colors: All');return{nativeTouchCap:cap,canceledStrength:50,conditionalResetFocus:'Max colors: All'};
 });
 await page.getByRole('button',{name:'Palette settings',exact:true}).tap();
 await check('single-action phone reuse equals native PNG Save and opens unsaved draft',async()=>{
  const name=tag+'-sprite.png';await add(page,{name,mimeType:'image/png',buffer:await readFile(fx('alpha-sprite.png'))});await page.waitForTimeout(250);const bytes=await saveNative(page,name),expected=usedColors((await decode(bytes)).frames);await page.getByRole('button',{name:`Image actions for ${name}`,exact:true}).tap();const library=await page.evaluate(()=>localStorage.getItem('colorfetti-palettes-v1'));await page.getByRole('button',{name:'Reuse colors',exact:true}).tap();assert.deepEqual(await draft(page),expected);assert.equal(await page.evaluate(()=>localStorage.getItem('colorfetti-palettes-v1')),library);await page.screenshot({path:path.join(out,'android','reuse-png-draft.png')});await page.getByRole('button',{name:'Close palette editor',exact:true}).tap();return{count:expected.length,bytes:bytes.length,sha:sha(bytes)};
 });
 await check('whole-animation reuse equals native GIF Save union',async()=>{
  const name=tag+'-walk.gif';await add(page,{name,mimeType:'image/gif',buffer:await readFile(fx('walk.gif'))});await page.waitForTimeout(700);const bytes=await saveNative(page,name),d=await decode(bytes),expected=usedColors(d.frames);await page.getByRole('button',{name:`Image actions for ${name}`,exact:true}).tap();await page.getByRole('button',{name:'Reuse colors',exact:true}).tap();assert.deepEqual(await draft(page),expected);await page.getByRole('button',{name:'Close palette editor',exact:true}).tap();return{frames:d.frames.length,count:expected.length,bytes:bytes.length,sha:sha(bytes)};
 });
 await check('touch selection dragged outside keeps palette draft; actual backdrop tap closes',async()=>{
  await page.getByRole('button',{name:'Palette',exact:true}).last().tap();await page.getByRole('button',{name:'Import palette',exact:true}).tap();const n=page.getByRole('textbox',{name:'Name',exact:true}),r=await n.boundingBox();await touch(cdp,'touchStart',r.x+20,r.y+r.height/2);await touch(cdp,'touchMove',4,4);await touch(cdp,'touchEnd');assert.equal(await page.locator('dialog.palette-import-modal').count(),1);await touch(cdp,'touchStart',4,4);await touch(cdp,'touchEnd');await page.locator('dialog.palette-import-modal').waitFor({state:'detached'});return{selectionPreserved:true,backdropDismissed:true};
 });
 await check('internal URL drag does not activate artwork drop overlay',async()=>{
  await page.evaluate(()=>{const d=new DataTransfer();d.setData('text/plain','https://example.com/owned.png');document.body.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:d}));document.body.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:d}));document.body.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:d}));});assert.equal(await page.getByText('Drop to Colorfetti',{exact:true}).count(),0);return{overlay:false,syntheticPayload:true};
 });
 await check('large sampled wall starts no full-source usage import; opening Preview does',async()=>{
  const a=await start();let requests=0;a.page.on('request',r=>{if(/\/palette-usage-[^/]+\.js/.test(r.url()))requests++;});await add(a.page,path.join(out,'large-owned.png'));await a.page.getByRole('button',{name:'Preview large-owned.png',exact:true}).first().waitFor();await a.page.waitForTimeout(600);assert.equal(requests,0);await a.page.locator('button.caption-preview').first().tap();await a.page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>/\/palette-usage-[^/]+\.js/.test(e.name)));await a.page.getByRole('button',{name:'Close preview',exact:true}).tap();return{wallUsageImports:0,previewUsageImports:requests};
 });
 for(const version of['before','after'])for(let trial=0;trial<3;trial++){
  const a=await start(version),{page:p,cdp:s}=a;await viewport(s,448,819);const t0=await p.evaluate(()=>performance.now());const payload=await readFile(fx('alpha-sprite.png'));await add(p,Array.from({length:12},(_,i)=>({name:`${tag}-wall-${i}.png`,mimeType:'image/png',buffer:payload})));await p.locator('.grid figure').nth(11).waitFor();await p.waitForTimeout(900);const t1=await p.evaluate(()=>performance.now());const imports=await health(p,t0,t1);await settings(p);await select(p,'Matching');const c0=await p.evaluate(()=>performance.now());await p.getByRole('button',{name:'RGB matching',exact:true}).tap();await p.waitForTimeout(900);const c1=await p.evaluate(()=>performance.now());report.performance.push({version,trial,wallImages:12,import:imports,control:await health(p,c0,c1)});await p.close();
 }
 }
 if(followup){
 await check('new mulfok32 preset native Save uses only canonical target colors',async()=>{
  const {page,cdp}=await start();await viewport(cdp,448,819);const name=tag+'-mulfok.png';await add(page,{name,mimeType:'image/png',buffer:await readFile(fx('alpha-sprite.png'))});await page.getByRole('button',{name:'Palette',exact:true}).last().tap();await page.getByRole('button',{name:'mulfok32',exact:true}).tap();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('colorfetti')).paletteId==='preset-mulfok32');await page.getByRole('button',{name:'Palette',exact:true}).last().tap();
  assert.equal((await stored(page)).paletteId,'preset-mulfok32');const bytes=await saveNative(page,name),used=usedColors((await decode(bytes)).frames),evidence=JSON.parse(await readFile('bench/palette-curation-2026-10-16/public-evidence.json','utf8')),target=evidence.list.palettes.find(p=>p.slug==='mulfok32').colors.map(c=>'#'+c);assert(used.length>0&&used.every(c=>target.includes(c)));await page.screenshot({path:path.join(out,'android','mulfok32-native-output.png')});return{used:used.length,canonicalMembership:true,bytes:bytes.length,sha:sha(bytes)};
 });
 await check('live scheme-less Lospec link imports with concise hint and linked palette name only',async()=>{
  const {page,cdp}=await start();await viewport(cdp,448,819);await page.getByRole('button',{name:'Palette',exact:true}).last().tap();await page.getByRole('button',{name:'Import palette',exact:true}).tap();await page.getByRole('button',{name:'Paste colors',exact:true}).tap();assert.equal(await page.locator('.palette-link-hint').textContent(),'Paste HEX colors or a Lospec palette link.');await page.getByRole('textbox',{name:'Colors or Lospec link',exact:true}).fill('lospec.com/palette-list/mulfok32');await page.getByRole('button',{name:'Import from Lospec',exact:true}).tap();await page.locator('.palette-review-swatch').nth(31).waitFor();const link=page.locator('.palette-source-credit');assert.equal(await link.textContent(),'mulfok32');assert.equal(await link.getAttribute('href'),'https://lospec.com/palette-list/mulfok32');assert.equal(await page.locator('.palette-review-swatch').count(),32);await page.screenshot({path:path.join(out,'android','lospec-source-name.png')});return{colors:32,sourceLabel:'mulfok32',schemeLess:true,livePublicRequest:true};
 });
 }
 assert.equal(report.errors.length,0,'No runtime errors');
}catch(error){report.errors.push(error.stack);process.exitCode=1;}finally{
 for(const{page:original,values}of backups.values()){let p=original;if(p.isClosed()){p=await context.newPage();owned.push(p);await p.goto(original.url());}await p.evaluate(values=>{localStorage.clear();for(const[k,v]of Object.entries(values))localStorage.setItem(k,v);},values).catch(()=>{});}
 for(const p of owned)if(!p.isClosed()){const s=await context.newCDPSession(p);await s.send('Emulation.clearDeviceMetricsOverride').catch(()=>{});await p.close();}
 for(const remote of files)adb('shell','rm',remote);
 adb('reverse','--remove','tcp:5336');
 await new Promise(r=>baseline.close(r));report.pass=report.checks.length>=(followup?2:7)&&report.checks.every(c=>c.pass)&&report.errors.length===0;await writeFile(path.join(out,followup?'android-followup-results.json':'android-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PHONE_REPORT',JSON.stringify({pass:report.pass,checks:report.checks.map(c=>({name:c.name,pass:c.pass})),performance:report.performance,errors:report.errors}));
}
// Disconnect this Node harness without issuing Browser.close to the phone.
process.exit(report.pass?0:1);
