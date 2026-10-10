import { describe, it, expect } from 'vitest';
import { fitImageWall } from './workspace.js';

describe('readable image-wall layout', () => {
  it('stacks metadata above full-size touch actions in the minimum-width regression', () => {
    const fit = fitImageWall(6, 616, 100, true);
    expect(fit).toEqual({ cols: 5, size: 96, scroll: true, stackCaptions: true, extra: 95 });
    expect(fit.extra).toBeGreaterThanOrEqual(26 + 52 + 16);
  });
  it('chooses scrolling instead of collapsing names on a phone with six images', () => {
    const fit = fitImageWall(6, 358, 642, true);
    expect(fit.stackCaptions).toBe(true);
    expect(fit.scroll).toBe(true);
    expect(fit.size).toBe(173);
    expect(fit.cols * fit.size + (fit.cols - 1) * 12).toBeLessThanOrEqual(358);
  });
  it('retains the stack flag when the second fit crosses the width threshold', () => {
    expect(fitImageWall(3, 400, 420, true)).toEqual({ cols: 2, size: 194, scroll: true, stackCaptions: true, extra: 95 });
  });
  it('keeps the compact footer when wide touch or mouse tiles have room', () => {
    expect(fitImageWall(1, 800, 800, true)).toMatchObject({ stackCaptions: false, extra: 62, scroll: false });
    expect(fitImageWall(6, 1400, 730)).toMatchObject({ stackCaptions: false, extra: 35, scroll: false });
  });
});
