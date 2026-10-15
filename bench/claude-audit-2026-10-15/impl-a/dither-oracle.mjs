// Independent oracle for full-palette ordered dithering, Keep/Cut alpha and sampling.
// Written from the spec text (docs/superpowers/specs/... "Full palette ordered dithering"),
// not by calling the module for expected values. Run: node bench/claude-audit-2026-10-15/impl-a/dither-oracle.mjs
import { quantize, quantizeAsync, preparePalette, colorize, EMPTY_INDEX } from '../../../src/lib/quantize.js';

let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const ri = n => Math.floor(rand() * n);

// --- independent color math ---
const lin = n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
function oklab(r, g, b) {
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

// Standard recursive Bayer: B_2n = [[4B, 4B+2], [4B+3, 4B+1]] (top-level quadrant adds the small offset).
function bayer(side) {
  if (side === 1) return [[0]];
  const half = bayer(side / 2), out = [];
  const D = [[0, 2], [3, 1]];
  for (let y = 0; y < side; y++) { out.push([]); for (let x = 0; x < side; x++) out[y].push(4 * half[y % (side / 2)][x % (side / 2)] + D[Math.floor(y / (side / 2))][Math.floor(x / (side / 2))]); }
  return out;
}

function makePalette(colors) {
  return colors.map(h => { const v = parseInt(h.slice(1), 16); const rgb = [v >>> 16, v >>> 8 & 255, v & 255]; const L = rgb.map(lin); return { v, rgb, L, lab: oklab(...L) }; });
}

function nearestOracle(pal, rgb, metric) {
  const key = rgb[0] << 16 | rgb[1] << 8 | rgb[2];
  const exact = pal.findIndex(p => p.v === key);
  if (exact >= 0) return exact;
  const src = oklab(...rgb.map(lin));
  let best = Infinity, idx = 0;
  pal.forEach((p, i) => { const d = metric === 'rgb' ? d2(rgb, p.rgb) : d2(src, p.lab); if (d < best) { best = d; idx = i; } });
  return idx;
}

// Spec: 4 nearest by metric; anchor nearest; target = anchor + (src - anchor)*s in linear light;
// score Oklab tone error + 0.03 * expected point distortion; pairs at up to three occupancies.
function ditherOracle(pal, rgb, x, y, side, ranks, strength, metric) {
  const key = rgb[0] << 16 | rgb[1] << 8 | rgb[2];
  const exact = pal.findIndex(p => p.v === key);
  if (exact >= 0) return exact;
  const S = rgb.map(lin), src = oklab(...S);
  const order = pal.map((p, i) => ({ i, d: metric === 'rgb' ? d2(rgb, p.rgb) : d2(src, p.lab) }))
    .sort((a, b) => a.d - b.d || a.i - b.i).slice(0, 4).map(o => o.i);
  const cells = side * side, s = strength / 100, A = pal[order[0]].L;
  const T = [0, 1, 2].map(c => A[c] + (S[c] - A[c]) * s), tlab = oklab(...T);
  const pe = order.map(i => d2(src, pal[i].lab));
  let best = d2(tlab, pal[order[0]].lab) + .03 * pe[0], plan = { a: order[0], b: order[0], w: 0 };
  for (let a = 0; a < order.length - 1; a++) for (let b = a + 1; b < order.length; b++) {
    const La = pal[order[a]].L, Lb = pal[order[b]].L, D = [0, 1, 2].map(c => Lb[c] - La[c]);
    const len = D[0] ** 2 + D[1] ** 2 + D[2] ** 2;
    const proj = ((T[0] - La[0]) * D[0] + (T[1] - La[1]) * D[1] + (T[2] - La[2]) * D[2]) / len;
    const mid = Math.max(1, Math.min(cells - 1, Math.round(proj * cells)));
    for (let w = Math.max(1, mid - 1); w <= Math.min(cells - 1, mid + 1); w++) {
      const t = w / cells, mix = oklab(La[0] + t * D[0], La[1] + t * D[1], La[2] + t * D[2]);
      const e = d2(tlab, mix) + .03 * (pe[a] * (1 - t) + pe[b] * t);
      if (e < best) { best = e; plan = { a: order[a], b: order[b], w }; }
    }
  }
  return ranks[y % side][x % side] < plan.w ? plan.b : plan.a;
}

function randomPalette(n, extra = []) {
  const set = new Set(extra.map(h => h.toLowerCase()));
  while (set.size < n) set.add('#' + ri(0x1000000).toString(16).padStart(6, '0'));
  return [...set].slice(0, n);
}
function makeImage(w, h, kind, palColors) {
  const data = new Uint8ClampedArray(w * h * 4), alphas = [0, 1, 127, 128, 254, 255];
  const sprite = Array.from({ length: 6 }, () => [ri(256), ri(256), ri(256)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    let c;
    if (kind === 'noise') c = [ri(256), ri(256), ri(256)];
    else if (kind === 'ramp') { const v = Math.round(x * 255 / Math.max(1, w - 1)); c = [v, (v + y * 3) & 255, 255 - v]; }
    else if (kind === 'sprite') c = sprite[(x >> 2) + (y >> 2) & 3];
    else c = [ri(256), ri(256), ri(256)];
    if (palColors && ri(8) === 0) { const v = parseInt(palColors[ri(palColors.length)].slice(1), 16); c = [v >>> 16, v >>> 8 & 255, v & 255]; }
    data.set(c, p); data[p + 3] = ri(3) ? 255 : alphas[ri(alphas.length)];
  }
  return { width: w, height: h, data };
}

const report = { cases: 0, pixels: 0, failures: [] };
const fail = (what, info) => { if (report.failures.length < 60) report.failures.push({ what, ...info }); };

// 1. Bayer phase: uniform gray on 2 colors with full strength reveals rank order exactly.
for (const side of [2, 4, 8]) {
  const B = bayer(side), ranks = B;
  // grays covering every occupancy
  const pal = ['#000000', '#ffffff'], P = makePalette(pal);
  for (let g = 1; g < 255; g += 7) {
    const w = side * 3, h = side * 2, img = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(255) };
    for (let i = 0; i < w * h; i++) img.data.set([g, g, g], i * 4);
    const r = quantize(img, pal, 128, undefined, undefined, { dither: `${side}x${side}`, ditherStrength: 100 });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const exp = ditherOracle(P, [g, g, g], x, y, side, ranks, 100, 'oklab');
      report.pixels++;
      if (r.indices[y * w + x] !== exp) fail('bayer-gray', { side, g, x, y, got: r.indices[y * w + x], exp });
    }
  }
}

