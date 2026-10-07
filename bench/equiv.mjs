// The rewritten conversion must give byte-identical results to the old one.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const O = await import(pathToFileURL(import.meta.dirname + '/bitify.old.js'));
const N = await import(pathToFileURL(import.meta.dirname + '/../src/lib/bitify.js'));
const STYLES = ['cutout', 'solid', 'lines', 'silhouette', 'checker', 'hatch', 'bayer', 'noise', 'atkinson'];
let s = 99;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
let checks = 0;
for (let n = 0; n < 400; n++) {
  const w = 1 + Math.floor(rnd() * 40), h = 1 + Math.floor(rnd() * 40), data = new Uint8ClampedArray(w * h * 4);
  const kind = n % 4, levels = [2, 4, 16, 256][n % 4 >> 0], alpha = n % 3;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const q = v => Math.floor(Math.floor(v * levels) * (255 / (levels - 1 || 1)));
    const base = kind === 0 ? rnd() : kind === 1 ? ((x >> 2) + (y >> 2)) % 3 / 2 : kind === 2 ? x / w : (Math.sin(x / 3) * Math.cos(y / 4) + 1) / 2;
    data[i] = q(base); data[i + 1] = q(rnd() < 0.3 ? rnd() : base); data[i + 2] = q(rnd() < 0.1 ? rnd() : base);
    data[i + 3] = alpha === 0 ? 255 : alpha === 1 ? (rnd() < 0.2 ? 0 : 255) : (Math.hypot(x - w / 2, y - h / 2) > Math.min(w, h) / 2.2 ? rnd() * 200 : 255);
  }
  const src = { width: w, height: h, data }, a = O.analyze(src), b = N.analyze(src);
  for (const f of ['w', 'h', 'hasAlpha', 'lo', 'hi', 'auto', 'autoLine', 'autoTone', 'autoSeam']) assert.equal(b[f], a[f], f);
  assert.deepEqual([...b.lum], [...a.lum]); assert.deepEqual(b.hist, a.hist); assert.deepEqual(b.edges, a.edges);
  for (const st of STYLES) for (const t of [null, 1, 60, 128, 200, 254]) {
    const ma = O.mask(a, st, t), mb = N.mask(b, st, t);
    assert.deepEqual([...mb], [...ma], `${st} t=${t} ${w}x${h} n=${n}`);
    // A smaller picture: in these four styles each of its pixels is the full mask's at the image pixel under its middle.
    // (The patterns and Atkinson are drawn afresh on the picture's pixels, so they are not.)
    for (const [mw, mh] of ['cutout', 'lines', 'solid', 'silhouette'].includes(st) ? [[w, h], [Math.ceil(w / 2), Math.ceil(h / 2)], [Math.ceil(w / 3), Math.ceil(h / 1.7)], [1, 1], [Math.max(1, w - 1), Math.max(1, h - 1)]] : []) {
      const want = [];
      for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) want.push(ma[Math.floor((j + 0.5) * h / mh) * w + Math.floor((i + 0.5) * w / mw)]);
      assert.deepEqual([...N.mask(b, st, t, mw, mh)], want, `${st} t=${t} ${mw}x${mh}`);
    }
    checks++;
  }
  const m = O.mask(a, 'cutout');
  assert.deepEqual([...N.colorize(m, '#12ab9f', '#fe0180')], [...O.colorize(m, '#12ab9f', '#fe0180')]);
  const sw = Math.ceil(w / 3), shh = Math.ceil(h / 2), sh = N.shrink(src, sw, shh), want = [];
  for (let j = 0; j < shh; j++) for (let i = 0; i < sw; i++) { const at = (Math.floor((j + 0.5) * h / shh) * w + Math.floor((i + 0.5) * w / sw)) * 4; want.push(...data.subarray(at, at + 4)); }
  assert.deepEqual([...sh], want);
}
// animations: unify
const fr = [0, 1, 2].map(j => ({ width: 9, height: 7, data: Uint8ClampedArray.from({ length: 9 * 7 * 4 }, (_, i) => (i % 4 === 3 ? 255 : (i * (j + 3) * 37) % 256)) }));
const ua = O.unify(fr.map(O.analyze)), ub = N.unify(fr.map(N.analyze));
for (const f of ['auto', 'autoLine', 'autoTone', 'autoSeam', 'lo', 'hi']) assert.equal(ub[0][f], ua[0][f]);
console.log(`identical: ${checks} image/style/threshold combinations, each also as 5 smaller pictures`);
