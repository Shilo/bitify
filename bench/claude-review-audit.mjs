// Kept as the record behind docs/research/*claude-code*-review.md (October 2026), not as a maintained tool.
// Several tests need diagnostic builds made from since-deleted .tmp configs written against older commits.
// For regression checks use the tracked QA pages in this folder instead.
// Claude Code reviewer diagnostics for docs/research/2026-10-12-claude-code-project-performance-stability-review.md.
// Harness only: nothing here is imported by the app. Build first, then:
//   npx vite build --outDir .tmp/claude-review-dist --emptyOutDir
//   node bench/claude-review-audit.mjs .tmp/claude-review-dist . [test names...]
// Tests: originalToggle paletteExport oneBitZip singleFrameGif limitRestart limitFailure doubleSave
//        cacheStarvation repeatExport pngImportFrames exportTimerAB bigSingleGif
// exportTimerAB compares content hashes (per entry for a ZIP), not lengths. Its global timer shim is only
// directional; bench/claude-review-phone.mjs measures the actual built change and is the one to trust.
// BROWSER overrides the Chromium executable. Downloads go to Playwright's temporary artifacts.
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname, sep, join } from 'node:path';
import { createRequire } from 'node:module';
import { deflateSync, crc32 } from 'node:zlib';
import { createHash } from 'node:crypto';

const dist = resolve(process.argv[2]), repo = resolve(process.argv[3]);
const only = process.argv.slice(4);
const require = createRequire(join(repo, 'package.json'));
const omggif = require('omggif'), { unzipSync } = require('fflate');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// Content identity: the file's hash, or for a ZIP the hash of every entry (ZIP headers carry the time).
const identity = path => { const bytes = readFileSync(path); return bytes[0] === 0x50 && bytes[1] === 0x4b ? sha(JSON.stringify(Object.entries(unzipSync(new Uint8Array(bytes))).sort(([a], [b]) => a < b ? -1 : 1).map(([n, b]) => [n, sha(b)]))) : sha(bytes); };
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

// ---------- fixtures ----------
function png(w, h, rgba) {
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
  };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(rows, y * (w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 1 })), chunk('IEND', Buffer.alloc(0))]);
}
function noisy(w, h, seed) { // gradient + noise: far more than 4096 colors
  const data = new Uint8Array(w * h * 4); let s = seed >>> 0;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    data[i] = ((p % w) * 255 / w + (s >>> 16 & 31)) & 255; data[i + 1] = (Math.floor(p / w) * 255 / h + (s >>> 8 & 31)) & 255; data[i + 2] = s >>> 20 & 255; data[i + 3] = 255;
  }
  return data;
}
function gif(w, h, frames, seed, delay = 10) {
  const buffer = new Uint8Array(1024 + frames * (w * h * 2 + 1024)), palette = Array.from({ length: 16 }, (_, i) => (i * 0x0f1323 + 0x101010) & 0xffffff);
  const writer = new omggif.GifWriter(buffer, w, h, { palette, loop: 0 }); let s = seed >>> 0;
  for (let f = 0; f < frames; f++) {
    const indices = new Uint8Array(w * h);
    for (let p = 0; p < indices.length; p++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; indices[p] = ((p % w >> 4) + (p / w >> 4) + f + (s >>> 28 & 1)) & 15; }
    writer.addFrame(0, 0, w, h, indices, { delay });
  }
  return Buffer.from(buffer.subarray(0, writer.end()));
}
const file = (name, mimeType, buffer) => ({ name, mimeType, buffer });
const photos = (n, size) => Array.from({ length: n }, (_, i) => file(`photo${i}.png`, 'image/png', png(size, size, noisy(size, size, i + 1))));

