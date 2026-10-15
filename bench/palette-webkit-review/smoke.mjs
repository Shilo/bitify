// Bounded Windows WebKit engine smoke with exact binary-alpha endpoint RGBs.
// No clipboard APIs, browser profile reuse, remote service or source modifications.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import omggif from 'omggif';
import {FULL_PRESETS} from '../../src/lib/palette-library.js';
import {fullPaletteImage} from '../../src/lib/palette-state.js';
import {colorize} from '../../src/lib/quantize.js';
import {decodeGif} from '../../src/lib/gif.js';
import {analyze,mask,colorize as legacyColorize} from '../../src/lib/recolor.js';
process.env.PLAYWRIGHT_BROWSERS_PATH??='C:/Users/shilo/AppData/Local/ms-playwright';
const req=createRequire(import.meta.url),runtime='C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {webkit}=req(runtime+'playwright'),sharp=req(runtime+'sharp'),out=import.meta.dirname;
const label=process.env.QA_LABEL??'baseline';assert(/^[a-z0-9-]+$/.test(label));
const hash=x=>createHash('sha256').update(x).digest('hex');
const width=16,height=16,data=new Uint8ClampedArray(width*height*4),table=[0,0xff0000,0x00ff00,0x0000ff,0xffff00,0x00ffff,0xff00ff,0xffffff];
const indexes=new Uint8Array(width*height);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(x+y*width),n=Math.floor(x/2);indexes[i]=n;const c=table[n];data.set([c>>>16&255,c>>>8&255,c&255,y===0?0:255],i*4);}
const original={width,height,data},png=await sharp(data,{raw:{width,height,channels:4}}).png().toBuffer();
const sourcePath=path.join(out,'endpoint.png');fs.writeFileSync(sourcePath,png);
const buf=Buffer.alloc(12000),writer=new omggif.GifWriter(buf,width,height,{palette:table,loop:0}),gifFrames=[];
for(let f=0;f<2;f++){const frame=indexes.slice();for(let x=0;x<width;x++)frame[x]=0;if(f)frame[width+4]=6;writer.addFrame(0,0,width,height,frame,{delay:[8,16][f],transparent:0,disposal:2});}
const gif=buf.subarray(0,writer.end()),gifPath=path.join(out,'endpoint.gif');fs.writeFileSync(gifPath,gif);
const sourceGif=decodeGif(gif);for(const f of sourceGif.frames)gifFrames.push({original:{width,height,data:f.data},delay:f.delay});
const pico=FULL_PRESETS.find(p=>p.id==='preset-pico8'),settings={family:'full-palette',paletteId:pico.id,metric:'oklab',maxColors:4,cleanup:true,dither:'4x4',ditherStrength:50,alphaCut:128,alphaMode:'keep'};
const expected=await fullPaletteImage({name:'endpoint.png',original},{...settings,colors:pico.colors}),expectedRgba=colorize(expected,expected.colors),expectedUsed=new Set();
for(let p=0;p<expectedRgba.data.length;p+=4)if(expectedRgba.data[p+3])expectedUsed.add('#'+Buffer.from(expectedRgba.data.subarray(p,p+3)).toString('hex'));
const report={scope:'Windows WebKit on owned endpoint RGB/binary alpha fixtures only; not Safari/iOS or partial-alpha precision acceptance',label,indexSha256:hash(fs.readFileSync('dist/index.html')),browser:'WebKit',platform:process.platform,clipboardAccessed:false,sourcePngSha256:hash(png),sourceGifSha256:hash(gif),checks:[],errors:[],resizeObserverNotices:[]};
function equal(a,b){assert.equal(a.length,b.length);let visible=0;for(let p=0;p<a.length;p+=4){assert.equal(a[p+3],b[p+3],'Alpha differs at '+p/4);if(b[p+3]){visible++;for(let c=0;c<3;c++)assert.equal(a[p+c],b[p+c],'RGB differs at '+p/4);}}return visible;}
async function pngCheck(bytes,rgba){const dec=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(dec.info.width,width);assert.equal(dec.info.height,height);const visible=equal(dec.data,rgba.data);return {width,height,visiblePixels:visible,alphaValues:[...new Set(Array.from({length:width*height},(_,i)=>dec.data[i*4+3]))].sort(),pixelsExact:true};}
const browser=await webkit.launch({headless:true});
async function open(config,options={}){const context=await browser.newContext({viewport:{width:1280,height:900},...options});await context.addInitScript(s=>{localStorage.setItem('colorfetti-help-seen','1');localStorage.setItem('colorfetti',JSON.stringify(s));},config);const page=await context.newPage();page.on('pageerror',e=>(e.message.startsWith('ResizeObserver loop')?report.resizeObserverNotices:report.errors).push(e.message));await page.goto((process.env.QA_ORIGIN??'http://127.0.0.1:5294')+'/app/?keep=1');return {context,page};}
async function add(page,file){await page.locator('input[type=file][multiple]').setInputFiles(file);await page.locator('.tiles > .tile').first().waitFor();}
async function download(page,name){const pending=page.waitForEvent('download',{timeout:20000});await page.getByRole('button',{name:'Save '+name,exact:true}).click();const dl=await pending,bytes=fs.readFileSync(await dl.path());return {bytes,name:dl.suggestedFilename()};}
async function step(name,job){await job();report.checks.push({name,pass:true});console.log('PASS '+name);}
try{
 const {context,page}=await open(settings);report.userAgent=await page.evaluate(()=>navigator.userAgent);
 await add(page,sourcePath);
 await step('Independent bitmap control decodes binary endpoint PNG exactly',async()=>{const got=await page.evaluate(async bytes=>{const f=new File([new Uint8Array(bytes)],'endpoint.png',{type:'image/png'}),bitmap=await createImageBitmap(f),c=document.createElement('canvas');try{c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);return [...ctx.getImageData(0,0,c.width,c.height).data];}finally{bitmap.close();c.width=c.height=0;}},[...png]);equal(got,data);});
 await step('PICO8 cap4 Cleanup ordered4x4 Keep native PNG',async()=>{const saved=await download(page,'endpoint.png');report.png=await pngCheck(saved.bytes,expectedRgba);assert.equal(saved.name,'endpoint-palette.png');fs.writeFileSync(path.join(out,label+'-endpoint-output.png'),saved.bytes);});
 await step('Preview Count and Use returns exact output RGBs to an unsaved draft',async()=>{await page.getByRole('button',{name:'Preview endpoint.png',exact:true}).first().click();const viewer=page.locator('.image-viewer[open]');await viewer.getByRole('button',{name:'Count output colors',exact:true}).click();const use=viewer.getByRole('button',{name:'Use '+expectedUsed.size+' output colors',exact:true});await use.waitFor();await use.click();const editor=page.locator('.palette-import-modal[open]');await editor.waitFor();const colors=await editor.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label').match(/#[a-f\d]{6}/i)[0]).sort());assert.deepEqual(colors,[...expectedUsed].sort());await editor.getByRole('button',{name:'Close palette editor',exact:true}).click();await viewer.getByRole('button',{name:'Close preview',exact:true}).click();report.countAndReuse={used:colors.length,colors,notSaved:true};});
 await step('Two-frame GIF keeps exact converted frames timing and loop',async()=>{await add(page,gifPath);await page.waitForFunction(()=>document.querySelectorAll('.tiles > .tile').length===2);const saved=await download(page,'endpoint.gif'),decoded=decodeGif(saved.bytes),fit=await fullPaletteImage({name:'endpoint.gif',original:gifFrames[0].original,frames:gifFrames,loop:sourceGif.loop},{...settings,colors:pico.colors});assert.equal(decoded.frames.length,2);assert.equal(decoded.loop,sourceGif.loop);for(let i=0;i<2;i++){equal(decoded.frames[i].data,colorize(await fit.getFrame(i),fit.colors).data);assert.equal(decoded.frames[i].delay,gifFrames[i].delay);}report.gif={frames:2,delays:decoded.frames.map(f=>f.delay),loop:decoded.loop,pixelsExact:true};fs.writeFileSync(path.join(out,label+'-endpoint-output.gif'),saved.bytes);});
 await page.screenshot({path:path.join(out,label+'-smoke-desktop.png')});await context.close();
 const legacy={family:'two-color',first:'#000000',second:'#ffffff',none:0,style:'solid',settings:{solid:{threshold:128,source:'luma',alpha:128}}},one=await open(legacy);await add(one.page,sourcePath);
 await step('Separate1bit Solid blackwhite native PNG remains exact',async()=>{const saved=await download(one.page,'endpoint.png'),analysed=analyze(original,'luma',128),m=mask(analysed,'solid',{threshold:128,source:'luma',alpha:128}),rgba={data:legacyColorize(m,'#000000','#ffffff')};report.onebit=await pngCheck(saved.bytes,rgba);fs.writeFileSync(path.join(out,label+'-onebit-output.png'),saved.bytes);});await one.context.close();
 const phone=await open(settings,{viewport:{width:320,height:568},hasTouch:true});await add(phone.page,sourcePath);
 await step('320portrait and568landscape Recolor controls fit',async()=>{for(const viewport of [{width:320,height:568},{width:568,height:320}]){await phone.page.setViewportSize(viewport);if(!await phone.page.locator('.palette-settings-panel').count())await phone.page.getByRole('button',{name:'Palette settings',exact:true}).click();await phone.page.locator('.palette-settings-panel').waitFor();const geometry=await phone.page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.palette-setting-row,.palette-settings-panel')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};})}));assert(geometry.scroll<=geometry.width+1);assert(geometry.controls.every(r=>r.left>=-1&&r.right<=geometry.width+1));await phone.page.locator('.palette-settings-panel').getByRole('button',{name:'Keep',exact:true}).scrollIntoViewIfNeeded();await phone.page.waitForTimeout(400);const opacityBox=await phone.page.locator('.palette-settings-panel').getByRole('button',{name:'Keep',exact:true}).boundingBox();assert(opacityBox.y>=0&&opacityBox.y+opacityBox.height<=viewport.height);await phone.page.screenshot({path:path.join(out,label+'-smoke-'+viewport.width+'.png')});}});await phone.context.close();
 assert.equal(report.errors.length,0);report.completed=true;
}catch(error){report.completed=false;report.error={message:error.message,stack:error.stack};process.exitCode=1;console.log(JSON.stringify(report.error));}
finally{await browser.close();report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,label+'-smoke-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({completed:report.completed,checks:report.checks.length,errors:report.errors.length}));}
