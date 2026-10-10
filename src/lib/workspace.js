import { fitGrid } from './layout.js';

export const IMAGE_INSET = 4;
export const IMAGE_GAP = 12;

// A narrow touch tile cannot fit readable metadata beside two 44px actions.
// Decide once from the compact fit, then keep the explicit stack flag in the refit.
export function fitImageWall(count, width, height, noHover = false) {
  const options = {
    gap: IMAGE_GAP,
    extra: noHover ? 62 : 35,
    min: Math.max(140, Math.min(200, width * 0.16)),
  };
  const compact = fitGrid(count, width, height, options);
  if (noHover && compact.size < 192) {
    return { ...fitGrid(count, width, height, { ...options, extra: 95 }), stackCaptions: true, extra: 95 };
  }
  return { ...compact, stackCaptions: false, extra: options.extra };
}
