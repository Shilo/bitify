// Reproduces the prior handoff kernel probe (bench/palette-handoff-implementation-review/android-review.mjs)
// verbatim on the phone, three repetitions, against current src/lib served read-only on :5317.
// The evaluate body below is copied verbatim from that probe.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const repo = 'C:/Programming_Files/Shilocity/colorfetti';
const ADB = 'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const server = createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/perf') return s.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>kernel</title><body>kernel probe</body>');
  const m = u.pathname.match(/^\/engine\/([a-z0-9-]+\.js)$/);
  if (!m) return s.writeHead(404).end();
  try { s.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }).end(readFileSync(resolve(repo, 'src/lib', m[1]))); } catch { s.writeHead(404).end(); }
});
await new Promise(r => server.listen(5317, '127.0.0.1', r)); execFileSync(ADB, ['reverse', 'tcp:5317', 'tcp:5317']);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333'), context = browser.contexts()[0], runs = [];
try {
  for (let rep = 0; rep < 3; rep++) {
    const page = await context.newPage();
    try {
      await page.goto('http://localhost:5317/perf'); await page.bringToFront();
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
      runs.push(report);
      console.log(JSON.stringify(report.cases.map(c => [c.pixels, c.targetColors, Math.round(c.nearestMs), Math.round(c.ms), Math.round(c.maxProgressGap)])), JSON.stringify(report.cancellation), report.maxRafGapWholeProbe, report.longTasksDuringQuantize.length);
    } finally { await page.close(); }
  }
} finally {
  const hash = f => createHash('sha256').update(readFileSync(resolve(repo, f))).digest('hex');
  writeFileSync(resolve(repo, 'bench/claude-audit-2026-10-15/device/android/kernel-repro.json'), JSON.stringify({ deps: Object.fromEntries(['src/lib/quantize.js', 'src/lib/palette-dither.js'].map(f => [f, hash(f)])), runs }, null, 2) + '\n');
  try { execFileSync(ADB, ['reverse', '--remove', 'tcp:5317']); } catch {}
  server.close(); process.exit(0);
}
