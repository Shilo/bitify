// Verify the test-only final cleanup against the unchanged frozen build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
try{
 const context=await browser.newContext({viewport:{width:448,height:900},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{if(!localStorage.getItem('colorfetti-palettes-v1'))localStorage.setItem('colorfetti-palettes-v1',JSON.stringify({version:1,palettes:[{id:'user-qa-unrelated-sentinel',name:'Unrelated QA sentinel',colors:['#123456','#abcdef'],revision:1,source:{kind:'custom'}}]}));});
 const page=await context.newPage();
 // Keep this independent run from replacing root's device report files.
 await page.route('**/report',route=>route.fulfill({status:200,contentType:'application/json',body:'{"saved":true}'}));
 await page.goto('http://127.0.0.1:5294/improvements');await page.getByRole('button',{name:'Run palette improvement checks',exact:true}).click();
 await page.waitForFunction(()=>{try{return!!JSON.parse(document.querySelector('#out').textContent).finished;}catch{return false;}},{},{timeout:120000});
 const report=JSON.parse(await page.locator('#out').textContent());fs.writeFileSync(new URL('./edge-cleanup-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 assert(report.completed,report.error?.message);assert(report.checks.some(c=>c.name==='Remove only the saved palette created by this QA run'&&c.pass));
 assert.equal(report.checks.at(-1).unrelatedPalettesPreserved,1,'The unrelated sentinel must survive owned-palette deletion');
 console.log('PASS: '+report.checks.length+' phases, final owned-palette cleanup verified');await context.close();
}finally{await browser.close();}
