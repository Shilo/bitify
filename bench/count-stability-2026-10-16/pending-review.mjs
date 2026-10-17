// Review-owned reproduction; no app-source instrumentation or source edits.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const reports = [];
const ports = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [5343, 5344];
assert(ports.every(Number.isInteger));
try {
  for (const port of ports) {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } }), page = await context.newPage();
    await page.addInitScript(() => { localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64' })); localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti-welcomed', '1'); });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('input[type=file]').first().setInputFiles('bench/practical-workloads-2026-10-16/fixtures/kenney-sheet-2048.png');
    await page.locator('.grid figure .art canvas').waitFor();
    const reuse = page.getByRole('button', { name: 'Reuse colors from kenney-sheet-2048.png', exact: true });
    await reuse.click(); await page.locator('dialog.palette-import-modal').waitFor();
    await page.getByRole('button', { name: 'Close palette editor', exact: true }).click();
    const before = await page.locator('.grid figure .dim').textContent();
    assert.match(before, /colors/);
    await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
    await page.evaluate(() => {
      document.querySelector('button[aria-label="RGB matching"]').click();
      document.querySelector('button[aria-label="Reuse colors from kenney-sheet-2048.png"]').click();
    });
    await page.waitForTimeout(2500);
    const report = { port, before, after: await page.locator('.grid figure .dim').textContent(), draftOpen: await page.locator('dialog.palette-import-modal[open]').count(), status: await page.locator('[role=status]').allTextContents() };
    reports.push(report);
    await page.screenshot({ path: `bench/count-stability-2026-10-16/pending-${port}.png` });
    if (report.draftOpen) {
      await page.getByRole('button', { name: 'Close palette editor', exact: true }).click();
      await page.getByRole('button', { name: 'Oklab matching', exact: true }).click();
      await page.waitForTimeout(500);
      report.sampledAfterChangeWithoutInspection = await page.locator('.grid figure .dim').textContent();
      assert.doesNotMatch(report.sampledAfterChangeWithoutInspection, /colors?\b/, 'Sampled rendering must retire a stale exact count when no inspection is running');
    }
    await context.close();
  }
} finally { await browser.close(); await writeFile(new URL(`pending-review-${ports.join('-')}-results.json`, import.meta.url), JSON.stringify(reports, null, 2) + '\n'); }
console.log(JSON.stringify(reports));
