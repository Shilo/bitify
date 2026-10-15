// Round 2: which PNG metadata variants make each engine report an all-null VideoColorSpace
// (and thus take the new canvas fallback), and is the copied data premultiplied?
// Oracle: the exact RGBA bytes encoded here. Chromium is launched WITH its sandbox.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/decode-metadata-matrix.mjs
import zlib from 'node:zlib'; import fs from 'node:fs';
import { createRequire } from 'node:module'; import { createServer } from 'vite';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const sharp = require('sharp'); const { chromium, firefox, webkit } = require('playwright');
const chunk = (type, data) => { const d = Buffer.from(data), out = Buffer.alloc(12 + d.length); out.writeUInt32BE(d.length);
  out.write(type, 4, 'latin1'); d.copy(out, 8); out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + d.length)), 8 + d.length); return out; };
const png = (w, h, ct, bd, rows, extra = []) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = bd; ihdr[9] = ct;
  const raw = Buffer.concat(rows.map(r => Buffer.concat([Buffer.of(0), Buffer.from(r)])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', [])]); };
const px = [[201, 13, 77, 1], [3, 250, 129, 2], [255, 255, 255, 1], [17, 34, 51, 64], [100, 150, 200, 127], [1, 2, 3, 254], [90, 80, 70, 0],
  [12, 34, 56, 255], [254, 1, 253, 3], [128, 128, 128, 128], [240, 20, 20, 200], [20, 240, 20, 32]];
const row = px.flat(), rgba = extra => png(px.length, 1, 6, 8, [row], extra);
const s15 = v => { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(v * 65536)); return b; };
function icc(prim, curv) { // minimal ICC v2 RGB matrix/TRC display profile
  const xyz = v => Buffer.concat([Buffer.from('XYZ \0\0\0\0', 'latin1'), ...v.map(s15)]);
  const tags = [['rXYZ', xyz(prim[0])], ['gXYZ', xyz(prim[1])], ['bXYZ', xyz(prim[2])], ['wtpt', xyz([0.9642, 1, 0.8249])],
    ...['rTRC', 'gTRC', 'bTRC'].map(t => [t, curv])];
  let off = 128 + 4 + tags.length * 12; const count = Buffer.alloc(4); count.writeUInt32BE(tags.length); const table = [count], body = [];
  for (const [sig, data] of tags) { const pad = Buffer.concat([data, Buffer.alloc((4 - data.length % 4) % 4)]);
    const e = Buffer.alloc(12); e.write(sig, 0, 'latin1'); e.writeUInt32BE(off, 4); e.writeUInt32BE(data.length, 8); table.push(e); body.push(pad); off += pad.length; }
  const h = Buffer.alloc(128); h.writeUInt32BE(off); h.writeUInt32BE(0x02100000, 8); h.write('mntrRGB XYZ ', 12, 'latin1'); h.write('acsp', 36, 'latin1');
  s15(0.9642).copy(h, 68); s15(1).copy(h, 72); s15(0.8249).copy(h, 76); return Buffer.concat([h, ...table, ...body]); }
const iccp = (name, prof) => chunk('iCCP', Buffer.concat([Buffer.from(name + '\0\0', 'latin1'), zlib.deflateSync(prof)]));
const curvTable = (() => { const n = 256, b = Buffer.alloc(12 + 2 * n); b.write('curv', 0, 'latin1'); b.writeUInt32BE(n, 8);
  for (let i = 0; i < n; i++) b.writeUInt16BE(Math.round(65535 * Math.pow(i / 255, 2.0)), 12 + 2 * i); return b; })();
const curvGamma = g => { const b = Buffer.alloc(14); b.write('curv', 0, 'latin1'); b.writeUInt32BE(1, 8); b.writeUInt16BE(Math.round(g * 256), 12); return b; };
const SRGB_P = [[0.4361, 0.2225, 0.0139], [0.3851, 0.7169, 0.0971], [0.1431, 0.0606, 0.7141]];
const PRO_P = [[0.7977, 0.2880, 0], [0.1352, 0.7119, 0], [0.0313, 0.0001, 0.8249]];
const u32 = v => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };
const chrm = (...v) => Buffer.concat(v.map(x => u32(Math.round(x * 100000))));
const p3png = await sharp(Buffer.from(row), { raw: { width: px.length, height: 1, channels: 4 } }).withIccProfile('p3').png().toBuffer();
const cases = {
  plain: rgba(), sRGB: rgba([chunk('sRGB', [0])]), gAMA_linear: rgba([chunk('gAMA', u32(100000))]),
  cHRM_bt2020_gAMA: rgba([chunk('gAMA', u32(45455)), chunk('cHRM', chrm(0.3127, 0.329, 0.708, 0.292, 0.17, 0.797, 0.131, 0.046))]),
  iCCP_sharp_p3: p3png, iCCP_table_srgbPrim: rgba([iccp('tbl', icc(SRGB_P, curvTable))]), iCCP_prophoto_g18: rgba([iccp('pro', icc(PRO_P, curvGamma(1.8)))]),
  iCCP_garbage: rgba([iccp('bad', Buffer.from('not a profile at all, definitely not'))]),
  iCCP_windows_srgb: rgba([iccp('ws', fs.readFileSync('C:/Windows/System32/spool/drivers/color/sRGB Color Space Profile.icm'))]),
  cICP_srgb: rgba([chunk('cICP', [1, 13, 0, 1])]), cICP_p3: rgba([chunk('cICP', [12, 13, 0, 1])]), cICP_linear: rgba([chunk('cICP', [1, 8, 0, 1])]),
  cICP_bt2020_pq: rgba([chunk('cICP', [9, 16, 0, 1])]), cICP_limited: rgba([chunk('cICP', [1, 13, 0, 0])]), cICP_unspecified: rgba([chunk('cICP', [2, 2, 0, 1])]),
  indexed_tRNS: png(3, 1, 3, 8, [[0, 1, 2]], [chunk('PLTE', [201, 13, 77, 3, 250, 129, 12, 34, 56]), chunk('tRNS', [1, 64])]),
  gray_alpha: png(4, 1, 4, 8, [[10, 1, 200, 64, 77, 254, 5, 255]]),
};
const expectFor = { indexed_tRNS: [201, 13, 77, 1, 3, 250, 129, 64, 12, 34, 56, 255], gray_alpha: [10, 10, 10, 1, 200, 200, 200, 64, 77, 77, 77, 254, 5, 5, 5, 255] };
const server = await createServer({ root: process.cwd(), configFile: false, publicDir: false, server: { port: 5351, strictPort: true }, logLevel: 'silent' });
await server.listen();
const result = {};
for (const [name, type, opts] of [['chromium', chromium, { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }], ['firefox', firefox, {}], ['webkit', webkit, {}]]) {
  const browser = await type.launch(opts); const page = await browser.newPage();
  await page.goto('http://localhost:5351/bench/claude-audit-2026-10-15/round2/blank.html');
  result[name] = { version: browser.version() };
  for (const [c, bytes] of Object.entries(cases)) {
    const r = result[name][c] = await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)), file = new File([bytes], 'x.png', { type: 'image/png' });
      const out = {};
      if (typeof ImageDecoder !== 'undefined') {
        const d = new ImageDecoder({ data: bytes, type: 'image/png', preferAnimation: false, colorSpaceConversion: 'default' });
        const f = (await d.decode({ frameIndex: 0 })).image; const cs = f.colorSpace;
        out.format = f.format; out.colorSpace = cs && { primaries: cs.primaries, transfer: cs.transfer, matrix: cs.matrix, fullRange: cs.fullRange };
        out.allNull = ['primaries', 'transfer', 'matrix', 'fullRange'].every(k => cs?.[k] == null);
        const m = new Uint8ClampedArray(f.displayWidth * f.displayHeight * 4);
        try { await f.copyTo(m, { format: 'RGBA', colorSpace: 'srgb' }); out.managed = Array.from(m); } catch (e) { out.managedError = String(e); }
        f.close(); d.close();
      } else out.noImageDecoder = true;
      const { decodeImageFile } = await import('/src/lib/image-decode.js');
      out.app = Array.from((await decodeImageFile(file)).data);
      const bm = await createImageBitmap(file), cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }); ctx.drawImage(bm, 0, 0);
      out.canvas = Array.from(ctx.getImageData(0, 0, bm.width, bm.height).data); return out;
    }, bytes.toString('base64'));
    const exp = expectFor[c] ?? row;
    const err = arr => { if (!arr) return null; let s = 0, n = 0, prem = 0;
      for (let p = 0; p < exp.length; p += 4) { const a = exp[p + 3]; if (!a) continue;
        s += Math.max(...[0, 1, 2].map(k => Math.abs(arr[p + k] - exp[p + k]))); n++;
        if (a < 200 && [0, 1, 2].some(k => exp[p + k] > 20) && [0, 1, 2].every(k => Math.abs(arr[p + k] - Math.round(exp[p + k] * a / 255)) <= 1)) prem++; }
      return { meanWorstErr: +(s / n).toFixed(2), premultipliedLikePx: prem }; };
    r.appErr = err(r.app); r.canvasErr = err(r.canvas); r.managedErr = err(r.managed);
    r.appEqualsCanvas = JSON.stringify(r.app) === JSON.stringify(r.canvas); r.appEqualsManaged = r.managed ? JSON.stringify(r.app) === JSON.stringify(r.managed) : null;
    delete r.app; delete r.canvas; delete r.managed;
  }
  await browser.close();
}
await server.close();
fs.writeFileSync(new URL('./decode-metadata-matrix.out.json', import.meta.url), JSON.stringify(result, null, 1));
for (const [b, rs] of Object.entries(result)) { console.log('==', b, rs.version);
  for (const [c, r] of Object.entries(rs)) if (c !== 'version') console.log(c.padEnd(20), String(r.format).padEnd(5), JSON.stringify(r.colorSpace ?? (r.noImageDecoder ? 'noDecoder' : null)),
    'allNull', r.allNull, 'app', JSON.stringify(r.appErr), 'canvas', JSON.stringify(r.canvasErr), 'managed', JSON.stringify(r.managedErr), 'app==canvas', r.appEqualsCanvas, 'app==managed', r.appEqualsManaged); }
