// Design-only viewport/navigation checks, not application or device validation.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const scratch=path.resolve(import.meta.dirname,'../../.tmp/color-protection-layout');
await fs.mkdir(scratch,{recursive:true});
process.env.TEMP=scratch;process.env.TMP=scratch;
const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
const results=[];
try{
  for(const [name,width,height] of [['desktop',1440,1000],['phone-layout',320,568],['landscape-layout',844,390]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5310');
    for(const workflow of ['mapping','reserve']){
      await page.selectOption('#workflow',workflow);
      for(const state of ['before','entry','source','target','review','applied','conflict','palette']){
        await page.selectOption('#screen',state);
        const metrics=await page.evaluate(()=>{
          const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
          const footer=rect(document.querySelector('.sheet footer'));
          const buttons=[...document.querySelectorAll('.sheet button:not(:disabled)')].map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim(),...rect(e)}));
          const body=document.querySelector('.body');
          return{documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,footer,body:rect(body),bodyOverflow:body.scrollWidth>body.clientWidth,summary:document.querySelector('.summary .budget')?.textContent,small:buttons.filter(b=>b.h<43.9||b.w<43.9)};
        });
        const expectedSummary=workflow==='mapping'?'1 reserved slot · up to 3 others · max 4':'4 reserved slots · max 4';
        results.push({name,workflow,state,...metrics,pass:metrics.documentWidth<=width&&!metrics.bodyOverflow&&metrics.small.length===0&&metrics.footer.bottom<=height&&metrics.footer.y>=0&&metrics.body.h>=32&&(state!=='review'||metrics.summary===expectedSummary)});
      }
    }
    await page.selectOption('#workflow','mapping');
    await page.selectOption('#screen','target');
    await page.screenshot({path:new URL(`${name}-target.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
    await page.selectOption('#screen','conflict');
    await page.screenshot({path:new URL(`${name}-conflict.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
    results.push({name,pageErrors:errors,pass:errors.length===0});
    await page.close();
  }
}finally{await browser.close()}
await fs.writeFile(new URL('layout-results.json',import.meta.url),JSON.stringify({scope:'Standalone design mockup, simulated viewport only; sandbox enabled',results},null,2)+'\n');
const failed=results.filter(r=>!r.pass);console.log(JSON.stringify({cases:results.length,failed},null,2));
if(failed.length)process.exitCode=1;
