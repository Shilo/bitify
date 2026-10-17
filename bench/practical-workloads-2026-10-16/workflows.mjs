import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decode,nearest,compare,contract,usedColors,sha} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {preparePalette,quantize,colorize} from '../../src/lib/quantize.js';
import {getLimitedPalette} from '../../src/lib/palette-limit-client.js';
import {prepareCleanupAsync,applyCleanup} from '../../src/lib/palette-cleanup.js';
import {unzipSync} from 'fflate';
export const root=import.meta.dirname;
export const palette=FULL_PRESETS.find(p=>p.id==='preset-res64').colors;
export const seed={family:'full-palette',paletteId:'preset-res64',alphaCut:128,alphaMode:'cut',metric:'oklab',maxColors:0,lastMaxColors:16,cleanup:false,dither:'none',ditherStrength:50,theme:'dark'};
export function instrumentation(){
 if(globalThis.__practical)return;
 globalThis.__practical={raf:[],longtasks:[],writes:0};
 new PerformanceObserver(l=>{for(const e of l.getEntries())__practical.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask'});
 function f(t){__practical.raf.push(t);requestAnimationFrame(f)}requestAnimationFrame(f);
 const old=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(...args){const result=old.apply(this,args);if(this.canvas.closest('.grid,.image-viewer')){this.canvas.__paintAt=performance.now();this.canvas.__paintCount=(this.canvas.__paintCount||0)+1;__practical.writes++;}return result};
}
export const cohortCases=[{kind:'batch',ids:['dungeon-wizard','dungeon-archer','dungeon-knight','dungeon-potion','town-water-bucket','platformer-pilot','platformer-rocket','platformer-heart','real-magic']},{kind:'sheet1024',ids:['kenney-sheet-1024']},{kind:'animation128',ids:['kenney-motion-128']},{kind:'sheet2048',ids:['kenney-sheet-2048']},{kind:'animation256',ids:['kenney-motion-256']}];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export async function runCase(page,{baseURL='http://127.0.0.1:5341/',kind,save,destination=path.join(root,'desktop')}={}){
 const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')),selected=cohortCases.find(c=>c.kind===kind);assert(selected);
 const records=selected.ids.map(id=>manifest.records.find(r=>r.id===id)),out=path.join(destination,kind);await mkdir(out,{recursive:true});
 const errors=[];const onerror=e=>errors.push(e.stack);page.on('pageerror',onerror);await page.addInitScript(instrumentation);
 await page.goto(baseURL);await page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},seed);await page.reload();await page.bringToFront();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const rows=[];let finalPaintMarker;
 async function stage(name,run,{paint=false,observe=0}={}){const a=await metrics(),start=await page.evaluate(()=>performance.now());await run(start);if(paint)await page.waitForFunction(t=>{const fs=[...document.querySelectorAll('.grid figure')];return fs.length&&fs.every(f=>{const c=f.querySelector('.art canvas');return c&&c.__paintAt>=t})},start,{timeout:120000});if(observe)await delay(observe);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await metrics();const health=await page.evaluate(s=>{const r=__practical.raf.filter(t=>t>=s),g=r.slice(1).map((t,i)=>t-r[i]).sort((a,b)=>a-b),lt=__practical.longtasks.filter(t=>t.start>=s);return{elapsedMs:performance.now()-s,longtasks:lt,maxTaskMs:Math.max(0,...lt.map(x=>x.duration)),rafP95Ms:g[Math.floor(g.length*.95)]||0,rafMaxMs:g.at(-1)||0,writes:__practical.writes}},start);rows.push({name,cpuMs:Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(b[k]-a[k])*1000])),heapDelta:b.JSHeapUsedSize-a.JSHeapUsedSize,...health});}
 const payload=await Promise.all(records.map(async r=>({name:path.basename(r.file),mime:r.frames>1?'image/gif':'image/png',base64:(await readFile(path.join(root,r.file))).toString('base64')})));
 // Transport and allocation are deliberately outside the app event timing.
 await page.evaluate(ps=>{globalThis.__imports=ps.map(p=>new File([Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))],p.name,{type:p.mime}))},payload);
 await stage('import to sampled wall first complete paint',async()=>{await page.evaluate(()=>{const dt=new DataTransfer();for(const f of __imports)dt.items.add(f);const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));delete globalThis.__imports});await page.waitForFunction(n=>document.querySelectorAll('.grid figure').length===n,records.length)},{paint:true});
 const wall=await page.locator('.grid figure').evaluateAll(fs=>fs.map(f=>{const c=f.querySelector('.art canvas');return{caption:f.querySelector('.dim')?.textContent,width:c.width,height:c.height,paints:c.__paintCount}}));
 const exports=[];
 async function verify(bytes,label,{enhanced=false}={}){
  const zipped=records.length>1;const entries=zipped?unzipSync(bytes):{[path.basename(records[0].file)]:bytes};assert.equal(Object.keys(entries).length,records.length);
  for(let i=0;i<records.length;i++){
   const r=records[i],entry=zipped?Object.entries(entries).find(([name])=>name.startsWith(r.id+'-palette.')):Object.entries(entries)[0];assert(entry,`${r.id} missing`);const actual=await decode(Buffer.from(entry[1])),src=await decode(await readFile(path.join(root,r.file)));assert.equal(actual.w,src.w);assert.equal(actual.h,src.h);assert.equal(actual.frames.length,src.frames.length);if(src.frames.length>1){assert.deepEqual(actual.delay,src.delay);assert.equal(actual.loop,src.loop);}
   let rgbMismatch=0,alphaMismatch=0;let active=preparePalette(palette),clean;
   const sources=src.frames.map(data=>({width:src.w,height:src.h,data}));
   if(enhanced){const item=src.frames.length>1?{frames:sources.map((original,f)=>({original,delay:src.delay[f]})),loop:src.loop}:{original:sources[0]};active=await getLimitedPalette(item,active,128,'rgb',8);clean=await prepareCleanupAsync(sources,active.colors,128,'rgb');}
   for(let f=0;f<src.frames.length;f++){
    const oracle=enhanced?(()=>{const q=quantize(sources[f],active,128,undefined,undefined,{metric:'rgb',dither:'4x4',ditherStrength:50});applyCleanup(q,clean);return colorize(q,active).data})():nearest(src.frames[f],palette).data;
    const eq=compare(actual.frames[f],oracle);rgbMismatch+=eq.rgbMismatch;alphaMismatch+=eq.alphaMismatch;const ct=contract(actual.frames[f],src.frames[f],active.colors);assert.equal(ct.offPalette,0);assert.equal(ct.alphaWrong,0);
   }
   assert.equal(rgbMismatch,0,r.id+' RGB');assert.equal(alphaMismatch,0,r.id+' alpha');const colors=usedColors(actual.frames);if(enhanced)assert(colors.length<=8);exports.push({label,id:r.id,width:actual.w,height:actual.h,frames:actual.frames.length,delay:actual.delay,loop:actual.loop,used:colors.length,rgbMismatch,alphaMismatch,oracle:enhanced?'committed production-core quantize/subset/Cleanup outside browser plus independent membership/alpha decode':'independent scalar Oklab nearest plus Sharp decode',sha256:sha(entry[1])});
  }
  await writeFile(path.join(out,label+(zipped?'.zip':records[0].frames>1?'.gif':'.png')),bytes);
 }
 async function download(label,enhanced=false){let bytes;await stage('full source '+label+' export',async()=>{bytes=await save(page,()=>page.getByRole('button',{name:records.length>1?'Save all images':'Save image',exact:true}).click(),{name:records.length>1?'colorfetti.zip':path.basename(records[0].file).replace(/\.(png|gif)$/, '-palette.$1'),label,kind});});await verify(bytes,label,{enhanced});}
 await download('nearest');
 async function control(key){if(!await page.locator('.palette-settings-panel').count())await page.getByRole('button',{name:'Palette settings',exact:true}).click();const chip=page.locator('.palette-setting-chip').filter({hasText:key});if(await chip.count())await chip.first().click();}
 async function close(){if(await page.locator('.palette-settings-panel').count())await page.getByRole('button',{name:'Palette settings',exact:true}).click();}
 await stage('rapid settings cancellation through final RGB cap8 Cleanup dither4 paint',async()=>{await control('Matching');await page.getByRole('button',{name:'RGB matching',exact:true}).click();await page.getByRole('button',{name:'Oklab matching',exact:true}).click();await page.getByRole('button',{name:'RGB matching',exact:true}).click();await control('Max colors');const n=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await n.fill('4');await n.press('Enter');await n.fill('8');await n.press('Enter');await control('Cleanup');await page.getByRole('button',{name:'Cleanup on',exact:true}).click();await control('Dithering');finalPaintMarker=await page.evaluate(()=>performance.now());await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();await close();await page.waitForFunction(t=>[...document.querySelectorAll('.grid figure')].every(f=>f.querySelector('.art canvas')?.__paintAt>=t),finalPaintMarker,{timeout:120000});},{paint:true});
 await download('enhanced',true);
 const first=path.basename(records[0].file);
 await stage('Preview zoom Original fit close and wall return',async()=>{await page.locator('.grid figure').first().locator('.caption-preview').click();await page.locator('dialog.image-viewer .art canvas').waitFor();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await delay(250);await page.getByRole('button',{name:'Show original image',exact:true}).click();await delay(180);await page.getByRole('button',{name:'Show converted image',exact:true}).click();await page.getByRole('button',{name:'Fit image',exact:true}).click();await page.getByRole('button',{name:'Close preview',exact:true}).click();assert.equal(await page.locator('.grid figure').count(),records.length)},{observe:300});
 const animated=records.filter(r=>r.frames>1);let playback;
 const playbackVisibility=await page.locator('.grid figure .art canvas').evaluateAll(cs=>Promise.all(cs.map(c=>new Promise(resolve=>{const observer=new IntersectionObserver(([e])=>{observer.disconnect();resolve({intersecting:e.isIntersecting,ratio:e.intersectionRatio})});observer.observe(c)}))));
 // An offscreen clip intentionally pauses. Test playback only after bringing it
 // into view, retaining its initial visibility as evidence rather than weakening
 // the progress assertion for a genuinely visible frozen clip.
 for(let i=0;i<records.length;i++)if(records[i].frames>1&&!playbackVisibility[i].intersecting){await page.locator('.grid figure').nth(i).scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 if(animated.length){const duration=Math.max(...animated.map(r=>r.delay.reduce((a,b)=>a+b,0)));const before=await page.locator('.grid figure .art canvas').evaluateAll(cs=>cs.map(c=>c.__paintCount||0));await stage('converted playback over two source-loop durations',async()=>{},{observe:duration*2+250});playback=await page.locator('.grid figure').evaluateAll(fs=>fs.map(f=>{const r=f.getBoundingClientRect();return{name:f.querySelector('.caption-preview')?.textContent,paints:f.querySelector('.art canvas').__paintCount,rect:{x:r.x,y:r.y,width:r.width,height:r.height},inViewport:r.top<innerHeight&&r.bottom>0}}));for(let i=0;i<records.length;i++)if(records[i].frames>1){playback[i].observedPaintDelta=playback[i].paints-before[i];if(playback[i].observedPaintDelta<records[i].frames){await page.screenshot({path:path.join(out,'playback-gate-failure.png')});await writeFile(path.join(out,'playback-gate-failure.json'),JSON.stringify({rows,exports,playback,playbackVisibility,records:records.map(r=>({id:r.id,frames:r.frames,delay:r.delay})),errors},null,2));}assert(playback[i].observedPaintDelta>=records[i].frames,records[i].id+' failed one full observed cycle');}}
 await stage('settled wall idle',async()=>{},{observe:600});await page.screenshot({path:path.join(out,'wall.png')});page.off('pageerror',onerror);await cdp.detach();assert.deepEqual(errors,[]);
 const result={kind,records:records.map(r=>r.id),userAgent:await page.evaluate(()=>navigator.userAgent),viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),wall,rows,exports,playback,playbackVisibility,errors,notes:['Wall readiness observes putImageData on every displayed canvas, not full-source color-count publication. Sampled sheets correctly need not show a count.','CDP CPU is renderer main thread; workers excluded. Elapsed includes awaited UI and observation windows, not pure conversion latency. Source transport is prestaged.','Native/download PNG/GIF/ZIP bytes are decoded independently; alpha-zero hidden RGB ignored. Animation source decoded GIF, including fixture palette encoding, defines the expected input.','Enhanced pipeline uses committed production modules, so independent algorithm proof is limited to nearest; enhanced equality catches integration, stale settings, sampling and export discrepancies.']};await writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');return result;
}
