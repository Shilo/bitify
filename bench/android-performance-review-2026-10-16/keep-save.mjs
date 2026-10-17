// Native Android Save + independent Sharp/scalar alpha oracle. No app conversion imports.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {decode,fx,sha,nearest,compare,contract,usedColors} from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const paletteId=process.env.QA_PALETTE||'pico8',isMulfok=paletteId==='mulfok32',origin=process.env.QA_ORIGIN||'http://localhost:5336/';
const paletteName={pico8:'PICO-8',mulfok32:'Mulfok 32',gameboy:'Game Boy Green',mono:'Black & White'}[paletteId];assert(paletteName,'Unsupported test palette');
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8'}),out=path.join(import.meta.dirname,paletteId==='pico8'?'keep-save':paletteId==='mulfok32'?'mulfok-final':'palette-'+paletteId+'-final');await mkdir(out,{recursive:true});
const original={policy:adb('shell','wm','user-rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim()};
const report={date:new Date().toISOString(),commit:process.env.QA_COMMIT||'071ebd9',origin,palette:paletteName,original,checks:[],errors:[]};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0],page=await context.newPage(),cdp=await context.newCDPSession(page),remoteFiles=[];let storage;
const bcdp=await browser.newBrowserCDPSession();await bcdp.send('Browser.setDownloadBehavior',{behavior:'default'});page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.stack));
// Canonical published target RGB values; oracle never reads runtime palette modules.
const palette=isMulfok?'5ba675 6bc96c abdd64 fcef8d ffb879 ea6262 cc425e a32858 751756 390947 611851 873555 a6555f c97373 f2ae99 ffc3f2 ee8fcb d46eb3 873e84 1f102a 4a3052 7b5480 a6859f d9bdc8 ffffff aee2ff 8db7ff 6d80fa 8465ec 834dc4 7d2da0 4e187c'.split(' ').map(c=>'#'+c):paletteId==='gameboy'?['#0f380f','#306230','#8bac0f','#9bbc0f']:paletteId==='mono'?['#000000','#ffffff']:['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'];
async function tap(n){await n.waitFor({state:'visible'});await n.scrollIntoViewIfNeeded();const r=await n.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
try{
 await cdp.send('Emulation.clearDeviceMetricsOverride');const port=new URL(origin).port;adb('reverse','tcp:'+port,'tcp:'+port);await page.goto(origin);await page.bringToFront();storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 const source=await readFile(fx('alpha-sprite.png')),decodedSource=await decode(source);await writeFile(path.join(out,'source-owned.png'),source);
 for(const spec of[{name:'keep-nearest',rotation:0,dither:'none',maxColors:0,cleanup:false},{name:'keep-dither-cap-cleanup',rotation:1,dither:'4x4',maxColors:8,cleanup:true}]){
  adb('shell','wm','user-rotation','lock',String(spec.rotation));
  const seed={family:'full-palette',paletteId:'preset-'+paletteId,alphaCut:128,alphaMode:'keep',metric:'oklab',maxColors:spec.maxColors,lastMaxColors:8,cleanup:spec.cleanup,dither:spec.dither,ditherStrength:50,theme:'dark'};
  await page.evaluate(s=>{localStorage.setItem('colorfetti',JSON.stringify(s));localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti-welcomed','1')},seed);await page.reload();
  await page.waitForFunction(n=>n?innerWidth>innerHeight:innerHeight>innerWidth,spec.rotation);await page.getByRole('button',{name:paletteName+' conversion',exact:true}).waitFor();
  const name='cfperf-'+spec.name+'-'+Date.now().toString(36)+'.png';await page.locator('input[type=file]').first().setInputFiles({name,mimeType:'image/png',buffer:source});await page.getByRole('button',{name:'Image actions for '+name,exact:true}).waitFor();await page.waitForFunction(()=>/\d+ colors?\b/.test(document.querySelector('.grid figure .dim')?.textContent||''));
  await tap(page.getByRole('button',{name:'Image actions for '+name,exact:true}));await tap(page.locator('dialog.sheet').getByRole('button',{name:'Save',exact:true}));
  const remote='/sdcard/Download/'+name.replace('.png','-palette.png'),local=path.join(out,spec.name+'.png');remoteFiles.push(remote);let savedBytes;
  for(let i=0;i<40;i++){try{if(+adb('shell','stat','-c','%s',remote).trim()>0){adb('pull',remote,local);savedBytes=await readFile(local);break;}}catch{}await page.waitForTimeout(250);}assert(savedBytes,'Native download missing');
  const saved=await decode(savedBytes),result=contract(saved.frames[0],decodedSource.frames[0],palette,{alphaMode:'keep'});assert.equal(result.alphaWrong,0);assert.equal(result.offPalette,0);assert(result.used.length<=(spec.maxColors||palette.length));
  let exact=null;if(spec.dither==='none'){exact=compare(saved.frames[0],nearest(decodedSource.frames[0],palette,{alphaMode:'keep'}).data);assert.equal(exact.alphaMismatch,0);assert.equal(exact.rgbMismatch,0);}
  const caption=await page.locator('.grid figure .dim').first().textContent();assert(caption.includes(result.used.length+' colors'));
  await tap(page.getByRole('button',{name:'Image actions for '+name,exact:true}));await tap(page.locator('dialog.sheet').getByRole('button',{name:'Reuse colors',exact:true}));const swatches=await page.locator('.palette-review-swatch').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label').split(' ').at(-1).toLowerCase()).sort());assert.deepEqual(swatches,usedColors(saved.frames));await writeFile(path.join(out,spec.name+'-reuse.png'),execFileSync(ADB,['-s',serial,'exec-out','screencap','-p']));await tap(page.getByRole('button',{name:'Close palette editor',exact:true}));
  report.checks.push({...spec,pass:true,caption,sha:sha(savedBytes),bytes:savedBytes.length,contract:result,scalarOracle:exact,reuseMatchesNativeSave:true});
 }
}catch(e){report.errors.push(e.stack);}finally{
 if(storage)await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage).catch(()=>{});for(const f of remoteFiles)try{adb('shell','rm',f)}catch{}
 if(original.policy==='free')adb('shell','wm','user-rotation','free');else adb('shell','wm','user-rotation','lock',original.user);adb('shell','settings','put','system','user_rotation',original.user);report.restored={policy:adb('shell','wm','user-rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim()};await page.close();report.pass=report.checks.length===2&&!report.errors.length;await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}process.exit(report.pass?0:1);
