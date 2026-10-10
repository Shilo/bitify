import { analyze, colorize, mask } from './bitify.js';
import { inks } from './presets.js';

// One simple tonal disk with a dark circular inset. Broad, smooth tones expose the
// dither patterns, while the inset demonstrates seams and cavities without tiny
// decorative details. These are real conversion outputs, not substitute glyphs.
const size = 32;
const data = new Uint8ClampedArray(size * size * 4);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const dx = x - 15.5, dy = y - 15.5;
  if (dx * dx + dy * dy > 14 * 14) continue;
  let value = Math.round(240 - (x + y) * 3.1);
  if (y >= 20 && y <= 22) value = 65 + x * 2;
  if (dx * dx + dy * dy > 13 * 13) value = 24;
  if ((x - 13) ** 2 + (y - 12) ** 2 < 5 * 5) value = 24;
  data.set([value, Math.max(0, value - 14), Math.max(0, value - 24), 255], (y * size + x) * 4);
}
const sample = { width: size, height: size, data };

export function stylePreview(key, settings, first, second, none) {
  const analysis = analyze(sample, settings?.source ?? 'luma', settings?.alpha ?? 128);
  return { width: size, height: size, data: colorize(mask(analysis, key, settings), ...inks(first, second, none, key)) };
}
