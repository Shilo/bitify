// Actual built app, owned page only. Never browser.close() on the shared phone.
// Imports owned art, changes settings through UI, saves to the phone, Count/Use draft.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import crypto from 'node:crypto';
import {verifyNative} from './native-check.mjs';
const {chromium}=createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',SERIAL='37211FDJG00267',dir=import.meta.dirname,root=path.resolve(dir,'../..');
const adb=(...args)=>execFileSync(ADB,['-s',SERIAL,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const tag='cfaccent-'+Date.now().toString(36),name=tag+'-knight.png',download=name.replace('.png','-palette.png');
const receipt={at:new Date().toISOString(),surface:'USB Pixel 8 Pro, Brave, actual unmodified built app',tag,indexSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/index.html'))).digest('hex'),errors:[]};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0];
const cdp=await browser.newBrowserCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'default'});
const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>receipt.errors.push(e.message));
try{
 receipt.wakefulness=adb('shell','dumpsys','power').match(/mWakefulness=(\w+)/)?.[1];if(receipt.wakefulness!=='Awake')throw Error('Phone is asleep; do not attempt unlock');
 await page.goto('http://127.0.0.1:5324/colorfetti/');await page.bringToFront();receipt.userAgent=await page.evaluate(()=>navigator.userAgent);
 if(await page.locator('dialog.help[open]').count())await page.locator('dialog.help').getByRole('button',{name:'Got it',exact:true}).click();
 await page.getByRole('button',{name:'Palette',exact:true}).first().click();
 await page.getByRole('button',{name:'Auto',exact:true}).click();
 await page.keyboard.press('Escape');
 const payload={name,mimeType:'image/png',buffer:fs.readFileSync(path.join(root,'bench/claude-audit-2026-10-15/service/fixtures/knight-a.png'))};
 await page.locator('input[type=file][accept="image/*"]').setInputFiles(payload);
 await page.getByRole('button',{name:'Image actions for '+name,exact:true}).waitFor();
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 await page.getByRole('button',{name:'Oklab matching',exact:true}).click();await page.getByRole('button',{name:'Cleanup off',exact:true}).click();await page.getByRole('button',{name:'Dithering off',exact:true}).click();
 const input=page.getByRole('spinbutton',{name:'Max colors value',exact:true});await input.fill('8');await input.press('Enter');await input.blur();
 await page.waitForTimeout(500);receipt.settings={matching:await page.getByRole('button',{name:'Oklab matching',exact:true}).getAttribute('aria-pressed'),cleanupOff:await page.getByRole('button',{name:'Cleanup off',exact:true}).getAttribute('aria-pressed'),ditherOff:await page.getByRole('button',{name:'Dithering off',exact:true}).getAttribute('aria-pressed'),maxColors:await input.inputValue()};
 await page.getByRole('button',{name:'Palette settings',exact:true}).click();
 await page.getByRole('button',{name:'Image actions for '+name,exact:true}).click();await page.locator('dialog.sheet').getByRole('button',{name:'Save',exact:true}).click();
 const local=path.join(dir,'android-knight-k8.png'),remote='/sdcard/Download/'+download,end=Date.now()+45000;let found=false;
 while(Date.now()<end){try{const stat=adb('shell','stat','-c','%s',remote).trim();if(+stat>0){await new Promise(r=>setTimeout(r,400));if(adb('shell','stat','-c','%s',remote).trim()===stat){adb('pull',remote,local);found=true;break;}}}catch{}await new Promise(r=>setTimeout(r,400));}
 if(!found)throw Error('Owned native Save download not found');receipt.download={remote,local:path.relative(root,local).replaceAll('\\','/')};
 await page.getByRole('button',{name:'Image actions for '+name,exact:true}).click();await page.locator('dialog.sheet').getByRole('button',{name:'Count output colors',exact:true}).click();
 const use=page.locator('dialog.sheet').getByRole('button',{name:/^Use \d+ output colors?$/});await use.waitFor();receipt.count=+(await use.textContent()).match(/\d+/)[0];await page.screenshot({path:path.join(dir,'android-count.png')});
 await use.click();const editor=page.locator('dialog.palette-import-modal');await editor.waitFor();receipt.draftColors=(await editor.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')?.split(' ').at(-1)).filter(v=>/^#[0-9a-f]{6}$/i.test(v)))).sort();
 await page.screenshot({path:path.join(dir,'android-use-draft.png')});await editor.getByRole('button',{name:'Close palette editor',exact:true}).click();
 receipt.native=await verifyNative(local,{count:receipt.count,draftColors:receipt.draftColors});receipt.pass=receipt.native.pass&&receipt.errors.length===0&&receipt.settings.maxColors==='8';
}catch(e){receipt.pass=false;receipt.error=String(e);await page.screenshot({path:path.join(dir,'android-error.png')}).catch(()=>{});}
finally{fs.writeFileSync(path.join(dir,'android-receipt.json'),JSON.stringify(receipt,null,2)+'\n');await page.close();await cdp.detach().catch(()=>{});}
console.log(JSON.stringify(receipt,null,2));process.exit(receipt.pass?0:1);
