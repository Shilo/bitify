// Impl-B audit: real-browser check of src/lib/image-decode.js native packed sRGB copy.
// Independent oracle: the exact RGBA bytes this script itself encodes into each PNG.
// Serves the repo read-only on 127.0.0.1:5345 (in-process), then runs Chromium (sandbox ON),
// Firefox and WebKit. Records frame format/colorSpace, path taken, and mismatches.
// Run: node bench/claude-audit-2026-10-15/impl-b/decode-browsers.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/shilo/AppData/Local/ms-playwright';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { chromium, firefox, webkit } = require('playwright');
const repo = path.resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

// ---- minimal PNG encoder (independent of app save.js) ----
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = ~0; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (~c) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1');
  Buffer.from(data).copy(out, 8); out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out;
}
function png(w, h, colorType, bitDepth, rows, extra = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = bitDepth; ihdr[9] = colorType;
  const raw = Buffer.concat(rows.map(r => Buffer.concat([Buffer.of(0), Buffer.from(r)])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const lowAlpha = [[201,13,77,1],[3,250,129,2],[255,255,255,1],[17,34,51,64],[100,150,200,127],[1,2,3,254],[90,80,70,0],[12,34,56,255],[254,1,253,3],[128,128,128,128]];
const cases = {};
const flat = px => px.flat();
cases.rgba8 = { bytes: png(lowAlpha.length, 1, 6, 8, [flat(lowAlpha)]), expect: flat(lowAlpha) };
cases.rgba8_sRGB = { bytes: png(lowAlpha.length, 1, 6, 8, [flat(lowAlpha)], [chunk('sRGB', Buffer.of(0))]), expect: flat(lowAlpha) };
{ const g = Buffer.alloc(4); g.writeUInt32BE(45455); cases.rgba8_gAMA = { bytes: png(lowAlpha.length, 1, 6, 8, [flat(lowAlpha)], [chunk('gAMA', g)]), expect: flat(lowAlpha), note: 'gAMA 1/2.2 may legitimately change values' }; }
{ const row = Buffer.alloc(lowAlpha.length * 8); lowAlpha.forEach((p, i) => p.forEach((v, c) => row.writeUInt16BE(v * 257, i * 8 + c * 2)));
  cases.rgba16 = { bytes: png(lowAlpha.length, 1, 6, 16, [row]), expect: flat(lowAlpha) }; }
cases.gray_alpha = { bytes: png(4, 1, 4, 8, [[10,1, 200,64, 77,254, 5,255]]), expect: [10,10,10,1, 200,200,200,64, 77,77,77,254, 5,5,5,255] };
cases.indexed_tRNS = { bytes: png(3, 1, 3, 8, [[0,1,2]], [chunk('PLTE', Buffer.from([201,13,77, 3,250,129, 12,34,56])), chunk('tRNS', Buffer.from([1, 64]))]), expect: [201,13,77,1, 3,250,129,64, 12,34,56,255] };
{ // 1024x1024 random: exercises BGRA swap chunking/yielding over 4 MiB.
  let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) >>> 24;
  const W = 1024, rows = [], all = [];
  for (let y = 0; y < W; y++) { const r = []; for (let x = 0; x < W; x++) { const a = rnd() | 1; r.push(rnd(), rnd(), rnd(), a); } rows.push(r); all.push(...r); }
  cases.random1024 = { bytes: png(W, W, 6, 8, rows), expect: all };
}
const dir = path.join(repo, '.tmp', 'impl-b', 'png');
fs.mkdirSync(dir, { recursive: true });
for (const [name, c] of Object.entries(cases)) fs.writeFileSync(path.join(dir, name + '.png'), c.bytes);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'); if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>decode</title>'); return; }
  const file = path.join(repo, decodeURIComponent(url.pathname));
  if (!file.startsWith(repo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(5345, '127.0.0.1', r));

async function inPage(page, names) {
  return page.evaluate(async names => {
    const { decodeImageFile } = await import('/src/lib/image-decode.js');
    const out = {};
    for (const name of names) {
      const blob = await (await fetch(`/.tmp/impl-b/png/${name}.png`)).blob();
      const file = new File([blob], name + '.png', { type: 'image/png' });
      const info = { hasImageDecoder: typeof ImageDecoder !== 'undefined' };
      if (info.hasImageDecoder) {
        try {
          const d = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/png', preferAnimation: false, colorSpaceConversion: 'default' });
          const f = (await d.decode({ frameIndex: 0, completeFramesOnly: true })).image;
          info.format = f.format; info.colorSpace = f.colorSpace?.toJSON?.() ?? f.colorSpace;
          info.visibleRect = f.visibleRect && { x: f.visibleRect.x, y: f.visibleRect.y, w: f.visibleRect.width, h: f.visibleRect.height };
          info.coded = [f.codedWidth, f.codedHeight]; info.display = [f.displayWidth, f.displayHeight]; info.rotation = f.rotation; info.flip = f.flip;
          if (f.displayWidth * f.displayHeight <= 64) {
            const raw = new Uint8Array(f.displayWidth * f.displayHeight * 4);
            try { await f.copyTo(raw, { layout: [{ offset: 0, stride: f.displayWidth * 4 }] }); info.raw = [...raw]; } catch (e) { info.rawError = e.message; }
            const managed = new Uint8Array(raw.length);
            try { await f.copyTo(managed, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: f.displayWidth * 4 }] }); info.managed = [...managed]; } catch (e) { info.managedError = e.message; }
          }
          f.close(); d.close();
          // Candidate fix probe: explicitly request unpremultiplied output.
          try {
            const d2 = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/png', preferAnimation: false, colorSpaceConversion: 'default', premultiplyAlpha: 'none' });
            const f2 = (await d2.decode({ frameIndex: 0, completeFramesOnly: true })).image;
            const m2 = new Uint8Array(f2.displayWidth * f2.displayHeight * 4);
            await f2.copyTo(m2, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: f2.displayWidth * 4 }] });
            info.unpremulManaged = m2.length <= 256 ? [...m2] : null;
            info.unpremulHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', m2))).map(b => b.toString(16).padStart(2, '0')).join('');
            info.unpremulFormat = f2.format; info.unpremulSpace = f2.colorSpace?.toJSON?.();
            f2.close(); d2.close();
          } catch (e) { info.unpremulError = e.message; }
        } catch (e) { info.probeError = e.message; }
      }
      const t0 = performance.now();
      let longest = 0, last = performance.now(); const tick = () => { const n = performance.now(); longest = Math.max(longest, n - last); last = n; if (running) setTimeout(tick, 0); };
      let running = true; setTimeout(tick, 0);
      try { const img = await decodeImageFile(file); info.data = img.data.length <= 256 ? [...img.data] : null; info.hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', img.data))).map(b => b.toString(16).padStart(2, '0')).join(''); }
      catch (e) { info.decodeError = e.message; }
      running = false; info.ms = Math.round(performance.now() - t0); info.longestGapMs = Math.round(longest);
      out[name] = info;
    }
    return out;
  }, names);
}
const crypto = await import('node:crypto');
const sha = a => crypto.createHash('sha256').update(Uint8Array.from(a)).digest('hex');
const report = {};
for (const [label, type, opts] of [['chromium', chromium, { chromiumSandbox: true, executablePath: 'C:/Users/shilo/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' }], ['firefox', firefox, {}], ['webkit', webkit, {}]]) {
  let browser;
  try {
    browser = await type.launch({ headless: true, ...opts });
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5345/');
    const res = await inPage(page, Object.keys(cases));
    report[label] = Object.fromEntries(Object.entries(res).map(([name, info]) => {
      const exp = cases[name].expect, data = info.data;
      let mismatches = null;
      if (data) { mismatches = []; for (let p = 0; p < exp.length; p += 4) { const visible = exp[p + 3] > 0; const same = visible ? [0,1,2,3].every(c => data[p + c] === exp[p + c]) : data[p + 3] === 0; if (!same) mismatches.push({ px: p / 4, expect: exp.slice(p, p + 4), got: data.slice(p, p + 4) }); } }
      else if (info.hash) mismatches = info.hash === sha(exp) ? [] : ['hash mismatch'];
      const managedDiff = info.managed && info.raw ? info.raw.length && (() => { const d = []; for (let p = 0; p < info.managed.length; p += 4) { const rawRgba = info.format === 'BGRA' ? [info.raw[p+2], info.raw[p+1], info.raw[p], info.raw[p+3]] : info.raw.slice(p, p + 4); if (rawRgba.some((v, c) => v !== info.managed[p + c]) && info.managed[p + 3] > 0) d.push({ px: p / 4, raw: rawRgba, managed: info.managed.slice(p, p + 4) }); } return d; })() : null;
      const u = info.unpremulManaged; const unpremulExact = u ? exp.every((v, i) => exp[i - i % 4 + 3] === 0 ? (i % 4 !== 3 || u[i] === 0) : u[i] === v) : info.unpremulHash ? info.unpremulHash === sha(exp) : null;
      return [name, { unpremulExact, unpremulError: info.unpremulError, unpremulSpace: info.unpremulSpace, format: info.format, colorSpace: info.colorSpace, visibleRect: info.visibleRect, hasImageDecoder: info.hasImageDecoder, probeError: info.probeError, decodeError: info.decodeError, exact: mismatches?.length === 0, mismatches: mismatches?.slice(0, 6), rawVsManagedDiff: managedDiff, ms: info.ms, longestGapMs: info.longestGapMs, note: cases[name].note }];
    }));
    report[label].version = browser.version();
  } catch (e) { report[label] = { launchError: e.message.split('\n')[0] }; }
  finally { await browser?.close(); }
}
server.close();
fs.writeFileSync(new URL('./decode-browsers.out.json', import.meta.url), JSON.stringify(report, null, 1));
for (const [b, r] of Object.entries(report)) console.log(b, r.version ?? '', r.launchError ?? Object.entries(r).filter(([k]) => k !== 'version').map(([k, v]) => `${k}:${v.exact ? 'exact' : 'DIFF'}(${v.format ?? '-'};${v.ms}ms;gap${v.longestGapMs})`).join(' '));
