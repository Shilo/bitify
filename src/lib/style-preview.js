import { analyze, colorize, mask } from './bitify.js';
import { inks } from './presets.js';

// A transparent 24px faceted sprite: broad tones show dithering, a dark inset shows
// cavities, and an offset band shows seams. The real converters draw every preview.
const size = 24;
const data = new Uint8ClampedArray(size * size * 4);
for (let y = 2; y < 22; y++) for (let x = 2; x < 22; x++) {
  const inset = y < 6 ? 6 - y : y > 17 ? y - 17 : 0;
  if (x < 2 + inset || x >= 22 - inset) continue;
  let value = Math.round(242 - x * 5 - y * 3);
  if (x <= 2 + inset || x === 21 - inset || y === 2 || y === 21) value = 24;
  else if (y >= 13 && y <= 16) value = 58 + x * 2;
  else if (x >= 8 && x <= 15 && y >= 6 && y <= 10) value = 18;
  else if (x === 6 || y === 12) value = Math.min(230, value + 45);
  data.set([value, Math.max(0, value - 14), Math.max(0, value - 24), 255], (y * size + x) * 4);
}
const sample = { width: size, height: size, data };

export function stylePreview(key, settings, first, second, none) {
  const analysis = analyze(sample, settings?.source ?? 'luma', settings?.alpha ?? 128);
  return { width: size, height: size, data: colorize(mask(analysis, key, settings), ...inks(first, second, none, key)) };
}
