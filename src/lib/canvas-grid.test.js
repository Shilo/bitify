import { describe, it, expect } from 'vitest';
import { canvasGridSpacing, canvasGridOrigin } from './canvas-grid.js';

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

describe('canvas grid image origin', () => {
  it('starts exactly at a square image with its inset already measured', () => {
    expect(canvasGridOrigin({ left: 28, top: 92, width: 256, height: 256 }, { w: 32, h: 32 })).toEqual({ x: 28, y: 92 });
  });
  it('includes object-fit letterboxing for landscape and portrait sources', () => {
    const box = { left: 28, top: 92, width: 256, height: 256 };
    expect(canvasGridOrigin(box, { w: 64, h: 32 })).toEqual({ x: 28, y: 156 });
    expect(canvasGridOrigin(box, { w: 32, h: 64 })).toEqual({ x: 92, y: 92 });
  });
  it('preserves the image origin outside the viewport during scrolling', () => {
    expect(canvasGridOrigin({ left: 12, top: -210, width: 200, height: 200 }, { w: 40, h: 20 })).toEqual({ x: 12, y: -160 });
  });
  it('handles the transient unlaid-out canvas without NaN', () => {
    expect(canvasGridOrigin({ left: 12, top: 80, width: 0, height: 0 }, { w: 0, h: 0 })).toEqual({ x: 12, y: 80 });
  });
});
