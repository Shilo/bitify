// Palette alpha policy is independent of target RGB and matching distance.
export const normalizeAlphaMode = value => value === 'keep' ? 'keep' : 'cut';
export const effectiveAlphaCut = (mode, cut = 128) => normalizeAlphaMode(mode) === 'keep' ? 1 : cut;

export function paletteAlpha(image) {
  if (image.alpha === undefined) return null;
  if (!(image.alpha instanceof Uint8Array) || image.alpha.length !== image.w * image.h) throw new Error('Invalid palette alpha buffer.');
  return image.alpha;
}

export function inspectAlphaPixel(alpha, indices, p) {
  const value = alpha[p];
  if ((indices[p] === 256) !== (value === 0)) throw new Error('Palette alpha does not match its empty pixels.');
  return value > 0 && value < 255;
}
