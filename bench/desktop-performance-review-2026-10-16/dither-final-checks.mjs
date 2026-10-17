import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {candidate} from './dither-candidate.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),root=path.resolve('.tmp/performance-review-2026-10-16/src/lib');
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Owned bounded dither acceptance</title>')}const m=p.match(/^\/(old|new)\/([a-z0-9-]+\.js)$/);if(!m)throw Error('Invalid route');let s=await readFile(path.join(root,m[2]),'utf8');if(m[1]==='new'&&m[2]==='palette-dither.js')s=candidate(s);res.setHeader('Content-Type','text/javascript');res.end(s)}catch(e){res.writeHead(404).end(e.message)}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const setup=await page.evaluate(async()=>{
  const old=await import('/old/quantize.js'),next=await import('/new/quantize.js'),{FULL_PRESETS}=await import('/old/palette-library.js');let rng=0x1527a;const byte=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng>>>24};
  const entropy={width:256,height:256,data:Uint8ClampedArray.from({length:256*256*4},(_,i)=>i%4===3?[0,1,127,128,255][(i>>>2)%5]:byte())},sampled={width:512,height:512,data:Uint8ClampedArray.from({length:512*512*4},(_,i)=>i%4===3?255:byte())};
  const palette256=Array.from({length:256},(_,i)=>'#'+((i*0x37a193)&0xffffff).toString(16).padStart(6,'0')),checks=[];
  for(const [size,dither,strength,alphaMode,metric,source,sample]of[[2,'2x2',1,'keep','rgb',entropy,false],[4,'4x4',50,'cut','oklab',entropy,false],[8,'8x8',100,'keep','rgb',entropy,false],[16,'4x4',20,'keep','oklab',entropy,false],[32,'none',100,'cut','rgb',entropy,false],[64,'8x8',0,'keep','oklab',entropy,false],[256,'8x8',50,'keep','oklab',entropy,false],[256,'4x4',50,'cut','rgb',entropy,false],[64,'4x4',100,'keep','oklab',sampled,true]]){
   const colors=size===256?palette256:FULL_PRESETS.find(p=>p.colors.length===size).colors,opts={dither,ditherStrength:strength,alphaMode,metric},a=old.quantize(source,old.preparePalette(colors),128,sample?256:undefined,sample?256:undefined,opts),b=next.quantize(source,next.preparePalette(colors),128,sample?256:undefined,sample?256:undefined,opts);let mismatch=0;for(let p=0;p<a.indices.length;p++)if(a.indices[p]!==b.indices[p]||a.alpha?.[p]!==b.alpha?.[p])mismatch++;checks.push({size,dither,strength,alphaMode,metric,sample,mismatch,pixels:a.indices.length});
  }
  const colors=FULL_PRESETS.find(p=>p.name==='Resurrect 64').colors;globalThis.__bench={old,next,source:entropy,palettesBySize:{64:[old.preparePalette(colors),next.preparePalette(colors)],256:[old.preparePalette(palette256),next.preparePalette(palette256)]}};
  // Warm both module copies through each timed branch before alternating pairs.
  for(let k=0;k<2;k++)for(const size of [64,256])for(const metric of ['rgb','oklab'])for(const dither of ['none','4x4','8x8'])for(const version of [0,1])[old,next][version].quantize(entropy,__bench.palettesBySize[size][version],128,undefined,undefined,{metric,dither,alphaMode:'keep'});
  return{checks};
 });const rows=[];const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 for(const size of [64,256])for(const metric of ['rgb','oklab'])for(const dither of ['none','4x4','8x8'])for(let trial=0;trial<5;trial++)for(const version of trial%2?[1,0]:[0,1]){
  const a=await metrics();const result=await page.evaluate(({size,metric,dither,version})=>{const b=__bench,start=performance.now();const r=[b.old,b.next][version].quantize(b.source,b.palettesBySize[size][version],128,undefined,undefined,{metric,dither,alphaMode:'keep'});return{ms:performance.now()-start,last:r.indices.at(-1)}} ,{size,metric,dither,version}),z=await metrics();rows.push({size,metric,dither,trial,version:version?'candidate':'baseline',...result,taskCPU:(z.TaskDuration-a.TaskDuration)*1000});
 }
 const result={date:new Date().toISOString(),checks:setup.checks,rows,description:'Same test-only128paircachecandidate; prewarmed synchronous kernel calls measure CPU without posted-task wait noise. These intentionally block and do not represent production async responsiveness. 5alternatingpairs; immutable071ebd9source; noAndroidcandidateacceptance.'};await writeFile(new URL('dither-final-checks-256.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r))}
