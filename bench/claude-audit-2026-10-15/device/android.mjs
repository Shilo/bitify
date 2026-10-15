// Physical Pixel 8 Pro / Brave over CDP (localhost:9333). Real built app over adb reverse:5316.
// Opens and closes only its own pages; never calls browser.close(). Reads only Download
// files whose names start with this run's unique prefix.
//   node android.mjs correctness | perf | all
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, decode, nearest, compare, contract, usedColors, fx, sha, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const ADB = 'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe', SERIAL = '37211FDJG00267', PORT = 5316;
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8' });
const mode = process.argv[2] ?? 'all', tag = 'cla' + Date.now().toString(36);
const outDir = resolve(repo, 'bench/claude-audit-2026-10-15/device/android'), pulled = resolve(repo, '.tmp/device/downloads/android');
mkdirSync(outDir, { recursive: true }); mkdirSync(pulled, { recursive: true });
const EDG8 = ['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33'];
const R64 = JSON.parse(execFileSync('node', ['-e', "import('./src/lib/palette-library.js').then(m=>process.stdout.write(JSON.stringify(m.FULL_PRESETS.find(p=>p.id==='preset-res64').colors)))"], { cwd: repo, encoding: 'utf8' }));
let seed = 0x5eed1234; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const P256 = [...new Set(Array.from({ length: 400 }, () => '#' + (rnd() & 0xffffff).toString(16).padStart(6, '0')))].slice(0, 256);
const PAL = { 8: { id: 'preset-edg8', colors: EDG8 }, 64: { id: 'preset-res64', colors: R64 }, 256: { id: 'user-audit256', colors: P256 } };
const library = { version: 1, palettes: [{ id: 'user-audit256', name: 'Audit 256', colors: P256, revision: 1, source: { kind: 'custom' } }] };
const base = { family: 'full-palette', paletteId: 'preset-edg8', metric: 'oklab', maxColors: 0, cleanup: false, alphaCut: 128, alphaMode: 'cut', dither: 'none', ditherStrength: 50 };
const results = { tag, date: new Date().toISOString(), indexSha256: sha(readFileSync(resolve(repo, 'dist/index.html'))), fixtures: {}, correctness: [], perf: [], errors: [] };
for (const n of ['alpha-sprite.png', 'ramp.png', 'walk.gif', 'hi256.png', 'hi1024.png', 'hi1024-alpha.png', 'wall0.gif']) results.fixtures[n] = sha(readFileSync(fx(n)));
const device = () => ({ wake: adb('shell', 'dumpsys', 'power').match(/mWakefulness=(\w+)/)?.[1], battery: adb('shell', 'dumpsys', 'battery').match(/temperature: (\d+)/)?.[1] / 10, thermal: adb('shell', 'dumpsys', 'thermalservice').match(/Thermal Status: (\d)/)?.[1] });

