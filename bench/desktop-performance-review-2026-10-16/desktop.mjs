import {createRequire} from 'node:module';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {runWorkflows,out} from './workflows.mjs';
import {sharp,fx} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
await writeFile(path.join(out,'sprite.png'),await readFile(fx('alpha-sprite.png')));await writeFile(path.join(out,'walk.gif'),await readFile(fx('walk.gif')));
for(const side of [896,1024]){let seed=0x352713;const data=Uint8Array.from({length:side*side*4},(_,i)=>{if(i%4===3)return 255;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24});await sharp(data,{raw:{width:side,height:side,channels:4}}).png().toFile(path.join(out,`entropy-${side}.png`));}
if(process.argv.includes('--fixtures-only'))process.exit(0);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});const report={date:new Date().toISOString(),commit:'071ebd9',sandbox:true,profile:process.argv.includes('--profile'),runs:[]};
try{for(const kind of ['small','wall','large']){const context=await browser.newContext({viewport:{width:1280,height:kind==='large'?1400:900}}),page=await context.newPage();try{report.runs.push(await runWorkflows(page,{kind,profile:report.profile}));console.log('PASS',kind)}catch(e){report.runs.push({kind,error:e.stack});console.log('FAIL',kind,e.message)}finally{await context.close();}}}finally{await writeFile(path.join(out,report.profile?'desktop-profile-v3.json':'desktop-results-v3.json'),JSON.stringify(report,null,2));await browser.close();}
