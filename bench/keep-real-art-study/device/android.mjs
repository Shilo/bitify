// RESEARCH ONLY. Runs browser-check.html in the user's existing Android Brave over CDP
// (adb forward tcp:9333 localabstract:chrome_devtools_remote; adb reverse tcp:5360 tcp:5360).
// Opens and closes only its own page; never browser.close() (shared instance).
// Usage: node bench/keep-real-art-study/device/android.mjs <device-label> <screenshot.png>
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const [label = 'android', shot] = process.argv.slice(2);
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = await browser.contexts()[0].newPage();
try {
  await page.goto(`http://127.0.0.1:5360/?device=${label}`);
  await page.bringToFront();
  const t = Date.now();
  await page.getByRole('button', { name: 'Run parity check' }).click();
  await page.waitForFunction(() => ['PASS', 'FAIL', 'ERROR'].includes(document.querySelector('#status')?.textContent), undefined, { timeout: 600000 });
  const status = await page.locator('#status').textContent(), out = await page.locator('#out').textContent();
  if (shot) await page.screenshot({ path: shot });
  if (status === 'ERROR') throw new Error(out);
  const r = JSON.parse(out);
  console.log(JSON.stringify({ status, wallMs: Date.now() - t, userAgent: r.userAgent, mismatches: r.mismatches, receipt: r.serverReceipt }));
  if (!r.pass) process.exitCode = 1;
} finally {
  await page.close();
}
process.exit(process.exitCode ?? 0);
