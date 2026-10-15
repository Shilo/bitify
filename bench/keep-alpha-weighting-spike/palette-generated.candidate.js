// RESEARCH ONLY: fixed source hash ff11e62b92853b12c99946f60e9635de734b903702bcbd2b39834b84087e8c58
function makeOpacityMass(mode) {
  if (!['none', 'linear', 'squared'].includes(mode)) throw new Error('Invalid research weighting');
  return Float64Array.from({length:256}, (_, a) => mode === 'none' ? 1 : mode === 'linear' ? a / 255 : (a / 255) ** 2);
}
import { checkCanceled, yieldTask } from '../../src/lib/quantize.js';
import { validateGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { GENERATED_MAX_COLORS } from '../../src/lib/palette-library.js';

const EXACT_LIMIT = 4096, BINS = 32768, MASS = 2 ** 24, COLORS = GENERATED_MAX_COLORS, ITERATIONS = 6;
const linear = Float64Array.from({ length: 256 }, (_, n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
const gamma = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
function toLab(r, g, b, out, at) {
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  out[at] = .2104542553 * l + .793617785 * m - .0040720468 * s;
  out[at + 1] = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
  out[at + 2] = .0259040371 * l + .7827717662 * m - .808675766 * s;
}
const channel = n => Math.round(255 * (n <= .0031308 ? 12.92 * Math.max(0, n) : 1.055 * Math.min(1, n) ** (1 / 2.4) - .055));
function fromLab(l, a, b) {
  const ll = (l + .3963377774 * a + .2158037573 * b) ** 3, mm = (l - .1055613458 * a - .0638541728 * b) ** 3, ss = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  const r = channel(4.0767416621 * ll - 3.3077115913 * mm + .2309699292 * ss), g = channel(-1.2684380046 * ll + 2.6097574011 * mm - .3413193965 * ss), blue = channel(-.0041960863 * ll - .7034186147 * mm + 1.707614701 * ss);
  return r * 65536 + g * 256 + blue;
}
const hex = value => '#' + value.toString(16).padStart(6, '0');
const binOf = rgb => (rgb >>> 19) << 10 | (rgb >>> 11 & 31) << 5 | (rgb >>> 3 & 31);
function distance(values, at, centers, ci) {
  const l = values[at] - centers[ci], a = values[at + 1] - centers[ci + 1], b = values[at + 2] - centers[ci + 2];
  return l * l + a * a + b * b;
}
function safeAdd(values, at, value) {
  const sum = values[at] + value;
  if (!Number.isSafeInteger(sum)) throw new Error('Generated palette source totals exceed the safe precision limit.');
  values[at] = sum;
}
function binAdd(values, rgb, weight) {
  const at = binOf(rgb) * 4; values[at] += weight; values[at + 1] += (rgb >>> 16) * weight; values[at + 2] += (rgb >>> 8 & 255) * weight; values[at + 3] += (rgb & 255) * weight;
}

// Exact RGB summaries are bounded, then collapse to fixed five-bit RGB bins.
// Each nonempty asset contributes exactly 2^24 integer mass units. Canonical
// largest-remainder rounding and integer RGB moments make wall order irrelevant.
export function createGeneratedAccumulator(alphaCut = 128, { signal, alphaWeight = 'none' } = {}) {
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  const opacityMass = makeOpacityMass(alphaWeight);
  checkCanceled(signal);
  let histogram, bins, global = new Map(), globalBins, assetOpen = false, finished = false, nonempty = 0, deadline = performance.now() + 8;
  const pause = async () => { checkCanceled(signal); if (performance.now() >= deadline) { await yieldTask(); checkCanceled(signal); deadline = performance.now() + 8; } };
  const collapseGlobal = () => {
    globalBins = new Float64Array(BINS * 4);
    for (const [rgb, weight] of global) {
      const at = binOf(rgb) * 4; safeAdd(globalBins, at, weight); safeAdd(globalBins, at + 1, (rgb >>> 16) * weight); safeAdd(globalBins, at + 2, (rgb >>> 8 & 255) * weight); safeAdd(globalBins, at + 3, (rgb & 255) * weight);
    }
    global = null;
  };
  return {
    beginAsset() {
      checkCanceled(signal);
      if (assetOpen || finished) throw new Error('Generated palette assets must be added sequentially.');
      histogram = new Map(); bins = null; assetOpen = true;
    },
    async addChunk(data, weight = 1) {
      checkCanceled(signal);
      if (!assetOpen || finished || !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || data.length % 4 || !Number.isFinite(weight) || weight <= 0) throw new Error('Invalid generated palette source chunk.');
      for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] >= alphaCut) {
          const pixelWeight = weight * opacityMass[data[at + 3]];
          const rgb = data[at] * 65536 + data[at + 1] * 256 + data[at + 2];
          if (histogram) {
            const old = histogram.get(rgb);
            if (old !== undefined) histogram.set(rgb, old + pixelWeight);
            else if (histogram.size < EXACT_LIMIT) histogram.set(rgb, pixelWeight);
            else {
              bins = new Float64Array(BINS * 4); for (const [color, count] of histogram) binAdd(bins, color, count); histogram = null;
              binAdd(bins, rgb, pixelWeight);
            }
          } else binAdd(bins, rgb, pixelWeight);
        }
        if ((at & 2047) === 0) await pause();
      }
      await pause();
    },
    async endAsset() {
      checkCanceled(signal); if (!assetOpen || finished) throw new Error('Generated palette has no open asset.');
      const keys = histogram ? [...histogram.keys()].sort((a, b) => a - b) : [];
      if (bins) for (let i = 0; i < BINS; i++) if (bins[i * 4] > 0) keys.push(i);
      if (!keys.length) { histogram = bins = null; assetOpen = false; return; }
      let total = 0; for (const key of keys) total += histogram ? histogram.get(key) : bins[key * 4];
      if (!Number.isFinite(total) || total <= 0) throw new Error('Generated palette source weights exceed the safe precision limit.');
      const units = new Uint32Array(keys.length), fractions = new Float64Array(keys.length); let assigned = 0;
      for (let i = 0; i < keys.length; i++) {
        const raw = (histogram ? histogram.get(keys[i]) : bins[keys[i] * 4]) / total * MASS;
        units[i] = Math.floor(raw); fractions[i] = raw - units[i]; assigned += units[i];
        if ((i & 255) === 0) await pause();
      }
      const order = Array.from({ length: keys.length }, (_, i) => i).sort((a, b) => fractions[b] - fractions[a] || keys[a] - keys[b]);
      for (let i = 0, remaining = MASS - assigned; remaining > 0; i++, remaining--) units[order[i % order.length]]++;
      // Defend the rare floating-total case without wrapping Uint32 mass.
      for (let i = order.length - 1, remaining = assigned - MASS; remaining > 0; i--, remaining--) { if (i < 0) i = order.length - 1; if (units[order[i]]) units[order[i]]--; else remaining++; }
      if (bins && global) collapseGlobal();
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i], mass = units[i];
        if (global) {
          if (!global.has(key) && global.size >= EXACT_LIMIT) collapseGlobal();
          else { const sum = (global.get(key) ?? 0) + mass; if (!Number.isSafeInteger(sum)) throw new Error('Generated palette source totals exceed the safe precision limit.'); global.set(key, sum); }
        }
        if (!global && mass) {
          const bin = bins ? key : binOf(key), at = bin * 4;
          const count = bins ? bins[key * 4] : 1;
          const r = bins ? bins[key * 4 + 1] / count : key >>> 16, g = bins ? bins[key * 4 + 2] / count : key >>> 8 & 255, b = bins ? bins[key * 4 + 3] / count : key & 255;
          safeAdd(globalBins, at, mass); safeAdd(globalBins, at + 1, Math.round(r * mass)); safeAdd(globalBins, at + 2, Math.round(g * mass)); safeAdd(globalBins, at + 3, Math.round(b * mass));
        }
        if ((i & 255) === 0) await pause();
      }
      nonempty++; histogram = bins = null; assetOpen = false;
    },
    async finish() {
      checkCanceled(signal); if (assetOpen || finished) throw new Error('Generated palette needs completed assets.'); finished = true;
      if (!nonempty) return Object.freeze({ colors: Object.freeze([]), binned: false, assets: 0 });
      if (global && global.size <= COLORS) return Object.freeze({ colors: Object.freeze([...global.keys()].sort((a, b) => a - b).map(hex)), binned: false, assets: nonempty });
      const keys = global ? [...global.keys()].filter(key => global.get(key) > 0).sort((a, b) => a - b) : [];
      if (globalBins) for (let i = 0; i < BINS; i++) if (globalBins[i * 4] > 0) keys.push(i);
      const binned = !!globalBins, length = keys.length, vectors = new Float64Array(length * 3), weights = new Float64Array(length), rgb = new Uint32Array(length);
      for (let i = 0; i < length; i++) {
        const key = keys[i], at = key * 4, mass = global ? global.get(key) : globalBins[at];
        const r = global ? key >>> 16 : globalBins[at + 1] / mass, g = global ? key >>> 8 & 255 : globalBins[at + 2] / mass, b = global ? key & 255 : globalBins[at + 3] / mass;
        rgb[i] = Math.round(r) * 65536 + Math.round(g) * 256 + Math.round(b); weights[i] = mass;
        // Bin representatives are RGB means, transformed into the fixed Oklab
        // fitting objective. They approximate within-bin source distributions.
        toLab(gamma(r), gamma(g), gamma(b), vectors, i * 3);
        if ((i & 255) === 0) await pause();
      }
      global = globalBins = null;
      let first = 0; for (let i = 1; i < length; i++) if (weights[i] > weights[first]) first = i;
      let colors = [rgb[first]], nearest = new Float64Array(length).fill(Infinity);
      while (colors.length < Math.min(COLORS, length)) {
        const last = colors.at(-1), center = new Float64Array(3); toLab(linear[last >>> 16], linear[last >>> 8 & 255], linear[last & 255], center, 0);
        let selected = -1, score = 0;
        for (let i = 0; i < length; i++) {
          nearest[i] = Math.min(nearest[i], distance(vectors, i * 3, center, 0));
          const candidate = nearest[i] * weights[i];
          if (!colors.includes(rgb[i]) && candidate > score) { score = candidate; selected = i; }
          if ((i & 255) === 0) await pause();
        }
        if (selected < 0) break; colors.push(rgb[selected]);
      }
      const evaluate = async (palette, refine) => {
        const centers = new Float64Array(palette.length * 3), sums = new Float64Array(palette.length * 4); let cost = 0;
        for (let c = 0; c < palette.length; c++) { const value = palette[c]; toLab(linear[value >>> 16], linear[value >>> 8 & 255], linear[value & 255], centers, c * 3); }
        for (let i = 0; i < length; i++) {
          let winner = 0, best = Infinity;
          for (let c = 0; c < palette.length; c++) { const d = distance(vectors, i * 3, centers, c * 3); if (d < best) { best = d; winner = c; } }
          cost += best * weights[i];
          if (refine) { const at = winner * 4; sums[at] += weights[i]; sums[at + 1] += vectors[i * 3] * weights[i]; sums[at + 2] += vectors[i * 3 + 1] * weights[i]; sums[at + 3] += vectors[i * 3 + 2] * weights[i]; }
          if ((i & 255) === 0) await pause();
        }
        const updated = refine ? [...new Set(palette.map((value, i) => { const at = i * 4, mass = sums[at]; return mass ? fromLab(sums[at + 1] / mass, sums[at + 2] / mass, sums[at + 3] / mass) : value; }))].sort((a, b) => a - b) : palette;
        return { cost, updated };
      };
      colors.sort((a, b) => a - b); let best = colors, bestCost = (await evaluate(colors, false)).cost, initialCost = bestCost;
      for (let pass = 0; pass < ITERATIONS; pass++) {
        const { updated } = await evaluate(colors, true); if (updated.length === colors.length && updated.every((value, i) => value === colors[i])) break;
        const { cost } = await evaluate(updated, false);
        if (cost < bestCost) { best = updated; bestCost = cost; } colors = updated;
      }
      checkCanceled(signal);
      return Object.freeze({ colors: Object.freeze(best.map(hex)), binned, assets: nonempty, cost: bestCost / (nonempty * MASS), initialCost: initialCost / (nonempty * MASS) });
    },
  };
}

export async function generatePaletteAsync(snapshot, { signal, alphaWeight = 'none' } = {}) {
  validateGeneratedSources(snapshot); checkCanceled(signal);
  const accumulator = createGeneratedAccumulator(snapshot.alphaCut, { signal, alphaWeight });
  for (const asset of snapshot.assets) {
    accumulator.beginAsset();
    for (const frame of asset.frames) for (let at = 0; at < frame.data.length; at += 128 * 1024) await accumulator.addChunk(frame.data.subarray(at, Math.min(at + 128 * 1024, frame.data.length)), frame.delay);
    await accumulator.endAsset();
  }
  return accumulator.finish();
}
