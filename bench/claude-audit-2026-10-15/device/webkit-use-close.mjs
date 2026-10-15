// WebKit rerun flake: after Count -> Use N output colors -> Close, later clicks timed out.
// Repeats that sequence and records which dialogs remain open.
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve, fx, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const pw = require('playwright');
const engine = process.argv[2] ?? 'webkit', port = 5313, server = await serve(port);
const browser = engine === 'webkit' ? await pw.webkit.launch({ headless: true }) : await pw.chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const rows = [];
try {
  for (let run = 0; run < 6; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/colorfetti/`);
    await page.evaluate(() => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg8', dither: '8x8', ditherStrength: 100 })); });
    await page.reload();
    await page.locator('input[type=file][accept="image/*"]').setInputFiles([fx('alpha-sprite.png'), fx('walk.gif')]);
    await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').waitFor(); await page.waitForTimeout(800);
    await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').click();
    await page.getByRole('button', { name: 'Count output colors', exact: true }).click();
    const use = page.getByRole('button', { name: /^Use \d+ output colors?$/ }); await use.waitFor(); await use.click();
    const editor = page.locator('dialog.palette-import-modal'); await editor.waitFor();
    const closeCount = await editor.getByRole('button', { name: 'Close palette editor', exact: true }).count();
    let closeErr = null; try { await editor.getByRole('button', { name: 'Close palette editor', exact: true }).first().click({ timeout: 5000 }); } catch (e) { closeErr = e.message.split('\n')[0]; }
    await page.waitForTimeout(500);
    const open1 = await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className || d.getAttribute('aria-label')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(600); const focus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);
    const open2 = await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className || d.getAttribute('aria-label')));
    let settingsErr = null; try { await page.getByRole('button', { name: 'Palette settings', exact: true }).click({ timeout: 5000 }); } catch (e) { settingsErr = e.message.split('\n').slice(0, 6).join(' / '); }
    if (settingsErr) await page.screenshot({ path: resolve(repo, `bench/claude-audit-2026-10-15/device/${engine}/use-close-stuck-${run}.png`) });
    rows.push({ run, focusAfterOneEscape: focus, closeButtons: closeCount, closeErr, openAfterClose: open1, openAfterEscape: open2, settingsErr, errors });
    console.log(JSON.stringify(rows.at(-1)).slice(0, 600));
    await ctx.close();
  }
} finally {
  writeFileSync(resolve(repo, `bench/claude-audit-2026-10-15/device/${engine}/use-close.json`), JSON.stringify(rows, null, 2) + '\n');
  await browser.close(); server.close();
}