// ---------- server ----------
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!path.startsWith(dist + sep) || !existsSync(path)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'max-age=3600' }).end(readFileSync(path));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}/`;

// ---------- page instrumentation ----------
function instrument(seed) {
  localStorage.setItem('bitify', JSON.stringify(seed));
  const I = window.__i = { mc: 0, put: 0, long: [], timers0: 0, made: [], urls: {}, term: 0, fail: null, gapMax: 0 };
  const MC = window.MessageChannel; window.MessageChannel = function () { I.mc++; return new MC(); };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (...a) { I.put++; return put.apply(this, a); };
  const st = window.setTimeout; window.setTimeout = function (fn, ms, ...rest) { if (!ms) { I.timers0++; if (I.shim && typeof fn === 'function') { const c = new MC(); c.port1.onmessage = () => { c.port1.close(); c.port2.close(); fn(...rest); }; c.port2.postMessage(null); return 0; } } return st.call(window, fn, ms, ...rest); };
  new PerformanceObserver(list => { for (const e of list.getEntries()) I.long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  I.frames = [];
  try { new PerformanceObserver(list => { for (const e of list.getEntries()) I.frames.push({ ms: Math.round(e.duration), blocking: Math.round(e.blockingDuration), scripts: e.scripts.map(x => ({ invoker: x.invoker, fn: x.sourceFunctionName, at: x.sourceCharPosition, file: (x.sourceURL || '').split('/').pop(), ms: Math.round(x.duration) })).filter(x => x.ms >= 5) }); }).observe({ type: 'long-animation-frame', buffered: false }); } catch {}
  const W = window.Worker;
  window.Worker = class extends W {
    constructor(url, options) {
      const name = String(url).split('/').pop().replace(/-[\w-]{8}\.js.*$/, '').replace(/\?.*$/, '');
      if (I.fail && name.includes(I.fail)) super(URL.createObjectURL(new Blob(['throw new Error("injected worker failure")'], { type: 'text/javascript' })), options);
      else super(url, options);
      I.made.push(name); I.urls[name] = String(url);
    }
    terminate() { I.term++; super.terminate(); }
  };
  let last = performance.now();
  st.call(window, function beat() { const now = performance.now(); I.gapMax = Math.max(I.gapMax, now - last); last = now; st.call(window, beat, 0); }, 0);
}
const base = { first: '#222323', second: '#f0f6f0', none: 0, style: 'cutout' };
const palette = (extra = {}) => ({ ...base, family: 'full-palette', paletteId: 'preset-edg32', alphaCut: 128, metric: 'oklab', maxColors: 0, lastMaxColors: 16, cleanup: false, ...extra });

const browser = await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
async function open(seed, { phone = false } = {}) {
  const context = await browser.newContext(phone
    ? { viewport: { width: 412, height: 780 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, acceptDownloads: true }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, acceptDownloads: true });
  await context.addInitScript(instrument, seed);
  const page = await context.newPage();
  page.on('pageerror', error => console.error('pageerror', error.message));
  await page.goto(origin);
  await page.waitForSelector('.tile canvas');
  return { context, page };
}
const reset = page => page.evaluate(() => { const I = window.__i; I.mc = I.put = I.timers0 = I.gapMax = 0; I.long = []; });
const read = page => page.evaluate(() => { const { mc, put, long, timers0, made, term, gapMax } = window.__i; return { mc, put, long: [...long], timers0, workersMade: made.length, workersTerminated: term, gapMax: Math.round(gapMax) }; });
// Wait until `count` art canvases exist and nothing has painted or yielded for `quiet` ms.
async function settle(page, count, quiet = 500, limit = 120000) {
  return page.evaluate(async ({ count, quiet, limit }) => {
    const start = performance.now(); let last = start, seen = -1;
    while (performance.now() - start < limit) {
      await new Promise(r => requestAnimationFrame(r));
      const now = window.__i.mc + window.__i.put, ready = document.querySelectorAll('.tile canvas').length >= count;
      if (now !== seen || !ready) { seen = now; last = performance.now(); }
      else if (performance.now() - last >= quiet) return Math.round(last - start);
    }
    return -1;
  }, { count, quiet, limit });
}
async function add(page, files, count = files.length) {
  await page.setInputFiles('input[type=file][accept="image/*"]', files);
  return settle(page, count);
}
const results = {};
const tests = {
  // F2: an unchanged palette-family still is converted again after Original comparison ends and after the viewer closes.
  async originalToggle() {
    const out = {};
    for (const phone of [false, true]) {
      const { context, page } = await open(palette(), { phone });
      await add(page, photos(12, 1024));
      const key = phone ? 'phone' : 'desktop', rows = [];
      for (let i = 0; i < 5; i++) {
        await page.keyboard.down('Space'); await settle(page, 12, 300);
        await reset(page); await page.keyboard.up('Space');
        const ms = await settle(page, 12, 300); rows.push({ settleMs: ms, ...(await read(page)) });
      }
      out[key] = { originalOff: rows.map(r => ({ settleMs: r.settleMs, yields: r.mc, paints: r.put, long: r.long })) };
      await reset(page); await page.locator('.tile .art').first().click(); await page.waitForSelector('dialog.image-viewer[open]'); await settle(page, 12, 400);
      await reset(page); await page.locator('.viewer-close').click(); const ms = await settle(page, 12, 400);
      const closed = await read(page); out[key].viewerClose = { settleMs: ms, yields: closed.mc, paints: closed.put };
      await context.close();
    }
    return out;
  },
  // F1: palette-family exports wait on nested zero-delay timers.
  async paletteExport() {
    const out = {};
    const cases = { still2048: [file('big.png', 'image/png', png(2048, 2048, noisy(2048, 2048, 7)))], gif64x120: [file('small.gif', 'image/gif', gif(64, 64, 120, 3))], gif256x60: [file('mid.gif', 'image/gif', gif(256, 256, 60, 5))] };
    for (const [name, files] of Object.entries(cases)) {
      const { context, page } = await open(palette()); await add(page, files, 1); const rows = [];
      for (let i = 0; i < 3; i++) {
        await reset(page); const start = Date.now();
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.export-action').click()]);
        await download.path(); rows.push({ ms: Date.now() - start, ...(await read(page)) });
      }
      out[name] = rows.map(r => ({ ms: r.ms, zeroTimers: r.timers0, long: r.long, gapMax: r.gapMax }));
      await context.close();
    }
    return out;
  },
  // F3 (known limit, quantified): 1-bit Save all is one uninterrupted task.
  async oneBitZip() {
    const { context, page } = await open({ ...base, family: 'two-color' });
    await add(page, [...photos(12, 1024), file('anim.gif', 'image/gif', gif(256, 256, 60, 9))], 13);
    const rows = [];
    for (let i = 0; i < 3; i++) {
      await reset(page); const start = Date.now();
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.export-action').click()]);
      await download.path(); const r = await read(page); rows.push({ ms: Date.now() - start, long: r.long, gapMax: r.gapMax });
    }
    await context.close(); return rows;
  },
  // F4: every single-frame GIF costs a worker start, a worker termination and repeated decodes.
  async singleFrameGif() {
    const out = {};
    const sets = { singleFrameGifs: Array.from({ length: 8 }, (_, i) => file(`one${i}.gif`, 'image/gif', gif(256, 256, 1, i + 20))), pngsSameSize: Array.from({ length: 8 }, (_, i) => file(`one${i}.png`, 'image/png', png(256, 256, noisy(256, 256, i + 20)))), twoFrameGifs: Array.from({ length: 8 }, (_, i) => file(`two${i}.gif`, 'image/gif', gif(256, 256, 2, i + 20))) };
    for (const [name, files] of Object.entries(sets)) {
      const runs = [];
      for (let i = 0; i < 3; i++) {
        const { context, page } = await open(palette()); await reset(page);
        const start = Date.now(); await page.setInputFiles('input[type=file][accept="image/*"]', files);
        await page.waitForFunction(n => document.querySelectorAll('.tile').length >= n && !document.querySelector('.example-add'), files.length);
        const ms = Date.now() - start, r = await read(page);
        const made = await page.evaluate(() => window.__i.made.filter(n => n.includes('image-import')).length);
        runs.push({ tilesMs: ms, importWorkersMade: made, terminated: r.workersTerminated, long: r.long }); await context.close();
      }
      out[name] = runs;
    }
    return out;
  },
  // F5: superseding a running limit job terminates the worker; the next job starts a new one.
  async limitRestart() {
    const { context, page } = await open(palette({ paletteId: 'preset-res64', maxColors: 8 }));
    await add(page, photos(12, 1024)); const before = await read(page);
    const made0 = before.workersMade, term0 = before.workersTerminated;
    await reset(page);
    for (let i = 0; i < 6; i++) { await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(150); }
    const ms = await settle(page, 12, 600); const after = await read(page);
    // Cost of one worker start in this build: construct, start, first acknowledgment.
    const cold = await page.evaluate(async () => {
      const url = window.__i.urls['palette-limit-worker'], times = [];
      for (let i = 0; i < 12; i++) {
        const t = performance.now(), w = new Worker(url, { type: 'module' });
        await new Promise(done => { w.onmessage = done; w.postMessage({ type: 'start', colors: ['#000000', '#ffffff', '#ff0000'], alphaCut: 128, metric: 'oklab', maxColors: 2 }); });
        times.push(+(performance.now() - t).toFixed(1)); w.terminate();
      }
      return times;
    });
    await context.close();
    return { initial12Jobs: { workersMade: made0, terminated: term0 }, sixPaletteSteps: { settleMs: ms, workersMade: after.workersMade - made0, terminated: after.workersTerminated - term0 }, workerStartMs: cold };
  },
  // F6: after a limit job fails, the tile keeps the previous palette's completed pixels.
  async limitFailure() {
    // Gray 8 with cap 8 needs no limiter, so no limit worker exists before the injected failure.
    const { context, page } = await open(palette({ paletteId: 'preset-gray8', maxColors: 8 }));
    await add(page, photos(2, 256));
    const snap = () => page.evaluate(() => [...document.querySelectorAll('.tile canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, s = new Set(); let h = 0, gray = true; for (let i = 0; i < d.length; i += 4) { h = (Math.imul(h, 31) + (d[i] << 16 | d[i + 1] << 8 | d[i + 2])) | 0; s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); if (d[i] !== d[i + 1] || d[i] !== d[i + 2]) gray = false; } return { hash: h, colors: s.size, gray }; }));
    const state = async () => ({ selected: await page.evaluate(() => JSON.parse(localStorage.getItem('bitify')).paletteId), toast: await page.evaluate(() => document.querySelector('.glass-toast__text')?.textContent), saveDisabled: await page.locator('.export-action').isDisabled(), tiles: await snap(), limitWorkers: await page.evaluate(() => window.__i.made.filter(n => n.includes('limit')).length) });
    const before = await state();
    await page.evaluate(() => { window.__i.fail = 'palette-limit-worker'; });
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1500);
    const failed = await state();
    await page.waitForTimeout(5000); const later = await state();
    // Does an export of the stale-looking wall succeed or fail?
    let exported = 'no download within 6 s';
    const wait = page.waitForEvent('download', { timeout: 6000 }).then(() => { exported = 'downloaded'; }).catch(() => {});
    await page.locator('.export-action').click(); await wait; const afterSave = await state();
    await context.close();
    return { before, failed, later, exported, toastAfterSave: afterSave.toast };
  },
  // F7: a second Save all while one is running starts a second full export.
  async doubleSave() {
    const { context, page } = await open(palette()); await add(page, photos(6, 1024));
    let downloads = 0; page.on('download', () => downloads++);
    await reset(page); const start = Date.now();
    await page.locator('.export-action').click(); await page.waitForTimeout(60); await page.locator('.export-action').click();
    const disabledDuring = await page.locator('.export-action').isDisabled();
    await page.waitForFunction(() => !document.querySelector('.spin'), null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(1500); const ms = Date.now() - start;
    await context.close(); return { downloads, disabledDuring, totalMs: ms };
  },
  // F8: clips that do not fit the 8 MiB preview cache convert every frame forever, even when the clip
  // that holds the reservation is off screen.
  async cacheStarvation() {
    const { context, page } = await open(palette(), { phone: true });
    const clips = Array.from({ length: 8 }, (_, i) => file(`clip${i}.gif`, 'image/gif', gif(256, 256, 40, i + 40)));
    await page.setInputFiles('input[type=file][accept="image/*"]', clips);
    await page.waitForFunction(() => document.querySelectorAll('.tile').length >= 8, null, { timeout: 120000 }); await page.waitForTimeout(10000); // two full loops
    const sample = async () => { await reset(page); await page.waitForTimeout(4000); const r = await read(page); return { yieldsPerSecond: +(r.mc / 4).toFixed(1), paintsPerSecond: +(r.put / 4).toFixed(1), long: r.long }; };
    const visible = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((t, i) => { const r = t.querySelector('.art').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight ? i : -1; }).filter(i => i >= 0));
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.tile canvas')].map(c => c.width + 'x' + c.height));
    const top = { visibleTiles: await visible(), ...(await sample()) };
    await page.evaluate(() => { const g = document.querySelector('.grid'); g.scrollTop = g.scrollHeight; }); await page.waitForTimeout(6000);
    const bottom = { visibleTiles: await visible(), ...(await sample()) };
    await context.close();
    return { sampleSizes: sizes, bytesPerClip: 40 * (256 * 256 * 2 + 256), budget: 8 * 1024 * 1024, top, bottom };
  },
  // Does a repeated export of the same still slow down, and where does the time go?
  async repeatExport() {
    const { context, page } = await open(palette()); await add(page, [file('big.png', 'image/png', png(2048, 2048, noisy(2048, 2048, 7)))], 1); const rows = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500); await reset(page); const start = Date.now();
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.export-action').click()]);
      const fired = Date.now() - start; await download.path(); const r = await read(page);
      rows.push({ clickToDownloadEventMs: fired, yields: r.mc, zeroTimers: r.timers0, gapMax: r.gapMax });
    }
    await context.close(); return rows;
  },
  // Which script produces the long task while eight noisy 256x256 PNGs are added?
  async pngImportFrames() {
    const out = {};
    for (const id of ['preset-edg32', 'generated-32']) {
      const { context, page } = await open(palette({ paletteId: id })); await page.waitForTimeout(800); await page.evaluate(() => { window.__i.frames = []; }); await reset(page);
      await add(page, Array.from({ length: 8 }, (_, i) => file('one' + i + '.png', 'image/png', png(256, 256, noisy(256, 256, i + 20)))), 8);
      out[id] = { long: (await read(page)).long, frames: await page.evaluate(() => window.__i.frames.filter(f => f.ms >= 50)) };
      await context.close();
    }
    return out;
  },
  // F1 A/B on the built app: the same export with zero-delay timers delivered as posted tasks (harness shim).
  async exportTimerAB() {
    const dir = join(repo, '.tmp/auto64-ui-20261012/build/fixtures');
    const wall = existsSync(dir) ? readdirSync(dir).filter(n => /.(png|gif)$/i.test(n)).map(n => file(n, n.endsWith('.gif') ? 'image/gif' : 'image/png', readFileSync(join(dir, n)))) : [];
    const cases = { gif64x120: [file('small.gif', 'image/gif', gif(64, 64, 120, 3))], gif256x60: [file('mid.gif', 'image/gif', gif(256, 256, 60, 5))], still1024: [file('still.png', 'image/png', png(1024, 1024, noisy(1024, 1024, 7)))] };
    if (wall.length) cases['fixtureWall' + wall.length] = wall;
    const out = {};
    for (const [name, files] of Object.entries(cases)) {
      const { context, page } = await open(palette()); await page.setInputFiles('input[type=file][accept="image/*"]', files);
      await page.waitForFunction(n => document.querySelectorAll('.tile').length >= n, files.length, { timeout: 120000 }); await page.waitForTimeout(3000);
      const rows = [];
      for (let i = 0; i < 6; i++) {
        const shim = i % 2 === 1; await page.evaluate(v => { window.__i.shim = v; }, shim); await page.waitForTimeout(400); await reset(page);
        const start = Date.now(); const [download] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.locator('.export-action').click()]);
        const ms = Date.now() - start; const path = await download.path(); const r = await read(page);
        rows.push({ shim, ms, zeroTimers: r.timers0, content: identity(path), gapMax: r.gapMax, long: r.long });
      }
      out[name] = { current: rows.filter(r => !r.shim).map(r => r.ms), postedTasks: rows.filter(r => r.shim).map(r => r.ms), zeroTimers: rows[0].zeroTimers, sameContent: new Set(rows.map(r => r.content)).size === 1, gapMaxCurrent: Math.max(...rows.filter(r => !r.shim).map(r => r.gapMax)), gapMaxPosted: Math.max(...rows.filter(r => r.shim).map(r => r.gapMax)), longPosted: rows.filter(r => r.shim).flatMap(r => r.long) };
      await context.close();
    }
    return out;
  },
  // F4: a large single-frame GIF is decoded by omggif on the main thread although a worker exists.
  async bigSingleGif() {
    const out = {};
    for (const [name, frames] of [['oneFrame', 1], ['twoFrames', 2]]) {
      const { context, page } = await open(palette()); await page.waitForTimeout(800); await page.evaluate(() => { window.__i.frames = []; }); await reset(page);
      const start = Date.now(); await page.setInputFiles('input[type=file][accept="image/*"]', [file('big.gif', 'image/gif', gif(2048, 2048, frames, 11))]);
      await page.waitForFunction(() => document.querySelectorAll('.tile').length >= 1 && !document.querySelector('.example-add'), null, { timeout: 120000 });
      const ms = Date.now() - start, r = await read(page);
      out[name] = { tileMs: ms, long: r.long, gapMax: r.gapMax, importWorkers: await page.evaluate(() => window.__i.made.filter(n => n.includes('image-import')).length), terminated: r.workersTerminated, blockingScripts: await page.evaluate(() => window.__i.frames.flatMap(f => f.scripts).filter(x => x.ms >= 50).map(x => ({ invoker: x.invoker, ms: x.ms, file: x.file }))) };
      await context.close();
    }
    return out;
  },
  // Review of b0738c2: reuse must happen only when the retained picture really is the current one.
  async originalAdversarial() {
    const hashes = page => page.evaluate(() => [...document.querySelectorAll('.tile canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + (d[i] << 16 | d[i + 1] << 8 | d[i + 2])) | 0; return c.width + 'x' + c.height + ':' + h; }).join(' '));
    const fresh = async id => { const { context, page } = await open(palette({ paletteId: id })); await add(page, photos(6, 512)); const h = await hashes(page); await context.close(); return h; };
    const refA = await fresh('preset-edg32'), refB = await fresh('preset-pico8');
    const { context, page } = await open(palette()); await add(page, photos(6, 512)); const out = { startMatchesA: await hashes(page) === refA, refsDiffer: refA !== refB };
    const step = async (name, during) => { await page.keyboard.down('Space'); await settle(page, 6, 300); await reset(page); await during(); await page.keyboard.up('Space'); await settle(page, 6, 400); const r = await read(page); out[name] = { yields: r.mc, paints: r.put, hash: await hashes(page) }; };
    await step('unchanged', async () => {});                                   out.unchanged.ok = out.unchanged.yields === 0 && out.unchanged.hash === refA;
    await step('changedDuringOriginal', async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); }); out.changedDuringOriginal.ok = out.changedDuringOriginal.yields > 0 && out.changedDuringOriginal.hash === refB;
    await step('thereAndBack', async () => { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); }); out.thereAndBack.ok = out.thereAndBack.hash === refB;
    await step('backToFirst', async () => { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200); }); out.backToFirst.ok = out.backToFirst.yields > 0 && out.backToFirst.hash === refA;
    await step('resizedDuringOriginal', async () => { await page.setViewportSize({ width: 700, height: 800 }); await page.waitForTimeout(300); }); out.resizedDuringOriginal.ok = out.resizedDuringOriginal.yields > 0 && out.resizedDuringOriginal.hash !== refA;
    await step('unchangedAfterResize', async () => {}); out.unchangedAfterResize.ok = out.unchangedAfterResize.yields === 0 && out.unchangedAfterResize.hash === out.resizedDuringOriginal.hash;
    // Viewer: open and close with nothing changed, then with the palette changed inside it.
    await reset(page); await page.locator('.tile .art').first().click(); await page.waitForSelector('dialog.image-viewer[open]'); await settle(page, 6, 400); await reset(page);
    await page.locator('.viewer-close').click(); await settle(page, 6, 400); const closed = await read(page); out.viewerCloseUnchanged = { yields: closed.mc, paints: closed.put, ok: closed.mc === 0 };
    for (const key of Object.keys(out)) if (out[key]?.hash) out[key].hash = out[key].hash.length;
    await context.close(); return out;
  },
};
for (const [name, test] of Object.entries(tests)) {
  if (only.length && !only.includes(name)) continue;
  const start = Date.now();
  try { results[name] = await test(); } catch (error) { results[name] = { error: String(error?.stack ?? error).slice(0, 600) }; }
  console.error(`${name}: ${Date.now() - start} ms`);
}
console.log(JSON.stringify({ browser: browser.version(), origin, results }, null, 1));
await browser.close(); server.close();
