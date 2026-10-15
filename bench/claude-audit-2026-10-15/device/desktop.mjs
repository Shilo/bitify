// Real-app desktop driver: node desktop.mjs chromium|webkit
// Native downloads are saved via Playwright's download channel and decoded by Sharp,
// compared against audit-lib's independent oracle. Sandbox is preserved (no flags).
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { serve, decode, nearest, compare, contract, usedColors, fx, sha, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const pw = require('playwright');
const engine = process.argv[2] ?? 'chromium', port = { chromium: 5314, webkit: 5315, firefox: 5317 }[engine] + (process.env.OUTTAG ? 4 : 0), tagged = engine + (process.env.OUTTAG ? '-' + process.env.OUTTAG : '');
const outDir = resolve(repo, 'bench/claude-audit-2026-10-15/device', tagged), dl = resolve(repo, '.tmp/device/downloads', tagged);
mkdirSync(outDir, { recursive: true }); mkdirSync(dl, { recursive: true });
const EDG8 = ['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33'];
const results = { engine, dist: process.env.AUDIT_DIST ?? 'dist', date: new Date().toISOString(), indexSha256: sha(readFileSync(resolve(repo, process.env.AUDIT_DIST ?? 'dist', 'index.html'))), decodePaths: [], phases: [], errors: [] };
const server = await serve(port), origin = `http://127.0.0.1:${port}`;
const launch = engine === 'webkit' ? pw.webkit.launch({ headless: true }) : engine === 'firefox' ? pw.firefox.launch({ headless: true }) : pw.chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const browser = await launch;
results.browserVersion = browser.version();
const src = {};
for (const n of ['alpha-sprite.png', 'ramp.png', 'walk.gif']) src[n] = await decode(fx(n));

async function phase(name, fn) {
  const t = Date.now();
  try { const detail = await fn(); results.phases.push({ name, pass: detail?.pass !== false, ms: Date.now() - t, ...detail }); console.log((detail?.pass === false ? 'FAIL ' : 'ok   ') + name, JSON.stringify(detail ?? {}).slice(0, 300)); }
  catch (e) { results.phases.push({ name, pass: false, error: e.message.split('\n')[0] }); console.log('ERR  ' + name + ': ' + e.message.split('\n')[0]); }
}
async function start({ viewport = { width: 1280, height: 900 }, touch = false, settings, library } = {}) {
  const context = await browser.newContext({ viewport, isMobile: touch && engine === 'chromium' ? true : false, hasTouch: touch, acceptDownloads: true });
  await context.addInitScript(({ settings, library }) => {
    if (sessionStorage.getItem('audit-init')) return; sessionStorage.setItem('audit-init', '1');
    localStorage.setItem('colorfetti-help-seen', '1');
    if (settings) localStorage.setItem('colorfetti', JSON.stringify(settings));
    if (library) localStorage.setItem('colorfetti-palettes-v1', JSON.stringify(library));
  }, { settings, library });
  // Which PNG decode path ran: raw native copy, managed RGBA/sRGB copy, or bitmap/canvas fallback.
  await context.addInitScript(() => {
    const log = window.__decodePaths = [];
    if (typeof VideoFrame !== 'undefined') { const copy = VideoFrame.prototype.copyTo; VideoFrame.prototype.copyTo = function (dest, opts) { const cs = this.colorSpace; log.push({ path: opts?.format ? 'managed-copyTo' : 'raw-copyTo', format: this.format, colorSpace: cs && { primaries: cs.primaries, transfer: cs.transfer, matrix: cs.matrix, fullRange: cs.fullRange } }); return copy.call(this, dest, opts); }; }
    const bitmap = window.createImageBitmap; window.createImageBitmap = function (src, ...rest) { if (src?.type === 'image/png') log.push({ path: 'bitmap-canvas', type: src.type }); return bitmap.call(this, src, ...rest); };
    window.__hasImageDecoder = typeof ImageDecoder !== 'undefined';
  });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', e => results.errors.push(engine + ': ' + e.message));
  await page.goto(origin + '/colorfetti/');
  return { context, page };
}
const add = (page, names) => page.locator('input[type=file][accept="image/*"]').setInputFiles(names.map(fx));
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('colorfetti') ?? 'null'));
const escape = async page => { for (let i = 0; i < 3; i++) await page.keyboard.press('Escape'); await page.waitForTimeout(150); };
async function openSettings(page) { if (!(await page.getByRole('button', { name: 'Dithering off', exact: true }).isVisible().catch(() => false))) await page.getByRole('button', { name: 'Palette settings', exact: true }).click(); }
async function choosePalette(page, name) { await page.locator('button[aria-label="Palette"]').click(); await page.locator(`.palette-choice[aria-label="${name}"]`).click(); await escape(page); }
// Tile canvases: wait until every visible pixel of each is a member (or stable for Auto).
async function waitTiles(page, colors, count) {
  await page.waitForFunction(({ colors, count }) => {
    const cs = [...document.querySelectorAll('.tiles .tile .art canvas, .grid .tile .art canvas')];
    if (cs.length < count) return false;
    const set = colors && new Set(colors);
    for (const c of cs) {
      if (!c.width) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let vis = 0;
      for (let p = 0; p < d.length; p += 4) { if (d[p + 3] !== 255) continue; vis++; if (set && !set.has('#' + ((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]).toString(16).padStart(6, '0'))) return false; }
      if (!vis) return false;
    }
    return true;
  }, { colors, count }, { timeout: 30000, polling: 100 });
  await page.waitForTimeout(250);
}
const tileCanvas = (page, i) => page.evaluate(i => { const c = [...document.querySelectorAll('.tile .art canvas')][i]; return { w: c.width, h: c.height, data: [...c.getContext('2d').getImageData(0, 0, c.width, c.height).data] }; }, i);
async function save(page, label, file) {
  await escape(page);
  const tile = page.locator('.tile').filter({ has: page.locator(`button[aria-label="Save ${label}"]`) });
  await tile.hover().catch(() => {});
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator(`button[aria-label="Save ${label}"]`).click({ force: true })]);
  const path = resolve(dl, file ?? d.suggestedFilename()); await d.saveAs(path);
  return { path, name: d.suggestedFilename(), bytes: readFileSync(path) };
}
// Preview canvas vs export sampled at floor((i+.5)*W/w); compare alpha exactly, RGB on opaque.
function previewAgrees(canvas, exportFrames, w, h) {
  let best = Infinity;
  for (const f of exportFrames) {
    let bad = 0;
    for (let y = 0; y < canvas.h; y++) for (let x = 0; x < canvas.w; x++) {
      const sx = Math.floor((x + .5) * w / canvas.w), sy = Math.floor((y + .5) * h / canvas.h), e = (sy * w + sx) * 4, a = (y * canvas.w + x) * 4;
      if (canvas.data[a + 3] !== f[e + 3]) { bad++; continue; }
      const tol = f[e + 3] === 255 ? 0 : Math.ceil(255 / f[e + 3]) + 1; // premultiplied canvas readback
      if (f[e + 3] && (Math.abs(canvas.data[a] - f[e]) > tol || Math.abs(canvas.data[a + 1] - f[e + 1]) > tol || Math.abs(canvas.data[a + 2] - f[e + 2]) > tol)) bad++;
    }
    best = Math.min(best, bad);
  }
  return { canvas: [canvas.w, canvas.h], mismatches: best };
}
function checkNearest(file, srcName, colors, opts) {
  const s = src[srcName], d = file;
  const per = d.frames.map((f, i) => { const o = nearest(s.frames[i], colors, opts); return { ...compare(f, o.data), nearTies: o.nearTies }; });
  return { dims: [d.w, d.h], frames: d.frames.length, alphaMismatch: per.reduce((a, b) => a + b.alphaMismatch, 0), rgbMismatch: per.reduce((a, b) => a + b.rgbMismatch, 0), nearTies: per[0].nearTies, first: per.find(p => p.first)?.first ?? null };
}
const base = { family: 'full-palette', paletteId: 'preset-edg8', metric: 'oklab', maxColors: 0, cleanup: false, alphaCut: 128, alphaMode: 'cut', dither: 'none', ditherStrength: 50 };

