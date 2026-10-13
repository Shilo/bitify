import { describe, it, expect, vi } from 'vitest';
import { preparePalette, quantize, quantizeAsync, quantizePreviewAsync, colorize, EMPTY_INDEX } from './quantize.js';

const image = (pixels, width = pixels.length, height = 1) => ({ width, height, data: Uint8ClampedArray.from(pixels.flat()) });
const hex = n => '#' + n.toString(16).padStart(6, '0');
// Separate, deliberately straightforward reference: arrays, per-channel gamma,
// no prepared state, RGB memoization, typed-array tables or production imports.
function referenceLab(rgb) {
  const [r, g, b] = rgb.map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function reference(pixel, colors, cut = 128, metric = 'oklab') {
  if (pixel[3] < cut) return 256;
  const exact = colors.indexOf('#' + pixel.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join(''));
  if (exact >= 0) return exact;
  const coordinates = rgb => metric === 'rgb' ? rgb : referenceLab(rgb);
  const value = coordinates(pixel.slice(0, 3));
  const distances = colors.map(color => coordinates([1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))))
    .map(lab => lab.reduce((sum, n, i) => sum + (n - value[i]) ** 2, 0));
  return distances.indexOf(Math.min(...distances));
}

describe('full palette quantization', () => {
  it('defers preview source access and cancels queued work before allocation', async () => {
    let reads = 0;
    const source = { width: 1, height: 1, get data() { reads++; return Uint8ClampedArray.of(0, 0, 0, 255); } };
    const controller = new AbortController();
    const pending = quantizePreviewAsync(source, ['#000000'], 128, undefined, undefined, { signal: controller.signal });
    expect(reads).toBe(0);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(reads).toBe(0);
  });

  it.each(['oklab', 'rgb'])('deferred preview preserves resized pixels, alpha and captured %s options', async metric => {
    const source = image(Array.from({ length: 77 }, (_, i) => [100, i * 3, i, i % 3 ? 255 : 100]), 11, 7);
    const colors = preparePalette(['#000000', '#777777', '#ffffff']);
    const options = { metric };
    const pending = quantizePreviewAsync(source, colors, 128, 4, 3, options);
    options.metric = metric === 'oklab' ? 'rgb' : 'oklab';
    expect(await pending).toEqual(quantize(source, colors, 128, 4, 3, { metric }));
  });

  it.each(['oklab', 'rgb'])('retains exact palette membership and a separate empty index with all 256 colors using %s', metric => {
    const colors = Array.from({ length: 256 }, (_, i) => hex(i * 65793));
    const pixels = colors.map(c => [...[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), 255]);
    pixels.push([13, 24, 35, 0]);
    const result = quantize(image(pixels), colors, 128, undefined, undefined, { metric });
    expect([...result.indices]).toEqual([...Array.from({ length: 256 }, (_, i) => i), EMPTY_INDEX]);
    expect(result.hasTransparency).toBe(true);
    expect([...result.used]).toEqual(Array(256).fill(1));
    expect([...colorize(result, colors).data]).toEqual([...pixels.slice(0, 256).flat(), 0, 0, 0, 0]);
  });

  it.each(['oklab', 'rgb'])('uses the alpha boundary and handles one-color/fully empty results using %s', metric => {
    const result = quantize(image([0, 1, 127, 128, 255].map(a => [80, 120, 150, a])), ['#123456'], 128, undefined, undefined, { metric });
    expect([...result.indices]).toEqual([256, 256, 256, 0, 0]);
    expect([...quantize(image([[0, 0, 0, 0]]), ['#123456'], 128, undefined, undefined, { metric }).used]).toEqual(Array(256).fill(0));
  });

  it('snapshots prepared palette contents instead of exposing mutable conversion arrays', () => {
    const colors = ['#abcdef', '#123456'], prepared = preparePalette(colors);
    colors[0] = '#000000';
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(() => { prepared.colors[0] = '#ffffff'; }).toThrow();
    expect([...colorize(quantize(image([[171, 205, 239, 255]]), prepared), prepared).data]).toEqual([171, 205, 239, 255]);
  });

  it.each(['oklab', 'rgb'])('agrees with an independent %s scalar reference across palette sizes, entropy and alpha', async metric => {
    let seed = 12345;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 8 & 255; };
    for (const count of [1, 2, 16, 64, 255, 256]) {
      const colors = Array.from({ length: count }, (_, i) => hex(i * 65111));
      const pixels = Array.from({ length: 1600 }, (_, i) => [random(), random(), random(), [0, 1, 127, 128, 255][i % 5]]);
      const source = image(pixels, 40, 40), expected = pixels.map(pixel => reference(pixel, colors, 128, metric));
      expect([...quantize(source, colors, 128, undefined, undefined, { metric }).indices], `palette size ${count}`).toEqual(expected);
      expect([...await quantizeAsync(source, colors, 128, undefined, undefined, { metric }).then(result => result.indices)]).toEqual(expected);
      // Cache-rich input repeats exact/nonexact colors after noisy bypass candidates.
      const repeated = image(Array.from({ length: 1500 }, (_, i) => pixels[i % 7]));
      expect([...quantize(repeated, colors, 128, undefined, undefined, { metric }).indices]).toEqual(Array.from({ length: 1500 }, (_, i) => expected[i % 7]));
    }
  });

  it.each(['oklab', 'rgb'])('samples odd rectangular images at the same center spread coordinates using %s', metric => {
    const source = image(Array.from({ length: 77 }, (_, i) => [i * 3, i * 2, i, 255]), 11, 7);
    const colors = ['#000000', '#777777', '#ffffff'], full = quantize(source, colors, 128, undefined, undefined, { metric }), small = quantize(source, colors, 128, 4, 3, { metric });
    const expected = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) expected.push(full.indices[Math.floor((y + .5) * 7 / 3) * 11 + Math.floor((x + .5) * 11 / 4)]);
    expect([...small.indices]).toEqual(expected);
    expect(() => quantize(source, colors, 128, 12, 7)).toThrow();
  });

  it.each(['oklab', 'rgb'])('cancels before allocation and between long tasks using %s, without returning partial output', async metric => {
    const controller = new AbortController(); controller.abort();
    await expect(quantizeAsync(image([[0, 0, 0, 255]]), ['#000000'], 128, undefined, undefined, { metric, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const during = new AbortController();
    await expect(quantizeAsync(image(Array.from({ length: 50000 }, (_, i) => [i & 255, i >> 8 & 255, i >> 16, 255])), ['#000000'], 128, undefined, undefined, { metric, signal: during.signal, onProgress: () => during.abort() })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('defaults to Oklab and deliberately differs from encoded RGB for mid-gray', () => {
    const source = image([[100, 100, 100, 255]]), colors = ['#000000', '#ffffff'];
    expect([...quantize(source, colors).indices]).toEqual([1]);
    expect(quantize(source, colors)).toEqual(quantize(source, colors, 128, undefined, undefined, { metric: 'oklab' }));
    expect([...quantize(source, colors, 128, undefined, undefined, { metric: 'rgb' }).indices]).toEqual([0]);
  });

  it('retains earliest entries at exact distance ties in both metrics', () => {
    // Below the sRGB linear toe, gray8 has exactly twice gray1's Oklab
    // coordinates. Gray1 is the exact midpoint of gray0 and gray8.
    const dark = referenceLab([1, 1, 1]), light = referenceLab([8, 8, 8]);
    expect(light).toEqual(dark.map(v => v * 2));
    for (const colors of [['#000000', '#080808'], ['#080808', '#000000']]) expect([...quantize(image([[1, 1, 1, 255]]), colors).indices]).toEqual([0]);
    for (const colors of [['#000000', '#000002'], ['#000002', '#000000']]) expect([...quantize(image([[1, 1, 1, 255]]), colors, 128, undefined, undefined, { metric: 'rgb' }).indices]).toEqual([0]);
  });

  it('keeps repeated RGB memoization independent of metric when reusing a prepared palette', async () => {
    const prepared = preparePalette(['#000000', '#ffffff']), source = image(Array.from({ length: 3000 }, () => [100, 100, 100, 255]));
    for (const metric of ['oklab', 'rgb', 'oklab', 'rgb']) {
      const expected = Array(3000).fill(metric === 'rgb' ? 0 : 1);
      expect([...quantize(source, prepared, 128, undefined, undefined, { metric }).indices]).toEqual(expected);
      expect([...((await quantizeAsync(source, prepared, 128, undefined, undefined, { metric })).indices)]).toEqual(expected);
    }
  });

  it('captures async metric options rather than reading mutable options during later chunks', async () => {
    // First chunk contains only exact anchors: the later gray witness has not
    // entered the memo when options mutate, so caching cannot conceal a reread.
    const source = image(Array.from({ length: 20000 }, (_, i) => i < 2048 ? [0, 0, 0, 255] : [100, 100, 100, 255]));
    const progress = [], options = { metric: 'rgb', chunkPixels: 2048, onProgress: value => { progress.push(value); options.metric = 'oklab'; } };
    let clock = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock += 9);
    try {
      expect([...((await quantizeAsync(source, ['#000000', '#ffffff'], 128, undefined, undefined, options)).indices)]).toEqual(Array(20000).fill(0));
      expect(progress.length).toBeGreaterThanOrEqual(2);
      expect(progress[0]).toBeLessThan(1);
      expect(progress.at(-1)).toBe(1);
    } finally { now.mockRestore(); }
  });

  it('rejects unsupported matching metrics in sync and async jobs', async () => {
    const source = image([[1, 2, 3, 255]]);
    for (const metric of [null, '', 'RGB', 'linear-rgb', 'lab', 1, {}, []]) {
      expect(() => quantize(source, ['#000000'], 128, undefined, undefined, { metric })).toThrow('Matching metric');
      await expect(quantizeAsync(source, ['#000000'], 128, undefined, undefined, { metric })).rejects.toThrow('Matching metric');
    }
  });

  it('rejects malformed palettes, dimensions and invalid alpha bounds', () => {
    const source = image([[1, 2, 3, 255]]);
    for (const colors of [[], ['#12345678'], Array.from({ length: 257 }, (_, i) => hex(i))]) expect(() => quantize(source, colors)).toThrow();
    for (const cut of [0, 256, NaN, .5]) expect(() => quantize(source, ['#000000'], cut)).toThrow();
    expect(() => quantize({ width: 2, height: 1, data: source.data }, ['#000000'])).toThrow();
  });
});
