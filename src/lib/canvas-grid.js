// One continuous canvas uses a representative CSS-pixel/source-pixel scale.
// It is a visual guide, not a pixel-aligned grid for every independently fitted image.
export function canvasGridSpacing(images, across) {
  const scales = images
    .map(({ w, h }) => across / Math.max(w, h))
    .filter(scale => Number.isFinite(scale) && scale > 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(scales.length / 2);
  const scale = !scales.length ? 2 : scales.length % 2 ? scales[mid] : (scales[mid - 1] + scales[mid]) / 2;
  // Zoomed-out photos can put 16 source pixels into less than one screen pixel.
  // Skip subdivisions in powers of two instead of painting a dense opaque pattern.
  const multiple = Math.max(1, 2 ** Math.ceil(Math.log2(8 / (16 * scale))));
  const sourceCell = 16 * multiple;
  return { scale, sourceCell, step: sourceCell * scale };
}
