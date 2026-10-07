import { describe, it, expect } from 'vitest';
import { fitGrid } from './layout.js';

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

  it('scrolls on a screen too short for even one tile, and never returns zero columns', () => {
    expect(fitGrid(1, 708, 146, { gap: 16, extra: 48, min: 140 })).toEqual({ cols: 4, size: 165, scroll: true });
    expect(fitGrid(3, 100, 400, opts)).toEqual({ cols: 1, size: 100, scroll: true });
  });
});
