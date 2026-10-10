import { describe, it, expect } from 'vitest';
import { canvasGridSpacing } from './canvas-grid.js';

describe('image-relative canvas grid', () => {
  it('uses 16 source pixels at the actual CSS display scale', () => {
    expect(canvasGridSpacing([{ w: 64, h: 32 }], 256)).toEqual({ scale: 4, sourceCell: 16, step: 64 });
    expect(canvasGridSpacing([{ w: 64, h: 32 }], 128).step).toBe(32);
  });
  it('keeps a small enlarged icon from distorting the typical image scale', () => {
    const images = [{ w: 64, h: 64 }, { w: 64, h: 64 }, { w: 64, h: 64 }, { w: 16, h: 16 }];
    expect(canvasGridSpacing(images, 256).step).toBe(64);
  });
  it('uses the middle pair for an even batch without weighting file area', () => {
    expect(canvasGridSpacing([{ w: 32, h: 32 }, { w: 64, h: 64 }], 128).scale).toBe(3);
  });
  it('groups 16px cells when downscaled photographs would make a subpixel grid', () => {
    expect(canvasGridSpacing([{ w: 4096, h: 4096 }], 128)).toEqual({ scale: 1 / 32, sourceCell: 256, step: 8 });
  });
  it('ignores unusable dimensions and has a stable pre-layout fallback', () => {
    expect(canvasGridSpacing([{ w: 0, h: 0 }], 0)).toEqual({ scale: 2, sourceCell: 16, step: 32 });
    expect(canvasGridSpacing([], 0).step).toBe(32);
  });
});
