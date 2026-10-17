import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const phase = process.argv[2] || 'after';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
try {
await mkdir('bench/dialog-drag-evidence', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const results = { phase, browser: await browser.version(), chromiumSandbox: true, checks: [] };
async function check(name, run) { try { results.checks.push({ name, result: await run() }); } catch (error) { results.checks.push({ name, error: error.message }); } }
const url = process.env.QA_URL || 'http://127.0.0.1:5173/';
await page.goto(url);
await page.getByRole('button', { name: 'Got it', exact: true }).click();
await page.getByRole('button', { name: 'Palette', exact: true }).last().click();
await page.getByRole('button', { name: 'Import palette', exact: true }).click();
const open = async () => { await page.waitForTimeout(40); return await page.locator('dialog.palette-import-modal').count() > 0; };
await check('name select drag outside keeps draft open', async () => {
  const input = page.getByRole('textbox', { name: 'Name', exact: true }); await input.fill('Draft not lost');
  const r = await input.boundingBox();
  await page.mouse.move(r.x + 12, r.y + r.height / 2); await page.mouse.down();
  await page.mouse.move(6, 6, { steps: 8 }); await page.mouse.up();
  const stillOpen = await open(); return { open: stillOpen, name: stillOpen ? await input.inputValue() : null };
});
if (!await open()) { await page.getByRole('button', { name: 'Import palette', exact: true }).click(); }
await check('outside press then release inside keeps open', async () => {
  const r = await page.getByRole('textbox', { name: 'Name', exact: true }).boundingBox();
  await page.mouse.move(6,6); await page.mouse.down(); await page.mouse.move(r.x+10,r.y+10,{steps:5});await page.mouse.up();
  return { open: await open() };
});
if (!await open()) await page.getByRole('button', { name: 'Import palette', exact: true }).click();
await check('actual backdrop click closes', async () => { await page.mouse.click(6,6); return { open: await open() }; });
if (!await open()) await page.getByRole('button', { name: 'Import palette', exact: true }).click();
await check('Escape closes', async () => { await page.keyboard.press('Escape'); return { open: await open() }; });
await check('internal text drag does not show artwork drop overlay', async () => {
  await page.evaluate(() => { const transfer = new DataTransfer(); transfer.setData('text/plain','https://example.com/internal.png'); window.__qaDrag=transfer; document.body.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer})); document.body.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:transfer})); });
  await page.waitForTimeout(50); const overlay = await page.locator('.drop-overlay').count() || await page.getByText('Drop to Colorfetti', { exact: true }).isVisible().catch(()=>false);
  await page.evaluate(()=>document.body.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:window.__qaDrag})));
  return { overlay };
});
await check('external file drop imports after internal drag ends', async () => {
  await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);
    const blob=await new Promise(resolve=>c.toBlob(resolve));const transfer=new DataTransfer();transfer.items.add(new File([blob],'external-owned.png',{type:'image/png'}));
    document.body.dispatchEvent(new DragEvent('dragenter',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    document.body.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.locator('.cap .name').filter({hasText:'external-owned.png'}).waitFor();return { imported:true };
});
await check('native image export drag remains enabled and does not reimport', async()=>{
  await page.locator('.art').first().hover();await page.locator('.export-drag-image').first().waitFor();await page.waitForTimeout(300);
  await page.evaluate(()=>{window.__nativeExport=[];document.addEventListener('dragstart',event=>queueMicrotask(()=>window.__nativeExport.push({trusted:event.isTrusted,prevented:event.defaultPrevented,types:[...event.dataTransfer.types],files:event.dataTransfer.files.length})));});
  const r=await page.locator('.art').first().boundingBox();let native=[],overlay=0,attempts=0;
  while(!native.length && attempts<2){
    attempts++;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(100);await page.mouse.down();await page.mouse.move(r.x+r.width/2+30,r.y+r.height/2,{steps:5});await page.waitForTimeout(50);await page.mouse.move(20,15,{steps:20});await page.waitForTimeout(100);
    native=await page.evaluate(()=>window.__nativeExport);overlay=await page.locator('.drop').count();await page.keyboard.press('Escape');await page.mouse.up();
  }
  return {native,overlay,attempts};
});
const phone = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const touchPage=await phone.newPage();await touchPage.goto(url);await touchPage.getByRole('button',{name:'Got it',exact:true}).tap();await touchPage.getByRole('button',{name:'Palette',exact:true}).last().tap();
const cdp=await phone.newCDPSession(touchPage);
const sendTouch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
const touchOpen=async()=>{await touchPage.waitForTimeout(60);return await touchPage.locator('dialog.palette-import-modal').count()>0;};
const reopenTouch=async()=>{if(!await touchOpen())await touchPage.getByRole('button',{name:'Import palette',exact:true}).tap();};
await reopenTouch();
await check('touch inside-to-backdrop selection keeps draft open',async()=>{
  const r=await touchPage.getByRole('textbox',{name:'Name',exact:true}).boundingBox();await sendTouch('touchStart',r.x+10,r.y+10);await sendTouch('touchMove',4,4);await sendTouch('touchEnd');return {open:await touchOpen()};
});
await reopenTouch();
await check('touch backdrop-to-content keeps draft open',async()=>{
  const r=await touchPage.getByRole('textbox',{name:'Name',exact:true}).boundingBox();await sendTouch('touchStart',4,4);await sendTouch('touchMove',r.x+10,r.y+10);await sendTouch('touchEnd');return {open:await touchOpen()};
});
await reopenTouch();
await check('touch cancellation keeps draft then genuine backdrop tap closes',async()=>{
  await touchPage.evaluate(()=>{window.__touch=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])window.addEventListener(type,e=>window.__touch.push({type,id:e.pointerId,primary:e.isPrimary,button:e.button,target:e.target.tagName,classes:e.target.className,hit:document.elementFromPoint(e.clientX,e.clientY)?.className,x:e.clientX,y:e.clientY}),true);});
  await sendTouch('touchStart',4,4);await sendTouch('touchCancel');const afterCancel=await touchOpen();await touchPage.touchscreen.tap(4,4);return {afterCancel,afterTap:await touchOpen(),events:await touchPage.evaluate(()=>window.__touch)};
});
await check('palette source link preserves published name after editing draft',async()=>{
  await reopenTouch();await touchPage.route('https://lospec.com/palette-list/slso8.json',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({name:'SLSO8',author:'sulfur sauer',colors:['000000','ffffff']})}));
  await touchPage.getByRole('button',{name:'Paste colors',exact:true}).tap();await touchPage.getByRole('textbox',{name:'Colors or Lospec link'}).fill('https://lospec.com/palette-list/slso8');await touchPage.getByRole('button',{name:'Import from Lospec',exact:true}).tap();
  await touchPage.getByRole('textbox',{name:'Name',exact:true}).fill('My local palette');
  const link=touchPage.locator('.palette-source-credit');await link.waitFor();const result={text:await link.innerText(),href:await link.getAttribute('href'),hint:await touchPage.locator('.palette-link-hint').innerText(),overflow:await touchPage.locator('.palette-editor').evaluate(el=>el.scrollWidth>el.clientWidth)};
  await touchPage.screenshot({path:`bench/dialog-drag-evidence/${phase}-palette-source-mobile.png`});return result;
});
console.log(JSON.stringify(results, null, 2));
await writeFile(`bench/dialog-drag-evidence/${phase}.json`, JSON.stringify(results,null,2));
if(phase==='after'){
  for(const row of results.checks) assert.equal(row.error,undefined,row.name+': '+row.error);
  for(const name of ['name select drag outside keeps draft open','outside press then release inside keeps open','touch inside-to-backdrop selection keeps draft open','touch backdrop-to-content keeps draft open']) assert.equal(results.checks.find(row=>row.name===name).result.open,true,name);
  for(const name of ['actual backdrop click closes','Escape closes'])assert.equal(results.checks.find(row=>row.name===name).result.open,false,name);
  for(const name of ['internal text drag does not show artwork drop overlay','native image export drag remains enabled and does not reimport'])assert.equal(!!results.checks.find(row=>row.name===name).result.overlay,false,name);
  const source=results.checks.find(row=>row.name.startsWith('palette source')).result;assert.equal(source.text,'SLSO8');assert.equal(source.hint,'Paste HEX colors or a Lospec palette link.');assert.equal(source.overflow,false);
  const cancel=results.checks.find(row=>row.name.startsWith('touch cancellation')).result;assert.equal(cancel.afterCancel,true);assert.equal(cancel.afterTap,false);
  const native=results.checks.find(row=>row.name==='native image export drag remains enabled and does not reimport').result.native[0];assert.ok(native?.trusted);assert.equal(native.prevented,false);assert.equal(native.files,1);assert.ok(native.types.includes('application/x-colorfetti-export'));
}
} finally { await browser.close(); }
