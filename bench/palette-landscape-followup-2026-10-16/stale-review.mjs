// Independent built-app lifecycle challenge; no application module oracle.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve,sharp,fx,sha} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dist=path.resolve(process.env.AUDIT_DIST||'bench/palette-count-overhead-2026-10-16/dist-granular-qa'),out=import.meta.dirname;
const server=await serve(5368,dist),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={date:new Date().toISOString(),dist,indexSha256:sha(await readFile(path.join(dist,'index.html'))),sandbox:true,checks:[],errors:[]};
const resultName=process.env.REVIEW_VARIANT==='slots'?'stale-review-slots-results.json':process.env.REVIEW_VARIANT==='integration'?'stale-review-integration-results.json':'stale-review-results.json';
const sprite=await readFile(fx('alpha-sprite.png'));
const solid=await sharp({create:{width:24,height:24,channels:4,background:'#ff004d'}}).png().toBuffer();
const large=await sharp({create:{width:1800,height:1800,channels:4,background:'#ff004d'}}).png().toBuffer();
async function start(){const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-pico8',metric:'oklab'}));});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:5368/colorfetti/');return{page,context};}
const upload=(page,buffer)=>page.locator('input[type=file]').first().setInputFiles({name:'same-name.png',mimeType:'image/png',buffer});
const label=page=>page.locator('.grid figure .dim');
async function count(page,n){await label(page).filter({hasText:new RegExp('\\b'+n+' colors?\\b')}).waitFor();}
function gateModule(page){let release,started;const hold=new Promise(r=>release=r),begin=new Promise(r=>started=r);page.route(/\/palette-usage-[^/]+\.js$/,async route=>{started();await hold;await route.continue();});return{release,begin};}
async function check(name,fn){try{report.checks.push({name,pass:true,...await fn()});console.log('PASS',name);}catch(e){report.checks.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message);}}
try{
 await check('remove completed record, readd same filename with different pixels, reuse only replacement colors',async()=>{const{page,context}=await start();try{await upload(page,sprite);await count(page,13);await page.getByRole('button',{name:'Remove same-name.png',exact:true}).click();await page.getByRole('button',{name:'Remove same-name.png',exact:true}).waitFor({state:'detached'});await upload(page,solid);await count(page,1);await page.getByRole('button',{name:'Reuse colors from same-name.png',exact:true}).click();const colors=await page.locator('.palette-review-grid button').getAttribute('aria-label');assert(colors.toLowerCase().includes('#ff004d'));return{oldCount:13,newCount:1,reused:'#ff004d'};}finally{await context.close();}});
 await check('remove an item during explicit pending reuse; no late draft or stale count after readd',async()=>{const{page,context}=await start();const gate=gateModule(page);try{await upload(page,large);await page.getByRole('button',{name:'Reuse colors from same-name.png',exact:true}).click();await gate.begin;await page.getByRole('button',{name:'Remove same-name.png',exact:true}).click();gate.release();await page.waitForTimeout(800);assert.equal(await page.locator('dialog.palette-import-modal').count(),0);await upload(page,sprite);await count(page,13);assert.equal(await page.locator('dialog.palette-import-modal').count(),0);return{lateDraft:false,replacementCount:13};}finally{gate.release();await context.close();}});
 await check('explicit reuse survives joining and closing automatic Preview inspection',async()=>{const{page,context}=await start();const gate=gateModule(page);try{await upload(page,large);await page.getByRole('button',{name:'Reuse colors from same-name.png',exact:true}).click();await gate.begin;await page.getByRole('button',{name:'Preview same-name.png',exact:true}).last().click();await page.getByRole('button',{name:'Close preview',exact:true}).click();gate.release();await page.locator('dialog.palette-import-modal').waitFor();const colors=await page.locator('.palette-review-grid button').getAttribute('aria-label');assert(colors.toLowerCase().includes('#ff004d'));return{explicitJobRetained:true,reused:'#ff004d'};}finally{gate.release();await context.close();}});
}finally{await writeFile(path.join(out,resultName),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
if(report.errors.length||report.checks.some(c=>!c.pass))process.exitCode=1;
