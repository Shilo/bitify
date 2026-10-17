// Built-app acceptance. npm run build && node bench/palette-settings-compact/qa.mjs
// Optional BEFORE_DIST path records matching historical screenshots, never used by assertions.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve('dist'), out=path.resolve('bench/palette-settings-compact');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://local'), before=u.pathname.startsWith('/before/');
  const base=before?path.resolve(process.env.BEFORE_DIST??'.tmp/palette-settings-compact/before-dist'):root;
  const target=path.resolve(base,'.'+(before?u.pathname.slice(7):u.pathname));
  if(target!==base&&!target.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  const file=target===base?path.join(base,'index.html'):target;
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER??'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe',headless:true,chromiumSandbox:true});
await mkdir(out,{recursive:true});
const results={browser:await browser.version(),sandbox:true,algorithmChanges:false,layouts:[],flows:[],errors:[]};
const seed={family:'full-palette',paletteId:'preset-pico8',metric:'oklab',maxColors:8,lastMaxColors:8,cleanup:false,alphaCut:128,alphaMode:'cut',dither:'4x4',ditherStrength:50,theme:'dark'};
const fixture=path.resolve('bench/claude-audit-2026-10-15/service/fixtures/glow-alpha.png');
async function open(width,height,version='after'){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,deviceScaleFactor:1,colorScheme:'dark'});
  page.on('pageerror',e=>results.errors.push(e.message));
  await page.addInitScript(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-welcomed','1');},seed);
  await page.goto(origin+(version==='before'?'/before/':'/'));
  if(await page.getByRole('button',{name:'Got it',exact:true}).count())await page.getByRole('button',{name:'Got it',exact:true}).click();
  await page.locator('input[type=file]').first().setInputFiles(fixture);
  await page.waitForTimeout(300);
  await page.getByRole('button',{name:'Palette settings',exact:true}).click();
  await page.locator('.palette-settings-panel').waitFor();
  return page;
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti')));
async function chip(page,key){await page.locator('.palette-setting-chip').filter({hasText:key}).first().click();}
async function geometry(page){return page.evaluate(()=>{
  const panel=document.querySelector('.palette-settings-panel'),r=panel.getBoundingClientRect(),width=document.documentElement.clientWidth;
  const control=panel.querySelector('.palette-active-control'),c=control?.getBoundingClientRect();
  const overflow=[...panel.querySelectorAll('.palette-setting-row,.palette-active-control,.field,.seg,input[type=range]')].filter(n=>n.getClientRects().length).map(n=>({n:n.className,r:n.getBoundingClientRect()})).filter(({r:a})=>a.left<r.left-1||a.right>r.right+1);
  return {width,height:innerHeight,panelHeight:r.height,panelTop:r.top,panelBottom:r.bottom,compact:panel.classList.contains('compact'),overflow:overflow.map(x=>x.n),documentOverflow:document.documentElement.scrollWidth>width+1,oneRow:!!c&&Math.abs(c.y-panel.querySelector('.palette-setbox').getBoundingClientRect().y)<6,rows:panel.querySelectorAll('.palette-setting-row').length,targets:[...panel.querySelectorAll('.palette-setting-chip,.palette-active-control button,.palette-active-control input[type=range]')].filter(n=>n.getClientRects().length).map(n=>({name:n.getAttribute('aria-label'),h:n.getBoundingClientRect().height,w:n.getBoundingClientRect().width}))};
});}
try{
  for(const [width,height] of [[280,653],[320,568],[390,844],[520,800],[521,800],[844,390],[568,320],[1024,520],[1024,521],[1280,900]]){
    const page=await open(width,height),g=await geometry(page),compact=width<=520||(height<=520&&width>height);
    assert.equal(g.compact,compact,`${width} compact breakpoint`);assert(!g.documentOverflow,`${width} document overflow`);assert.equal(g.overflow.length,0,`${width} control overflow ${g.overflow}`);
    if(compact){assert.equal(g.rows,1,'One selected control');assert(g.panelHeight<=140,`${width} panel too tall ${g.panelHeight}`);assert(g.targets.every(t=>t.h>=43.9&&t.w>=43.9),'44px targets');assert.equal(g.oneRow,width>520,'Landscape single row');
      for(const name of ['Matching','Cleanup','Dithering','Dither strength','Opacity','Opacity cut','Max colors']){await chip(page,name);const selected=await geometry(page);assert.equal(selected.rows,1);assert.equal(selected.overflow.length,0,`${width} ${name} overflow`);}
    }else assert.equal(g.rows,7,'Desktop all settings');
    results.layouts.push(g);
    if([390,844,1280].includes(width))await page.screenshot({path:path.join(out,`after-${width}x${height}.png`)});
    await page.close();
  }
  // Live breakpoints must use the CSS media query and retain selected control.
  const page=await open(390,844);
  await chip(page,'Matching');await page.getByRole('button',{name:'RGB matching',exact:true}).click();
  for(const size of [{width:844,height:390},{width:520,height:800},{width:521,height:800},{width:1024,height:520},{width:1024,height:521},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForTimeout(70);const g=await geometry(page);assert.equal(g.compact,size.width<=520||(size.height<=520&&size.width>size.height));assert.equal(g.overflow.length,0);if(g.compact)assert.equal(await page.locator('.palette-setting-chip[aria-pressed=true]').getAttribute('aria-label'),'Matching: RGB');}
  results.flows.push('Live portrait/landscape/520px breakpoints retain Matching and RGB');
  // Tab removal cancels scheduled updates; detached native inputs cannot publish.
  await chip(page,'Max colors');
  await page.evaluate(()=>{window.oldLimit=document.querySelector('#full-max-colors');oldLimit.value='4';oldLimit.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.palette-setting-chip[aria-label^="Matching:"]').click();});
  await page.waitForTimeout(300);assert.equal((await stored(page)).maxColors,8);
  await page.evaluate(()=>{oldLimit.value='3';oldLimit.dispatchEvent(new Event('input',{bubbles:true}));oldLimit.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);assert.equal((await stored(page)).maxColors,8);
  results.flows.push('Switching settings cancels Max colors drafts and rejects stale range events');
  await chip(page,'Dither strength');
  await page.evaluate(()=>{window.oldStrength=document.querySelector('#full-dither-amount');oldStrength.value='97';oldStrength.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.palette-setting-chip[aria-label^="Matching:"]').click();});
  await page.waitForTimeout(300);assert.equal((await stored(page)).ditherStrength,50);
  await page.evaluate(()=>{oldStrength.value='99';oldStrength.dispatchEvent(new Event('input',{bubbles:true}));oldStrength.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);assert.equal((await stored(page)).ditherStrength,50);
  results.flows.push('Switching settings cancels Dither strength drafts and rejects stale events');
  await chip(page,'Opacity cut');
  await page.evaluate(()=>{window.oldCut=document.querySelector('#full-alpha-cut');});
  await chip(page,'Opacity');await page.getByRole('button',{name:'Keep',exact:true}).click();
  await page.evaluate(()=>{oldCut.value='32';oldCut.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await stored(page)).alphaCut,128);assert.equal(await page.locator('.palette-setting-chip').filter({hasText:'Opacity cut'}).count(),0);
  await chip(page,'Dithering');await page.getByRole('button',{name:'Dithering off',exact:true}).click();assert.equal(await page.locator('.palette-setting-chip').filter({hasText:'Dither strength'}).count(),0);
  results.flows.push('Keep removes only cutoff; dithering Off removes only strength; detached cutoff ignored');
  await page.getByRole('button',{name:'Reset palette settings',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
  assert.equal(await page.locator(':focus').getAttribute('aria-pressed'),'true');assert.equal((await stored(page)).dither,'none');assert.equal((await stored(page)).alphaMode,'cut');assert.equal((await stored(page)).maxColors,0);assert.equal((await stored(page)).metric,'oklab');
  results.flows.push('Keyboard Reset restores defaults and moves focus to enabled selected chip');
  await chip(page,'Dithering');await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();await chip(page,'Dither strength');
  await page.getByRole('button',{name:'Reset palette settings',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
  assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Max colors: All');assert.equal(await page.locator('.palette-setting-chip').filter({hasText:'Dither strength'}).count(),0);
  results.flows.push('Keyboard Reset from disappearing Dither strength focuses replacement Max colors chip');
  // Repeated open/close must not move settings or retain detached listeners.
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.getByRole('button',{name:'Palette settings',exact:true}).click();assert.equal((await geometry(page)).rows,1);}
  results.flows.push('Repeated panel close/reopen leaves one active control');
  await page.close();
  if(process.env.BEFORE_DIST)for(const [w,h] of [[390,844],[844,390],[1280,900]]){const p=await open(w,h,'before');results.layouts.push({before:true,...await geometry(p)});await p.screenshot({path:path.join(out,`before-${w}x${h}.png`)});await p.close();}
  assert.deepEqual(results.errors,[],'No runtime exceptions');
  results.pass=true;
}catch(e){results.pass=false;results.failure=e.stack;process.exitCode=1;}finally{await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));await browser.close();server.close();}
