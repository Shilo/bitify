import { describe, it, expect } from 'vitest';
import { analyze, unify, mask, colorize, otsu, hexToRgb, brightness } from './bitify.js';

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

  it('records the darkest and lightest brightness of the solid pixels', () => {
    const img = image(['a bc'], { a: grey(240), b: grey(20), c: grey(120) });
    expect([img.lo, img.hi]).toEqual([20, 240]);
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

  // A column of the darkest color, four of a middle color, a column of the lightest.
  const three = () => image(Array(4).fill('abbbbc'), { a: grey(20), b: grey(120), c: grey(240) });

  it('checker: the middle color becomes a checkerboard', () => {
    expect(show(mask(three(), 'checker', 120), 6)).toEqual(['##.#..', '#.#.#.', '##.#..', '#.#.#.']);
  });

  it('bayer: the middle color lights exactly half of a 4x4 cell', () => {
    const m = mask(three(), 'bayer', 120);
    expect(count(m, 2)).toBe(4 + 8); // the lightest column, and half of the middle block
    expect(show(m, 6)).toEqual(['##.#..', '#.#.#.', '##.#..', '#.#.#.']);
  });

  it('checker and bayer: the darkest color stays dark and the lightest stays light', () => {
    for (const style of ['checker', 'bayer']) for (const t of [null, 30, 120, 230]) {
      const rows = show(mask(three(), style, t), 6);
      expect(rows.map(r => r[0] + r[5])).toEqual(['#.', '#.', '#.', '#.']);
    }
  });

  it('checker and bayer: a color at the threshold is dark when nothing is darker', () => {
    // the darkest color sits exactly on the cut, as it does for an outline under a low Auto
    const img = image(['aabb', 'aabb'], { a: grey(35), b: grey(245) });
    for (const style of ['checker', 'bayer']) expect(show(mask(img, style, 35), 4)).toEqual(['##..', '##..']);
  });

  it('checker, bayer and atkinson: an image of one color has no range and stays flat', () => {
    const flat = () => image(['aaaa', 'aaaa', 'aaaa', 'aaaa'], { a: grey(128) });
    for (const style of ['checker', 'bayer', 'atkinson']) {
      expect(count(mask(flat(), style, 50), 2)).toBe(16); // above the threshold: light
      expect(count(mask(flat(), style, 128), 1)).toBe(16); // at or below it: dark
      expect(count(mask(flat(), style, 200), 1)).toBe(16);
      expect(count(mask(flat(), style), 2)).toBe(16); // Auto falls back to 127
    }
  });

  it('atkinson: flat white and black stay flat, a middle color mixes both colors', () => {
    const flat = Array(8).fill('aaaaaaaa');
    expect(count(mask(image(flat, { a: grey(255) }), 'atkinson', 128), 2)).toBe(64);
    expect(count(mask(image(flat, { a: grey(0) }), 'atkinson', 128), 1)).toBe(64);
    // a darkest column, an 8x8 block of a middle color, a lightest column
    const rows = show(mask(image(Array(8).fill('abbbbbbbbc'), { a: grey(20), b: grey(120), c: grey(240) }), 'atkinson', 120), 10);
    const light = rows.map(r => r.slice(1, 9)).join('').split('.').length - 1;
    expect(light).toBeGreaterThan(16);
    expect(light).toBeLessThan(48);
    expect(rows.map(r => r[0] + r[9])).toEqual(Array(8).fill('#.'));
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

  it('ranks colors by brightness, green counting most', () => {
    expect(brightness('#000000')).toBe(0);
    expect(brightness('#ffffff')).toBeCloseTo(255);
    expect(brightness('#00ff00')).toBeGreaterThan(brightness('#ff00ff'));
  });

  it('paints first and second color opaque and leaves empty pixels transparent', () => {
    expect([...colorize(Uint8Array.of(0, 1, 2), '#ff0000', '#0000ff')]).toEqual([0, 0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 255]);
  });
});

describe('lines', () => {
  // A 7x7 body on a transparent canvas, with a 3x3 part in its middle.
  const sprite = part => image([
    '         ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    '         ',
  ], { a: grey(200), b: grey(part) });

  it('outlines an inner part as well as the silhouette', () => {
    expect(show(mask(sprite(60), 'lines', 50), 9)).toEqual([
      '         ',
      ' ####### ',
      ' #.....# ',
      ' #.###.# ',
      ' #.#.#.# ',
      ' #.###.# ',
      ' #.....# ',
      ' ####### ',
      '         ',
    ]);
  });

  it('ignores a shading step that is not stronger than the threshold', () => {
    expect(show(mask(sprite(180), 'lines', 50), 9)).toEqual([
      '         ',
      ' ####### ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' #.....# ',
      ' ####### ',
      '         ',
    ]);
  });

  it('draws a one-pixel boundary between two colors of equal brightness', () => {
    const img = image(['rrgg'], { r: [255, 0, 0], g: grey(54) });
    expect([...img.lum]).toEqual([54, 54, 54, 54]);
    expect(show(mask(img, 'lines', 50), 4)).toEqual(['.#..']);
  });

  it('frames an image only when it has empty pixels', () => {
    const flat = image(['aaa', 'aaa', 'aaa'], { a: grey(200) });
    expect(show(mask(flat, 'lines', 50), 3)).toEqual(['...', '...', '...']);
    const cut = image([' aa', 'aaa', 'aaa'], { a: grey(200) });
    expect(show(mask(cut, 'lines', 50), 3)).toEqual([' ##', '#.#', '###']);
  });

  it('auto separates part boundaries from soft shading', () => {
    const img = image(['abcd'], { a: grey(200), b: grey(180), c: grey(160), d: grey(10) });
    expect(img.autoLine).toBeGreaterThanOrEqual(20);
    expect(img.autoLine).toBeLessThan(150);
    expect(show(mask(img, 'lines'), 4)).toEqual(['...#']);
  });

  it('auto does not take soft shading for boundaries', () => {
    // every neighbour differs by 4: a gradient with no parts
    const img = image([
      '       ',
      ' abcde ',
      ' bcdef ',
      ' cdefg ',
      ' defgh ',
      ' efghi ',
      '       ',
    ], Object.fromEntries([...'abcdefghi'].map((ch, i) => [ch, grey(100 + 4 * i)])));
    expect(img.autoLine).toBe(24);
    expect(show(mask(img, 'lines'), 7)).toEqual([
      '       ',
      ' ##### ',
      ' #...# ',
      ' #...# ',
      ' #...# ',
      ' ##### ',
      '       ',
    ]);
  });

  it('survives an image with no solid pixels, and a large non-square one', () => {
    const none = image(['  ', '  '], {});
    expect(none.autoLine).toBe(24);
    expect(show(mask(none, 'lines'), 2)).toEqual(['  ', '  ']);

    const w = 300, h = 200, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i++) data[i] = (i * 2654435761) >>> 24;
    const m = mask(analyze({ width: w, height: h, data }), 'lines');
    expect(m.length).toBe(w * h);
    expect(m.every((v, p) => (v === 0) === (data[p * 4 + 3] < 128))).toBe(true);
  });
});

describe('unify', () => {
  it('gives every frame of an animation the same thresholds, picked from all frames together', () => {
    // on their own these two frames would be cut at 10 and at 150
    const dark = image(['aabb'], { a: grey(10), b: grey(60) }), light = image(['aabb'], { a: grey(150), b: grey(240) });
    expect([dark.auto, light.auto]).toEqual([10, 150]);
    unify([dark, light]);
    expect([dark.auto, light.auto]).toEqual([60, 60]);
    // so a pixel keeps its color from one frame to the next
    expect(show(mask(dark, 'solid'), 4)).toEqual(['####']);
    expect(show(mask(light, 'solid'), 4)).toEqual(['....']);
  });

  it('shares the Lines threshold and whether the canvas edge counts as empty', () => {
    const soft = image(['abab', 'baba'], { a: grey(200), b: grey(180) }), hard = image(['ab  ', 'ba  '], { a: grey(200), b: grey(20) });
    expect([soft.hasAlpha, hard.hasAlpha]).toEqual([false, true]);
    unify([soft, hard]);
    expect(soft.autoLine).toBe(hard.autoLine);
    expect(soft.autoLine).toBeGreaterThanOrEqual(20);
    expect(soft.autoLine).toBeLessThan(180);
    expect([soft.hasAlpha, hard.hasAlpha]).toEqual([true, true]);
  });

  it('leaves a single image as it was', () => {
    const one = image(['aabb'], { a: grey(50), b: grey(200) }), before = [one.auto, one.autoLine, one.hasAlpha];
    unify([one]);
    expect([one.auto, one.autoLine, one.hasAlpha]).toEqual(before);
  });

  it('shares the darkest and lightest brightness, so patterns match from frame to frame', () => {
    const dark = image(['aabb'], { a: grey(10), b: grey(60) }), light = image(['aabb'], { a: grey(150), b: grey(240) });
    unify([dark, light]);
    expect([dark.lo, dark.hi, light.lo, light.hi]).toEqual([10, 240, 10, 240]);
    // 60 is the shared cut and 10 the shared darkest: the first frame is not stretched to its own range
    expect(show(mask(dark, 'bayer'), 4)).toEqual(['##.#']);
    expect(show(mask(light, 'bayer'), 4)).toEqual(['....']);
  });
});