const instrument = () => {
  const A = window.__audit = { puts: [], lt: [], raf: [], marks: {}, keepImg: true, anchors: [] };
  A.decode = [];
  if (typeof VideoFrame !== 'undefined') { const copy = VideoFrame.prototype.copyTo; VideoFrame.prototype.copyTo = function (d, o) { const c = this.colorSpace; A.decode.push({ path: o?.format ? 'managed-copyTo' : 'raw-copyTo', format: this.format, colorSpace: c && [c.primaries, c.transfer, c.matrix, c.fullRange] }); return copy.call(this, d, o); }; }
  const bitmap = window.createImageBitmap; window.createImageBitmap = function (s, ...r) { if (s?.type === 'image/png') A.decode.push({ path: 'bitmap-canvas' }); return bitmap.call(this, s, ...r); };
  const put = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function (img, ...rest) {
    const c = this.canvas, art = c.closest?.('.tile .art');
    if (art) A.puts.push({ ex: !!art.closest('.tile')?.querySelector('.example-caption'), t: performance.now(), w: img.width, h: img.height, c, get idx() { return [...document.querySelectorAll('.tile .art canvas')].indexOf(this.c); }, img: A.keepImg ? img : null });
    return put.call(this, img, ...rest);
  };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) A.anchors.push({ t: performance.now(), name: this.download }); return click.call(this); };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) A.lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); A.longtaskSupported = true; } catch { A.longtaskSupported = false; }
  const loop = t => { A.raf.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  document.addEventListener('change', e => { if (e.target.type === 'file') A.marks.change = performance.now(); }, true);
};
const server = await serve(PORT);
adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
// connectOverCDP redirects downloads to a host temp path, which fails on the phone; restore Brave's own behavior.
const cdp = await browser.newBrowserCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'default' });
const context = browser.contexts()[0], owned = [];
results.userAgent = null;
async function open(settings = base, { help = true } = {}) {
  const page = await context.newPage(); owned.push(page); page.setDefaultTimeout(60000);
  page.on('pageerror', e => results.errors.push(e.message));
  await page.addInitScript(instrument);
  await page.goto(`http://localhost:${PORT}/colorfetti/`);
  await page.evaluate(({ settings, library, help }) => { localStorage.clear(); if (help) localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify(settings)); localStorage.setItem('colorfetti-palettes-v1', JSON.stringify(library)); }, { settings, library, help });
  await page.reload(); await page.bringToFront(); await page.waitForTimeout(500);
  results.userAgent ??= await page.evaluate(() => navigator.userAgent);
  return page;
}
const close = async page => { if (!page.isClosed()) await page.close(); };
const payload = (n, as) => ({ name: as ?? `${tag}-${n}`, mimeType: n.endsWith('.gif') ? 'image/gif' : 'image/png', buffer: readFileSync(fx(n)) });
const add = (page, files) => page.locator('input[type=file][accept="image/*"]').setInputFiles(files);
const escape = async page => { await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(200); };
async function openSettings(page) { if (!(await page.getByRole('button', { name: 'Dithering off', exact: true }).isVisible().catch(() => false))) await page.getByRole('button', { name: 'Palette settings', exact: true }).click(); }
// Wait until tile idx has a put after `since` whose visible pixels are all palette members.
async function converted(page, idx, colors, since, timeout = 60000) {
  const h = await page.waitForFunction(({ idx, colors, since }) => {
    const set = new Set(colors);
    for (const p of window.__audit.puts) {
      if (p.ex || p.idx !== idx || p.t < since || !p.img) continue;
      if (p.member === undefined) { const d = p.img.data; let ok = true, vis = 0; for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; vis++; if (!set.has('#' + ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0'))) { ok = false; break; } } p.member = ok && vis > 0; }
      if (p.member) return { t: p.t, w: p.w, h: p.h };
    }
    return false;
  }, { idx, colors, since }, { timeout, polling: 50 });
  return h.jsonValue();
}
// Main-thread health inside [t0,t1]: long tasks overlapping, rAF gaps.
const health = (page, t0, t1) => page.evaluate(({ t0, t1 }) => {
  const A = window.__audit, lt = A.lt.filter(e => e.s + e.d > t0 && e.s < t1), r = A.raf.filter(t => t >= t0 && t <= t1 + 50), gaps = [];
  for (let i = 1; i < r.length; i++) gaps.push(r[i] - r[i - 1]);
  gaps.sort((a, b) => a - b);
  return { longtasks: lt.length, longtaskMs: Math.round(lt.reduce((a, e) => a + e.d, 0)), longestTask: Math.round(Math.max(0, ...lt.map(e => e.d))), rafMaxGap: Math.round(gaps.at(-1) ?? NaN), rafP95Gap: Math.round(gaps[Math.floor(gaps.length * .95)] ?? NaN), rafFrames: r.length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
}, { t0, t1 });
const now = page => page.evaluate(() => performance.now());
async function waitDownload(name, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ls = (() => { try { return adb('shell', 'ls', '-l', `/sdcard/Download/${name}`); } catch { return ''; } })();
    if (/\s\d+\s/.test(ls) && !ls.includes('No such')) { await new Promise(r => setTimeout(r, 700)); const again = adb('shell', 'ls', '-l', `/sdcard/Download/${name}`); if (again === ls) { const local = resolve(pulled, name); adb('pull', `/sdcard/Download/${name}`, local); return readFileSync(local); } }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('Download not found: ' + name);
}
async function sheetSave(page, itemName) {
  await escape(page);
  await page.getByRole('button', { name: `Image actions for ${itemName}`, exact: true }).click();
  await page.locator('dialog.sheet').getByRole('button', { name: 'Save', exact: true }).click();
}
async function step(list, name, fn) {
  const t = Date.now();
  try { const d = await fn(); list.push({ name, pass: d?.pass !== false, wallMs: Date.now() - t, ...d }); console.log((d?.pass === false ? 'FAIL ' : 'ok   ') + name + ' ' + JSON.stringify(d ?? {}).slice(0, 400)); }
  catch (e) { list.push({ name, pass: false, error: e.message.split('\n')[0] }); console.log('ERR  ' + name + ': ' + e.message.split('\n')[0]); }
}

try {
  results.deviceStart = device();
  if (mode === 'correctness' || mode === 'all') {
    const src = {}; for (const n of ['alpha-sprite.png', 'ramp.png', 'walk.gif']) src[n] = await decode(fx(n));
    for (const [label, settings, check] of [
      ['Keep nearest', { ...base, alphaMode: 'keep' }, 'oracle'],
      ['Cut 4x4 50', { ...base, dither: '4x4' }, 'contract'],
      ['Keep 8x8 100', { ...base, alphaMode: 'keep', dither: '8x8', ditherStrength: 100 }, 'contract'],
    ]) {
      await step(results.correctness, `Native Save ${label}: sprite PNG + GIF`, async () => {
        const page = await open(settings), out = {};
        for (const n of ['alpha-sprite.png', 'walk.gif']) {
          const t0 = await now(page), as = `${tag}-${label.replace(/\W+/g, '')}-${n}`;
          await add(page, [payload(n, as)]); await converted(page, 0, EDG8, t0);
          await page.waitForTimeout(400); // Brave farbles getImageData readback, so compare the exact ImageData the app painted.
          const tile = await page.evaluate(() => { const p = window.__audit.puts.filter(p => !p.ex && p.idx === 0 && p.img).at(-1); const c = document.querySelector('.tile .art canvas'), rb = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let farbled = 0; for (let i = 0; i < rb.length; i++) if (rb[i] !== p.img.data[i]) farbled++; return { w: p.w, h: p.h, data: [...p.img.data], readbackBytesDiffer: farbled }; });
          await sheetSave(page, as);
          const bytes = await waitDownload(as.replace(/\.(png|gif)$/, '-palette.$1')), d = await decode(bytes);
          const mode = settings.alphaMode;
          const r = { bytes: bytes.length, sha256: sha(bytes), frames: d.frames.length, delays: d.delay };
          if (check === 'oracle') { const per = d.frames.map((f, i) => compare(f, nearest(src[n].frames[i], EDG8, { alphaMode: mode }).data)); r.alphaMismatch = per.reduce((a, b) => a + b.alphaMismatch, 0); r.rgbMismatch = per.reduce((a, b) => a + b.rgbMismatch, 0); }
          else { const c = d.frames.map((f, i) => contract(f, src[n].frames[i], EDG8, { alphaMode: mode })); r.offPalette = c.reduce((a, b) => a + b.offPalette, 0); r.alphaWrong = c.reduce((a, b) => a + b.alphaWrong, 0); r.exactChanged = c.reduce((a, b) => a + b.exactChanged, 0); }
          // preview (tile canvas) vs export at sample coordinates, any frame
          let best = Infinity; for (const f of d.frames) { let bad = 0; for (let y = 0; y < tile.h; y++) for (let x = 0; x < tile.w; x++) { const e = (Math.floor((y + .5) * d.h / tile.h) * d.w + Math.floor((x + .5) * d.w / tile.w)) * 4, a = (y * tile.w + x) * 4, tol = f[e + 3] === 255 ? 0 : Math.ceil(255 / Math.max(1, f[e + 3])) + 1; if (tile.data[a + 3] !== f[e + 3] || (f[e + 3] && [0, 1, 2].some(k => Math.abs(tile.data[a + k] - f[e + k]) > tol))) bad++; } best = Math.min(best, bad); }
          r.preview = { canvas: [tile.w, tile.h], mismatches: best, readbackBytesDiffer: tile.readbackBytesDiffer };
          r.decodePaths = await page.evaluate(() => window.__audit.decode.splice(0));
          if (n === 'walk.gif') { r.srcDelays = src[n].delay; }
          out[n] = r;
          await page.getByRole('button', { name: `Image actions for ${as}`, exact: true }).click(); await page.locator('dialog.sheet').getByRole('button', { name: 'Remove', exact: true }).click().catch(async () => { await escape(page); });
          await page.waitForTimeout(300);
        }
        await page.screenshot({ path: resolve(outDir, `native-${label.replace(/\W+/g, '')}.png`) });
        await close(page);
        const ok = Object.values(out).every(r => !r.alphaMismatch && !r.rgbMismatch && !r.offPalette && !r.alphaWrong && !r.exactChanged && !r.preview.mismatches) && JSON.stringify(out['walk.gif'].delays) === JSON.stringify(out['walk.gif'].srcDelays);
        return { pass: ok, out };
      });
    }
    await step(results.correctness, 'Count on GIF (Cut 8x8 100) equals native GIF all-frame union', async () => {
      const page = await open({ ...base, dither: '8x8', ditherStrength: 100 }), as = `${tag}-count-walk.gif`, t0 = await now(page);
      await add(page, [payload('walk.gif', as)]); await converted(page, 0, EDG8, t0);
      await page.getByRole('button', { name: `Image actions for ${as}`, exact: true }).click();
      await page.locator('dialog.sheet').getByRole('button', { name: 'Count output colors', exact: true }).click();
      const use = page.locator('dialog.sheet').getByRole('button', { name: /^Use \d+ output colors?$/ }); await use.waitFor();
      const n = +(await use.textContent()).match(/\d+/)[0];
      await page.screenshot({ path: resolve(outDir, 'count-sheet.png') });
      await use.click(); const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor(); await page.waitForTimeout(800);
      await page.screenshot({ path: resolve(outDir, 'use-editor.png') });
      const draft = [...new Set(await editor.locator('.palette-review-swatch, .palette-review-grid button').evaluateAll(ns => ns.map(x => (x.getAttribute('aria-label') ?? '').split(' ').at(-1).toLowerCase()).filter(h => /^#[0-9a-f]{6}$/.test(h))))].sort();
      await editor.getByRole('button', { name: 'Close', exact: true }).first().click().catch(() => {}); await escape(page);
      await sheetSave(page, as); const d = await decode(await waitDownload(as.replace('.gif', '-palette.gif'))), exp = usedColors(d.frames);
      await close(page);
      return { count: n, expected: exp.length, draftMatches: JSON.stringify(draft) === JSON.stringify(exp), pass: n === exp.length && JSON.stringify(draft) === JSON.stringify(exp) };
    });
    await step(results.correctness, '1 Mi-pixel native Save (Oklab nearest, Resurrect 64, Cut) vs independent oracle', async () => {
      const page = await open({ ...base, paletteId: 'preset-res64' }), as = `${tag}-big-hi1024.png`, t0 = await now(page);
      await add(page, [payload('hi1024.png', as)]); await converted(page, 0, R64, t0);
      const c0 = await now(page); await sheetSave(page, as);
      await page.waitForFunction(() => window.__audit.anchors.length > 0, null, { timeout: 120000 });
      const anchor = await page.evaluate(() => window.__audit.anchors[0].t), h = await health(page, c0, anchor);
      const d = await decode(await waitDownload(as.replace('.png', '-palette.png'))), s = await decode(fx('hi1024.png'));
      const r = compare(d.frames[0], nearest(s.frames[0], R64).data); await close(page);
      return { saveToAnchorMs: Math.round(anchor - c0), ...h, ...r, pass: !r.alphaMismatch && !r.rgbMismatch };
    });
  }

  if (mode === 'perf' || mode === 'all') {
    const cohort = async (name, fn) => { if (process.env.ONLY && !name.includes(process.env.ONLY)) return; const dev = device(); if (dev.wake !== 'Awake') results.errors.push('screen not awake at ' + name); await step(results.perf, name, async () => ({ ...(await fn()), device: dev })); };
    // A. Import -> first usable (converted) preview, cold page vs warm second import.
    for (const [n, target, extra] of [['alpha-sprite.png', 8, {}], ['hi256.png', 8, {}], ['hi1024.png', 8, {}], ['hi1024.png', 256, { dither: '8x8', ditherStrength: 100 }], ['hi1024-alpha.png', 256, { dither: '8x8', ditherStrength: 100, alphaMode: 'keep' }], ['hi1024-alpha.png', 256, { dither: '8x8', ditherStrength: 100, alphaMode: 'cut' }]]) {
      await cohort(`Import ${n} target${target} ${JSON.stringify(extra)}`, async () => {
        const page = await open({ ...base, paletteId: PAL[target].id, ...extra }), rows = {};
        for (const run of ['cold', 'warm']) {
          if (run === 'warm') { await page.getByRole('button', { name: 'Remove all images', exact: true }).click(); await page.locator('dialog.reset-modal[open]').getByRole('button', { name: 'Remove', exact: true }).click(); await page.locator('.tile .art canvas').first().waitFor({ state: 'detached' }).catch(() => {}); await page.waitForTimeout(800); }
          await page.evaluate(() => { window.__audit.puts.length = 0; });
          await add(page, [payload(n, `${tag}-${run}-${n}`)]);
          const r = await converted(page, 0, PAL[target].colors, 0, 120000), change = await page.evaluate(() => window.__audit.marks.change);
          await page.waitForTimeout(300);
          rows[run] = { firstUsablePreviewMs: Math.round(r.t - change), sample: [r.w, r.h], ...(await health(page, change, r.t)) };
        }
        await close(page); return rows;
      });
    }
    // B. Full-resolution conversion via explicit Count on 1 Mi pixels.
    for (const target of [8, 64, 256]) for (const [dither, strength, alphaMode, file] of [['none', 50, 'cut', 'hi1024.png'], ['4x4', 50, 'cut', 'hi1024.png'], ['8x8', 100, 'cut', 'hi1024.png'], ['8x8', 100, 'keep', 'hi1024-alpha.png'], ['none', 50, 'keep', 'hi1024-alpha.png']]) {
      if (alphaMode === 'keep' && target === 64) continue;
      await cohort(`Count 1Mi ${file} target${target} ${dither}@${strength} ${alphaMode}`, async () => {
        const page = await open({ ...base, paletteId: PAL[target].id, dither, ditherStrength: strength, alphaMode }), as = `${tag}-c-${file}`;
        await add(page, [payload(file, as)]); await converted(page, 0, PAL[target].colors, 0, 120000); await page.waitForTimeout(600);
        await page.getByRole('button', { name: `Image actions for ${as}`, exact: true }).click();
        const t0 = await now(page); await page.locator('dialog.sheet').getByRole('button', { name: 'Count output colors', exact: true }).click();
        const use = page.locator('dialog.sheet').getByRole('button', { name: /^Use \d+ output colors?$/ }); await use.waitFor({ timeout: 180000 });
        const t1 = await now(page), count = +(await use.textContent()).match(/\d+/)[0];
        const h = await health(page, t0, t1); await close(page);
        return { countMs: Math.round(t1 - t0), usedColors: count, ...h };
      });
    }
    // C. Repeated settings changes on a 1 Mi + 256² wall, then settle.
    await cohort('Repeated dither/strength changes (12 taps, 1Mi + 256², target 64)', async () => {
      const page = await open({ ...base, paletteId: 'preset-res64' });
      await add(page, [payload('hi1024.png', `${tag}-r1.png`), payload('hi256.png', `${tag}-r2.png`)]);
      await converted(page, 0, R64, 0, 120000); await converted(page, 1, R64, 0, 120000);
      await openSettings(page);
      const t0 = await now(page);
      for (let i = 0; i < 12; i++) { await page.getByRole('button', { name: ['Dithering 2x2', 'Dithering 4x4', 'Dithering 8x8', 'Dithering off'][i % 4], exact: true }).click(); await page.waitForTimeout(80); }
      await page.getByRole('button', { name: 'Dithering 8x8', exact: true }).click();
      const tLast = await now(page);
      await page.getByRole('slider', { name: 'Dither strength', exact: true }).fill('100');
      const tFill = await now(page);
      const a = await converted(page, 0, R64, tFill), b = await converted(page, 1, R64, tFill); await page.waitForTimeout(500);
      const settled = Math.max(a.t, b.t), puts = await page.evaluate(t0 => window.__audit.puts.filter(p => p.t >= t0).length, t0);
      const r = { tapsMs: Math.round(tLast - t0), settleAfterLastChangeMs: Math.round(settled - tFill), tilePaintsDuringBurst: puts, ...(await health(page, t0, settled)) };
      await close(page); return r;
    });
    // D. Cancel latency: Count (256, 8x8@100) canceled by a settings change.
    await cohort('Cancel: Count 1Mi target256 8x8@100 canceled by Dithering off', async () => {
      const page = await open({ ...base, paletteId: 'user-audit256', dither: '8x8', ditherStrength: 100 }), as = `${tag}-x-hi1024.png`;
      await add(page, [payload('hi1024.png', as)]); await converted(page, 0, P256, 0, 120000); await page.waitForTimeout(600);
      await page.getByRole('button', { name: `Image actions for ${as}`, exact: true }).click();
      await page.locator('dialog.sheet').getByRole('button', { name: 'Count output colors', exact: true }).click();
      await page.waitForTimeout(500); await page.locator('dialog.sheet').getByRole('button', { name: 'Cancel', exact: true }).click();
      await openSettings(page);
      const counting = await page.locator('.tile .cap').filter({ hasText: 'Counting colors' }).count();
      const t0 = await now(page); await page.getByRole('button', { name: 'Dithering off', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('.tile .cap')?.textContent.includes('Counting colors'), null, { timeout: 30000 });
      const tGone = await now(page), p = await converted(page, 0, P256, t0);
      await page.waitForTimeout(2500); const t2 = await now(page);
      const after = await health(page, t0, t2), preTail = await health(page, t0 - 400, t0);
      const ltAfter = await page.evaluate(t0 => window.__audit.lt.filter(e => e.s > t0 + 100).map(e => ({ s: Math.round(e.s - t0), d: Math.round(e.d) })), t0);
      await close(page);
      return { countingWhenChanged: counting > 0, labelClearedMs: Math.round(tGone - t0), newPreviewMs: Math.round(p.t - t0), afterChange: after, beforeChange: preTail, longtasksAfter100ms: ltAfter };
    });
    // E. Multi-frame GIF wall playback: 6 x 128² x 12 frames @80 ms.
    for (const [label, extra] of [['nearest', {}], ['4x4@100', { dither: '4x4', ditherStrength: 100 }]]) {
      await cohort(`GIF wall 6x(128x128x12) Resurrect64 ${label}`, async () => {
        const page = await open({ ...base, paletteId: 'preset-res64', ...extra });
        await add(page, [0, 1, 2, 3, 4, 5].map(k => payload(`wall${k}.gif`, `${tag}-w${k}.gif`)));
        for (let k = 0; k < 6; k++) await converted(page, k, R64, 0, 120000);
        await page.evaluate(() => { window.__audit.keepImg = false; window.__audit.puts.length = 0; });
        await page.waitForTimeout(1000); const t0 = await now(page); await page.waitForTimeout(10000); const t1 = await now(page);
        const per = await page.evaluate(({ t0, t1 }) => { const c = [0, 0, 0, 0, 0, 0]; for (const p of window.__audit.puts) if (!p.ex && p.t >= t0 && p.t <= t1 && p.idx >= 0) c[p.idx]++; return c.map(v => +(v / ((t1 - t0) / 1000)).toFixed(1)); }, { t0, t1 });
        const r = { sourceFps: 12.5, convertedPaintsPerSecondPerTile: per, ...(await health(page, t0, t1)) };
        await page.screenshot({ path: resolve(outDir, `gif-wall-${label.replace(/\W+/g, '')}.png`) });
        await close(page); return r;
      });
    }
  }
} catch (e) { results.errors.push('fatal: ' + e.stack); console.error(e); }
finally {
  for (const p of owned) await close(p).catch(() => {});
  results.deviceEnd = (() => { try { return device(); } catch { return null; } })();
  writeFileSync(resolve(outDir, `results-${mode}${process.env.ONLY ? '-' + process.env.ONLY.replace(/W+/g, '') : ''}.json`), JSON.stringify(results, null, 2) + '\n');
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'default' }).catch(() => {});
  try { adb('reverse', '--remove', `tcp:${PORT}`); } catch {}
  server.close();
  console.log('owned downloads prefix', tag, 'errors', results.errors.length);
  process.exit(0); // disconnect without browser.close()
}
