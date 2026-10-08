import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyze, unify, mask, shrink, colorize, otsu, hexToRgb, brightness, autoThreshold, previewBall } from './bitify.js';
import { STYLE_SETTINGS, defaults } from './settings.js';

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

  it('centers the pattern styles between the dark group and the light group', () => {
    // dark group 20 and 34 (mean 27), light group 200: Otsu cuts at 34, the center is halfway between the means
    const img = image(['aabbcccc'], { a: grey(20), b: grey(34), c: grey(200) });
    expect([img.auto, img.autoTone]).toEqual([34, 114]);
    expect(image(['  ', '  '], {}).autoTone).toBe(127);
  });

  it('gives each style the Auto value it uses', () => {
    const img = image(['aabbcccc'], { a: grey(20), b: grey(34), c: grey(200) });
    expect(autoThreshold(img, 'lines')).toBe(img.autoLine);
    for (const style of ['cutout', 'solid']) expect(autoThreshold(img, style)).toBe(img.auto);
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) expect(autoThreshold(img, style)).toBe(img.autoTone);
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
    for (const style of ['cutout', 'solid', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']) {
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

  it('hatch: a middle color becomes diagonal lines, wide for a darker one and thin for a lighter one', () => {
    // tone 0.5: light only where (x + y) mod 3 is 2, so two diagonals in three are dark
    expect(show(mask(three(), 'hatch', 120), 6)).toEqual(['##.##.', '#.##..', '###.#.', '##.##.']);
    // tone about 0.7: dark only where (x + y) mod 3 is 0, one diagonal in three
    const lighter = image(Array(4).fill('abbbbc'), { a: grey(20), b: grey(170), c: grey(240) });
    expect(show(mask(lighter, 'hatch', 120), 6)).toEqual(['#..#..', '#.#...', '##..#.', '#..#..']);
  });

  it('noise: a middle color lights exactly half of a 16x16 cell, and a lighter one lights those and more', () => {
    // a darkest column, a 16x16 block of one color, a lightest column
    const block = b => image(Array(16).fill('a' + 'b'.repeat(16) + 'c'), { a: grey(20), b: grey(b), c: grey(240) });
    const half = mask(block(120), 'noise', 120), more = mask(block(170), 'noise', 120);
    expect(count(half, 2)).toBe(16 + 128);
    expect(count(more, 2)).toBeGreaterThan(16 + 128);
    expect(half.every((v, p) => v !== 2 || more[p] === 2)).toBe(true);
    // no regular order: the lit cells of a row are not the same in every row, as they would be in stripes
    const rows = show(half, 18);
    expect(new Set(rows).size).toBe(16);
  });

  it('checker and bayer: the darkest color stays dark and the lightest stays light', () => {
    for (const style of ['checker', 'hatch', 'bayer', 'noise']) for (const t of [null, 30, 120, 230]) {
      const rows = show(mask(three(), style, t), 6);
      expect(rows.map(r => r[0] + r[5])).toEqual(['#.', '#.', '#.', '#.']);
    }
  });

  it('checker and bayer: a color at the threshold is dark when nothing is darker', () => {
    // the darkest color sits exactly on the cut, as it does for an outline under a low Auto
    const img = image(['aabb', 'aabb'], { a: grey(35), b: grey(245) });
    for (const style of ['checker', 'hatch', 'bayer', 'noise']) expect(show(mask(img, style, 35), 4)).toEqual(['##..', '##..']);
  });

  it('checker, bayer and atkinson: at Auto the lighter shade of a two-shade outline is not half patterned', () => {
    // Otsu's cut lands on the lighter outline shade; centered there, that shade would be half patterned
    const img = image(Array(4).fill('abccccba'), { a: grey(20), b: grey(34), c: grey(200) });
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) expect(show(mask(img, style), 8)).toEqual(Array(4).fill('##....##'));
  });

  it('checker, bayer and atkinson: an image of one color has no range and stays flat', () => {
    const flat = () => image(['aaaa', 'aaaa', 'aaaa', 'aaaa'], { a: grey(128) });
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
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
    for (const style of ['cutout', 'solid', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']) for (const t of [null, 1, 254]) {
      const m = mask(img, style, t);
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

describe('cutout', () => {
  // A 7x7 body on a transparent canvas, with a 3x3 part in its middle.
  const sprite = (body, part) => image([
    '         ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aabbbaa ',
    ' aaaaaaa ',
    ' aaaaaaa ',
    '         ',
  ], { a: grey(body), b: grey(part) });

  it('fills bright parts and leaves dark parts dark, with no outline', () => {
    expect(show(mask(sprite(200, 120), 'cutout'), 9)).toEqual([
      '         ',
      ' ....... ',
      ' ....... ',
      ' ..###.. ',
      ' ..###.. ',
      ' ..###.. ',
      ' ....... ',
      ' ....... ',
      '         ',
    ]);
  });

  it('cuts a dark seam, one pixel wide, between two light parts', () => {
    expect(show(mask(sprite(200, 120), 'cutout', 100), 9)).toEqual([
      '         ',
      ' ....... ',
      ' ....... ',
      ' ..###.. ',
      ' ..#.#.. ',
      ' ..###.. ',
      ' ....... ',
      ' ....... ',
      '         ',
    ]);
  });

  it('gives a dark part a light rim, and a light seam between two dark parts', () => {
    expect(show(mask(sprite(60, 10), 'cutout', 100), 9)).toEqual([
      '         ',
      ' ....... ',
      ' .#####. ',
      ' .#...#. ',
      ' .#.#.#. ',
      ' .#...#. ',
      ' .#####. ',
      ' ....... ',
      '         ',
    ]);
  });

  it('ignores a shading step that is not stronger than the seam strength', () => {
    const img = sprite(200, 185);
    expect(img.autoSeam).toBe(24);
    expect(count(mask(img, 'cutout', 100), 1)).toBe(0);
  });

  it('keeps a dark outline around a light part', () => {
    const img = image([
      '       ',
      ' kkkkk ',
      ' kaaak ',
      ' kaaak ',
      ' kaaak ',
      ' kkkkk ',
      '       ',
    ], { k: grey(20), a: grey(220) });
    expect(show(mask(img, 'cutout'), 7)).toEqual([
      '       ',
      ' ##### ',
      ' #...# ',
      ' #...# ',
      ' #...# ',
      ' ##### ',
      '       ',
    ]);
  });

  it('never cuts a light pixel on the silhouette', () => {
    const ring = (edge, inside) => image([
      '       ',
      ' eeeee ',
      ' eiiie ',
      ' eiiie ',
      ' eiiie ',
      ' eeeee ',
      '       ',
    ], { e: grey(edge), i: grey(inside) });
    // the darker light color is on the outside: it would be a seam, but it is the silhouette
    expect(count(mask(ring(180, 250), 'cutout', 100), 1)).toBe(0);
    // the same two colors the other way round: the darker one is inside, so it is cut
    expect(show(mask(ring(250, 180), 'cutout', 100), 7)).toEqual([
      '       ',
      ' ..... ',
      ' .###. ',
      ' .#.#. ',
      ' .###. ',
      ' ..... ',
      '       ',
    ]);
  });

  it('rims an image only when it has empty pixels', () => {
    const flat = image(['aaa', 'aaa', 'aaa'], { a: grey(30) });
    expect(show(mask(flat, 'cutout', 100), 3)).toEqual(['###', '###', '###']);
    const cut = image([' aa', 'aaa', 'aaa'], { a: grey(30) });
    expect(show(mask(cut, 'cutout', 100), 3)).toEqual([' ..', '.#.', '...']);
  });

  it('auto seam strength separates part boundaries from shading inside one tone', () => {
    // light side: a step of 30 (shading) and a step of 70 (a part); the jump down to 10 is the tone split
    const img = image(['aabbccdd'], { a: grey(250), b: grey(220), c: grey(150), d: grey(10) });
    expect([img.auto, img.autoSeam]).toEqual([10, 30]);
    expect(show(mask(img, 'cutout'), 8)).toEqual(['....#.##']);
  });

  it('keeps its seam strength when the threshold is set by hand', () => {
    const img = image(['aabbccdd'], { a: grey(250), b: grey(220), c: grey(150), d: grey(10) });
    // cut at 230 the dark side holds steps of 70 and 140; picked again from those, the strength
    // would be 70 and the step of 70 would no longer be a seam
    expect(show(mask(img, 'cutout', 230), 8)).toEqual(['..##.#.#']);
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

  it('shares the center for the pattern styles', () => {
    const dark = image(['aabb'], { a: grey(10), b: grey(60) }), light = image(['aabb'], { a: grey(150), b: grey(240) });
    unify([dark, light]);
    // the shared cut is 60: the dark group is 10 and 60 (mean 35), the light group 150 and 240 (mean 195)
    expect([dark.autoTone, light.autoTone]).toEqual([115, 115]);
  });

  it('shares the seam strength, picked after the shared brightness cut', () => {
    const a = image(['aabb'], { a: grey(250), b: grey(200) }), b = image(['aabb'], { a: grey(250), b: grey(150) }), c = image(['ab  '], { a: grey(5), b: grey(5) });
    expect([a.autoSeam, b.autoSeam, c.autoSeam]).toEqual([24, 24, 24]); // alone, each splits its own two colors
    unify([a, b, c]);
    // together the cut falls under all four light colors, so their steps of 50 and 100 are seams to rank
    expect([a.autoSeam, b.autoSeam, c.autoSeam]).toEqual([50, 50, 50]);
  });
});

describe('an image shown smaller than it is', () => {
  // 23 by 17 pixels of shaded shapes with grain, and a see-through corner
  const w = 23, h = 17, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0, i = 0, seed = 7; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const v = ((x >> 2) + (y >> 2)) % 3 * 90 + (seed >> 8) % 40;
    data.set([v, v * 0.8 + y, x * 9, x + y < 6 ? 0 : 255], i);
  }
  const src = { width: w, height: h, data }, img = analyze(src);
  const SIZES = [[23, 17], [22, 16], [12, 9], [8, 6], [5, 17], [23, 3], [1, 1]];
  // What a picture of mw by mh shows of a full-size array holding `per` values for each pixel:
  // for each of its pixels, the values at the image pixel under its middle.
  const picked = (all, mw, mh, per = 1) => {
    const out = [];
    for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
      const at = (Math.floor(((j + 0.5) * h) / mh) * w + Math.floor(((i + 0.5) * w) / mw)) * per;
      out.push(...all.slice(at, at + per));
    }
    return out;
  };

  it('gives each pixel of a smaller picture what its image pixel is in the full conversion', () => {
    for (const style of ['cutout', 'lines', 'solid', 'silhouette']) {
      for (const threshold of [null, 90]) {
        const full = mask(img, style, threshold);
        for (const [mw, mh] of SIZES) expect([...mask(img, style, threshold, mw, mh)], `${style} ${threshold} ${mw}x${mh}`).toEqual(picked(full, mw, mh));
      }
    }
  });

  it('converts the whole image when no size is asked for, or its own', () => {
    for (const style of ['cutout', 'lines', 'solid', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']) {
      expect([...mask(img, style, null, w, h)], style).toEqual([...mask(img, style)]);
    }
  });

  // Pixels picked from a pattern are not the pattern: every second pixel of a checkerboard is one color.
  it('draws the patterns and Atkinson afresh on a smaller picture, as light as the full conversion', () => {
    // a smooth 240 by 180 image, light in the middle and dark at the corners
    const sw = 240, sh = 180, smooth = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0, i = 0; y < sh; y++) for (let x = 0; x < sw; x++, i += 4) {
      const v = 128 + 110 * Math.cos((x - 120) / 60) * Math.cos((y - 90) / 45);
      smooth.set([v, v, v, 255], i);
    }
    const image = analyze({ width: sw, height: sh, data: smooth });
    const light = m => count(m, 2) / m.length;
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
      const full = light(mask(image, style));
      expect(full, style).toBeGreaterThan(0.3);
      expect(full, style).toBeLessThan(0.7);
      for (const [mw, mh] of [[120, 90], [80, 60], [60, 45], [111, 83], [40, 30]]) {
        const m = mask(image, style, null, mw, mh);
        expect(m.length, `${style} ${mw}x${mh}`).toBe(mw * mh);
        expect(Math.abs(light(m) - full), `${style} ${mw}x${mh}`).toBeLessThan(0.03);
      }
    }
  });

  // A whole-number spacing would pick the same part of a fine regular texture every time.
  it('keeps an image with a fine regular texture as light as it is', () => {
    const tw = 300, th = 300, BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const textured = pixel => {
      const d = new Uint8ClampedArray(tw * th * 4);
      for (let y = 0, i = 0; y < th; y++) for (let x = 0; x < tw; x++, i += 4) d.set(pixel(x, y), i);
      return analyze({ width: tw, height: th, data: d });
    };
    const light = m => count(m, 2) / (m.length - count(m, 0));
    const images = {
      'art dithered to black and white': textured((x, y) => { const v = 0.5 > (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 255 : 0; return [v, v, v, 255]; }),
      'one-pixel stripes': textured((x, y) => { const v = y % 2 ? 230 : 40; return [v, v, v, 255]; }),
      'a stippled transparency': textured((x, y) => { const v = x < 150 ? 60 : 200; return [v, v, v, ((x >> 1) + (y >> 1)) % 2 ? 0 : 255]; }),
    };
    for (const [name, image] of Object.entries(images)) {
      const full = light(mask(image, 'solid', 128));
      // sizes a tile could have, none of them a whole fraction of 300
      for (const mw of [281, 233, 140, 131, 97]) expect(Math.abs(light(mask(image, 'solid', 128, mw, mw)) - full), `${name} at ${mw}`).toBeLessThan(0.08);
    }
  });

  it('keeps empty pixels empty when it draws a pattern afresh', () => {
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
      for (const [mw, mh] of SIZES) expect([...mask(img, style, null, mw, mh)].map(v => +!!v), `${style} ${mw}x${mh}`).toEqual(picked(mask(img, 'silhouette'), mw, mh));
    }
  });

  it('shrinks the original onto the same pixels', () => {
    for (const [mw, mh] of SIZES) expect([...shrink(src, mw, mh)], `${mw}x${mh}`).toEqual(picked(data, mw, mh, 4));
  });
});

describe('the settings of a style', () => {
  // A column of the darkest color, four of a middle color, a column of the lightest.
  const three = (b = 120) => image(Array(4).fill('abbbbc'), { a: grey(20), b: grey(b), c: grey(240) });
  // 23 by 17 pixels of shaded shapes with grain, and a see-through corner
  const w = 23, h = 17, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0, i = 0, seed = 7; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const v = ((x >> 2) + (y >> 2)) % 3 * 90 + (seed >> 8) % 40;
    data.set([v, v * 0.8 + y, x * 9, x + y < 6 ? 0 : 255], i);
  }
  const grainy = analyze({ width: w, height: h, data });
  const picked = (all, mw, mh) => Array.from({ length: mw * mh }, (_, o) => all[Math.floor(((Math.floor(o / mw) + 0.5) * h) / mh) * w + Math.floor((((o % mw) + 0.5) * w) / mw)]);

  it('converts alike with every setting at its default, whether given, left out or only a threshold', () => {
    for (const style of Object.keys(STYLE_SETTINGS)) {
      expect([...mask(grainy, style, defaults(style))], style).toEqual([...mask(grainy, style)]);
      expect([...mask(grainy, style, {})], style).toEqual([...mask(grainy, style)]);
      expect([...mask(grainy, style, { ...defaults(style), threshold: 90 })], style).toEqual([...mask(grainy, style, 90)]);
    }
  });

  it('cutout: seams are cut at the strength given, and not at all at 255', () => {
    const ball = previewBall();
    expect([...mask(ball, 'cutout', { seams: ball.autoSeam })]).toEqual([...mask(ball, 'cutout')]);
    expect(count(mask(ball, 'cutout', { seams: 8 }), 1)).toBeGreaterThan(count(mask(ball, 'cutout'), 1)); // soft shading is cut too
    expect(show(mask(ball, 'cutout', { seams: 255 }), 14).slice(6, 10)).toEqual(['#............#', '##############', '.############.', '.############.']);
  });

  it('cutout: without rims and without seams it is Solid', () => {
    const ball = previewBall();
    expect([...mask(ball, 'cutout', { seams: 255, rim: false })]).toEqual([...mask(ball, 'solid')]);
    expect([...mask(grainy, 'cutout', { threshold: 90, seams: 255, rim: false })]).toEqual([...mask(grainy, 'solid', 90)]);
  });

  // A 9x9 body on a transparent canvas; `mid` is the color of the pixel in its middle.
  const body = mid => image([' '.repeat(11), ...Array.from({ length: 9 }, (_, y) => ' ' + (y === 4 ? 'aaaabaaaa' : 'aaaaaaaaa') + ' '), ' '.repeat(11)], { a: grey(200), b: grey(mid) });
  const ring = n => [' '.repeat(11), ...Array.from({ length: 9 }, (_, y) => ' ' + (Math.min(y, 8 - y) < n ? '#########' : '#'.repeat(n) + '.'.repeat(9 - 2 * n) + '#'.repeat(n)) + ' '), ' '.repeat(11)];

  it('lines: thickness grows the lines into the fill, a pixel at a time', () => {
    for (const thickness of [1, 2, 3]) expect(show(mask(body(200), 'lines', { thickness }), 11), `thickness ${thickness}`).toEqual(ring(thickness));
  });

  it('lines: fill darks makes dark pixels first color, and thickness does not widen them', () => {
    const dot = rows => rows.map((row, y) => (y === 5 ? row.slice(0, 5) + '#' + row.slice(6) : row));
    expect(show(mask(body(60), 'lines', { threshold: 254 }), 11)).toEqual(ring(1)); // too strong a threshold for the dark pixel to be an edge
    expect(show(mask(body(60), 'lines', { threshold: 254, darks: 60 }), 11)).toEqual(dot(ring(1)));
    expect(show(mask(body(60), 'lines', { threshold: 254, darks: 59 }), 11)).toEqual(ring(1));
    expect(show(mask(body(60), 'lines', { threshold: 254, darks: 100, thickness: 2 }), 11)).toEqual(dot(ring(2)));
    expect(show(mask(body(0), 'lines', { threshold: 254, darks: 0 }), 11)).toEqual(ring(1)); // 0 is off, even for black
  });

  it('gives each pixel of a smaller picture what its image pixel is in the full conversion, whatever the settings', () => {
    const cases = [['lines', { threshold: 60, thickness: 2 }], ['lines', { thickness: 3, darks: 70 }], ['lines', { threshold: 90, darks: 120 }], ['cutout', { seams: 30, rim: false }], ['cutout', { threshold: 90, seams: 255 }]];
    for (const [style, set] of cases) {
      const full = mask(grainy, style, set);
      for (const [mw, mh] of [[22, 16], [12, 9], [8, 6], [5, 17], [23, 3], [1, 1]]) expect([...mask(grainy, style, set, mw, mh)], `${style} ${JSON.stringify(set)} ${mw}x${mh}`).toEqual(picked(full, mw, mh));
    }
  });

  it('shading: narrows the tones that are patterned, down to none, which is Solid', () => {
    // tone about 0.7: a checkerboard at 100, but at 50 it is twice as far from the threshold and so fully light
    expect(show(mask(three(170), 'checker', { threshold: 120 }), 6)).toEqual(['##.#..', '#.#.#.', '##.#..', '#.#.#.']);
    expect(show(mask(three(170), 'checker', { threshold: 120, shading: 50 }), 6)).toEqual(Array(4).fill('#.....'));
    // the tone at the threshold stays half and half until shading is 0
    expect(show(mask(three(), 'checker', { threshold: 120, shading: 1 }), 6)).toEqual(show(mask(three(), 'checker', 120), 6));
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
      for (const threshold of [90, 150]) expect([...mask(grainy, style, { threshold, shading: 0 })], `${style} ${threshold}`).toEqual([...mask(grainy, 'solid', threshold)]);
    }
  });

  it('scale: draws each cell of the pattern that many pixels wide and high', () => {
    expect(show(mask(three(), 'checker', { threshold: 120, scale: 2 }), 6)).toEqual(['#.##..', '#.##..', '##..#.', '##..#.']);
    // twelve rows of a middle color, over a row holding the darkest and the lightest
    const wide = image([...Array(12).fill('b'.repeat(12)), 'aaaaaacccccc'], { a: grey(20), b: grey(140), c: grey(240) });
    for (const style of ['checker', 'hatch', 'bayer', 'noise']) {
      const one = mask(wide, style, { threshold: 120 }), three = mask(wide, style, { threshold: 120, scale: 3 });
      // every pixel of the larger pattern is the pixel of the plain one that its cell stands for
      expect([...three.slice(0, 144)], style).toEqual(Array.from({ length: 144 }, (_, p) => one[Math.floor(Math.floor(p / 12) / 3) * 12 + Math.floor((p % 12) / 3)]));
      expect([...three.slice(0, 144)], style).not.toEqual([...one.slice(0, 144)]);
    }
  });

  it('scale: shrinks with a smaller picture, so the picture shows the pattern the size it is in the file', () => {
    for (const style of ['checker', 'hatch', 'bayer', 'noise']) {
      expect([...mask(grainy, style, { scale: 2 }, 12, 9)], style).toEqual([...mask(grainy, style, {}, 12, 9)]); // half the size: 2 becomes 1
      expect([...mask(grainy, style, { scale: 4 }, 12, 9)], style).not.toEqual([...mask(grainy, style, {}, 12, 9)]); // 4 becomes 2
      expect([...mask(grainy, style, { scale: 4 }, 3, 2)], style).toEqual([...mask(grainy, style, {}, 3, 2)]); // never below 1
    }
  });

  it('hatch: the lines run the way asked', () => {
    const rows = direction => show(mask(three(), 'hatch', { threshold: 120, direction }), 6);
    expect(rows('/')).toEqual(['##.##.', '#.##..', '###.#.', '##.##.']);
    expect(rows('\\')).toEqual(['##.##.', '###.#.', '#.##..', '##.##.']);
    expect(rows('-')).toEqual(['#####.', '#####.', '#.....', '#####.']);
    expect(rows('|')).toEqual(Array(4).fill('##.##.'));
  });

  it('hatch: spacing sets how far apart the lines are', () => {
    // four apart, tone 0.5: two diagonals in four are dark
    expect(show(mask(three(), 'hatch', { threshold: 120, spacing: 4 }), 6)).toEqual(['##..#.', '#..##.', '#.##..', '###...']);
    const block = (n, b) => image(Array(n * 2).fill('a' + 'b'.repeat(n * 2) + 'c'), { a: grey(20), b: grey(b), c: grey(240) });
    // tone about 0.73, light enough at every spacing to leave one dark line in n: the darkest column, and a line's share of the block
    for (const n of [3, 4, 5, 6]) expect(count(mask(block(n, 175), 'hatch', { threshold: 120, spacing: n }), 1), `spacing ${n}`).toBe(2 * n + (2 * n * 2 * n) / n);
  });

  it('bayer: the matrix sets how many tones there are', () => {
    // 2: five tones. About 0.7 lights three cells in four.
    expect(show(mask(three(170), 'bayer', { threshold: 120, matrix: 2 }), 6)).toEqual(['#.....', '#.#.#.', '#.....', '#.#.#.']);
    expect([...mask(grainy, 'bayer', { matrix: 4 })]).toEqual([...mask(grainy, 'bayer')]);
    // 8: the tone at the threshold lights exactly half of an 8x8 cell, and a slightly lighter one a few more
    const block = b => image(Array(8).fill('a' + 'b'.repeat(8) + 'c'), { a: grey(20), b: grey(b), c: grey(240) });
    expect(count(mask(block(120), 'bayer', { threshold: 120, matrix: 8 }), 2)).toBe(8 + 32);
    expect(count(mask(block(124), 'bayer', { threshold: 120, matrix: 8 }), 2)).toBe(8 + 33);
    expect(count(mask(block(124), 'bayer', { threshold: 120, matrix: 4 }), 2)).toBe(8 + 32); // too small a step for 17 tones
  });

  it('diffusion: each kernel scatters in its own way, as light as the tone asks, and leaves flat extremes clean', () => {
    const block = image(Array(24).fill('a' + 'b'.repeat(24) + 'c'), { a: grey(20), b: grey(150), c: grey(240) }); // tone 0.625
    const of = diffusion => mask(block, 'atkinson', { threshold: 120, diffusion });
    expect([...of('atkinson')]).toEqual([...mask(block, 'atkinson', 120)]);
    for (const diffusion of ['floyd', 'stucki']) {
      const m = of(diffusion), light = (count(m, 2) - 24) / (24 * 24); // without the lightest column
      expect(Math.abs(light - 0.625), diffusion).toBeLessThan(0.05);
      expect([...m], diffusion).not.toEqual([...of('atkinson')]);
      const flat = Array(8).fill('aaaaaaaa');
      expect(count(mask(image(flat, { a: grey(255) }), 'atkinson', { threshold: 128, diffusion }), 2)).toBe(64);
      expect(count(mask(image(flat, { a: grey(0) }), 'atkinson', { threshold: 128, diffusion }), 1)).toBe(64);
    }
    expect([...of('floyd')]).not.toEqual([...of('stucki')]);
  });

  it('diffusion: Floyd and Stucki are a plain error diffusion by their weights', () => {
    // the same thing written the slow, obvious way: every running value kept, each pixel cut at the middle
    const WEIGHTS = {
      floyd: [16, [1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]],
      stucki: [42, [1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]],
    };
    const plain = (img, t, [of, ...to]) => {
      const { lum, lo, hi, data } = img, solid = p => data[p * 4 + 3] >= 128;
      const tone = l => (l <= t ? (t > lo ? (0.5 * (l - lo)) / (t - lo) : 0) : 0.5 + (0.5 * (l - t)) / (hi - t));
      const v = Float32Array.from(lum, (l, p) => (solid(p) ? tone(l) * 255 : 0)), m = new Uint8Array(w * h);
      for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
        if (!solid(p)) continue;
        const on = v[p] > 127.5, error = v[p] - (on ? 255 : 0);
        m[p] = on ? 2 : 1;
        for (const [dx, dy, parts] of to) if (x + dx >= 0 && x + dx < w && y + dy < h) v[(y + dy) * w + x + dx] += (error * parts) / of;
      }
      return m;
    };
    for (const diffusion of ['floyd', 'stucki']) {
      for (const threshold of [70, 120]) expect([...mask(grainy, 'atkinson', { threshold, diffusion })], `${diffusion} ${threshold}`).toEqual([...plain(grainy, threshold, WEIGHTS[diffusion])]);
    }
  });

  it('diffusion: hands on the whole error, so a block of one tone comes out that light all through', () => {
    // a quarter tone: Atkinson, which drops a quarter of the error, darkens it; the others keep it
    const block = image(Array(32).fill('a' + 'b'.repeat(32) + 'c'), { a: grey(20), b: grey(180), c: grey(240) }); // tone 0.75
    const light = diffusion => (count(mask(block, 'atkinson', { threshold: 120, diffusion }), 2) - 32) / (32 * 32);
    expect(Math.abs(light('floyd') - 0.75)).toBeLessThan(0.03);
    expect(Math.abs(light('stucki') - 0.75)).toBeLessThan(0.03);
    expect(light('atkinson')).toBeGreaterThan(0.8); // lost error pushes a light tone lighter
  });

  it('brightness: is read from what the style asks for', () => {
    const src = { width: 4, height: 1, data: Uint8ClampedArray.of(255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 40, 80, 120, 255) };
    expect([...analyze(src).lum]).toEqual([54, 182, 18, 74]);
    expect([...analyze(src, 'luma').lum]).toEqual([54, 182, 18, 74]);
    expect([...analyze(src, 'value').lum]).toEqual([255, 255, 255, 120]);
    expect([...analyze(src, 'red').lum]).toEqual([255, 0, 0, 40]);
    expect([...analyze(src, 'green').lum]).toEqual([0, 255, 0, 80]);
    expect([...analyze(src, 'blue').lum]).toEqual([0, 0, 255, 120]);
    expect([...analyze(src, 'nonsense').lum]).toEqual([54, 182, 18, 74]);
    const blue = analyze(src, 'blue');
    expect([blue.lo, blue.hi, blue.auto]).toEqual([0, 255, 0]); // the range and Auto follow
    expect(show(mask(blue, 'solid'), 4)).toEqual(['##..']);
    expect(show(mask(analyze(src), 'solid'), 4)).toEqual(['#.##']);
    // the differences between neighbours, which Lines and seams go by, are of the colors and do not change
    expect([...blue.right]).toEqual([...analyze(src).right]);
  });

  it('an animation analysed with another brightness or opacity cut still shares one set of Auto values', () => {
    const frame = (r, b, a) => ({ width: 4, height: 1, data: Uint8ClampedArray.of(r, 0, 0, 255, 0, 0, b, 255, 90, 90, 90, a, 200, 200, 200, 255) });
    const frames = unify([analyze(frame(250, 10, 100), 'blue', 60), analyze(frame(30, 240, 30), 'blue', 60)]);
    const all = analyze({ width: 4, height: 2, data: Uint8ClampedArray.of(...frame(250, 10, 100).data, ...frame(30, 240, 30).data) }, 'blue', 60);
    for (const f of frames) {
      expect([f.auto, f.autoTone, f.lo, f.hi, f.hasAlpha, f.cut]).toEqual([all.auto, all.autoTone, all.lo, all.hi, true, 60]);
    }
    expect(frames[0].lum[1]).toBe(10); // read from blue
    expect(show(mask(frames[1], 'silhouette'), 4)).toEqual(['## #']); // alpha 30 is under the cut of 60, alpha 100 in the other frame is not
    expect(show(mask(frames[0], 'silhouette'), 4)).toEqual(['####']);
  });

  it('says whether any pixel is partly see-through, which is when the opacity cut matters', () => {
    const one = alphas => analyze({ width: alphas.length, height: 1, data: Uint8ClampedArray.from(alphas.flatMap(a => [9, 9, 9, a])) });
    expect(one([0, 255, 255, 0]).soft).toBe(false);
    expect(one([255]).soft).toBe(false);
    expect(one([0]).soft).toBe(false);
    for (const a of [1, 2, 127, 128, 253, 254]) expect(one([0, a, 255]).soft, `alpha ${a}`).toBe(true);
    // whatever the cut and whatever brightness is read from
    const src = { width: 2, height: 1, data: Uint8ClampedArray.of(9, 9, 9, 255, 9, 9, 9, 100) };
    expect([analyze(src, 'luma', 1).soft, analyze(src, 'value', 255).soft]).toEqual([true, true]);
    // an image with none is the same at every cut
    const hard = { width: 3, height: 1, data: Uint8ClampedArray.of(200, 9, 9, 0, 9, 200, 9, 255, 9, 9, 200, 255) };
    for (const style of Object.keys(STYLE_SETTINGS)) expect([...mask(analyze(hard, 'luma', 1), style)], style).toEqual([...mask(analyze(hard, 'luma', 255), style)]);
    // an animation is soft if any frame is
    const frames = unify([one([0, 255]), one([0, 90])]);
    expect(frames.map(f => f.soft)).toEqual([true, true]);
  });

  it('opacity cut: sets how see-through a pixel may be before it is empty', () => {
    const src = { width: 3, height: 1, data: Uint8ClampedArray.of(9, 9, 9, 40, 9, 9, 9, 127, 9, 9, 9, 200) };
    const shape = cut => show(mask(analyze(src, 'luma', cut), 'silhouette'), 3)[0];
    expect(shape(128)).toBe('  #');
    expect(shape(127)).toBe(' ##');
    expect(shape(40)).toBe('###');
    expect(shape(201)).toBe('   ');
    expect(analyze(src, 'luma', 40).hasAlpha).toBe(false);
    // a pixel that is empty at this cut is no neighbour: nothing is on record between it and the next
    expect([...analyze({ ...src, data: Uint8ClampedArray.of(9, 9, 9, 40, 99, 9, 9, 127, 9, 9, 9, 200) }, 'luma', 100).right]).toEqual([0, 90, 0]);
  });
});

describe('docs/styles.md', () => {
  it('shows, for every style, exactly what the code draws for the preview ball', () => {
    const doc = readFileSync(new URL('../../docs/styles.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const ball = previewBall();
    for (const style of ['cutout', 'lines', 'solid', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']) {
      const title = `## ${style[0].toUpperCase()}${style.slice(1)}\n`, from = doc.indexOf(title);
      expect(from, title).toBeGreaterThan(-1);
      const section = doc.slice(from, doc.indexOf('\n## ', from + 1));
      const drawn = show(mask(ball, style), ball.w).map(row => row.trimEnd()).join('\n');
      expect(section, title).toContain('```\n' + drawn + '\n```');
    }
  });

  it('shows, for the settings, exactly what the code draws for the preview ball', () => {
    const doc = readFileSync(new URL('../../docs/styles.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const ball = previewBall();
    // each example is two or three drawings side by side, three spaces apart
    const side = (...cases) => {
      const all = cases.map(([style, set]) => show(mask(ball, style, set), ball.w));
      return all[0].map((_, y) => all.map(rows => rows[y]).join('   ').trimEnd()).join('\n');
    };
    const examples = [
      side(['cutout', { seams: 8 }], ['cutout', { seams: 255 }], ['cutout', { rim: false }]),
      side(['lines', { thickness: 2 }], ['lines', { darks: 100 }]),
      side(['checker', { shading: 50 }], ['checker', { scale: 2 }]),
      side(['hatch', { direction: '\\' }], ['hatch', { direction: '-' }], ['hatch', { spacing: 5 }]),
      side(['bayer', { matrix: 2 }], ['bayer', { matrix: 8 }]),
      side(['atkinson', { diffusion: 'floyd' }], ['atkinson', { diffusion: 'stucki' }]),
    ];
    for (const [n, drawn] of examples.entries()) expect(doc, `example ${n + 1}`).toContain('```\n' + drawn + '\n```');
  });
});
