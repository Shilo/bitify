import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {candidate} from './dither-candidate.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve('.tmp/performance-review-2026-10-16/src/lib'),out=import.meta.dirname;
export const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Owned dither candidate A/B</title>')}const m=p.match(/^\/(old|new)\/([a-z0-9-]+\.js)$/);if(!m)throw Error('Invalid route');let s=await readFile(path.join(root,m[2]),'utf8');if(m[1]==='new'&&m[2]==='palette-dither.js')s=candidate(s);res.setHeader('Content-Type','text/javascript');res.end(s)}catch(e){res.writeHead(404).end(e.message)}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);const result=await page.evaluate(async()=>{
 const old=await import('/old/quantize.js'),next=await import('/new/quantize.js'),{FULL_PRESETS}=await import('/old/palette-library.js');
 let rng=0x5913ea;const byte=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng>>>24};
 const entropy={width:256,height:256,data:Uint8ClampedArray.from({length:256*256*4},(_,i)=>i%4===3?[0,1,127,128,192,255][(i>>>2)%6]:byte())};
 const repeated={width:256,height:256,data:Uint8ClampedArray.from({length:256*256*4},(_,i)=>i%4===3?255:((i>>>2)%8)*31)};
 const checks=[],rows=[];let compared=0;
 for(const name of ['ENDESGA 32','Resurrect 64']){const colors=FULL_PRESETS.find(p=>p.name===name).colors,prepared=[old.preparePalette(colors),next.preparePalette(colors)];
  for(const metric of ['oklab','rgb'])for(const dither of ['2x2','4x4','8x8'])for(const strength of [20,50,100])for(const alphaMode of ['cut','keep']){
   const options={metric,dither,ditherStrength:strength,alphaMode},a=old.quantize(entropy,prepared[0],128,undefined,undefined,options),b=next.quantize(entropy,prepared[1],128,undefined,undefined,options);
   let mismatch=0;for(let i=0;i<a.indices.length;i++)if(a.indices[i]!==b.indices[i]||a.alpha?.[i]!==b.alpha?.[i])mismatch++;for(let i=0;i<256;i++)if(a.used[i]!==b.used[i])mismatch++;if(a.hasTransparency!==b.hasTransparency)mismatch++;compared+=a.indices.length;checks.push({name,...options,mismatch});
  }
 }
 const colors=FULL_PRESETS.find(p=>p.name==='Resurrect 64').colors,prepared=[old.preparePalette(colors),next.preparePalette(colors)];
 for(const source of [repeated,entropy])for(const dither of ['none','4x4','8x8'])for(let trial=0;trial<3;trial++)for(const version of trial%2?[1,0]:[0,1]){
  await new Promise(r=>setTimeout(r,20));const start=performance.now();await [old,next][version].quantizeAsync(source,prepared[version],128,undefined,undefined,{dither,ditherStrength:50,alphaMode:'keep'});rows.push({kind:source===entropy?'entropy':'repeated',dither,trial,version:version?'candidate':'baseline',ms:performance.now()-start});
 }
 const controller=new AbortController();let aborted=false;try{await next.quantizeAsync(entropy,prepared[1],128,undefined,undefined,{signal:controller.signal,dither:'8x8',onProgress:()=>controller.abort()})}catch(e){aborted=e.name==='AbortError'};
 return{compared,checks,rows,canceled:aborted,userAgent:navigator.userAgent,notes:['Source-module browser comparison against immutable isolated071ebd9; only palette-dither.js test-transformed. Not app/import/export timing. Cold lazy allocation included. Original RGBplan memo bypass policy retained; pair cache gates large>=65536sample jobs aftermemo disabled. Numericmaximum204800bytes/job,excludesMaps/browseroverhead; no globalmemorybound.']};
 });await writeFile(path.join(out,'dither-candidate-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({compared:result.compared,mismatches:result.checks.filter(c=>c.mismatch),canceled:result.canceled,rows:result.rows},null,2));}finally{await browser.close();await new Promise(r=>server.close(r))}
