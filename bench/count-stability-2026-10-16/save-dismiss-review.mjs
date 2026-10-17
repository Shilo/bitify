import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { decode, compare, sha } from '../claude-audit-2026-10-15/device/audit-lib.mjs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
const report = [];
try {
  for (const port of [5343, 5344]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }), page = await context.newPage();
    await page.addInitScript(() => { localStorage.setItem('colorfetti', JSON.stringify({ family: 'full-palette', paletteId: 'preset-res64', metric: 'rgb', maxColors: 44, cleanup: true, dither: '4x4', ditherStrength: 50 })); localStorage.setItem('colorfetti-help-seen', '1'); });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('input[type=file]').first().setInputFiles('bench/count-stability-2026-10-16/two-colors.png');
    await page.waitForFunction(() => document.querySelector('.grid .dim')?.textContent.includes('2 colors'));
    await page.getByRole('button', { name: 'Palette settings', exact: true }).click();
    const downloads = []; page.on('download', value => downloads.push(value));
    await page.getByRole('button', { name: 'Save image', exact: true }).click();
    await page.waitForTimeout(600);
    const firstDownloadCount = downloads.length, settingsAfterFirst = await page.locator('.palette-settings-panel').count();
    assert.equal(firstDownloadCount, 0); assert.equal(settingsAfterFirst, 0);
    const pending = page.waitForEvent('download', { timeout: 10000 });
    await page.getByRole('button', { name: 'Save image', exact: true }).click();
    const downloaded = await pending, bytes = await readFile(await downloaded.path());
    const actual = await decode(bytes), source = await decode('bench/count-stability-2026-10-16/two-colors.png');
    const equality = compare(actual.frames[0], source.frames[0]);
    assert.equal(equality.rgbMismatch, 0); assert.equal(equality.alphaMismatch, 0);
    report.push({ port, firstDownloadCount, settingsAfterFirst, secondClickDownload: true, sha256: sha(bytes), equality });
    await context.close();
  }
} finally { await browser.close(); await writeFile(new URL('save-dismiss-review.json', import.meta.url), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
