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

// CSS object-fit: contain centers rectangular source pixels inside the canvas box.
// Anchor to their actual top-left, not the square tile or its letterbox padding.
export function canvasGridOrigin({ left, top, width, height }, { w, h }) {
  if (!(w > 0 && h > 0 && width > 0 && height > 0)) return { x: left, y: top };
  const scale = Math.min(width / w, height / h);
  return { x: left + (width - w * scale) / 2, y: top + (height - h * scale) / 2 };
}
