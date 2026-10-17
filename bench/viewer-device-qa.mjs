// Physical Android browser: trusted CDP touch streams, native pointer capture,
// Android display rotation. This does not simulate electrical digitizer contacts.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const serial=process.env.ANDROID_SERIAL || '37211FDJG00267', origin=process.env.QA_ORIGIN || 'http://localhost:5302/';
const out=new URL(process.env.QA_OUTPUT || './viewer-device-evidence/',import.meta.url);await mkdir(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8'});
const original={policy:adb('shell','wm','user-rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim()};
const reversePort='tcp:'+new URL(origin).port;
const priorReverse=adb('reverse','--list').trim().split('\n').map(line=>line.trim().split(/\s+/)).find(parts=>parts[1]===reversePort)?.[2]??null;
if(priorReverse&&priorReverse!==reversePort)throw Error('Refusing to replace another task\'s Android reverse mapping');
const browser=await chromium.connectOverCDP(process.env.ANDROID_CDP || 'http://127.0.0.1:9333');
const page=await browser.contexts()[0].newPage(),cdp=await page.context().newCDPSession(page);
const report={date:new Date().toISOString(),model:adb('shell','getprop','ro.product.model').trim(),original,priorReverse,checks:[],errors:[],notes:['Physical USB Android device; no browser viewport, touch-action or pointer-capture override.','Touch input enters Chrome through CDP and produces trusted native PointerEvents, capture and compatibility clicks. This is not a human finger/digitizer test.','Only the owned tab, test-origin localStorage and temporary reverse mapping/rotation are changed and restored.']};
page.on('pageerror',e=>report.errors.push(e.stack));page.setDefaultTimeout(12000);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pt=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});
const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
const shown=()=>page.locator('.image-viewer[open]').count();
const view=()=>page.locator('.viewer-tile').evaluate(n=>{const m=new DOMMatrix(n.style.transform);return {scale:m.a,x:m.e,y:m.f};});
const tapAt=async(x,y)=>{await touch('touchStart',[pt(1,x,y)]);await touch('touchEnd');};
const tap=async locator=>{const r=await locator.boundingBox();assert(r);await tapAt(r.x+r.width/2,r.y+r.height/2);};
const button=name=>page.locator('.image-viewer').getByRole('button',{name,exact:true});
const center=()=>page.evaluate(()=>({x:innerWidth/2,y:innerHeight/2}));
async function open(){if(await shown())await tap(button('Close preview'));await tap(page.locator('.grid .tile .art'));await page.locator('.image-viewer[open]').waitFor();await sleep(60);}
async function check(name,fn){try{report.checks.push({name,pass:true,...await fn()});console.log('PASS',name);}catch(e){report.checks.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message);await touch('touchCancel').catch(()=>{});}}
let storage;
try{
  adb('reverse',reversePort,reversePort);await page.goto(origin);storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  await page.evaluate(()=>{localStorage.setItem('colorfetti',JSON.stringify({family:'full-palette',paletteId:'preset-pico8',metric:'rgb',theme:'dark'}));localStorage.setItem('colorfetti-help-seen','1');});await page.reload();
  const gotIt=page.getByRole('button',{name:'Got it',exact:true});if(await gotIt.count())await gotIt.click();
  await page.locator('input[type=file]').first().setInputFiles(new URL('./viewer-navigation-evidence/landmarks.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
  await page.locator('.grid .tile .art').waitFor();
  await page.evaluate(()=>{window.__touchEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])document.addEventListener(type,e=>{if(e.target.closest('.image-viewer'))window.__touchEvents.push({type,trusted:e.isTrusted,pointerType:e.pointerType,id:e.pointerId});},true);});
  for(const rotation of [0,1]){
    const label=rotation?'landscape':'portrait';adb('shell','wm','user-rotation','lock',String(rotation));await page.waitForFunction(r=>r?innerWidth>innerHeight:innerHeight>innerWidth,rotation);await sleep(250);
    report[label]=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,orientation:screen.orientation.type}));
    await check(label+' icon, edges, touch targets, zoom and Fit',async()=>{
      await open();const fit=button('Fit image');assert.equal(await fit.innerText(),'');assert.equal(await fit.locator('svg').count(),1);const r=await fit.boundingBox();assert(r.width>=44&&r.height>=44);
      await tap(button('Zoom in'));assert((await view()).scale>1);await tap(fit);assert.deepEqual(await view(),{scale:1,x:0,y:0});assert.equal(await shown(),1);
      const edges=await page.evaluate(()=>{
        const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.append(probe);
        const css=getComputedStyle(probe),safe={top:parseFloat(css.paddingTop),right:parseFloat(css.paddingRight),bottom:parseFloat(css.paddingBottom),left:parseFloat(css.paddingLeft)};probe.remove();
        const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{left:r.left,top:r.top,right:innerWidth-r.right,bottom:innerHeight-r.bottom}};
        return{viewport:[innerWidth,innerHeight],edge:innerWidth<=800?12:24,safe,dialog:rect('.image-viewer'),zoom:rect('.viewer-zoom'),actions:rect('.viewer-workspace .viewer-tools'),close:rect('.viewer-close')};
      });
      await writeFile(new URL(label+'-controls.png',out),execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16*1024*1024}));
      for(const [n,side] of [[edges.zoom.left,'left'],[edges.zoom.top,'top'],[edges.actions.left,'left'],[edges.actions.bottom,'bottom'],[edges.close.right,'right'],[edges.close.bottom,'bottom']])assert(Math.abs(n-edges.safe[side]-edges.edge)<1,'native control edge misaligned: '+JSON.stringify(edges));return{target:r,edges};
    });
    for(const lift of [1,2])await check(label+` pinch, lift finger ${lift}, remaining-finger pan`,async()=>{
      await open();await tap(button('Zoom in'));await tap(button('Zoom in'));const initial=await view(),c=await center();
      const eventStart=await page.evaluate(()=>window.__touchEvents.length);
      let a=pt(1,c.x-35,c.y),b=pt(2,c.x+35,c.y);
      await touch('touchStart',[a]);await touch('touchStart',[a,b]);
      for(let i=1;i<=12;i++){a=pt(1,c.x-35-i*5,c.y-i*2);b=pt(2,c.x+35+i*5,c.y+i*2);await touch('touchMove',[a,b]);await sleep(12);}
      // Chromium's end event names the ended contact, not the remaining one.
      // Verify the actual native pointerup identity so driver mistakes cannot pass.
      const contacts=await page.evaluate(()=>window.__touchEvents.filter(e=>e.type==='pointerdown').slice(-2).map(e=>e.id));
      const pinched=await view();assert(pinched.scale>initial.scale*2);let remain=lift===1?b:a;await touch('touchEnd',[lift===1?a:b]);const lifted=await view();
      const liftedPointer=await page.evaluate(()=>window.__touchEvents.filter(e=>e.type==='pointerup').at(-1)?.id);assert.equal(liftedPointer,contacts[lift-1]);
      assert(Math.abs(lifted.scale-pinched.scale)<.001);assert(Math.hypot(lifted.x-pinched.x,lifted.y-pinched.y)<1,'finger lift jumped');
      const dx=lifted.x>=0?-36:36,dy=lifted.y>=0?-30:30;
      for(let i=1;i<=5;i++){await touch('touchMove',[pt(remain.id,remain.x+dx*i/5,remain.y+dy*i/5)]);await sleep(12);}
      const panned=await view();assert(Math.abs(panned.scale-lifted.scale)<.001);assert(Math.abs(panned.x-lifted.x-dx)<1);assert(Math.abs(panned.y-lifted.y-dy)<1);
      await touch('touchEnd');await sleep(300);assert.equal(await shown(),1,'pinch/pan dismissed viewer');
      const sequence=await page.evaluate(start=>window.__touchEvents.slice(start).filter(e=>e.type==='pointerdown'||e.type==='pointerup'),eventStart);
      assert.deepEqual(sequence.map(e=>[e.type,e.id]),[['pointerdown',contacts[0]],['pointerdown',contacts[1]],['pointerup',contacts[lift-1]],['pointerup',contacts[2-lift]]]);
      await writeFile(new URL(label+`-lift-${lift}.png`,out),execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16*1024*1024}));return{initial,pinched,lifted,panned,contacts,liftedPointer};
    });
    await check(label+' pinch inward, release and tap closes',async()=>{
      await open();const c=await center();await touch('touchStart',[pt(1,c.x-90,c.y)]);await touch('touchStart',[pt(1,c.x-90,c.y),pt(2,c.x+90,c.y)]);
      for(let i=1;i<=10;i++)await touch('touchMove',[pt(1,c.x-90+i*6,c.y),pt(2,c.x+90-i*6,c.y)]);
      await touch('touchEnd');await sleep(200);assert.equal(await shown(),1);assert((await view()).scale<.6);await tapAt(c.x,c.y);await page.locator('.image-viewer').waitFor({state:'detached'});return{};
    });
    await check(label+' stationary two-finger sequence never closes',async()=>{
      await open();const c=await center();await touch('touchStart',[pt(1,c.x-30,c.y)]);await touch('touchStart',[pt(1,c.x-30,c.y),pt(2,c.x+30,c.y)]);await touch('touchEnd',[pt(2,c.x+30,c.y)]);await touch('touchEnd');await sleep(200);assert.equal(await shown(),1);return{};
    });
    await check(label+' drag out and back, cancellation and fresh tap',async()=>{
      await open();const c=await center();await touch('touchStart',[pt(1,c.x,c.y)]);await touch('touchMove',[pt(1,c.x+30,c.y+20)]);await touch('touchMove',[pt(1,c.x,c.y)]);await touch('touchEnd');await sleep(150);assert.equal(await shown(),1);
      await touch('touchStart',[pt(1,c.x,c.y)]);await touch('touchCancel');await sleep(150);assert.equal(await shown(),1);await tapAt(c.x,c.y);await page.locator('.image-viewer').waitFor({state:'detached'});return{};
    });
  }
  report.events=await page.evaluate(()=>window.__touchEvents);const touches=report.events.filter(e=>e.pointerType==='touch');assert(touches.length>0&&touches.every(e=>e.trusted));assert(report.events.some(e=>e.type==='gotpointercapture'));assert(!report.errors.length);
}catch(e){report.errors.push(e.stack);}finally{
  await touch('touchCancel').catch(()=>{});if(storage)await page.evaluate(s=>{localStorage.clear();for(const[k,v]of Object.entries(s))localStorage.setItem(k,v);},storage).catch(()=>{});
  await page.close();if(original.policy==='free')adb('shell','wm','user-rotation','free');else adb('shell','wm','user-rotation','lock',original.user);
  adb('shell','settings','put','system','user_rotation',original.user);if(!priorReverse)adb('reverse','--remove',reversePort);
  report.restored={policy:adb('shell','wm','user-rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim()};
  report.pass=report.checks.length===12&&report.checks.every(c=>c.pass)&&!report.errors.length;await writeFile(new URL('results.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,errors:report.errors,restored:report.restored}));process.exitCode=report.pass?0:1;
}
// Disconnect this test process without sending Browser.close to the user's app.
process.exit(process.exitCode || 0);
