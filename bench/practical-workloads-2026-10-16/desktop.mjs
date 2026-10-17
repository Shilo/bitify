import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {runCase,cohortCases,root} from './workflows.mjs';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={date:new Date().toISOString(),commit:process.env.QA_COMMIT||'7ed49fd',sandbox:true,runs:[]};
try{for(const c of cohortCases){if(process.env.CASE&&process.env.CASE!==c.kind)continue;const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),page=await context.newPage();try{report.runs.push(await runCase(page,{kind:c.kind,save:async(page,trigger)=>{const pending=page.waitForEvent('download',{timeout:180000});await trigger();const d=await pending;const f=await d.path();return readFile(f)}}));console.log('PASS',c.kind)}catch(e){report.runs.push({kind:c.kind,error:e.stack});console.log('FAIL',c.kind,e.stack)}finally{await context.close();}}}finally{await writeFile(path.join(root,'desktop-results.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}if(report.runs.some(r=>r.error))process.exitCode=1;
