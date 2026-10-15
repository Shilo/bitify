// Physical Android diagnostic driver. No clipboard access; closes owned tabs only.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
execFileSync(process.env.ADB ?? 'adb', ['reverse', 'tcp:5298', 'tcp:5298'], { encoding: 'utf8' });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333'), page = await browser.contexts()[0].newPage(); let failed = false;
try {
  const url = process.argv[2] ?? 'http://localhost:5298/?device=android';
  await page.goto(url); await page.bringToFront();
  await page.locator('#device').selectOption('android');
  await page.getByRole('button', { name: 'Run PNG precision checks', exact: true }).click();
  await page.waitForFunction(() => { try { const report = JSON.parse(document.querySelector('#out').textContent); return Boolean(report.finished || report.completed); } catch { return false; } }, null, { timeout: 180000 });
  const report = JSON.parse(await page.locator('#out').textContent());
  fs.writeFileSync('bench/png-precision-validation-android-baseline.json', JSON.stringify(report, null, 2) + '\n');
  await page.screenshot({ path: 'bench/png-precision-validation-android-baseline.png' });
  console.log(JSON.stringify({completed: report.completed, fixtures: report.fixtures.map(f => ({id:f.id, methods:f.methods.map(m=>({name:m.name,ok:m.ok,rgb:m.visibleRgbMismatches,alpha:m.alphaMismatches,max:m.maxChannelDelta}))}))}, null, 2));
  failed = !report.completed;
} catch(error) { failed = true; console.error(error); }
finally { await page.close(); process.exit(failed ? 1 : 0); }
