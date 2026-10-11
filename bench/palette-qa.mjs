// Built-app palette regression through real controls, with independent file decoding.
// npm run build && node bench/palette-qa.mjs dist
// BROWSER overrides the Chromium executable; PLAYWRIGHT_MODULE overrides its package.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';
import { unzipSync } from 'fflate';
import omggif from 'omggif';
import { analyze, mask, colorize, unify } from '../src/lib/bitify.js';
import { PRESETS, STYLES, inks } from '../src/lib/presets.js';
import { defaults } from '../src/lib/settings.js';
import { FULL_PRESETS } from '../src/lib/palette-library.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright')); }
catch { ({ chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const dist = resolve(process.argv[2] ?? 'dist'), scratch = resolve('.tmp/palette-qa');
mkdirSync(scratch, { recursive: true });
// The unchanged engine is the pre-feature conversion oracle; the file reader
// below shares no encoder implementation. This assertion detects accidental
// changes to the oracle itself rather than letting both sides agree on a bug.
for (const file of ['bitify.js', 'presets.js', 'settings.js']) {
  assert.equal(readFileSync(`src/lib/${file}`, 'utf8').replaceAll('\r\n', '\n'), execFileSync('git', ['show', `${process.env.BASE_REF ?? 'HEAD'}:src/lib/${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n'), `Legacy ${file} differs from baseline`);
}
// Byte compatibility uses the old encoders themselves, not today's encoder
// on both sides. Only the PNG helper's immutable hex parser import is relocated.
const baselineRef = process.env.BASE_REF ?? 'HEAD';
writeFileSync(resolve(scratch,'baseline-save.mjs'),execFileSync('git',['show',`${baselineRef}:src/lib/save.js`],{encoding:'utf8'}).replace("from './bitify.js'","from '../../src/lib/bitify.js'"));
writeFileSync(resolve(scratch,'baseline-gif.mjs'),execFileSync('git',['show',`${baselineRef}:src/lib/gif.js`],{encoding:'utf8'}));
const { pngBytes: baselinePngBytes } = await import(pathToFileURL(resolve(scratch,'baseline-save.mjs')));
const { encodeGif: baselineEncodeGif } = await import(pathToFileURL(resolve(scratch,'baseline-gif.mjs')));

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]), result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(data.length); body.copy(result, 4); result.writeUInt32BE(crc32(body), body.length + 4); return result;
}
function sourcePng(w, h, pixels) {
  const head = Buffer.alloc(13); head.writeUInt32BE(w); head.writeUInt32BE(h, 4); head.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rows.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IHDR', head), pngChunk('sRGB', Buffer.from([0])), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
}
function readPng(bytes) {
  bytes = Buffer.from(bytes); assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  const chunks = new Map();
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at), body = bytes.subarray(at + 4, at + 8 + length);
    assert.equal(crc32(body), bytes.readUInt32BE(at + 8 + length), 'PNG CRC');
    const type = body.subarray(0, 4).toString();
    if (type === 'IDAT') chunks.set(type, Buffer.concat([chunks.get(type) ?? Buffer.alloc(0), body.subarray(4)]));
    else chunks.set(type, body.subarray(4));
    at += length + 12;
  }
  const head = chunks.get('IHDR'), w = head.readUInt32BE(0), h = head.readUInt32BE(4), depth = head[8], type = head[9];
  assert.ok(type === 3 || type === 6 || type === 2); assert.equal(head[12], 0);
  const palette = chunks.get('PLTE'), alpha = chunks.get('tRNS'), raw = inflateSync(chunks.get('IDAT'));
  const rowBytes = Math.ceil(w * (type === 6 ? 32 : type === 2 ? 24 : depth) / 8), stride = rowBytes + 1;
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 1, unfiltered = new Uint8Array(rowBytes * h), pixels = new Uint8Array(w * h * 4);
  assert.equal(raw.length, stride * h);
  const paeth = (a,b,c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < h; y++) {
    const filter = raw[y * stride]; assert.ok(filter <= 4);
    for (let x = 0; x < rowBytes; x++) {
      const at = y * rowBytes + x, a = x < bpp ? 0 : unfiltered[at - bpp], b = y ? unfiltered[at - rowBytes] : 0, c = y && x >= bpp ? unfiltered[at - rowBytes - bpp] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a,b,c);
      unfiltered[at] = (raw[y * stride + 1 + x] + predictor) & 255;
    }
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (type === 6) pixels.set(unfiltered.subarray(y * rowBytes + x * 4, y * rowBytes + 4 + x * 4), p);
      else if (type === 2) { pixels.set(unfiltered.subarray(y * rowBytes + x * 3, y * rowBytes + 3 + x * 3), p); pixels[p + 3] = 255; }
      else {
        const bit = x * depth, index = (unfiltered[y * rowBytes + (bit >> 3)] >> (8 - depth - bit % 8)) & ((1 << depth) - 1);
        const a = alpha?.[index] ?? 255;
        if (a) pixels.set(palette.subarray(index * 3, index * 3 + 3), p);
        pixels[p + 3] = a;
      }
      if (!pixels[p + 3]) pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
    }
  }
  return { w, h, depth, type, pixels };
}
function readGif(bytes) {
  const reader = new omggif.GifReader(bytes), frames = [];
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i), pixels = new Uint8Array(reader.width * reader.height * 4);
    assert.equal(info.disposal, 2); reader.decodeAndBlitFrameRGBA(i, pixels);
    frames.push({ pixels, delay: info.delay * 10 });
  }
  return { w: reader.width, h: reader.height, loop: reader.loopCount(), frames };
}
function hash(bytes) { let n = 2166136261; for (const byte of bytes) n = Math.imul(n ^ byte, 16777619); return n >>> 0; }
function samePixels(actual, expected, label) { assert.equal(actual.length, expected.length, label); for (let i = 0; i < actual.length; i++) assert.equal(actual[i], expected[i], `${label} byte${i}`); }

// Separate scalar Oklab/encoded-RGB reference without the implementation's cache,
// prepared palette or quantizer. Exact RGB is checked first; ties keep index0.
function lab(r, g, b) {
  const linear = value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  r = linear(r); g = linear(g); b = linear(b);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
function nearestReference(original, colors, alphaCut = 128, metric = 'oklab') {
  const rgb = colors.map(hex => [1,3,5].map(at => parseInt(hex.slice(at, at + 2), 16))), labs = rgb.map(v => metric === 'rgb' ? v : lab(...v));
  const output = new Uint8Array(original.data.length);
  for (let p = 0; p < output.length; p += 4) {
    const data = original.data;
    if (data[p + 3] === 0 || data[p + 3] < alphaCut) continue;
    let chosen = rgb.findIndex(v => v[0] === data[p] && v[1] === data[p + 1] && v[2] === data[p + 2]);
    if (chosen < 0) {
      const value = metric === 'rgb' ? [data[p], data[p + 1], data[p + 2]] : lab(data[p], data[p + 1], data[p + 2]); let best = Infinity;
      for (let i = 0; i < labs.length; i++) {
        const distance = labs[i].reduce((sum, v, n) => sum + (v - value[n]) ** 2, 0);
        if (distance < best) { best = distance; chosen = i; }
      }
    }
    output.set(rgb[chosen], p); output[p + 3] = 255;
  }
  return output;
}
const w = 17, h = 19, source = new Uint8ClampedArray(w * h * 4);
for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4) {
  source[p] = (x * 17 + y * 11) & 255; source[p + 1] = (x * 7 + y * 23) & 255; source[p + 2] = (x * 31 + y * 5) & 255;
  source[p + 3] = x < 2 || y < 2 || x + y > 30 ? 0 : 255;
  if (x === 2 && y > 2 && y < 8) { source[p] = source[p + 1] = source[p + 2] = 255; source[p + 3] = [64,127,128,192,255][y - 3]; }
  if (!source[p + 3]) source[p] = source[p + 1] = source[p + 2] = 0;
}
const fixture = { width: w, height: h, data: source }, png = sourcePng(w, h, source), fixturePath = resolve(scratch, 'fixture.png');
writeFileSync(fixturePath, png);
const gifBuffer = new Uint8Array(4096), gifWriter = new omggif.GifWriter(gifBuffer, 3, 2, { palette: [0,0xff0000,0x0000ff,0x00ff00], loop: 3 });
const gifIndices = [[1,0,2,3,0,1],[0,2,0,1,3,0]], gifDelays = [200,70];
for (let i = 0; i < 2; i++) gifWriter.addFrame(0,0,3,2,gifIndices[i],{transparent:0,disposal:2,delay:gifDelays[i]/10});
const gifFixture = gifBuffer.subarray(0, gifWriter.end()), gifPath = resolve(scratch, 'walk.gif'); writeFileSync(gifPath, gifFixture);
const originalGif = gifIndices.map(indices => ({ width: 3, height: 2, data: Uint8ClampedArray.from(indices.flatMap(i => i ? [[255,0,0,255],[0,0,255,255],[0,255,0,255]][i - 1] : [0,0,0,0])) }));
const results = { legacy: [], full: [], extra: [], consoleErrors: [], baseline: process.env.BASE_REF ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim() };
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.gif':'image/gif', '.svg':'image/svg+xml' };
const server = createServer((request, response) => {
  const route = new URL(request.url, 'http://localhost').pathname.replace(/^\/bitify\//, '/');
  const file = resolve(dist, '.' + (route === '/' ? '/index.html' : decodeURIComponent(route)));
  if (!file.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
  try { response.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream'); response.end(readFileSync(file)); }
  catch { response.writeHead(404).end(); }
});
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ viewport: { width:1280,height:900 }, permissions:['clipboard-read','clipboard-write'], acceptDownloads:true });
  await context.addInitScript(() => { if (!localStorage.getItem('bitify')) localStorage.setItem('bitify', '{}'); });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => results.consoleErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/bitify/`);
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(fixturePath);
  await page.locator('.tiles .tile canvas').waitFor();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('bitify')));
  const paletteButton = () => page.locator('.dock button[aria-label="Palette"]');
  async function openPalette() { if (await paletteButton().getAttribute('aria-expanded') !== 'true') await paletteButton().click(); }
  async function closePanel() { if (await paletteButton().getAttribute('aria-expanded') === 'true') await paletteButton().click(); else if (await page.getByRole('button',{name:'Style',exact:true}).count() && await page.getByRole('button',{name:'Style',exact:true}).getAttribute('aria-expanded') === 'true') await page.getByRole('button',{name:'Style',exact:true}).click(); }
  async function chooseStyle(key, name) {
    const button = page.getByRole('button',{name:'Style',exact:true});
    if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
    await page.locator('.style-panel button[aria-haspopup=true]').click();
    await page.getByRole('group',{name:'Style',exact:true}).getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem('bitify')).style === key, key);
    await closePanel();
  }
  async function tileMatches(expected, width = w, height = h) {
    await page.waitForFunction(({value,width,height}) => {
      const canvas = document.querySelector('.tiles .tile canvas'); if (!canvas || canvas.width !== width || canvas.height !== height) return false;
      let result = 2166136261; for (const byte of canvas.getContext('2d').getImageData(0,0,width,height).data) result = Math.imul(result ^ byte,16777619);
      return (result >>> 0) === value;
    }, {value:hash(expected),width,height});
  }
  async function download(button, expectedName) {
    const next = page.waitForEvent('download'); await button.click(); const file = await next;
    assert.equal(file.suggestedFilename(), expectedName); return readFileSync(await file.path());
  }
  async function copy(button) {
    await button.click(); await page.waitForFunction(() => document.querySelector('.glass-toast__text')?.textContent.includes('copied'));
    return Buffer.from(await page.evaluate(async () => { const items = await navigator.clipboard.read(); const blob = await items[0].getType('image/png'); return [...new Uint8Array(await blob.arrayBuffer())]; }));
  }
  const analysis = analyze(fixture);
  for (const palette of process.env.SKIP_LEGACY_MATRIX === '1' ? [] : PRESETS) {
    await openPalette(); await page.getByRole('group',{name:'Palettes',exact:true}).getByRole('button',{name:palette.name,exact:true}).click();
    for (const [key,name] of STYLES) {
      await chooseStyle(key,name); const state = await stored();
      assert.equal(state.first,palette.dark); assert.equal(state.second,palette.light); assert.equal(state.none,0); assert.deepEqual(state.settings[key],defaults(key));
      const pixels = colorize(mask(analysis,key,defaults(key)),palette.dark,palette.light);
      await tileMatches(pixels);
      const toggle = page.getByRole('button',{name:`${name} conversion`,exact:true});
      if (results.legacy.length % 2 === 0) { await toggle.click(); assert.equal(await toggle.getAttribute('aria-pressed'),'false'); await tileMatches(source); }
      const bytes = await download(page.getByRole('button',{name:'Save fixture.png',exact:true}),'fixture-1bit.png');
      const decoded = readPng(bytes); assert.equal(decoded.w,w); assert.equal(decoded.h,h); samePixels(decoded.pixels,pixels,`${palette.name}/${name}`);
      assert.deepEqual(bytes,Buffer.from(baselinePngBytes({mask:mask(analysis,key,defaults(key)),w,h,first:palette.dark,second:palette.light})), 'Legacy PNG bytes changed');
      results.legacy.push({palette:palette.name,style:name,hash:hash(decoded.pixels)});
      if (await toggle.getAttribute('aria-pressed') === 'false') await toggle.click();
    }
    console.log(`Legacy ${palette.name}: all11 styles passed.`);
  }
  console.log(`Legacy matrix: ${results.legacy.length} independently decoded exports passed.`);

  // Custom pair, None, Swap (None follows its color), remembered settings,
  // copy and save while Original is shown use the same conversion.
  await chooseStyle('solid','Solid');
  await page.getByLabel('Color for lines and dark pixels',{exact:true}).fill('#123456');
  await page.getByLabel('Color for fill and light pixels',{exact:true}).fill('#fedcba');
  await openPalette(); await page.getByRole('button',{name:'Transparent outlines and dark areas',exact:true}).click(); await closePanel();
  await page.getByRole('button',{name:'Swap colors',exact:true}).click();
  let state = await stored(); assert.equal(state.first,'#fedcba'); assert.equal(state.second,'#123456'); assert.equal(state.none,2);
  await page.getByRole('button',{name:'Style',exact:true}).click();
  await page.getByRole('slider',{name:'Threshold',exact:true}).fill('100');
  await closePanel(); state = await stored(); assert.equal(state.settings.solid.threshold,100);
  let [first,second] = inks(state.first,state.second,state.none,state.style), expected = colorize(mask(analysis,'solid',state.settings.solid),first,second);
  await tileMatches(expected); await page.getByRole('button',{name:'Solid conversion',exact:true}).click();
  samePixels(readPng(await copy(page.getByRole('button',{name:'Copy fixture.png',exact:true}))).pixels,expected,'Legacy custom clipboard');
  samePixels(readPng(await download(page.getByRole('button',{name:'Save image',exact:true}),'fixture-1bit.png')).pixels,expected,'Legacy custom Save image');
  await chooseStyle('cutout','Cutout'); await chooseStyle('solid','Solid'); assert.equal((await stored()).settings.solid.threshold,100);
  results.extra.push('Legacy custom colors/None/Swap/settings memory/Original/copy/single-save');

  await openPalette(); await page.getByRole('group',{name:'Color system',exact:true}).getByRole('button',{name:'Palette',exact:true}).click();
  for (const palette of FULL_PRESETS) {
    await openPalette(); await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:palette.name,exact:true}).click(); await closePanel();
    assert.equal((await stored()).paletteId,palette.id); expected = nearestReference(fixture,palette.colors);
    await tileMatches(expected); await page.getByRole('button',{name:`${palette.name} conversion`,exact:true}).click(); await tileMatches(source);
    const decoded = readPng(await download(page.getByRole('button',{name:'Save fixture.png',exact:true}),'fixture-palette.png'));
    assert.equal(decoded.w,w); assert.equal(decoded.h,h); samePixels(decoded.pixels,expected,palette.name);
    samePixels(readPng(await copy(page.getByRole('button',{name:'Copy fixture.png',exact:true}))).pixels,expected,`${palette.name} clipboard`);
    results.full.push({palette:palette.name,colors:palette.colors.length,hash:hash(decoded.pixels)});
    await page.getByRole('button',{name:`${palette.name} conversion`,exact:true}).click();
  }
  console.log(`Full matrix: ${results.full.length} independently decoded exports and clipboard PNGs passed.`);

  // Retained coverage for the optional matching choice: the scalar reference
  // performs encoded RGB distance, independent of the production converter.
  results.rgb = [];
  for (const palette of FULL_PRESETS) {
    await openPalette(); await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:palette.name,exact:true}).click(); await closePanel();
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    await page.getByRole('button',{name:'RGB matching',exact:true}).click();
    assert.equal((await stored()).metric,'rgb');assert.equal(await page.getByRole('button',{name:'RGB matching',exact:true}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Palette settings',exact:true}).click();
    const rgbExpected = nearestReference(fixture,palette.colors,128,'rgb'); await tileMatches(rgbExpected);
    samePixels(readPng(await download(page.getByRole('button',{name:'Save fixture.png',exact:true}),'fixture-palette.png')).pixels,rgbExpected,`${palette.name} RGB PNG`);
    samePixels(readPng(await copy(page.getByRole('button',{name:'Copy fixture.png',exact:true}))).pixels,rgbExpected,`${palette.name} RGB clipboard`);
    results.rgb.push({palette:palette.name,hash:hash(rgbExpected)});
  }
  await openPalette();await page.getByRole('group',{name:'Color system',exact:true}).getByRole('button',{name:'1-bit',exact:true}).click();assert.equal((await stored()).metric,'rgb');
  await page.getByRole('group',{name:'Color system',exact:true}).getByRole('button',{name:'Palette',exact:true}).click();await closePanel();assert.equal((await stored()).metric,'rgb');
  await page.getByRole('button',{name:'Palette settings',exact:true}).click();await page.getByRole('button',{name:'Reset palette settings',exact:true}).click();
  assert.equal((await stored()).metric,'oklab');assert.equal((await stored()).alphaCut,128);await page.getByRole('button',{name:'Palette settings',exact:true}).click();
  results.extra.push('Five full presets RGB preview/PNG/Copy match independent reference; family retains metric and Reset restores Oklab/cut128');

  // Full GIF: source compositing, preserved delays/loop, first-frame clipboard,
  // actual worker asset loaded under a deployment subpath, and mixed ZIP.
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(gifPath);
  await page.getByRole('button',{name:'Save walk.gif',exact:true}).waitFor();
  const active = FULL_PRESETS.at(-1), gifExpected = originalGif.map(frame => nearestReference(frame,active.colors));
  const gif = readGif(await download(page.getByRole('button',{name:'Save walk.gif',exact:true}),'walk-palette.gif'));
  assert.deepEqual([gif.w,gif.h,gif.loop,gif.frames.length],[3,2,3,2]);
  for (let i=0;i<2;i++) { assert.equal(gif.frames[i].delay,gifDelays[i]); samePixels(gif.frames[i].pixels,gifExpected[i],`Full GIF frame${i}`); }
  samePixels(readPng(await copy(page.getByRole('button',{name:'Copy walk.gif',exact:true}))).pixels,gifExpected[0],'GIF first-frame clipboard');
  const zip = unzipSync(await download(page.getByRole('button',{name:'Save all images',exact:true}),'bitify.zip'));
  assert.deepEqual(Object.keys(zip),['fixture-palette.png','walk-palette.gif']);
  samePixels(readPng(zip['fixture-palette.png']).pixels,nearestReference(fixture,active.colors),'ZIP full still');
  samePixels(readGif(zip['walk-palette.gif']).frames[1].pixels,gifExpected[1],'ZIP full GIF');
  results.extra.push('Full GIF exact frames/delays/loop/first-frame copy and mixed ZIP');

  await openPalette(); await page.getByRole('group',{name:'Color system',exact:true}).getByRole('button',{name:'1-bit',exact:true}).click(); await closePanel();
  state = await stored(); assert.equal(state.style,'solid'); assert.equal(state.none,2); assert.equal(state.settings.solid.threshold,100);
  const frames = originalGif.map(frame => analyze(frame)); unify(frames); [first,second] = inks(state.first,state.second,state.none,state.style);
  const legacyGifBytes = await download(page.getByRole('button',{name:'Save walk.gif',exact:true}),'walk-1bit.gif');
  const legacyGif = readGif(legacyGifBytes);
  assert.deepEqual(legacyGifBytes,Buffer.from(baselineEncodeGif({w:3,h:2,first,second,loop:3,frames:frames.map((frame,i)=>({mask:mask(frame,'solid',state.settings.solid),delay:gifDelays[i]}))})),'Legacy GIF bytes changed');
  for (let i=0;i<2;i++) samePixels(legacyGif.frames[i].pixels,colorize(mask(frames[i],'solid',state.settings.solid),first,second),`Legacy GIF frame${i}`);
  const legacyZip = unzipSync(await download(page.getByRole('button',{name:'Save all images',exact:true}),'bitify.zip'));
  assert.deepEqual(Object.keys(legacyZip),['fixture-1bit.png','walk-1bit.gif']);
  samePixels(readPng(legacyZip['fixture-1bit.png']).pixels,colorize(mask(analysis,'solid',state.settings.solid),first,second),'ZIP legacy still');
  results.extra.push('Family round-trip preserves legacy custom colors/None/style settings, legacy GIF and mixed ZIP');

  // A2MP save takes the busy50ms path. Changing palette and removing an image
  // during the job must not change the conversion or the requested batch.
  const bigW = 1600, bigH = 1250, bigPixels = new Uint8ClampedArray(bigW * bigH * 4);
  for (let p = 0; p < bigPixels.length; p += 4) bigPixels.set((p / 4) % 17 ? [255,0,77,255] : [41,173,255,255],p);
  const bigPath = resolve(scratch,'big.png'); writeFileSync(bigPath,sourcePng(bigW,bigH,bigPixels));
  await openPalette(); await page.getByRole('group',{name:'Color system',exact:true}).getByRole('button',{name:'Palette',exact:true}).click();
  await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:'PICO-8',exact:true}).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(bigPath);
  await page.getByRole('button',{name:'Save big.png',exact:true}).waitFor(); await openPalette();
  let pendingDownload = page.waitForEvent('download');
  // Invoke real UI handlers in one turn so the change is guaranteed to precede
  // the busy wait, without Playwright's pointer/scroll waits consuming50ms.
  await page.evaluate(() => {
    document.querySelector('button[aria-label="Save big.png"]').click();
    document.querySelector('.palette-rail button[aria-label="DawnBringer 16"]').click();
  });
  let downloaded = await pendingDownload;
  assert.equal(downloaded.suggestedFilename(),'big-palette.png');
  let large = readPng(readFileSync(await downloaded.path())); assert.deepEqual([large.w,large.h],[bigW,bigH]);
  samePixels(large.pixels,bigPixels,'2MP save click palette snapshot');
  await openPalette(); await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:'PICO-8',exact:true}).click();
  pendingDownload = page.waitForEvent('download');
  await page.evaluate(() => {
    document.querySelector('button[aria-label="Save all images"]').click();
    document.querySelector('button[aria-label="Remove big.png"]').click();
    document.querySelector('.palette-rail button[aria-label="DawnBringer 16"]').click();
  });
  downloaded = await pendingDownload; assert.equal(downloaded.suggestedFilename(),'bitify.zip');
  const snapshotZip = unzipSync(readFileSync(await downloaded.path()));
  assert.deepEqual(Object.keys(snapshotZip),['fixture-palette.png','walk-palette.gif','big-palette.png']);
  samePixels(readPng(snapshotZip['fixture-palette.png']).pixels,nearestReference(fixture,FULL_PRESETS[0].colors),'ZIP palette snapshot');
  samePixels(readPng(snapshotZip['big-palette.png']).pixels,bigPixels,'ZIP removed-image snapshot');
  samePixels(readGif(snapshotZip['walk-palette.gif']).frames[1].pixels,nearestReference(originalGif[1],FULL_PRESETS[0].colors),'ZIP GIF palette snapshot');
  assert.equal(await page.getByRole('button',{name:'Save big.png',exact:true}).count(),0);
  results.extra.push('2MP save preserves click palette; ZIP preserves palette and removed-image snapshots');

  // A valid source GIF can use different local tables in different frames.
  // Its converted global union can require256 opaque colors plus empty. No
  // individual file or prefix ZIP may be downloaded; a255-color draft is shown.
  const limitColors = Array.from({length:256},(_,i) => `#${i.toString(16).padStart(2,'0')}00ff`);
  const limitBuffer = new Uint8Array(65536), limitWriter = new omggif.GifWriter(limitBuffer,256,1,{palette:[0,0xffffff],loop:0});
  limitWriter.addFrame(0,0,256,1,Uint8Array.from(Array(256).keys()),{palette:limitColors.map(hex=>parseInt(hex.slice(1),16)),delay:10,disposal:2});
  limitWriter.addFrame(0,0,256,1,new Uint8Array(256),{palette:[0,0xffffff],transparent:0,delay:10,disposal:2});
  const limitPath = resolve(scratch,'limit.gif'); writeFileSync(limitPath,limitBuffer.subarray(0,limitWriter.end()));
  await page.evaluate(colors => {
    localStorage.setItem('bitify-palettes-v1',JSON.stringify({version:1,palettes:[{id:'user-limit',name:'Exact256',colors,revision:1,source:{kind:'custom'}}]}));
    const state = JSON.parse(localStorage.getItem('bitify')); state.family = 'full-palette'; state.paletteId = 'user-limit'; localStorage.setItem('bitify',JSON.stringify(state));
  },limitColors);
  await page.reload(); await page.locator('input[type=file][accept="image/*"]').setInputFiles([fixturePath,limitPath]);
  await page.getByRole('button',{name:'Save limit.gif',exact:true}).waitFor();
  let forbiddenDownloads = 0; const counted = () => forbiddenDownloads++; page.on('download',counted);
  await page.getByRole('button',{name:'Save all images',exact:true}).click();
  await page.getByRole('dialog',{name:'Make a palette copy',exact:true}).waitFor();
  await page.waitForFunction(() => document.querySelector('.glass-toast__text')?.textContent.includes('No file was downloaded.'));
  assert.equal(forbiddenDownloads,0,'A blocked ZIP downloaded a prefix');
  assert.equal((await stored()).paletteId,'user-limit','The blocked export changed the active palette');
  assert.equal(await page.getByRole('button',{name:'Save palette',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  page.off('download',counted);
  results.extra.push('256 colors+empty GIF blocks ZIP without download or active palette mutation');

  // A real 6MP/two-frame GIF keeps its asynchronous global-table preflight in
  // flight while another editor opens. A late failure must inform that editor,
  // never replace its draft or silently impose the GIF copy's 255-color limit.
  const raceW = 3000, raceH = 2000, raceBuffer = new Uint8Array(raceW * raceH * 5 + 2048);
  const raceWriter = new omggif.GifWriter(raceBuffer,raceW,raceH,{palette:limitColors.map(hex=>parseInt(hex.slice(1),16)),loop:0});
  raceWriter.addFrame(0,0,raceW,raceH,Uint8Array.from({length:raceW*raceH},(_,i)=>i%256),{delay:10,disposal:2});
  raceWriter.addFrame(0,0,raceW,raceH,new Uint8Array(raceW*raceH),{delay:10,disposal:2,transparent:0});
  const racePath = resolve(scratch,'editor-race.gif'); writeFileSync(racePath,raceBuffer.subarray(0,raceWriter.end()));
  const originalRecord = {id:'user-limit',name:'Exact256',colors:limitColors,revision:7,source:{kind:'image',credit:'Original imported RGB set'}};
  const retryRecord = {...originalRecord,id:'user-retry',name:'Retry256',revision:3,source:{kind:'hex'}};
  await page.evaluate(records => {
    localStorage.setItem('bitify-palettes-v1',JSON.stringify({version:1,palettes:records}));
    const state = JSON.parse(localStorage.getItem('bitify')); state.family = 'full-palette'; state.paletteId = records[0].id;
    localStorage.setItem('bitify',JSON.stringify(state));
  },[originalRecord,retryRecord]);
  await page.reload(); await page.locator('input[type=file][accept="image/*"]').setInputFiles(racePath);
  await page.getByRole('button',{name:'Save editor-race.gif',exact:true}).waitFor(); await openPalette();
  forbiddenDownloads = 0; page.on('download',counted);
  // These are the application's actual handlers. Keeping both clicks in one
  // task guarantees editor entry during the supported 50ms pre-busy window.
  await page.evaluate(() => {
    document.querySelector('button[aria-label="Save editor-race.gif"]').click();
    const trigger = document.querySelector('button[aria-label="Import palette"]'); trigger.focus(); trigger.click();
  });
  const raceEditor = page.locator('dialog.palette-import-modal'); await raceEditor.waitFor();
  await raceEditor.getByRole('button',{name:'Paste colors',exact:true}).click();
  await raceEditor.getByRole('textbox',{name:'Hex colors',exact:true}).fill('#000000 #ffffff');
  await raceEditor.getByRole('button',{name:'Review colors',exact:true}).click();
  await raceEditor.getByLabel('Name',{exact:true}).fill('Draft while exporting');
  await raceEditor.getByRole('alert').waitFor({timeout:30000});
  assert.equal(await raceEditor.locator('h2').textContent(),'Import palette','Late failure replaced import editor');
  assert.equal(await raceEditor.getByLabel('Name',{exact:true}).inputValue(),'Draft while exporting');
  assert.deepEqual(await raceEditor.locator('.palette-review-swatch').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),['Select color 1 #000000','Select color 2 #ffffff']);
  assert.equal(await raceEditor.getByRole('button',{name:'Save palette',exact:true}).isEnabled(),true);
  assert.match(await raceEditor.getByRole('alert').textContent(),/GIF export using Exact256 .*No file was downloaded\./);
  assert.equal(await page.locator('dialog[open]').count(),1,'Late failure stacked a replacement modal');
  assert.equal(forbiddenDownloads,0,'Late failure downloaded a file');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bitify-palettes-v1')).palettes),[originalRecord,retryRecord]);
  await raceEditor.getByRole('button',{name:'Cancel',exact:true}).click(); await raceEditor.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Import palette','Cancel lost the import trigger');
  await page.waitForTimeout(150); assert.equal(await page.locator('dialog[open]').count(),0,'A queued export modal replaced the cancelled draft');

  // Retry is a new request against the selection now, rather than a queued
  // request against the failed palette. It still enforces 255 for a GIF copy.
  await openPalette(); await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:'Retry256',exact:true}).click();
  await page.getByRole('button',{name:'Save editor-race.gif',exact:true}).click();
  await page.getByRole('dialog',{name:'Make a palette copy',exact:true}).waitFor({timeout:30000});
  assert.equal(await raceEditor.getByLabel('Name',{exact:true}).inputValue(),'Retry256 GIF','Retry used the previous failed snapshot');
  assert.equal(await raceEditor.getByRole('button',{name:'Save palette',exact:true}).isDisabled(),true,'Fresh GIF copy lost its255-color limit');
  assert.equal((await stored()).paletteId,'user-retry');
  await raceEditor.getByRole('button',{name:'Cancel',exact:true}).click(); await raceEditor.waitFor({state:'detached'});
  await page.waitForTimeout(150); assert.equal(await page.locator('dialog[open]').count(),0);

  // A saved 256-color editor remains a normal edit, with its revision and
  // attribution. Renaming its draft must not rename the failed export notice.
  await openPalette(); await page.getByRole('group',{name:'Full palettes',exact:true}).getByRole('button',{name:'Exact256',exact:true}).click();
  await page.evaluate(() => {
    document.querySelector('button[aria-label="Save editor-race.gif"]').click();
    const trigger = document.querySelector('button[aria-label="Edit palette"]'); trigger.focus(); trigger.click();
  });
  await raceEditor.getByLabel('Name',{exact:true}).fill('Existing256 draft');
  await raceEditor.getByRole('alert').waitFor({timeout:30000});
  assert.equal(await raceEditor.locator('h2').textContent(),'Edit palette');
  assert.equal(await raceEditor.getByLabel('Name',{exact:true}).inputValue(),'Existing256 draft');
  assert.match(await raceEditor.getByRole('alert').textContent(),/GIF export using Exact256 /);
  assert.equal(await raceEditor.getByText('256 colors',{exact:true}).count(),1);
  assert.equal(await raceEditor.getByRole('button',{name:'Save changes',exact:true}).isEnabled(),true,'Existing editor inherited255-copy restriction');
  assert.equal(await page.locator('dialog[open]').count(),1);
  await page.setViewportSize({width:320,height:568});
  const noticeLayout = await raceEditor.evaluate(dialog=>{
    const body=dialog.querySelector('.palette-editor-body'),alert=dialog.querySelector('[role=alert]'),r=alert.getBoundingClientRect(),b=body.getBoundingClientRect();
    return {overflow:body.scrollWidth>body.clientWidth+1,inside:r.left>=b.left-1&&r.right<=b.right+1};
  });
  assert.deepEqual(noticeLayout,{overflow:false,inside:true},'Async notice overflows narrow editor');
  await page.screenshot({path:resolve(scratch,'editor-race-narrow.png')});
  await page.setViewportSize({width:1280,height:900});
  // Restore the original name and save unchanged colors. Persisting succeeds
  // only if original id/revision/source/maxColors all survived the late failure.
  await raceEditor.getByLabel('Name',{exact:true}).fill(originalRecord.name);
  await raceEditor.getByRole('button',{name:'Save changes',exact:true}).click(); await raceEditor.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Edit palette','Save lost the edit trigger');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('bitify-palettes-v1')).palettes),[{...originalRecord,revision:8},retryRecord]);
  assert.equal(forbiddenDownloads,0,'An editor arbitration failure downloaded a file');
  await page.waitForTimeout(150); assert.equal(await page.locator('dialog[open]').count(),0);
  page.off('download',counted);
  results.extra.push('6MP async GIF failure preserves named import and 256-color saved drafts/notice/focus/source/revision; retry uses current palette and 255-color copy limit');
  assert.deepEqual(results.consoleErrors,[],'Browser JS exceptions');
  results.passed = true;
  writeFileSync(resolve(scratch,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:true,legacy:results.legacy.length,full:results.full.length,rgb:results.rgb.length,extra:results.extra,errors:results.consoleErrors}));
} catch(error) {
  results.failure = error.stack; writeFileSync(resolve(scratch,'results.json'),JSON.stringify(results,null,2)); throw error;
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
