// Physical-device corpus driver; no clipboard and no shared browser shutdown.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
execFileSync(process.env.ADB??'adb',['reverse','tcp:5300','tcp:5300']);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),page=await browser.contexts()[0].newPage();let failed=false;
try{await page.goto('http://localhost:5300/?device=android');await page.bringToFront();await page.getByRole('button',{name:'Run independent PNG corpus',exact:true}).click();await page.waitForFunction(()=>Boolean(window.pngCorpusReport?.finished),null,{timeout:180000});
const report=await page.evaluate(()=>window.pngCorpusReport);fs.writeFileSync('bench/png-precision-validation-android-corpus.json',JSON.stringify(report,null,2)+'\n');await page.screenshot({path:'bench/png-precision-validation-android-corpus.png'});
console.log(JSON.stringify({completed:report.completed,dependenciesStable:report.dependenciesStable,decoderSha256:report.dependencies?.['src/lib/image-decode.js'],cases:report.cases.length,exactCases:report.cases.filter(c=>c.oraclePolicy==='exact-srgb8').map(c=>({id:c.id,methods:c.methods.map(m=>({name:m.name,ok:m.ok,alpha:m.authored?.alpha,rgb:m.authored?.rgb}))})),error:report.error},null,2));if(!report.completed)failed=true;
}catch(error){failed=true;console.error(error);}finally{await page.close();process.exit(failed?1:0);}
