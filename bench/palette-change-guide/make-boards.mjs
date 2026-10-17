import {readFile,writeFile}from'node:fs/promises';
import path from'node:path';
import{createRequire}from'node:module';
const root=path.resolve('bench/palette-change-guide');
const groups=[['overview-controls','Dithering and clearer controls',[
 ['02-dithering-strength','New optional full-palette dithering · clear strength label'],
 ['03-dither-output','Same eight-color result · nearest before / 4×4 at 50% after'],
 ['12-mobile-recolor','Responsive controls · 390 px viewport (desktop emulation)']]],
 ['overview-palettes','Preset additions and Lospec import',[
 ['06-palettes-start','Preset rail · ENDESGA 8 added'],['07-palettes-end','Preset rail · exact Black & white added'],['08-lospec-import','Same Lospec link · rejected before / live eight-color import after']]],
 ['overview-output','Output colors and transparency',[
 ['04-output-count','Count full output colors in Preview'],['05-reuse-output-palette','Open used colors as a palette draft'],['10-opacity-output','Cut before / optional Keep after · PICO-8, same soft glow']]],
 ['overview-help','Opacity controls and Help',[
 ['09-opacity-controls','Explicit Cut / Keep choice · Cut remains default'],['11-help','Help explains Recolor and exact translucent PNG saving']]],
 ['overview-fixes','Color display and Firefox import fixes',[
 ['fixes/forced-dark','Same PICO-8 palette · controlled forced-dark desktop emulation'],
 ['fixes/firefox','Historical Firefox comparison around fix 376a55c · not an f08 rebuild']]]];
const css=`*{box-sizing:border-box}body{margin:0;padding:24px;background:#f6f4ef;color:#26323a;font-family:system-ui,sans-serif}header{display:flex;justify-content:space-between;align-items:end;margin:0 0 20px}h1{font-size:25px;margin:0}header p{margin:0;color:#546169;font-size:13px}section{background:#fff;padding:16px;border:1px solid #ddd;border-radius:14px;margin:0 0 16px}h2{font-size:17px;margin:0 0 10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}figure{margin:0;min-width:0}figcaption{font-size:13px;font-weight:700;margin:0 0 6px}img{width:100%;height:auto;max-height:370px;object-fit:contain;object-position:center;background:#283138;border:1px solid #aaa;border-radius:6px}.mobile img{height:390px;width:100%;object-fit:contain}footer{font-size:12px;color:#52616a;margin:6px}`;
const {chromium}=createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
for(const[name,title,items]of groups){const html=`<!doctype html><meta charset="utf-8"><title>${title}</title><style>${css}</style><header><h1>${title}</h1><p>Actual app screenshots · f08d4d3 → d91d9d1</p></header>${items.map(([id,label])=>`<section class="${id.includes('mobile')?'mobile':''}"><h2>${label}</h2><div class="pair">${['before','after'].map(v=>`<figure><figcaption>${id==='fixes/firefox'?(v==='before'?'BEFORE FIX · retained Firefox capture':'AFTER FIX · retained Firefox capture'):(v==='before'?'BEFORE · f08d4d3':'AFTER · d91d9d1')}</figcaption><img src="${id}-${v}.png"></figure>`).join('')}</div></section>`).join('')}<footer>${name==='overview-fixes'?'Forced-dark: same test-only light color-scheme override allows CDP darkening to exercise both paint paths; no production changes. Firefox: historical matched captures, not a new physical-device test. ':''}Matching owned inputs and stated settings. Screenshots show appearance, not a guarantee of exact exported bytes. Full-size originals and details in the screenshot gallery.</footer>`;await writeFile(path.join(root,name+'.html'),html);const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});await page.goto(`http://127.0.0.1:5334/${name}.html`);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.screenshot({path:path.join(root,name+'.png'),fullPage:true});console.log(name);await page.close();}
await browser.close();
