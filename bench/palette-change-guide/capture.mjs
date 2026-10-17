import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,chromiumSandbox:true});
const folder=path.resolve('bench/palette-change-guide');
await mkdir(folder,{recursive:true});
const receipt={before:'f08d4d3f6e3df771d17524f00f1bba2e492c4ec0',after:'d91d9d1',browser:await browser.version(),chromiumSandbox:true,viewport:{width:1280,height:900},captures:[]};
const fixture=name=>path.resolve('bench/claude-audit-2026-10-15/service/fixtures',name);
async function screenshot(page,version,id,note){await page.mouse.move(5,5);await page.waitForTimeout(350);const file=`${id}-${version}.png`;await page.screenshot({path:path.join(folder,file)});receipt.captures.push({id,version,file,note,url:page.url()});console.log('Captured',file);}
async function load(version,input='knight-a.png'){
 const page=await browser.newPage({viewport:receipt.viewport,deviceScaleFactor:1,colorScheme:'dark'});
 await page.goto(`http://127.0.0.1:${version==='before'?5332:5333}/colorfetti/`);
 await page.getByRole('button',{name:'Got it',exact:true}).click();
 await page.locator('input[type=file]').first().setInputFiles(fixture(input));
 await page.waitForTimeout(600);return page;
}
const settings=page=>page.getByRole('button',{name:'Palette settings',exact:true});
const palette=page=>page.getByRole('button',{name:'Palette',exact:true}).last();
async function cap(page,n){await page.getByRole('spinbutton',{name:'Max colors value'}).fill(String(n));await page.getByRole('spinbutton',{name:'Max colors value'}).press('Enter');await page.waitForTimeout(600);}
for(const version of ['before','after']){
 const page=await load(version);
 await settings(page).click();
 await screenshot(page,version,'01-recolor-controls','Fresh Auto palette, all colors, Oklab, Cleanup off; new dithering defaults off.');
 await cap(page,8);
 if(version==='after')await page.getByRole('button',{name:'Dithering 4x4',exact:true}).click();
 await screenshot(page,version,'02-dithering-strength','Auto palette, max 8 colors, Oklab. Before: no full-palette dithering; after: 4×4, 50% strength.');
 await settings(page).click();
 await screenshot(page,version,'03-dither-output','Same owned knight-a.png, Auto, 8-color limit. After uses optional 4×4 dithering at 50%; this is an example, not a claim dithering is always better.');
 if(version==='after'){await settings(page).click();await page.getByRole('button',{name:'Dithering off',exact:true}).click();await settings(page).click();}
 await page.getByRole('button',{name:'Preview knight-a.png',exact:true}).first().click();
 if(version==='after'){await page.getByRole('button',{name:'Count output colors',exact:true}).click();await page.getByRole('button',{name:/^Use \d+ output colors$/}).waitFor();}
 await screenshot(page,version,'04-output-count','Same 8-color Auto result in the image viewer. Before has no count action; after counts full-resolution output.');
 if(version==='after')await page.getByRole('button',{name:/^Use \d+ output colors$/}).click();
 else{await page.getByRole('button',{name:'Close preview',exact:true}).click();await palette(page).click();await page.getByRole('button',{name:'Import palette',exact:true}).click();}
 await screenshot(page,version,'05-reuse-output-palette','Before: existing empty import dialog. After: Use output colors opens a draft containing exactly the used colors, ready to name, save or HEX backup; not auto-saved.');
 await page.getByRole('button',{name:'Close palette editor',exact:true}).click();
 if(await page.getByRole('button',{name:'Close preview',exact:true}).count())await page.getByRole('button',{name:'Close preview',exact:true}).click();
 if(!(await page.getByRole('group',{name:'Full palettes',exact:true}).count()))await palette(page).click();
 await screenshot(page,version,'06-palettes-start','Preset rail beginning; Auto is not counted as a fixed preset. Nine fixed presets before, eleven after.');
 await page.getByRole('button',{name:'Paper',exact:true}).scrollIntoViewIfNeeded();
 await screenshot(page,version,'07-palettes-end','Preset rail end; Black & white is new, ENDESGA 8 appears earlier in the rail.');
 await page.getByRole('button',{name:'Import palette',exact:true}).click();
 await page.getByRole('button',{name:'Paste colors',exact:true}).click();
 await page.locator('textarea').fill('https://lospec.com/palette-list/endesga-8');
 await page.getByRole('button',{name:version==='before'?'Review colors':'Import from Lospec',exact:true}).click();
 await page.waitForTimeout(1800);
 await screenshot(page,version,'08-lospec-import','Same public ENDESGA 8 Lospec URL pasted into the existing import dialog. Actual live browser fetch; receipt records any error.');
 receipt[`${version}LospecDialog`]=await page.getByRole('dialog').last().innerText();
 await page.close();
 const glow=await load(version,'glow-alpha.png');
 await palette(glow).click();await glow.getByRole('button',{name:'PICO-8',exact:true}).click();await palette(glow).click();
 await settings(glow).click();
 if(version==='after')await glow.getByRole('button',{name:'Keep',exact:true}).click();
 await screenshot(glow,version,'09-opacity-controls','Owned glow-alpha.png, PICO-8, all colors, Oklab, Cleanup/dither off. Before Cut128; after optional Keep retains source opacity.');
 await settings(glow).click();
 await screenshot(glow,version,'10-opacity-output','Same owned soft-alpha image and PICO-8 palette. After Keep preserves soft transparency; Cut remains default.');
 await glow.getByRole('button',{name:'More',exact:true}).click();await glow.getByRole('button',{name:'Help',exact:true}).click();
 await screenshot(glow,version,'11-help','Help Recolor wording now covers dithering. In Keep with soft-alpha input, Save recommends PNG for exact translucent colors.');
 await glow.close();
 const mobile=await load(version);await mobile.setViewportSize({width:390,height:844});
 await settings(mobile).click();await cap(mobile,8);
 if(version==='after')await mobile.getByRole('button',{name:'Dithering 4x4',exact:true}).click();
 await screenshot(mobile,version,'12-mobile-recolor','Responsive desktop-browser viewport 390×844; not a phone or physical-device test. Before has no dither row; after strength is named explicitly and shown only when enabled.');
 await mobile.close();
}
await writeFile(path.join(folder,'capture-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
await browser.close();
