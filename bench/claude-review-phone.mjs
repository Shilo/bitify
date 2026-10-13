// Kept as the record behind docs/research/*claude-code*-review.md (October 2026), not as a maintained tool.
// Several tests need diagnostic builds made from since-deleted .tmp configs written against older commits.
// For regression checks use the tracked QA pages in this folder instead.
// Claude Code reviewer diagnostics, second round: the same checks on a desktop browser and on a
// physical Android browser over USB, against instrumented diagnostic builds. Harness only.
//
// Builds (no file under src/ is edited; .tmp/claude-review/vite.variant.config.js transforms in memory):
//   for v in base yield cachevis: VARIANT=<v or empty for base> npx vite build \
//     --config .tmp/claude-review/vite.variant.config.js --outDir .tmp/claude-review/site/<v> --emptyOutDir
// Desktop:  node bench/claude-review-phone.mjs desktop [tests...]
// Phone:    adb forward tcp:9333 localabstract:chrome_devtools_remote ; adb reverse tcp:5290 tcp:5290
//           node bench/claude-review-phone.mjs cdp:http://127.0.0.1:9333 [tests...]
// Tests: exportPhases originalToggle singleFrameGif alphaSlider cacheVisibility oneBitExport plainExport liveReanalysis
// plainExport runs on a plain production build in site/<PLAIN_BUILD>; liveReanalysis needs
//   npx vite build --config .tmp/claude-review/vite.reread.config.js --outDir .tmp/claude-review/site/reread-346e19e --emptyOutDir
// The first five need the round 2 builds of 3ce4e14 (base, yield, cachevis) and no longer transform at HEAD.
// oneBitExport needs: VARIANT=<empty|yieldfiles> npx vite build --config .tmp/claude-review/vite.onebit.config.js
//   --outDir .tmp/claude-review/site/onebit-<base|yieldfiles> --emptyOutDir   (written against 18f8dd2)
// Exports are captured in the page (the download anchor is intercepted), so nothing is saved on the device.
// Results: .tmp/claude-review/results-<target>.json and captured exports under .tmp/claude-review/out/.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep, join } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { deflateSync, crc32 } from 'node:zlib';
import omggif from 'omggif';
import { unzipSync } from 'fflate';

const root = resolve('.tmp/claude-review'), site = join(root, 'site'), target = process.argv[2] ?? 'desktop', only = process.argv.slice(3);
const label = target.startsWith('cdp:') ? 'phone' : 'desktop', PORT = 5290;
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// ---------- fixtures ----------
function png(w, h, rgba) {
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(rows, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
function noisy(w, h, seed) {
  const data = new Uint8Array(w * h * 4); let s = seed >>> 0;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; data[i] = ((p % w) * 255 / w + (s >>> 16 & 31)) & 255; data[i + 1] = (Math.floor(p / w) * 255 / h + (s >>> 8 & 31)) & 255; data[i + 2] = s >>> 20 & 255; data[i + 3] = 255; }
  return data;
}
function gif(w, h, frames, seed, delay = 10) {
  const buffer = new Uint8Array(1024 + frames * (w * h * 2 + 1024)), palette = Array.from({ length: 16 }, (_, i) => (i * 0x0f1323 + 0x101010) & 0xffffff);
  const writer = new omggif.GifWriter(buffer, w, h, { palette, loop: 0 }); let s = seed >>> 0;
  for (let f = 0; f < frames; f++) { const indices = new Uint8Array(w * h); for (let p = 0; p < indices.length; p++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; indices[p] = ((p % w >> 4) + (p / w >> 4) + f + (s >>> 28 & 1)) & 15; } writer.addFrame(0, 0, w, h, indices, { delay }); }
  return Buffer.from(buffer.subarray(0, writer.end()));
}
const file = (name, mimeType, buffer) => ({ name, mimeType, buffer });
const fixtures = resolve('.tmp/auto64-ui-20261012/build/fixtures');
const real = names => names.filter(n => existsSync(join(fixtures, n))).map(n => file(n, n.endsWith('.gif') ? 'image/gif' : 'image/png', readFileSync(join(fixtures, n))));
const buildings = () => real([1, 2, 3, 4, 5, 6].map(i => `building${i}.png`));
const clips = () => real([...Array.from({ length: 16 }, (_, i) => `a${String(i + 1).padStart(3, '0')}.gif`), 'dungeon.gif']);
const photos = (n, size) => Array.from({ length: n }, (_, i) => file(`photo${i}.png`, 'image/png', png(size, size, noisy(size, size, i + 1))));

// ---------- server ----------
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = resolve(site, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (req.url.startsWith('/blank.html')) { res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Claude review harness</title>'); return; }
  if (!path.startsWith(site + sep) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'max-age=3600' }).end(readFileSync(path));
});
await new Promise(done => server.listen(PORT, '127.0.0.1', done));

