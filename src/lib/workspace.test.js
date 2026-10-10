import { describe, it, expect } from 'vitest';
import { fitImageWall } from './workspace.js';

describe('readable image-wall layout', () => {
  it('reserves a complete touch caption at the minimum-width regression', () => {
    const fit = fitImageWall(6, 616, 100, true);
    expect(fit).toEqual({ cols: 5, size: 96, scroll: true, stackCaptions: false, extra: 62 });
    // A 44px action + 6px padding + 2px border shares the metadata row.
    expect(fit.extra).toBeGreaterThanOrEqual(44 + 6 + 2 + 8);
  });
  it('fits six phone images without reserving a redundant action row', () => {
    const fit = fitImageWall(6, 358, 642, true);
    expect(fit.stackCaptions).toBe(false);
    expect(fit.scroll).toBe(false);
    expect(fit.size).toBeGreaterThanOrEqual(140);
    expect(fit.cols * fit.size + (fit.cols - 1) * 12).toBeLessThanOrEqual(358);
    expect(Math.ceil(6 / fit.cols) * (fit.size + fit.extra) + (Math.ceil(6 / fit.cols) - 1) * 12).toBeLessThanOrEqual(642);
  });
  it('uses one complete caption for narrower touch tiles too', () => {
    expect(fitImageWall(3, 400, 420, true)).toEqual({ cols: 2, size: 142, scroll: false, stackCaptions: false, extra: 62 });
  });
  it('keeps the established footer allowance on wide touch and mouse tiles', () => {
    expect(fitImageWall(1, 800, 800, true)).toMatchObject({ stackCaptions: false, extra: 62, scroll: false });
    expect(fitImageWall(6, 1400, 730)).toMatchObject({ stackCaptions: false, extra: 35, scroll: false });
  });
});
