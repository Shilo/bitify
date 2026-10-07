import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyze, unify, mask, shrink, colorize, otsu, hexToRgb, brightness, autoThreshold, previewBall } from './bitify.js';

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
  // every k-th value of every k-th row of a full-size array that holds `per` values for each pixel
  const every = (all, k, per = 1) => {
    const out = [];
    for (let y = 0; y < h; y += k) for (let x = 0; x < w; x += k) out.push(...all.slice((y * w + x) * per, (y * w + x + 1) * per));
    return out;
  };

  it('converts every k-th pixel of every k-th row to what it is in the full conversion', () => {
    for (const style of ['cutout', 'lines', 'solid', 'silhouette']) {
      for (const threshold of [null, 90]) {
        const full = mask(img, style, threshold);
        for (const k of [1, 2, 3, 5, 16, 40]) expect([...mask(img, style, threshold, k)], `${style} ${threshold} k=${k}`).toEqual(every(full, k));
      }
    }
  });

  // Every k-th pixel of a pattern is not the pattern: of a checkerboard it is one color only.
  it('draws the patterns and Atkinson afresh on the pixels it keeps, as light as the full conversion', () => {
    // a smooth 240 by 180 picture, light in the middle and dark at the corners
    const sw = 240, sh = 180, smooth = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0, i = 0; y < sh; y++) for (let x = 0; x < sw; x++, i += 4) {
      const v = 128 + 110 * Math.cos((x - 120) / 60) * Math.cos((y - 90) / 45);
      smooth.set([v, v, v, 255], i);
    }
    const picture = analyze({ width: sw, height: sh, data: smooth });
    const light = m => count(m, 2) / m.length;
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
      const full = light(mask(picture, style));
      expect(full, style).toBeGreaterThan(0.3);
      expect(full, style).toBeLessThan(0.7);
      for (const k of [2, 3, 4, 6]) {
        const m = mask(picture, style, null, k);
        expect(m.length, `${style} k=${k}`).toBe(Math.ceil(sw / k) * Math.ceil(sh / k));
        expect(Math.abs(light(m) - full), `${style} k=${k}`).toBeLessThan(0.03);
      }
    }
  });

  it('keeps empty pixels empty when it draws a pattern afresh', () => {
    for (const style of ['checker', 'hatch', 'bayer', 'noise', 'atkinson']) {
      for (const k of [2, 3, 5]) expect([...mask(img, style, null, k)].map(v => +!!v), `${style} k=${k}`).toEqual(every(mask(img, 'silhouette'), k));
    }
  });

  it('shrinks the original the same way', () => {
    for (const k of [1, 2, 3, 5, 40]) expect([...shrink(src, k)], `k=${k}`).toEqual(every(data, k, 4));
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
});
