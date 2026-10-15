// Control for webkit-use-close.mjs: does Escape close the image viewer in WebKit without the
// nested editor, and after the editor closes does a focus click inside the viewer restore it?
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve, fx, repo } from './audit-lib.mjs';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const pw = require('playwright');
const server = await serve(5313), browser = await pw.webkit.launch({ headless: true }), out = {};
const openDialogs = page => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.className));
async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5313/colorfetti/');
  await page.evaluate(() => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg8' })); });
  await page.reload(); await page.locator('input[type=file][accept="image/*"]').setInputFiles([fx('walk.gif')]);
  await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').waitFor(); await page.waitForTimeout(600);
  await page.locator('button.caption-preview[aria-label="Preview walk.gif"]').click(); await page.waitForTimeout(500);
  return { ctx, page };
}
try {
  { const { ctx, page } = await fresh(); await page.keyboard.press('Escape'); await page.waitForTimeout(500); out.viewerOnlyEscape = await openDialogs(page); await ctx.close(); }
  { const { ctx, page } = await fresh();
    await page.getByRole('button', { name: 'Count output colors', exact: true }).click();
    await page.getByRole('button', { name: /^Use \d+ output colors?$/ }).click(); await page.locator('dialog.palette-import-modal').waitFor(); await page.waitForTimeout(400);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500); out.afterEscapeClosesEditor = await openDialogs(page);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500); out.secondEscape = await openDialogs(page);
    await page.getByRole('button', { name: 'Show original image' }).focus().catch(() => {}); await page.keyboard.press('Escape'); await page.waitForTimeout(500); out.escapeAfterRefocus = await openDialogs(page);
    await ctx.close(); }
} finally { writeFileSync(resolve(repo, 'bench/claude-audit-2026-10-15/device/webkit/escape-control.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out)); await browser.close(); server.close(); }
