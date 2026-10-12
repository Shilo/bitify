import { describe, it, expect, vi } from 'vitest';
import { prepareCleanupAsync, createCleanupAccumulator, applyCleanup, applyCleanupAsync } from './palette-cleanup.js';
import { quantize, preparePalette } from './quantize.js';
import { FULL_PRESETS } from './palette-library.js';

const rgba = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
const image = (colors, width = colors.length, height = 1) => ({ width, height, data: Uint8ClampedArray.from(colors.flatMap(c => typeof c === 'string' ? rgba(c) : c)) });
const pico = FULL_PRESETS.find(p => p.id === 'preset-pico8').colors;
function lab(rgb) {
  const [r, g, b] = rgb.map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const d2 = (a, b) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);

// Independent scalar specification: per-pixel arrays/maps, exhaustive contacts,
// no production cache, typed scratch, batching or incremental animation state.
function reference(source, colors, base) {
  const n = base.length, w = source.width, h = source.height, out = Array.from(base), palette = colors.map(c => lab(rgba(c).slice(0, 3)));
  const vector = p => lab(Array.from(source.data.slice(p * 4, p * 4 + 3)));
  const neighbors = p => {
    const x = p % w, y = Math.floor(p / w), ns = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h && base[p + dx + dy * w] !== 256) ns.push(p + dx + dy * w);
    return ns;
  };
  const small = Array.from(base, (label, p) => label !== 256 && !neighbors(p).some(q => base[q] === label)), choices = [];
  for (let p = 0; p < n; p++) {
    if (!small[p]) continue;
    const P = vector(p), groups = new Map();
    for (const q of neighbors(p)) { const label = base[q]; if (!groups.has(label)) groups.set(label, []); groups.get(label).push(q); }
    let best = Infinity, choice, ambiguous = false;
    for (const [label, ns] of groups) {
      const contact = Math.max(...ns.map(q => d2(P, vector(q)))); if (contact > .22 ** 2) continue;
      const anchors = ns.filter(q => !small[q]); let target, chosen = label;
      if (!anchors.length) {
        if (ns.length !== 1) continue;
        target = ns[0]; const Q = vector(target), a = base[p], b = base[target], costA = d2(P, palette[a]) + d2(Q, palette[a]), costB = d2(P, palette[b]) + d2(Q, palette[b]);
        if (Math.abs(costA - costB) <= 1e-10) continue;
        chosen = costA < costB ? a : b;
        if (d2(Q, palette[chosen]) - d2(Q, palette[b]) > .35 ** 2) continue;
      } else target = anchors[0];
      if (d2(P, palette[chosen]) - d2(P, palette[base[p]]) > .35 ** 2) continue;
      if (contact < best - 1e-10) { best = contact; choice = { target, chosen }; ambiguous = false; }
      else if (Math.abs(contact - best) <= 1e-10 && (choice.chosen !== chosen || small[choice.target] || small[target])) ambiguous = true;
    }
    if (choice && !ambiguous) choices[p] = choice;
  }
  for (let p = 0; p < n; p++) {
    const choice = choices[p]; if (!choice) continue;
    const { target, chosen } = choice;
    if (!small[target]) out[p] = chosen;
    else if (p < target && choices[target]?.target === p && choices[target].chosen === chosen) out[p] = out[target] = chosen;
  }
  for (let p = 0; p < n; p++) if (out[p] !== base[p]) {
    const P = vector(p), hex = '#' + Array.from(source.data.slice(p * 4, p * 4 + 3), n => n.toString(16).padStart(2, '0')).join('');
    const originalError = d2(P, palette[base[p]]), addedError = d2(P, palette[out[p]]) - originalError;
    if (colors.includes(hex) || addedError > Math.min(.005, .5 * originalError + .0004)) out[p] = base[p];
  }
  return out;
}
async function cleaned(source, colors = pico, metric = 'oklab', alphaCut = 128) {
  const result = quantize(source, colors, alphaCut, undefined, undefined, { metric });
  return applyCleanup(result, await prepareCleanupAsync([source], colors, alphaCut, metric));
}
function transform(source, transpose = false) {
  const w = transpose ? source.height : source.width, h = transpose ? source.width : source.height, data = new Uint8ClampedArray(source.data.length);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) data.set(source.data.slice((y * source.width + x) * 4, (y * source.width + x + 1) * 4), (transpose ? x * w + y : y * w + source.width - 1 - x) * 4);
  return { width: w, height: h, data };
}