// ---------- page instrumentation ----------
function instrument(seed) {
  localStorage.setItem('bitify', JSON.stringify(seed));
  const I = window.__i = { mc: 0, put: 0, long: [], scripts: [], made: [], term: [], exports: [], rafGap: 0, frames: 0 };
  const MC = window.MessageChannel; window.MessageChannel = function () { I.mc++; return new MC(); };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (...a) { I.put++; return put.apply(this, a); };
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) I.long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch {}
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) for (const x of e.scripts) if (x.duration >= 50) I.scripts.push({ invoker: x.invoker, ms: Math.round(x.duration), file: (x.sourceURL || '').split('/').pop().replace(/-[\w-]{8}\.js$/, '') }); }).observe({ type: 'long-animation-frame' }); } catch {}
  const W = window.Worker, short = url => String(url).split('/').pop().replace(/-[\w-]{8}\.js.*$/, '');
  window.Worker = class extends W { constructor(url, options) { super(url, options); this.__n = short(url); I.made.push(this.__n); } terminate() { I.term.push(this.__n); super.terminate(); } };
  // Capture the export instead of saving a file on the device.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.download || !this.href.startsWith('blob:')) return click.call(this);
    const entry = { name: this.download, at: performance.now(), done: false }; I.exports.push(entry);
    fetch(this.href).then(r => r.arrayBuffer()).then(async bytes => { entry.bytes = bytes; entry.size = bytes.byteLength; entry.sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); entry.done = true; });
  };
  let last = performance.now();
  requestAnimationFrame(function frame(now) { I.rafGap = Math.max(I.rafGap, now - last); last = now; I.frames++; requestAnimationFrame(frame); });
}
const base = { first: '#222323', second: '#f0f6f0', none: 0, style: 'cutout' };
const palette = (extra = {}) => ({ ...base, family: 'full-palette', paletteId: 'preset-edg32', alphaCut: 128, metric: 'oklab', maxColors: 0, lastMaxColors: 16, cleanup: false, ...extra });

const browser = target.startsWith('cdp:') ? await chromium.connectOverCDP(target.slice(4))
  : await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const mine = new Set();
