import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {autoCheck} from '../practical-challenge-2026-10-16/auto-check.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ADB='C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',serial='37211FDJG00267',out=path.join(import.meta.dirname,'auto2048'),adb=(...a)=>execFileSync(ADB,['-s',serial,...a],{encoding:'utf8'}),delay=ms=>new Promise(r=>setTimeout(r,ms));
const port=Number(process.env.QA_PORT||5342),baseURL=`http://localhost:${port}/`;
await mkdir(out,{recursive:true});adb('reverse',`tcp:${port}`,`tcp:${port}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),context=browser.contexts()[0],page=await context.newPage(),cdp=await context.newCDPSession(page),browserCDP=await browser.newBrowserCDPSession();
await browserCDP.send('Browser.setDownloadBehavior',{behavior:'default'});await cdp.send('Emulation.clearDeviceMetricsOverride');page.setDefaultTimeout(120000);
let storage;const receipts=[],remoteOwned=[],report={commit:process.env.QA_COMMIT||'7ed49fd',started:new Date().toISOString(),arguments:process.argv.slice(2),nativeDownloads:[],errors:[],original:{rotation:adb('shell','wm','user-rotation').trim(),night:adb('shell','cmd','uimode','night').trim()}};
async function save(p,trigger,{name,label,kind}){
 const remote='/sdcard/Download/'+name;try{adb('shell','stat','-c','%s',remote);throw Error('Refusing to overwrite preexisting '+remote)}catch(e){if(!String(e).includes('No such file')&&!String(e).includes('Command failed'))throw e;}
 await trigger();remoteOwned.push(remote);const local=path.join(out,kind,label+'-native'+path.extname(name));await mkdir(path.dirname(local),{recursive:true});
 for(let n=0;n<1200;n++){try{const size=+adb('shell','stat','-c','%s',remote).trim();if(size>0){await delay(250);adb('pull',remote,local);const bytes=await readFile(local);report.nativeDownloads.push({kind,label,name,bytes:bytes.length});adb('shell','rm',remote);remoteOwned.splice(remoteOwned.indexOf(remote),1);return bytes;}}catch{}await delay(200);}
 throw Error('Native download timed out '+name);
}
try{
 await page.goto(baseURL);storage=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 const result=await autoCheck(page,{baseURL,save,output:out});receipts.push({kind:'auto2048',...result});await writeFile(path.join(out,'native-wall.png'),execFileSync(ADB,['-s',serial,'exec-out','screencap','-p']));console.log('PASS AUTO2048',JSON.stringify(result));}catch(e){report.errors.push(e.stack);console.error(e);await writeFile(path.join(out,'failure-native.png'),execFileSync(ADB,['-s',serial,'exec-out','screencap','-p']));report.failureState=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},figures:[...document.querySelectorAll('.grid figure')].map(f=>({name:f.querySelector('.caption-preview')?.textContent,rect:JSON.parse(JSON.stringify(f.getBoundingClientRect())),paints:f.querySelector('.art canvas')?.__paintCount}))})).catch(()=>null);}finally{
 if(storage)await page.evaluate(v=>{localStorage.clear();for(const[k,x]of Object.entries(v))localStorage.setItem(k,x)},storage).catch(()=>{});
 for(const f of remoteOwned)try{adb('shell','rm',f)}catch{}
 report.restored={rotation:adb('shell','wm','user-rotation').trim(),night:adb('shell','cmd','uimode','night').trim()};await page.close().catch(()=>{});report.kinds=receipts.map(r=>r.kind);report.finished=new Date().toISOString();await writeFile(path.join(out,'receipt'+(process.argv.length===3?'-'+process.argv[2]:'')+'.json'),JSON.stringify(report,null,2)+'\n');
}process.exit(report.errors.length?1:0);
