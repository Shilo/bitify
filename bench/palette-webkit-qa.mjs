// Windows Playwright WebKit engine acceptance, not Safari/iOS or OS clipboard.
// Uses an existing host binary only. Start palette-dither-qa-server.mjs first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH??='C:/Users/shilo/AppData/Local/ms-playwright';
const {webkit}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const label=process.env.QA_LABEL??'baseline';assert(/^[a-z0-9-]+$/.test(label),'Unsafe output label');
const out=path.resolve('bench/palette-webkit-review');fs.mkdirSync(out,{recursive:true});
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sourceFiles=['src/lib/image-decode.js','src/lib/quantize.js','src/lib/palette-state.js'];
const result={scope:'Windows Playwright WebKit engine; fresh isolated contexts; not actual Safari/iOS or OS clipboard',label,started:new Date().toISOString(),platform:process.platform,executable:webkit.executablePath(),distIndexSha256:hash('dist/index.html'),sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,hash(f)])),clipboardMethods:'Existing QA page intercepts write only to inspect encoded app PNG; no real native clipboard read/write',reportSink:'POST /report intercepted locally to avoid overwriting Chromium/device evidence',suites:[]};
assert(fs.existsSync(result.executable),'Existing WebKit executable unavailable; no auto-install');
let browser;
try{
 browser=await webkit.launch({headless:true});result.browserVersion=browser.version();
 for(const route of ['qa','improvements']){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];let receipt;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/report',async request=>{receipt=request.request().postDataJSON();await request.fulfill({status:200,contentType:'application/json',body:'{"saved":true,"sink":"independent-webkit"}'});});
  try{
   await page.goto((process.env.QA_ORIGIN??'http://127.0.0.1:5294')+'/'+route);
   result.userAgent??=await page.evaluate(()=>navigator.userAgent);
   await page.locator('#run').click();
   await page.waitForFunction(()=>/^(PASS|FAIL)/.test(document.querySelector('#status').textContent)&&!document.querySelector('#run').disabled,null,{timeout:240000});
   const status=await page.locator('#status').textContent();
   await page.screenshot({path:path.join(out,label+'-'+route+'.png'),fullPage:false});
   const suite={route,status,receipt,errors};result.suites.push(suite);
   fs.writeFileSync(path.join(out,label+'-'+route+'.json'),JSON.stringify(suite,null,2)+'\n');
   console.log(JSON.stringify({route,status,checks:receipt?.checks?.length,errors:errors.length,error:receipt?.error}));
  }catch(error){
   const status=await page.locator('#status').textContent().catch(()=>null);
   result.suites.push({route,status,receipt,errors,error:{message:error.message,stack:error.stack}});
   await page.screenshot({path:path.join(out,label+'-'+route+'-failure.png'),fullPage:false}).catch(()=>{});
   console.log(JSON.stringify({route,status,error:error.message}));
  }finally{await context.close();}
 }
 result.sourceChangedDuringRun=sourceFiles.some(f=>hash(f)!==result.sourceHashes[f]);
 result.distChangedDuringRun=hash('dist/index.html')!==result.distIndexSha256;
 result.completed=result.suites.length===2&&result.suites.every(s=>s.receipt?.completed===true&&!s.errors.length&&!s.receipt.errors?.length)&&!result.sourceChangedDuringRun&&!result.distChangedDuringRun;
}catch(error){result.completed=false;result.error={message:error.message,stack:error.stack};}
finally{
 await browser?.close();result.finished=new Date().toISOString();fs.writeFileSync(path.join(out,label+'-results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({completed:result.completed,output:path.join(out,label+'-results.json'),error:result.error?.message}));
 if(!result.completed)process.exitCode=1;
}
