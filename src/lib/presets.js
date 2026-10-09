// The palettes and styles on offer, and stepping through them. No DOM.

import { brightness } from './bitify.js';

// A palette is two colors and nothing else. Which one is the first color is up to Swap.
export const PRESETS = [
  { name: 'Glow', dark: '#222323', light: '#f0f6f0' },
  { name: 'Mono', dark: '#000000', light: '#ffffff' },
  { name: 'Paper', dark: '#382b26', light: '#b8c2b9' },
  { name: 'Torch', dark: '#0b0a0c', light: '#f6dfa4' },
  { name: 'Game Boy', dark: '#0f380f', light: '#9bbc0f' },
  { name: 'Pocket', dark: '#1f1f1f', light: '#c4cfa1' },
  { name: 'Nokia', dark: '#43523d', light: '#c7f0d8' },
  { name: 'Playdate', dark: '#322f29', light: '#d7d4cc' },
  { name: 'Phosphor', dark: '#25342f', light: '#01eb5f' },
  { name: 'Amber', dark: '#3f291e', light: '#fdca55' },
  { name: 'Commodore', dark: '#40318e', light: '#88d7de' },
  { name: 'Rose', dark: '#4a0d2b', light: '#ffd1dc' },
];
// Describe the color pair rather than repeating the chip's name (see docs/palettes.md).
export const PALETTE_USES = {
  Glow: 'Soft black and near-white for gentle contrast.',
  Mono: 'Pure black and white for maximum contrast.',
  Paper: 'Dark brown and grey-green for a muted print look.',
  Torch: 'Near-black and warm cream, inspired by End of End.',
  'Game Boy': 'Dark and pea green from the original handheld screen.',
  Pocket: 'Near-black and pale olive from the smaller handheld screen.',
  Nokia: 'Grey-green and mint from the classic phone screen.',
  Playdate: 'Warm black and grey from the modern handheld screen.',
  Phosphor: 'Dark grey-green and bright green for a glowing monitor look.',
  Amber: 'Dark brown and golden yellow for a warm monitor look.',
  Commodore: 'Indigo and cyan for a retro color monitor look.',
  Rose: 'Dark wine and pale pink for a soft, warm tint.',
};
export const STYLES = [
  ['cutout', 'Cutout'],
  ['solid', 'Solid'],
  ['lines', 'Lines'],
  ['stencil', 'Stencil'],
  ['icon', 'Icon'],
  ['checker', 'Checker'],
  ['bayer', 'Bayer'],
  ['hatch', 'Hatch'],
  ['atkinson', 'Atkinson'],
  ['noise', 'Noise'],
  ['silhouette', 'Shape'],
];

// Use cases for the style picker, based on docs/styles.md.
export const STYLE_USES = {
  cutout: 'Two-tone sprites with seams between contrasting parts, such as clothing and equipment.',
  solid: 'Simple two-tone fills from brightness, for flat graphics and high-contrast art.',
  lines: 'Line art from sprite edges and color changes. Texture can add extra lines.',
  stencil: 'Filled sprites with dark inner details. Set the first color to None for holes; shading may also be selected.',
  icon: 'Small transparent inventory sprites with selected cavities and seams. Set the first color to None for holes; some details may be missed.',
  checker: 'Crisp, regular checker-pattern shading for pixel-art sprites.',
  bayer: 'Regular dot-pattern shading for sprites, illustrations and gradients.',
  hatch: 'Directional line shading for sprites and illustrations, like hatching or scanlines.',
  atkinson: 'Error-diffused shading for photos and illustrations. Changing animation frames can shimmer.',
  noise: 'Scattered-dot shading for gradients and textured images; noise positions are fixed.',
  silhouette: 'A flat, single-color mask of the source shape. Transparent gaps stay empty; opaque images become rectangles.',
};

// A palette matches the current colors either way round.
export const isPalette = (p, first, second) => (first === p.dark && second === p.light) || (first === p.light && second === p.dark);

// A palette's colors as [first, second], the way round the current colors are: dark first,
// unless Swap has put the lighter color first.
export const inOrder = (p, first, second) => (brightness(first) > brightness(second) ? [p.light, p.dark] : [p.dark, p.light]);

// The two colors as they are drawn, [first, second], when `none` says one of them is None: 1 the
// first, 2 the second, 0 neither. A None color is null, and its pixels are left empty.
// Silhouette has only first-color pixels, so with the first color None it is drawn in the second.
export const inks = (first, second, none, style) => (none === 1 ? [style === 'silhouette' ? second : null, second] : none === 2 ? [first, null] : [first, second]);

// The style `dir` places on from `style` (1 is the next, -1 the one before), wrapping at both
// ends. Returns its place in STYLES.
export const stepStyle = (style, dir) => (STYLES.findIndex(s => s[0] === style) + dir + STYLES.length) % STYLES.length;

// The palette `dir` places on from the current colors, wrapping at both ends. Colors that match
// no preset are the user's own. They are returned as `custom`, and passing that back in makes
// them one more stop after the presets, so stepping through the palettes never loses them.
export function stepPalette(first, second, dir, custom) {
  let at = PRESETS.findIndex(p => isPalette(p, first, second));
  if (at < 0) {
    const [dark, light] = brightness(first) > brightness(second) ? [second, first] : [first, second];
    custom = { name: 'Custom', dark, light };
    at = PRESETS.length;
  }
  const stops = custom ? [...PRESETS, custom] : PRESETS;
  at = (at + dir + stops.length) % stops.length;
  return { palette: stops[at], at, of: stops.length, custom };
}
