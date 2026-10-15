// Drive the existing owned decoder diagnostic in Windows WebKit. No clipboard.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH??='C:/Users/shilo/AppData/Local/ms-playwright';
const require=createRequire(import.meta.url),{webkit}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.PRECISION_ORIGIN??'http://127.0.0.1:5298',hash=x=>createHash('sha256').update(x).digest('hex');
const bundle=async()=>hash(await (await fetch(origin+'/assets/probe.js')).text()),before=await bundle();
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];let receipt;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/report',async route=>{receipt=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:'{"saved":true,"sink":"independent-windows-webkit"}'});});
 await page.goto(origin+'/probe?device=edge');await page.locator('#run').click();
 await page.waitForFunction(()=>Boolean(window.pngPrecisionReport?.finished)&&!document.querySelector('#run').disabled,null,{timeout:120000});
 await page.screenshot({path:'bench/palette-webkit-review/decoder-probe.png',fullPage:false});
 const result={scope:'Windows Playwright WebKit; direct owned decoder diagnostics, not Safari/iOS',platform:process.platform,browserVersion:browser.version(),bundleHashBefore:before,bundleHashAfter:await bundle(),adapterNote:'Existing device selector set to edge only because page has no WebKit label; original report retained, runner identifies actual Windows WebKit engine',errors,receipt};
 fs.writeFileSync('bench/palette-webkit-review/decoder-probe-results.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({scope:result.scope,bundleStable:result.bundleHashBefore===result.bundleHashAfter,errors,capabilities:receipt.capabilities,fixtures:receipt.fixtures.map(f=>({id:f.id,methods:f.methods.map(m=>({name:m.name,ok:m.ok,exact:m.exactVisibleRgba,rgb:m.visibleRgbMismatches,alpha:m.alphaMismatches,error:m.error?.message}))}))},null,2));
 if(!receipt.completed||errors.length||result.bundleHashBefore!==result.bundleHashAfter)process.exitCode=1;
}finally{await browser.close();}
