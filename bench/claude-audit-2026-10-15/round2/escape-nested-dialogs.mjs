// Round 2: is F2 (Escape stops closing the viewer after Count -> Use N -> close editor) an app
// focus bug that also affects Chromium/Firefox, or a WebKit close-watcher quirk?
// Uses a Vite dev server of current src (configFile:false, publicDir:false); no dist/ build.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/escape-nested-dialogs.mjs
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const pw = require('playwright');
const gif = 'bench/claude-audit-2026-10-15/device/fixtures/walk.gif';
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, plugins: [svelte()], server: { port: 5354, strictPort: true }, logLevel: 'silent' });
await server.listen();
const open = page => page.evaluate(() => ({ open: [...document.querySelectorAll('dialog[open]')].map(d => d.className.includes('palette-import-modal') ? 'palette-import-modal' : d.className.split(' ')[0]),
  tooltip: [...document.querySelectorAll('.tooltip:not([hidden])')].map(t => t.textContent.slice(0, 30)),
  active: document.activeElement?.tagName + '.' + String(document.activeElement?.className).split(' ')[0] + ' ' + (document.activeElement?.getAttribute('aria-label') ?? '') }));
const result = {};
const engines = [['chromium', { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }], ['firefox', {}], ['webkit', {}]];
for (const [name, opts] of engines) {
  const browser = await pw[name].launch(opts); const r = result[name] = { version: browser.version(), runs: [] };
  for (const closeBy of ['escape', 'closeButton', 'controlTabFocus']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await ctx.newPage(), run = { closeBy };
    try {
      await page.goto('http://localhost:5354/');
      await page.evaluate(() => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-edg8' })); });
      await page.reload(); await page.locator('input[type=file][accept="image/*"]').setInputFiles([gif]);
      const preview = page.locator('button.caption-preview[aria-label="Preview walk.gif"]'); await preview.waitFor({ timeout: 20000 }); await page.waitForTimeout(600);
      await preview.click(); await page.waitForTimeout(500); run.viewerOpened = await open(page);
      if (closeBy === 'controlTabFocus') { // no nested editor: keyboard-focus a viewer control, then Escape
        await page.keyboard.press('Tab'); await page.waitForTimeout(400); run.afterTab = await open(page);
        for (let i = 1; i <= 4 && (await open(page)).open.includes('image-viewer'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); run['viewerEscape' + i] = await open(page); }
        run.viewerClosedByEscape = !(await open(page)).open.includes('image-viewer'); r.runs.push(run); await ctx.close(); continue; }
      await page.getByRole('button', { name: 'Count output colors', exact: true }).click();
      await page.getByRole('button', { name: /^Use \d+ output colors?$/ }).click({ timeout: 20000 });
      await page.locator('dialog.palette-import-modal').waitFor(); await page.waitForTimeout(400); run.editorOpened = await open(page);
      if (closeBy === 'escape') { for (let i = 1; i <= 3 && (await open(page)).open.includes('palette-import-modal'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); run['editorEscape' + i] = await open(page); } }
      else { await page.locator('dialog.palette-import-modal').getByRole('button', { name: /^Close/ }).first().click(); await page.waitForTimeout(400); run.afterCloseButton = await open(page); }
      for (let i = 1; i <= 4 && (await open(page)).open.includes('image-viewer'); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); run['viewerEscape' + i] = await open(page); }
      run.viewerClosedByEscape = !(await open(page)).open.includes('image-viewer');
    } catch (e) { run.error = String(e).slice(0, 300); }
    r.runs.push(run); await ctx.close();
  }
  await browser.close();
}
await server.close();
fs.writeFileSync(new URL('./escape-nested-dialogs.out.json', import.meta.url), JSON.stringify(result, null, 1));
for (const [n, r] of Object.entries(result)) for (const run of r.runs) console.log(n, run.closeBy, 'closed', run.viewerClosedByEscape, run.error ?? '', JSON.stringify(Object.fromEntries(Object.entries(run).filter(([k, v]) => v?.open && /Escape|afterTab|afterClose/.test(k)).map(([k, v]) => [k, v.open.join('+') + ' | ' + v.active + ' | tip:' + v.tooltip.join(',')]))));
