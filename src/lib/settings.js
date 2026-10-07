// The settings kept between visits: the two colors, the style and the threshold (null means Auto).
export const DEFAULTS = { first: '#222323', second: '#f0f6f0', style: 'cutout', threshold: null };

const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

// Reads settings back from stored text. The text may be missing, damaged or written by an older
// version, so each value is checked on its own and anything unusable falls back to its default.
export function restore(text, styles) {
  let saved;
  try {
    saved = JSON.parse(text);
  } catch {
    // not JSON; use the defaults
  }
  const { first, second, style, threshold } = saved && typeof saved === 'object' ? saved : {};
  return {
    first: isColor(first) ? first : DEFAULTS.first,
    second: isColor(second) ? second : DEFAULTS.second,
    style: styles.includes(style) ? style : DEFAULTS.style,
    threshold: Number.isInteger(threshold) && threshold >= 1 && threshold <= 254 ? threshold : null,
  };
}
