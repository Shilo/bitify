import { describe, expect, it, vi } from 'vitest';
import { colorize, EMPTY_INDEX, preparePalette, quantize, quantizeAsync, quantizePreviewAsync } from './quantize.js';
import { normalizeDither, normalizeDitherStrength } from './palette-dither-settings.js';

const modes = ['2x2', '4x4', '8x8'];
const colors = ['#000000', '#242424', '#484848', '#6d6d6d', '#919191', '#b6b6b6', '#dadada', '#ffffff'];
const rgb = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
function image(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return { width, height, data };
}
const ramp = image(128, 64, x => { const v = Math.round(x * 255 / 127); return [v, v, v, 255]; });
const linear = n => n <= .04045 * 255 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4;
// Independent grayscale tone test: average emitted linear light, then compare
// perceptual lightness after spatial integration. This does not rate sprite art.
function blockError(source, output, side = 8) {
  let sum = 0;
  for (let y = 0; y < source.height; y += side) for (let x = 0; x < source.width; x += side) {
    let a = 0, b = 0;
    for (let j = y; j < y + side; j++) for (let i = x; i < x + side; i++) {
      const p = (j * source.width + i) * 4;
      a += linear(source.data[p]); b += linear(output.data[p]);
    }
    sum += (Math.cbrt(a / (side * side)) - Math.cbrt(b / (side * side))) ** 2;
  }
  return sum;
}

