import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sharp} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import {server,ready} from './server.mjs';
import {out,runCase} from './cases.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),{GifWriter}=require('omggif');
const pixels=Uint8Array.from({length:16*16*4},(_,i)=>i%4===3?255:((i*17)%256));await sharp(pixels,{raw:{width:16,height:16,channels:4}}).png().toFile(path.join(out,'count-16.png'));
const bytes=Buffer.alloc(128*16*16*4),writer=new GifWriter(bytes,16,16,{loop:0,palette:[0xff004d,0x29adff,0xffec27,0x00e436]});for(let f=0;f<128;f++)writer.addFrame(0,0,16,16,Uint8Array.from({length:256},(_,p)=>(p+f)%4),{delay:2});await writeFile(path.join(out,'count-128.gif'),bytes.subarray(0,writer.end()));
await ready;const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={browser:browser.version(),sandbox:true,source:'.tmp/palette-usability-final',notes:['Test-only enabled/disabled metadata callback variant; quantization unchanged. Each phase includes fixed settling waits, so wall-clock duration is not conversion CPU.','Headless foreground renderer, no Android attached.'],runs:[],errors:[]};
try{for(let trial=0;trial<3;trial++)for(const spec of[{count:12},{count:100},{count:1,gif:true}])for(const enabled of trial%2?[false,true]:[true,false]){const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));const result=await runCase(page,{baseURL:`http://127.0.0.1:5364/${enabled?'enabled':'disabled'}/`,enabled,...spec});report.runs.push({trial,...result});console.log(JSON.stringify({trial,...spec,enabled,stats:result.final}));await context.close();}}finally{await writeFile(path.join(out,'desktop-results.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
