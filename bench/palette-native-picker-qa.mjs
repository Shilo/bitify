// Physical Android test: native New/Edit color pickers in an unsaved owned draft.
// Requires an authorized unlocked phone, debug forward9333 and QA reverse5294.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const adb=process.env.ADB??'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe',out='bench/auto-refinement-device-review';
mkdirSync(out,{recursive:true});
const native=(...args)=>execFileSync(adb,args,{encoding:'utf8',timeout:15000});
function nodes(){native('shell','uiautomator','dump','/data/local/tmp/colorfetti-native-picker.xml');const xml=native('shell','cat','/data/local/tmp/colorfetti-native-picker.xml');return[...xml.matchAll(/<node\s+([^>]+)>?/g)].map(match=>Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));}
function tap(nodes,test){const node=nodes.find(test);assert(node,'Native picker target missing');const xy=[...node.bounds.matchAll(/\d+/g)].map(m=>+m[0]);assert.equal(xy.length,4);native('shell','input','tap',String(Math.floor((xy[0]+xy[2])/2)),String(Math.floor((xy[1]+xy[3])/2)));}
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333'),page=await browser.contexts()[0].newPage();
await page.goto('http://localhost:5294/app/?keep=1&native-picker=20261015');
await page.getByLabel('Palette',{exact:true}).click();await page.getByRole('button',{name:'Import palette',exact:true}).click();await page.getByRole('button',{name:'Add colors',exact:true}).click();
const report={device:'Authorized USB Pixel 8 Pro / native Brave color picker',started:new Date().toISOString(),checks:[],productionChanged:false};
for(const step of [{label:'New color',choice:'Red',expected:'#ff0000'},{label:'Edit color',choice:'Blue',expected:'#0000ff'}]){
  if(step.label==='Edit color')await page.getByRole('button',{name:'Select color 1 #ff0000',exact:true}).click();
  await page.getByLabel(step.label,{exact:true}).click();
  const initial=nodes();assert(initial.some(n=>n.text==='Select color'),'Native Select color dialog not open');
  tap(initial,n=>n['content-desc']===step.choice&&n.clickable==='true');
  const selected=nodes();assert(selected.some(n=>n['content-desc']?.toLowerCase()==='chosen color'+step.expected),'Native chosen color did not update');
  writeFileSync(out+'/android-native-'+step.label.split(' ')[0].toLowerCase()+'-picker.png',execFileSync(adb,['exec-out','screencap','-p']));
  tap(selected,n=>n.text==='Set'&&n['resource-id']==='android:id/button1');
  await page.waitForFunction(({label,expected})=>{const labelNode=[...document.querySelectorAll('.palette-color-label')].find(n=>n.textContent.trim()===label);return labelNode?.querySelector('input')?.value===expected;},step);
  assert.equal(await page.getByLabel(step.label,{exact:true}).inputValue(),step.expected);
  if(step.label==='New color')await page.getByRole('button',{name:'Add color',exact:true}).click();
  await page.getByRole('button',{name:'Select color 1 '+step.expected,exact:true}).waitFor();
  report.checks.push({...step,nativeDialogOpened:true,nativeSuggestionSelected:true,nativeSetConfirmed:true,inputValue:await page.getByLabel(step.label,{exact:true}).inputValue(),reviewSwatchUpdated:true});
}
await page.screenshot({path:out+'/android-native-picker-result.png'});
await page.getByRole('button',{name:'Close palette editor',exact:true}).click();await page.close();
report.finished=new Date().toISOString();report.completed=true;report.savedPalette=false;writeFileSync(out+'/android-native-picker-results.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS native Android New and Edit picker selection/Set/value/review updates; draft discarded.');
// Exit the owned client without closing the user's browser or unrelated tabs.
process.exit(0);
