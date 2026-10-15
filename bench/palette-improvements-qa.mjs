// Independent lifecycle checks against an unmodified production build.
// All external palette responses are synthetic and intercepted: no service calls.
// npm run build && node bench/palette-improvements-qa.mjs dist
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { deflateSync, crc32 } from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dist = path.resolve(process.argv[2] ?? 'dist');
const output = path.resolve('bench/palette-improvements-review');
const scratch = path.resolve('.tmp/palette-improvements-qa');
fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(scratch, { recursive: true });
const colors = ['#000000', '#ffffff', '#f04010', '#3050a0'];
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]), result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(data.length); body.copy(result, 4); result.writeUInt32BE(crc32(body), body.length + 4); return result;
}
function png(width, height, pixel) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows.set(pixel(x, y), y * (width * 4 + 1) + x * 4 + 1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('sRGB', Buffer.from([0])), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
const fixture = path.join(scratch, 'opacity.png'), second = path.join(scratch, 'new-wall.png');
fs.writeFileSync(fixture, png(32, 16, (x, y) => {
  const c = parseInt(colors[(x + y) % colors.length].slice(1), 16);
  return [c >>> 16, c >>> 8 & 255, c & 255, [0,1,127,128,254,255][(x + y) % 6]];
}));
fs.writeFileSync(second, png(16, 16, () => [171, 205, 239, 255]));
const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = url.pathname === '/colorfetti/' ? '/index.html' : url.pathname.replace(/^\/colorfetti/, '');
    const file = path.resolve(dist, '.' + decodeURIComponent(relative));
    if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    const type = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png' }[path.extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': type }).end(fs.readFileSync(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const results = { chromiumSandbox: true, scope: 'Synthetic held-response lifecycle checks in native Edge; no live external requests, OS clipboard, Safari or device claims.', phases: [] };
function phase(value) { results.phases.push(value); console.log('Passed: '+value.name); }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function start({ alphaMode = 'cut', workers = false, viewport = { width:1280, height:900 }, touch = false } = {}) {
  const context = await browser.newContext({ viewport, isMobile:touch, hasTouch:touch, acceptDownloads:true });
  await context.addInitScript(({ colors, alphaMode, workers }) => {
    localStorage.setItem('colorfetti-help-seen', '1');
    localStorage.setItem('colorfetti-palettes-v1', JSON.stringify({ version:1, palettes:[{ id:'user-qa', name:'QA target', colors, revision:1, source:{ kind:'custom' } }] }));
    localStorage.setItem('colorfetti', JSON.stringify({ family:'full-palette', paletteId:'user-qa', alphaCut:128, alphaMode, metric:'oklab', maxColors:0, cleanup:false, dither:'none', ditherStrength:50 }));
    if (workers) {
      const NativeWorker = window.Worker;
      window.__qaGeneratedHeld = []; window.__qaHoldGenerated = false; window.__qaGeneratedResults = 0;
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          super(url, options); this.__generated = String(url).includes('palette-generated-worker');
          if(this.__generated)this.addEventListener('message',event=>{if(event.data.type==='result')window.__qaGeneratedResults++;});
        }
        postMessage(message, transfer) {
          const send = () => super.postMessage(message, transfer);
          if (this.__generated && message.type === 'start' && window.__qaHoldGenerated) window.__qaGeneratedHeld.push(send);
          else send();
        }
      };
    }
  }, { colors, alphaMode, workers });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/colorfetti/');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(fixture);
  await page.locator('.grid .caption-preview').first().waitFor();
  return { context, page, errors };
}
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('colorfetti')));
async function openPreview(page) { await page.locator('.grid .caption-preview').first().click(); await page.getByRole('dialog', { name:'Image preview', exact:true }).waitFor(); }
async function openEditor(page) {
  await page.locator('button[aria-label="Palette"]').click();
  await page.getByRole('button', { name:'Import palette', exact:true }).click();
  await page.getByRole('button', { name:'Paste colors', exact:true }).click();
}
const draftColors = page => page.locator('.palette-review-grid button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label').split(' ').at(-1)));
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function layoutBounds(page, selectors) {
  return page.evaluate(selectors => {
    const width=document.documentElement.clientWidth,height=innerHeight;
    const boxes=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(node=>node.getClientRects().length).map(node=>{
      const r=node.getBoundingClientRect();return{selector,label:node.getAttribute('aria-label')||node.textContent.trim(),x:r.left,y:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    }));
    return {width,height,documentWidth:document.documentElement.scrollWidth,boxes};
  }, selectors);
}
function insideViewport(value, minimumTarget = false) {
  assert(value.documentWidth<=value.width+1,'Document overflows horizontally');
  for(const box of value.boxes){
    assert(box.x>=-1&&box.right<=value.width+1,'Horizontal bounds: '+JSON.stringify(box));
    assert(box.y>=-1&&box.bottom<=value.height+1,'Vertical reachability: '+JSON.stringify(box));
    if(minimumTarget)assert(box.width>=43.5&&box.height>=43.5,'Target smaller than44px: '+JSON.stringify(box));
  }
}
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true, chromiumSandbox:true });
  // Detached native cut handles cannot alter a hidden or replacement control.
  {
    const { context, page, errors } = await start();
    await page.getByRole('button', { name:'Palette settings', exact:true }).click();
    const old = await page.getByRole('slider', { name:'Palette opacity cut', exact:true }).elementHandle();
    await page.getByRole('button', { name:'Keep', exact:true }).click();
    await old.evaluate(node => { node.value='17'; node.dispatchEvent(new Event('input',{bubbles:true})); node.dispatchEvent(new Event('change',{bubbles:true})); });
    await settle(page); assert.equal((await stored(page)).alphaCut,128); assert.equal((await stored(page)).alphaMode,'keep');
    await page.getByRole('button', { name:'Cut', exact:true }).click();
    assert.equal(await page.getByRole('slider', { name:'Palette opacity cut', exact:true }).inputValue(),'128');
    assert.deepEqual(errors,[]); phase({ name:'detached opacity range after Keep', status:'passed' }); await context.close();
  }
  // Cancel an optional module download before it can create a network request.
  // A new request shares that module promise; only its owner may publish.
  {
    const { context, page, errors } = await start();
    const held = deferred(); let moduleRoute;
    await page.route('**/palette-lospec-*.js', route => { moduleRoute=route; held.resolve(); });
    const requests=[];
    await page.route('https://lospec.com/palette-list/*.json', async route => {
      requests.push(route.request().url());
      await route.fulfill({ status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({name:'Synthetic current',author:'QA',colors:['112233','aabbcc','ff0000']}) });
    });
    await openEditor(page); await page.getByRole('textbox',{name:'Name',exact:true}).fill('Kept draft');
    const input=page.getByRole('textbox',{name:'Colors or Lospec link',exact:true});
    await input.fill('#123456 #abcdef'); await page.getByRole('button',{name:'Review colors',exact:true}).click();
    await input.fill('https://lospec.com/palette-list/old'); await page.getByRole('button',{name:'Import from Lospec',exact:true}).click(); await held.promise;
    await page.getByRole('button',{name:'Cancel import',exact:true}).click();
    assert.equal(await input.isDisabled(),false); assert.deepEqual(await draftColors(page),['#123456','#abcdef']);
    await input.fill('https://lospec.com/palette-list/current'); await page.getByRole('button',{name:'Import from Lospec',exact:true}).click();
    await moduleRoute.continue();
    await page.waitForFunction(() => document.querySelectorAll('.palette-review-grid button').length===3);
    assert.deepEqual(requests,['https://lospec.com/palette-list/current.json']); assert.equal(await page.getByRole('textbox',{name:'Name',exact:true}).inputValue(),'Kept draft');
    assert.deepEqual(await draftColors(page),['#112233','#aabbcc','#ff0000']);
    // Text changes through a retained native handle invalidate the captured URL.
    const responseHeld=deferred(); let responseRoute;
    await page.route('https://lospec.com/palette-list/stale.json', route => {responseRoute=route;responseHeld.resolve();});
    await input.fill('https://lospec.com/palette-list/stale'); await page.getByRole('button',{name:'Import from Lospec',exact:true}).click(); await responseHeld.promise;
    await input.evaluate(node => {node.value='#fedcba';node.dispatchEvent(new Event('input',{bubbles:true}));});
    await responseRoute.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({colors:['999999']})});
    await page.waitForFunction(() => !document.querySelector('.palette-text-input').disabled);
    assert.deepEqual(await draftColors(page),['#112233','#aabbcc','#ff0000']);
    // Close/reopen another draft while an old response is held.
    const closedHeld=deferred(); let closedRoute;
    await page.route('https://lospec.com/palette-list/closed.json', route => {closedRoute=route;closedHeld.resolve();});
    await input.fill('https://lospec.com/palette-list/closed'); await page.getByRole('button',{name:'Import from Lospec',exact:true}).click(); await closedHeld.promise;
    await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
    await page.getByRole('button',{name:'Import palette',exact:true}).click(); await page.getByRole('button',{name:'Paste colors',exact:true}).click();
    await page.getByRole('textbox',{name:'Colors or Lospec link',exact:true}).fill('#222222'); await page.getByRole('button',{name:'Review colors',exact:true}).click();
    await closedRoute.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({colors:['888888']})}).catch(()=>{});
    await settle(page); assert.deepEqual(await draftColors(page),['#222222']); assert.deepEqual(errors,[]);
    phase({name:'Lospec module Cancel/new owner, stale text, close/reopen',status:'passed',externalNetworkRequests:0,syntheticCompletedRequests:requests.length}); await context.close();
  }
  // Pending count jobs must not republish after the conversion or item changes.
  for (const change of ['reset','family','remove']) {
    const { context,page,errors }=await start({alphaMode:'keep'}),held=deferred(); let moduleRoute;
    await page.route('**/palette-usage-*.js',route=>{moduleRoute=route;held.resolve();});
    await openPreview(page); await page.getByRole('button',{name:'Count output colors',exact:true}).click(); await held.promise;
    await page.getByRole('button',{name:'Close preview',exact:true}).click();
    if(change==='reset'){await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.getByRole('button',{name:'Reset palette settings',exact:true}).click();}
    if(change==='family'){await page.locator('button[aria-label="Palette"]').click();await page.getByRole('button',{name:'1-bit',exact:true}).click();}
    if(change==='remove')await page.getByRole('button',{name:'Remove opacity.png',exact:true}).click();
    await moduleRoute.continue(); await settle(page);
    assert.equal(await page.locator('.grid .cap').filter({hasText:/colors? used|Counting colors/}).count(),0);
    assert.deepEqual(errors,[]); phase({name:'Count canceled by '+change,status:'passed'});await context.close();
  }
  // Delaying the actual worker start exercises a shared Auto request. The old
  // preview swatches change when it completes; that must not invalidate Count.
  {
    const {context,page,errors}=await start({workers:true});
    await page.locator('button[aria-label="Palette"]').click();await page.getByRole('button',{name:'Auto',exact:true}).click();
    await page.waitForFunction(()=>window.__qaGeneratedResults>0);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('colorfetti')).paletteId==='generated-32');
    await page.evaluate(()=>window.__qaHoldGenerated=true);
    await page.locator('input[type=file][accept="image/*"]').setInputFiles(second);
    await page.waitForFunction(()=>window.__qaGeneratedHeld.length>0);
    if(await page.locator('button[aria-label="Palette"]').getAttribute('aria-expanded')==='true')await page.locator('button[aria-label="Palette"]').click();
    await openPreview(page);await page.getByRole('button',{name:'Count output colors',exact:true}).click();
    await page.getByRole('button',{name:'Counting colors…',exact:true}).waitFor();
    await page.evaluate(()=>{window.__qaHoldGenerated=false;for(const send of window.__qaGeneratedHeld.splice(0))send();});
    await page.getByRole('button',{name:/^Use \d+ output colors?$/}).waitFor();
    await page.getByRole('button',{name:'Close preview',exact:true}).click();
    assert.equal(await page.locator('.grid .cap').filter({hasText:/\d+ colors? used/}).count(),1);assert.deepEqual(errors,[]);
    phase({name:'Auto refresh completes pending Count despite preview palette replacement',status:'passed'});await context.close();
  }
  // Deliberately remove the test page's global optout so desktop Chromium's
  // emulated Auto Dark algorithm actually runs. A raw CSS control must change
    // pixels, while production display-only canvas swatches/pies must stay exact.
  // This isolates the fallback renderer; it does not reproduce Brave preferences.
  {
    let sharp;try{sharp=require('sharp');}catch{sharp=require(process.env.SHARP_MODULE??'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
    const {context,page,errors}=await start(),cdp=await context.newCDPSession(page);
    await page.locator('button[aria-label="Palette"]').click();await page.getByRole('button',{name:'PICO-8',exact:true}).click();
    await page.getByRole('button',{name:'Edit palette',exact:true}).click();
    await page.getByRole('button',{name:'HEX backup',exact:true}).waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('.palette-review-swatch canvas')].length===16&&[...document.querySelectorAll('.palette-review-swatch canvas')].every(canvas=>canvas.width===1&&canvas.height===1));
    await page.evaluate(()=>{
      document.documentElement.style.setProperty('color-scheme','light','important');document.querySelector('meta[name="color-scheme"]').content='light';
      const chip=document.createElement('div');chip.id='qa-css-dark-control';chip.style.cssText='position:fixed;left:10px;top:10px;width:44px;height:44px;background:#fff1e8;z-index:100000;pointer-events:none';document.querySelector('.palette-editor').append(chip);
    });
    const boxes=await page.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{color:node.getAttribute('aria-label').match(/#[a-f0-9]{6}/i)[0],x:r.x+r.width/2,y:r.y+r.height/2};}));
    const control=await page.locator('#qa-css-dark-control').boundingBox();
    async function screenshotPixels(filename){const bytes=await page.screenshot({path:path.join(output,filename),animations:'disabled'}),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{xScale:info.width/1280,yScale:info.height/900,at(x,y){const offset=(Math.floor(y*info.height/900)*info.width+Math.floor(x*info.width/1280))*4;return[...data.subarray(offset,offset+4)];}};}
    const rgba=color=>[...Buffer.from(color.slice(1),'hex'),255];
    await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:false});await settle(page);
    const baseline=await screenshotPixels('edge-swatch-autodark-off.png');
    assert.deepEqual(baseline.at(control.x+22,control.y+22),rgba('#fff1e8'),'Baseline CSS control');
    for(const box of boxes)assert.deepEqual(baseline.at(box.x,box.y),rgba(box.color),'Baseline canvas solid '+box.color);
    await cdp.send('Emulation.setAutoDarkModeOverride',{enabled:true});await settle(page);
    const dark=await screenshotPixels('edge-swatch-autodark-on.png'),controlPixel=dark.at(control.x+22,control.y+22);
    assert.notDeepEqual(controlPixel,rgba('#fff1e8'),'Auto Dark was not active: raw CSS control did not change');
    for(const box of boxes)assert.deepEqual(dark.at(box.x,box.y),rgba(box.color),'Forced-dark canvas solid '+box.color);
      async function inputGeometry(label){
        const input=page.getByLabel(label,{exact:true});await input.scrollIntoViewIfNeeded();
        const geometry=await input.evaluate(node=>{const r=node.getBoundingClientRect(),canvas=node.parentElement.querySelector('canvas'),c=canvas.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===node,paintWidth:c.width,paintHeight:c.height,pointerEvents:getComputedStyle(canvas).pointerEvents,value:node.value};});
        assert.equal(geometry.width,44,label+' input width');assert.equal(geometry.height,44,label+' input height');assert.equal(geometry.paintWidth,36);assert.equal(geometry.paintHeight,36);assert.equal(geometry.hit,true,label+' overlay intercepted native input');assert.equal(geometry.pointerEvents,'none');
        return{input,geometry};
      }
      const initialAdd=await inputGeometry('New color');
      assert.deepEqual((await screenshotPixels('edge-input-autodark-initial.png')).at(initialAdd.geometry.x,initialAdd.geometry.y),rgba(initialAdd.geometry.value),'New color overlay initial');
      await initialAdd.input.evaluate(node=>{node.value='#123456';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});await settle(page);
      const changedAdd=await inputGeometry('New color');assert.equal(changedAdd.geometry.value,'#123456');
      assert.deepEqual((await screenshotPixels('edge-input-autodark-new.png')).at(changedAdd.geometry.x,changedAdd.geometry.y),rgba('#123456'),'New color overlay value update');
      await page.getByRole('button',{name:'Add color',exact:true}).click();
      assert.equal(await page.locator('.palette-review-swatch').count(),17,'Native input binding did not append selected RGB');assert(await page.locator('.palette-review-swatch').last().getAttribute('aria-label').then(label=>label.endsWith('#123456')));
      const first=page.locator('.palette-review-swatch').first();await first.click();assert.equal(await first.getAttribute('aria-pressed'),'true');
      const initialEdit=await inputGeometry('Edit color');assert.equal(initialEdit.geometry.value,'#000000');
      assert.deepEqual((await screenshotPixels('edge-input-autodark-edit-before.png')).at(initialEdit.geometry.x,initialEdit.geometry.y),rgba('#000000'),'Edit color overlay initial');
      await initialEdit.input.evaluate(node=>{node.value='#abcdef';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});await settle(page);
      const changedEdit=await inputGeometry('Edit color');assert.equal(changedEdit.geometry.value,'#abcdef');assert(await first.getAttribute('aria-label').then(label=>label.endsWith('#abcdef')));
      const editPixels=await screenshotPixels('edge-input-autodark-edit-after.png');assert.deepEqual(editPixels.at(changedEdit.geometry.x,changedEdit.geometry.y),rgba('#abcdef'),'Edit color overlay value update');
      const firstCenter=await first.evaluate(node=>{const r=node.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});assert.deepEqual(editPixels.at(firstCenter.x,firstCenter.y),rgba('#abcdef'),'Edited review swatch did not repaint');
      await first.press('Space');assert.equal(await first.getAttribute('aria-pressed'),'false');
    await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.full-active-palette canvas,.palette-choice[aria-pressed="true"] canvas')].length===2&&[...document.querySelectorAll('.full-active-palette canvas,.palette-choice[aria-pressed="true"] canvas')].every(canvas=>canvas.width===100&&canvas.height===100));
    const pieColors=boxes.map(box=>box.color),pies=await page.locator('.full-active-palette canvas,.palette-choice[aria-pressed="true"] canvas').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
    assert.equal(pies.length,2,'Selected32px/rail44px pie images missing');
    const piePixels=await screenshotPixels('edge-pie-autodark-on.png');
    for(const pie of pies)for(let i=0;i<pieColors.length;i++){
      const theta=(i+.5)*Math.PI*2/pieColors.length,x=pie.x+pie.width/2+Math.sin(theta)*pie.width*.3,y=pie.y+pie.height/2-Math.cos(theta)*pie.height*.3;
      assert.deepEqual(piePixels.at(x,y),rgba(pieColors[i]),'Forced-dark clockwise pie sector '+i);
    }
      assert.deepEqual(errors,[]);phase({name:'Auto Dark changes CSS control but preserves sixteen canvas swatches, native input overlays and both palette pies',status:'passed',setup:'CDP Auto Dark on; test-only CSS/meta light removes the global only optout; source build unchanged',cssControlExpected:'#fff1e8',cssControlActual:controlPixel,exactSolidColors:boxes.map(box=>box.color),pieSectorsChecked:pies.length*pieColors.length,nativeInputChecks:{targetSize:44,overlaySize:36,centerHit:'native input',newColor:'#123456',editedColor:'#abcdef',events:'native element input/change dispatched; OS picker not opened'},screenshots:['edge-swatch-autodark-off.png','edge-swatch-autodark-on.png','edge-pie-autodark-on.png','edge-input-autodark-initial.png','edge-input-autodark-new.png','edge-input-autodark-edit-before.png','edge-input-autodark-edit-after.png']});
    await context.close();
  }
  // Narrow portrait and short landscape use coarse-pointer CSS, native dialogs
  // and actual converted count state. These are layout checks, not device tests.
  for(const viewport of [{width:320,height:568},{width:568,height:320}]){
    const {context,page,errors}=await start({viewport,touch:true}),prefix=`layout-${viewport.width}x${viewport.height}`;
    await page.route('https://lospec.com/**',route=>route.abort());
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();
    const strength=page.getByRole('slider',{name:'Dither strength',exact:true});await strength.scrollIntoViewIfNeeded();
    // The accessible range name is stable even if its DOM id changes.
    const range=await strength.boundingBox();assert(range&&range.width>=44&&range.height>=44,'Dither strength target');
    assert(range.x>=-1&&range.x+range.width<=viewport.width+1&&range.y>=-1&&range.y+range.height<=viewport.height+1,'Dither strength reachability');
    await page.getByRole('button',{name:'Keep',exact:true}).scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Keep',exact:true}).click();
    const opacity=await layoutBounds(page,['[aria-labelledby="palette-opacity-label"] button']);insideViewport(opacity,true);
    await page.getByRole('button',{name:'Cut',exact:true}).click();
    await page.getByRole('slider',{name:'Palette opacity cut',exact:true}).scrollIntoViewIfNeeded();
    const cutoff=await layoutBounds(page,['#full-alpha-cut']);insideViewport(cutoff,true);
    await page.screenshot({path:path.join(output,prefix+'-settings.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    await openPreview(page);await page.getByRole('button',{name:'Count output colors',exact:true}).click();
    const use=page.getByRole('button',{name:/^Use \d+ output colors?$/});await use.waitFor();
    const preview=await layoutBounds(page,['.viewer-workspace button']);insideViewport(preview,true);
    await page.screenshot({path:path.join(output,prefix+'-preview.png'),animations:'disabled'});
    await use.click();await page.getByRole('button',{name:'HEX backup',exact:true}).waitFor();
    const editor=await layoutBounds(page,['.palette-editor']);insideViewport(editor);
    const editorActions=await layoutBounds(page,['.palette-editor [aria-label="HEX backup"]','.palette-editor [aria-label="Close palette editor"]','.palette-editor .palette-save-action']);insideViewport(editorActions,true);
    await page.screenshot({path:path.join(output,prefix+'-reuse-editor.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Close palette editor',exact:true}).click();await page.getByRole('button',{name:'Close preview',exact:true}).click();
    await openEditor(page);
    const link=page.getByRole('textbox',{name:'Colors or Lospec link',exact:true});
    await link.fill('https://lospec.com/palette-list/a-long-example-palette-link-for-layout-review');
    const importButton=page.getByRole('button',{name:'Import from Lospec',exact:true});await importButton.scrollIntoViewIfNeeded();
    const importBounds=await layoutBounds(page,['.palette-link-hint','.palette-text-input']);
    for(const box of importBounds.boxes)assert(box.x>=-1&&box.right<=importBounds.width+1,'Palette link content width');
    const importTarget=await importButton.boundingBox();assert(importTarget&&importTarget.width>=44&&importTarget.height>=44,'Import button target');
    await page.screenshot({path:path.join(output,prefix+'-lospec-editor.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
    // Outside presses intentionally dismiss the dock without activating a tile.
    if(await page.locator('button[aria-label="Palette"]').getAttribute('aria-expanded')==='true')await page.locator('button[aria-label="Palette"]').click();
    // A dense wall must clip its metadata inside the caption instead of letting
    // the new count run under the adjacent Image actions button.
    await page.locator('input[type=file][accept="image/*"]').setInputFiles(Array.from({length:8},(_,i)=>({name:`tile-${i+1}.png`,mimeType:'image/png',buffer:fs.readFileSync(fixture)})));
    await page.waitForFunction(()=>document.querySelectorAll('.grid .caption-preview').length===9);
    for(let i=0;i<9;i++){
      await page.locator('.grid .caption-preview').nth(i).click();
      await page.getByRole('dialog',{name:'Image preview',exact:true}).waitFor();
      const count=page.getByRole('button',{name:'Count output colors',exact:true});
      if(await count.count())await count.click();
      await page.getByRole('button',{name:/^Use \d+ output colors?$/}).waitFor();
      await page.getByRole('button',{name:'Close preview',exact:true}).click();
      await page.getByRole('dialog',{name:'Image preview',exact:true}).waitFor({state:'hidden'});
    }
    const captions=await page.locator('.grid .cap').evaluateAll(nodes=>nodes.map(node=>{
      const preview=node.querySelector('.caption-preview'),dim=node.querySelector('.dim'),more=node.querySelector('.tile-share'),r=preview.getBoundingClientRect(),m=more.getBoundingClientRect(),t=dim.getBoundingClientRect(),style=getComputedStyle(dim);
      const number=dim.querySelector('span')?.firstChild,match=number?.textContent.match(/^\d+/),range=document.createRange();
      let usedNumber=null;if(match){range.setStart(number,0);range.setEnd(number,match[0].length);const box=range.getBoundingClientRect();usedNumber={text:match[0],left:box.left,right:box.right,width:box.width};}
      return{text:dim.textContent,captionWidth:node.clientWidth,previewRight:r.right,moreLeft:m.left,dimLeft:t.left,dimRight:t.right,usedNumber,truncated:dim.scrollWidth>dim.clientWidth,overflow:style.overflowX,ellipsis:style.textOverflow};
    }));
    assert(captions.length===9&&captions.every(c=>/^\d+ colors? used.*32×16/.test(c.text)),'Dense captions must prioritize used counts before dimensions');
    for(const cap of captions){assert(cap.usedNumber&&cap.usedNumber.width>0&&cap.usedNumber.left>=cap.dimLeft-1&&cap.usedNumber.right<=cap.dimRight+1,'Used count number is clipped');assert(cap.dimRight<=cap.previewRight+1,'Metadata exceeds its Preview target');assert(cap.previewRight<=cap.moreLeft+1,'Metadata overlaps Image actions');if(cap.truncated)assert(cap.overflow==='hidden'&&cap.ellipsis==='ellipsis','Truncated count lacks clipping');}
    await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('.grid').scrollTop=0;});
    await page.screenshot({path:path.join(output,prefix+'-wall.png'),animations:'disabled'});assert.deepEqual(errors,[]);
    phase({name:`Touch layout ${viewport.width}x${viewport.height}`,status:'passed',viewport,strengthTarget:range,opacity,cutoff,preview,editor,editorActions,importBounds,importTarget,captions,screenshots:['settings','preview','reuse-editor','lospec-editor','wall'].map(name=>prefix+'-'+name+'.png')});
    await context.close();
  }
  const index=fs.readFileSync(path.join(dist,'index.html'));
  results.status='passed';results.productionIndexSha256=createHash('sha256').update(index).digest('hex');results.completedAt=new Date().toISOString();
  fs.writeFileSync(path.join(output,'edge-results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:results.status,phases:results.phases.length,result:'bench/palette-improvements-review/edge-results.json',productionIndexSha256:results.productionIndexSha256}));
} catch(error) {
  results.status='failed';results.error={message:error.message,stack:error.stack};results.completedAt=new Date().toISOString();
  fs.writeFileSync(path.join(output,'edge-results.json'),JSON.stringify(results,null,2)+'\n');
  throw error;
} finally { await browser?.close();await new Promise(resolve=>server.close(resolve)); }
