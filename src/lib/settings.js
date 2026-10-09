// Each style's own settings, and what is kept between visits. No DOM.

// Every setting a style can have. One with `options` is a choice between a few values, each
// [value, name], with a third word to be read out where the name is only a sign; the others are
// whole numbers from `min` to `max`. `auto` means the app can
// pick the number itself, which is the value null. `zero` names the value 0, which turns the
// setting off. `unit` follows the number where it is shown.
export const SETTINGS = {
  threshold: { label: 'Threshold', min: 1, max: 254, auto: true, default: null },
  seams: { label: 'Seams', min: 1, max: 255, auto: true, default: null },
  rim: { label: 'Rim', options: [[true, 'On'], [false, 'Off']], default: true },
  cuts: { label: 'Cuts', min: 0, max: 254, auto: true, default: null },
  outline: { label: 'Outline', options: [['keep', 'Keep'], ['trim', 'Trim']], default: 'keep' },
  edges: { label: 'Edges', min: 0, max: 100, unit: '%', zero: 'Off', default: 0 },
  thickness: { label: 'Thickness', options: [[1, '1'], [2, '2'], [3, '3']], default: 1 },
  darks: { label: 'Fill darks', min: 0, max: 254, zero: 'Off', default: 0 },
  shading: { label: 'Shading', min: 0, max: 100, unit: '%', default: 100 },
  scale: { label: 'Scale', options: [[1, '1×'], [2, '2×'], [3, '3×'], [4, '4×']], default: 1 },
  direction: { label: 'Direction', options: [['/', '/', 'Rising'], ['\\', '\\', 'Falling'], ['-', '—', 'Level'], ['|', '|', 'Upright']], default: '/' },
  spacing: { label: 'Spacing', options: [[3, '3'], [4, '4'], [5, '5'], [6, '6']], default: 3 },
  matrix: { label: 'Matrix', options: [[2, '2'], [4, '4'], [8, '8']], default: 4 },
  diffusion: { label: 'Diffusion', options: [['atkinson', 'Atkinson'], ['floyd', 'Floyd'], ['stucki', 'Stucki']], default: 'atkinson' },
  source: { label: 'Brightness', options: [['luma', 'Luma'], ['value', 'Value'], ['red', 'R'], ['green', 'G'], ['blue', 'B']], default: 'luma' },
  alpha: { label: 'Opacity cut', min: 1, max: 255, default: 128 },
};

// The settings each style has, in the order they are shown. The threshold comes first; Stencil
// has none, and its Cuts comes first instead.
export const STYLE_SETTINGS = {
  cutout: ['threshold', 'seams', 'rim', 'source', 'alpha'],
  solid: ['threshold', 'source', 'alpha'],
  stencil: ['cuts', 'outline', 'edges', 'source', 'alpha'],
  lines: ['threshold', 'thickness', 'darks', 'alpha'],
  checker: ['threshold', 'shading', 'scale', 'source', 'alpha'],
  hatch: ['threshold', 'shading', 'scale', 'direction', 'spacing', 'source', 'alpha'],
  bayer: ['threshold', 'shading', 'scale', 'matrix', 'source', 'alpha'],
  noise: ['threshold', 'shading', 'scale', 'source', 'alpha'],
  atkinson: ['threshold', 'shading', 'diffusion', 'source', 'alpha'],
  silhouette: ['alpha'],
};

// A style's settings, all at their defaults.
export const defaults = style => Object.fromEntries(STYLE_SETTINGS[style].map(key => [key, SETTINGS[key].default]));

// Whether a style's settings differ from its defaults: all of them, or only those in `keys`.
export const changed = (style, own, keys = STYLE_SETTINGS[style]) => keys.some(key => own[key] !== SETTINGS[key].default);

// Whether `v` is a value the setting can have.
export function allowed(key, v) {
  const { options, auto, min, max } = SETTINGS[key];
  return options ? options.some(o => o[0] === v) : (v === null && !!auto) || (Number.isInteger(v) && v >= min && v <= max);
}

// A setting's value as text: what a chip shows. `spoken` gives the word to read out instead,
// where there is one.
export function shown(key, v, spoken = false) {
  const { options, zero, unit = '' } = SETTINGS[key], option = options?.find(o => o[0] === v);
  return v === null ? 'Auto' : options ? (spoken && option[2]) || option[1] : zero && v === 0 ? zero : `${v}${unit}`;
}

// What is kept between visits: the two colors and which of them is None (0 neither, 1 the first,
// 2 the second), the style, and every style's settings, and the theme where one was chosen
// (missing means the system's).
const THEMES = ['light', 'dark'];
export const DEFAULTS = { first: '#222323', second: '#f0f6f0', none: 0, style: 'cutout', settings: Object.fromEntries(Object.keys(STYLE_SETTINGS).map(style => [style, defaults(style)])) };

const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

// Reads what was kept back from stored text. The text may be missing, damaged or written by an
// older version, so each value is checked on its own and anything unusable falls back to its
// default. `styles` is the styles that may be chosen.
export function restore(text, styles) {
  let saved;
  try {
    saved = JSON.parse(text);
  } catch {
    // not JSON; use the defaults
  }
  const { first, second, none, style, settings, theme } = saved && typeof saved === 'object' ? saved : {};
  return {
    first: isColor(first) ? first : DEFAULTS.first,
    second: isColor(second) ? second : DEFAULTS.second,
    none: none === 1 || none === 2 ? none : 0,
    style: styles.includes(style) ? style : DEFAULTS.style,
    settings: Object.fromEntries(
      Object.entries(STYLE_SETTINGS).map(([name, keys]) => [name, Object.fromEntries(keys.map(key => [key, allowed(key, settings?.[name]?.[key]) ? settings[name][key] : SETTINGS[key].default]))]),
    ),
    theme: THEMES.includes(theme) ? theme : undefined,
  };
}
