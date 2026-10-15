// Actual frozen research-helper cost/precision, plus explicitly adapted Offscreen control.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'vite';
process.env.PLAYWRIGHT_BROWSERS_PATH??='C:/Users/shilo/AppData/Local/ms-playwright';
const require=createRequire(import.meta.url),runtime='C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {webkit}=require(runtime+'playwright'),sharp=require(runtime+'sharp'),hash=x=>createHash('sha256').update(x).digest('hex');
const dir='bench/webkit-fallback-review',helper='bench/webkit-fallback-candidate-gl.mjs',helperSha=hash(fs.readFileSync(helper));
const costLabel=process.env.COST_LABEL??'streamed';
if(!/^[a-z0-9-]+$/.test(costLabel))throw Error('Invalid cost label');
const receiptFile=dir+'/candidate-cost-'+costLabel+'-results.json';
const streamReader='bench/webkit-fallback-candidate-stream-reader.mjs',streamReaderSha=hash(fs.readFileSync(streamReader));
await build({configFile:false,publicDir:false,logLevel:'error',build:{outDir:dir+'/assets',emptyOutDir:false,minify:false,lib:{entry:path.resolve(helper),formats:['es'],fileName:()=> 'candidate.js'}}});
const bundle=fs.readFileSync(dir+'/assets/candidate.js');
fs.writeFileSync(dir+'/assets/candidate-'+costLabel+'.js',bundle);
const fixtureManifest=JSON.parse(fs.readFileSync('bench/png-import-precision-review/fixtures/manifest.json'));
const tiny=fixtureManifest.find(f=>f.id==='source'),tinyPng=fs.readFileSync('bench/png-import-precision-review/fixtures/'+tiny.file),alphas=[0,1,64,127,128,192,254,255];
const norm=data=>{const copy=Buffer.from(data);for(let p=0;p<copy.length;p+=4)if(!copy[p+3])copy.fill(0,p,p+3);return copy;};
const fixtures=[{id:'tiny32',width:tiny.width,height:tiny.height,bytes:[...tinyPng],expected:tiny.expectedRgba,pngSha256:hash(tinyPng),normalizedExpected:hash(norm(tiny.expectedRgba))}];
for(const side of [1024,2048,4096]){
 const data=Buffer.alloc(side*side*4);for(let y=0;y<side;y++)for(let x=0;x<side;x++)data.set([x&255,y&255,(x+y)&255,alphas[(x+y)%8]],(y*side+x)*4);
 const png=await sharp(data,{raw:{width:side,height:side,channels:4}}).png().toBuffer();fixtures.push({id:side+'square',width:side,height:side,bytes:[...png],pngSha256:hash(png),normalizedExpected:hash(norm(data))});
}
const report={scope:'Windows WebKit actual research helper including metadata/load/post turns and GL cleanup; isolated1/4/16MP. Offscreen is a separately adapted control. No appFPS, Apple, OSclipboard or totalheap claim.',costLabel,helperSha256:helperSha,streamReaderSha256:streamReaderSha,bundleSha256:hash(bundle),platform:process.platform,started:new Date().toISOString(),runs:[]};
if(process.env.COST_CONCURRENCY_NOTE)report.concurrencyNote=process.env.COST_CONCURRENCY_NOTE;
async function runBrowser(mode,runFixtures,coldRun){
 const browser=await webkit.launch({headless:true});try{
  const context=await browser.newContext(),page=await context.newPage();await page.route('**/candidate.js',route=>route.fulfill({contentType:'application/javascript',body:bundle}));await page.goto('http://127.0.0.1:5298/');
  await page.evaluate(async()=>{window.frozenCandidate=await import('/candidate.js');});
  for(const [fixture,repetition]of runFixtures){
   const row=await page.evaluate(async ({f,mode,repetition,coldRun})=>{
    const file=new File([new Uint8Array(f.bytes)],f.id+'.png',{type:'image/png'}),calls=[],restores=[],startMemory=performance.memory?.usedJSHeapSize??null;
    function patch(proto,key){const original=proto?.[key];if(typeof original!=='function')return;proto[key]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{calls.push({method:key,ms:performance.now()-at});}};restores.push(()=>proto[key]=original);}
    patch(HTMLCanvasElement.prototype,'getContext');for(const name of ['texImage2D','readPixels'])patch(WebGLRenderingContext.prototype,name);
    if(typeof OffscreenCanvas==='function')patch(OffscreenCanvas.prototype,'getContext');
    const create=document.createElement.bind(document);if(mode==='offscreen-adapted'){if(typeof OffscreenCanvas!=='function'){restores.reverse().forEach(f=>f());return{mode,coldRun,repetition,id:f.id,unavailable:'OffscreenCanvas absent'};}document.createElement=function(name,...args){return name==='canvas'?new OffscreenCanvas(1,1):create(name,...args);};restores.push(()=>document.createElement=create);}
    let active=true,last=performance.now(),raf,gaps=[];const tick=now=>{if(!active)return;gaps.push(now-last);last=now;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);await new Promise(requestAnimationFrame);gaps=[];last=performance.now();
    const start=performance.now();let result,failure;try{result=await window.frozenCandidate.decodePngWithWebGL(file,{validateDimensions:(w,h)=>{if(w!==f.width||h!==f.height)throw Error('Unexpected candidate geometry');}});}catch(error){failure={name:error.name,message:error.message};}
    const totalMs=performance.now()-start;await new Promise(requestAnimationFrame);active=false;cancelAnimationFrame(raf);restores.reverse().forEach(f=>f());
    const summary={mode,coldRun,repetition,id:f.id,pixels:f.width*f.height,pngBytes:f.bytes.length,totalMs,calls,maxNativeCallMs:calls.length?Math.max(...calls.map(c=>c.ms)):null,maxRafGapMs:gaps.length?Math.max(...gaps):null,rgbaReturned:Boolean(result),failure,startMemory,memoryScope:'Optional reported JS heap only; no retained/GPU/native memory measurement'};
    if(result){let alpha=0,rgb=0;for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++){const p=(y*f.width+x)*4,expected=f.expected?f.expected.slice(p,p+4):[x&255,y&255,(x+y)&255,[0,1,64,127,128,192,254,255][(x+y)%8]];alpha+=result.data[p+3]!==expected[3];if(expected[3])rgb+=result.data[p]!==expected[0]||result.data[p+1]!==expected[1]||result.data[p+2]!==expected[2];else result.data[p]=result.data[p+1]=result.data[p+2]=0;}
     summary.alphaMismatches=alpha;summary.visibleRgbMismatches=rgb;summary.exact=!alpha&&!rgb;summary.normalizedRgbaSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',result.data))].map(v=>v.toString(16).padStart(2,'0')).join('');}
    return summary;
   },{f:fixture,mode,repetition,coldRun});
   if(row.exact&&row.normalizedRgbaSha256!==fixture.normalizedExpected)throw Error('Independent hash disagreed for '+fixture.id);
   report.runs.push(row);fs.writeFileSync(receiptFile,JSON.stringify(report,null,2)+'\n');
   console.log(JSON.stringify({mode,coldRun,repetition,id:row.id,totalMs:row.totalMs,getContext:row.calls?.filter(c=>c.method==='getContext'),maxNative:row.maxNativeCallMs,maxRaf:row.maxRafGapMs,exact:row.exact,returned:row.rgbaReturned,error:row.failure,unavailable:row.unavailable}));
  }
 }finally{await browser.close();}
}
try{
 for(let coldRun=0;coldRun<3;coldRun++)await runBrowser('dom-helper',[[fixtures[0],0]],coldRun);
 for(let coldRun=0;coldRun<3;coldRun++)await runBrowser('offscreen-adapted',[[fixtures[0],0]],coldRun);
 await runBrowser('dom-helper',fixtures.slice(1).flatMap(f=>Array.from({length:f.width===4096?1:3},(_,i)=>[f,i])),'sizes-fresh-browser');
 report.helperStable=helperSha===hash(fs.readFileSync(helper));report.streamReaderStable=streamReaderSha===hash(fs.readFileSync(streamReader));report.completed=report.helperStable&&report.streamReaderStable;
}catch(error){report.completed=false;report.error={message:error.message,stack:error.stack};process.exitCode=1;}
finally{report.finished=new Date().toISOString();fs.writeFileSync(receiptFile,JSON.stringify(report,null,2)+'\n');}
