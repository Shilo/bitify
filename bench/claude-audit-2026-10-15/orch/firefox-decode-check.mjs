import { createRequire } from 'node:module'; import { createServer } from 'vite';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const sharp = require('sharp'); const { firefox } = require('playwright');
const W = 256, raw = Buffer.alloc(W * W * 4); let seed = 7;
for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; raw[i] = seed >>> 24; }
const png = await sharp(raw, { raw: { width: W, height: W, channels: 4 } }).png().toBuffer();
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, server: { port: 5319, strictPort: true }, logLevel: 'silent' });
await server.listen();
const browser = await firefox.launch(); const page = await browser.newPage(); await page.goto('http://localhost:5319/index.html');
const out = await page.evaluate(async b64 => {
  const { decodeImageFile } = await import('/src/lib/image-decode.js');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const img = await decodeImageFile(new File([bytes], 'r.png', { type: 'image/png' }));
  return Array.from(img.data);
}, png.toString('base64'));
let err = 0, n = 0, errHi = 0, nHi = 0;
for (let p = 0; p < raw.length; p += 4) { const a = raw[p + 3]; if (out[p + 3] !== a) throw new Error('alpha changed');
  if (!a) continue; const e = (Math.abs(out[p]-raw[p]) + Math.abs(out[p+1]-raw[p+1]) + Math.abs(out[p+2]-raw[p+2])) / 3; err += e; n++; if (a >= 128) { errHi += e; nHi++; } }
console.log('firefox real src: mean RGB err', (err / n).toFixed(2), 'alpha>=128', (errHi / nHi).toFixed(2));
await browser.close(); await server.close();
