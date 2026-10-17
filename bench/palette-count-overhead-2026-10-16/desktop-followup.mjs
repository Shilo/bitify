import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {out,runCase} from './cases.mjs';
process.env.COUNT_PERF_PORT='5365';const{server,ready}=await import('./server.mjs');
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
await ready;const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={browser:browser.version(),sandbox:true,runs:[],errors:[],notes:['CPU metrics include script/style/layout/GC/browser work as reported by CDP TaskDuration; heap deltas include GC noise. Rendered canvas SHA256 independent of application modules.']};
try{for(let trial=0;trial<5;trial++)for(const enabled of trial%2?[false,true]:[true,false]){const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));const result=await runCase(page,{baseURL:`http://127.0.0.1:5365/${enabled?'enabled':'disabled'}/`,enabled,count:100});report.runs.push({trial,...result});console.log(JSON.stringify({trial,enabled,phases:result.phases.map(p=>({name:p.name,cpuMs:p.cpuMs,lt:p.health.longtasks}))}));await context.close();}for(let t=0;t<5;t++){const pair=report.runs.filter(r=>r.trial===t);assert.deepEqual(pair[0].outputDigests,pair[1].outputDigests);}report.outputEquivalent=true;}finally{await writeFile(path.join(out,'desktop-followup-results.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
