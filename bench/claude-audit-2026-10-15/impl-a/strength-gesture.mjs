// Real-browser checks of the Dither strength pausedCommit gesture and Save snapshot ownership.
// Requires dev server: npx vite --port 5340 --strictPort --host 127.0.0.1
// Run: node bench/claude-audit-2026-10-15/impl-a/strength-gesture.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
import { quantize } from '../../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';

const BASE = 'http://127.0.0.1:5340/';
const out = new URL('./', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
// Fixture: smooth ramp with partial alpha band.
const W = 64, H = 16, fixture = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = (y * W + x) * 4, v = Math.round(x * 255 / (W - 1));
  fixture.data.set([v, Math.round(v * .7), 255 - v, y < 4 ? [1, 64, 127, 200][x % 4] : 255], p);
}
const fixturePath = out + 'strength-fixture.png';
fs.writeFileSync(fixturePath, PNG.sync.write(fixture));
const pico = FULL_PRESETS.find(p => p.id === 'preset-pico8').colors;

const results = [];
const check = async (name, fn) => { try { const info = await fn(); results.push({ name, pass: true, ...info }); } catch (e) { results.push({ name, pass: false, error: e.message }); } };
const assert = (v, m) => { if (!v) throw new Error(m); };

const browser = await chromium.launch({ executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }); // default sandboxed launch; no --no-sandbox
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 860 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  if (!sessionStorage.getItem('seeded')) {
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-pico8', metric: 'oklab', maxColors: 0, cleanup: false, alphaCut: 128, alphaMode: 'cut', dither: '4x4', ditherStrength: 50 }));
    localStorage.setItem('colorfetti-help-seen', '1');
  }
});
await page.goto(BASE);
await page.waitForTimeout(800);
// Dismiss first-visit help if present.
for (const d of await page.$$('dialog[open]')) await page.keyboard.press('Escape');
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('colorfetti')));
const openSettings = async () => { if (!await page.$('.palette-settings-panel')) { await page.click('[aria-label="Palette settings"]'); await page.waitForSelector('.palette-settings-panel'); } };
const setDraft = (v, event = 'input') => page.evaluate(([v, event]) => { const n = document.querySelector('[aria-label="Dither strength"]'); n.value = String(v); n.dispatchEvent(new Event(event, { bubbles: true })); }, [v, event]);
const outputText = () => page.$eval('output[for="full-dither-amount"]', n => n.textContent);

await page.setInputFiles('input[type=file]', fixturePath);
await page.waitForSelector('.tile, [class*=tile]');
await page.waitForTimeout(500);
await openSettings();

