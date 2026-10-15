// Real Tile (browser) sampled preview vs Node full-source conversion sampled at the same coordinates,
// with cap + Cleanup + 4x4 dither + Keep + RGB matching. Requires dev server on 5340.
// Run: node bench/claude-audit-2026-10-15/impl-a/browser-sampled-preview.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
import { preparePalette } from '../../../src/lib/quantize.js';
import { conversionSnapshot, fullPaletteImage } from '../../../src/lib/palette-state.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';

const out = new URL('./', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let seed = 7; const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296), ri = n => Math.floor(rand() * n);
const W = 1501, H = 703, png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = (y * W + x) * 4, band = (x >> 5) + (y >> 5) & 7;
  const base = [[200, 40, 40], [40, 180, 60], [30, 30, 200], [240, 220, 90], [128, 128, 128], [17, 17, 17], [90, 200, 220], [250, 120, 200]][band];
  png.data.set([Math.min(255, base[0] + ri(40)), Math.min(255, base[1] + ri(40)), Math.min(255, base[2] + ri(40))], p);
  if (ri(31) === 0) png.data.set([ri(256), ri(256), ri(256)], p);
  png.data[p + 3] = y < 40 ? [0, 1, 64, 127, 128, 254][x % 6] : 255;
}
const fixturePath = out + 'sampled-fixture.png'; fs.writeFileSync(fixturePath, PNG.sync.write(png));
const src = { width: W, height: H, data: new Uint8ClampedArray(png.data) };
const pico = FULL_PRESETS.find(p => p.id === 'preset-pico8').colors;
const settings = { family: 'full-palette', paletteId: 'preset-pico8', metric: 'rgb', maxColors: 6, lastMaxColors: 6, cleanup: true, alphaCut: 128, alphaMode: 'keep', dither: '4x4', ditherStrength: 60 };

const browser = await chromium.launch({ executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const page = await (await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('colorfetti', s); } }, JSON.stringify(settings));
await page.goto('http://127.0.0.1:5340/');
await page.waitForTimeout(800);
for (const d of await page.$$('dialog[open]')) await page.keyboard.press('Escape');
await page.setInputFiles('input[type=file]', fixturePath);
// Wait for a stable converted canvas smaller than the source.
let read, prev, stableFor = 0;
for (let i = 0; i < 120 && stableFor < 4; i++) {
  await page.waitForTimeout(250);
  read = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].find(c => c.width > 50 && c.width < 1501 && c.height > 20);
    if (!c) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { w: c.width, h: c.height, data: Array.from(d) };
  });
  const sig = read && read.w + 'x' + read.h + ':' + read.data.slice(0, 4000).join(',');
  stableFor = read && sig === prev ? stableFor + 1 : 0; prev = sig;
}
if (!read) throw new Error('No sampled canvas');
const exported = await fullPaletteImage({ name: 'f.png', original: src }, conversionSnapshot({ ...settings, palette: { name: 'PICO-8', colors: pico } }), { still: true });
let rgbMismatch = 0, alphaMismatch = 0, compared = 0, firstBad = null;
for (let y = 0; y < read.h; y++) for (let x = 0; x < read.w; x++) {
  const q = Math.floor((y + .5) * H / read.h) * W + Math.floor((x + .5) * W / read.w), o = (y * read.w + x) * 4;
  const idx = exported.indices[q], ea = idx === 256 ? 0 : exported.alpha[q];
  compared++;
  if (read.data[o + 3] !== ea) { alphaMismatch++; firstBad ??= { x, y, got: read.data[o + 3], ea }; continue; }
  if (ea === 255) {
    const v = parseInt(exported.colors[idx].slice(1), 16);
    if (read.data[o] !== v >>> 16 || read.data[o + 1] !== (v >>> 8 & 255) || read.data[o + 2] !== (v & 255)) { rgbMismatch++; firstBad ??= { x, y, rgb: read.data.slice(o, o + 3), exp: [v >>> 16, v >>> 8 & 255, v & 255] }; }
  }
}
const result = { canvas: [read.w, read.h], source: [W, H], subset: exported.colors, compared, rgbMismatch, alphaMismatch, firstBad, errors };
fs.writeFileSync(out + 'browser-sampled-preview.out.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
await browser.close();
