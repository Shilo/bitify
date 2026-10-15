// Impl-B audit: verify candidate fix B-3 (image-decode.candidate.js) in Firefox and Chromium (sandbox on).
// Run (after decode-browsers.mjs wrote .tmp/impl-b/png): node bench/claude-audit-2026-10-15/impl-b/decode-candidate-verify.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { firefox, chromium } = require('playwright');
const repo = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const server = http.createServer((req, res) => { const f = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html>');
  if (!f.startsWith(repo) || !fs.existsSync(f)) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'image/png' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(5348, '127.0.0.1', r));
const out = {};
for (const [label, type, opts] of [['firefox', firefox, {}], ['chromium', chromium, { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }]]) {
  const browser = await type.launch({ headless: true, ...opts }); const page = await browser.newPage(); await page.goto('http://127.0.0.1:5348/');
  out[label] = await page.evaluate(async () => {
    let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) >>> 24;
    const W = 1024, exp = new Uint8Array(W * W * 4);
    for (let i = 0; i < exp.length; i += 4) { const a = rnd() | 1; exp[i] = rnd(); exp[i + 1] = rnd(); exp[i + 2] = rnd(); exp[i + 3] = a; }
    const blob = await (await fetch('/.tmp/impl-b/png/random1024.png')).blob();
    const r = {};
    for (const [name, url] of [['current', '/src/lib/image-decode.js'], ['candidate', '/bench/claude-audit-2026-10-15/impl-b/image-decode.candidate.js']]) {
      const { decodeImageFile } = await import(url);
      const d = (await decodeImageFile(new File([blob], 'r.png', { type: 'image/png' }))).data;
      let exact = 0, sum = 0; for (let i = 0; i < exp.length; i += 4) { let e = 0; for (let c = 0; c < 3; c++) { const v = Math.abs(d[i + c] - exp[i + c]); sum += v; e = Math.max(e, v); } if (!e && d[i + 3] === exp[i + 3]) exact++; }
      r[name] = { exactPct: +(100 * exact / (W * W)).toFixed(2), meanAbsRGB: +(sum / W / W / 3).toFixed(2) };
    }
    return r;
  });
  await browser.close();
}
server.close();
fs.writeFileSync(new URL('./decode-candidate-verify.out.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
