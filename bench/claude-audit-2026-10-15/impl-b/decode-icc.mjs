// Impl-B audit: PNG tagged with a Display P3 ICC profile (Sharp) in Chromium (sandbox on).
// Oracle: browser color-managed canvas decode of the same opaque pixels; the app must not
// raw-copy untransformed P3 values. Run: node bench/claude-audit-2026-10-15/impl-b/decode-icc.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium } = require('playwright'); const sharp = require('sharp');
const repo = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const px = [255,0,0,255, 0,255,0,255, 0,0,255,255, 200,100,50,255, 30,60,90,255, 128,128,128,255];
const out = path.join(repo, '.tmp/impl-b/png/p3.png');
await sharp(Buffer.from(px), { raw: { width: 6, height: 1, channels: 4 } }).withIccProfile('p3').png().toFile(out);
const server = http.createServer((req, res) => { const f = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html>');
  if (!f.startsWith(repo) || !fs.existsSync(f)) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'image/png' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(5349, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const page = await browser.newPage(); await page.goto('http://127.0.0.1:5349/');
const r = await page.evaluate(async () => {
  const blob = await (await fetch('/.tmp/impl-b/png/p3.png')).blob();
  const { decodeImageFile } = await import('/src/lib/image-decode.js');
  const cand = await import('/bench/claude-audit-2026-10-15/impl-b/image-decode.candidate.js');
  const candidate = [...(await cand.decodeImageFile(new File([blob], 'p3.png', { type: 'image/png' }))).data];
  const app = [...(await decodeImageFile(new File([blob], 'p3.png', { type: 'image/png' }))).data];
  const d = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/png' }); const f = (await d.decode()).image;
  const meta = { format: f.format, colorSpace: f.colorSpace.toJSON() }; f.close(); d.close();
  const bmp = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = 6; c.height = 1;
  const x = c.getContext('2d', { colorSpace: 'srgb' }); x.drawImage(bmp, 0, 0);
  return { meta, candidate, app, canvas: [...x.getImageData(0, 0, 6, 1).data] };
});
await browser.close(); server.close();
r.maxDiffAppVsCanvas = Math.max(...r.app.map((v, i) => Math.abs(v - r.canvas[i])));
r.candidateEqualsApp = r.candidate.every((v, i) => v === r.app[i]);
r.appEqualsUntransformedSource = r.app.every((v, i) => v === px[i]);
fs.writeFileSync(new URL('./decode-icc.out.json', import.meta.url), JSON.stringify(r, null, 1));
console.log(JSON.stringify(r));
