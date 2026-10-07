import { describe, it, expect } from 'vitest';
import { fitGrid, shown } from './layout.js';

// A tile is `size` wide and `size + extra` tall (the image plus its caption).
const opts = { gap: 16, extra: 27, min: 200 };
const fits = ({ cols, size }, count, width, height, o = opts) => {
  const rows = Math.ceil(count / cols);
  return cols * size + (cols - 1) * o.gap <= width && rows * (size + o.extra) + (rows - 1) * o.gap <= height;
};

describe('fitGrid', () => {
  it('gives one tile all the space the shorter side allows', () => {
    expect(fitGrid(1, 1248, 596, opts)).toEqual({ cols: 1, size: 569, scroll: false });
    expect(fitGrid(1, 343, 558, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 1, size: 343, scroll: false });
  });

  it('puts two tiles side by side on a wide screen and stacked on a tall one', () => {
    expect(fitGrid(2, 1248, 596, opts)).toEqual({ cols: 2, size: 569, scroll: false });
    expect(fitGrid(2, 343, 558, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 1, size: 223, scroll: false });
  });

  it('shrinks the tiles as more are added, and they always fit', () => {
    let last = Infinity;
    for (let count = 1; count <= 10; count++) {
      const layout = fitGrid(count, 1248, 596, opts);
      expect(layout.scroll).toBe(false);
      expect(fits(layout, count, 1248, 596)).toBe(true);
      expect(layout.size).toBeLessThanOrEqual(last);
      last = layout.size;
    }
  });

  it('picks the column count that gives the largest tiles', () => {
    expect(fitGrid(4, 1248, 596, opts)).toEqual({ cols: 4, size: 300, scroll: false });
    expect(fitGrid(6, 1248, 596, opts)).toEqual({ cols: 3, size: 263, scroll: false });
    expect(fitGrid(4, 343, 558, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 2, size: 163, scroll: false });
  });

  it('scrolls instead of going below the minimum size, with columns that fill the width', () => {
    expect(fitGrid(11, 1248, 596, opts)).toEqual({ cols: 5, size: 236, scroll: true });
    expect(fitGrid(5, 343, 558, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 2, size: 163, scroll: true });
  });

  it('on a short screen, shrinks below the minimum rather than scroll a wall that would fit', () => {
    const touch = { gap: 16, extra: 48, min: 140 };
    // one tile can only be 134px here, so that becomes the size to hold
    expect(fitGrid(1, 788, 182, touch)).toEqual({ cols: 1, size: 134, scroll: false });
    expect(fitGrid(2, 788, 182, touch)).toEqual({ cols: 2, size: 134, scroll: false });
    expect(fitGrid(5, 788, 182, touch)).toEqual({ cols: 5, size: 134, scroll: false });
    expect(fitGrid(1, 708, 146, touch)).toEqual({ cols: 1, size: 98, scroll: false });
  });

  it('when a short screen has to scroll, a whole row still fits its height', () => {
    expect(fitGrid(6, 788, 182, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 5, size: 134, scroll: true });
  });

  it('never returns zero columns or a tile under 96px', () => {
    expect(fitGrid(3, 100, 400, opts)).toEqual({ cols: 1, size: 100, scroll: true });
    expect(fitGrid(1, 700, 40, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 6, size: 96, scroll: true });
  });
});

describe('shown', () => {
  it('draws an image whole when the tile has a screen pixel for each of its pixels', () => {
    expect(shown(64, 64, 955)).toEqual([64, 64]);
    expect(shown(955, 700, 955)).toEqual([955, 700]);
    expect(shown(700, 955, 955)).toEqual([700, 955]);
  });

  it('draws a larger image at the size of the tile, keeping its shape', () => {
    expect(shown(4000, 3000, 955)).toEqual([955, 716]);
    expect(shown(3000, 4000, 955)).toEqual([716, 955]);
    expect(shown(2048, 2048, 955)).toEqual([955, 955]);
    expect(shown(1000, 800, 955)).toEqual([955, 764]); // only a little larger than the tile
  });

  it('drafts an image that would take longer than the budget', () => {
    // 12 million pixels at 0.0001 ms each is 1200 ms; a fiftieth of the pixels fits 24 ms
    const [mw, mh] = shown(4000, 3000, 955, 24, 0.0001);
    expect([mw, mh]).toEqual([566, 424]);
    expect(mw * mh * 0.0001).toBeCloseTo(24, 0);
    expect(shown(4000, 3000, 955, 6, 0.0001)).toEqual([283, 212]); // a quarter of the budget, as with four tiles
  });

  it('does not draft an image that is quick enough already', () => {
    expect(shown(4000, 3000, 955, 24, 0.000001)).toEqual([955, 716]);
    expect(shown(4000, 3000, 955, 24, 0)).toEqual([955, 716]); // nothing timed yet
  });

  it('never drafts an image that is drawn whole, however slow', () => {
    expect(shown(256, 256, 955, 2, 1)).toEqual([256, 256]);
    expect(shown(900, 900, 955, 2, 1)).toEqual([900, 900]);
  });

  it('keeps 32 pixels on the shorter side of a long thin image, or all it has', () => {
    expect(shown(4000, 30, 955)).toEqual([4000, 30]);
    expect(shown(4000, 320, 200)).toEqual([400, 32]);
    expect(shown(4000, 320, 400, 24, 1)).toEqual([400, 32]); // a draft stops there too
  });

  it('never asks for a picture with no pixels', () => {
    expect(shown(1, 1, 955)).toEqual([1, 1]);
    expect(shown(5000, 1, 955)).toEqual([5000, 1]);
    expect(shown(3, 9000, 955, 24, 1)).toEqual([3, 9000]);
  });
});

describe('shown, for a picture a whole number of times smaller', () => {
  it('makes it a little smaller, so that it does not fall in step with a fine texture', () => {
    expect(shown(1024, 1024, 512)).toEqual([483, 483]); // would have been exactly half
    expect(shown(3000, 3000, 1000)).toEqual([943, 943]); // exactly a third
    expect(shown(2048, 2048, 1020)).toEqual([962, 962]); // within a hair of a half
  });

  it('leaves other sizes, and an image drawn whole, as they are', () => {
    expect(shown(1024, 1024, 478)).toEqual([478, 478]);
    expect(shown(1024, 1024, 700)).toEqual([700, 700]); // 1.46 times: nearer one than two
    expect(shown(512, 512, 512)).toEqual([512, 512]);
  });
});
