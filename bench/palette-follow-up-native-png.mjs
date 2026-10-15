// One real Android Save, then pull only that uniquely named owned PNG.
// Requires unlocked authorized phone, QA5294, reverse5294 and debug forward9333.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fullPaletteImage} from '../src/lib/palette-state.js';
import {FULL_PRESETS} from '../src/lib/palette-library.js';
import {colorize} from '../src/lib/quantize.js';
const require=createRequire(import.meta.url),runtime='C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/',{chromium}=require(process.env.PLAYWRIGHT_MODULE??runtime+'playwright'),sharp=require(process.env.SHARP_MODULE??runtime+'sharp');
const adb=process.env.ADB??'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',out='bench/palette-follow-up-review';mkdirSync(out,{recursive:true});
const filename='colorfetti-followup-'+Date.now()+'.png',saved=filename.replace(/\.png$/,'-palette.png'),devicePath='/sdcard/Download/'+saved;
const source=readFileSync('.tmp/dither-qa/ramp.png'),decoded=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),original={width:decoded.info.width,height:decoded.info.height,data:new Uint8ClampedArray(decoded.data)};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),page=await browser.contexts()[0].newPage();
await page.goto('http://localhost:5294/app/?keep=1&native-followup=20261015');await page.bringToFront();
await page.locator('input[type=file][multiple]').setInputFiles({name:filename,mimeType:'image/png',buffer:source});await page.getByLabel('Image actions for '+filename,{exact:true}).waitFor();
await page.getByLabel('Palette',{exact:true}).click();await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:'PICO-8',exact:true}).click();await page.getByLabel('Palette settings',{exact:true}).click();
if(await page.getByRole('button',{name:'Reset palette settings',exact:true}).isEnabled())await page.getByRole('button',{name:'Reset palette settings',exact:true}).click();
await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('colorfetti'));return s.dither==='none'&&s.ditherStrength===50&&s.metric==='oklab';});
await page.getByRole('group',{name:'Opacity',exact:true}).getByRole('button',{name:'Keep',exact:true}).click();await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();await page.getByRole('button',{name:'Cleanup on',exact:true}).click();
await page.getByRole('spinbutton',{name:'Max colors value',exact:true}).fill('8');await page.getByRole('spinbutton',{name:'Max colors value',exact:true}).press('Enter');
const imeState=execFileSync(adb,['shell','dumpsys input_method | grep -m 1 mInputShown'],{encoding:'utf8',maxBuffer:16384,stdio:['ignore','pipe','ignore']});if(/mInputShown=true/.test(imeState))execFileSync(adb,['shell','input','keyevent','KEYCODE_BACK']);await page.getByLabel('Palette settings',{exact:true}).click();
await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('colorfetti'));return s.alphaMode==='keep'&&s.dither==='4x4'&&s.ditherStrength===50&&s.maxColors===8&&s.cleanup;});
const session=await browser.newBrowserCDPSession();await session.send('Browser.setDownloadBehavior',{behavior:'default'});await session.detach();
await page.getByLabel('Image actions for '+filename,{exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
let nativeBytes;const deadline=Date.now()+15000;while(Date.now()<deadline){try{nativeBytes=execFileSync(adb,['exec-out','cat',devicePath],{timeout:5000,stdio:['ignore','pipe','ignore']});if(nativeBytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
assert(nativeBytes?.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Native PNG was not saved');writeFileSync(out+'/android-native-followup.png',nativeBytes);
const actual=await sharp(nativeBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const settings={colors:FULL_PRESETS.find(p=>p.id==='preset-pico8').colors,name:'PICO-8',metric:'oklab',maxColors:8,cleanup:true,dither:'4x4',ditherStrength:50,alphaCut:128,alphaMode:'keep'},converted=await fullPaletteImage({name:filename,original},settings),expected=colorize(converted,converted.colors);
assert.equal(actual.info.width,original.width);assert.equal(actual.info.height,original.height);const colors=new Set(),alpha=new Set();let alphaChecks=0;
for(let p=0;p<actual.data.length;p+=4){assert.equal(actual.data[p+3],original.data[p+3]);assert.equal(actual.data[p+3],expected.data[p+3]);alphaChecks++;alpha.add(actual.data[p+3]);if(actual.data[p+3]){assert.deepEqual([...actual.data.subarray(p,p+3)],[...expected.data.subarray(p,p+3)]);colors.add('#'+actual.data.subarray(p,p+3).toString('hex'));}}
await page.screenshot({path:out+'/android-native-followup-save.png'});await page.close();
writeFileSync(out+'/android-native-followup.json',JSON.stringify({completed:true,device:'Authorized USB Pixel 8 Pro / Brave',saved,devicePath,bytes:nativeBytes.length,sha256:createHash('sha256').update(nativeBytes).digest('hex'),width:original.width,height:original.height,sourceAlphaBytesMatched:alphaChecks,alphaValues:[...alpha].sort((a,b)=>a-b),usedColors:[...colors],settings,oracle:'Independent Sharp PNG decoding; every alpha byte compared directly to original; visible RGB compared to actual production fullPaletteImage conversion.',unrelatedDownloadsRead:false},null,2)+'\n');
console.log('PASS actual Android Save: '+nativeBytes.length+' bytes, '+alphaChecks+' original alpha values, '+colors.size+' RGBs.');process.exit(0);