describe('full-palette ordered dithering', () => {
  it('normalizes missing and malformed stored settings to Off and default strength', () => {
    for (const value of [undefined, null, '', 'ordered', '4', 4, {}, []]) expect(normalizeDither(value)).toBe('none');
    for (const mode of modes) expect(normalizeDither(mode)).toBe(mode);
    for (const value of [undefined, null, '', '50', -1, 101, NaN, .5]) expect(normalizeDitherStrength(value)).toBe(50);
    for (const strength of [0, 1, 50, 100]) expect(normalizeDitherStrength(strength)).toBe(strength);
  });

  it.each(['oklab', 'rgb'])('keeps Off and zero-strength byte-identical to nearest (%s)', async metric => {
    const source = image(71, 43, (x, y) => [(x * 79 + y * 3) & 255, (x * 29 + y * 91) & 255, (x * 3 + y * 37) & 255, [0, 127, 128, 255][(x + y) % 4]]);
    const expected = quantize(source, colors, 128, undefined, undefined, { metric });
    expect(quantize(source, colors, 128, undefined, undefined, { metric, dither: 'none', ditherStrength: 100 })).toEqual(expected);
    for (const dither of modes) {
      expect(quantize(source, colors, 128, undefined, undefined, { metric, dither, ditherStrength: 0 })).toEqual(expected);
      expect(await quantizeAsync(source, colors, 128, undefined, undefined, { metric, dither, ditherStrength: 0 })).toEqual(expected);
    }
  });

  it.each(modes)('%s protects all 256 exact target entries and separates transparency', dither => {
    const palette = Array.from({ length: 256 }, (_, i) => '#' + (i * 65793).toString(16).padStart(6, '0'));
    const source = image(257, 1, x => x === 256 ? [255, 0, 0, 127] : [...rgb(palette[x]), 128]);
    for (const metric of ['oklab', 'rgb']) for (const ditherStrength of [1, 50, 100]) {
      const result = quantize(source, preparePalette(palette), 128, undefined, undefined, { metric, dither, ditherStrength });
      expect([...result.indices]).toEqual([...Array.from({ length: 256 }, (_, i) => i), EMPTY_INDEX]);
      expect(result.hasTransparency).toBe(true);
      expect([...result.used]).toEqual(Array(256).fill(1));
    }
  });

  it.each(modes)('%s preserves alpha boundaries and active subset membership for irregular targets', dither => {
    const palette = ['#190038', '#b30018', '#2de2a4', '#f5cd34'];
    const source = image(73, 29, (x, y) => [(x * 79 + y) & 255, (y * 91 + x) & 255, (x * 73 + y * 17) & 255, [0, 1, 126, 127, 128, 129, 254, 255][(x + y) % 8]]);
    for (const cut of [1, 128, 255]) for (const metric of ['oklab', 'rgb']) {
      const result = quantize(source, palette, cut, undefined, undefined, { metric, dither, ditherStrength: 100 });
      const output = colorize(result, palette);
      for (let i = 0; i < result.indices.length; i++) {
        expect(result.indices[i] === EMPTY_INDEX).toBe(source.data[i * 4 + 3] < cut);
        expect(output.data[i * 4 + 3]).toBe(source.data[i * 4 + 3] < cut ? 0 : 255);
        if (result.indices[i] !== EMPTY_INDEX) expect(result.indices[i]).toBeLessThan(palette.length);
      }
    }
    const single = quantize(source, [palette[0]], 128, undefined, undefined, { dither, ditherStrength: 100 });
    expect(single).toEqual(quantize(source, [palette[0]]));
  });

  it.each(modes)('%s uses source sample coordinates, independent of preview size and async slices', async dither => {
    const source = image(97, 61, (x, y) => [(x * 7) & 255, (y * 11) & 255, ((x + y) * 9) & 255, (x + y) % 5 ? 255 : 127]);
    for (const metric of ['oklab', 'rgb']) {
      const options = { metric, dither, ditherStrength: 73 };
      const full = quantize(source, colors, 128, undefined, undefined, options);
      const small = quantize(source, colors, 128, 23, 17, options), expected = [];
      for (let y = 0; y < 17; y++) for (let x = 0; x < 23; x++) expected.push(full.indices[Math.floor((y + .5) * 61 / 17) * 97 + Math.floor((x + .5) * 97 / 23)]);
      expect([...small.indices]).toEqual(expected);
      expect(await quantizeAsync(source, colors, 128, 23, 17, { ...options, chunkPixels: 128 })).toEqual(small);
      expect(await quantizePreviewAsync(source, colors, 128, 23, 17, options)).toEqual(small);
    }
  });

  it.each(modes)('%s leaves every unchanged animation coordinate stable after one source pixel changes', dither => {
    const source = image(96, 64, (x, y) => [90 + (x % 5) * 10, 31 + (y % 7) * 11, 116, 255]);
    const changed = { ...source, data: source.data.slice() };
    changed.data.set([250, 0, 13, 255], 0);
    const palette = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffffff', '#615661', '#33314c', '#c67f83'];
    const options = { dither, ditherStrength: 100 };
    const original = quantize(source, palette, 128, undefined, undefined, options);
    const next = quantize(changed, palette, 128, undefined, undefined, options);
    expect(next.indices.slice(1)).toEqual(original.indices.slice(1));
  });

  it.each(modes)('%s improves integrated grayscale shading at full strength', dither => {
    const nearest = colorize(quantize(ramp, colors), colors);
    const patterned = colorize(quantize(ramp, colors, 128, undefined, undefined, { dither, ditherStrength: 100 }), colors);
    expect(blockError(ramp, patterned)).toBeLessThan(blockError(ramp, nearest) * .75);
    expect(patterned.data).not.toEqual(nearest.data);
  });

  it('avoids distant alternating colors when a dark ramp has a useful nearby gray', () => {
    const source = image(64, 64, x => [x, x, x, 255]);
    const palette = ['#000000', '#404040', '#ff00ff', '#00ff00', '#ffffff'];
    const result = quantize(source, palette, 128, undefined, undefined, { dither: '8x8', ditherStrength: 100 });
    expect([...result.used]).toEqual([1, 1, 0, 0, 0, ...Array(251).fill(0)]);
  });

  it('uses the canonical 4x4 Bayer phase for a uniform gray', () => {
    const source = image(4, 4, () => [188, 188, 188, 255]);
    const result = quantize(source, ['#000000', '#ffffff'], 128, undefined, undefined, { dither: '4x4', ditherStrength: 100 });
    // Nine white pixels: the point-distortion penalty slightly favors the
    // perceptually nearer white over a perfectly half-white occupancy.
    expect([...result.indices]).toEqual([0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0]);
  });

  it('captures dither settings before yielding and cancels without partial publication', async () => {
    const source = image(256, 96, (x, y) => [(x * 11 + y) & 255, (x + y * 19) & 255, (x * 31 + y * 7) & 255, 255]);
    const options = { dither: '4x4', ditherStrength: 100 };
    const expected = quantize(source, colors, 128, undefined, undefined, options);
    const preview = quantizePreviewAsync(source, colors, 128, undefined, undefined, options);
    options.dither = 'none'; options.ditherStrength = 0;
    expect(await preview).toEqual(expected);
    const controller = new AbortController(); controller.abort();
    let reads = 0;
    const unread = { width: 1, height: 1, get data() { reads++; return Uint8ClampedArray.of(10, 10, 10, 255); } };
    await expect(quantizeAsync(unread, colors, 128, undefined, undefined, { dither: '4x4', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(reads).toBe(0);
    const during = new AbortController(); let progress = 0;
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => clock += 9);
    try {
      await expect(quantizeAsync(source, colors, 128, undefined, undefined, { dither: '8x8', signal: during.signal, onProgress: value => { progress = value; during.abort(); } })).rejects.toMatchObject({ name: 'AbortError' });
      expect(progress).toBeGreaterThan(0); expect(progress).toBeLessThan(1);
    } finally { now.mockRestore(); }
  });
});