// 2. Randomized oracle sweep.
const sizes = [1, 2, 3, 4, 5, 8, 16, 64, 255, 256];
for (const n of sizes) for (const kind of ['noise', 'ramp', 'sprite']) for (const metric of ['oklab', 'rgb']) {
  const colors = randomPalette(n, n >= 2 ? ['#000000', '#ffffff'] : []);
  const P = makePalette(preparePalette(colors).colors);
  const w = 3 + ri(40), h = 3 + ri(30), img = makeImage(w, h, kind, colors);
  for (const mode of ['none', '2x2', '4x4', '8x8']) for (const strength of [0, 1, 50, 99, 100]) for (const alphaMode of ['cut', 'keep']) {
    const cut = [1, 128, 255][ri(3)];
    const r = quantize(img, colors, cut, undefined, undefined, { metric, dither: mode, ditherStrength: strength, alphaMode });
    report.cases++;
    const eff = alphaMode === 'keep' ? 1 : cut, side = mode === 'none' ? 0 : Number(mode[0]), ranks = side ? bayer(side) : null;
    const used = new Uint8Array(256); let transparent = false;
    if ((alphaMode === 'keep') !== !!r.alpha) fail('alpha-buffer-presence', { n, alphaMode });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = y * w + x, p = o * 4, rgb = [img.data[p], img.data[p + 1], img.data[p + 2]], a = img.data[p + 3];
      report.pixels++;
      if (a < eff) {
        transparent = true;
        if (r.indices[o] !== EMPTY_INDEX) fail('alpha-empty', { n, x, y, a, eff, got: r.indices[o] });
        if (r.alpha && r.alpha[o] !== 0) fail('alpha-empty-byte', { n, a });
        continue;
      }
      const exp = side && strength > 0 && n > 1 ? ditherOracle(P, rgb, x, y, side, ranks, strength, metric) : nearestOracle(P, rgb, metric);
      used[exp] = 1;
      if (r.indices[o] !== exp) fail('index', { n, kind, metric, mode, strength, alphaMode, x, y, rgb, got: r.indices[o], exp });
      if (r.alpha && r.alpha[o] !== a) fail('keep-alpha', { n, a, got: r.alpha[o] });
    }
    for (let i = 0; i < 256; i++) if (used[i] !== r.used[i]) { fail('used', { n, i }); break; }
    if (transparent !== r.hasTransparency) fail('hasTransparency', { n });
    // colorize alpha
    const out = colorize(r, colors);
    for (let o = 0; o < w * h; o++) {
      const ea = r.indices[o] === EMPTY_INDEX ? 0 : r.alpha ? img.data[o * 4 + 3] : 255;
      if (out.data[o * 4 + 3] !== ea) { fail('colorize-alpha', { o, got: out.data[o * 4 + 3], ea }); break; }
    }
    // Sampled preview == full export sampled at independently computed coordinates.
    for (const [mw, mh] of [[1, 1], [Math.max(1, w - 1), Math.max(1, h - 1)], [Math.ceil(w / 3), Math.ceil(h / 2)], [w, Math.max(1, h >> 1)]]) {
      const s = quantize(img, colors, cut, mw, mh, { metric, dither: mode, ditherStrength: strength, alphaMode });
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        const sx = Math.floor((x + .5) * w / mw), sy = Math.floor((y + .5) * h / mh);
        if (s.indices[y * mw + x] !== r.indices[sy * w + sx] || (r.alpha && s.alpha[y * mw + x] !== r.alpha[sy * w + sx])) { fail('sample-agreement', { n, mode, w, h, mw, mh, x, y }); break; }
      }
    }
  }
}

