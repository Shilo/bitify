// Round 2: cost of the discarded ImageDecoder decode now that Firefox frames fall back to
// createImageBitmap/canvas (376a55c). High-entropy 2048x2048 RGBA, three alternating runs.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/firefox-double-decode.mjs
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { createServer } from 'vite';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const sharp = require('sharp'); const { firefox } = require('playwright');
const W = 2048, raw = Buffer.alloc(W * W * 4); let seed = 5;
for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; raw[i] = seed >>> 24; }
const png = await sharp(raw, { raw: { width: W, height: W, channels: 4 } }).png({ compressionLevel: 1 }).toBuffer();
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, server: { port: 5353, strictPort: true }, logLevel: 'silent' });
await server.listen();
fs.writeFileSync('.tmp/r2/big.png', png); // regenerable, not evidence
const browser = await firefox.launch(); const page = await browser.newPage();
await page.goto('http://localhost:5353/bench/claude-audit-2026-10-15/round2/blank.html');
const runs = await page.evaluate(async () => {
  const { decodeImageFile } = await import('/src/lib/image-decode.js');
  const file = new File([await (await fetch('/.tmp/r2/big.png')).arrayBuffer()], 'r.png', { type: 'image/png' });
  const canvasOnly = async () => { const bm = await createImageBitmap(file); const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
    const cx = cv.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }); cx.drawImage(bm, 0, 0); cx.getImageData(0, 0, bm.width, bm.height); bm.close(); };
  const out = [];
  for (let i = 0; i < 3; i++) { let t = performance.now(); await decodeImageFile(file); const app = performance.now() - t;
    t = performance.now(); await canvasOnly(); out.push({ appMs: Math.round(app), canvasOnlyMs: Math.round(performance.now() - t) }); }
  return out;
});
const result = { firefox: browser.version(), pngBytes: png.length, runs };
fs.writeFileSync(new URL('./firefox-double-decode.out.json', import.meta.url), JSON.stringify(result, null, 1)); console.log(JSON.stringify(result));
await browser.close(); await server.close();