describe('optional one-pixel palette cleanup', () => {
  it.each(['oklab', 'rgb'])('matches the scalar frozen-pass reference with %s matching across random palettes, alpha and shapes', async metric => {
    let seed = 78921;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 16 & 255; };
    for (let turn = 0; turn < 90; turn++) {
      const width = turn % 11 + 1, height = turn % 7 + 1;
      const colors = turn % 3 ? pico : ['#646464', '#666451', '#596e6c', '#000000'];
      const pixels = Array.from({ length: width * height }, () => [random(), random(), random(), [0, 127, 128, 255][random() % 4]]), source = image(pixels, width, height), before = source.data.slice();
      const base = quantize(source, colors, 128, undefined, undefined, { metric });
      const result = await cleaned(source, colors, metric);
      expect([...result.indices]).toEqual(reference(source, colors, base.indices));
      expect(source.data).toEqual(before);
      expect(result.hasTransparency).toBe(result.indices.includes(256));
      const used = new Set(result.indices); used.delete(256);
      expect([...result.used].reduce((sum, value) => sum + value, 0)).toBe(used.size);
      for (let i = 0; i < base.indices.length; i++) expect(result.indices[i] === 256).toBe(base.indices[i] === 256);
      for (let p = 0; p < base.indices.length; p++) if (result.indices[p] !== base.indices[p]) {
        const P = lab(Array.from(source.data.slice(p * 4, p * 4 + 3))), old = lab(rgba(colors[base.indices[p]]).slice(0, 3)), next = lab(rgba(colors[result.indices[p]]).slice(0, 3));
        expect(d2(P, next) - d2(P, old)).toBeLessThanOrEqual(Math.min(.005, .5 * d2(P, old) + .0004) + 1e-12);
      }
      expect([...used].every(k => k >= 0 && k < colors.length)).toBe(true);
    }
  });

  it.each(['oklab', 'rgb'])('preserves mirror/transpose symmetry including ambiguous singleton partners under %s', async metric => {
    const sources = [image(['#65645a', '#646464', '#5e6968']), image(Array.from({ length: 63 }, (_, n) => ['#65645a', '#646464', '#5e6968', '#666451', '#596e6c', '#666565', '#ffffff'][n % 7]), 9, 7)];
    const colors = ['#646464', '#666451', '#596e6c'];
    for (const source of sources) {
      const original = await cleaned(source, colors, metric);
      for (const transpose of [false, true]) {
        const changed = transform(source, transpose), result = await cleaned(changed, colors, metric);
        for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) expect(result.indices[transpose ? x * changed.width + y : y * changed.width + source.width - 1 - x]).toBe(original.indices[y * source.width + x]);
      }
    }
  });

  it('keeps connected lines and preserves the high-cost isolated blue eye', async () => {
    const background = '#07050c', eye = '#053452';
    const source = image(Array(25).fill(background), 5, 5); source.data.set(rgba(eye), 12 * 4);
    const base = quantize(source, pico), result = await cleaned(source);
    expect(base.indices[12]).toBe(1); expect(result.indices[12]).toBe(1);
    source.data.set(rgba(eye), 13 * 4);
    expect((await cleaned(source)).indices).toEqual(quantize(source, pico).indices);
    source.data.set(rgba('#ffffff'), 12 * 4); source.data.set(rgba(background), 13 * 4);
    expect((await cleaned(source)).indices[12]).toBe(7);
  });

  it.each(['oklab', 'rgb'])('protects exact active-palette colors even when they are isolated under %s', async metric => {
    const colors = ['#646464', '#666565'], source = image(Array(25).fill(colors[0]), 5, 5); source.data.set(rgba(colors[1]), 12 * 4);
    expect((await cleaned(source, colors, metric)).indices).toEqual(quantize(source, colors, 128, undefined, undefined, { metric }).indices);
  });

  it('still removes low-cost palette-boundary noise without claiming to detect intent', async () => {
    const source = image(Array(25).fill('#000000'), 5, 5); source.data.set(rgba('#080c16'), 12 * 4);
    expect(quantize(source, pico).indices[12]).toBe(1);
    expect((await cleaned(source)).indices[12]).toBe(0);
    // Identical bytes could be an intentional dot; Off preserves nearest output.
  });

  it('never invents a third palette color or exceeds an already selected subset', async () => {
    const colors = ['#000000', '#1d2b53'], source = image(['#07050c', '#07050c', '#053452', '#07050c', '#07050c']);
    const result = await cleaned(source, colors);
    expect(new Set(result.indices).size).toBeLessThanOrEqual(2);
    expect([...result.indices].every(n => n < 2)).toBe(true);
    const sole = await cleaned(source, ['#123456']); expect([...sole.indices]).toEqual(Array(5).fill(0));
  });

  it('uses identical full-source decisions in reduced preview samples and rebuilds export metadata', async () => {
    const source = image(Array(77).fill('#000000'), 11, 7); source.data.set(rgba('#080c16'), (3 * 11 + 5) * 4); source.data[0 + 3] = 0;
    const cleanup = await prepareCleanupAsync([source], preparePalette(pico)), full = applyCleanup(quantize(source, pico), cleanup);
    const sampled = applyCleanup(quantize(source, pico, 128, 4, 3), cleanup.replacements, cleanup.width, cleanup.height);
    for (let y = 0; y < sampled.h; y++) for (let x = 0; x < sampled.w; x++) expect(sampled.indices[y * sampled.w + x]).toBe(full.indices[Math.floor((y + .5) * 7 / 3) * 11 + Math.floor((x + .5) * 11 / 4)]);
    expect(full.used[1]).toBe(0); expect(full.used[0]).toBe(1); expect(full.hasTransparency).toBe(true);
    expect(sampled.hasTransparency).toBe(false);
  });

  it('allows stationary cleanup only when every frame baseline AND proposed label agree', async () => {
    const background = '#000000', dot = '#080c16', frame = image(Array(15).fill(background), 5, 3); frame.data.set(rgba(dot), 7 * 4);
    const stable = await prepareCleanupAsync([frame, frame, frame], pico);
    expect(stable.replacements[7]).toBe(0);
    const moved = { ...frame, data: frame.data.slice() }; moved.data.set(rgba(background), 7 * 4); moved.data.set(rgba(dot), 8 * 4);
    const guard = await prepareCleanupAsync([frame, moved, frame], pico);
    expect(guard.replacements[7]).toBe(256); expect(guard.replacements[8]).toBe(256);
    for (const f of [frame, moved, frame]) expect(applyCleanup(quantize(f, pico), guard).indices).toEqual(quantize(f, pico).indices);
    // Matching stays navy but the source contact crosses the cleanup cutoff.
    const jitter = { ...frame, data: frame.data.slice() }; jitter.data.set(rgba('#074960'), 7 * 4);
    expect(quantize(jitter, pico).indices[7]).toBe(1);
    expect((await prepareCleanupAsync([frame, jitter, frame], pico)).replacements[7]).toBe(256);
  });

  it('keeps loop-edge frame disagreements and transparency changes unchanged', async () => {
    const a = image(['#000000', '#000000', '#080c16', '#000000', '#000000']), b = { ...a, data: a.data.slice() }; b.data[2 * 4 + 3] = 0;
    const prepared = await prepareCleanupAsync([a, a, b], pico);
    expect(prepared.replacements[2]).toBe(256);
    const empty = applyCleanup(quantize(b, pico), prepared); expect(empty.indices[2]).toBe(256); expect(empty.hasTransparency).toBe(true);
    const reversed = await prepareCleanupAsync([b, a, a], pico); expect(reversed.replacements).toEqual(prepared.replacements);
  });

  it('incremental sequential frames agree with whole-array preparation without retaining caller buffers', async () => {
    const source = image(['#000000', '#000000', '#080c16', '#000000', '#000000']), accumulator = createCleanupAccumulator(preparePalette(pico));
    await accumulator.addSource(source); await accumulator.addSource(source);
    const expected = await prepareCleanupAsync([source, source], pico);
    expect(accumulator.finish()).toEqual(expected);
    await expect(accumulator.addSource(source)).rejects.toThrow('sequentially');
    expect(() => accumulator.finish()).toThrow();
  });

  it('async export overlay agrees with preview sampling and cancels without returning a partial result', async () => {
    const source = image(Array.from({ length: 30000 }, (_, n) => n % 19 ? '#000000' : '#080c16'), 200, 150);
    const prepared = await prepareCleanupAsync([source], pico);
    const expected = applyCleanup(quantize(source, pico, 128, 133, 79), prepared);
    expect(await applyCleanupAsync(quantize(source, pico, 128, 133, 79), prepared)).toEqual(expected);
    const canceled = new AbortController(); canceled.abort();
    const untouched = quantize(source, pico), before = untouched.indices.slice();
    await expect(applyCleanupAsync(untouched, prepared, { signal: canceled.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(untouched.indices).toEqual(before);
    const during = new AbortController();
    const error = await applyCleanupAsync(quantize(source, pico), prepared, { signal: during.signal, onProgress: () => during.abort() }).then(() => null, e => e);
    expect(error?.name).toBe('AbortError');
  });

  it('rejects invalid sources, mismatched clip dimensions and invalid overlay buffers', async () => {
    const source = image(['#000000']);
    await expect(prepareCleanupAsync([], pico)).rejects.toThrow();
    await expect(prepareCleanupAsync([{ width: 1, height: 1, data: new Uint8Array(3) }], pico)).rejects.toThrow();
    await expect(prepareCleanupAsync([source], pico, 0)).rejects.toThrow('Opacity');
    await expect(prepareCleanupAsync([source], pico, 128, 'hsl')).rejects.toThrow('Matching');
    await expect(prepareCleanupAsync([source, image(['#000000', '#000000'])], pico)).rejects.toThrow('matching dimensions');
    const accumulator = createCleanupAccumulator(pico); expect(() => accumulator.finish()).toThrow('completed');
    const first = accumulator.addSource(source); await expect(accumulator.addSource(source)).rejects.toThrow('sequentially'); await first;
    expect(() => applyCleanup(quantize(source, pico), { replacements: new Uint16Array(1), width: 2, height: 1 })).toThrow('Invalid');
  });

  it('cancels before allocating and yields during a large optional cleanup job', async () => {
    const source = image(['#07050c']), aborted = new AbortController(); aborted.abort();
    await expect(prepareCleanupAsync([source], pico, 128, 'oklab', { signal: aborted.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const large = image(Array.from({ length: 40000 }, (_, p) => p % 11 ? '#07050c' : '#053452'), 200, 200), during = new AbortController();
    // Force a bounded task yield, independent of test-host CPU/timer ordering.
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => (clock += 9));
    vi.stubGlobal('MessageChannel', undefined);
    let timerFired = false; const timer = setTimeout(() => { timerFired = true; during.abort(); }, 0);
    try {
      const error = await prepareCleanupAsync([large], pico, 128, 'oklab', { signal: during.signal }).then(() => null, e => e);
      expect(error?.name).toBe('AbortError'); expect(timerFired).toBe(true);
    } finally { clearTimeout(timer); now.mockRestore(); vi.unstubAllGlobals(); }
  });

  it('checks cancellation inside neighborhood preparation after full nearest conversion', async () => {
    const source = image(Array.from({ length: 40000 }, (_, p) => p % 11 ? '#07050c' : '#053452'), 200, 200), before = source.data.slice();
    // Quantization uses twenty 2048-pixel blocks. The 60th cancellation check
    // falls inside cleanup's isolation pass, without CPU/timer assumptions.
    let reads = 0; const signal = { get aborted() { return ++reads > 60; } };
    const error = await prepareCleanupAsync([source], pico, 128, 'oklab', { signal }).then(() => null, e => e);
    expect(error?.name).toBe('AbortError'); expect(reads).toBe(61);
    expect(source.data).toEqual(before);
  });
});