await check('input commits only after 200ms pause', async () => {
  await setDraft(70);
  const early = (await stored()).ditherStrength;
  await page.waitForTimeout(350);
  const late = (await stored()).ditherStrength;
  assert(early === 50 && late === 70, `early ${early} late ${late}`);
  return { early, late };
});
await check('pointercancel discards pending draft', async () => {
  await setDraft(90);
  await page.evaluate(() => document.querySelector('[aria-label="Dither strength"]').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));
  await page.waitForTimeout(350);
  const s = (await stored()).ditherStrength, shown = await outputText(), value = await page.$eval('[aria-label="Dither strength"]', n => n.value);
  assert(s === 70 && shown === '70%' && value === '70', `stored ${s} shown ${shown} value ${value}`);
  return { s, shown, value };
});
await check('panel close discards pending draft', async () => {
  await setDraft(20);
  await page.click('[aria-label="Palette settings"]'); // toggles closed
  await page.waitForTimeout(350);
  const s = (await stored()).ditherStrength;
  await openSettings();
  const shown = await outputText();
  assert(s === 70 && shown === '70%', `stored ${s} shown ${shown}`);
  return { s, shown };
});
await check('pattern change discards pending draft', async () => {
  await setDraft(33);
  await page.click('[aria-label="Dithering 8x8"]');
  await page.waitForTimeout(350);
  const st = await stored();
  assert(st.ditherStrength === 70 && st.dither === '8x8' && await outputText() === '70%', JSON.stringify(st));
  return { dither: st.dither, strength: st.ditherStrength };
});
await check('palette step (ArrowRight) discards pending draft', async () => {
  await setDraft(11);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(350);
  const st = await stored();
  assert(st.ditherStrength === 70 && st.paletteId !== 'preset-pico8', JSON.stringify({ s: st.ditherStrength, id: st.paletteId }));
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
  return { paletteId: st.paletteId };
});
await check('keyboard change commits immediately', async () => {
  await openSettings();
  await page.focus('[aria-label="Dither strength"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(30);
  const s = (await stored()).ditherStrength;
  assert(s === 71, `stored ${s}`);
  return { s };
});
await check('reset with pending draft yields 50 and Off, no late commit', async () => {
  await setDraft(95);
  await page.click('[aria-label="Reset palette settings"]');
  await page.waitForTimeout(350);
  const st = await stored();
  assert(st.ditherStrength === 50 && st.dither === 'none' && st.alphaMode === 'cut', JSON.stringify(st));
  return {};
});
await check('real mouse drag commits on release', async () => {
  await page.click('[aria-label="Dithering 2x2"]');
  const box = await (await page.$('[aria-label="Dither strength"]')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .9, box.y + box.height / 2, { steps: 5 });
  const during = (await stored()).ditherStrength;
  await page.mouse.up();
  await page.waitForTimeout(30);
  const after = (await stored()).ditherStrength, shown = await outputText();
  assert(after !== 50 && shown === after + '%', `during ${during} after ${after} shown ${shown}`);
  return { during, after };
});
// Save owns the committed strength: set a pending draft then Save (outside click closes the panel first).
await check('Save exports committed strength, not abandoned draft', async () => {
  await openSettings();
  await setDraft(100); await setDraft(100, 'change'); // input then change commits 100 immediately
  await page.waitForTimeout(50);
  await setDraft(5); // pending, abandoned
  await page.click('.export-action'); // first click: dismiss panel (cancel)
  await page.waitForTimeout(300);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('.export-action')]);
  const file = out + 'strength-save.png'; await download.saveAs(file);
  const png = PNG.sync.read(fs.readFileSync(file)), st = await stored();
  const src = { width: W, height: H, data: fixture.data };
  const expect = s => quantize(src, pico, 128, undefined, undefined, { dither: '2x2', ditherStrength: s });
  const rgbOf = r => { const o = new Uint8Array(W * H * 4); r.indices.forEach((ix, i) => { if (ix === 256) return; const v = parseInt(pico[ix].slice(1), 16); o.set([v >>> 16, v >>> 8 & 255, v & 255, 255], i * 4); }); return o; };
  const diff = s => { const e = rgbOf(expect(s)); let n = 0; for (let i = 0; i < e.length; i++) if (e[i] !== png.data[i]) n++; return n; };
  const d100 = diff(100), d5 = diff(5);
  assert(st.ditherStrength === 100 && d100 === 0 && d5 > 0, JSON.stringify({ stored: st.ditherStrength, d100, d5 }));
  return { d100, d5 };
});
// Keep: Opacity row visible with soft source, Cut slider hidden, PNG is RGBA with source alpha.
await check('Keep save writes RGBA8 with exact source alpha', async () => {
  await openSettings();
  await page.click('.palette-settings-panel button:text-is("Keep")');
  await page.waitForTimeout(100);
  const cutSlider = await page.$('[aria-label="Palette opacity cut"]');
  await page.click('.export-action'); await page.waitForTimeout(300);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('.export-action')]);
  const file = out + 'keep-save.png'; await download.saveAs(file);
  const bytes = fs.readFileSync(file), png = PNG.sync.read(bytes);
  let bad = 0; for (let i = 0; i < W * H; i++) if (png.data[i * 4 + 3] !== fixture.data[i * 4 + 3]) bad++;
  assert(!cutSlider && bytes[25] === 6 && bad === 0, JSON.stringify({ cutSlider: !!cutSlider, colorType: bytes[25], bad }));
  return { colorType: bytes[25], bytes: bytes.length };
});

results.push({ pageErrors: errors });
fs.writeFileSync(out + 'strength-gesture.out.json', JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
await browser.close();
