import path from 'node:path';
import { createHash } from 'node:crypto';
export const out=import.meta.dirname;
export const seed={family:'full-palette',paletteId:'preset-pico8',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
export const init=()=>{
 globalThis.__countPerf={keys:0,calls:0,aggregateCalls:0,publications:0,mapEntriesCopied:0,cleanupRuns:0,cleanupEntries:0,callbackMs:0,conversions:0};
 globalThis.__health={raf:[],lt:[],usage:0};
 new PerformanceObserver(l=>{for(const e of l.getEntries())__health.lt.push({s:e.startTime,d:e.duration});}).observe({type:'longtask',buffered:true});
 const loop=t=>{__health.raf.push(t);requestAnimationFrame(loop)};requestAnimationFrame(loop);
};
export async function runCase(page,{baseURL,enabled,count=12,gif=false}){
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const cpu=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 await page.addInitScript(init);
 await page.goto(baseURL);await page.bringToFront();
 await page.evaluate(seed=>{localStorage.setItem('colorfetti',JSON.stringify(seed));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1');},seed);
 await page.reload();await page.waitForTimeout(150);
 const phases=[],outputDigests=[];
 async function outputDigest(name){if(gif)return;const pixels=await page.locator('.grid figure .art canvas').evaluateAll(ns=>[ns[0],ns.at(-1)].map(c=>({width:c.width,height:c.height,bytes:[...c.getContext('2d').getImageData(0,0,c.width,c.height).data]})));outputDigests.push({name,digests:pixels.map(p=>({width:p.width,height:p.height,sha256:createHash('sha256').update(Uint8Array.from(p.bytes)).digest('hex')}))});}
 const stats=()=>page.evaluate(()=>({...__countPerf}));
 async function measure(name,run,settle=200){
  const before=await stats(),cpuBefore=await cpu(),start=await page.evaluate(()=>performance.now());
  await run();await page.waitForTimeout(settle);
  const end=await page.evaluate(()=>performance.now()),after=await stats(),cpuAfter=await cpu();
  const health=await page.evaluate(({start,end})=>{const l=__health.lt.filter(e=>e.s>=start&&e.s<=end),r=__health.raf.filter(t=>t>=start&&t<=end),g=r.slice(1).map((t,i)=>t-r[i]).sort((a,b)=>a-b);return{duration:end-start,longtasks:l.length,maxTask:Math.max(0,...l.map(e=>e.d)),rafMax:g.at(-1)||0,rafP95:g[Math.floor(g.length*.95)]||0};},{start,end});
  phases.push({name,stats:Object.fromEntries(Object.keys(before).map(k=>[k,after[k]-before[k]])),cpuMs:Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(cpuAfter[k]-cpuBefore[k])*1000])),heapDelta:cpuAfter.JSHeapUsedSize-cpuBefore.JSHeapUsedSize,health});
 }
 const filename=gif?'count-128.gif':'count-16.png';
 await measure('import',async()=>{await page.locator('input[type=file]').first().setInputFiles(Array.from({length:count},()=>path.join(out,filename)));await page.waitForFunction(n=>document.querySelectorAll('.grid figure .art canvas').length===n,count);if(enabled&&!gif)await page.waitForFunction(n=>[...document.querySelectorAll('.grid figure .dim')].filter(n=>/\d+ colors?\b/.test(n.textContent)).length===n,count);},gif?3500:200);
 await outputDigest('import');
 if(!gif){
  await measure('original return (Space)',async()=>{await page.keyboard.down('Space');await page.waitForTimeout(80);await page.keyboard.up('Space');});
  // Dispatch native change through the existing matching control; no pixel oracle from app modules.
  await measure('matching change',async()=>{await page.getByRole('button',{name:'Palette settings',exact:true}).click();const chip=page.locator('.palette-setting-chip').filter({hasText:'Matching'});if(await chip.count())await chip.first().click();await page.getByRole('button',{name:'RGB matching',exact:true}).click();await page.getByRole('button',{name:'Palette settings',exact:true}).click();});
  await outputDigest('matching');
  await measure('idle',async()=>{},300);
 }else await measure('repeat animation playback',async()=>{},3500);
 return{enabled,count,gif,phases,outputDigests,final:await stats(),labels:await page.locator('.grid figure .dim').allTextContents()};
}
