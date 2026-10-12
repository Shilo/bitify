// Built-app export bytes, gesture and stale-state checks in Windows Chromium engines.
// Real OS/Discord drops still need the manual workflow in docs/export-drag-prototype.md.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, inflateSync, crc32 } from 'node:zlib';
import { createHash } from 'node:crypto';
import omggif from 'omggif';
import { dragTestServer } from './export-drag-server.mjs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const scratch = resolve('.tmp/export-drag-qa'); mkdirSync(scratch, { recursive: true });
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]), result = Buffer.alloc(body.length + 8);
  result.writeUInt32BE(data.length); body.copy(result, 4); result.writeUInt32BE(crc32(body), body.length + 4); return result;
}
function sourcePng(w, h) {
  const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header.set([8, 6], 8);
  const rows = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * (w * 4 + 1) + 1 + x * 4;
    rows[i] = x % 256; rows[i + 1] = y % 256; rows[i + 2] = (x + y) % 256;
    rows[i + 3] = x < 8 || y < 8 ? 0 : x % 8 === 0 ? 100 : 255;
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function readPng(bytes, exactEncoder = true) {
  const chunks = new Map();
  assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  for (let at = 8; at < bytes.length;) {
    const size = bytes.readUInt32BE(at), body = bytes.subarray(at + 4, at + 8 + size);
    assert.equal(crc32(body), bytes.readUInt32BE(at + 8 + size));
    const type = body.subarray(0, 4).toString();
    chunks.set(type, type === 'IDAT' ? Buffer.concat([chunks.get(type) ?? Buffer.alloc(0), body.subarray(4)]) : body.subarray(4)); at += size + 12;
  }
  const header = chunks.get('IHDR'), w = header.readUInt32BE(0), h = header.readUInt32BE(4);
  const depth = header[8], colorType = header[9], rows = inflateSync(chunks.get('IDAT'));
  const stride = Math.ceil(w * depth * (colorType === 6 ? 4 : 1) / 8) + 1;
  assert.equal(rows.length, stride * h); for (let y = 0; y < h; y++) {
    if (exactEncoder) assert.equal(rows[y * stride], 0);
    else assert.ok(rows[y * stride] <= 4); // OS/browser clipboard can reencode PNG rows.
  }
  return { w, h, depth, colorType, transparent: chunks.has('tRNS') };
}
const pngPath = resolve(scratch, 'drag-source.png'); writeFileSync(pngPath, sourcePng(1024, 768));
const gifPath = resolve(scratch, 'drag-animation.gif'), gifBuffer = Buffer.alloc(100000);
const gifWriter = new omggif.GifWriter(gifBuffer, 128, 96, { palette: [0, 0xffffff, 0xff0000, 0x00ff00], loop: 0 });
for (let frame = 0; frame < 3; frame++) gifWriter.addFrame(0, 0, 128, 96, Uint8Array.from({ length: 128 * 96 }, (_, i) => i % 9 === 0 ? 0 : (i + frame) % 3 + 1), { delay: [7, 13, 21][frame], transparent: 0, disposal: 2 });
writeFileSync(gifPath, gifBuffer.subarray(0, gifWriter.end()));
const browsers = [
  ['chrome-for-testing', 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'],
  ['edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
];
const server = dragTestServer(); await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`, results = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions++; };
async function setup(browser, { prototype = true, mobile = false, settings = {} } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1100, height: 800 }, hasTouch: mobile, isMobile: mobile, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.addInitScript(({ settings }) => { localStorage.setItem('bitify', JSON.stringify({ ...settings })); }, { settings });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/${prototype ? '?dragExport=1' : ''}`);
  return { page, context, errors };
}
async function importFile(page, path) {
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(path);
  await page.locator('.tiles .tile canvas').waitFor();
}
async function ready(page) {
  await page.locator('.tiles .art').first().hover();
  await page.waitForFunction(() => window.__bitifyDragTest.snapshot().status.state === 'ready');
}
async function payload(page, mode = 'combined') {
  const select = page.locator('.drag-export-probe select').first();
  if (await select.evaluate(node => node.value) !== mode) {
    const details = page.locator('.drag-export-probe details'), wasOpen = await details.evaluate(node => node.open);
    if (!wasOpen) await page.locator('.drag-export-probe summary').click();
    await select.selectOption(mode);
    if (!wasOpen) await page.locator('.drag-export-probe summary').click();
  }
  return page.locator('.tiles .art').first().evaluate(async (node, mode) => {
    node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0, isPrimary: true }));
    const transfer = new DataTransfer();
    transfer.setData('text/html', '<img src="wrong-preview">'); transfer.setData('text/uri-list', 'https://wrong-preview/');
    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer });
    node.dispatchEvent(event);
    const files = [...transfer.files];
    const result = { blocked: event.defaultPrevented, types: [...transfer.types], downloadUrl: transfer.getData('DownloadURL'), files: [] };
    // Copy bytes before dragend; DataTransfer restrictions are asserted separately by real drag below.
    for (const file of files) result.files.push({ name: file.name, type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] });
    if (!event.defaultPrevented) node.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: transfer }));
    return result;
  }, mode);
}
async function save(page, name) {
  const next = page.waitForEvent('download'); await page.getByRole('button', { name: `Save ${name}`, exact: true }).click();
  return readFileSync(await (await next).path());
}
async function chooseStyle(page, name) {
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.locator('.style-panel button[aria-haspopup=true]').click();
  await page.getByRole('group', { name: 'Style', exact: true }).getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
}
try {
  for (const [label, executablePath] of browsers) {
    const browser = await chromium.launch({ executablePath, headless: true });
    const record = { browser: label, version: browser.version(), cases: [], nativeDestinations: 'pending manual testing' };
    try {
      // Real export files compared byte-for-byte to existing Save under each family.
      for (const [name, palette] of [['two-color', null], ['palette-all', { maxColors: 0 }], ['palette-limited-rgb', { maxColors: 4, metric: 'rgb', alphaCut: 80 }]]) {
        const { page, context, errors } = await setup(browser, { settings: palette ? { family: 'full-palette', paletteId: 'preset-pico8', ...palette } : {} });
        await importFile(page, pngPath);
        const preview = await page.locator('.tiles canvas').evaluate(c => [c.width, c.height]);
        check(preview[0] < 1024, 'large source has a reduced preview');
        const blocked = await payload(page); check(blocked.blocked && blocked.files.length === 0, 'unprepared drag cancels');
        await ready(page);
        const drag = await payload(page); check(!drag.blocked && drag.files.length === 1, 'ready drag transfers one file');
        check(!drag.types.includes('text/html') && !drag.types.includes('text/uri-list'), 'default preview formats removed');
        const bytes = Buffer.from(drag.files[0].bytes), saved = await save(page, 'drag-source.png');
        assert.deepEqual(bytes, saved, 'Drag and Save must have exactly the same encoded bytes'); assertions++;
        const decoded = readPng(bytes); check(decoded.w === 1024 && decoded.h === 768, 'export keeps original dimensions');
        check(decoded.colorType === 3 && decoded.depth === (palette ? palette.maxColors ? 4 : 8 : 2) && decoded.transparent, 'indexed optimized PNG with transparency');
        const log = await page.evaluate(() => window.__bitifyDragTest.snapshot().logs.findLast(log => log.event === 'drag-start'));
        check(log.sha256 === hash(bytes), 'manifest fingerprint matches actual drag bytes');
        if (palette) check(log.settings.family === 'full-palette' && log.settings.maxColors === palette.maxColors, 'full palette preferences reached actual export');
        const actualUrl = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url)).arrayBuffer())], drag.downloadUrl.replace(/^[^:]+:[^:]+:/, ''));
        assert.deepEqual(Buffer.from(actualUrl), bytes, 'DownloadURL carries the same file'); assertions++;
        // Verification panel must reject a file from an older drag.
        if (!palette) {
          await chooseStyle(page, 'Solid'); await ready(page);
          const latest = await payload(page); const latestBytes = Buffer.from(latest.files[0].bytes);
          check(hash(bytes) !== hash(latestBytes), 'style edit changes the export');
          await page.locator('.drag-export-probe summary').click();
          const input = page.locator('.drag-export-probe input[type=file]');
          await input.setInputFiles({ name: 'old.png', mimeType: 'image/png', buffer: bytes });
          await page.getByText('Matches an older drag, not the latest drag.', { exact: false }).waitFor(); assertions++;
          await input.setInputFiles({ name: 'latest.png', mimeType: 'image/png', buffer: latestBytes });
          await page.getByText('Exact match to the latest drag:', { exact: false }).waitFor(); assertions++;
          await page.locator('.drag-export-probe summary').click();
          await ready(page);
          await page.locator('.tiles .art').dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0, isPrimary: true });
          await page.getByRole('button', { name: 'Style', exact: true }).click();
          const stale = await page.evaluate(() => {
            const art = document.querySelector('.tiles .art');
            const slider = document.querySelector('input[aria-label="Threshold"]');
            slider.value = '47'; slider.dispatchEvent(new Event('input', { bubbles: true }));
            const transfer = new DataTransfer(), event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer });
            art.dispatchEvent(event);
            return { blocked: event.defaultPrevented, files: transfer.files.length, types: [...transfer.types] };
          });
          check(stale.blocked && !stale.files && stale.types.length === 0, 'settings edit and dragstart in the same task cannot transfer an old export');
          await page.getByRole('button', { name: 'Style', exact: true }).click(); await ready(page);
          const current = await payload(page);
          if (!current.files.length) writeFileSync(resolve(scratch, `${label}-stale-debug.json`), JSON.stringify(await page.evaluate(() => window.__bitifyDragTest.snapshot()), null, 2));
          check(!current.blocked && current.files.length === 1, 'new settings export is ready');
          assert.deepEqual(Buffer.from(current.files[0].bytes), await save(page, 'drag-source.png')); assertions++;
          // The original comparison may change only what is displayed, not export bytes.
          await page.getByRole('button', { name: 'Solid conversion', exact: true }).click(); await ready(page);
          const comparing = await payload(page); assert.deepEqual(Buffer.from(comparing.files[0].bytes), Buffer.from(current.files[0].bytes)); assertions++;
          await page.getByRole('button', { name: 'Solid conversion', exact: true }).click();
          await page.locator('.drag-export-probe summary').click();
          await page.screenshot({ path: resolve(scratch, `${label}-prototype.png`) });
        }
        check(errors.length === 0, errors.join('\n'));
        record.cases.push({ name, preview, dimensions: [decoded.w, decoded.h], bytes: bytes.length, sha256: hash(bytes) });
        await context.close();
      }
      // GIF animation, PNG Copy and full GIF Save must retain existing contracts.
      for (const palette of [null, { family: 'full-palette', paletteId: 'preset-pico8', maxColors: 4 }]) {
        const { page, context, errors } = await setup(browser, { settings: palette ?? {} }); await importFile(page, gifPath); await ready(page);
        const drag = await payload(page), bytes = Buffer.from(drag.files[0].bytes);
        assert.deepEqual(bytes, await save(page, 'drag-animation.gif')); assertions++;
        const reader = new omggif.GifReader(bytes);
        check(reader.width === 128 && reader.height === 96 && reader.numFrames() === 3, 'GIF full dimensions and all frames');
        assert.deepEqual(Array.from({ length: 3 }, (_, i) => reader.frameInfo(i).delay), [7,13,21]); assertions++;
        await page.getByRole('button', { name: 'Copy drag-animation.gif', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.glass-toast__text')?.textContent.includes('copied'));
        const clipboard = Buffer.from(await page.evaluate(async () => [...new Uint8Array(await (await (await navigator.clipboard.read())[0].getType('image/png')).arrayBuffer())]));
        check(readPng(clipboard, false).w === 128, 'GIF Copy remains first-frame full-size PNG');
        check(errors.length === 0, errors.join('\n')); record.cases.push({ name: palette ? 'palette-limited-animated-gif' : 'animated-gif', bytes: bytes.length, sha256: hash(bytes) }); await context.close();
      }
      // Genuine drag events across an iframe boundary, distinct from synthetic payload checks.
      {
        const { page, context, errors } = await setup(browser); await importFile(page, pngPath); await ready(page);
        await page.evaluate(() => {
          const frame = document.createElement('iframe'); frame.id = 'drop-receiver';
          frame.style = 'position:fixed;right:0;top:70px;width:180px;height:120px;z-index:2000';
          frame.srcdoc = `<body style="margin:0;background:#ccc;height:100vh">File receiver<script>document.body.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy'};document.body.ondrop=e=>{e.preventDefault();const files=[...e.dataTransfer.files];window.received={trusted:e.isTrusted,types:[...e.dataTransfer.types],text:e.dataTransfer.getData('text/plain'),downloadUrl:e.dataTransfer.getData('DownloadURL'),fileCount:files.length,settled:false,files:[]};Promise.all(files.map(async f=>({name:f.name,bytes:[...new Uint8Array(await f.arrayBuffer())]}))).then(f=>window.received.files=f).catch(error=>window.received.error=error.message).finally(()=>window.received.settled=true)};<\/script></body>`;
          document.body.append(frame);
        });
        const art = await page.locator('.tiles .art').boundingBox(), receiver = await page.locator('#drop-receiver').boundingBox();
        const frame = page.frames().find(f => f.parentFrame());
        const variants = [];
        for (const mode of ['combined', 'download-url', 'file']) {
          if (mode !== 'combined') {
            await page.locator('.drag-export-probe summary').click(); await page.locator('.drag-export-probe select').first().selectOption(mode); await page.locator('.drag-export-probe summary').click();
          }
          await frame.evaluate(() => { window.received = null; }); await ready(page);
          await page.mouse.move(art.x + art.width / 2, art.y + art.height / 2); await page.mouse.down();
          await page.mouse.move(receiver.x + 90, receiver.y + 60, { steps: 20 }); await page.mouse.up();
          await frame.waitForFunction(() => window.received?.settled, { timeout: 3000 }).catch(() => {});
          const received = await frame.evaluate(() => window.received ?? null);
          if (received) check(received.settled && !received.error, 'receiver file reads settled successfully');
          const logs = await page.evaluate(() => window.__bitifyDragTest.snapshot().logs);
          check(logs.some(log => log.event === 'drag-start' && log.trusted && log.mode === mode), 'mouse movement starts a trusted native drag');
          if (received?.files.length) {
            check(received.trusted, 'receiver got a trusted browser drop');
            assert.deepEqual(Buffer.from(received.files[0].bytes), await save(page, 'drag-source.png')); assertions++;
          }
          variants.push({ mode, received, logs });
        }
        writeFileSync(resolve(scratch, `${label}-trusted-drag.json`), JSON.stringify(variants, null, 2));
        check(await page.locator('.image-viewer[open]').count() === 0, 'drag does not open viewer');
        check(await page.locator('.tiles .tile').count() === 1, 'outgoing drag does not reimport');
        await page.locator('#drop-receiver').evaluate(n => n.remove());
        // A stationary press still compares and does not start a drag.
        await page.locator('.tiles .art').hover(); await page.mouse.down();
        await page.waitForFunction(() => document.querySelector('.tiles .art.held'));
        await page.mouse.up(); check(await page.locator('.tiles .art.held').count() === 0, 'comparison hold releases normally');
        await page.locator('.tiles .art').click(); await page.locator('.image-viewer[open]').waitFor(); assertions++;
        await page.getByRole('button', { name: 'Close preview', exact: true }).click();
        check(errors.length === 0, errors.join('\n')); record.cases.push({ name: 'trusted-cross-frame-drag-and-click', variants: variants.map(v => ({ mode: v.mode, receiverAcceptedFile: !!v.received?.files.length, types: v.received?.types, text: v.received?.text, downloadUrl: v.received?.downloadUrl })) }); await context.close();
      }
      for (const prototype of [false, true]) {
        const { page, context, errors } = await setup(browser, { prototype, mobile: true }); await importFile(page, pngPath);
        const art = page.locator('.tiles .art').first(), session = await context.newCDPSession(page);
        check(await page.evaluate(() => !matchMedia('(hover: hover) and (pointer: fine)').matches), 'mobile capability is coarse/no-hover');
        check(await page.evaluate(() => !window.__bitifyDragTest), 'mobile has no export-drag runtime, even with opt-in URL');
        check(await page.locator('.drag-export-probe').count() === 0, 'mobile has no drag panel covering swipe area');
        await page.evaluate(() => {
          window.mobileGestures = { drags: 0, touches: [] };
          window.addEventListener('dragstart', () => window.mobileGestures.drags++);
          window.addEventListener('touchmove', e => window.mobileGestures.touches.push({ trusted: e.isTrusted, prevented: e.defaultPrevented }), { passive: true });
        });
        const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('bitify')));
        async function swipe(dx, dy) {
          const box = await art.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (const fraction of [0.2, 0.5, 1]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * fraction, y: y + dy * fraction }] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForFunction(() => !document.querySelector('.tiles .held'));
        }
        const before = await state();
        await swipe(-48, 0); await page.waitForFunction(first => JSON.parse(localStorage.getItem('bitify')).first !== first, before.first);
        const left = await state(); check(left.style === before.style, 'trusted left swipe changes palette without changing style');
        await swipe(48, 0); await page.waitForFunction(first => JSON.parse(localStorage.getItem('bitify')).first === first, before.first);
        check((await state()).second === before.second, 'trusted right swipe restores palette');
        await swipe(0, -48); await page.waitForFunction(style => JSON.parse(localStorage.getItem('bitify')).style !== style, before.style);
        const up = await state(); check(up.first === before.first && up.second === before.second, 'trusted up swipe changes style without changing palette');
        await swipe(0, 48); await page.waitForFunction(style => JSON.parse(localStorage.getItem('bitify')).style === style, before.style);
        check((await state()).style === before.style, 'trusted down swipe restores style');
        check(await page.getByRole('dialog', { name: 'Image viewer' }).count() === 0 && await page.locator('dialog[open]').count() === 0, 'swipes do not open viewer');
        check(await art.getAttribute('draggable') !== 'true', 'trusted touch swipes never arm native drag');
        const gestures = await page.evaluate(() => window.mobileGestures);
        check(gestures.drags === 0 && gestures.touches.some(e => e.trusted && e.prevented), 'real touch stream remains owned by existing swipe handler');
        await art.dispatchEvent('pointerenter', { pointerType: 'mouse' });
        await art.dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0, isPrimary: true });
        check(await art.getAttribute('draggable') !== 'true', 'mobile also rejects mouse-shaped compatibility events');
        record.cases.push({ name: prototype ? 'mobile-opt-in-four-direction-swipes' : 'mobile-normal-four-direction-swipes', trustedTouches: gestures.touches.length, exportRuntime: false, nativeDrags: gestures.drags });
        check(errors.length === 0, errors.join('\n')); await context.close();
      }
      results.push(record); console.log(`${label} ${record.version}: ${record.cases.length} scenarios passed`);
    } finally { await browser.close(); }
  }
  writeFileSync(resolve(scratch, 'results.json'), JSON.stringify({ assertions, results }, null, 2)); console.log(`${assertions} checks passed`);
} finally { await new Promise(done => server.close(done)); }
