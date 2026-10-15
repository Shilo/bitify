// RESEARCH ONLY. No production imports, workers, source copies or service calls.
// The caller supplies the CURRENT Auto64 -> per-asset/full-GIF subset unchanged.
// Centroids explore new RGBs (a target-identity change); subset-swaps may only use
// the original shared Auto palette. Guards compare against the ORIGINAL subset.
const linear = Float64Array.from({ length: 256 }, (_, n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
const hex = rgb => '#' + rgb.toString(16).padStart(6, '0');
const rgbOf = color => parseInt(color.slice(1), 16);
const squared = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
export function colorCoordinates(rgb, metric = 'oklab') {
  const r = rgb >>> 16, g = rgb >>> 8 & 255, b = rgb & 255;
  if (metric === 'rgb') return [r, g, b];
  const l = Math.cbrt(.4122214708 * linear[r] + .5363325363 * linear[g] + .0514459929 * linear[b]);
  const m = Math.cbrt(.2119034982 * linear[r] + .6806995451 * linear[g] + .1073969566 * linear[b]);
  const s = Math.cbrt(.0883024619 * linear[r] + .2817188376 * linear[g] + .6299787005 * linear[b]);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function encodedChannel(v) { return Math.max(0, Math.min(255, Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)))); }
function integerRgb(vector, metric) {
  if (metric === 'rgb') return vector.map(v => Math.max(0, Math.min(255, Math.round(v)))).reduce((n, v) => n * 256 + v, 0);
  const [l, a, b] = vector;
  const ll = (l + .3963377774 * a + .2158037573 * b) ** 3, mm = (l - .1055613458 * a - .0638541728 * b) ** 3, ss = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  return encodedChannel(4.0767416621 * ll - 3.3077115913 * mm + .2309699292 * ss) * 65536 + encodedChannel(-1.2684380046 * ll + 2.6097574011 * mm - .3413193965 * ss) * 256 + encodedChannel(-.0041960863 * ll - .7034186147 * mm + 1.707614701 * ss);
}
function validatedColors(colors, max = 64) {
  if (!Array.isArray(colors) || !colors.length || colors.length > max || colors.some(c => typeof c !== 'string' || c.length !== 7 || !/^#[\da-f]{6}$/i.test(c))) throw new Error('Expected 1–' + max + ' opaque HEX colors.');
  const normalized = colors.map(c => c.toLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error('Research palette must have unique colors.');
  return normalized;
}
function canceled(signal) { if (signal?.aborted) throw new DOMException('Refinement canceled.', 'AbortError'); }
function scheduler(signal) {
  let deadline = performance.now() + 8;
  return async () => {
    canceled(signal);
    if (performance.now() < deadline) return;
    await new Promise(resolve => {
      if (typeof MessageChannel === 'undefined') return setTimeout(resolve, 0);
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); };
      channel.port2.postMessage(null);
    });
    canceled(signal); deadline = performance.now() + 8;
  };
}
function sourceFrames(item) {
  const frames = item.frames ?? [{ original: item.original, delay: 1 }];
  if (!Array.isArray(frames) || !frames.length) throw new Error('Missing research source frames.');
  return frames.map(frame => {
    const source = frame.original, width = source?.width ?? source?.w, height = source?.height ?? source?.h;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !source.data || source.data.length !== width * height * 4) throw new Error('Invalid research source dimensions.');
    return { data: source.data, delay: item.frames ? Number.isFinite(frame.delay) && frame.delay > 0 ? frame.delay : 100 : 1 };
  });
}
async function summarize(item, cut, maxUnique, pause) {
  const histogram = new Map(); let mass = 0, pixels = 0, overflow = false;
  for (const frame of sourceFrames(item)) {
    for (let p = 0; p < frame.data.length; p += 4) {
      if (frame.data[p + 3] >= cut) {
        mass += frame.delay; pixels++;
        const rgb = frame.data[p] * 65536 + frame.data[p + 1] * 256 + frame.data[p + 2];
        const old = histogram.get(rgb);
        if (old) { old.mass += frame.delay; old.pixels++; }
        else if (histogram.size < maxUnique) histogram.set(rgb, { rgb, mass: frame.delay, pixels: 1 });
        else overflow = true;
      }
      if ((p & 2047) === 0) await pause();
    }
  }
  return { records: [...histogram.values()].sort((a, b) => a.rgb - b.rgb), mass, pixels, overflow };
}
async function evaluate(colors, source, baseline, shared, pause) {
  const vectors = colors.map(c => colorCoordinates(rgbOf(c), source.metric)), errors = new Float64Array(source.records.length), owners = new Uint16Array(source.records.length);
  let cost = 0, worsenedRgb = 0, worsenedMass = 0, rareWorsenedRgb = 0, maxPositiveDelta = 0, changedMappingRgb = 0, changedMappingPixels = 0, exactSourceChangedPixels = 0;
  for (let u = 0; u < source.records.length; u++) {
    const entry = source.records[u]; let winner = 0, best = Infinity;
    for (let c = 0; c < colors.length; c++) { const d = squared(entry.vector, vectors[c]); if (d < best) { best = d; winner = c; } }
    errors[u] = best; owners[u] = winner; cost += entry.mass * best;
    if (baseline) {
      const delta = best - baseline.errors[u];
      if (delta > 0) { worsenedRgb++; worsenedMass += entry.mass; maxPositiveDelta = Math.max(maxPositiveDelta, delta); if (entry.mass / source.mass <= .01) rareWorsenedRgb++; }
      if (colors[winner] !== baseline.colors[baseline.owners[u]]) { changedMappingRgb++; changedMappingPixels += entry.pixels; if (baseline.errors[u] === 0) exactSourceChangedPixels += entry.pixels; }
    }
    if ((u & 255) === 0) await pause();
  }
  const exactBaselineColorsLost = baseline ? baseline.colors.filter(c => source.rgbSet.has(rgbOf(c)) && !colors.includes(c)).length : 0;
  return { colors: [...colors], errors, owners, cost, stats: { pointError: source.overflow ? null : source.mass ? cost / source.mass : 0, objectiveComplete: !source.overflow, worsenedRgb, worsenedMass, rareWorsenedRgb, maxPositiveDelta, changedMappingRgb, changedMappingPixels, exactSourceChangedPixels, exactBaselineColorsLost, newColorsOutsideSharedTarget: shared ? colors.filter(c => !shared.has(c)).length : null } };
}
function eligible(fit, baseline, guard) {
  // Ignore aggregate floating noise; this does NOT relax a per-RGB veto. Strict
  // rejects every positive source-color delta, however small that delta is.
  if (!(baseline.stats.pointError - fit.stats.pointError > 1e-12 * Math.max(1, baseline.stats.pointError))) return false;
  if (guard === 'strict') return fit.stats.worsenedRgb === 0 && fit.stats.exactBaselineColorsLost === 0;
  if (guard === 'rare') return fit.stats.rareWorsenedRgb === 0 && fit.stats.exactBaselineColorsLost === 0;
  return true;
}
const compact = fit => ({ colors: [...fit.colors], stats: { ...fit.stats } });

export async function refineAutoSubset(baselineColors, item, { metric = 'oklab', alphaCut = 128, alphaMode = 'cut', guard = 'strict', method = 'centroid', sharedColors, maxPasses = 6, maxUnique = 16384, signal } = {}) {
  const started = performance.now(), pause = scheduler(signal);
  canceled(signal);
  baselineColors = validatedColors(baselineColors);
  if (!['oklab', 'rgb'].includes(metric) || !['cut', 'keep'].includes(alphaMode) || !['mean', 'strict', 'rare'].includes(guard) || !['centroid', 'subset-swaps'].includes(method) || !Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255 || !Number.isInteger(maxPasses) || maxPasses < 0 || maxPasses > 8 || !Number.isInteger(maxUnique) || maxUnique < 1 || maxUnique > 16384) throw new Error('Invalid refinement research options.');
  const target = sharedColors ? validatedColors(sharedColors) : undefined, shared = target ? new Set(target) : undefined;
  if (method === 'subset-swaps' && (!shared || baselineColors.some(c => !shared.has(c)))) throw new Error('Subset swaps require the unchanged shared Auto target.');
  const source = await summarize(item, alphaMode === 'keep' ? 1 : alphaCut, maxUnique, pause);
  source.metric = metric; source.rgbSet = new Set(source.records.map(r => r.rgb));
  for (let u = 0; u < source.records.length; u++) { source.records[u].vector = colorCoordinates(source.records[u].rgb, metric); if ((u & 255) === 0) await pause(); }
  const histogramMs = performance.now() - started, baseline = await evaluate(baselineColors, source, null, shared, pause);
  const best = { mean: baseline, strict: baseline, rare: baseline }, passes = [];
  let current = baseline, reason = source.overflow ? 'Exact source RGB bound exceeded; baseline retained without approximate guard.' : source.mass ? 'No admissible improving candidate.' : 'No visible source pixels.';
  let matrixBytes = 0;
  if (!source.overflow && source.mass && maxPasses) {
    if (method === 'centroid') {
      for (let pass = 0; pass < maxPasses; pass++) {
        const sums = Array.from({ length: current.colors.length }, () => [0, 0, 0, 0]);
        for (let u = 0; u < source.records.length; u++) {
          const entry = source.records[u], sum = sums[current.owners[u]];
          sum[0] += entry.mass; for (let c = 0; c < 3; c++) sum[c + 1] += entry.vector[c] * entry.mass;
          if ((u & 255) === 0) await pause();
        }
        const next = current.colors.map((color, c) => sums[c][0] ? hex(integerRgb(sums[c].slice(1).map(v => v / sums[c][0]), metric)) : color);
        if (next.every((color, c) => color === current.colors[c])) break;
        if (new Set(next).size !== next.length) { reason = 'Integer centroid collision; stop before reducing palette cardinality.'; break; }
        current = await evaluate(next, source, baseline, shared, pause);
        passes.push({ pass: pass + 1, ...compact(current) });
        for (const policy of Object.keys(best)) if (eligible(current, baseline, policy) && current.cost < best[policy].cost) best[policy] = current;
      }
    } else {
      // Exact-source nearest/second-nearest swap deltas, retaining published RGBs.
      const U = source.records.length, P = target.length, matrix = new Float64Array(U * P), targetVectors = target.map(c => colorCoordinates(rgbOf(c), metric)); matrixBytes = matrix.byteLength;
      for (let u = 0; u < U; u++) { for (let p = 0; p < P; p++) matrix[u * P + p] = squared(source.records[u].vector, targetVectors[p]); if ((u & 63) === 0) await pause(); }
      // Each guard follows its own admissible swap path; all vetoes still use the
      // original baseline. Evaluating a full candidate before acceptance catches
      // accumulation-order differences in a fast delta proposal.
      for (const policy of Object.keys(best)) for (let pass = 0; pass < maxPasses; pass++) {
        const fit = best[policy], ids = fit.colors.map(c => target.indexOf(c)), selected = new Set(ids), second = new Float64Array(U);
        for (let u = 0; u < U; u++) { let d = Infinity; for (let j = 0; j < ids.length; j++) if (j !== fit.owners[u]) d = Math.min(d, matrix[u * P + ids[j]]); second[u] = d; if ((u & 255) === 0) await pause(); }
        let winning, winningCost = fit.cost;
        for (let p = 0; p < P; p++) {
          if (selected.has(p)) continue;
          const deltas = new Float64Array(ids.length), vetoes = new Uint8Array(ids.length);
          for (let u = 0; u < U; u++) {
            const entry = source.records[u], candidate = matrix[u * P + p];
            for (let j = 0; j < ids.length; j++) {
              const d = Math.min(candidate, j === fit.owners[u] ? second[u] : fit.errors[u]);
              deltas[j] += entry.mass * (d - fit.errors[u]);
              if (d > baseline.errors[u] && (policy === 'strict' || policy === 'rare' && (entry.mass / source.mass <= .01 || baseline.errors[u] === 0))) vetoes[j] = 1;
            }
            if ((u & 255) === 0) await pause();
          }
          for (let j = 0; j < ids.length; j++) if (!vetoes[j] && fit.cost + deltas[j] < winningCost) { winning = ids.filter((_, index) => index !== j).concat(p).sort((a, b) => a - b); winningCost = fit.cost + deltas[j]; }
        }
        if (!winning) break;
        const next = await evaluate(winning.map(p => target[p]), source, baseline, shared, pause);
        if (!eligible(next, baseline, policy) || next.cost >= fit.cost) break;
        best[policy] = next; passes.push({ policy, pass: pass + 1, ...compact(next) });
      }
    }
  }
  canceled(signal);
  const chosen = best[guard], changed = chosen.colors.some((c, i) => c !== baselineColors[i]);
  if (changed) reason = 'Accepted by ' + guard + ' guard against original exact source RGBs.';
  const variants = Object.fromEntries(Object.entries(best).map(([policy, fit]) => [policy, { ...compact(fit), changed: fit.colors.some((c, i) => c !== baselineColors[i]) }]));
  return { colors: [...chosen.colors], changed, method, guard, reason, baseline: compact(baseline), variants, passes, source: { uniqueRgb: source.records.length, exactBoundExceeded: source.overflow, visiblePixels: source.pixels, durationWeightedMass: source.mass, effectiveAlphaCut: alphaMode === 'keep' ? 1 : alphaCut, rareMassThreshold: .01, matrixBytes }, timing: { histogramMs, totalMs: performance.now() - started } };
}
