// Investigates the Android "repeated settings changes" timeout: rapid dither taps on a
// 1 Mi + 256² wall, then a strength change. Logs every tile paint after the burst.
//   node burst-repro.mjs desktop|android [taps=12] [gapMs=80]
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, fx, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const where = process.argv[2] ?? 'desktop', taps = +(process.argv[3] ?? 12), gap = +(process.argv[4] ?? 80), port = where === 'android' ? 5318 : 5319;
const ADB = 'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const R64 = JSON.parse(execFileSync('node', ['-e', "import('./src/lib/palette-library.js').then(m=>process.stdout.write(JSON.stringify(m.FULL_PRESETS.find(p=>p.id==='preset-res64').colors)))"], { cwd: repo, encoding: 'utf8' }));
const server = await serve(port);
let browser, page, ownedBrowser = false;
if (where === 'android') { execFileSync(ADB, ['reverse', `tcp:${port}`, `tcp:${port}`]); browser = await chromium.connectOverCDP('http://127.0.0.1:9333'); page = await browser.contexts()[0].newPage(); }
else { browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }); ownedBrowser = true; page = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 })).newPage(); }
const out = { where, taps, gap, log: [] };
try {
  page.on('pageerror', e => out.log.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') out.log.push(m.type() + ' ' + m.text()); });
  await page.addInitScript(() => {
    const A = window.__audit = { puts: [] }, put = CanvasRenderingContext2D.prototype.putImageData;
    CanvasRenderingContext2D.prototype.putImageData = function (img, ...r) { const art = this.canvas.closest?.('.tile .art'); if (art && !art.closest('.tile').querySelector('.example-caption')) A.puts.push({ t: performance.now(), c: this.canvas, get idx() { return [...document.querySelectorAll('.tile .art canvas')].indexOf(this.c); }, w: img.width, h: img.height, img }); return put.call(this, img, ...r); };
  });
  await page.goto(`http://${where === 'android' ? 'localhost' : '127.0.0.1'}:${port}/colorfetti/`);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64', metric: 'oklab', maxColors: 0, cleanup: false, alphaCut: 128, alphaMode: 'cut', dither: 'none', ditherStrength: 50 })); });
  await page.reload(); await page.bringToFront?.();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles([{ name: 'b1.png', mimeType: 'image/png', buffer: readFileSync(fx('hi1024.png')) }, { name: 'b2.png', mimeType: 'image/png', buffer: readFileSync(fx('hi256.png')) }]);
  const member = colors => `(p => { const s = new Set(${JSON.stringify(colors)}), d = p.img.data; let v = 0; for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; v++; if (!s.has('#' + ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0'))) return false; } return v > 0; })`;
  await page.waitForTimeout(8000); out.initial = await page.evaluate(`(() => { const m = ${member(R64)}; return window.__audit.puts.map(p => [Math.round(p.t), p.idx, p.w, p.h, m(p)]); })()`); console.log(JSON.stringify(out.initial));
  await page.waitForFunction(`(() => { const m = ${member(R64)}; return [0, 1].every(i => window.__audit.puts.some(p => p.idx === i && m(p))); })()`, null, { timeout: 120000 });
  await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
  const t0 = await page.evaluate(() => performance.now());
  for (let i = 0; i < taps; i++) { await page.getByRole('button', { name: ['Dithering 2x2', 'Dithering 4x4', 'Dithering 8x8', 'Dithering off'][i % 4], exact: true }).click(); await page.waitForTimeout(gap); }
  await page.getByRole('button', { name: 'Dithering 8x8', exact: true }).click();
  await page.getByRole('slider', { name: 'Dither strength', exact: true }).fill('100');
  const tFill = await page.evaluate(() => performance.now());
  out.storedAfter = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('colorfetti')); return { dither: s.dither, ditherStrength: s.ditherStrength }; });
  for (let w = 0; w < 30; w++) { await page.waitForTimeout(1000); const done = await page.evaluate(`(() => { const m = ${member(R64)}; return [0, 1].map(i => window.__audit.puts.filter(p => p.idx === i && p.t > ${tFill}).length + ':' + window.__audit.puts.filter(p => p.idx === i && p.t > ${tFill}).filter(m).length); })()`); out.log.push(`t+${w + 1}s paints(after fill) total:member ${done}`); if (done.every(x => +x.split(':')[1] > 0)) break; }
  out.paintsSinceBurst = await page.evaluate(({ t0, tFill }) => window.__audit.puts.filter(p => p.t >= t0).map(p => ({ dt: Math.round(p.t - tFill), idx: p.idx, w: p.w, h: p.h })), { t0, tFill });
  out.captions = await page.evaluate(() => [...document.querySelectorAll('.tile .cap, .tile figcaption')].map(n => n.textContent.trim().replace(/\s+/g, ' ')));
  out.dock = await page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert], .notice, .toast')].map(n => n.textContent.trim()).filter(Boolean));
  mkdirSync(resolve(repo, 'bench/claude-audit-2026-10-15/device', where === 'android' ? 'android' : 'chromium'), { recursive: true });
  await page.screenshot({ path: resolve(repo, 'bench/claude-audit-2026-10-15/device', where === 'android' ? 'android' : 'chromium', `burst-${taps}x${gap}.png`) });
} catch (e) { out.log.push('fatal ' + e.message.split('\n')[0]); }
finally {
  writeFileSync(resolve(repo, 'bench/claude-audit-2026-10-15/device', where === 'android' ? 'android' : 'chromium', `burst-${taps}x${gap}.json`), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ ...out, paintsSinceBurst: out.paintsSinceBurst?.length }, null, 1));
  if (ownedBrowser) await browser.close(); else { await page.close(); try { execFileSync(ADB, ['reverse', '--remove', `tcp:${port}`]); } catch {} }
  server.close(); process.exit(0);
}
