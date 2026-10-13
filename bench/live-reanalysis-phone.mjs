// Physical Android only. Start live-reanalysis-qa-server, adb forward 9333,
// adb reverse 5286. Uses owned foreground tabs and real browser key events.
// No desktop browser, source transforms, device downloads or browser.close().
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const adb='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0];
const before=context.pages().length, manifest=await (await fetch('http://127.0.0.1:5286/manifest')).json();
const result={id:`phone-native-${Date.now()}`,before,manifest,userAgent:null,cases:{}};
const walls={realWall:[...Array.from({length:16},(_,i)=>`a${String(i+1).padStart(3,'0')}.gif`),'dungeon.gif',...Array.from({length:6},(_,i)=>`building${i+1}.png`)],photos12:Array.from({length:12},(_,i)=>`noise1024-${i}.png`),fourOf4MP:Array.from({length:4},(_,i)=>`noise2048-${i}.png`)};
let page,code=0;
const wake=()=>execFileSync(adb,['shell','input','keyevent','KEYCODE_WAKEUP']);
const keepAwake=setInterval(wake,5000);
try{
 for(const [name,names]of Object.entries(walls)){
  const pair=result.cases[name]={};
  for(const build of ['base','candidate']){
   const url=`http://127.0.0.1:5286/${build}/?native=${result.id}-${name}`;
   if(!page){wake();execFileSync(adb,['shell','am','start','-a','android.intent.action.VIEW','-d',url]);for(let attempt=0;attempt<50&&!page;attempt++){await new Promise(r=>setTimeout(r,100));page=context.pages().find(p=>p.url()===url);}if(!page)throw Error('Owned native test tab missing');}
   else await page.goto(url);
   await page.bringToFront();
   await page.locator('input[type=file][multiple]').waitFor({state:'attached'});
   // Local fixture fetch avoids transporting large base64 file payloads over CDP.
   await page.evaluate(async names=>{const transfer=new DataTransfer();for(const name of names){const match=name.match(/^noise(1024|2048)-(\d+)\.png$/);const response=await fetch(match?`/noise/${match[1]}/${match[2]}.png`:`/fixtures/${name}`);if(!response.ok)throw Error('Missing fixture');transfer.items.add(new File([await response.blob()],name,{type:name.endsWith('.gif')?'image/gif':'image/png'}));}const input=document.querySelector('input[type=file][multiple]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));},names);
   await page.waitForFunction(n=>document.querySelectorAll('.grid .tile canvas').length===n,names.length,{timeout:120000});
   await page.waitForTimeout(800);
   result.userAgent??=await page.evaluate(()=>navigator.userAgent);
   const rows=pair[build]=[];
   for(let i=0;i<6;i++){
    await page.waitForTimeout(400);
    await page.evaluate(async()=>{const q=window.__reanalysisQA;const at=await new Promise(requestAnimationFrame);q.observer?.takeRecords();q.long.length=0;q.lastRaf=at;q.rafGapMax=0;q.start=performance.now();});
    const time=Date.now();await page.keyboard.press(i%2?'ArrowUp':'ArrowDown');
    await page.waitForTimeout(60);
    await page.waitForFunction(style=>JSON.parse(localStorage.getItem('colorfetti')).style===style&&![...document.querySelectorAll('.glass-toast.is-visible')].some(n=>n.textContent.includes('Updating images')),i%2?'cutout':'solid');
    await page.waitForTimeout(80);
    const row=await page.evaluate(()=>{const q=window.__reanalysisQA,end=performance.now();q.long.push(...(q.observer?.takeRecords()??[]).map(e=>({start:e.startTime,duration:e.duration})));const tasks=q.long.filter(t=>t.start+t.duration>q.start&&t.start<end);return{style:JSON.parse(localStorage.getItem('colorfetti')).style,settleMs:end-q.start,longestTaskMs:Math.max(0,...tasks.map(t=>t.duration)),tasksOver50:tasks.length,rafGapMaxMs:q.rafGapMax,tasks,errors:q.errors};});
    if(row.errors.length)throw Error(JSON.stringify(row.errors));
    row.driverMs=Date.now()-time;rows.push(row);
    console.log(name,build,row.style,'longest',Math.round(row.longestTaskMs),'rafGap',Math.round(row.rafGapMaxMs));
   }
  }
 }
 if(JSON.stringify(manifest)!==JSON.stringify(await(await fetch('http://127.0.0.1:5286/manifest')).json()))throw Error('Build changed');
 result.status='pass';
 await mkdir('.tmp/reanalysis/phone',{recursive:true});
 await page.screenshot({path:'.tmp/reanalysis/phone/native.png'});
}catch(error){result.status='fail';result.error=error.stack;console.error(error);code=1;}
finally{clearInterval(keepAwake);if(page)await page.close();result.after=context.pages().length;await writeFile('.tmp/reanalysis/phone/native.json',JSON.stringify(result,null,2));console.log('Owned tab closed; page count',before,'→',result.after);process.exit(code);}
