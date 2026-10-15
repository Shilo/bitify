// Bounded isolated desktop benchmark; does not operate user tabs or any device.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium }=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const temp=new URL('../../../.tmp/palette-completion-kernel-browser/',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
await mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const root=new URL('../../../src/lib/',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Owned desktop kernel timing</title><p>Bounded source-module benchmark, no app or phone claim.</p>');return;}
  if(!/^\/lib\/[a-z0-9-]+\.js$/.test(url.pathname))throw Error('No route');
  res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL(url.pathname.slice(5),root)));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe',headless:true,chromiumSandbox:true});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const result=await page.evaluate(async()=>{
  const {quantizeAsync,preparePalette}=await import('/lib/quantize.js');
  const {getLimitedPalette}=await import('/lib/palette-limit-client.js');
  const {FULL_PRESETS}=await import('/lib/palette-library.js');
  const palette=preparePalette(FULL_PRESETS.find(p=>p.id==='preset-res64').colors);
  let state=0x769c3af;const byte=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state>>>24;};
  const inputs=[['repeated',256],['entropy',512]].map(([kind,side])=>{
   const data=new Uint8ClampedArray(side*side*4);
   for(let p=0;p<side*side;p++)data.set(kind==='repeated'?[40+(p%6)*30,180-(p%6)*20,70+(p%6)*23,[0,64,127,192,255][p%5]]:[byte(),byte(),byte(),[0,64,127,192,255][p%5]],p*4);
   return {kind,width:side,height:side,data};
  });
  const longTasks=[];const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({type:'longtask',buffered:false});
  let running=true,last=performance.now(),rafMax=0;
  const raf=now=>{rafMax=Math.max(rafMax,now-last);last=now;if(running)requestAnimationFrame(raf);};requestAnimationFrame(raf);
  const rows=[];const combinations=[];
  for(const source of inputs)for(const alphaMode of ['cut','keep'])for(const dither of ['none','4x4'])combinations.push({source,alphaMode,dither});
  // Load worker/core and JIT before the reported cohort.
  const warm=inputs[0];await getLimitedPalette({original:warm},palette,128,'oklab',8);await quantizeAsync(warm,palette,128,undefined,undefined,{dither:'4x4'});
  const start=performance.now();
  for(let sample=0;sample<3;sample++)for(const entry of sample%2?[...combinations].reverse():combinations){
   const {source,alphaMode,dither}=entry,item={original:source};
   const t0=performance.now();const selected=await getLimitedPalette(item,palette,alphaMode==='keep'?1:128,'oklab',8);const t1=performance.now();
   let progressAt=t1,maxProgressGap=0;
   const output=await quantizeAsync(source,selected,128,undefined,undefined,{alphaMode,dither,ditherStrength:50,onProgress:()=>{const now=performance.now();maxProgressGap=Math.max(maxProgressGap,now-progressAt);progressAt=now;}});const t2=performance.now();
   if(selected.size>8)throw Error('Cap escaped');
   for(let p=0;p<output.indices.length;p++){
    const alpha=source.data[p*4+3];if((output.indices[p]===256)!==(alpha<(alphaMode==='keep'?1:128)))throw Error('Alpha eligibility changed');
    if(output.indices[p]!==256&&output.indices[p]>=selected.size)throw Error('Membership escaped');
    if(alphaMode==='keep'&&output.alpha[p]!==alpha)throw Error('Source alpha changed');
   }
   rows.push({kind:source.kind,pixels:source.width*source.height,alphaMode,dither,cap:8,sample,selectionMs:t1-t0,conversionMs:t2-t1,maxProgressGapMs:maxProgressGap});
  }
  await new Promise(resolve=>setTimeout(resolve,100));running=false;observer.disconnect();
  return {userAgent:navigator.userAgent,headless:true,sandbox:true,description:'Desktop source-module worker selection and cooperative quantizer; excludes app import/export/layout. Three alternating samples; no phone/FPS/thermal claim.',elapsedMs:performance.now()-start,rafMaxMs:rafMax,longTasks:longTasks.filter(t=>t.start>=start),rows};
 });
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 result.medians=[];
 for(const row of result.rows){if(result.medians.some(r=>r.kind===row.kind&&r.alphaMode===row.alphaMode&&r.dither===row.dither))continue;const same=result.rows.filter(r=>r.kind===row.kind&&r.alphaMode===row.alphaMode&&r.dither===row.dither);result.medians.push({kind:row.kind,pixels:row.pixels,alphaMode:row.alphaMode,dither:row.dither,cap:8,selectionMs:median(same.map(r=>r.selectionMs)),conversionMs:median(same.map(r=>r.conversionMs)),maxProgressGapMs:Math.max(...same.map(r=>r.maxProgressGapMs))});}
 await writeFile(new URL('desktop-performance.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({elapsedMs:result.elapsedMs,longTasks:result.longTasks,rafMaxMs:result.rafMaxMs,medians:result.medians},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
