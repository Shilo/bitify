// Physical USB Brave, owned research tab only. No production/UI injection.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = await browser.contexts()[0].newPage();
try {
  await page.goto('http://127.0.0.1:5306/?device=android');
  await page.bringToFront();
  await page.getByRole('button', { name: 'Run frozen comparisons' }).click();
  await page.waitForFunction(() => /^(Passed|FAILED)/.test(document.querySelector('#status')?.textContent), undefined, { timeout: 60000 });
  const status = await page.locator('#status').textContent();
  if (status.startsWith('FAILED')) throw new Error(status);
  const phone = JSON.parse(status.slice(status.indexOf('{')));
  // The visible status is updated just before the receipt POST: persist this owned
  // observation separately, independent of the server's receipt timing.
  await writeFile(new URL('./android-research-visible.json', import.meta.url), JSON.stringify(phone, null, 2) + '\n');
  const desktop = JSON.parse(await readFile(new URL('../important-colors-spike/codex-results.json', import.meta.url)));
  const mismatches = phone.checks.filter((c, i) => c.id !== desktop.checks[i]?.id || c.hash !== desktop.checks[i]?.hash);
  const summary = {
    at: new Date().toISOString(), scope: phone.scope,
    desktopChecks: desktop.passed, phoneChecks: phone.passed,
    inputHashesMatch: JSON.stringify(phone.inputHashes) === JSON.stringify(desktop.inputHashes),
    hashMismatches: mismatches, errors: phone.errors,
    passed: phone.passed === 189 && desktop.passed === 189 && !phone.errors.length && !mismatches.length,
  };
  summary.passed &&= summary.inputHashesMatch;
  await writeFile(new URL('./research-parity.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  await page.screenshot({ path: fileURLToPath(new URL('./android-research.png', import.meta.url)) });
  console.log(JSON.stringify(summary));
  if (!summary.passed) process.exitCode = 1;
} finally {
  await page.close();
  // Preserve the shared browser and user tabs.
}
process.exit(process.exitCode ?? 0);
