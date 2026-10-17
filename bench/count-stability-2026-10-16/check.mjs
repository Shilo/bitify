import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sharp } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [url = 'http://127.0.0.1:5343/', label = 'before'] = process.argv.slice(2);
const colors = FULL_PRESETS.find(p => p.id === 'preset-res64').colors;
const raw = Buffer.alloc(32 * 24 * 4);
for (let i = 0; i < 32 * 24; i++) {
  const c = colors[i % 32 < 16 ? 0 : 63].slice(1);
  raw.set([parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16), 255], i*4);
}
const png = await sharp(raw, { raw: { width: 32, height: 24, channels: 4 } }).png().toBuffer();
await writeFile(new URL('two-colors.png', import.meta.url), png);
const android = !!process.env.ANDROID;
const browser = android ? await chromium.connectOverCDP('http://127.0.0.1:9333')
  : await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const report = { url, label, errors: [], edits: [] };
let page, stored;
try {
  page = android ? await browser.contexts()[0].newPage() : await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.goto(url);
  stored=await page.evaluate(()=>Object.fromEntries(['colorfetti','colorfetti-help-seen'].map(k=>[k,localStorage.getItem(k)])));
  await page.evaluate(() => {
    localStorage.setItem('colorfetti', JSON.stringify({family:'full-palette',paletteId:'preset-res64',metric:'oklab',maxColors:0,alphaCut:128,cleanup:false,dither:'none'}));
    localStorage.setItem('colorfetti-help-seen','1');
  });
  await page.reload(); await page.bringToFront();
  if(android) await page.evaluate(b64=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'two-colors.png',{type:'image/png'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},png.toString('base64'));
  else await page.locator('input[type=file]').first().setInputFiles({ name:'two-colors.png', mimeType:'image/png', buffer:png });
  await page.waitForFunction(() => document.querySelector('.grid .dim')?.textContent.includes('2 colors'));
  await page.getByRole('button', {name:'Palette settings',exact:true}).click();
  async function choose(key) { const chip=page.locator('.palette-setting-chip').filter({hasText:key});if(await chip.count()) await chip.first().click(); }
  await page.evaluate(() => {
    window.__counts = [];
    new MutationObserver(() => window.__counts.push({ t:performance.now(), text:document.querySelector('.grid .dim')?.textContent ?? '' })).observe(document.querySelector('.grid .dim'), {subtree:true,characterData:true,childList:true});
  });
  for (const value of ['4','8','16','32']) {
    await page.evaluate(() => { window.__counts.length=0; });
    const n = page.getByRole('spinbutton',{name:'Max colors value',exact:true});
    await n.fill(value); await n.press('Enter');
    assert.equal(await n.inputValue(),value);
    await page.waitForTimeout(250);
    report.edits.push({ control:'Max colors', value, samples:await page.evaluate(()=>window.__counts) });
  }
  for (const [key,name] of [['Matching','RGB matching'],['Cleanup','Cleanup on'],['Dithering','Dithering 4x4']]) {
    await choose(key);
    await page.evaluate(() => { window.__counts.length=0; });
    await page.getByRole('button',{name,exact:true}).click(); await page.waitForTimeout(300);
    assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
    report.edits.push({control:name,samples:await page.evaluate(()=>window.__counts)});
  }
  await choose('Max colors');
  await page.evaluate(() => { window.__counts.length=0; });
  const slider=page.getByRole('slider',{name:'Max colors',exact:true});
  await slider.press('End');
  for(let i=0;i<20;i++) await slider.press('ArrowLeft');
  await page.waitForTimeout(350);
  assert.equal(await page.getByRole('spinbutton',{name:'Max colors value',exact:true}).inputValue(),'44');
  report.edits.push({control:'range sweep 64 down to 44',samples:await page.evaluate(()=>window.__counts)});
  report.blankTransitions=report.edits.flatMap(e=>e.samples).filter(s=>!s.text.includes('colors')).length;
  await page.screenshot({path:new URL(`${label}.png`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')});
  assert.deepEqual(report.errors, []);
  if (label !== 'before') assert.equal(report.blankTransitions,0);
  if (!android && label !== 'before') {
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    const pending=page.waitForEvent('download',{timeout:10000}).catch(error=>error);
    await page.getByRole('button',{name:'Save image',exact:true}).click();
    const download=await pending;
    if(download instanceof Error){report.downloadError=download.message;report.uiAfterSave=await page.locator('body').innerText();throw download;}
    const bytes=await readFile(await download.path());
    const actual=await sharp(bytes).ensureAlpha().raw().toBuffer();assert.deepEqual(actual,raw);
    report.savedPixelsMatchSource=true;
  }
  report.viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));
  report.finalCaption=await page.locator('.grid .dim').textContent();
  report.finalPending=await page.locator('.grid .dim [aria-busy="true"]').count();
  assert.equal(report.finalPending,0);
} finally {
  if(page&&stored) await page.evaluate(s=>{for(const [k,v]of Object.entries(s)) v===null?localStorage.removeItem(k):localStorage.setItem(k,v)},stored);
  if(android) await page?.close();else await browser.close();
  await writeFile(new URL(`${label}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({label,blankTransitions:report.blankTransitions}));
if(android) process.exit(0); // Detach CDP; never close the shared phone browser.
