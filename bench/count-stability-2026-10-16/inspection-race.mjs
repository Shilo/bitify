import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [url='http://127.0.0.1:5344/', label='race-before'] = process.argv.slice(2);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const result={url,label,errors:[]};
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>result.errors.push(e.stack));
  await page.addInitScript(()=>{localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-res64',metric:'oklab',maxColors:0}));localStorage.setItem('colorfetti-help-seen','1');});
  await page.goto(url);
  await page.locator('input[type=file]').first().setInputFiles('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
  await page.locator('.grid .caption-preview').waitFor();
  await page.locator('.grid .caption-preview').click();
  await page.waitForFunction(()=>document.querySelector('.grid .dim')?.textContent.includes('26 colors'));
  await page.getByRole('button',{name:'Close preview',exact:true}).click();
  await page.getByRole('button',{name:'Palette settings',exact:true}).click();
  // Same event-turn ordering makes the real pending-inspection race repeatable:
  // current full-source inspection starts before sampled wall conversion finishes.
  await page.evaluate(()=>{document.querySelector('[aria-label="RGB matching"]').click();document.querySelector('.acts [aria-label^="Reuse colors"]').click();});
  await page.waitForTimeout(2200);
  result.editorOpened=!!await page.locator('dialog.palette-import-modal[open]').count();
  result.caption=await page.locator('.grid .dim').textContent();
  result.pending=await page.locator('.grid .dim [aria-busy="true"]').count();
  if(result.editorOpened) result.editorText=await page.locator('dialog.palette-import-modal').innerText();
  if(label==='race-after') {assert.equal(result.editorOpened,true);assert.equal(result.pending,0);assert.deepEqual(result.errors,[]);assert(result.caption.includes('25 colors'));}
} finally {await browser.close();await writeFile(new URL(label+'.json',import.meta.url),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result));
