import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { autoCheck } from './auto-check.mjs';
const { chromium } = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, chromiumSandbox: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const report = await autoCheck(page, { save: async (page, trigger) => { const pending = page.waitForEvent('download', { timeout: 180000 }); await trigger(); const download = await pending; return readFile(await download.path()); } });
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
