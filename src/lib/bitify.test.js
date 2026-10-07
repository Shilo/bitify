import { describe, it, expect } from 'vitest';
import { analyze, mask, colorize, otsu, hexToRgb } from './bitify.js';

// Builds an analysed image from rows of characters. Each character maps to [r, g, b] or
// [r, g, b, a] in `pal`; a character that is not in `pal` is an empty (transparent) pixel.
function image(rows, pal) {
  const h = rows.length, w = rows[0].length, data = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = pal[ch];
    if (c) data.set([c[0], c[1], c[2], c[3] ?? 255], (y * w + x) * 4);
  }));
  return analyze({ width: w, height: h, data });
}
const grey = v => [v, v, v];
// Renders a mask as rows of text: ' ' empty, '#' first color, '.' second color.
const show = (m, w) =>
  Array.from({ length: m.length / w }, (_, y) => [...m.slice(y * w, (y + 1) * w)].map(v => ' #.'[v]).join(''));
const count = (m, v) => m.filter(x => x === v).length;

describe('analyze', () => {
  it('records size, brightness and whether any pixel is empty', () => {
    const img = image(['a b'], { a: grey(255), b: grey(0) });
    expect([img.w, img.h, img.hasAlpha]).toEqual([3, 1, true]);
    expect([...img.lum]).toEqual([255, 0, 0]);
    expect(image(['ab'], { a: grey(255), b: grey(0) }).hasAlpha).toBe(false);
  });

  it('treats alpha below 128 as empty and 128 or more as solid', () => {
    const img = image(['ab'], { a: [200, 200, 200, 127], b: [200, 200, 200, 128] });
    expect(show(mask(img, 'silhouette'), 2)).toEqual([' #']);
  });

  it('picks an auto threshold between two brightness groups', () => {
    const img = image(['aabb'], { a: grey(50), b: grey(200) });
    expect(img.auto).toBeGreaterThanOrEqual(50);
    expect(img.auto).toBeLessThan(200);
  });

  it('survives an image with no solid pixels', () => {
    const img = image(['  ', '  '], {});
    expect(img.auto).toBe(127);
    for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      expect(show(mask(img, style), 2)).toEqual(['  ', '  ']);
    }
  });
});

describe('otsu', () => {
  it('returns the fallback for an empty histogram', () => {
    expect(otsu(new Array(256).fill(0), 42)).toBe(42);
  });
});

describe('mask', () => {
  it('solid: brighter than the threshold is second color, the rest first', () => {
    const img = image(['abc'], { a: grey(0), b: grey(100), c: grey(200) });
    expect(show(mask(img, 'solid', 100), 3)).toEqual(['##.']);
  });

  it('solid: uses the auto threshold when none is given', () => {
    const img = image(['aabb'], { a: grey(50), b: grey(200) });
    expect(show(mask(img, 'solid'), 4)).toEqual(['##..']);
  });

  it('checker: a mid-tone becomes a checkerboard, extremes stay flat', () => {
    const mid = image(['aaaa', 'aaaa'], { a: grey(128) });
    expect(show(mask(mid, 'checker', 128), 4)).toEqual(['.#.#', '#.#.']);
    const light = image(['aaaa', 'aaaa'], { a: grey(250) });
    expect(show(mask(light, 'checker', 128), 4)).toEqual(['....', '....']);
    const dark = image(['aaaa', 'aaaa'], { a: grey(5) });
    expect(show(mask(dark, 'checker', 128), 4)).toEqual(['####', '####']);
  });

  it('bayer: a mid-tone lights exactly half of each 4x4 cell', () => {
    const img = image(['aaaa', 'aaaa', 'aaaa', 'aaaa'], { a: grey(128) });
    expect(count(mask(img, 'bayer', 128), 2)).toBe(8);
  });

  it('atkinson: flat white and black stay flat, a mid-tone mixes both colors', () => {
    const rows = Array(8).fill('aaaaaaaa');
    expect(count(mask(image(rows, { a: grey(255) }), 'atkinson', 128), 2)).toBe(64);
    expect(count(mask(image(rows, { a: grey(0) }), 'atkinson', 128), 1)).toBe(64);
    const light = count(mask(image(rows, { a: grey(128) }), 'atkinson', 128), 2);
    expect(light).toBeGreaterThan(16);
    expect(light).toBeLessThan(48);
  });

  it('silhouette: every solid pixel is first color', () => {
    const img = image([' a ', 'bcb'], { a: grey(255), b: grey(0), c: grey(128) });
    expect(show(mask(img, 'silhouette'), 3)).toEqual([' # ', '###']);
  });

  it('keeps empty pixels empty and fills the rest, on a large non-square image', () => {
    const w = 300, h = 200, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 2654435761) >>> 24;
    const img = analyze({ width: w, height: h, data });
    for (const style of ['solid', 'checker', 'bayer', 'atkinson', 'silhouette']) {
      const m = mask(img, style);
      expect(m.length).toBe(w * h);
      expect(m.every((v, p) => (v === 0) === (data[p * 4 + 3] < 128))).toBe(true);
    }
  });
});

describe('colorize', () => {
  it('reads #rrggbb', () => {
    expect(hexToRgb('#f6dfa4')).toEqual([246, 223, 164]);
  });

  it('paints first and second color opaque and leaves empty pixels transparent', () => {
    expect([...colorize(Uint8Array.of(0, 1, 2), '#ff0000', '#0000ff')]).toEqual([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 255]);
  });
});
