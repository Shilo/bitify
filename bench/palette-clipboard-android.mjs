// Real Android app Copy -> trusted native Paste. No clipboard read/write mocks.
// Requires an unlocked authorized phone, CDP9333 and reverse localhost5297.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { loadClipboardManifest, clipboardFixtureDirectory } from './palette-clipboard-fixtures.mjs';
import { analyzeClipboardPng } from './palette-clipboard-analyze.mjs';
const require = createRequire(import.meta.url), runtime = 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? runtime + 'playwright');
const sharp = require(process.env.SHARP_MODULE ?? runtime + 'sharp');
const output = path.resolve('bench/palette-clipboard-review'), base = 'http://localhost:5297';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const adb = (...args) => execFileSync(process.env.ADB ?? 'adb', args, { encoding: 'utf8', timeout: 15000 });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
const manifest = loadClipboardManifest(), ownedPages = [], report = { scope: 'Real app trusted Copy clicks and Android native paste. Success is observed before any paste. No navigator.clipboard polling, ClipboardEvent construction or clipboard monkeypatching. Only owned fixtures are copied; user browser remains open.', previousClipboardRead: false, clipboardMethodsMocked: false, syntheticPasteEvents: false, started: new Date().toISOString(), distIndexSha256: hash(fs.readFileSync('dist/index.html')), manifestSha256: hash(fs.readFileSync(path.join(clipboardFixtureDirectory, 'manifest.json'))), checks: [], carriers: [], errors: [] };
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.connectOverCDP(process.env.ANDROID_CDP ?? 'http://127.0.0.1:9333');
const context = browser.contexts()[0];
async function pageAt(url) { const page = await context.newPage(); ownedPages.push(page); page.on('pageerror', error => report.errors.push(error.message)); await page.goto(url); await page.bringToFront(); return page; }
async function nativePaste(page, target, ready, label) {
  await page.bringToFront(); await target.click();
  adb('shell', 'input', 'keyevent', 'KEYCODE_PASTE');
  if (await ready(2500)) return { method: 'ADB KEYCODE_PASTE', trusted: true };
  // A real Android selection context menu is a fallback, not a fabricated event.
  const box = await target.boundingBox(); assert(box, 'Native paste target not visible');
  const session = await context.newCDPSession(page), point = { x: box.x + Math.min(25, box.width / 2), y: box.y + Math.min(30, box.height / 2) };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 1, radiusY: 1, force: 1, id: 1 }] });
  await pause(800);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach(); await pause(500);
  const remote = '/sdcard/colorfetti-clipboard-owned-ui.xml';
  adb('shell', 'uiautomator', 'dump', remote);
  const xml = adb('exec-out', 'cat', remote);
  fs.writeFileSync(path.join(output, 'android-' + label + '-native-menu.xml'), xml);
  const node = [...xml.matchAll(/<node\b[^>]+>/g)].map(match => match[0]).find(value => /(?:text|content-desc)="Paste"/.test(value));
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) return { method: 'ADB key then native long press', trusted: false, unavailable: 'Native Paste menu entry absent' };
  adb('shell', 'input', 'tap', String(Math.round((Number(bounds[1]) + Number(bounds[3])) / 2)), String(Math.round((Number(bounds[2]) + Number(bounds[4])) / 2)));
  if (!await ready(8000)) return { method: 'Android native Paste menu', trusted: false, unavailable: 'Paste action produced no owned PNG receipt' };
  return { method: 'Android native Paste menu', trusted: true };
}
function waitFor(page, predicate, timeout) { return page.waitForFunction(predicate, null, { timeout }).then(() => true).catch(() => false); }
async function appCopy(app, filename) {
  await app.bringToFront();
  const actions = app.getByRole('button', { name: 'Image actions for ' + filename, exact: true });
  await actions.waitFor({ timeout: 20000 }); await actions.click();
  await app.locator('.sheet[open]').getByRole('button', { name: 'Copy', exact: true }).click();
  const success = filename + ' copied' + (filename.endsWith('.gif') ? ' as a still image' : '') + '.';
  await app.getByText(success, { exact: true }).waitFor({ timeout: 25000 });
  return success;
}
async function captureOwnedPng(page) {
  // Observe actual trusted paste payload only after a successful owned Copy.
  await page.evaluate(() => {
    window.androidOwnedNativePng = null;
    window.addEventListener('paste', event => {
      if (!event.isTrusted) return;
      const file = [...event.clipboardData.files].find(file => file.type === 'image/png');
      if (file) file.arrayBuffer().then(buffer => { const bytes = new Uint8Array(buffer); let text = ''; for (let at = 0; at < bytes.length; at += 4096) text += String.fromCharCode(...bytes.subarray(at, at + 4096)); window.androidOwnedNativePng = { trusted: event.isTrusted, base64: btoa(text), type: file.type }; });
    }, { capture: true });
  });
}
try {
  report.userAgent = await (await pageAt(base + '/')).evaluate(() => navigator.userAgent);
  for (const entry of manifest.fixtures) {
    const app = await context.newPage(); ownedPages.push(app); app.on('pageerror', error => report.errors.push(error.message));
    const settings = entry.family === 'two-color' ? { ...entry.settings, settings: { solid: entry.settings.set } } : entry.settings;
    await app.addInitScript(settings => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify(settings)); }, settings);
    await app.goto(base + '/app/'); await app.bringToFront();
    await app.locator('input[type=file][accept="image/*"]').setInputFiles(path.join(clipboardFixtureDirectory, entry.sourceFile));
    const success = await appCopy(app, entry.sourceFile);
    await app.screenshot({ path: path.join(output, 'android-' + entry.key + '-copy.png') });
    const receiver = await pageAt(base + '/'); await receiver.locator('#device').selectOption('android'); await receiver.locator('#case').selectOption(entry.key);
    const paste = await nativePaste(receiver, receiver.locator('#target'), ms => waitFor(receiver, () => Boolean(document.querySelector('#receipt').textContent), ms), entry.key);
    assert(paste.trusted, paste.unavailable ?? 'Native paste unavailable');
    const receipt = JSON.parse(await receiver.locator('#receipt').textContent());
    assert.equal(receipt.trusted, true); assert.equal(receipt.mime, 'image/png');
    const bytes = fs.readFileSync(path.join(output, receipt.file)), analysis = await analyzeClipboardPng(bytes, entry.key);
    write('android-' + entry.key + '-analysis.json', analysis);
    await receiver.screenshot({ path: path.join(output, 'android-' + entry.key + '-paste.png') });
    report.checks.push({ key: entry.key, settings, sourceFile: entry.sourceFile, copySuccessMessage: success, paste, receipt, exactVisibleRgba: analysis.exactVisibleRgba, totals: analysis.totals });
    write('android-native-results.json', report);

    if (entry.key === 'palette-keep') {
      // Actual app paste paths, using only this newly copied owned PNG.
      await app.bringToFront(); await app.getByRole('button', { name: 'Add images', exact: true }).focus();
      adb('shell', 'input', 'keyevent', 'KEYCODE_PASTE');
      const artworkAdded = await waitFor(app, () => document.querySelectorAll('.grid .tiles > .tile').length === 2, 5000);
      report.artworkPaste = { method: 'ADB KEYCODE_PASTE on actual app', artworkAdded, note: artworkAdded ? 'One new artwork item observed' : 'Android paste command did not add artwork from noneditable app focus' };
      const before = await app.locator('.grid .tiles > .tile').count();
      await app.getByRole('button', { name: 'Palette', exact: true }).click();
      await app.getByRole('button', { name: 'Import palette', exact: true }).click();
      const editor = app.locator('.palette-import-modal[open]');
      await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Android owned clipboard draft');
      await editor.getByRole('button', { name: 'Paste colors', exact: true }).click();
      const editorPaste = await nativePaste(app, editor.getByRole('textbox', { name: 'Colors or Lospec link', exact: true }), ms => waitFor(app, () => document.querySelectorAll('.palette-review-swatch').length > 0, ms), 'editor');
      const draftColors = await editor.locator('.palette-review-swatch').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label').match(/#[\da-f]{6}/i)[0]).sort());
      const raw = await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer(), actualColors = [...new Set(Array.from({ length: raw.length / 4 }, (_, i) => raw[i * 4 + 3] ? '#' + raw.subarray(i * 4, i * 4 + 3).toString('hex') : null).filter(Boolean))].sort();
      assert(editorPaste.trusted, editorPaste.unavailable); assert.deepEqual(draftColors, actualColors);
      assert.equal(await editor.getByRole('textbox', { name: 'Name', exact: true }).inputValue(), 'Android owned clipboard draft');
      assert.equal(await app.locator('.grid .tiles > .tile').count(), before);
      report.editorPaste = { ...editorPaste, colors: draftColors, wallImagesUnchanged: before, enteredNamePreserved: true };
      await app.screenshot({ path: path.join(output, 'android-editor-paste.png') });
    }
    await app.close(); await receiver.close();
    console.log('Android native paste ' + entry.key + ': exact=' + analysis.exactVisibleRgba);
  }
  if (report.checks.some(check => !check.exactVisibleRgba)) {
    for (const mode of ['both', 'png']) {
      const page = await pageAt(base + '/carrier'); await captureOwnedPng(page);
      await page.locator('#copy-' + mode).waitFor(); await page.locator('#copy-' + mode).click();
      const copied = await waitFor(page, () => document.querySelector('#status').textContent.startsWith('Owned Copy completed.'), 15000);
      if (!copied) { report.carriers.push({ mode, copyCompleted: false, status: await page.locator('#status').textContent(), receipt: await page.locator('#receipt').textContent() }); await page.close(); continue; }
      const paste = await nativePaste(page, page.locator('#target'), ms => waitFor(page, () => Boolean(window.carrierReport), ms), 'carrier-' + mode);
      const detail = await page.evaluate(() => ({ report: window.carrierReport, native: window.androidOwnedNativePng, embedded: window.ownedCarrierPngBase64 }));
      const carrier = { mode, copyCompleted: true, paste, ...detail.report };
      if (detail.native) { const bytes = Buffer.from(detail.native.base64, 'base64'); fs.writeFileSync(path.join(output, 'android-carrier-' + mode + '-native.png'), bytes); carrier.nativeAnalysis = await analyzeClipboardPng(bytes, 'palette-keep'); }
      if (detail.embedded) { const bytes = Buffer.from(detail.embedded, 'base64'); fs.writeFileSync(path.join(output, 'android-carrier-' + mode + '-html.png'), bytes); carrier.embeddedAnalysis = await analyzeClipboardPng(bytes, 'palette-keep'); }
      report.carriers.push(carrier); write('android-carrier-' + mode + '-results.json', carrier);
      await page.screenshot({ path: path.join(output, 'android-carrier-' + mode + '.png') }); await page.close();
    }
  }
  report.completed = true;
} catch (error) { report.completed = false; report.error = { message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  for (const page of ownedPages) if (!page.isClosed()) await page.close().catch(() => {});
  report.finished = new Date().toISOString(); write('android-native-results.json', report);
  console.log(JSON.stringify({ completed: report.completed, checks: report.checks.map(check => ({ key: check.key, transportTrusted: check.receipt.trusted, exact: check.exactVisibleRgba, totals: check.totals })), artworkPaste: report.artworkPaste, editorPaste: report.editorPaste, carriers: report.carriers.map(c => ({ mode: c.mode, copyCompleted: c.copyCompleted, nativeExact: c.nativeAnalysis?.exactVisibleRgba, htmlExact: c.embeddedAnalysis?.exactVisibleRgba })), error: report.error }, null, 2));
  // Exiting disconnects this client; never browser.close() a user's CDP browser.
  process.exit(process.exitCode ?? 0);
}
