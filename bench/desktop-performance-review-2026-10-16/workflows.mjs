import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const out=import.meta.dirname;
export const fixtureRoot=path.resolve(out,'../claude-audit-2026-10-15/fixtures');
export const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
export function instrumentation(){
 globalThis.__perf={raf:[],longtasks:[],paints:[],clears:[],timers:0};
 new PerformanceObserver(l=>{for(const e of l.getEntries())__perf.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask'});
 let active=true;function f(t){if(active){__perf.raf.push(t);requestAnimationFrame(f)}}requestAnimationFrame(f);
 const old=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(...args){const t=performance.now();const result=old.apply(this,args);__perf.paints.push({at:performance.now(),ms:performance.now()-t,w:args[0].width,h:args[0].height});return result;};
}
export async function runWorkflows(page,{baseURL='http://127.0.0.1:5336/',kind='small',profile=false,largeSide=1024}={}){
 await page.addInitScript(instrumentation);await page.goto(baseURL);await page.bringToFront();
 await page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},seed);await page.reload();await page.waitForTimeout(300);
 const errors=[];const error=e=>errors.push(e.message);page.on('pageerror',error);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const rows=[];
 async function stage(name,run,{fixed=0,waitPaint=true}={}){
  const a=await metrics(),s=await page.evaluate(()=>({t:performance.now(),paints:__perf.paints.length}));if(profile)await cdp.send('Profiler.enable'),await cdp.send('Profiler.setSamplingInterval',{interval:1000}),await cdp.send('Profiler.start');
  await run();if(waitPaint){if(kind==='small')await page.locator('.grid figure').last().scrollIntoViewIfNeeded();await page.waitForFunction(p=>__perf.paints.length>p,s.paints,{timeout:60000});await page.waitForFunction(()=>{const rows=[...document.querySelectorAll('.grid figure')];return rows.length&&rows.every(n=>/\b\d+ colors?\b/.test(n.querySelector('.dim')?.textContent||''))},null,{timeout:60000});}
  if(fixed)await page.waitForTimeout(fixed);else {await page.waitForFunction(()=>__perf.paints.length&&performance.now()-__perf.paints.at(-1).at>500,null,{timeout:60000});await page.waitForTimeout(50);}
  const b=await metrics();let top=[];if(profile){const {profile:p}=await cdp.send('Profiler.stop'),nodes=new Map(p.nodes.map(n=>[n.id,n]));const totals=new Map();for(let i=0;i<(p.samples?.length||0);i++){const n=nodes.get(p.samples[i]),f=n.callFrame,k=f.functionName+' '+f.url.split('/').at(-1)+':'+f.lineNumber;totals.set(k,(totals.get(k)||0)+(p.timeDeltas?.[i]||0));}top=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([frame,us])=>({frame,ms:us/1000}));}
  const health=await page.evaluate(start=>{const end=performance.now(),r=__perf.raf.filter(x=>x>=start),g=r.slice(1).map((x,i)=>x-r[i]).sort((a,b)=>a-b),lt=__perf.longtasks.filter(x=>x.start>=start),paints=__perf.paints.filter(x=>x.at>=start);return{ms:end-start,longtasks:lt,maxTaskMs:Math.max(0,...lt.map(x=>x.duration)),rafMaxMs:g.at(-1)||0,rafP95Ms:g[Math.floor(g.length*.95)]||0,paints:paints.length,maxCanvasWriteMs:Math.max(0,...paints.map(x=>x.ms))}},s.t);
  rows.push({name,cpuMs:Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(b[k]-a[k])*1000])),heapDelta:b.JSHeapUsedSize-a.JSHeapUsedSize,health,top});
 }
 const inputs=kind==='large'?[path.join(out,`entropy-${largeSide}.png`)]:Array.from({length:kind==='wall'?100:12},()=>path.join(out,'sprite.png'));
 if(kind==='small')inputs.push(path.join(out,'walk.gif'));
 const unique=[...new Set(inputs)],payload=await Promise.all(unique.map(async file=>({name:path.basename(file),mime:file.endsWith('.gif')?'image/gif':'image/png',base64:(await readFile(file)).toString('base64')})));
 // Browser automation serializes File bytes through base64; that can itself stall
 // the phone. Prepare those owned files before measuring the app's import event.
 await page.evaluate(({payload,names})=>{const files=new Map(payload.map(p=>[p.name,new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.mime})]));globalThis.__preparedImports=names.map(n=>files.get(n));},{payload,names:inputs.map(p=>path.basename(p))});
 await stage('import '+kind,async()=>{await page.evaluate(()=>{const dt=new DataTransfer();for(const file of __preparedImports)dt.items.add(file);const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));delete globalThis.__preparedImports});await page.waitForFunction(n=>document.querySelectorAll('.grid figure canvas').length===n,inputs.length)},{fixed:kind==='small'?2200:0});
 const hashes=[];
 const hash=async label=>{const p=await page.locator('.grid figure .art canvas').first().evaluate(c=>({width:c.width,height:c.height,data:[...c.getContext('2d').getImageData(0,0,c.width,c.height).data]}));if(kind==='large'&&(p.width!==largeSide||p.height!==largeSide))throw Error('Large case must render source dimensions');hashes.push({label,width:p.width,height:p.height,sha:createHash('sha256').update(Uint8Array.from(p.data)).digest('hex')});};
 await hash('initial');
 async function control(key){await page.getByRole('button',{name:'Palette settings',exact:true}).click();const chip=page.locator('.palette-setting-chip').filter({hasText:key});if(await chip.count())await chip.first().click();}
 async function close(){await page.getByRole('button',{name:'Palette settings',exact:true}).click()}
 await stage('matching RGB',async()=>{await control('Matching');await page.getByRole('button',{name:'RGB matching',exact:true}).click();await close()},{fixed:kind==='small'?1800:0});await hash('RGB');
 if(kind==='large'){
  await stage('dither 4x4',async()=>{await control('Dithering');await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();await close()});await hash('dither');
  await stage('cap8 and Cleanup',async()=>{await control('Max colors');const n=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await n.fill('8');await n.press('Enter');const chip=page.locator('.palette-setting-chip').filter({hasText:'Cleanup'});if(await chip.count())await chip.first().click();await page.getByRole('button',{name:'Cleanup on',exact:true}).click();await close()});await hash('cap8Cleanup');
 }
 await stage('Original return',async()=>{await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space')},{fixed:kind==='small'?1600:700,waitPaint:false});
 await stage('settled idle',async()=>{},{fixed:kind==='small'?1600:800,waitPaint:false});
 const labels=await page.locator('.grid figure .dim').allTextContents();page.off('pageerror',error);await cdp.detach();
 return{kind,readinessVersion:3,userAgent:await page.evaluate(()=>navigator.userAgent),viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),errors,rows,hashes,labels,notes:['File transport/base64 construction occurs before import timing; measured import starts at assigning prepared DataTransfer files and dispatching the apps change handler. This does not model native picker UI.','Requires each wall output count, which publishes only after exact-source conversion completes (all frames for GIF). Large case needs enough native/display pixels to fit1024square, e.g.desktop1280x1400 or Pixel8Proportrait; timeout rejects sampled runs.','Fixed waits are excluded from interpretation as conversion latency; CDP CPU and Long Tasks report main-thread work. CPU profiler may itself add overhead. ScriptDuration can exclude MessageChannel conversion; use TaskDuration for aggregate renderer CPU. Workers are excluded. Canvas hashes test deterministic rendered output, not full-source exports. No whole-process memory bound follows from JS heap deltas.']};
}
