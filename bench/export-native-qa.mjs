// Trusted Windows Chromium image-resource drags; native destinations need manual tests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dragTestServer } from './export-drag-server.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server = dragTestServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`, results = [];
const engines = [
  ['Chrome', 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'],
  ['Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
  ['Brave', 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'],
];
try {
  for (const [engine, executablePath] of engines) {
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
      for (const diagnostic of [false, true]) for (const [name, settings] of [
        ['drag-source.png', {}],
        ['drag-source.png', { family: 'full-palette', paletteId: 'preset-pico8', maxColors: 4, metric: 'rgb' }],
        ['drag-animation.gif', { family: 'full-palette', paletteId: 'preset-pico8' }],
      ]) {
        const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
        await context.addInitScript(settings => localStorage.setItem('bitify', JSON.stringify(settings)), settings);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(origin + '/' + (diagnostic ? '?dragExport=1' : ''));
        await page.locator('input[type=file][accept="image/*"]').setInputFiles('.tmp/export-drag-qa/' + name);
        const art = page.locator('.tiles .art'); await art.hover();
        const image = art.locator('.export-drag-image'); await image.waitFor({ state: 'attached' });
        await image.evaluate(img => img.decode());
        // Capture in dragstart, while protected File data remains accessible.
        await art.evaluate(node => {
          window.nativeCaptures = [];
          window.captureNativeEvent = e => {
            const files = [...e.dataTransfer.files], types = [...e.dataTransfer.types], url = e.dataTransfer.getData('DownloadURL');
            const capture = { trusted: e.isTrusted, blocked: e.defaultPrevented, types, url, source: e.target.src, files: [] };
            Promise.all(files.map(async f => ({ name: f.name, type: f.type, bytes: [...new Uint8Array(await f.arrayBuffer())] })))
              .then(files => { capture.files = files; window.nativeCaptures.push(capture); });
          };
          node.addEventListener('dragstart', window.captureNativeEvent);
        });
        const box = await art.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
        assert.equal(await art.evaluate(n => n.draggable), false);
        assert.equal(await image.evaluate(n => n.draggable), true);
        await page.mouse.move(8, 60, { steps: 25 }); await page.mouse.up();
        await page.waitForFunction(() => window.nativeCaptures.length === 1);
        const capture = await page.evaluate(() => window.nativeCaptures[0]);
        assert.ok(capture.trusted && !capture.blocked); assert.equal(capture.files.length, 1);
        assert.deepEqual(capture.types, ['downloadurl', 'application/x-bitify-export', 'Files']);
        assert.ok(capture.url.endsWith(capture.source));
        const native = Buffer.from(capture.files[0].bytes);
        const urlBytes = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url.replace(/^[^:]+:[^:]+:/, ''))).arrayBuffer())], capture.url);
        assert.deepEqual(Buffer.from(urlBytes), native);
        const download = page.waitForEvent('download'); await page.getByRole('button', { name: `Save ${name}`, exact: true }).click();
        assert.deepEqual(readFileSync(await (await download).path()), native);
        assert.equal(await image.evaluate(n => n.draggable), false);
        // A normal click still opens Preview; original comparison doesn't alter export.
        await art.click(); const viewer = page.getByRole('dialog', { name: 'Image preview', exact: true });
        await viewer.waitFor(); await viewer.getByRole('button', { name: 'Show original image', exact: true }).click();
        const viewerArt = viewer.locator('.art'); await viewerArt.hover();
        const viewerImage = viewerArt.locator('.export-drag-image'); await viewerImage.waitFor({ state: 'attached' });
        await viewerImage.evaluate(img => img.decode());
        await viewerArt.evaluate(node => node.addEventListener('dragstart', window.captureNativeEvent));
        const vb = await viewerArt.boundingBox();
        await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2); await page.mouse.down();
        await page.mouse.move(8, 60, { steps: 25 }); await page.mouse.up();
        await page.waitForFunction(() => window.nativeCaptures.length === 2);
        const previewCapture = await page.evaluate(() => window.nativeCaptures[1]);
        assert.ok(previewCapture.trusted && !previewCapture.blocked);
        assert.deepEqual(Buffer.from(previewCapture.files[0].bytes), native);
        assert.equal(await viewer.evaluate(n => n.open), true);
        assert.equal(await viewerImage.evaluate(n => n.draggable), false);
        await viewer.getByRole('button', { name: 'Close preview', exact: true }).click();
        if (!diagnostic) assert.equal(await page.evaluate(() => typeof window.__bitifyDragTest), 'undefined');
        assert.deepEqual(errors, []);
        results.push({ engine, diagnostic, name, settings, bytes: native.length, nativeFilename: capture.files[0].name, exactSaveAndDownloadURL: true, previewOriginalDragExact: true });
        console.log(`${engine} ${diagnostic ? 'diagnostics' : 'ordinary URL'} ${name}: native bytes = DownloadURL = Save (${native.length} bytes)`);
        await context.close();
      }
      for (const mobile of [true, false]) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1100, height: 800 }, hasTouch: true, isMobile: mobile });
        await context.addInitScript(() => localStorage.setItem('bitify', '{}'));
        const page = await context.newPage(); await page.goto(origin + '/?dragExport=1');
        await page.locator('input[type=file][accept="image/*"]').setInputFiles('.tmp/export-drag-qa/drag-source.png');
        await page.locator('.caption-preview').waitFor(); await page.locator('.caption-preview').click();
        const viewer = page.getByRole('dialog', { name: 'Image preview', exact: true }), art = viewer.locator('.art'); await art.waitFor();
        if (!mobile) { await art.hover(); await art.locator('.export-drag-image').waitFor({ state: 'attached' }); await art.locator('img').evaluate(i => i.decode()); }
        else assert.equal(await art.locator('.export-drag-image').count(), 0);
        const session = await context.newCDPSession(page), box = await art.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
        await page.evaluate(() => { window.previewDrags = 0; window.addEventListener('dragstart', () => window.previewDrags++); });
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await viewer.locator('.held').waitFor();
        assert.equal(await art.evaluate(n => n.draggable), false);
        assert.equal(await art.locator('img[draggable=true]').count(), 0);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await viewer.evaluate(n => n.open), true); assert.equal(await viewer.locator('.held').count(), 0);
        for (const [dx, dy] of [[-48, 0], [48, 0], [0, -48], [0, 48]]) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (const fraction of [0.2, 0.5, 1]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * fraction, y: y + dy * fraction }] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          assert.equal(await viewer.evaluate(n => n.open), true);
        }
        assert.equal(await page.evaluate(() => window.previewDrags), 0);
        await art.tap(); await viewer.waitFor({ state: 'hidden' });
        results.push({ engine, previewTouch: mobile ? 'mobile' : 'desktop hybrid', nativeDrags: 0, holdAndSwipeAndTapPreserved: true });
        console.log(`${engine} ${mobile ? 'mobile' : 'desktop hybrid'} Preview: touch cannot arm drag; hold, four-direction movement and tap dismissal preserved`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
  writeFileSync('.tmp/export-drag-qa/native-app-results.json', JSON.stringify(results, null, 2));
} finally { server.close(); }
