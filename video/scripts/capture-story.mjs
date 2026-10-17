// Current review storyboard. Captures only the real app; no simulated controls.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { assets, work, launchBrowser } from './project.mjs';

const out = assets + '/captures';
mkdirSync(out, { recursive: true });
const root = resolve(work, 'app');
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://local').pathname.replace(/^\/colorfetti/, '');
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    res.writeHead(200, { 'Content-Type': ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser();
const metadata = JSON.parse(readFileSync(out+'/metadata.json','utf8'));
const errors = [];
async function checkpoint() {
  for(let attempt=0;;attempt++) {
    try { writeFileSync(out+'/metadata.json',JSON.stringify(metadata,null,2)+'\n'); return; }
    catch(error) { if(attempt===5) throw error; await new Promise(r=>setTimeout(r,200)); }
  }
}
const pair = count => ({ desktop: count === 1 ? ['town'] : ['town','platformer'], phone: count === 1 ? ['adventure'] : ['village','adventure'] });

async function open(mobile, art) {
  const context = await browser.newContext({ viewport: mobile ? {width:390,height:844} : {width:1280,height:720}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor:2, colorScheme:'dark' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType:'text/css',body:`@font-face{font-family:Schibsted Grotesk;font-style:normal;font-weight:100 900;src:url(data:font/ttf;base64,${readFileSync(assets+'/schibsted-grotesk.ttf').toString('base64')})}`}));
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  // Exact archived response, fetched once from Lospec, for repeatable offline captures.
  await page.route('https://lospec.com/palette-list/slso8.json', r => r.fulfill({contentType:'application/json',body:readFileSync(assets+'/slso8.json','utf8'),headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.goto(origin, {waitUntil:'networkidle'});
  const close = page.locator('dialog.help[open] button[aria-label="Close"]');
  if (await close.count()) await close.click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(art.map(name => assets+'/'+name+'.png'));
  await page.locator('.tiles .tile').nth(art.length-1).waitFor();
  await page.waitForTimeout(900);
  return {page,context,art};
}
async function palette(page, name) {
  if (!await page.locator('.palette-picker-header').count()) await page.getByRole('button',{name:'Palette',exact:true}).last().click();
  if (name) await page.getByRole('button',{name,exact:true}).click();
}
async function settings(page) {
  if (!await page.locator('.palette-settings-panel').count()) await page.getByRole('button',{name:'Palette settings',exact:true}).click();
}
async function control(page, key) {
  const chip = page.locator('.palette-setting-chip').and(page.getByRole('button',{name:new RegExp('^'+key+':')}));
  if (await chip.count()) await chip.click();
}
async function limit(page, count) {
  await control(page,'Max colors');
  const field = page.getByRole('spinbutton',{name:'Max colors value',exact:true});
  await field.fill(String(count)); await field.press('Enter');
}
async function cap(ctx, name, focus) {
  const {page,art} = ctx;
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(5,5);
  await page.waitForTimeout(650);
  const imageNames = await page.locator('.tiles .tile .caption-preview .name').allTextContents();
  if (imageNames.length !== art.length || imageNames.some((n,i) => n !== art[i]+'.png')) throw Error(name+': wrong artwork '+imageNames);
  if (await page.getByText('Retry needed',{exact:false}).count()) throw Error(name+': conversion failed');
  let box;
  if (focus) {
    const boxes = await page.locator(focus).evaluateAll(nodes => nodes.filter(n=>n.checkVisibility()).map(n=>{const b=n.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height};}));
    if (!boxes.length) throw Error(name+': no visible focus '+focus);
    const x=Math.min(...boxes.map(b=>b.x)), y=Math.min(...boxes.map(b=>b.y));
    box={x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
  }
  await page.screenshot({path:out+'/'+name+'.png'});
  const detail = await page.locator('.tiles .tile .art').first().boundingBox();
  metadata[name]={imageNames,wallCount:art.length,dpr:2,viewport:page.viewportSize(),panels:box?[box]:[],detail,focusSelector:focus||null};
  await checkpoint();
  console.log(name);
}
async function scene(count, prefix, callback, custom) {
  if(process.env.STORY_SCENES && !process.env.STORY_SCENES.split(',').includes(prefix)) return;
  const art = custom || pair(count);
  for (const [device,names] of Object.entries(art)) {
    const ctx=await open(device==='phone',names);
    try { await callback(ctx,device,prefix+'-'+device); } finally { await ctx.context.close(); }
  }
}
try {
  await scene(1,'intro',async(ctx,dev,n)=>cap(ctx,n));
  await scene(2,'choose',async(ctx,dev,n)=>{
    for (const [name,id] of [['Auto','auto'],['Mulfok 32','mulfok'],['ENDESGA 8','edg8'],['Black & White','mono']]) {
      await palette(ctx.page,name); await cap(ctx,n+'-'+id,'.panel');
    }
  });
  await scene(1,'import',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p); await p.getByRole('button',{name:'Import palette',exact:true}).click();
    await p.getByRole('button',{name:'Paste colors',exact:true}).click();
    await p.getByRole('textbox',{name:'Colors or Lospec link',exact:true}).fill('https://lospec.com/palette-list/slso8');
    await cap(ctx,n+'-link','.palette-method-panel:not([hidden])');
    await p.getByRole('button',{name:'Import from Lospec',exact:true}).click();
    await p.getByText('8 colors',{exact:true}).waitFor();
    await cap(ctx,n+'-review','.palette-draft-review');
    await p.getByRole('button',{name:'Save palette',exact:true}).click();
    await p.locator('.palette-import-modal').waitFor({state:'detached'});
    await cap(ctx,n+'-applied','.panel');
  });
  await scene(2,'recolor',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p,'Mulfok 32'); await settings(p);
    await cap(ctx,n+'-all','[data-setting="limit"], [data-setting="matching"], [data-setting="cleanup"]');
    await limit(p,8); await cap(ctx,n+'-eight','[data-setting="limit"]');
    await control(p,'Cleanup'); await p.getByRole('button',{name:'Cleanup on',exact:true}).click();
    await cap(ctx,n+'-cleanup','[data-setting="cleanup"]');
  });
  await scene(1,'dither',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p,'ENDESGA 8'); await settings(p); await control(p,'Dithering');
    await cap(ctx,n+'-off','[data-setting="dither"]');
    await p.getByRole('button',{name:'Dithering 4x4',exact:true}).click();
    await cap(ctx,n+'-on','[data-setting="dither"], [data-setting="strength"]');
    await control(p,'Dither strength'); const slider=p.getByRole('slider',{name:'Dither strength',exact:true});
    await slider.fill('80'); await slider.dispatchEvent('change');
    await cap(ctx,n+'-strength','[data-setting="strength"]');
  });
  await scene(2,'opacity',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p,'Mulfok 32'); await settings(p); await control(p,'Opacity');
    await cap(ctx,n+'-cut','[data-setting="opacity"]');
    await p.getByRole('button',{name:'Keep',exact:true}).click();
    await cap(ctx,n+'-keep','[data-setting="opacity"]');
  },{desktop:['spark','town'],phone:['puff','village']});
  await scene(1,'reuse',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p,'PICO-8'); await settings(p); await limit(p,8);
    await p.getByRole('button',{name:'Palette settings',exact:true}).click();
    // Full-source inspection publishes exact counts before the reuse gesture.
    await p.locator('.caption-preview').click(); await p.locator('.image-viewer[open]').waitFor();
    await p.waitForTimeout(900); await p.getByRole('button',{name:'Close preview',exact:true}).click();
    await cap(ctx,n+'-count','.tiles .tile .cap');
    if(dev==='phone') { await p.getByRole('button',{name:'Image actions for '+ctx.art[0]+'.png',exact:true}).click(); await p.getByRole('button',{name:'Reuse colors',exact:true}).click(); }
    else await p.getByRole('button',{name:'Reuse colors from '+ctx.art[0]+'.png',exact:true}).click();
    await p.locator('.palette-import-modal[open]').waitFor();
    await cap(ctx,n+'-editor','.palette-draft-review');
    await p.getByRole('textbox',{name:'Name',exact:true}).fill('My recolor');
    await p.getByRole('button',{name:'Save palette',exact:true}).click();
    await palette(p); await cap(ctx,n+'-saved','.panel');
  });
  await scene(2,'onebit',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p); await p.getByRole('button',{name:'1-bit',exact:true}).click();
    for(const [name,id] of [['Mono','mono'],['Game Boy','gameboy'],['Rose','rose']]) { await p.getByRole('button',{name,exact:true}).click(); await cap(ctx,n+'-'+id,'.panel'); }
  });
  await scene(1,'style',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p); await p.getByRole('button',{name:'1-bit',exact:true}).click(); await p.getByRole('button',{name:'Mono',exact:true}).click();
    await p.getByRole('button',{name:'Style',exact:true}).click(); await p.locator('button[aria-labelledby="style-label style-name"]').click(); await p.getByRole('button',{name:'Bayer',exact:true}).click();
    if(dev==='desktop') await p.getByRole('button',{name:'More settings',exact:true}).click();
    await cap(ctx,n+'-auto','.style-panel');
    const slider=p.getByRole('slider',{name:'Threshold',exact:true}); await slider.fill('140'); await slider.dispatchEvent('change');
    await cap(ctx,n+'-threshold','.style-panel');
    const chip=p.getByRole('button',{name:/^Matrix:/}); if(await chip.count()) await chip.click();
    await p.getByRole('group',{name:'Matrix',exact:true}).getByRole('button',{name:'8',exact:true}).click();
    await cap(ctx,n+'-matrix','.style-panel');
  });
  await scene(1,'inspect',async(ctx,dev,n)=>{
    const p=ctx.page; await palette(p,'PICO-8'); await p.locator('.caption-preview').click(); await p.locator('.image-viewer[open]').waitFor();
    await cap(ctx,n+'-fit');
    await p.getByRole('button',{name:'Zoom in',exact:true}).click({clickCount:4,delay:60});
    const artBox=await p.locator('.viewer-art').boundingBox();
    const x=artBox.x+artBox.width*.5,y=artBox.y+artBox.height*.5;
    await p.mouse.move(x,y); await p.mouse.down(); await p.mouse.move(x-70,y+35,{steps:8}); await p.mouse.up();
    await cap(ctx,n+'-zoom');
    await p.getByRole('button',{name:'Show original image',exact:true}).click();
    await cap(ctx,n+'-original');
  });
  // The comparison uses the same full-resolution Town source at identical scale.
  const ctx=await open(false,['town']);
  try {
    const p=ctx.page;
    async function result(name) {
      await p.locator('.caption-preview').click(); await p.locator('.image-viewer[open]').waitFor(); await p.waitForTimeout(800);
      const data=await p.locator('.image-viewer .art canvas').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>n.toDataURL()).at(-1));
      if(!data) throw Error('Missing full-resolution comparison');
      writeFileSync(assets+'/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
      await p.getByRole('button',{name:'Close preview',exact:true}).click();
    }
    await palette(p,'PICO-8'); await settings(p); await limit(p,8); await p.getByRole('button',{name:'Cleanup on',exact:true}).click(); await result('palette-result');
    await palette(p); await p.getByRole('button',{name:'1-bit',exact:true}).click(); await p.getByRole('button',{name:'Mono',exact:true}).click();
    await p.getByRole('button',{name:'Style',exact:true}).click(); await p.locator('button[aria-labelledby="style-label style-name"]').click(); await p.getByRole('button',{name:'Solid',exact:true}).click(); await result('onebit-solid');
  } finally {await ctx.context.close();}
  await scene(2,'outro',async(ctx,dev,n)=>{await palette(ctx.page,'Mulfok 32'); await ctx.page.getByRole('button',{name:'Palette',exact:true}).last().click(); await cap(ctx,n);});
  if(errors.length) throw Error(errors.join('\n'));
  await checkpoint();
  console.log('Captured '+Object.keys(metadata).length+' verified current-app screens.');
} finally { await browser.close(); server.close(); }
