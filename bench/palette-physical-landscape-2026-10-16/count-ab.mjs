import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {runCase} from '../palette-count-overhead-2026-10-16/cases.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267',adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8'});
const original={policy:adb('shell','wm','user-rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim()};
let server;try{await fetch('http://127.0.0.1:5364/enabled/');}catch{const s=await import('../palette-count-overhead-2026-10-16/server.mjs');server=s.server;await s.ready;}
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0],report={date:new Date().toISOString(),original,notes:['Actual Android OS landscape, no CDP metrics/orientation emulation.','Instrumented callback-only enabled/disabled A/B; source quantization unchanged.','Fixed settling waits are not conversion CPU measurements.'],runs:[],errors:[]};let backup,backupPage;
try{
 adb('reverse','tcp:5364','tcp:5364');adb('shell','wm','user-rotation','lock','1');
 backupPage=await context.newPage();await backupPage.goto('http://localhost:5364/enabled/');backup=await backupPage.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 const candidate=process.argv.includes('--slots')?'slots':process.argv.includes('--granular')?'granular':process.argv.includes('--pruned')?'pruned':null;
 for(let trial=0;trial<(process.argv.includes('--cpu')?3:2);trial++)for(const spec of(process.argv.includes('--cpu')?[{count:100}]:[{count:12},{count:100},{count:1,gif:true}]))for(const variant of(candidate?(trial%2?[candidate,'enabled']:['enabled',candidate]):(trial%2?['disabled','enabled']:['enabled','disabled']))){const enabled=variant!=='disabled';
  const page=await context.newPage(),cdp=await context.newCDPSession(page);page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));await cdp.send('Emulation.clearDeviceMetricsOverride');
  try{const r=await runCase(page,{baseURL:`http://localhost:5364/${variant}/`,enabled,...spec});const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,angle:screen.orientation.angle,type:screen.orientation.type}));report.runs.push({trial,variant,viewport,...r});console.log(JSON.stringify({trial,...spec,variant,enabled,final:r.final}));}finally{await page.close();}
 }
}catch(e){report.errors.push(e.stack);}finally{
 if(backupPage&&backup)await backupPage.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x);},backup).catch(()=>{});await backupPage?.close();
 if(original.policy==='free')adb('shell','wm','user-rotation','free');else adb('shell','wm','user-rotation','lock',original.user);adb('shell','settings','put','system','user_rotation',original.user);report.restored={policy:adb('shell','wm','user-rotation').trim(),user:adb('shell','settings','get','system','user_rotation').trim(),accelerometer:adb('shell','settings','get','system','accelerometer_rotation').trim()};
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}const filename=process.argv.includes('--slots')?'count-slots-cpu-results.json':process.argv.includes('--granular')?'count-granular-cpu-results.json':process.argv.includes('--pruned')?'count-pruned-cpu-results.json':process.argv.includes('--cpu')?'count-ab-cpu-results.json':'count-ab-results.json';await writeFile(new URL(filename,import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('Wrote',filename,report.runs.length,'runs',report.errors);
}process.exit(report.errors.length?1:0);
