import {createRequire} from 'node:module';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const folder=path.resolve('bench/palette-change-guide/fixes');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const result={capturedAt:new Date().toISOString(),browser:await browser.version(),chromiumSandbox:true,viewport:{width:1280,height:900},forcedDark:{scope:'Isolated desktop browser emulation, not Android. Same test-only HTML color-scheme/meta light override on both builds removes global opt-out so CDP Auto Dark visibly exercises the original CSS and replacement canvas renderers. No production files, browser preferences or conversion algorithms changed.',captures:[]},firefox:{scope:'Retained historical matched Firefox 153 before/after 376a55c, not f08..HEAD screenshots.'}};
try{
 for(const version of ['before','after']){
  const context=await browser.newContext({viewport:result.viewport,deviceScaleFactor:1});
  const page=await context.newPage(),port=version==='before'?5332:5333;
  await page.goto(`http://127.0.0.1:${port}/colorfetti/`);
  await page.getByRole('button',{name:'Got it',exact:true}).click();
  await page.getByRole('button',{name:'Palette',exact:true}).last().click();
  await page.getByRole('button',{name:'PICO-8',exact:true}).click();
  await page.getByRole('button',{name:'Edit palette',exact:true}).click();
  await page.getByRole('button',{name:'HEX backup',exact:true}).waitFor();
  await page.evaluate(()=>{document.documentElement.style.setProperty('color-scheme','light','important');document.querySelector('meta[name="color-scheme"]').content='light';});
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:true});
  await page.mouse.move(5,5);await page.waitForTimeout(500);
  const geometry=await page.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{color:node.getAttribute('aria-label').match(/#[a-f0-9]{6}/i)[0],x:r.x+r.width/2,y:r.y+r.height/2};}));
  const file=`forced-dark-${version}.png`;
  const bytes=await page.screenshot({path:path.join(folder,file),animations:'disabled'});
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const samples=geometry.map(({color,x,y})=>{const offset=(Math.floor(y)*info.width+Math.floor(x))*4;return{expected:color,actual:'#'+Buffer.from(data.subarray(offset,offset+3)).toString('hex')};});
  result.forcedDark.captures.push({version,revision:version==='before'?'f08d4d3f6e3df771d17524f00f1bba2e492c4ec0':'d91d9d1',url:page.url(),file,palette:'PICO-8, existing Edit palette dialog',samples,mismatches:samples.filter(s=>s.actual.toLowerCase()!==s.expected.toLowerCase()).length,sha256:createHash('sha256').update(bytes).digest('hex')});
  await context.close();
 }
 const prefix='bench/claude-audit-2026-10-15/device';
 for(const [version,source] of [['before','firefox-pre'],['after','firefox']]){
  const sourceFile=path.resolve(prefix,source,'layout-1280x900-wall.png'),file=`firefox-${version}.png`;
  await copyFile(sourceFile,path.join(folder,file));
  const receipt=JSON.parse(await readFile(path.resolve(prefix,source,'results.json'),'utf8'));
  result.firefox[version]={file,source:path.relative(process.cwd(),sourceFile).replaceAll('\\','/'),receipt:`${prefix}/${source}/results.json`,engine:receipt.engine,date:receipt.date,indexSha256:receipt.indexSha256,decodePaths:receipt.decodePaths,sha256:createHash('sha256').update(await readFile(sourceFile)).digest('hex')};
 }
 await writeFile(path.join(folder,'provenance.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({forcedDark:result.forcedDark.captures.map(({version,mismatches,file})=>({version,mismatches,file})),firefox:[result.firefox.before.file,result.firefox.after.file]}));
}finally{await browser.close();}
