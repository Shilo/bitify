// Focused in-place reducer diagnostic. Existing authenticated profile; no sign-in automation.
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const evidence = { date: new Date().toISOString(), browserSandbox: true, submissions: 0, observations: [], processingRequests: [], downloads: 0 };
const save = () => writeFileSync('bench/palette-service-research/web-paired-diagnostic.json', JSON.stringify(evidence, null, 2) + '\n');
let context;
try {
 context = await chromium.launchPersistentContext('.tmp/pixellab-browser-profile-sandboxed', { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', chromiumSandbox: true, headless: false, viewport: { width: 1360, height: 1000 } });
 context.setDefaultTimeout(6000);
 const page = context.pages()[0] ?? await context.newPage();
 await page.goto('https://www.pixellab.ai/create?tool=reduce_colors');
 await page.waitForTimeout(2500);
 if (!new URL(page.url()).hostname.endsWith('pixellab.ai') || await page.getByRole('complementary').count() === 0) {
   evidence.authentication = 'unavailable'; save(); console.log(JSON.stringify({ authentication: 'unavailable' })); await context.close(); process.exit(0);
 }
 const sidebar = page.getByRole('complementary').first();
 evidence.authentication = 'existing profile reached reducer';
 page.on('download', () => { evidence.downloads++; });
 page.on('request', r => { const u = new URL(r.url()); if (u.hostname.endsWith('pixellab.ai') && /reduce|generate|process/i.test(u.pathname) && ['xhr','fetch'].includes(r.resourceType())) evidence.processingRequests.push({ method: r.method(), path: u.pathname.replace(/[a-f\d]{20,}/gi, '[id]') }); });
 async function inspect(label) {
   const images = await sidebar.locator('img,canvas').evaluateAll(async nodes => Promise.all(nodes.map(async node => {
     const image = node.tagName === 'IMG', width = image ? node.naturalWidth : node.width, height = image ? node.naturalHeight : node.height;
     const src = image ? node.currentSrc : '';
     const result = { tag: node.tagName, width, height, sourceKind: src.startsWith('blob:') ? 'blob' : src.startsWith('data:') ? 'data' : src ? 'remote' : 'canvas' };
     if (width && height && (result.sourceKind === 'blob' || result.sourceKind === 'data' || !image)) {
       try { const c = document.createElement('canvas'); c.width = width; c.height = height; const ctx = c.getContext('2d'); ctx.drawImage(node,0,0); const rgba=ctx.getImageData(0,0,width,height).data; result.pixelHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',rgba))].map(n=>n.toString(16).padStart(2,'0')).join(''); result.visibleColors = new Set(Array.from({length:width*height},(_,i)=>rgba[i*4+3] ? [...rgba.slice(i*4,i*4+4)].join(',') : null).filter(Boolean)).size; } catch { result.pixelRead = 'unavailable'; }
     }
     return result;
   })));
   const controls = await sidebar.ariaSnapshot();
   const forms = await sidebar.locator('form').evaluateAll(nodes=>nodes.map(n=>({valid:n.checkValidity(),invalidCount:n.querySelectorAll(':invalid').length})));
   const record = { label, controls, images, forms }; evidence.observations.push(record); save(); console.log(JSON.stringify(record));
 }
 await inspect('initial');
 for await (const line of createInterface({input:process.stdin})) {
   try {
     const command=JSON.parse(line);
     if(command.action==='close'){save();break;}
     if(command.action==='inspect') await inspect(command.label ?? 'inspect');
     if(command.action==='click') await sidebar.getByRole('button',{name:command.name,exact:true}).click();
     if(command.action==='select') await sidebar.locator('select').nth(command.index??0).selectOption(command.value);
     if(command.action==='upload') await sidebar.locator('input[type=file]').nth(command.index??0).setInputFiles(command.path);
     if(command.action==='fill') await sidebar.getByRole(command.role??'spinbutton',{name:command.name,exact:true}).fill(command.value);
     if(command.action==='submit') {
       if(evidence.submissions)throw Error('One-submit bound');
       await inspect('before-submit');
       const generate=sidebar.getByRole('button',{name:/^Generate ·/});
       evidence.clickRoute={normalLocatorClick:true,enabled:await generate.isEnabled(),buttons:await generate.count()};
       await generate.click();evidence.submissions++;
       for(let i=0;i<3;i++){await page.waitForTimeout(5000);await inspect('after-'+((i+1)*5)+'s');}
     }
     save();console.log('DONE '+command.action);
   } catch(error){ evidence.observations.push({error:error.message.slice(0,300)});save();console.log(JSON.stringify({error:error.message.slice(0,300)})); }
 }
} catch(error){evidence.failure=error.message.split('\n')[0];save();console.log(JSON.stringify({failure:evidence.failure}));}
finally{await context?.close();}
