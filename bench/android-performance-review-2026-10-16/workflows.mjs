// Real USB Android app workflow metrics; never overrides CDP viewport/orientation.
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {runWorkflows} from '../desktop-performance-review-2026-10-16/workflows.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267';
const adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8'}),out=import.meta.dirname;
await mkdir(out,{recursive:true});
const original={policy:adb('shell','wm','user-rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim()};
const report={date:new Date().toISOString(),commit:process.env.QA_COMMIT||'071ebd9',origin:'http://localhost:5336/',original,runs:[],errors:[],notes:['Physical USB Pixel 8 Pro. Android OS rotations only, no CDP device metrics.','CDP Task/Script/LayoutDuration are renderer main-thread metrics, not worker CPU or whole-process memory.','rAF instrumentation itself runs during idle; idle is not a zero-work app assertion.']};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0];
let storage,backupPage;
try{
 adb('reverse','tcp:5336','tcp:5336');backupPage=await context.newPage();await backupPage.goto(report.origin);storage=await backupPage.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 for(const spec of(process.argv.includes('--profile')?[{rotation:0,kind:'large',profile:true}]:[{rotation:0,kind:'small'},{rotation:1,kind:'wall'},{rotation:0,kind:'large'}])){
  adb('shell','wm','user-rotation','lock',String(spec.rotation));
  const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(90000);await cdp.send('Emulation.clearDeviceMetricsOverride');
  try{await page.goto(report.origin);await page.waitForFunction(n=>n?innerWidth>innerHeight:innerHeight>innerWidth,spec.rotation);const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,angle:screen.orientation.angle,type:screen.orientation.type}));const result=await runWorkflows(page,{baseURL:report.origin,largeSide:896,...spec});report.runs.push({rotation:spec.rotation,viewport,...result});await writeFile(path.join(out,'workflow-'+spec.kind+(spec.profile?'-profile':'')+'.png'),execFileSync(ADB,['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16777216}));console.log('PASS',spec.kind,JSON.stringify(result.rows.map(r=>({name:r.name,cpuMs:r.cpuMs,longtasks:r.health.longtasks,maxGap:r.health.rafMaxMs}))));}
  catch(e){report.errors.push({spec,error:e.stack});console.log('FAIL',spec.kind,e.message)}finally{await page.close();}
 }
}catch(e){report.errors.push(e.stack);}finally{
 if(storage&&backupPage)await backupPage.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage).catch(()=>{});await backupPage?.close().catch(()=>{});
 if(original.policy==='free')adb('shell','wm','user-rotation','free');else adb('shell','wm','user-rotation','lock',original.user);adb('shell','settings','put','system','user_rotation',original.user);
 report.restored={policy:adb('shell','wm','user-rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim()};
 report.pass=!report.errors.length&&report.runs.every(r=>!r.errors.length);await writeFile(path.join(out,process.argv.includes('--profile')?'workflow-final-profile.json':'workflow-final-results.json'),JSON.stringify(report,null,2)+'\n');console.log('COMPLETE',report.pass);
}
process.exit(report.pass?0:1);
