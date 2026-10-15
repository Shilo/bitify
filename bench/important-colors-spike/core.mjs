// Research-only browser-safe harness. Production modules are imported unchanged.
import { selectPaletteSubset as currentSelect } from '../../src/lib/palette-limit.js';
import { selectPaletteSubset as candidateSelect } from './palette-limit.candidate.js';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { quantizeAsync } from '../../src/lib/quantize.js';
export const methods = ['baseline', 'none', 'concave', 'hue'];
export const framesOf = item => item.frames ?? [item];
export function revive(item) {
  const original = value => ({ width: value.width, height: value.height, data: new Uint8ClampedArray(value.data) });
  if (item.frames) { const frames = item.frames.map(f => ({ ...f, original: original(f.original) })); return { ...item, frames, original: frames[0].original }; }
  return { ...item, original: original(item.original) };
}
export function chunks(item, chunkBytes = 128 * 1024, durationScale = 1) {
  return async function* () {
    for (const frame of framesOf(item)) for (let at = 0; at < frame.original.data.length; at += chunkBytes) yield { data: frame.original.data.subarray(at, at + chunkBytes), weight: (item.frames ? frame.delay : 1) * durationScale };
  };
}
export async function targetFor(items, target, cut) { return target ?? (await generatePaletteAsync(captureGeneratedSources(items, cut))).colors; }
export async function render(item, sharedColors, { method = 'baseline', cap, metric = 'oklab', alphaMode = 'cut', alphaCut = 128, chunkBytes, durationScale = 1, dither = 'none', signal } = {}) {
  const cut = alphaMode === 'keep' ? 1 : alphaCut;
  const started = performance.now();
  const selection = cap && cap < sharedColors.length ? await (method === 'baseline' ? currentSelect : candidateSelect)(sharedColors, cap, chunks(item, chunkBytes, durationScale), { metric, alphaCut: cut, importance: method === 'baseline' ? 'none' : method, signal }) : { indices: sharedColors.map((_, i) => i), fastPath: 'uncapped' };
  const selectMs = performance.now() - started;
  const colors = selection.indices.map(i => sharedColors[i]);
  const rgb = colors.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]), outputs = [];
  for (const frame of framesOf(item)) {
    const q = await quantizeAsync(frame.original, colors, alphaCut, undefined, undefined, { metric, alphaMode, dither, ditherStrength: 50, signal });
    const data = new Uint8ClampedArray(q.w * q.h * 4);
    for (let p = 0; p < q.indices.length; p++) if (q.indices[p] < colors.length) { data.set(rgb[q.indices[p]], p * 4); data[p * 4 + 3] = q.alpha?.[p] ?? 255; }
    outputs.push({ width: q.w, height: q.h, data, delay: item.frames ? frame.delay : 1 });
  }
  return { colors, outputs, selection, selectMs };
}
export async function hashFrames(outputs) {
  const size = outputs.reduce((sum, f) => sum + f.data.length, 0), all = new Uint8Array(size); let at = 0;
  for (const output of outputs) { all.set(output.data, at); at += output.data.length; }
  const bytes = await crypto.subtle.digest('SHA-256', all);
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const linear = value => (value /= 255) <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
export function lab(r, g, b) {
  r = linear(r); g = linear(g); b = linear(b);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
export function measure(item, output, options, baseline) {
  const frames = framesOf(item), target = new Set(output.colors), used = new Set();
  let n = 0, squaredRgb = 0, squaredLab = 0, changed = 0, exactLost = 0, alphaWrong = 0, membershipWrong = 0, stableChurn = 0;
  const regions = Object.fromEntries((item.regions ?? []).map(region => [region.name, { count: 0, squaredLab: 0, sourceMean: [0, 0, 0], outputMean: [0, 0, 0], colors: {}, exact: 0 }]));
  for (let f = 0; f < frames.length; f++) {
    const source = frames[f].original, result = output.outputs[f], delay = item.frames ? frames[f].delay : 1;
    if (source.width !== result.width || source.height !== result.height) throw new Error('Dimensions changed');
    for (let p = 0; p < source.data.length; p += 4) {
      const visible = source.data[p + 3] >= (options.alphaMode === 'keep' ? 1 : options.alphaCut), alpha = visible ? options.alphaMode === 'keep' ? source.data[p + 3] : 255 : 0;
      if (result.data[p + 3] !== alpha) alphaWrong++;
      if (!visible) continue;
      const sourceRgb = source.data.subarray(p, p + 3), resultRgb = result.data.subarray(p, p + 3), a = lab(...sourceRgb), b = lab(...resultRgb), d = a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);
      const hex = '#' + [...resultRgb].map(v => v.toString(16).padStart(2, '0')).join(''); used.add(hex); if (!target.has(hex)) membershipWrong++;
      squaredLab += d * delay; squaredRgb += sourceRgb.reduce((sum, v, i) => sum + (v - resultRgb[i]) ** 2, 0) * delay; n += delay;
      if (baseline && sourceRgb.some((_, i) => result.data[p + i] !== baseline.outputs[f].data[p + i])) { changed++; if (sourceRgb.every((v, i) => v === baseline.outputs[f].data[p + i])) exactLost++; }
      if (f && source.width === frames[f - 1].original.width && source.height === frames[f - 1].original.height && source.data.subarray(p, p + 4).every((v, i) => v === frames[f - 1].original.data[p + i]) && result.data.subarray(p, p + 4).some((v, i) => v !== output.outputs[f - 1].data[p + i])) stableChurn++;
      const x = (p / 4) % source.width, y = Math.floor(p / 4 / source.width);
      for (const region of item.regions ?? []) {
        if (region.frame !== undefined && region.frame !== f) continue;
        const inside = region.points ? region.points.some(([rx, ry]) => rx === x && ry === y) : x >= region.x && y >= region.y && x < region.x + region.width && y < region.y + region.height;
        if (!inside) continue;
        const stat = regions[region.name]; stat.count += delay; stat.squaredLab += d * delay; stat.colors[hex] = (stat.colors[hex] ?? 0) + delay; if (sourceRgb.every((v, i) => v === resultRgb[i])) stat.exact += delay;
        for (let c = 0; c < 3; c++) { stat.sourceMean[c] += a[c] * delay; stat.outputMean[c] += b[c] * delay; }
      }
    }
  }
  for (const stat of Object.values(regions)) { stat.meanLabError = stat.count ? stat.squaredLab / stat.count : 0; stat.sourceMean = stat.sourceMean.map(v => v / (stat.count || 1)); stat.outputMean = stat.outputMean.map(v => v / (stat.count || 1)); }
  return { pointLab: squaredLab / (n || 1), channelRmse: Math.sqrt(squaredRgb / ((n || 1) * 3)), alphaWrong, membershipWrong, usedCount: used.size, changed, exactLost, stableChurn, regions };
}
