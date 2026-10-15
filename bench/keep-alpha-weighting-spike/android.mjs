// Owned research tab only; preserve the shared physical browser and user pages.
import { createRequire } from 'node:module';
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = await browser.contexts()[0].newPage();
try {
  await page.goto('http://127.0.0.1:5302/?device=android');
  await page.bringToFront();
  await page.getByRole('button', { name: 'Run Keep weighting checks' }).click();
  await page.waitForFunction(() => ['PASS', 'FAIL', 'ERROR'].includes(document.querySelector('#status')?.textContent), undefined, { timeout: 60000 });
  const report = JSON.parse(await page.locator('#out').textContent());
  await page.screenshot({ path: fileURLToPath(new URL('./android-browser.png', import.meta.url)) });
  const desktop = JSON.parse(await readFile(new URL('./browser-codex.json', import.meta.url)));
  const mismatches = [];
  for (let i = 0; i < report.cases.length; i++) for (let j = 0; j < report.cases[i].variants.length; j++) {
    const a = report.cases[i].variants[j], b = desktop.cases[i]?.variants[j];
    if (a.hash !== b?.hash || JSON.stringify(a.colors) !== JSON.stringify(b?.colors)) mismatches.push({ case: i, variant: j });
  }
  const summary = {
    at: new Date().toISOString(), scope: report.scope,
    pass: report.pass && mismatches.length === 0,
    cases: report.cases.length, assertions: report.assertions.length,
    failures: report.failures, desktopOutputMismatches: mismatches,
    serverReceipt: report.serverReceipt, userAgent: report.userAgent,
  };
  await writeFile(new URL('./android-summary.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (!summary.pass) process.exitCode = 1;
} finally {
  await page.close();
  // No browser.close(): this is the user's shared Brave instance.
}
process.exit(process.exitCode ?? 0);
