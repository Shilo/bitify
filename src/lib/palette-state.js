import { FULL_PRESETS, DEFAULT_FULL_PALETTE } from './palette-library.js';
import { preparePalette, quantizeAsync, validateMatchingMetric } from './quantize.js';
import { getLimitedPalette } from './palette-limit-client.js';

function maxColorsOf(value = 0) {
  if (!Number.isInteger(value) || value < 0 || value > 256) throw new Error('Max colors must be All or an integer from 1 to 256.');
  return value;
}

export function restorePaletteState(text, library = []) {
  let value;
  try { value = JSON.parse(text); } catch { /* Defaults also cover damaged settings. */ }
  const choices = [...FULL_PRESETS, ...library];
  return {
    family: value?.family === 'full-palette' ? 'full-palette' : 'two-color',
    paletteId: choices.some(p => p.id === value?.paletteId) ? value.paletteId : DEFAULT_FULL_PALETTE.id,
    alphaCut: Number.isInteger(value?.alphaCut) && value.alphaCut >= 1 && value.alphaCut <= 255 ? value.alphaCut : 128,
    metric: value?.metric === 'rgb' ? 'rgb' : 'oklab',
    maxColors: Number.isInteger(value?.maxColors) && value.maxColors >= 0 && value.maxColors <= 256 ? value.maxColors : 0,
    lastMaxColors: Number.isInteger(value?.lastMaxColors) && value.lastMaxColors >= 1 && value.lastMaxColors <= 256 ? value.lastMaxColors : 16,
  };
}

// A save owns its colors and settings even if the user edits or resets the UI
// while cooperative conversion is still running. IDs alone are not snapshots.
export function conversionSnapshot({ family, palette, alphaCut, metric, maxColors, first, second, style, set }) {
  return family === 'full-palette'
    ? Object.freeze({ family, name: palette.name, colors: Object.freeze([...palette.colors]), alphaCut, metric: validateMatchingMetric(metric), maxColors: maxColorsOf(maxColors) })
    : Object.freeze({ family: 'two-color', first, second, style, set: Object.freeze({ ...set }) });
}

export async function fullPaletteImage(item, asked, { still = false } = {}) {
  let palette = preparePalette(asked.colors);
  // Own scalar preferences and source/frame references before subset preparation
  // yields. Still copies of GIFs select from the same full animation as Save.
  const metric = validateMatchingMetric(asked.metric), alphaCut = asked.alphaCut, maxColors = maxColorsOf(asked.maxColors);
  const original = item.original, name = item.name, loop = item.loop;
  const frames = item.frames?.map(f => ({ original: f.original, delay: f.delay }));
  if (maxColors && maxColors < palette.size) palette = await getLimitedPalette(item, palette, alphaCut, metric, maxColors);
  const about = { family: 'full-palette', colors: palette.colors, metric, maxColors, name, w: original.width, h: original.height };
  if (frames && !still) {
    return { ...about, loop, frameCount: frames.length,
      getFrame: async i => ({ ...(await quantizeAsync(frames[i].original, palette, alphaCut, undefined, undefined, { metric })), delay: frames[i].delay }) };
  }
  return { ...about, ...(await quantizeAsync(original, palette, alphaCut, undefined, undefined, { metric })) };
}
