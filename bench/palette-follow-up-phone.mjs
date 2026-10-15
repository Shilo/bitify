// Current production app acceptance on an authorized USB Android browser.
// Requires QA server5294 and existing debug forward9333; closes only its QA pages.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='bench/palette-follow-up-review';mkdirSync(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333');
for(const suite of [{path:'/qa',button:'Run dithering checks',name:'dither'},{path:'/improvements',button:'Run palette improvement checks',name:'improvements'}]){
  if(process.argv[2]&&process.argv[2]!==suite.name)continue;
  const page=await browser.contexts()[0].newPage();await page.goto('http://localhost:5294'+suite.path);await page.bringToFront();
  if(suite.name==='improvements')await page.getByRole('checkbox',{name:'Also try public Lospec import',exact:true}).check();
  await page.getByRole('button',{name:suite.button,exact:true}).click();
  await page.waitForFunction(()=>{const text=document.querySelector('#out').textContent;try{return Boolean(JSON.parse(text).finished);}catch{return false;}},{},{timeout:180000});
  const report=JSON.parse(await page.locator('#out').textContent());writeFileSync(out+'/android-'+suite.name+'.json',JSON.stringify(report,null,2)+'\n');
  await page.screenshot({path:out+'/android-'+suite.name+'.png'});assert(report.completed,report.error?.message??'Acceptance failed');
  if(suite.name==='improvements')assert(report.checks.some(c=>c.name==='Optional real public Lospec URL import'&&c.outcome==='success'),'Actual public palette import did not succeed');
  console.log('PASS Android '+suite.name+': '+report.checks.length+' phases');await page.close();
}
// Do not close the user's browser or unrelated tabs attached through CDP.
process.exit(0);
