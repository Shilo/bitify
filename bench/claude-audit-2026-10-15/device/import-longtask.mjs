// Separates harness from app cost for the ~370 ms long task seen at 1 Mi-pixel import on the phone.
// Path A: Playwright setInputFiles payload (as android.mjs). Path B: page fetches the fixture,
// assigns input.files through DataTransfer and dispatches change (no CDP file transfer).
//   node import-longtask.mjs android|desktop
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, fx, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const where = process.argv[2] ?? 'android', port = 5318, ADB = 'C:/Users/shilo/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const server = await serve(port); let browser, ctx, owned = false;
if (where === 'android') { execFileSync(ADB, ['reverse', `tcp:${port}`, `tcp:${port}`]); browser = await chromium.connectOverCDP('http://127.0.0.1:9333'); ctx = browser.contexts()[0]; }
else { browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }); ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 }); owned = true; }
const rows = [];
try {
  for (const [file, path] of [['hi1024.png', 'A'], ['hi1024.png', 'B'], ['hi1024.png', 'A'], ['hi1024.png', 'B'], ['hi256.png', 'A'], ['hi256.png', 'B']]) {
    const page = await ctx.newPage();
    try {
      await page.addInitScript(() => {
        const A = window.__a = { lt: [], change: 0, first: 0 };
        new PerformanceObserver(l => { for (const e of l.getEntries()) A.lt.push({ s: e.startTime, d: e.duration, attr: e.attribution?.map(x => x.containerType + ':' + x.name).join(',') }); }).observe({ type: 'longtask', buffered: true });
        document.addEventListener('change', e => { if (e.target.type === 'file') A.change = performance.now(); }, true);
        const put = CanvasRenderingContext2D.prototype.putImageData;
        CanvasRenderingContext2D.prototype.putImageData = function (...a) { const t = this.canvas.closest?.('.tile'); if (t && !t.querySelector('.example-caption') && !A.first) A.first = performance.now(); return put.apply(this, a); };
      });
      await page.goto(`http://${where === 'android' ? 'localhost' : '127.0.0.1'}:${port}/colorfetti/`);
      await page.evaluate(() => { localStorage.clear(); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg8', dither: 'none', alphaMode: 'cut' })); });
      await page.reload(); await page.bringToFront?.(); await page.waitForTimeout(1500);
      const before = await page.evaluate(() => performance.now());
      if (path === 'A') await page.locator('input[type=file][accept="image/*"]').setInputFiles([{ name: 'x-' + file, mimeType: 'image/png', buffer: readFileSync(fx(file)) }]);
      else await page.evaluate(async file => { const b = await (await fetch('/fx/' + file)).blob(), dt = new DataTransfer(); dt.items.add(new File([b], 'x-' + file, { type: 'image/png' })); await new Promise(r => setTimeout(r, 300)); const i = document.querySelector('input[type=file][accept="image/*"]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); }, file);
      await page.waitForFunction(() => window.__a.first > 0, null, { timeout: 60000 }); await page.waitForTimeout(500);
      const r = await page.evaluate(before => { const A = window.__a; return { firstPaintMs: Math.round(A.first - A.change), longtasks: A.lt.filter(e => e.s + e.d > before).map(e => ({ startRelChange: Math.round(e.s - A.change), d: Math.round(e.d), attr: e.attr })) }; }, before);
      rows.push({ file, path, ...r }); console.log(file, path, JSON.stringify(r));
    } finally { await page.close(); }
  }
} finally {
  writeFileSync(resolve(repo, 'bench/claude-audit-2026-10-15/device', where === 'android' ? 'android' : 'chromium', 'import-longtask.json'), JSON.stringify({ where, legend: { A: 'Playwright setInputFiles payload', B: 'page fetch + DataTransfer + change' }, rows }, null, 2) + '\n');
  if (owned) await browser.close(); else { try { execFileSync(ADB, ['reverse', '--remove', `tcp:${port}`]); } catch {} }
  server.close(); process.exit(0);
}
