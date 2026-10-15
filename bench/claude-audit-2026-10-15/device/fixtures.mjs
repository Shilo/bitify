// Owned audit fixtures. Small ones are written beside this script (committable);
// multi-MB perf inputs go to .tmp/device/fixtures. Encoded with Sharp/omggif, not app code.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
const sharp = require('sharp');
const omggif = (await import('omggif')).default;

const small = new URL('./fixtures/', import.meta.url), big = new URL('../../../.tmp/device/fixtures/', import.meta.url);
mkdirSync(small, { recursive: true }); mkdirSync(big, { recursive: true });
const rng = seed => () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const png = (w, h, data) => sharp(Buffer.from(data.buffer, data.byteOffset, data.length), { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 6 }).toBuffer();
const sha = b => createHash('sha256').update(b).digest('hex');
const out = {};
async function put(dir, name, bytes) { writeFileSync(new URL(name, dir), bytes); out[name] = { bytes: bytes.length, sha256: sha(bytes), dir: dir === small ? 'bench' : '.tmp' }; }

// 1. Alpha sprite 24x24: eight alpha bands x varied RGB, exact ENDESGA 8 members, near neighbours.
const EDG8 = ['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33'];
{
  const w = 24, h = 24, d = new Uint8Array(w * h * 4), alphas = [0, 1, 64, 127, 128, 192, 254, 255];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    d[p] = (x * 11 + y * 3) & 255; d[p + 1] = (x * 5 + y * 13) & 255; d[p + 2] = (200 - x * 7 + y * 2) & 255;
    d[p + 3] = alphas[Math.floor(y / 3)];
    if (x < 8 && y % 3 === 1) { const c = EDG8[x]; d[p] = parseInt(c.slice(1, 3), 16); d[p + 1] = parseInt(c.slice(3, 5), 16); d[p + 2] = parseInt(c.slice(5, 7), 16); }
    if (x >= 8 && x < 16 && y % 3 === 2) { const c = EDG8[x - 8]; d[p] = parseInt(c.slice(1, 3), 16) ^ 1; d[p + 1] = parseInt(c.slice(3, 5), 16); d[p + 2] = parseInt(c.slice(5, 7), 16) ^ 2; }
    if (!d[p + 3]) d[p] = d[p + 1] = d[p + 2] = 0;
  }
  await put(small, 'alpha-sprite.png', await png(w, h, d));
}
// 2. Opaque ramp 128x32: gray ramp, saturated hue ramp, two-tone region (dither phase).
{
  const w = 128, h = 32, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, v = Math.round(x * 255 / 127);
    if (y < 11) d.set([v, v, v, 255], p);
    else if (y < 22) d.set([v, 255 - v, (v * 3) & 255, 255], p);
    else d.set([v, Math.round(v * .6), 40, 255], p);
  }
  await put(small, 'ramp.png', await png(w, h, d));
}
// 3. Four-frame GIF 48x48 with transparency, static background and a moving block.
function gif(w, h, frames, delays, seed, entropy) {
  const r = rng(seed), table = Array.from({ length: 256 }, (_, i) => i === 255 ? 0 : (r() & 0xffffff));
  const buf = Buffer.alloc(w * h * frames * 2 + 100000), writer = new omggif.GifWriter(buf, w, h, { palette: table, loop: 0 });
  for (let f = 0; f < frames; f++) {
    const idx = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      idx[i] = entropy ? (r() % 255) : (x < 2 || y < 2 ? 255 : ((x >> 3) + (y >> 3) * 6) % 64);
      if (!entropy && x >= 8 + f * 8 && x < 16 + f * 8 && y >= 20 && y < 28) idx[i] = 200;
    }
    writer.addFrame(0, 0, w, h, idx, { delay: delays[f % delays.length], transparent: 255, disposal: 2 });
  }
  return buf.subarray(0, writer.end());
}
await put(small, 'walk.gif', gif(48, 48, 4, [10, 20, 10, 30], 0x2468ace1, false));
// Perf inputs.
for (const [name, side, alphaCycle] of [['hi256.png', 256, false], ['hi1024.png', 1024, false], ['hi1024-alpha.png', 1024, true]]) {
  const r = rng(0x1b51ca92), d = new Uint8Array(side * side * 4), cyc = [0, 1, 127, 128, 254, 255];
  for (let p = 0; p < d.length; p += 4) { const n = r(); d[p] = n & 255; d[p + 1] = (n >>> 8) & 255; d[p + 2] = (n >>> 16) & 255; d[p + 3] = alphaCycle ? cyc[(p / 4) % 6] : 255; if (!d[p + 3]) d[p] = d[p + 1] = d[p + 2] = 0; }
  await put(big, name, await png(side, side, d));
}
for (let k = 0; k < 6; k++) await put(big, `wall${k}.gif`, gif(128, 128, 12, [8, 8, 8, 8], 0x9e3779b1 + k * 7919, true));
writeFileSync(new URL('fixtures.json', small), JSON.stringify(out, null, 2) + '\n');
console.log(out);