// 3. Async (small chunks, posted yields) equals sync on a memo-bypassing photo.
{
  const colors = randomPalette(64), img = makeImage(301, 199, 'noise', colors);
  for (const mode of ['2x2', '8x8']) for (const alphaMode of ['cut', 'keep']) {
    const a = quantize(img, colors, 128, undefined, undefined, { dither: mode, ditherStrength: 77, alphaMode });
    const b = await quantizeAsync(img, colors, 128, undefined, undefined, { dither: mode, ditherStrength: 77, alphaMode, chunkPixels: 128 });
    report.cases++;
    if (!a.indices.every((v, i) => v === b.indices[i])) fail('async-sync', { mode, alphaMode });
    if (a.alpha && !a.alpha.every((v, i) => v === b.alpha[i])) fail('async-sync-alpha', { mode });
  }
}

// 4. Huge/odd dimensions: 4097x3 and 3x4097 sampled to 7x1/1x7.
for (const [w, h, mw, mh] of [[4097, 3, 7, 1], [3, 4097, 1, 7], [8191, 2, 8190, 2]]) {
  const colors = ['#000000', '#555555', '#aaaaaa', '#ffffff'], img = makeImage(w, h, 'ramp');
  const full = quantize(img, colors, 128, undefined, undefined, { dither: '8x8', ditherStrength: 100, alphaMode: 'keep' });
  const s = quantize(img, colors, 128, mw, mh, { dither: '8x8', ditherStrength: 100, alphaMode: 'keep' });
  report.cases++;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const sx = Math.floor((x + .5) * w / mw), sy = Math.floor((y + .5) * h / mh);
    if (s.indices[y * mw + x] !== full.indices[sy * w + sx]) fail('huge-sample', { w, h, mw, mh, x, y });
  }
}

report.failureCount = report.failures.length;
console.log(JSON.stringify(report, null, 1));
