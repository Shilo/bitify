import { describe, it, expect } from 'vitest';
import { fitViewerImage } from './viewer-layout.js';
describe('fullscreen image fit', () => {
  it('uses landscape viewport width for a wide image rather than a square', () => {
    expect(fitViewerImage(1600, 900, 1280, 680)).toEqual({ width: 1097.7777777777778, height: 621 });
  });
  it('fits a tall source within phone height while retaining its aspect', () => {
    const fit = fitViewerImage(300, 900, 320, 500);
    expect(fit.height).toBe(441);
    expect((fit.width - 8) / (fit.height - 8)).toBeCloseTo(1 / 3);
  });
  it('leaves room for caption/insets and fits either bound for mixed viewports', () => {
    for (const source of [[28, 28], [1600, 80], [80, 1600]]) {
      for (const viewport of [[320, 390], [844, 200], [1920, 900]]) {
        const fit = fitViewerImage(...source, ...viewport);
        expect(fit.width).toBeLessThanOrEqual(viewport[0] - 24 + 1e-8);
        expect(fit.height).toBeLessThanOrEqual(viewport[1] - 59 + 1e-8);
      }
    }
  });
});
