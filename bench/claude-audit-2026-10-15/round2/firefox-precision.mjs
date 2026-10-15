// Round 2: Firefox fallback precision by alpha band vs. the best any 8-bit premultiplied
// pipeline could do (p = round(c*a/255), c' = round(p*255/a)), plus double-decode cost.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/firefox-precision.mjs
import zlib from 'node:zlib'; import fs from 'node:fs';
import { createRequire } from 'node:module'; import { createServer } from 'vite';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const sharp = require('sharp'); const { firefox } = require('playwright');
const W = 256, raw = Buffer.alloc(W * W * 4); let seed = 99;
for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; raw[i] = seed >>> 24; }
const small = await sharp(raw, { raw: { width: W, height: W, channels: 4 } }).png().toBuffer();
const big = await sharp({ create: { width: 4096, height: 4096, channels: 4, background: { r: 90, g: 140, b: 200, alpha: 0.5 } } }).png().toBuffer();
const ck = (t, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length); o.write(t, 4, 'latin1'); Buffer.from(d).copy(o, 8); o.writeUInt32BE(zlib.crc32(o.subarray(4, 8 + d.length)), 8 + d.length); return o; };
const ih = Buffer.alloc(13); ih.writeUInt32BE(4); ih.writeUInt32BE(1, 4); ih[8] = 8; ih[9] = 4;
const gray = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ck('IHDR', ih), ck('IDAT', zlib.deflateSync(Buffer.from([0, 10, 1, 200, 64, 77, 254, 5, 255]))), ck('IEND', Buffer.alloc(0))]);
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, server: { port: 5352, strictPort: true }, logLevel: 'silent' });
await server.listen();
const browser = await firefox.launch(); const page = await browser.newPage();
await page.goto('http://localhost:5352/bench/claude-audit-2026-10-15/round2/blank.html');
const run = (b64, timing) => page.evaluate(async ([b64, timing]) => {
  const { decodeImageFile } = await import('/src/lib/image-decode.js');
  const file = new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'r.png', { type: 'image/png' });
  if (!timing) return Array.from((await decodeImageFile(file)).data);
  const t0 = performance.now(); await decodeImageFile(file); const app = performance.now() - t0;
  const t1 = performance.now(); const bm = await createImageBitmap(file); const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(bm, 0, 0); cx.getImageData(0, 0, bm.width, bm.height); bm.close();
  return { appMs: app, canvasOnlyMs: performance.now() - t1 };
}, [b64, timing]);
const out = await run(small.toString('base64'));
const bands = [[1, 3], [4, 15], [16, 63], [64, 127], [128, 254], [255, 255]], rows = [];
for (const [lo, hi] of bands) { let n = 0, app = 0, ideal = 0, worse = 0;
  for (let p = 0; p < raw.length; p += 4) { const a = raw[p + 3]; if (a < lo || a > hi) continue; n++;
    for (let k = 0; k < 3; k++) { const c = raw[p + k], best = Math.min(255, Math.round(Math.round(c * a / 255) * 255 / a));
      app += Math.abs(out[p + k] - c); ideal += Math.abs(best - c); if (Math.abs(out[p + k] - c) > Math.abs(best - c)) worse++; } }
  rows.push({ alpha: `${lo}-${hi}`, pixels: n, appMeanAbs: +(app / n / 3).toFixed(2), idealPremul8MeanAbs: +(ideal / n / 3).toFixed(2), channelsWorseThanIdeal: worse }); }
const grayOut = await run(gray.toString('base64'));
const timing = []; for (let i = 0; i < 3; i++) timing.push(await run(big.toString('base64'), true));
const result = { firefox: browser.version(), bands: rows, grayAlphaFixture: { source: 'gray+alpha [10,1, 200,64, 77,254, 5,255]', out: grayOut }, timing4096: timing };
fs.writeFileSync(new URL('./firefox-precision.out.json', import.meta.url), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
await browser.close(); await server.close();
