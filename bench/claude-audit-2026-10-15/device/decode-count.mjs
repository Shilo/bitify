// How many native PNG decodes does one still import trigger? Records each VideoFrame.copyTo with a stack.
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve, fx, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const server = await serve(5313), browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }), out = {};
try {
  for (const [label, settings] of [['Generated default', null], ['ENDESGA 8 Cut', { family: 'full-palette', paletteId: 'preset-edg8' }], ['ENDESGA 8 Keep', { family: 'full-palette', paletteId: 'preset-edg8', alphaMode: 'keep' }], ['1-bit', { family: 'two-color' }]]) {
    for (const file of ['alpha-sprite.png', 'ramp.png']) {
      const ctx = await browser.newContext(), page = await ctx.newPage();
      await ctx.addInitScript(() => { window.__d = []; const c = VideoFrame.prototype.copyTo; VideoFrame.prototype.copyTo = function (d, o) { window.__d.push({ t: Math.round(performance.now()), stack: new Error().stack.split('\n').slice(2, 6).map(s => s.trim().replace(/https?:\/\/[^/]+/, '')).join(' < ') }); return c.call(this, d, o); }; });
      await page.goto('http://127.0.0.1:5313/colorfetti/');
      await page.evaluate(s => { localStorage.setItem('colorfetti-help-seen', '1'); if (s) localStorage.setItem('colorfetti', JSON.stringify(s)); }, settings);
      await page.reload(); await page.waitForTimeout(1000);
      const before = await page.evaluate(() => window.__d.length);
      await page.locator('input[type=file][accept="image/*"]').setInputFiles(fx(file)); await page.waitForTimeout(2500);
      out[label + ' ' + file] = { beforeImport: before, calls: await page.evaluate(() => window.__d) };
      console.log(label, file, before, out[label + ' ' + file].calls.length);
      await ctx.close();
    }
  }
} finally { writeFileSync(resolve(repo, 'bench/claude-audit-2026-10-15/device/chromium/decode-count.json'), JSON.stringify(out, null, 2) + '\n'); await browser.close(); server.close(); }
