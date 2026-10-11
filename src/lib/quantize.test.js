import { describe, it, expect } from 'vitest';
import { preparePalette, quantize, quantizeAsync, colorize, EMPTY_INDEX } from './quantize.js';

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
function reference(pixel, colors, cut = 128) {
  if (pixel[3] < cut) return 256;
  const exact = colors.indexOf('#' + pixel.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join(''));
  if (exact >= 0) return exact;
  const value = referenceLab(pixel.slice(0, 3));
  const distances = colors.map(color => referenceLab([1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))))
    .map(lab => lab.reduce((sum, n, i) => sum + (n - value[i]) ** 2, 0));
  return distances.indexOf(Math.min(...distances));
}

describe('full palette quantization', () => {
  it('retains exact palette membership and a separate empty index with all 256 colors', () => {
    const colors = Array.from({ length: 256 }, (_, i) => hex(i * 65793));
    const pixels = colors.map(c => [...[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), 255]);
    pixels.push([13, 24, 35, 0]);
    const result = quantize(image(pixels), colors);
    expect([...result.indices]).toEqual([...Array.from({ length: 256 }, (_, i) => i), EMPTY_INDEX]);
    expect(result.hasTransparency).toBe(true);
    expect([...result.used]).toEqual(Array(256).fill(1));
    expect([...colorize(result, colors).data]).toEqual([...pixels.slice(0, 256).flat(), 0, 0, 0, 0]);
  });

  it('uses the alpha boundary and handles one-color/fully empty results', () => {
    const result = quantize(image([0, 1, 127, 128, 255].map(a => [80, 120, 150, a])), ['#123456']);
    expect([...result.indices]).toEqual([256, 256, 256, 0, 0]);
    expect([...quantize(image([[0, 0, 0, 0]]), ['#123456']).used]).toEqual(Array(256).fill(0));
  });

  it('snapshots prepared palette contents instead of exposing mutable conversion arrays', () => {
    const colors = ['#abcdef', '#123456'], prepared = preparePalette(colors);
    colors[0] = '#000000';
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(() => { prepared.colors[0] = '#ffffff'; }).toThrow();
    expect([...colorize(quantize(image([[171, 205, 239, 255]]), prepared), prepared).data]).toEqual([171, 205, 239, 255]);
  });

  it('agrees with an independent scalar reference across palette sizes, entropy and alpha', async () => {
    let seed = 12345;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 8 & 255; };
    for (const count of [1, 2, 16, 64, 255, 256]) {
      const colors = Array.from({ length: count }, (_, i) => hex(i * 65111));
      const pixels = Array.from({ length: 1600 }, (_, i) => [random(), random(), random(), [0, 1, 127, 128, 255][i % 5]]);
      const source = image(pixels, 40, 40), expected = pixels.map(pixel => reference(pixel, colors));
      expect([...quantize(source, colors).indices], `palette size ${count}`).toEqual(expected);
      expect([...await quantizeAsync(source, colors).then(result => result.indices)]).toEqual(expected);
      // Cache-rich input repeats exact/nonexact colors after noisy bypass candidates.
      const repeated = image(Array.from({ length: 1500 }, (_, i) => pixels[i % 7]));
      expect([...quantize(repeated, colors).indices]).toEqual(Array.from({ length: 1500 }, (_, i) => expected[i % 7]));
    }
  });

  it('samples odd rectangular images at the same center spread coordinates as full conversion', () => {
    const source = image(Array.from({ length: 77 }, (_, i) => [i * 3, i * 2, i, 255]), 11, 7);
    const colors = ['#000000', '#777777', '#ffffff'], full = quantize(source, colors), small = quantize(source, colors, 128, 4, 3);
    const expected = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) expected.push(full.indices[Math.floor((y + .5) * 7 / 3) * 11 + Math.floor((x + .5) * 11 / 4)]);
    expect([...small.indices]).toEqual(expected);
    expect(() => quantize(source, colors, 128, 12, 7)).toThrow();
  });

  it('cancels before allocation and between long conversion tasks, without returning partial output', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(quantizeAsync(image([[0, 0, 0, 255]]), ['#000000'], 128, undefined, undefined, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const during = new AbortController();
    await expect(quantizeAsync(image(Array.from({ length: 50000 }, (_, i) => [i & 255, i >> 8 & 255, i >> 16, 255])), ['#000000'], 128, undefined, undefined, { signal: during.signal, onProgress: () => during.abort() })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects malformed palettes, dimensions and invalid alpha bounds', () => {
    const source = image([[1, 2, 3, 255]]);
    for (const colors of [[], ['#12345678'], Array.from({ length: 257 }, (_, i) => hex(i))]) expect(() => quantize(source, colors)).toThrow();
    for (const cut of [0, 256, NaN, .5]) expect(() => quantize(source, ['#000000'], cut)).toThrow();
    expect(() => quantize({ width: 2, height: 1, data: source.data }, ['#000000'])).toThrow();
  });
});