// A key event, not a setting: keeps the device's screen on between pages so the tab keeps rendering.
const ADB = process.env.ADB ?? 'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const awake = () => { if (label === 'phone') execFileSync(ADB, ['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']); };
async function open(build, seed) {
  // On the device the page is a new tab in the existing profile; the init script is page-scoped so no other tab is touched.
  const context = label === 'phone' ? browser.contexts()[0] : await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  awake();
  // A tab created over DevTools stays in the background on Android and is never drawn. A VIEW intent opens a
  // new foreground tab instead; no existing tab is navigated or closed.
  const page = label !== 'phone' ? await context.newPage() : (await Promise.all([context.waitForEvent('page', { timeout: 20000 }),
    (async () => execFileSync(ADB, ['shell', `am start -a android.intent.action.VIEW -d 'http://localhost:${PORT}/blank.html?${Date.now()}' -p com.brave.browser`], { stdio: 'ignore' }))()]))[0];
  mine.add(page);
  await page.addInitScript(instrument, seed);
  page.on('pageerror', error => console.error('pageerror', error.message));
  await page.goto(`http://localhost:${PORT}/${build}/`); await page.bringToFront().catch(() => {});
  await page.waitForSelector('.tile canvas', { timeout: 60000 });
  const before = await page.evaluate(() => window.__i.frames); await page.waitForTimeout(500);
  if (await page.evaluate(() => window.__i.frames) - before < 5) throw new Error('This tab is not being rendered (screen off, locked, or tab in the background); timings would be invalid.');
  return { page, close: async () => { mine.delete(page); await page.close(); if (label !== 'phone') await context.close(); } };
}
const env = page => page.evaluate(() => ({ ua: navigator.userAgent, dpr: devicePixelRatio, width: innerWidth, height: innerHeight, visibility: document.visibilityState, cores: navigator.hardwareConcurrency }));
const reset = page => page.evaluate(() => { const I = window.__i; I.mc = I.put = I.rafGap = I.frames = 0; I.long = []; I.scripts = []; I.made = []; I.term = []; I.exports = []; globalThis.__c = {}; });
const read = page => page.evaluate(() => { const I = window.__i, c = globalThis.__c ?? {}; return { conversions: c.q ?? 0, convertedPixels: c.qpx ?? 0, paints: I.put, postedTasks: I.mc, long: [...I.long], longScripts: [...I.scripts], rafGapMax: Math.round(I.rafGap), frames: I.frames, workersMade: [...I.made], workersTerminated: [...I.term], gifMain: c.gifMain ?? 0, gifMainMs: Math.round(c.gifMainMs ?? 0), gifMainMaxStepMs: Math.round(c.gifMainMax ?? 0), yields: c.yn ?? 0, yieldWaitMs: Math.round(c.yms ?? 0), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; });
// Quiet when nothing converted, painted or yielded for `quiet` ms. Timer-driven so a tab without frames cannot hang it.
const settle = (page, tiles, quiet = 500, limit = 180000) => page.evaluate(async ({ tiles, quiet, limit }) => {
  const start = performance.now(); let last = start, seen = -1;
  while (performance.now() - start < limit) {
    await new Promise(r => setTimeout(r, 25));
    const now = window.__i.mc + window.__i.put + (globalThis.__c?.q ?? 0), ready = document.querySelectorAll('.tile').length >= tiles;
    if (now !== seen || !ready) { seen = now; last = performance.now(); } else if (performance.now() - last >= quiet) return Math.round(last - start);
  }
  return -1;
}, { tiles, quiet, limit });
const animated = files => files.some(f => f.mimeType === 'image/gif');
async function add(page, files, quiet = 600) {
  await page.waitForTimeout(600);
  await page.setInputFiles('input[type=file][accept="image/*"]', files, { timeout: 120000 });
  await page.waitForFunction(n => document.querySelectorAll('.tile').length >= n && !document.querySelector('.example-add'), files.length, { timeout: 180000, polling: 50 });
  return settle(page, files.length, quiet, animated(files) ? 5000 : 180000);
}
const compact = r => ({ conversions: r.conversions, convertedPixels: r.convertedPixels, paints: r.paints, long: r.long, rafGapMax: r.rafGapMax });
const out = join(root, 'out', label); mkdirSync(out, { recursive: true });
async function fetchExport(page) { // bytes of the newest captured export
  const b64 = await page.evaluate(() => { const bytes = new Uint8Array(window.__i.exports.at(-1).bytes); let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(s); });
  return Buffer.from(b64, 'base64');
}
// Content identity of one export: the file's hash, or for a ZIP the hash of every entry (ZIP headers carry the time).
const identity = (name, bytes) => name.endsWith('.zip') ? sha(Buffer.from(JSON.stringify(Object.entries(unzipSync(new Uint8Array(bytes))).sort(([a], [b]) => a < b ? -1 : 1).map(([n, b]) => [n, sha(b)])))) : sha(bytes);

const tests = {
  // F1. The same export in the unchanged build and in the build whose yieldExport delegates to yieldTask.
  async exportPhases() {
    const cases = { gif64x120: [file('small.gif', 'image/gif', gif(64, 64, 120, 3))], gif256x60: [file('mid.gif', 'image/gif', gif(256, 256, 60, 5))], still1024: [file('still.png', 'image/png', png(1024, 1024, noisy(1024, 1024, 7)))], realWall: [...clips(), ...buildings()] };
    const result = {};
    for (const [name, files] of Object.entries(cases)) {
      const rows = { base: [], yield: [] }, ids = { base: new Set(), yield: new Set() };
      for (const order of [['base', 'yield'], ['yield', 'base']]) for (const build of order) {
        const { page, close } = await open(build, palette()); await add(page, files, 1500);
        for (let i = 0; i < 3; i++) {
          await page.waitForTimeout(600); await reset(page);
          await page.evaluate(() => { window.__t0 = performance.now(); document.querySelector('.export-action').click(); });
          await page.waitForFunction(() => window.__i.exports.at(-1)?.done, null, { timeout: 300000, polling: 50 });
          const meta = await page.evaluate(() => { const e = window.__i.exports.at(-1); return { ms: Math.round(e.at - window.__t0), name: e.name, size: e.size, sha: e.sha }; }), r = await read(page);
          const bytes = await fetchExport(page); if (sha(bytes) !== meta.sha) throw new Error('export transfer was damaged');
          ids[build].add(identity(meta.name, bytes));
          if (!rows[build].length) writeFileSync(join(out, `${name}.${build}.${meta.name.split('.').pop()}`), bytes);
          rows[build].push({ ms: meta.ms, yields: r.yields, yieldWaitMs: r.yieldWaitMs, long: r.long, rafGapMax: r.rafGapMax, size: meta.size });
        }
        await close();
      }
      const sum = build => ({ ms: rows[build].map(r => r.ms), yields: rows[build][0].yields, yieldWaitMs: rows[build].map(r => r.yieldWaitMs), longMax: Math.max(0, ...rows[build].flatMap(r => r.long)), rafGapMax: Math.max(...rows[build].map(r => r.rafGapMax)), distinctContents: ids[build].size });
      result[name] = { files: files.length, base: sum('base'), yield: sum('yield'), identicalContent: ids.base.size === 1 && ids.yield.size === 1 && [...ids.base][0] === [...ids.yield][0] };
    }
    return result;
  },
  // F2. Conversions started when Original comparison ends and when the viewer closes, counted at the quantizer itself.
  async originalToggle() {
    const result = {};
    for (const [name, files] of Object.entries({ buildings: buildings(), noisy12: photos(12, 1024) })) {
      const { page, close } = await open('base', palette()); await add(page, files, 1200);
      const cycles = [];
      for (let i = 0; i < 5; i++) {
        await page.keyboard.down('Space'); await page.waitForTimeout(900);
        await reset(page); await page.keyboard.up('Space'); const ms = await settle(page, files.length, 400);
        cycles.push({ settleMs: ms, ...compact(await read(page)) });
      }
      await reset(page); await page.locator('.tile .art').first().click(); await page.waitForSelector('dialog.image-viewer[open]'); await settle(page, files.length, 500);
      const opened = compact(await read(page));
      await reset(page); await page.locator('.viewer-close').click(); const ms = await settle(page, files.length, 500);
      result[name] = { tiles: files.length, sampleSizes: await page.evaluate(() => [...new Set([...document.querySelectorAll('.tile canvas')].map(c => c.width + 'x' + c.height))]), originalOff: cycles, viewerOpen: opened, viewerClose: { settleMs: ms, ...compact(await read(page)) } };
      await close();
    }
    return result;
  },
  // F4. Workers made and terminated, and omggif decodes on the main thread, per kind of GIF.
  async singleFrameGif() {
    const sets = {
      eightSingle256: Array.from({ length: 8 }, (_, i) => file(`one${i}.gif`, 'image/gif', gif(256, 256, 1, i + 20))),
      eightTwoFrame256: Array.from({ length: 8 }, (_, i) => file(`two${i}.gif`, 'image/gif', gif(256, 256, 2, i + 20))),
      single2048: [file('big1.gif', 'image/gif', gif(2048, 2048, 1, 11))], twoFrame2048: [file('big2.gif', 'image/gif', gif(2048, 2048, 2, 11))],
    };
    const result = {};
    for (const [name, files] of Object.entries(sets)) {
      if (!files.length) continue; const runs = [];
      for (let i = 0; i < 2; i++) {
        const { page, close } = await open('base', palette()); await page.waitForTimeout(600); await reset(page);
        await page.evaluate(() => { window.__t0 = performance.now(); }); await page.setInputFiles('input[type=file][accept="image/*"]', files);
        await page.waitForFunction(n => document.querySelectorAll('.tile').length >= n && !document.querySelector('.example-add'), files.length, { timeout: 120000, polling: 25 });
        const ms = await page.evaluate(() => Math.round(performance.now() - window.__t0)); await settle(page, files.length, 400, 4000); const r = await read(page);
        runs.push({ tilesMs: ms, importWorkersMade: r.workersMade.filter(n => n.includes('image-import')).length, importWorkersTerminated: r.workersTerminated.filter(n => n.includes('image-import')).length, mainThreadGifDecodes: r.gifMain, mainThreadGifMs: r.gifMainMs, longestDecodeStepMs: r.gifMainMaxStepMs, long: r.long, longScripts: r.longScripts, rafGapMax: r.rafGapMax });
        await close();
      }
      result[name] = runs;
    }
    return result;
  },
  // F8. Work started by stepping the palette Opacity cut, with Auto and a cap of 8 on the real wall.
  async alphaSlider() {
    const files = [...buildings(), ...photos(6, 1024)];
    const { page, close } = await open('base', palette({ paletteId: 'generated-32', maxColors: 8, alphaCut: 127 }));
    await add(page, files, 2500);
    await page.locator('button[aria-label="Palette settings"]').click(); const slider = page.locator('#full-alpha-cut'); await slider.waitFor({ timeout: 10000 }); await slider.focus();
    await settle(page, files.length, 1500);
    const run = async presses => {
      await reset(page); const start = Date.now();
      for (let i = 0; i < presses; i++) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(50); }
      const input = Date.now() - start, ms = await settle(page, files.length, 1500), r = await read(page);
      const count = (list, part) => list.filter(n => n.includes(part)).length;
      return { presses, inputMs: input, settleAfterInputMs: ms, value: await slider.inputValue(), generatedWorkers: [count(r.workersMade, 'generated'), count(r.workersTerminated, 'generated')], limitWorkers: [count(r.workersMade, 'limit'), count(r.workersTerminated, 'limit')], conversions: r.conversions, convertedPixels: r.convertedPixels, long: r.long, rafGapMax: r.rafGapMax };
    };
    const one = await run(1), twenty = await run(20), oneAgain = await run(1);
    await close(); return { files: files.length, note: 'workers are [made, terminated]', one, twenty, oneAgain };
  },
  // F5. Visible conversion work with the current cache policy and with reservations released off screen.
  async cacheVisibility() {
    const files = clips(), result = { files: files.length };
    for (const build of ['base', 'cachevis', 'base', 'cachevis']) {
      const { page, close } = await open(build, palette()); await page.setInputFiles('input[type=file][accept="image/*"]', files);
      await page.waitForFunction(n => document.querySelectorAll('.tile').length >= n, files.length, { timeout: 120000 }); await page.waitForTimeout(12000);
      const sample = async seconds => { await reset(page); await page.waitForTimeout(seconds * 1000); const r = await read(page); return { conversionsPerSecond: +(r.conversions / seconds).toFixed(1), megapixelsPerSecond: +(r.convertedPixels / seconds / 1e6).toFixed(2), paintsPerSecond: +(r.paints / seconds).toFixed(1), framesPerSecond: +(r.frames / seconds).toFixed(1), rafGapMax: r.rafGapMax, long: r.long, heap: r.heap }; };
      const visible = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((t, i) => { const r = t.querySelector('.art').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight ? i : -1; }).filter(i => i >= 0));
      const scroll = to => page.evaluate(to => { const g = document.querySelector('.grid'); g.scrollTop = to === 'bottom' ? g.scrollHeight : 0; }, to);
      const row = { topVisible: await visible(), top: await sample(5) };
      await scroll('bottom'); await page.waitForTimeout(8000); row.bottomVisible = await visible(); row.bottom = await sample(5);
      await scroll('top'); row.backAtTopFirst3s = await sample(3); row.backAtTopNext5s = await sample(5);
      (result[build] ??= []).push(row); await close();
    }
    return result;
  },
  // F9 / CXS-01. 1-bit Save and Save all at 18f8dd2, with the time inside each stage, and the same with one
  // posted-task yield after each file. Builds: .tmp/claude-review/vite.onebit.config.js -> site/onebit-base, onebit-yieldfiles.
  async oneBitExport() {
    const cases = { dungeonGif: real(['dungeon.gif']), realWall: [...clips(), ...buildings()], photos12: photos(12, 1024) };
    const seed = { ...base, family: 'two-color' }, dir = join(root, 'out', label + '-onebit'); mkdirSync(dir, { recursive: true });
    const result = {};
    for (const [name, files] of Object.entries(cases)) {
      const rows = {}, ids = {};
      for (const order of [['onebit-base', 'onebit-yieldfiles'], ['onebit-yieldfiles', 'onebit-base']]) for (const build of order) {
        const { page, close } = await open(build, seed); await add(page, files, 1500);
        for (let i = 0; i < 3; i++) {
          await page.waitForTimeout(700); await reset(page);
          await page.evaluate(() => { window.__t0 = performance.now(); document.querySelector('.export-action').click(); });
          await page.waitForFunction(() => window.__i.exports.at(-1)?.done, null, { timeout: 300000, polling: 50 });
          const meta = await page.evaluate(() => { const e = window.__i.exports.at(-1); return { ms: Math.round(e.at - window.__t0), name: e.name, size: e.size, sha: e.sha }; });
          const c = await page.evaluate(() => Object.fromEntries(Object.entries(globalThis.__c ?? {}).map(([k, v]) => [k, Math.round(v)]))), r = await read(page);
          const bytes = await fetchExport(page); if (sha(bytes) !== meta.sha) throw new Error('export transfer was damaged');
          (ids[build] ??= new Set()).add(identity(meta.name, bytes));
          if (!rows[build]) writeFileSync(join(dir, `${name}.${build.replace('onebit-', '')}.${meta.name.split('.').pop()}`), bytes);
          (rows[build] ??= []).push({ ms: meta.ms, longestTask: Math.max(0, ...r.long), tasksOver50: r.long.length, rafGapMax: r.rafGapMax,
            reread: [c.rereadMs ?? 0, c.rereadN ?? 0], masks: [c.maskMs ?? 0, c.maskN ?? 0, c.maskMax ?? 0], png: [c.pngMs ?? 0, c.pngN ?? 0, c.pngMax ?? 0], gif: [c.gifMs ?? 0, c.gifN ?? 0, c.gifMax ?? 0], zip: [c.zipMs ?? 0, c.zipN ?? 0], size: meta.size });
        }
        await close();
      }
      const a = [...ids['onebit-base']], b = [...ids['onebit-yieldfiles']];
      result[name] = { files: files.length, note: 'stage arrays are [total ms, calls, longest call ms]', base: rows['onebit-base'], yieldBetweenFiles: rows['onebit-yieldfiles'], identicalContent: a.length === 1 && b.length === 1 && a[0] === b[0] };
    }
    return result;
  },
  // Review of 6ae364a and 8cd02d6 on an unmodified production build: 1-bit Save and Save all.
  async plainExport() {
    const build = process.env.PLAIN_BUILD ?? 'head-346e19e', before = join(root, 'out', 'phone-onebit');
    const cases = { dungeonGif: real(['dungeon.gif']), realWall: [...clips(), ...buildings()], photos12: photos(12, 1024) }, result = { build };
    for (const [name, files] of Object.entries(cases)) {
      const { page, close } = await open(build, { ...base, family: 'two-color' }); await add(page, files, 1500); const rows = []; let same = null;
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(700); await reset(page);
        await page.evaluate(() => { window.__t0 = performance.now(); document.querySelector('.export-action').click(); });
        await page.waitForFunction(() => window.__i.exports.at(-1)?.done, null, { timeout: 300000, polling: 50 });
        const meta = await page.evaluate(() => { const e = window.__i.exports.at(-1); return { ms: Math.round(e.at - window.__t0), name: e.name }; }), r = await read(page);
        if (i === 0) { const bytes = await fetchExport(page), old = `${name}.base.${meta.name.split('.').pop()}`; same = existsSync(join(before, old)) ? identity(meta.name, bytes) === identity(old, readFileSync(join(before, old))) : 'no earlier capture'; }
        rows.push({ ms: meta.ms, longestTask: Math.max(0, ...r.long), tasksOver50: r.long.length, rafGapMax: r.rafGapMax });
      }
      result[name] = { files: files.length, sameContentAs18f8dd2: same, runs: rows }; await close();
    }
    return result;
  },
  // CXS-02. A 1-bit style step that changes what brightness is read from re-analyses the whole wall in one task.
  // Cutout reads luma and Solid reads green (seeded), so stepping between them re-analyses; the control seeds
  // both to luma, so the same step only redraws. Build: .tmp/claude-review/vite.reread.config.js -> site/reread-346e19e.
  async liveReanalysis() {
    const smooth = (w, h) => { const d = new Uint8Array(w * h * 4); for (let p = 0, i = 0; p < w * h; p++, i += 4) { d[i] = (p % w) * 255 / w; d[i + 1] = Math.floor(p / w) * 255 / h; d[i + 2] = ((p % w) + Math.floor(p / w)) & 255; d[i + 3] = 255; } return d; };
    const walls = { realWall: [...clips(), ...buildings()], photos12: photos(12, 1024), fourOf4MP: Array.from({ length: 4 }, (_, i) => file(`big${i}.png`, 'image/png', png(2048, 2048, smooth(2048, 2048)))) };
    const seed = source => ({ ...base, family: 'two-color', settings: { cutout: { threshold: null, seams: null, rim: true, source: 'luma', alpha: 128 }, solid: { threshold: null, source, alpha: 128 } } });
    const result = {};
    for (const [name, files] of Object.entries(walls)) {
      const row = { files: files.length };
      for (const [label2, source] of [['reanalysing', 'green'], ['control', 'luma']]) {
        const { page, close } = await open(process.env.REANALYSIS_BUILD ?? 'reread-346e19e', seed(source)); await add(page, files, 2000); const steps = [];
        for (let i = 0; i < 6; i++) {
          await page.waitForTimeout(600); await reset(page); await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown'); await page.waitForTimeout(2500);
          const r = await read(page), c = await page.evaluate(() => Object.fromEntries(Object.entries(globalThis.__c ?? {}).map(([k, v]) => [k, Math.round(v)])));
          steps.push({ style: await page.evaluate(() => JSON.parse(localStorage.getItem('bitify')).style), longestTask: Math.max(0, ...r.long), tasksOver50: r.long.length, rafGapMax: r.rafGapMax, rereadMs: c.rereadMs ?? 0, itemsReanalysed: c.rereadWork ?? 0, longestItemMs: c.rereadMax ?? 0 });
        }
        row[label2] = steps; await close();
      }
      result[name] = row;
    }
    return result;
  },
};
const results = {};
try {
  const probe = await open('base', palette()); results.environment = { target: label, browser: browser.version(), ...(await env(probe.page)) }; await probe.close();
  for (const [name, test] of Object.entries(tests)) {
    if (only.length && !only.includes(name)) continue;
    const start = Date.now();
    try { results[name] = await test(); } catch (error) { results[name] = { error: String(error?.stack ?? error).slice(0, 500) }; }
    console.error(`${name}: ${Date.now() - start} ms`);
  }
} finally {
  for (const page of mine) await page.close().catch(() => {}); // only tabs this script opened
  const path = join(root, `results-${label}${only.length ? '-' + only.join('+') : ''}.json`);
  writeFileSync(path, JSON.stringify(results, null, 1)); console.log(path);
  if (label === 'phone') await browser.close().catch(() => {}); else await browser.close(); // over CDP this only disconnects
  server.close();
}
