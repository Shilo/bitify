import { describe, it, expect } from 'vitest';
import { fitViewerImage } from './viewer-layout.js';
describe('fullscreen image fit', () => {
  it('uses landscape viewport width for a wide image rather than a square', () => {
    const fit = fitViewerImage(1600, 900, 1280, 680);
    expect(fit.width).toBeCloseTo(1208.888888888889);
    expect(fit.height).toBe(680);
  });
  it('fits a tall source within phone height while retaining its aspect', () => {
    const fit = fitViewerImage(300, 900, 320, 500);
    expect(fit.height).toBe(500);
    expect(fit.width / fit.height).toBeCloseTo(1 / 3);
  });
  it('fills one viewport bound without cropping and retains aspect for mixed viewports', () => {
    for (const source of [[28, 28], [1600, 80], [80, 1600]]) {
      for (const viewport of [[320, 390], [844, 200], [1920, 900]]) {
        const fit = fitViewerImage(...source, ...viewport);
        expect(fit.width).toBeLessThanOrEqual(viewport[0] + 1e-8);
        expect(fit.height).toBeLessThanOrEqual(viewport[1] + 1e-8);
        expect(fit.width / fit.height).toBeCloseTo(source[0] / source[1]);
        expect(Math.min(viewport[0] - fit.width,viewport[1] - fit.height)).toBeCloseTo(0);
      }
    }
  });
});
