import { FULL_PRESETS } from './palette-library.js';
import { preparePalette, quantizeAsync, validateMatchingMetric } from './quantize.js';

export function restorePaletteState(text, library = []) {
  let value;
  try { value = JSON.parse(text); } catch { /* Defaults also cover damaged settings. */ }
  const choices = [...FULL_PRESETS, ...library];
  return {
    family: value?.family === 'full-palette' ? 'full-palette' : 'two-color',
    paletteId: choices.some(p => p.id === value?.paletteId) ? value.paletteId : FULL_PRESETS[0].id,
    alphaCut: Number.isInteger(value?.alphaCut) && value.alphaCut >= 1 && value.alphaCut <= 255 ? value.alphaCut : 128,
    metric: value?.metric === 'rgb' ? 'rgb' : 'oklab',
  };
}

// A save owns its colors and settings even if the user edits or resets the UI
// while cooperative conversion is still running. IDs alone are not snapshots.
export function conversionSnapshot({ family, palette, alphaCut, metric, first, second, style, set }) {
  return family === 'full-palette'
    ? Object.freeze({ family, name: palette.name, colors: Object.freeze([...palette.colors]), alphaCut, metric: validateMatchingMetric(metric) })
    : Object.freeze({ family: 'two-color', first, second, style, set: Object.freeze({ ...set }) });
}

export async function fullPaletteImage(item, asked, { still = false } = {}) {
  const palette = preparePalette(asked.colors);
  const metric = validateMatchingMetric(asked.metric), alphaCut = asked.alphaCut;
  const about = { family: 'full-palette', colors: palette.colors, metric, name: item.name, w: item.original.width, h: item.original.height };
  if (item.frames && !still) {
    const frames = item.frames.map(f => ({ original: f.original, delay: f.delay }));
    return { ...about, loop: item.loop, frameCount: frames.length,
      getFrame: async i => ({ ...(await quantizeAsync(frames[i].original, palette, alphaCut, undefined, undefined, { metric })), delay: frames[i].delay }) };
  }
  return { ...about, ...(await quantizeAsync(item.original, palette, alphaCut, undefined, undefined, { metric })) };
}
