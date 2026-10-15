import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const directory = new URL('./', import.meta.url);
mkdirSync(directory, { recursive: true });
execFileSync('C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe', ['reverse', 'tcp:5294', 'tcp:5294']);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0], owned = [];
let failed = false;
try {
  for (const suite of [{ path: '/qa', button: 'Run dithering checks', name: 'dither', count: 20 }, { path: '/improvements', button: 'Run palette improvement checks', name: 'improvements', count: 16 }]) {
    const page = await context.newPage(); owned.push(page);
    await page.goto('http://localhost:5294' + suite.path); await page.bringToFront();
    await page.getByRole('button', { name: suite.button, exact: true }).click();
    await page.waitForFunction(() => { try { return Boolean(JSON.parse(document.querySelector('#out').textContent).finished); } catch { return false; } }, null, { timeout: 180000 });
    const report = JSON.parse(await page.locator('#out').textContent());
    writeFileSync(new URL('android-' + suite.name + '.json', directory), JSON.stringify(report, null, 2) + '\n');
    await page.screenshot({ path: new URL('android-' + suite.name + '.png', directory).pathname.replace(/^\/(.:)/, '$1') });
    if (!report.completed || report.checks.length !== suite.count) throw new Error(JSON.stringify(report.error ?? report));
    console.log(suite.name + ': ' + report.checks.length + ' phases passed');
    await page.close();
  }
  const page = await context.newPage(); owned.push(page);
  await page.goto('http://localhost:5294/perf'); await page.bringToFront();
  const report = await page.evaluate(async () => {
    const { quantizeAsync, preparePalette } = await import('/engine/quantize.js');
    const cases = [], observerTasks = []; let rafMax = 0, lastRaf = performance.now(), running = true;
    const raf = now => { if (!running) return; rafMax = Math.max(rafMax, now - lastRaf); lastRaf = now; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    const observer = typeof PerformanceObserver !== 'undefined' ? new PerformanceObserver(list => observerTasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))) : null;
    try { observer?.observe({ type: 'longtask' }); } catch {}
    for (const [side, size] of [[256, 8], [1024, 8], [1024, 256]]) {
      let seed = 0x1b51ca92; const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
      const data = new Uint8ClampedArray(side * side * 4);
      for (let p = 0; p < data.length; p += 4) { const n = random(); data[p] = n & 255; data[p + 1] = (n >>> 8) & 255; data[p + 2] = (n >>> 16) & 255; data[p + 3] = [0, 1, 127, 128, 254, 255][(p / 4) % 6]; }
      const palette = preparePalette(Array.from({ length: size }, (_, i) => '#' + (Math.imul(i + 1, 0x618c47) & 0xffffff).toString(16).padStart(6, '0')));
      const source = { data, width: side, height: side };
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const nearestStart = performance.now();
      const nearest = await quantizeAsync(source, palette, 128, undefined, undefined, { alphaMode: 'keep' });
      const nearestMs = performance.now() - nearestStart;
      if (nearest.alpha.length !== side * side) throw new Error('Nearest control missing Keep alpha');
      const start = performance.now(); let lastProgress = start, maxProgressGap = 0;
      const result = await quantizeAsync(source, palette, 128, undefined, undefined, { alphaMode: 'keep', dither: '8x8', ditherStrength: 100, onProgress: () => { const now = performance.now(); maxProgressGap = Math.max(maxProgressGap, now - lastProgress); lastProgress = now; } });
      const end = performance.now();
      // End the final conversion task before running the million-pixel oracle.
      // Otherwise Long Tasks attributes our validation loop to that last slice.
      await new Promise(resolve => { const channel = new MessageChannel(); channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); }; channel.port2.postMessage(null); });
      let wrongAlpha = 0, wrongMembership = 0;
      for (let p = 0; p < result.indices.length; p++) { if (result.alpha[p] !== data[p * 4 + 3]) wrongAlpha++; if (data[p * 4 + 3] ? result.indices[p] >= size : result.indices[p] !== 256) wrongMembership++; }
      cases.push({ pixels: side * side, targetColors: size, nearestMs, ms: end - start, maxProgressGap, wrongAlpha, wrongMembership, start, end });
    }
    const controller = new AbortController(), source = { width: 1024, height: 1024, data: new Uint8ClampedArray(1024 * 1024 * 4).fill(177) };
    const canceledAt = performance.now(); let cancelName;
    try { await quantizeAsync(source, ['#000000', '#ffffff'], 128, undefined, undefined, { dither: '8x8', signal: controller.signal, onProgress: () => controller.abort() }); } catch (error) { cancelName = error.name; }
    await new Promise(resolve => setTimeout(resolve, 100)); running = false; observer?.disconnect();
    return { date: new Date().toISOString(), userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, cases, cancellation: { error: cancelName, ms: performance.now() - canceledAt - 100 }, maxRafGapWholeProbe: rafMax, longTasksDuringQuantize: observerTasks.filter(task => cases.some(c => task.start >= c.start && task.start < c.end)), scope: 'Foreground current shipping kernel. Source preparation and oracle checking are excluded from quantize intervals. Not whole-app FPS or memory.' };
  });
  const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  report.dependencies = Object.fromEntries(['dist/index.html', 'src/lib/quantize.js', 'src/lib/palette-dither.js', 'src/lib/image-decode.js'].map(file => [file, hash(file)]));
  writeFileSync(new URL('android-performance.json', directory), JSON.stringify(report, null, 2) + '\n');
  if (report.cases.some(c => c.wrongAlpha || c.wrongMembership) || report.cancellation.error !== 'AbortError') throw new Error('Performance probe failed output or cancellation contract');
  console.log(JSON.stringify(report, null, 2));
} catch (error) { failed = true; console.error(error); }
finally { for (const page of owned) if (!page.isClosed()) await page.close().catch(() => {}); }
process.exit(failed ? 1 : 0);
