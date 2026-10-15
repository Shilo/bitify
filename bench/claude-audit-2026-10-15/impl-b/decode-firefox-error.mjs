// Impl-B audit: Firefox error magnitude on random1024 (alpha odd 1..255): app decodeImageFile vs canvas fallback.
// Expected pixels regenerated in-page with the same PRNG used by decode-browsers.mjs.
// Run (after decode-browsers.mjs): node bench/claude-audit-2026-10-15/impl-b/decode-firefox-error.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { firefox } = require('playwright');
const repo = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const server = http.createServer((req, res) => { const f = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html>');
  if (!f.startsWith(repo) || !fs.existsSync(f)) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'image/png' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(5347, '127.0.0.1', r));
const browser = await firefox.launch({ headless: true }); const page = await browser.newPage(); await page.goto('http://127.0.0.1:5347/');
const out = await page.evaluate(async () => {
  let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) >>> 24;
  const W = 1024, exp = new Uint8Array(W * W * 4);
  for (let i = 0; i < exp.length; i += 4) { const a = rnd() | 1; exp[i] = rnd(); exp[i + 1] = rnd(); exp[i + 2] = rnd(); exp[i + 3] = a; }
  const blob = await (await fetch('/.tmp/impl-b/png/random1024.png')).blob();
  const { decodeImageFile } = await import('/src/lib/image-decode.js');
  const app = (await decodeImageFile(new File([blob], 'r.png', { type: 'image/png' }))).data;
  const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = c.height = W;
  const x = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }); x.drawImage(bmp, 0, 0); const canvas = x.getImageData(0, 0, W, W).data;
  const stats = d => { let sum = 0, max = 0, exact = 0, n = 0, mid = 0, midN = 0; for (let i = 0; i < exp.length; i += 4) { let px = 0; for (let c = 0; c < 3; c++) { const e = Math.abs(d[i + c] - exp[i + c]); sum += e; max = Math.max(max, e); px = Math.max(px, e); } n++; if (!px && d[i + 3] === exp[i + 3]) exact++; if (exp[i + 3] >= 128) { mid += px; midN++; } } return { meanAbsRGB: +(sum / n / 3).toFixed(2), maxAbs: max, exactPixelsPct: +(100 * exact / n).toFixed(2), meanMaxErrAlphaGE128: +(mid / midN).toFixed(2) }; };
  return { app: stats(app), canvasFallback: stats(canvas) };
});
await browser.close(); server.close();
fs.writeFileSync(new URL('./decode-firefox-error.out.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
