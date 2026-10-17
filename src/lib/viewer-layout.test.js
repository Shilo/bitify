import { describe, it, expect } from 'vitest';
import { fitViewerImage, viewerInspectionScale } from './viewer-layout.js';
import { shown } from './layout.js';
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

describe('viewer zoom refinement across animation frames', () => {
  it('refines stills and small clips without exceeding the requested zoom', () => {
    expect(viewerInspectionScale(320, 200, 2, 1)).toBe(2);
    expect(viewerInspectionScale(320, 200, 2, 1, 4)).toBe(2);
    expect(viewerInspectionScale(320, 200, .25, 1, 4)).toBe(1);
  });
  it('accounts for DPR and clip length before allocating larger legacy/Original buffers', () => {
    const scale = viewerInspectionScale(320, 320, 16, 1, 12);
    const [w, h] = shown(800, 800, 320 * scale);
    expect(w).toBeLessThan(800);
    expect(w * h * 12).toBeLessThanOrEqual(4194304 * 1.005); // integer raster rounding
    expect(viewerInspectionScale(320, 320, 16, 2, 12)).toBe(1);
  });
  it('does not multiply a long clip cache or shrink its existing Fit raster', () => {
    const scale = viewerInspectionScale(390, 390, 16, 1, 60);
    expect(scale).toBe(1);
    expect(shown(800, 800, 390 * scale)).toEqual(shown(800, 800, 390));
    expect(viewerInspectionScale(3000, 2000, 16, 2, 60)).toBe(1);
  });
  it('keeps tiny sprites at their source size even when their clip has many frames', () => {
    const scale = viewerInspectionScale(390, 390, 16, 1, 60);
    expect(shown(48, 48, 390 * scale)).toEqual([48, 48]);
  });
});
