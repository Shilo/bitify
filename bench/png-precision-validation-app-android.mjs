// Real built-app import and native Android downloads. No clipboard access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {loadClipboardManifest,clipboardFixtureDirectory,verifyClipboardPng} from './palette-clipboard-fixtures.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const hash=data=>createHash('sha256').update(data).digest('hex'),prefix='bench/png-precision-validation-final-app-android',adb=(...args)=>execFileSync(process.env.ADB??'adb',args,{timeout:15000,stdio:['ignore','pipe','ignore']});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),manifest=loadClipboardManifest(),pages=[],report={started:new Date().toISOString(),scope:'Actual built app import, actual Save gesture and Android Download file bytes. No download interception or clipboard access. Frozen conversion goldens are production-derived; Sharp independently decodes downloaded PNGs and compares every alpha byte and visible RGB.',distIndexSha256:hash(fs.readFileSync('dist/index.html')),decoderSha256:hash(fs.readFileSync('src/lib/image-decode.js')),fixtureManifestSha256:hash(fs.readFileSync(path.join(clipboardFixtureDirectory,'manifest.json'))),checks:[],errors:[]};
adb('reverse','tcp:5301','tcp:5301');const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0];
try{
const session=await browser.newBrowserCDPSession();await session.send('Browser.setDownloadBehavior',{behavior:'default'});await session.detach();
for(const key of ['palette-keep','palette-cut']){
 const fixture=manifest.fixtures.find(f=>f.key===key),page=await context.newPage();pages.push(page);page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(settings=>{localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti',JSON.stringify(settings));},fixture.settings);
 await page.goto('http://localhost:5301/?png-precision='+key);await page.bringToFront();report.userAgent??=await page.evaluate(()=>navigator.userAgent);
 const source=fs.readFileSync(path.join(clipboardFixtureDirectory,fixture.sourceFile));assert.equal(hash(source),fixture.sourcePngSha256);
 const filename='png-precision-'+key+'-'+Date.now()+'.png',saved=filename.replace(/\.png$/,'-palette.png'),devicePath='/sdcard/Download/'+saved;
 const start=Date.now();await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:filename,mimeType:'image/png',buffer:source});const action=page.getByRole('button',{name:'Image actions for '+filename,exact:true});await action.waitFor({timeout:25000});const importedMs=Date.now()-start;
 const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('colorfetti')));for(const field of ['family','paletteId','metric','alphaCut','alphaMode','maxColors','cleanup','dither','ditherStrength'])assert.equal(settings[field],fixture.settings[field],field+' mismatch');
 await action.click();const saveStart=Date.now();await page.locator('.sheet[open]').getByRole('button',{name:'Save',exact:true}).click();
 let bytes;for(const deadline=Date.now()+20000;Date.now()<deadline;){try{bytes=adb('exec-out','cat',devicePath);if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))break;}catch{}await pause(250);}
 assert(bytes?.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Owned native download absent');const file=prefix+'-'+key+'-saved.png';fs.writeFileSync(file,bytes);const verified=await verifyClipboardPng(bytes,key);
 report.checks.push({key,sourcePngSha256:hash(source),sourceFilename:filename,devicePath,nativeDownload:true,unrelatedDownloadsRead:false,importedMs,nativeSaveAndReadMs:Date.now()-saveStart,settings,verification:verified,file});
 await page.screenshot({path:prefix+'-'+key+'.png'});
 if(key==='palette-keep'){
  const libraryBefore=await page.evaluate(()=>localStorage.getItem('colorfetti-palettes-v1')),wallBefore=await page.locator('.grid .tiles > .tile').count();
  await page.getByRole('button',{name:'Palette',exact:true}).click();await page.getByRole('button',{name:'Import palette',exact:true}).click();const editor=page.locator('.palette-import-modal[open]');
  await editor.getByRole('textbox',{name:'Name',exact:true}).fill('PNG precision owned draft');await editor.getByRole('button',{name:'Image or file',exact:true}).click();
  const paletteStart=Date.now();await editor.locator('input[type=file]').setInputFiles(path.join(clipboardFixtureDirectory,fixture.expectedFile));await page.waitForFunction(()=>document.querySelectorAll('.palette-review-swatch').length===8,null,{timeout:20000});
  const colors=await editor.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label').match(/#[a-f\d]{6}/i)[0]).sort());assert.deepEqual(colors,[...fixture.outputColors].sort());assert.equal(await editor.getByRole('textbox',{name:'Name',exact:true}).inputValue(),'PNG precision owned draft');assert.equal(await page.locator('.grid .tiles > .tile').count(),wallBefore);assert.equal(await page.evaluate(()=>localStorage.getItem('colorfetti-palettes-v1')),libraryBefore);
  report.paletteImport={file:fixture.expectedFile,pngSha256:fixture.expectedPngSha256,colors,count:colors.length,enteredNamePreserved:true,wallImagesUnchanged:true,libraryUnchanged:true,automaticallySaved:false,elapsedMs:Date.now()-paletteStart};await page.screenshot({path:prefix+'-palette-import.png'});
 }
 await page.close();
}
assert.deepEqual(report.errors,[]);report.completed=true;
}catch(error){report.completed=false;report.error={message:error.message,stack:error.stack};process.exitCode=1;}finally{
for(const page of pages)if(!page.isClosed())await page.close().catch(()=>{});report.finished=new Date().toISOString();fs.writeFileSync(prefix+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({completed:report.completed,distIndexSha256:report.distIndexSha256,checks:report.checks.map(c=>({key:c.key,nativeDownload:c.nativeDownload,verification:c.verification,importedMs:c.importedMs,nativeSaveAndReadMs:c.nativeSaveAndReadMs})),paletteImport:report.paletteImport,error:report.error},null,2));process.exit(process.exitCode??0);}
