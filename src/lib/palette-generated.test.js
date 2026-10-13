import { describe, it, expect, vi } from 'vitest';
import { captureGeneratedSources } from './palette-generated-sources.js';
import { generatePaletteAsync, createGeneratedAccumulator } from './palette-generated.js';
import { quantize, preparePalette, colorize } from './quantize.js';

const source = (pixels, width = pixels.length, height = 1) => ({ width, height, data: Uint8ClampedArray.from(pixels.flat()) });
const item = original => ({ original });
const gray = n => [n, n, n, 255];
const gradient = (offset = 0, size = 256) => source(Array.from({ length: size }, (_, i) => [(i + offset) & 255, i * 3 & 255, i * 7 & 255, 255]));

describe('generated whole-wall palette', () => {
  it('returns empty colors for no wall/visible pixels and preserves all unique source RGBs up to 32', async () => {
    expect((await generatePaletteAsync(captureGeneratedSources([]))).colors).toEqual([]);
    expect((await generatePaletteAsync(captureGeneratedSources([item(source([[255, 0, 0, 0]]))]))).colors).toEqual([]);
    const original = source([[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [1, 2, 3, 127]]);
    const result = await generatePaletteAsync(captureGeneratedSources([item(original)]));
    expect(result.colors).toEqual(['#0000ff', '#00ff00', '#ff0000']); expect(result.assets).toBe(1);
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.colors)).toBe(true);
    expect((await generatePaletteAsync(captureGeneratedSources([item(original)], 127))).colors).toContain('#010203');
  });
  it('captures immutable source references and excludes wall order/name/loop/display settings', () => {
    const a = item(gradient()), b = { original: gradient(1), name: 'before', loop: 2 };
    const first = captureGeneratedSources([a, b]), reverse = captureGeneratedSources([b, a]);
    expect(first.key).toBe(reverse.key); expect(first.assets).toEqual(reverse.assets);
    a.original = gradient(2); b.name = 'after'; b.loop = 7;
    expect(first.assets.some(asset => asset.frames[0].original === a.original)).toBe(false);
    expect(Object.isFrozen(first.assets)).toBe(true); expect(Object.isFrozen(first.assets[0].frames[0])).toBe(true);
    expect(captureGeneratedSources([a, b]).key).not.toBe(first.key);
  });
  it('generates exactly deterministic colors under asset order, duplicate content and frame duration scaling/splitting', async () => {
    const a = gradient(), b = gradient(71), still = item(gradient(44));
    const clip = frames => ({ original: frames[0].original, frames, loop: 0 });
    const whole = clip([{ original: a, delay: 20 }, { original: b, delay: 80 }]);
    const scaled = clip([{ original: a, delay: 60 }, { original: b, delay: 240 }]);
    const split = clip([{ original: a, delay: 20 }, { original: b, delay: 40 }, { original: b, delay: 40 }]);
    const first = await generatePaletteAsync(captureGeneratedSources([whole, still]));
    expect((await generatePaletteAsync(captureGeneratedSources([still, whole]))).colors).toEqual(first.colors);
    expect((await generatePaletteAsync(captureGeneratedSources([scaled, still]))).colors).toEqual(first.colors);
    expect((await generatePaletteAsync(captureGeneratedSources([still, split]))).colors).toEqual(first.colors);
    const clone = clip([{ original: source([...Array(256)].map((_, i) => [i, i * 3 & 255, i * 7 & 255, 255])), delay: 20 }, { original: b, delay: 80 }]);
    expect((await generatePaletteAsync(captureGeneratedSources([still, clone]))).colors).toEqual(first.colors);
  });
  it('gives large/small assets equal contribution and skips invisible assets instead of diluting the fit', async () => {
    const small = source(Array.from({ length: 64 }, (_, n) => [n * 4, 0, 0, 255])), green = source(Array.from({ length: 64 }, (_, n) => [0, n * 4, 0, 255]));
    const large = source(Array.from({ length: 6400 }, (_, n) => [n % 64 * 4, 0, 0, 255]));
    const expected = await generatePaletteAsync(captureGeneratedSources([item(small), item(green)]));
    expect((await generatePaletteAsync(captureGeneratedSources([item(large), item(green)]))).colors).toEqual(expected.colors);
    expect((await generatePaletteAsync(captureGeneratedSources([item(small), item(green), item(source([[0, 0, 255, 0]]))]))).colors).toEqual(expected.colors);
  });
  it('keeps bounded binned fits deterministic, normalized, unique and no worse than their rounded seed', async () => {
    const a = source(Array.from({ length: 5000 }, (_, n) => [n >> 8, n & 255, n * 13 & 255, 255]));
    const b = source(Array.from({ length: 5000 }, (_, n) => [n * 7 & 255, n >> 8, n & 255, 255]));
    const before = a.data.slice(), first = await generatePaletteAsync(captureGeneratedSources([item(a), item(b)]));
    expect(first.binned).toBe(true); expect(first.colors.length).toBeGreaterThan(0); expect(first.colors.length).toBeLessThanOrEqual(32);
    expect(new Set(first.colors).size).toBe(first.colors.length); expect(first.colors.every(c => /^#[\da-f]{6}$/.test(c))).toBe(true);
    expect(Number.isFinite(first.cost)).toBe(true); expect(first.cost).toBeLessThanOrEqual(first.initialCost);
    expect((await generatePaletteAsync(captureGeneratedSources([item(b), item(a)]))).colors).toEqual(first.colors);
    expect(a.data).toEqual(before);
    const result = quantize(a, preparePalette(first.colors)); expect([...result.indices].every(n => n < first.colors.length)).toBe(true);
    expect(colorize(result, first.colors).data.length).toBe(a.data.length);
  });
  it('incremental chunk/asset fitting equals snapshot fitting including 4096/4097 source boundary', async () => {
    for (const count of [4096, 4097]) {
      const original = source(Array.from({ length: count }, (_, n) => [n >> 8, n & 255, n * 23 & 255, 255]));
      const expected = await generatePaletteAsync(captureGeneratedSources([item(original)]));
      const accumulator = createGeneratedAccumulator(); accumulator.beginAsset();
      for (let at = 0; at < original.data.length; at += 512) await accumulator.addChunk(original.data.subarray(at, at + 512));
      await accumulator.endAsset(); expect(await accumulator.finish()).toEqual(expected);
      expect(expected.binned).toBe(count > 4096);
    }
  });
  it('rejects invalid captures/opacity/data/animation dimensions and unfinished accumulation', async () => {
    expect(() => captureGeneratedSources([], 0)).toThrow('Invalid');
    expect(() => captureGeneratedSources([item({ width: 1, height: 1, data: new Uint8Array(3) })])).toThrow('Invalid');
    expect(() => captureGeneratedSources([{ frames: [] }])).toThrow('no frames');
    expect(() => captureGeneratedSources([{ frames: [{ original: source([gray(1)]) }, { original: source([gray(1), gray(2)]) }] }])).toThrow('matching dimensions');
    await expect(generatePaletteAsync({ assets: [], alphaCut: 128 })).rejects.toThrow('Capture');
    const accumulator = createGeneratedAccumulator(); accumulator.beginAsset();
    expect(() => accumulator.beginAsset()).toThrow('sequentially');
    await expect(accumulator.finish()).rejects.toThrow('completed');
    await expect(accumulator.addChunk(new Uint8Array(3))).rejects.toThrow('Invalid');
    await expect(accumulator.addChunk([1, 2, 3, 255])).rejects.toThrow('Invalid');
  });
  it('cancels before work and cooperatively during a large scan without mutating sources', async () => {
    const aborted = new AbortController(); aborted.abort();
    await expect(generatePaletteAsync(captureGeneratedSources([]), { signal: aborted.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const original = gradient(1, 100000), before = original.data.slice(), during = new AbortController();
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => (clock += 9)); vi.stubGlobal('MessageChannel', undefined);
    const timer = setTimeout(() => during.abort(), 0);
    try {
      await expect(generatePaletteAsync(captureGeneratedSources([item(original)]), { signal: during.signal })).rejects.toMatchObject({ name: 'AbortError' });
      expect(original.data).toEqual(before);
    } finally { clearTimeout(timer); now.mockRestore(); vi.unstubAllGlobals(); }
  });
  it('cancels during iterative fitting after source scan has completed', async () => {
    const controller = new AbortController(), accumulator = createGeneratedAccumulator(128, { signal: controller.signal });
    accumulator.beginAsset(); await accumulator.addChunk(gradient().data); await accumulator.endAsset();
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => (clock += 100000)); vi.stubGlobal('MessageChannel', undefined);
    const timer = setTimeout(() => controller.abort(), 0);
    try { await expect(accumulator.finish()).rejects.toMatchObject({ name: 'AbortError' }); }
    finally { clearTimeout(timer); now.mockRestore(); vi.unstubAllGlobals(); }
  });
});
