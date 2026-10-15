// RESEARCH ONLY: fixed source hash 739a3fb97a80d1ecbfa23c5e33f72893b894adc4425ea89217a88d7264abae20
function makeOpacityMass(mode) {
  if (!['none', 'linear', 'squared'].includes(mode)) throw new Error('Invalid research weighting');
  return Float64Array.from({length:256}, (_, a) => mode === 'none' ? 1 : mode === 'linear' ? a / 255 : (a / 255) ** 2);
}
import { preparePalette, validateMatchingMetric, checkCanceled, yieldTask } from '../../src/lib/quantize.js';

const LIMIT = 4096;
const linear = Float64Array.from({ length: 256 }, (_, n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
function coordinates(r, g, b, metric, out) {
  if (metric === 'rgb') { out[0] = r; out[1] = g; out[2] = b; return; }
  r = linear[r]; g = linear[g]; b = linear[b];
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  out[0] = .2104542553 * l + .7936177850 * m - .0040720468 * s;
  out[1] = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s;
  out[2] = .0259040371 * l + .7827717662 * m - .8086757660 * s;
}
const distance = (v, p, at) => (v[0] - p[at]) ** 2 + (v[1] - p[at + 1]) ** 2 + (v[2] - p[at + 2]) ** 2;
const tolerance = cost => 1e-12 * Math.max(1, cost);

// readChunks() supplies a fresh repeatable async iterator for each source pass.
// Each chunk contains original RGBA and its frame-duration weight. No source
// pixels are retained here; the histogram/distance matrix have fixed bounds.
export async function selectPaletteSubset(colors, maxColors, readChunks, { alphaCut = 128, metric = 'oklab', signal, alphaWeight = 'none' } = {}) {
  const opacityMass = makeOpacityMass(alphaWeight);
  const palette = preparePalette(colors), P = palette.size;
  validateMatchingMetric(metric);
  if (!Number.isInteger(maxColors) || maxColors < 1 || maxColors > 256) throw new Error('Max colors must be between 1 and 256.');
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  checkCanceled(signal);
  let deadline = performance.now() + 8;
  const pause = async () => {
    checkCanceled(signal);
    if (performance.now() < deadline) return;
    await yieldTask(); checkCanceled(signal); deadline = performance.now() + 8;
  };
  const vectors = new Float64Array(P * 3), exact = new Map(), scratch = new Float64Array(3);
  for (let p = 0; p < P; p++) {
    const rgb = parseInt(palette.colors[p].slice(1), 16);
    coordinates(rgb >>> 16, rgb >>> 8 & 255, rgb & 255, metric, scratch);
    vectors.set(scratch, p * 3); exact.set(rgb, p);
  }
  const nearest = (rgb, v) => {
    const anchor = exact.get(rgb); if (anchor !== undefined) return anchor;
    let best = 0, cost = distance(v, vectors, 0);
    for (let p = 1; p < P; p++) { const d = distance(v, vectors, p * 3); if (d < cost) { cost = d; best = p; } }
    return best;
  };
  let histogram = new Map(), bins = null, fullCost = 0;
  const frequency = new Float64Array(P);
  const addBin = (rgb, v, weight) => {
    const bin = (rgb >>> 20) << 8 | (rgb >>> 12 & 15) << 4 | (rgb >>> 4 & 15), at = bin * 4;
    bins[at] += weight; bins[at + 1] += v[0] * weight; bins[at + 2] += v[1] * weight; bins[at + 3] += v[2] * weight;
  };
  for await (const { data, weight } of readChunks()) {
    if (!data || data.length % 4 || !Number.isFinite(weight) || weight <= 0) throw new Error('Invalid palette-limit source chunk.');
    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] >= alphaCut) {
        const pixelWeight = weight * opacityMass[data[at + 3]];
        const rgb = data[at] << 16 | data[at + 1] << 8 | data[at + 2], old = histogram?.get(rgb);
        let winner, cost;
        if (old) { old.weight += pixelWeight; winner = old.winner; cost = old.cost; }
        else {
          coordinates(data[at], data[at + 1], data[at + 2], metric, scratch); winner = nearest(rgb, scratch); cost = distance(scratch, vectors, winner * 3);
          if (histogram) {
            if (histogram.size < LIMIT) histogram.set(rgb, { weight: pixelWeight, winner, cost, vector: [...scratch] });
            else {
              bins = new Float64Array(LIMIT * 4);
              for (const [key, entry] of histogram) addBin(key, entry.vector, entry.weight);
              histogram = null;
            }
          }
          if (bins) addBin(rgb, scratch, pixelWeight);
        }
        // Repeated exact RGBs have the same error. Retain the original per-pixel
        // accumulation order; after binning, original pixels are still measured.
        frequency[winner] += pixelWeight; fullCost += cost * pixelWeight;
      }
      if ((at & 1023) === 0) await pause();
    }
    await pause();
  }
  checkCanceled(signal);
  const winners = [...frequency.keys()].filter(p => frequency[p] > 0), K = Math.min(maxColors, P);
  if (winners.length <= K) return { indices: winners.length ? winners : [0], binned: !!bins, swaps: 0, cost: fullCost, popularCost: fullCost, fullCost, fastPath: winners.length ? 'full-nearest' : 'empty' };
  const popular = [...winners].sort((a, b) => frequency[b] - frequency[a] || a - b).slice(0, K).sort((a, b) => a - b);
  const binned = !!bins;
  const source = histogram ? [...histogram].sort((a, b) => a[0] - b[0]).map(([, entry]) => entry) : [];
  if (bins) for (let bin = 0; bin < LIMIT; bin++) {
    const at = bin * 4, weight = bins[at];
    if (weight) source.push({ weight, vector: [bins[at + 1] / weight, bins[at + 2] / weight, bins[at + 3] / weight] });
  }
  histogram = null; bins = null;
  const U = source.length, weights = Float64Array.from(source, entry => entry.weight), distances = new Float64Array(U * P);
  for (let u = 0; u < U; u++) {
    for (let p = 0; p < P; p++) distances[u * P + p] = distance(source[u].vector, vectors, p * 3);
    if ((u & 15) === 0) await pause();
  }
  const assign = async indices => {
    const first = new Float64Array(U), second = new Float64Array(U), owner = new Uint16Array(U); let cost = 0;
    for (let u = 0; u < U; u++) {
      let best = Infinity, next = Infinity, who = 0;
      for (let j = 0; j < indices.length; j++) {
        const d = distances[u * P + indices[j]];
        if (d < best) { next = best; best = d; who = j; } else if (d < next) next = d;
      }
      first[u] = best; second[u] = next; owner[u] = who; cost += weights[u] * best;
      if ((u & 255) === 0) await pause();
    }
    return { first, second, owner, cost };
  };
  const popularFit = await assign(popular);
  let best = 0, bestCost = Infinity;
  for (let p = 0; p < P; p++) {
    let cost = 0; for (let u = 0; u < U; u++) cost += weights[u] * distances[u * P + p];
    if (cost < bestCost) { best = p; bestCost = cost; } await pause();
  }
  let indices = [best], fit = await assign(indices), selected = new Set(indices);
  while (indices.length < K) {
    let add = -1, cost = fit.cost;
    for (let p = 0; p < P; p++) {
      if (selected.has(p)) continue;
      let candidate = 0; for (let u = 0; u < U; u++) candidate += weights[u] * Math.min(fit.first[u], distances[u * P + p]);
      if (candidate < cost) { cost = candidate; add = p; } await pause();
    }
    if (add < 0) break;
    indices.push(add); indices.sort((a, b) => a - b); selected.add(add); fit = await assign(indices);
  }
  if (popularFit.cost <= fit.cost) { indices = popular; fit = popularFit; selected = new Set(indices); }
  const initialCost = fit.cost, swapTrace = [];
  for (let pass = 0; pass < 8; pass++) {
    let replace = -1, remove = -1, bestDelta = 0;
    const correction = new Float64Array(indices.length);
    for (let p = 0; p < P; p++) {
      if (selected.has(p)) continue;
      correction.fill(0); let base = 0;
      for (let u = 0; u < U; u++) {
        const candidate = distances[u * P + p], withOld = Math.min(candidate, fit.first[u]);
        base += weights[u] * (withOld - fit.first[u]);
        correction[fit.owner[u]] += weights[u] * (Math.min(candidate, fit.second[u]) - withOld);
      }
      for (let j = 0; j < indices.length; j++) if (base + correction[j] < bestDelta) { bestDelta = base + correction[j]; replace = p; remove = j; }
      await pause();
    }
    if (replace < 0 || bestDelta >= -tolerance(fit.cost)) break;
    const nextIndices = indices.filter((_, j) => j !== remove).concat(replace).sort((a, b) => a - b), next = await assign(nextIndices);
    if (next.cost >= fit.cost - tolerance(fit.cost)) break;
    swapTrace.push({ before: fit.cost, after: next.cost }); indices = nextIndices; fit = next; selected = new Set(indices);
  }
  let cost = fit.cost, popularCost = popularFit.cost, verifiedFallback = false;
  if (binned) {
    cost = 0; popularCost = 0;
    for await (const { data, weight } of readChunks()) {
      if (!data || data.length % 4 || !Number.isFinite(weight) || weight <= 0) throw new Error('Invalid palette-limit source chunk.');
      for (let at = 0; at < data.length; at += 4) {
        if (data[at + 3] >= alphaCut) {
        const pixelWeight = weight * opacityMass[data[at + 3]];
          coordinates(data[at], data[at + 1], data[at + 2], metric, scratch);
          let fitted = Infinity, baseline = Infinity;
          for (const p of indices) fitted = Math.min(fitted, distance(scratch, vectors, p * 3));
          for (const p of popular) baseline = Math.min(baseline, distance(scratch, vectors, p * 3));
          cost += fitted * pixelWeight; popularCost += baseline * pixelWeight;
        }
        if ((at & 1023) === 0) await pause();
      }
      await pause();
    }
    if (popularCost <= cost) { indices = popular; cost = popularCost; verifiedFallback = true; }
  }
  checkCanceled(signal);
  return { indices, binned, histogramColors: U, cost, popularCost, fullCost, initialCost, trainingCost: fit.cost, verifiedFallback, swaps: swapTrace.length, swapTrace };
}
