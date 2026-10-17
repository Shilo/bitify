import { createRequire } from 'node:module';
import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sharp, decode, usedColors } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const android=!!process.env.ANDROID;
const browser=android?await chromium.connectOverCDP('http://127.0.0.1:9333'):await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const report={cases:[],errors:[],android},url=android?'http://localhost:5344/':'http://127.0.0.1:5344/';
const palette=FULL_PRESETS.find(p=>p.id==='preset-res64').colors;
async function open(name,png) {
  const page=android?await browser.contexts()[0].newPage():await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto(url);
  const stored=await page.evaluate(()=>Object.fromEntries(['colorfetti','colorfetti-help-seen'].map(k=>[k,localStorage.getItem(k)])));
  page.restore=async()=>page.evaluate(s=>{for(const[k,v]of Object.entries(s))v===null?localStorage.removeItem(k):localStorage.setItem(k,v)},stored);
  await page.evaluate(()=>{localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-res64',metric:'oklab',maxColors:0,alphaCut:128}));localStorage.setItem('colorfetti-help-seen','1');});
  await page.reload();await page.bringToFront();
  if(android)await page.evaluate(({name,b64})=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],name,{type:name.endsWith('.gif')?'image/gif':'image/png'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},{name,b64:png.toString('base64')});
  else await page.locator('input[type=file]').first().setInputFiles({name,mimeType:name.endsWith('.gif')?'image/gif':'image/png',buffer:png});
  await page.waitForFunction(()=>document.querySelector('.grid .dim'));
  return page;
}
async function ready(page,count) {await page.waitForFunction(n=>{const s=document.querySelector('.grid .dim [aria-busy]');return s&&s.getAttribute('aria-busy')==='false'&&(n===null||s.textContent===`${n} ${n===1?'color':'colors'}`)},count);}
async function monitor(page){await page.evaluate(()=>{window.__gaps=[];window.__captions=[];new MutationObserver(()=>{const text=document.querySelector('.grid .dim')?.textContent??'';window.__captions.push(text);if(!/\d+ colors?$/.test(text))window.__gaps.push(text);}).observe(document.querySelector('.grid .dim'),{subtree:true,childList:true,characterData:true});});}
async function choose(page,key){const chip=page.locator('.palette-setting-chip').filter({hasText:key});if(await chip.count())await chip.first().click();}
async function max(page,n){await choose(page,'Max colors');const input=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await input.fill(String(n));await input.press('Enter');}
async function close(page){await page.restore();await page.close();}
async function fixture(alpha=255){const data=Buffer.alloc(32*24*4);for(let i=0;i<32*24;i++){const c=palette[[0,20,40,63][Math.floor(i%32/8)]];const v=parseInt(c.slice(1),16);data.set([v>>>16,v>>>8&255,v&255,alpha],i*4);}return sharp(data,{raw:{width:32,height:24,channels:4}}).png().toBuffer();}
try{
  {
    const page=await open('four-colors.png',await fixture());await ready(page,4);await monitor(page);
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    for(const n of [2,3,4,2,4]){await max(page,n);await ready(page,n);}
    const gaps=await page.evaluate(()=>__gaps);assert.deepEqual(gaps,[]);
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    if(!android){const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const saved=await decode(await readFile(await(await download).path()));assert.equal(usedColors(saved.frames).length,4);}
    await page.getByLabel('Palette',{exact:true}).click();await page.getByRole('button',{name:'1-bit',exact:true}).click();
    assert.equal(await page.locator('.grid .dim [aria-busy]').count(),0);
    await page.getByRole('button',{name:'Palette',exact:true}).first().click();await ready(page,4);
    report.cases.push({case:'four-color count changes and family switches',gaps,nativeExportChecked:!android});await close(page);
  }
  {
    const page=await open('soft-colors.png',await fixture(127));await ready(page,0);await monitor(page);
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    await choose(page,'Opacity');await page.getByRole('group',{name:'Opacity',exact:true}).getByRole('button',{name:'Keep',exact:true}).click();await ready(page,4);
    await page.getByRole('group',{name:'Opacity',exact:true}).getByRole('button',{name:'Cut',exact:true}).click();await ready(page,0);
    const gaps=await page.evaluate(()=>__gaps);assert.deepEqual(gaps,[]);
    report.cases.push({case:'zero-color Cut to Keep to Cut',gaps});await close(page);
  }
  {
    const page=await open('real-magic.gif',await readFile('bench/practical-workloads-2026-10-16/fixtures/real-magic.gif'));
    await ready(page,12);await monitor(page);await page.getByRole('button',{name:'Palette settings',exact:true}).click();await max(page,2);await ready(page,null);
    const displayed=await page.locator('.grid .dim [aria-busy]').textContent();
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    assert.equal(displayed,'2 colors');
    if(!android){const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const saved=await decode(await readFile(await(await pending).path()));const count=usedColors(saved.frames).length;assert.equal(displayed,`${count} colors`);assert.equal(saved.frames.length,6);}
    const gaps=await page.evaluate(()=>__gaps);assert.deepEqual(gaps,[]);report.cases.push({case:'whole-animation count',gaps,count:2,frames:6,nativeExportChecked:!android});await close(page);
  }
  assert.deepEqual(report.errors,[]);
}finally{if(!android)await browser.close();await writeFile(new URL(android?'android-regressions.json':'regressions.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
if(android)process.exit(0);
