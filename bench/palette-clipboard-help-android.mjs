// Final built Help visibility/layout on the authorized physical Android browser.
// Test-only stored preferences select cases; opening/closing Help uses real UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadClipboardManifest, clipboardFixtureDirectory } from './palette-clipboard-fixtures.mjs';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve('bench/palette-clipboard-review'), sentence = 'Save a PNG for exact translucent colors.';
const report = { scope: 'Actual final production Help dialog on USB Android. Only fixture/settings seeding; no source modification or clipboard access.', productionChanged: false, clipboardAccessed: false, started: new Date().toISOString(), distIndexSha256: createHash('sha256').update(fs.readFileSync('dist/index.html')).digest('hex'), cases: [], errors: [] };
const browser = await chromium.connectOverCDP(process.env.ANDROID_CDP ?? 'http://127.0.0.1:9333'), context = browser.contexts()[0], pages = [];
const manifest = loadClipboardManifest();
try {
  for (const [id, key, expected] of [['keep-partial', 'palette-keep', true], ['cut-partial', 'palette-cut', false], ['onebit-partial', 'onebit', false], ['keep-binary', 'gif-frame0', false]]) {
    const entry = manifest.fixtures.find(entry => entry.key === key), page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => report.errors.push(error.message));
    const settings = entry.family === 'two-color' ? { ...entry.settings, settings: { solid: entry.settings.set } } : entry.settings;
    await page.addInitScript(settings => { localStorage.setItem('colorfetti-help-seen', '1'); localStorage.setItem('colorfetti', JSON.stringify(settings)); }, settings);
    await page.goto('http://localhost:5297/app/'); await page.bringToFront();
    await page.locator('input[type=file][accept="image/*"]').setInputFiles(path.join(clipboardFixtureDirectory, entry.sourceFile));
    await page.getByRole('button', { name: 'Image actions for ' + entry.sourceFile, exact: true }).waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.locator('.more[open]').getByRole('button', { name: 'Help', exact: true }).click();
    const help = page.locator('.help[open]'); await help.waitFor();
    const saveText = await help.locator('ol li').last().textContent();
    assert.equal(saveText.includes(sentence), expected, id + ' Help sentence visibility');
    assert.equal(saveText, 'SaveSave or copy images.' + (expected ? ' ' + sentence : ''), id + ' complete Save text and sentence spacing');
    const layout = await help.evaluate(dialog => {
      const close = dialog.querySelector('button[aria-label="Close"]'), rect = close.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { viewportWidth: innerWidth, viewportHeight: innerHeight, documentScrollWidth: document.documentElement.scrollWidth, dialogClientWidth: dialog.clientWidth, dialogScrollWidth: dialog.scrollWidth, closeRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, closeCenterHitsButton: hit === close || close.contains(hit) };
    });
    assert(layout.documentScrollWidth <= layout.viewportWidth + 1, id + ' document horizontal overflow');
    assert(layout.dialogScrollWidth <= layout.dialogClientWidth + 1, id + ' Help horizontal overflow');
    assert(layout.closeRect.x >= 0 && layout.closeRect.y >= 0 && layout.closeRect.x + layout.closeRect.width <= layout.viewportWidth && layout.closeRect.y + layout.closeRect.height <= layout.viewportHeight && layout.closeCenterHitsButton, id + ' Help Close unreachable');
    await page.screenshot({ path: path.join(output, 'android-help-' + id + '.png') });
    await help.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.locator('.help[open]').count(), 0, 'Close did not dismiss Help');
    report.cases.push({ id, key, expectedSentence: expected, sentencePresent: saveText.includes(sentence), saveText, ...layout, actualCloseClickPassed: true, pass: true });
    await page.close();
  }
  assert.deepEqual(report.errors, []); report.completed = true;
} catch (error) { report.completed = false; report.error = { message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  for (const page of pages) if (!page.isClosed()) await page.close().catch(() => {});
  report.finished = new Date().toISOString(); fs.writeFileSync(path.join(output, 'android-help-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exit(process.exitCode ?? 0);
}