try {
  // ---- Fresh defaults (no seeded settings) ----
  await phase('Fresh visit defaults', async () => {
    const { context, page } = await start();
    await page.waitForTimeout(800);
    const s = await stored(page), help = await page.getByRole('dialog').count();
    await context.close();
    return { stored: s, dialogs: help, pass: (s === null || (s.family !== 'two-color' && (s.dither ?? 'none') === 'none' && (s.alphaMode ?? 'cut') === 'cut')) };
  });

  const { context, page } = await start({ settings: base });
  await add(page, ['alpha-sprite.png', 'ramp.png', 'walk.gif']);
  await waitTiles(page, EDG8, 3);
  results.decodePaths = await page.evaluate(() => ({ imageDecoder: window.__hasImageDecoder, calls: window.__decodePaths }));
  console.log('decode paths', JSON.stringify(results.decodePaths));
  const nameOf = { 'alpha-sprite.png': 'alpha-sprite-palette.png', 'ramp.png': 'ramp-palette.png', 'walk.gif': 'walk-palette.gif' };

  // ---- Nearest Off / Cut exact oracle + preview agreement ----
  for (const [mode, label] of [['cut', 'Cut128'], ['keep', 'Keep']]) {
    await phase(`ENDESGA 8 nearest ${label}: native Save vs oracle + preview`, async () => {
      if (mode === 'keep') { await openSettings(page); await page.getByRole('button', { name: 'Keep', exact: true }).click(); await escape(page); await waitTiles(page, EDG8, 3); }
      const out = {};
      for (const [i, n] of ['alpha-sprite.png', 'ramp.png', 'walk.gif'].entries()) {
        const f = await save(page, n, `${label}-${nameOf[n]}`), d = await decode(f.bytes);
        const r = checkNearest(d, n, EDG8, { alphaMode: mode });
        if (n === 'walk.gif') { r.delays = d.delay; r.loop = d.loop; r.srcDelays = src[n].delay; }
        r.preview = previewAgrees(await tileCanvas(page, i), d.frames, d.w, d.h);
        r.file = { bytes: f.bytes.length, sha256: sha(f.bytes), channels: d.channels, palette: d.isPalette, bits: d.bitsPerSample };
        out[n] = r;
      }
      const pass = Object.values(out).every(r => !r.alphaMismatch && !r.rgbMismatch && !r.preview.mismatches) && JSON.stringify(out['walk.gif'].delays) === JSON.stringify(out['walk.gif'].srcDelays);
      return { pass, out };
    });
  }

  // ---- Dither: strength 0 equals nearest; 4x4/8x8 membership, alpha, exact members ----
  await phase('Dither 4x4 strength 0 equals nearest (Keep)', async () => {
    await openSettings(page); await page.getByRole('button', { name: 'Dithering 4x4', exact: true }).click();
    await page.getByRole('slider', { name: 'Dither strength', exact: true }).fill('0'); await escape(page); await waitTiles(page, EDG8, 3);
    const f = await save(page, 'ramp.png', 'd0-ramp.png'), d = await decode(f.bytes), s = await stored(page);
    return { stored: { dither: s.dither, ditherStrength: s.ditherStrength }, ...checkNearest(d, 'ramp.png', EDG8, { alphaMode: 'keep' }), pass: s.ditherStrength === 0 && !checkNearest(d, 'ramp.png', EDG8, { alphaMode: 'keep' }).rgbMismatch };
  });
  for (const [mode, strength, alphaMode] of [['4x4', 50, 'keep'], ['8x8', 100, 'keep'], ['2x2', 50, 'cut'], ['8x8', 100, 'cut']]) {
    await phase(`Dither ${mode} ${strength}% ${alphaMode}: contract + preview`, async () => {
      await openSettings(page);
      await page.getByRole('button', { name: alphaMode === 'keep' ? 'Keep' : 'Cut', exact: true }).click();
      await page.getByRole('button', { name: 'Dithering ' + mode, exact: true }).click();
      await page.getByRole('slider', { name: 'Dither strength', exact: true }).fill(String(strength)); await escape(page); await waitTiles(page, EDG8, 3);
      const out = {};
      for (const [i, n] of ['alpha-sprite.png', 'ramp.png', 'walk.gif'].entries()) {
        const f = await save(page, n, `dither-${mode}-${strength}-${alphaMode}-${nameOf[n]}`), d = await decode(f.bytes);
        const c = d.frames.map((fr, k) => contract(fr, src[n].frames[k], EDG8, { alphaMode }));
        const near = d.frames.map((fr, k) => compare(fr, nearest(src[n].frames[k], EDG8, { alphaMode }).data).rgbMismatch).reduce((a, b) => a + b, 0);
        out[n] = { offPalette: c.reduce((a, b) => a + b.offPalette, 0), alphaWrong: c.reduce((a, b) => a + b.alphaWrong, 0), exactChanged: c.reduce((a, b) => a + b.exactChanged, 0), used: usedColors(d.frames).length, differsFromNearest: near, preview: previewAgrees(await tileCanvas(page, i), d.frames, d.w, d.h), sha256: sha(f.bytes) };
      }
      return { pass: Object.values(out).every(r => !r.offPalette && !r.alphaWrong && !r.exactChanged && !r.preview.mismatches) && out['ramp.png'].differsFromNearest > 0, out };
    });
  }

  // ---- Count output colors / Use N output colors (dither 8x8 Cut still active) ----
  await phase('Count output colors on GIF equals independent all-frame union; Use opens exact draft', async () => {
    const f = await save(page, 'walk.gif', 'count-walk.gif'), d = await decode(f.bytes), expected = usedColors(d.frames);
    await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').click();
    await page.getByRole('button', { name: 'Count output colors', exact: true }).click();
    const use = page.getByRole('button', { name: /^Use \d+ output colors?$/ }); await use.waitFor({ timeout: 60000 });
    const label = await use.textContent(), n = +label.match(/\d+/)[0];
    const libBefore = await page.evaluate(() => localStorage.getItem('colorfetti-palettes-v1'));
    await use.click();
    const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor();
    const draft = []; for (;;) { draft.push(...await editor.locator('.palette-review-swatch, .palette-review-grid button').evaluateAll(ns => ns.map(x => (x.getAttribute('aria-label') ?? '').split(' ').at(-1).toLowerCase()).filter(h => /^#[0-9a-f]{6}$/.test(h)))); const next = editor.getByRole('button', { name: 'Next', exact: true }); if (!(await next.count()) || !(await next.isEnabled())) break; await next.click(); }
    const uniq = [...new Set(draft)].sort(); await page.waitForTimeout(800);
    await page.screenshot({ path: resolve(outDir, 'use-draft-editor.png') });
    await editor.getByRole('button', { name: 'Close palette editor', exact: true }).click(); await editor.waitFor({ state: 'hidden' }); if (await page.getByRole('button', { name: 'Close preview', exact: true }).isVisible().catch(() => false)) await page.getByRole('button', { name: 'Close preview', exact: true }).click(); await escape(page); // WebKit: Escape does not dismiss the viewer after the nested editor (see webkit/escape-control.json)
    const libAfter = await page.evaluate(() => localStorage.getItem('colorfetti-palettes-v1'));
    return { label, count: n, expected: expected.length, draft: uniq.length, draftEqualsExport: JSON.stringify(uniq) === JSON.stringify(expected), libraryUnchanged: libBefore === libAfter, pass: n === expected.length && JSON.stringify(uniq) === JSON.stringify(expected) && libBefore === libAfter };
  });

  // ---- Max colors cap, RGB matching, Cleanup ----
  await phase('Max colors 3 + RGB + Cleanup On (dither Off, Cut): membership/cap/alpha', async () => {
    await openSettings(page);
    await page.getByRole('button', { name: 'Cut', exact: true }).click();
    await page.getByRole('button', { name: 'Dithering off', exact: true }).click();
    await page.getByRole('button', { name: 'RGB matching', exact: true }).click();
    const box = page.getByRole('spinbutton', { name: 'Max colors value', exact: true }); await box.fill('3'); await box.press('Enter');
    await page.getByRole('button', { name: 'Cleanup on', exact: true }).click(); await escape(page); await page.waitForTimeout(1500);
    const out = {};
    for (const n of ['alpha-sprite.png', 'ramp.png', 'walk.gif']) {
      const f = await save(page, n, `cap3-${nameOf[n]}`), d = await decode(f.bytes), c = d.frames.map((fr, k) => contract(fr, src[n].frames[k], EDG8, { alphaMode: 'cut' }));
      out[n] = { used: usedColors(d.frames), offPalette: c.reduce((a, b) => a + b.offPalette, 0), alphaWrong: c.reduce((a, b) => a + b.alphaWrong, 0) };
    }
    const s = await stored(page);
    return { stored: { metric: s.metric, maxColors: s.maxColors, cleanup: s.cleanup }, out, pass: Object.values(out).every(r => r.used.length <= 3 && !r.offPalette && !r.alphaWrong) && s.metric === 'rgb' && s.maxColors === 3 && s.cleanup === true };
  });
  await phase('RGB matching All, Cleanup Off: exact RGB-nearest oracle', async () => {
    await openSettings(page); await page.getByRole('button', { name: 'Use all palette colors', exact: true }).click(); await page.getByRole('button', { name: 'Cleanup off', exact: true }).click(); await escape(page); await page.waitForTimeout(1000);
    const out = {};
    for (const n of ['alpha-sprite.png', 'ramp.png']) { const f = await save(page, n, `rgb-${nameOf[n]}`); out[n] = checkNearest(await decode(f.bytes), n, EDG8, { metric: 'rgb', alphaMode: 'cut' }); }
    return { out, pass: Object.values(out).every(r => !r.alphaMismatch && !r.rgbMismatch) };
  });

  // ---- Download all ZIP (Oklab, 4x4 50, Cut) ----
  await phase('Download all ZIP: entries, order, oracle/contract', async () => {
    await openSettings(page); await page.getByRole('button', { name: 'Oklab matching', exact: true }).click(); await escape(page); await page.waitForTimeout(800);
    await escape(page);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Save all images', exact: true }).click()]);
    const path = resolve(dl, 'all.zip'); await d.saveAs(path); const zip = unzipSync(readFileSync(path)), out = {};
    for (const [entry, bytes] of Object.entries(zip)) { const n = Object.keys(nameOf).find(k => nameOf[k] === entry); out[entry] = checkNearest(await decode(Buffer.from(bytes)), n, EDG8, { alphaMode: 'cut' }); }
    return { fileName: d.suggestedFilename(), entries: Object.keys(zip), out, pass: JSON.stringify(Object.keys(zip)) === JSON.stringify(Object.values(nameOf)) && Object.values(out).every(r => !r.alphaMismatch && !r.rgbMismatch) };
  });

  // ---- Keep + partial alpha ZIP: PNG must be RGBA, GIF binary OK ----
  await phase('Keep ZIP with partial-alpha PNG + binary GIF', async () => {
    await openSettings(page); await page.getByRole('button', { name: 'Keep', exact: true }).click(); await escape(page); await page.waitForTimeout(800);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Save all images', exact: true }).click()]);
    const path = resolve(dl, 'keep-all.zip'); await d.saveAs(path); const zip = unzipSync(readFileSync(path)), out = {};
    for (const [entry, bytes] of Object.entries(zip)) { const n = Object.keys(nameOf).find(k => nameOf[k] === entry); out[entry] = checkNearest(await decode(Buffer.from(bytes)), n, EDG8, { alphaMode: 'keep' }); }
    return { out, pass: Object.values(out).every(r => !r.alphaMismatch && !r.rgbMismatch) };
  });

  // ---- Auto ----
  await phase('Auto: contract (alpha, <=64 colors) and Count', async () => {
    await choosePalette(page, 'Auto'); await page.waitForTimeout(2500);
    const f = await save(page, 'alpha-sprite.png', 'auto-sprite.png'), d = await decode(f.bytes), c = contract(d.frames[0], src['alpha-sprite.png'].frames[0], null, { alphaMode: 'keep' });
    return { used: c.used.length, alphaWrong: c.alphaWrong, pass: !c.alphaWrong && c.used.length <= 64 && c.used.length > 1 };
  });

  // ---- Persistence + Reset ----
  await phase('Persistence across reload then Reset', async () => {
    await choosePalette(page, 'ENDESGA 8');
    await openSettings(page);
    await page.getByRole('button', { name: 'RGB matching', exact: true }).click();
    await page.getByRole('button', { name: 'Dithering 8x8', exact: true }).click();
    await page.getByRole('slider', { name: 'Dither strength', exact: true }).fill('70');
    const box = page.getByRole('spinbutton', { name: 'Max colors value', exact: true }); await box.fill('6'); await box.press('Enter');
    await escape(page); await page.waitForTimeout(400);
    const before = await stored(page);
    await page.reload(); await page.waitForTimeout(800); const after = await stored(page);
    await openSettings(page);
    const ui = { rgb: await page.getByRole('button', { name: 'RGB matching', exact: true }).getAttribute('aria-pressed'), d8: await page.getByRole('button', { name: 'Dithering 8x8', exact: true }).getAttribute('aria-pressed'), strength: await page.getByRole('slider', { name: 'Dither strength', exact: true }).inputValue(), max: await page.getByRole('spinbutton', { name: 'Max colors value', exact: true }).inputValue() };
    await page.getByRole('button', { name: 'Reset palette settings', exact: true }).click(); await page.waitForTimeout(300);
    const reset = await stored(page);
    return { before, after, ui, reset, pass: JSON.stringify(before) === JSON.stringify(after) && ui.rgb === 'true' && ui.d8 === 'true' && ui.strength === '70' && reset.metric === 'oklab' && reset.maxColors === 0 && reset.cleanup === false && reset.dither === 'none' && reset.alphaMode === 'cut' && reset.alphaCut === 128 && reset.paletteId === 'preset-edg8' };
  });

  // ---- Lospec (one real fetch, Chromium only) ----
  if (engine === 'chromium') await phase('Lospec scheme-less URL paste (live, 1 request): endesga-8 equals preset', async () => {
    await escape(page); await page.locator('button[aria-label="Palette"]').click();
    await page.getByRole('button', { name: 'Import palette', exact: true }).click();
    const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor();
    await editor.getByRole('button', { name: 'Paste colors', exact: true }).click();
    const reqs = []; page.on('request', r => { if (r.url().includes('lospec')) reqs.push(r.url()); });
    await editor.getByLabel('Colors or Lospec link', { exact: true }).fill('lospec.com/palette-list/endesga-8'); // scheme-less form accepted since 7fad4e7
    await editor.getByRole('button', { name: 'Import from Lospec', exact: true }).click();
    await editor.getByText('8 colors', { exact: true }).waitFor({ timeout: 30000 });
    const colors = await editor.locator('.palette-review-swatch, .palette-review-grid button').evaluateAll(ns => ns.map(x => (x.getAttribute('aria-label') ?? '').split(' ').at(-1).toLowerCase()).filter(h => /^#[0-9a-f]{6}$/.test(h)));
    const name = await editor.getByLabel('Name', { exact: true }).inputValue();
    await page.screenshot({ path: resolve(outDir, 'lospec-editor.png') });
    await editor.getByRole('button', { name: 'Close palette editor', exact: true }).click(); await editor.waitFor({ state: 'hidden' }); if (await page.getByRole('button', { name: 'Close preview', exact: true }).isVisible().catch(() => false)) await page.getByRole('button', { name: 'Close preview', exact: true }).click(); await escape(page); // WebKit: Escape does not dismiss the viewer after the nested editor (see webkit/escape-control.json)
    return { requests: reqs, paletteName: name, colors, pass: JSON.stringify([...new Set(colors)].sort()) === JSON.stringify([...EDG8].sort()) };
  });
  if (engine === 'chromium') await phase('GPL text with a Lospec URL comment imports locally (no network)', async () => {
    await escape(page); await page.locator('button[aria-label="Palette"]').click();
    await page.getByRole('button', { name: 'Import palette', exact: true }).click();
    const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor();
    await editor.getByRole('button', { name: 'Paste colors', exact: true }).click();
    const reqs = []; const on = r => { if (/lospec.com/.test(r.url()) || /palette-lospec-/.test(r.url())) reqs.push(r.url()); }; page.on('request', on);
    const gpl = ['GIMP Palette', 'Name: Comment test', '# https://lospec.com/palette-list/endesga-8', '#', ' 17  34  51\tdeep', '250 128   7\torange', '  0 200 120\tmint', ''].join('\n');
    await editor.getByLabel('Colors or Lospec link', { exact: true }).fill(gpl);
    const btn = editor.locator('button', { hasText: /^(Import from Lospec|Replace colors|Review colors)$/ }); const label = (await btn.textContent()).trim();
    await btn.click(); await editor.getByText('3 colors', { exact: true }).waitFor({ timeout: 10000 });
    const colors = await editor.locator('.palette-review-swatch, .palette-review-grid button').evaluateAll(ns => ns.map(x => (x.getAttribute('aria-label') ?? '').split(' ').at(-1).toLowerCase()).filter(h => /^#[0-9a-f]{6}$/.test(h)));
    await page.waitForTimeout(500); page.off('request', on);
    await page.screenshot({ path: resolve(outDir, 'gpl-comment-editor.png') });
    await editor.getByRole('button', { name: 'Close palette editor', exact: true }).click(); await escape(page);
    return { label, colors, lospecRequests: reqs, pass: label !== 'Import from Lospec' && !reqs.length && JSON.stringify(colors) === JSON.stringify(['#112233', '#fa8007', '#00c878']) };
  });
  await context.close();

  // ---- Layouts ----
  for (const [w, h, touch] of [[320, 568, true], [568, 320, true], [1280, 900, false]]) {
    await phase(`Layout ${w}x${h}${touch ? ' touch' : ''}`, async () => {
      const { context, page } = await start({ viewport: { width: w, height: h }, touch, settings: { ...base, dither: '4x4', alphaMode: 'keep' } });
      await add(page, ['alpha-sprite.png', 'ramp.png', 'walk.gif']); await waitTiles(page, EDG8, 3);
      await page.screenshot({ path: resolve(outDir, `layout-${w}x${h}-wall.png`) });
      await openSettings(page); await page.waitForTimeout(300);
      const geo = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth, vh = innerHeight, rows = [...document.querySelectorAll('.palette-setting-row')].filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return { cls: n.className, l: r.left, t: r.top, r: r.right, b: r.bottom }; });
        const overlaps = []; for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) { const a = rows[i], b = rows[j]; if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) overlaps.push([a.cls, b.cls]); }
        const strength = document.querySelector('#full-dither-amount')?.getBoundingClientRect();
        const kids = [...document.querySelectorAll('.palette-dither-strength-row > *')].map(n => { const r = n.getBoundingClientRect(); return { tag: n.tagName, l: r.left, r: r.right, t: r.top, b: r.bottom, sw: n.scrollWidth, cw: n.clientWidth }; });
        return { vw, vh, docW: document.documentElement.scrollWidth, rows: rows.length, overlaps, strength: strength && { l: strength.left, r: strength.right, t: strength.top, b: strength.bottom, h: strength.height }, kids };
      });
      await page.screenshot({ path: resolve(outDir, `layout-${w}x${h}-settings.png`) });
      // Scroll the settings panel to the end so the dither strength row is captured.
      await page.locator('#full-dither-amount').scrollIntoViewIfNeeded().catch(() => {}); await page.screenshot({ path: resolve(outDir, `layout-${w}x${h}-settings-strength.png`) });
      await escape(page);
      // Count in preview (desktop) or Image actions sheet (touch)
      let countShot = false;
      try {
        await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').click();
        await page.getByRole('button', { name: 'Count output colors', exact: true }).click();
        await page.getByRole('button', { name: /^Use \d+ output colors?$/ }).waitFor({ timeout: 30000 });
        await page.screenshot({ path: resolve(outDir, `layout-${w}x${h}-count.png`) }); countShot = true;
        await page.getByRole('button', { name: /^Use \d+ output colors?$/ }).click(); await page.locator('dialog.palette-import-modal').waitFor();
        await page.waitForTimeout(800); await page.screenshot({ path: resolve(outDir, `layout-${w}x${h}-editor.png`) });
      } catch (e) { geo.countError = e.message.split('\n')[0]; }
      await context.close();
      return { ...geo, countShot, pass: geo.docW <= geo.vw + 1 && !geo.overlaps.length && (!geo.strength || (geo.strength.l >= 0 && geo.strength.r <= geo.vw + 1 && geo.strength.h >= 43.5)) };
    });
  }
} finally {
  results.passed = results.phases.filter(p => p.pass).length; results.failed = results.phases.filter(p => !p.pass).map(p => p.name);
  writeFileSync(resolve(outDir, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close(); server.close();
  console.log(`${engine}: ${results.passed}/${results.phases.length} passed; page errors ${results.errors.length}`);
}
