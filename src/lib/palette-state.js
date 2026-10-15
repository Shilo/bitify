import { FULL_PRESETS, DEFAULT_FULL_PALETTE, GENERATED_PALETTE_ID } from './palette-library.js';
import { preparePalette, quantizeAsync, validateMatchingMetric, checkCanceled } from './quantize.js';
import { normalizeDither, normalizeDitherStrength } from './palette-dither-settings.js';
import { getLimitedPalette } from './palette-limit-client.js';
import { normalizeAlphaMode, effectiveAlphaCut } from './palette-alpha.js';

function maxColorsOf(value = 0) {
  if (!Number.isInteger(value) || value < 0 || value > 256) throw new Error('Max colors must be All or an integer from 1 to 256.');
  return value;
}

export function restorePaletteState(text, library = []) {
  let value;
  try { value = JSON.parse(text); } catch { /* Defaults also cover damaged settings. */ }
  const hasPreferences = value !== null && typeof value === 'object' && !Array.isArray(value);
  // Legacy records predate the family field. Preserve their 1-bit mode; only a
  // fresh/unreadable record starts with the shared source palette.
  if (!hasPreferences) value = undefined;
  const choices = [...FULL_PRESETS, ...library];
  return {
    family: !hasPreferences || value?.family === 'full-palette' ? 'full-palette' : 'two-color',
    paletteId: value?.paletteId === GENERATED_PALETTE_ID || choices.some(p => p.id === value?.paletteId) ? value.paletteId : hasPreferences ? DEFAULT_FULL_PALETTE.id : GENERATED_PALETTE_ID,
    alphaCut: Number.isInteger(value?.alphaCut) && value.alphaCut >= 1 && value.alphaCut <= 255 ? value.alphaCut : 128,
    alphaMode: normalizeAlphaMode(value?.alphaMode),
    metric: value?.metric === 'rgb' ? 'rgb' : 'oklab',
    maxColors: value?.maxColors === 1 ? 2 : Number.isInteger(value?.maxColors) && value.maxColors >= 0 && value.maxColors <= 256 ? value.maxColors : 0,
    lastMaxColors: value?.lastMaxColors === 1 ? 2 : Number.isInteger(value?.lastMaxColors) && value.lastMaxColors >= 2 && value.lastMaxColors <= 256 ? value.lastMaxColors : 16,
    cleanup: value?.cleanup === true,
    dither: normalizeDither(value?.dither),
    ditherStrength: normalizeDitherStrength(value?.ditherStrength),
  };
}

// A save owns its colors and settings even if the user edits or resets the UI
// while cooperative conversion is still running. IDs alone are not snapshots.
export function conversionSnapshot({ family, palette, alphaCut, alphaMode, metric, maxColors, cleanup, dither, ditherStrength, generated, first, second, style, set }) {
  return family === 'full-palette'
    ? Object.freeze({ family, name: palette.name, colors: Object.freeze([...palette.colors]), alphaCut, alphaMode: normalizeAlphaMode(alphaMode), metric: validateMatchingMetric(metric), maxColors: maxColorsOf(maxColors), cleanup: cleanup === true, dither: normalizeDither(dither), ditherStrength: normalizeDitherStrength(ditherStrength), ...(generated ? { generated } : {}) })
    : Object.freeze({ family: 'two-color', first, second, style, set: Object.freeze({ ...set }) });
}

export async function fullPaletteImage(item, asked, { still = false, signal } = {}) {
  checkCanceled(signal);
  // Own scalar preferences and source/frame references before subset preparation
  // yields. Still copies of GIFs select from the same full animation as Save.
  const metric = validateMatchingMetric(asked.metric), alphaCut = asked.alphaCut, maxColors = maxColorsOf(asked.maxColors), cleanup = asked.cleanup === true;
  const dither = normalizeDither(asked.dither), ditherStrength = normalizeDitherStrength(asked.ditherStrength);
  const alphaMode = normalizeAlphaMode(asked.alphaMode), preparationCut = effectiveAlphaCut(alphaMode, alphaCut);
  const original = item.original, name = item.name, loop = item.loop;
  const framesIdentity = item.frames;
  const frames = item.frames?.map(f => ({ identity: f, original: f.original, delay: f.delay }));
  const sourceItem = { identity: item, original, frames, framesIdentity, loop };
  let colors = asked.colors;
  const generated = asked.generated;
  if (generated) {
    const client = await import('./palette-generated-client.js');
    colors = (await client.getGeneratedPalette(generated, { signal })).colors;
    if (!colors.length) throw new Error('No visible colors. Add images or lower Opacity cut.');
  }
  let palette = preparePalette(colors);
  checkCanceled(signal);
  if (maxColors && maxColors < palette.size) palette = await getLimitedPalette(item, palette, preparationCut, metric, maxColors, { sourceItem, signal });
  let clean, applyCleanupAsync;
  if (cleanup) {
    const client = await import('./palette-cleanup-client.js');
    clean = await client.getPaletteCleanup(item, palette, preparationCut, metric, { sourceItem, signal });
    applyCleanupAsync = client.applyCleanupAsync;
  }
  const convert = async source => {
    const result = await quantizeAsync(source, palette, alphaCut, undefined, undefined, { metric, signal, dither, ditherStrength, alphaMode });
    // Cleanup decisions come from undithered source labels. Their approved
    // replacement coordinates stay solid; every other pixel keeps its texture.
    return clean ? await applyCleanupAsync(result, clean, { signal }) : result;
  };
  const about = { family: 'full-palette', colors: palette.colors, metric, maxColors, cleanup, dither, ditherStrength, alphaMode, name, w: original.width, h: original.height };
  if (frames && !still) {
    return { ...about, loop, frameCount: frames.length,
      getFrame: async i => ({ ...(await convert(frames[i].original)), delay: frames[i].delay }) };
  }
  return { ...about, ...(await convert(original)) };
}
