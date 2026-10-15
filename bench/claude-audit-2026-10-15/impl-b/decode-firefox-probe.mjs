// Impl-B audit: Firefox ImageDecoder premultiplication probe vs canvas fallback.
// Requires PNGs written by decode-browsers.mjs under .tmp/impl-b/png.
// Run: node bench/claude-audit-2026-10-15/impl-b/decode-firefox-probe.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { firefox, chromium } = require('playwright');
const repo = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const server = http.createServer((req, res) => { const f = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (req.url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html>');
  if (!f.startsWith(repo) || !fs.existsSync(f)) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'image/png' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(5346, '127.0.0.1', r));
const out = {};
for (const [label, type, opts] of [['firefox', firefox, {}], ['chromium', chromium, { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }]]) {
  const browser = await type.launch({ headless: true, ...opts }); const page = await browser.newPage(); await page.goto('http://127.0.0.1:5346/');
  out[label] = await page.evaluate(async () => {
    const blob = await (await fetch('/.tmp/impl-b/png/rgba8.png')).blob(); const r = {};
    for (const premultiplyAlpha of ['default', 'none', 'premultiply']) {
      const d = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/png', premultiplyAlpha });
      const f = (await d.decode()).image; const a = new Uint8Array(40);
      await f.copyTo(a, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: 40 }] }); r['decoder_' + premultiplyAlpha] = [...a].slice(0, 20); f.close(); d.close();
    }
    for (const premultiplyAlpha of ['default', 'none']) {
      const bmp = await createImageBitmap(blob, { premultiplyAlpha, colorSpaceConversion: 'default' }); const c = document.createElement('canvas'); c.width = bmp.width; c.height = 1;
      const x = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }); x.drawImage(bmp, 0, 0); r['canvas_bitmap_' + premultiplyAlpha] = [...x.getImageData(0, 0, 10, 1).data].slice(0, 20);
    }
    r.navigator = navigator.userAgent; return r;
  });
  await browser.close();
}
server.close();
out.expected = [201,13,77,1, 3,250,129,2, 255,255,255,1, 17,34,51,64, 100,150,200,127];
fs.writeFileSync(new URL('./decode-firefox-probe.out.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"'));
