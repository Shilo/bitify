// Actual built app, isolated browser, touch-emulated viewport. No Android/ADB.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),base='C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {chromium}=require(base+'playwright'),sharp=require(base+'sharp');
const root=path.resolve(import.meta.dirname,'../..'),scratch=path.join(root,'.tmp/protection-app-layout');
await fs.mkdir(scratch,{recursive:true});process.env.TEMP=scratch;process.env.TMP=scratch;
const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe'});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={at:new Date().toISOString(),scope:'Actual built application; isolated Chromium with sandbox enabled, touch-emulated layouts only. No physical Android, OS clipboard or sustained thermal test.',indexSha256:sha(await fs.readFile(path.join(root,'dist/index.html'))),cases:[]};
const pico=['000000','1d2b53','7e2553','008751','ab5236','5f574f','c2c3c7','fff1e8','ff004d','ffa300','ffec27','00e436','29adff','83769c','ff77a8','ffccaa'];
try{
 for(const [name,width,height] of [['touch-portrait',320,568],['touch-landscape',568,320]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(12000);const row={name,width,height,errors:[],steps:[]};page.on('pageerror',e=>row.errors.push(e.message));
  const step=(label,extra={})=>row.steps.push({label,...extra});
  const tap=async(locator,label)=>{await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();await locator.tap();step(label,{box});};
  try{
   await page.goto('http://127.0.0.1:5328/colorfetti/');
   if(await page.locator('dialog.help[open]').count())await tap(page.locator('dialog.help').getByRole('button',{name:'Got it',exact:true}),'Dismiss welcome');
   const chooserPromise=page.waitForEvent('filechooser');await tap(page.getByRole('button',{name:'Add images',exact:true}).last(),'Open Add images picker');
   await (await chooserPromise).setFiles(path.join(import.meta.dirname,'source-knight.png'));
   await page.getByRole('button',{name:'Image actions for source-knight.png',exact:true}).waitFor();
   await tap(page.getByRole('button',{name:'Palette',exact:true}).first(),'Open palette rail');
   await tap(page.getByRole('button',{name:'PICO-8',exact:true}),'Choose PICO-8');
   await tap(page.getByRole('button',{name:'Palette',exact:true}).first(),'Close palette rail');
   await tap(page.getByRole('button',{name:'Palette settings',exact:true}),'Open Recolor');
   const max=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await max.fill('8');await max.press('Enter');await max.blur();step('Set Max colors to 8',{value:await max.inputValue()});
   await tap(page.getByRole('button',{name:'Dithering 4x4',exact:true}),'Enable 4×4 dithering');
   const strength=page.getByRole('slider',{name:'Dither strength',exact:true});await strength.scrollIntoViewIfNeeded();await strength.tap();await page.waitForTimeout(260);step('Adjust Dither strength by touch',{value:await strength.inputValue(),spoken:await strength.getAttribute('aria-valuetext')});
   await page.screenshot({path:path.join(import.meta.dirname,`${name}-recolor.png`)});
   await tap(page.getByRole('button',{name:'Palette settings',exact:true}),'Close Recolor');
   await tap(page.getByRole('button',{name:'Image actions for source-knight.png',exact:true}),'Open image actions');
   await tap(page.locator('dialog.sheet').getByRole('button',{name:'Count output colors',exact:true}),'Count actual output colors');
   const use=page.locator('dialog.sheet').getByRole('button',{name:/^Use \d+ output colors?$/});await use.waitFor();row.count=Number((await use.textContent()).match(/\d+/)[0]);
   await page.screenshot({path:path.join(import.meta.dirname,`${name}-count.png`)});
   await tap(use,'Reuse used colors');const editor=page.locator('dialog.palette-import-modal');await editor.waitFor();
   row.draftColors=(await editor.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label').split(' ').at(-1).toLowerCase()))).sort();
   for(const method of ['Image or file','Paste colors','Add colors'])await tap(editor.getByRole('button',{name:method,exact:true}),`Reach ${method}`);
   await tap(editor.getByRole('button',{name:'Paste colors',exact:true}),'Open palette text input');
   const textInput=editor.getByRole('textbox',{name:'Colors or Lospec link',exact:true});await textInput.fill('#000000, #ffffff, #ff004d');await tap(editor.getByRole('button',{name:'Replace colors',exact:true}),'Import local HEX text into draft');
   row.localImportCount=await editor.locator('.palette-review-swatch').count();
   await page.screenshot({path:path.join(import.meta.dirname,`${name}-import.png`)});
   await tap(editor.getByRole('button',{name:'Close palette editor',exact:true}),'Close unsaved palette draft');
   await tap(page.getByRole('button',{name:'Image actions for source-knight.png',exact:true}),'Reopen image actions');
   const downloadPromise=page.waitForEvent('download');await tap(page.locator('dialog.sheet').getByRole('button',{name:'Save',exact:true}),'Save native PNG');
   const download=await downloadPromise;const output=path.join(import.meta.dirname,`${name}-native.png`);await download.saveAs(output);const bytes=await fs.readFile(output);
   const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const source=await sharp(path.join(import.meta.dirname,'source-knight.png')).ensureAlpha().raw().toBuffer();const used=new Set();let alphaMismatch=0,targetMismatch=0;
   for(let i=0;i<data.length;i+=4){if(data[i+3]!==source[i+3])alphaMismatch++;if(data[i+3]){const rgb=data.subarray(i,i+3).toString('hex');used.add('#'+rgb);if(!pico.includes(rgb))targetMismatch++;}}
   row.native={sha256:sha(bytes),width:info.width,height:info.height,colors:[...used].sort(),alphaMismatch,targetMismatch,bytes:bytes.length};
   await tap(page.locator('.caption-preview'),'Open actual image preview');
   const viewer=page.locator('dialog.image-viewer[open]');await viewer.waitFor();
   const viewerUse=viewer.getByRole('button',{name:/^Use \d+ output colors?$/});await tap(viewerUse,'Reuse colors from Preview');
   await editor.waitFor();await tap(editor.getByRole('button',{name:'Close palette editor',exact:true}),'Close Preview reuse draft');
   row.viewerSurvivesDraftClose=await viewer.count()===1;
   await page.screenshot({path:path.join(import.meta.dirname,`${name}-preview.png`)});
   const previewDownloadPromise=page.waitForEvent('download');await tap(viewer.getByRole('button',{name:'Save image',exact:true}),'Save from Preview');
   const previewDownload=await previewDownloadPromise;const previewOutput=path.join(import.meta.dirname,`${name}-preview-native.png`);await previewDownload.saveAs(previewOutput);row.previewSaveIdentical=sha(await fs.readFile(previewOutput))===sha(bytes);
   await tap(viewer.getByRole('button',{name:'Close preview',exact:true}),'Close Preview');
   row.documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   row.pass=row.errors.length===0&&row.localImportCount===3&&info.width===24&&info.height===24&&used.size<=8&&used.size===row.count&&JSON.stringify([...used].sort())===JSON.stringify(row.draftColors)&&alphaMismatch===0&&targetMismatch===0&&row.documentWidth<=width&&row.viewerSurvivesDraftClose&&row.previewSaveIdentical;
  }catch(e){row.pass=false;row.error=String(e);await page.screenshot({path:path.join(import.meta.dirname,`${name}-error.png`)}).catch(()=>{});}
  report.cases.push(row);await context.close();
 }
}finally{await browser.close()}
report.pass=report.cases.every(r=>r.pass);await fs.writeFile(path.join(import.meta.dirname,'responsive-app-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
