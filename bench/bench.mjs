// node bench.mjs [path-to-bitify.js] [path-to-save.js]
import { pathToFileURL } from 'node:url';
const root = import.meta.dirname + '/../src/lib/';
const B = await import(pathToFileURL(process.argv[2] ?? root + 'bitify.js'));
const S = await import(pathToFileURL(process.argv[3] ?? root + 'save.js'));

// A photo-like image: smooth blobs, hard-edged shapes and grain. `alpha` cuts a round sprite out of it.
export function photo(w, h, alpha) {
  const data = new Uint8ClampedArray(w * h * 4);
  let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const u = x / w, v = y / h;
    const blob = Math.sin(u * 9) * Math.cos(v * 7) * 60 + 128;
    const shape = ((x >> 6) + (y >> 6)) % 3 === 0 ? 50 : 0;
    const g = (rnd() - 0.5) * 30;
    data[i] = blob + shape + g; data[i + 1] = blob * 0.8 + g + v * 60; data[i + 2] = 200 * u + g;
    data[i + 3] = alpha && Math.hypot(u - 0.5, v - 0.5) > 0.45 ? 0 : 255;
  }
  return { width: w, height: h, data };
}

const time = (fn, runs = 3) => {
  let best = Infinity, out;
  for (let i = 0; i < runs; i++) { const t = performance.now(); out = fn(); best = Math.min(best, performance.now() - t); }
  return [best, out];
};
const STYLES = ['cutout', 'solid', 'lines', 'silhouette', 'checker', 'hatch', 'bayer', 'noise', 'atkinson'];
const sizes = [[512, 512], [2048, 2048], [4000, 3000]];
const rows = {};
for (const [w, h] of sizes) for (const alpha of [false, true]) {
  const key = `${w}x${h}${alpha ? ' sprite' : ''}`, src = photo(w, h, alpha), row = (rows[key] = {});
  const [ta, img] = time(() => B.analyze(src));
  row.analyze = ta;
  let m;
  for (const st of STYLES) { const [t, mm] = time(() => B.mask(img, st)); row[st] = t; m = mm; }
  const [tm] = time(() => B.mask(img, 'cutout', 100)); row['cutout t=100'] = tm;
  const [tc, px] = time(() => B.colorize(m, '#112233', '#eeddcc')); row.colorize = tc;
  if (w <= 2048 || !alpha) { const [tp] = time(() => (S.pngBytes.length && px.length && m ? S.pngBytes({ mask: m, pixels: px, w, h, first: '#112233', second: '#eeddcc' }) : 0), 1); row.png = tp; }
}
const cols = Object.keys(Object.values(rows)[0]);
console.log(['size', ...cols].join('\t'));
for (const [k, r] of Object.entries(rows)) console.log([k, ...cols.map(c => (r[c] === undefined ? '-' : r[c].toFixed(1)))].join('\t'));
