// Round 2: does S1 (Keep counts alpha>=1 pixels fully in Auto) make Auto engine-dependent?
// Decodes the service reviewer's spill-alpha1.png with the app's decodeImageFile in each engine,
// then runs the real Auto accumulator at eligibility cut 1 (Keep) and 128 (Cut).
// Run from repo root: node bench/claude-audit-2026-10-15/round2/keep-auto-engines.mjs
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { createServer } from 'vite';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const pw = require('playwright');
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, server: { port: 5355, strictPort: true }, logLevel: 'silent' });
await server.listen();
const result = {};
const engines = [['chromium', { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }], ['firefox', {}], ['webkit', {}]];
for (const [name, opts] of engines) {
  const browser = await pw[name].launch(opts); const page = await browser.newPage();
  await page.goto('http://localhost:5355/bench/claude-audit-2026-10-15/round2/blank.html');
  result[name] = { version: browser.version(), ...(await page.evaluate(async () => {
    const { decodeImageFile } = await import('/src/lib/image-decode.js');
    const { createGeneratedAccumulator } = await import('/src/lib/palette-generated.js');
    const bytes = await (await fetch('/bench/claude-audit-2026-10-15/service/fixtures/spill-alpha1.png')).arrayBuffer();
    const img = await decodeImageFile(new File([bytes], 'spill-alpha1.png', { type: 'image/png' }));
    const faint = new Map();
    for (let p = 0; p < img.data.length; p += 4) if (img.data[p + 3] > 0 && img.data[p + 3] < 16) {
      const k = [0, 1, 2].map(c => img.data[p + c].toString(16).padStart(2, '0')).join('') + '@' + img.data[p + 3]; faint.set(k, (faint.get(k) ?? 0) + 1); }
    const auto = async cut => { const a = createGeneratedAccumulator(cut); a.beginAsset(); await a.addChunk(img.data, 1); await a.endAsset(); return (await a.finish()).colors; };
    return { faintDecoded: Object.fromEntries([...faint].sort((x, y) => y[1] - x[1]).slice(0, 6)), autoKeep: await auto(1), autoCut: await auto(128) };
  })) };
  await browser.close();
}
await server.close();
fs.writeFileSync(new URL('./keep-auto-engines.out.json', import.meta.url), JSON.stringify(result, null, 1));
for (const [n, r] of Object.entries(result)) console.log(n, r.version, 'faint:', JSON.stringify(r.faintDecoded), '\n  Keep Auto:', r.autoKeep.join(' '), '\n  Cut Auto: ', r.autoCut.join(' '));
