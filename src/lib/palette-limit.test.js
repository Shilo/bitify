import { describe, it, expect, vi } from 'vitest';
import { selectPaletteSubset } from './palette-limit.js';
import { preparePalette, quantize } from './quantize.js';

const pixel = (rgb, alpha = 255) => [rgb >>> 16, rgb >>> 8 & 255, rgb & 255, alpha];
const source = (colors, weight = 1) => ({ data: Uint8ClampedArray.from(colors.flatMap(value => Array.isArray(value) ? value : pixel(value))), weight });
const read = entries => async function* () { for (const entry of entries) yield entry; };
function vector(rgb, metric) {
  const channels = [rgb >>> 16, rgb >>> 8 & 255, rgb & 255];
  if (metric === 'rgb') return channels;
  const [r, g, b] = channels.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
function cost(entries, colors, metric, cut = 128) {
  const targets = colors.map(c => vector(parseInt(c.slice(1), 16), metric)); let cost = 0;
  for (const { data, weight } of entries) for (let at = 0; at < data.length; at += 4) {
    if (data[at + 3] < cut) continue;
    const v = vector(data[at] << 16 | data[at + 1] << 8 | data[at + 2], metric);
    cost += Math.min(...targets.map(t => v.reduce((sum, x, i) => sum + (x - t[i]) ** 2, 0))) * weight;
  }
  return cost;
}
function popular(entries, colors, K, metric, cut = 128) {
  const counts = new Float64Array(colors.length), palette = preparePalette(colors);
  for (const { data, weight } of entries) {
    const indices = quantize({ data, width: data.length / 4, height: 1 }, palette, cut, undefined, undefined, { metric }).indices;
    for (const i of indices) if (i < colors.length) counts[i] += weight;
  }
  return [...counts.keys()].sort((a, b) => counts[b] - counts[a] || a - b).slice(0, K).map(i => colors[i]);
}

describe('whole-source fixed-palette limiting', () => {
  it.each(['rgb', 'oklab'])('finds the exhaustive best single allowed color in %s', async metric => {
    const colors = ['#000000', '#202020', '#808080', '#ffffff', '#ff0000', '#0000ff'], entries = [source([0x666666, 0x666666, 0x555555, 0x898989, 0xaa1133])];
    const expected = colors.map(c => cost(entries, [c], metric));
    const result = await selectPaletteSubset(colors, 1, read(entries), { metric });
    expect(result.indices).toEqual([expected.indexOf(Math.min(...expected))]); expect(result.cost).toBeCloseTo(Math.min(...expected), metric === 'rgb' ? 5 : 12);
  });
  it('keeps exact unrestricted winners when they already fit the cap', async () => {
    const result = await selectPaletteSubset(['#000000', '#ff0000', '#0000ff', '#ffffff'], 3, read([source([0xff0000, 0x0000ff, 0xff0000])]), { metric: 'rgb' });
    expect(result.indices).toEqual([1, 2]); expect(result.cost).toBe(0); expect(result.fastPath).toBe('full-nearest');
  });
  it('uses earliest original-order ties and deterministic empty fallback', async () => {
    expect((await selectPaletteSubset(['#000000', '#020000'], 1, read([source([0x010000])]), { metric: 'rgb' })).indices).toEqual([0]);
    const empty = await selectPaletteSubset(['#ff0000', '#0000ff'], 1, read([source([pixel(0x0000ff, 0)])]));
    expect(empty.indices).toEqual([0]); expect(empty.cost).toBe(0); expect(empty.fastPath).toBe('empty');
  });
  it('weights all animation frames by duration and is invariant to splitting a duration', async () => {
    const colors = ['#000000', '#ff0000', '#0000ff'], red = source([0xff0000], 100), blue = source([0x0000ff], 400);
    const a = await selectPaletteSubset(colors, 1, read([red, blue]), { metric: 'rgb' });
    const b = await selectPaletteSubset(colors, 1, read([red, source([0x0000ff], 200), source([0x0000ff], 200)]), { metric: 'rgb' });
    expect(a.indices).toEqual([2]); expect(b.indices).toEqual(a.indices); expect(b.cost).toBe(a.cost);
  });
  it('applies the opacity cut to both fitting and source-cost verification', async () => {
    const entries = [source([pixel(0xff0000, 127), pixel(0x0000ff, 128), pixel(0x0000ff, 1), pixel(0xff0000, 0)])];
    expect((await selectPaletteSubset(['#ff0000', '#0000ff'], 1, read(entries))).indices).toEqual([1]);
    expect((await selectPaletteSubset(['#ff0000', '#0000ff'], 1, read(entries), { alphaCut: 255 })).fastPath).toBe('empty');
  });
  it.each(['rgb', 'oklab'])('does not exceed frequency cost on exact source histograms in %s', async metric => {
    let seed = 7; const random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) & 0xffffff;
    const colors = Array.from({ length: 16 }, () => '#' + random().toString(16).padStart(6, '0')), entries = [source(Array.from({ length: 150 }, random))];
    for (const K of [2, 4, 8]) {
      const result = await selectPaletteSubset(colors, K, read(entries), { metric });
      expect(result.indices.length).toBeLessThanOrEqual(K); expect(result.indices).toEqual([...result.indices].sort((a, b) => a - b));
      const actual = cost(entries, result.indices.map(i => colors[i]), metric);
      expect(actual).toBeCloseTo(result.cost, metric === 'rgb' ? 4 : 11);
      expect(actual).toBeLessThanOrEqual(cost(entries, popular(entries, colors, K, metric), metric) + 1e-9);
      expect(result.swaps).toBeLessThanOrEqual(8); expect(result.swapTrace.every(step => step.after < step.before)).toBe(true);
    }
  });
  it.each(['rgb', 'oklab'])('bounds high-entropy histograms and verifies FINAL cost on original pixels in %s', async metric => {
    const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const entries = [source(Array.from({ length: 5000 }, (_, i) => Math.imul(i, 0x9e3779) & 0xffffff), 80), source([0xff0000, 0x0000ff], 900)];
    let passes = 0; const input = () => { passes++; return read(entries)(); };
    const result = await selectPaletteSubset(colors, 3, input, { metric });
    expect(result.binned).toBe(true); expect(result.histogramColors).toBeLessThanOrEqual(4096); expect(passes).toBe(2);
    const actual = cost(entries, result.indices.map(i => colors[i]), metric), baseline = cost(entries, popular(entries, colors, 3, metric), metric);
    expect(actual).toBeCloseTo(result.cost, metric === 'rgb' ? 2 : 9); expect(result.cost).toBeLessThanOrEqual(baseline + Math.max(1, baseline) * 1e-12);
  });
  it('rejects a binned fit that loses two dominant authored colors inside the same RGB bin', async () => {
    const colors = ['#000000', '#0f0f0f', '#070707', '#ff0000', '#00ff00', '#0000ff', '#ffffff'];
    const entries = [source([0x000000, 0x0f0f0f], 1e9), source(Array.from({ length: 5000 }, (_, i) => Math.imul(i, 0x9e3779) & 0xffffff))];
    const result = await selectPaletteSubset(colors, 2, read(entries), { metric: 'rgb' });
    expect(result.binned).toBe(true); expect(result.verifiedFallback).toBe(true);
    expect(result.indices).toEqual([0, 1]); expect(result.cost).toBe(cost(entries, colors.slice(0, 2), 'rgb'));
  });
  it.each(['rgb', 'oklab'])('matches exhaustive one-swap neighbors after convergence in %s', async metric => {
    let seed = 17; const random = () => (seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) & 0xffffff;
    for (let trial = 0; trial < 8; trial++) {
      const colors = Array.from({ length: 7 }, () => '#' + random().toString(16).padStart(6, '0')), entries = [source(Array.from({ length: 25 }, random), 80)];
      for (const K of [2, 3]) {
        const result = await selectPaletteSubset(colors, K, read(entries), { metric });
        expect(result.cost).toBeCloseTo(cost(entries, result.indices.map(i => colors[i]), metric), metric === 'rgb' ? 4 : 11);
        if (result.swaps === 8) continue;
        for (const remove of result.indices) for (let add = 0; add < colors.length; add++) {
          if (result.indices.includes(add)) continue;
          const neighbor = result.indices.filter(i => i !== remove).concat(add).map(i => colors[i]);
          expect(cost(entries, neighbor, metric)).toBeGreaterThanOrEqual(result.cost - 1e-12 * Math.max(1, result.cost));
        }
      }
    }
  });
  it('full-winner fast path avoids a second high-entropy pass when all winners fit', async () => {
    let passes = 0; const entries = [source(Array.from({ length: 5000 }, (_, i) => i))];
    const result = await selectPaletteSubset(['#000000', '#ffffff'], 2, () => { passes++; return read(entries)(); });
    expect(passes).toBe(1); expect(result.indices.length).toBeLessThanOrEqual(2);
  });
  it('rejects invalid limits, matching, alpha and source chunks', async () => {
    for (const K of [0, -1, 257, 1.5]) await expect(selectPaletteSubset(['#000000'], K, read([]))).rejects.toThrow('Max colors');
    await expect(selectPaletteSubset(['#000000'], 1, read([]), { metric: 'lab' })).rejects.toThrow('Matching');
    await expect(selectPaletteSubset(['#000000'], 1, read([]), { alphaCut: 0 })).rejects.toThrow('Opacity');
    await expect(selectPaletteSubset(['#000000'], 1, read([{ data: new Uint8Array(3), weight: 1 }]))).rejects.toThrow('source chunk');
    await expect(selectPaletteSubset(['#000000'], 1, read([{ data: new Uint8Array(4), weight: NaN }]))).rejects.toThrow('source chunk');
  });
  it('cancels cooperatively while scanning, and never publishes a partial subset', async () => {
    const controller = new AbortController(); let clock = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => { clock += 10; if (clock > 40) controller.abort(); return clock; });
    try { await expect(selectPaletteSubset(['#000000', '#ffffff'], 1, read([source(Array.from({ length: 10000 }, (_, i) => i))]), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' }); }
    finally { now.mockRestore(); }
  });
});
