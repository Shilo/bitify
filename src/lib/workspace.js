import { fitGrid } from './layout.js';

export const IMAGE_INSET = 4;
export const IMAGE_GAP = 12;

// Touch metadata and its single 44px More control share one 52px caption.
// Reserve that caption plus the tile gap without a separate action row.
export function fitImageWall(count, width, height, noHover = false) {
  const options = {
    gap: IMAGE_GAP,
    extra: noHover ? 62 : 35,
    min: Math.max(140, Math.min(200, width * 0.16)),
  };
  return { ...fitGrid(count, width, height, options), stackCaptions: false, extra: options.extra };
}
