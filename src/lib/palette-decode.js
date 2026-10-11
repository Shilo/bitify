import { extractPalette, parsePaletteText, MAX_IMPORT_PIXELS, MAX_TEXT_BYTES } from './palette-import.js';
import { checkCanceled } from './quantize.js';

export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;

// Uses the same color-managed browser decoding as artwork import. Exact means
// decoded sRGB values, not preservation of arbitrary embedded-profile file bytes.
export async function decodePaletteFile(file, { signal, onProgress } = {}) {
  checkCanceled(signal);
  const extension = file.name?.split('.').pop()?.toLowerCase();
  if (['hex', 'txt', 'gpl', 'pal'].includes(extension)) {
    if (file.size > MAX_TEXT_BYTES) throw new Error('Palette files must be no larger than 256 KiB.');
    const colors = parsePaletteText(await file.text(), extension);
    checkCanceled(signal);
    return { image: null, colors, total: colors.length, partialAlpha: false, overLimit: colors.length > 256, truncated: false, firstFrame: false, source: { kind: extension === 'txt' ? 'hex' : extension } };
  }
  if (!['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(extension) && !/^image\/(png|jpeg|webp|bmp|gif)$/.test(file.type || '')) throw new Error('Use a PNG, JPEG, WebP, BMP, GIF, HEX/TXT, GPL or JASC-PAL file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Palette images must be no larger than 32 MiB.');
  const bitmap = await createImageBitmap(file);
  let canvas;
  try {
    checkCanceled(signal);
    if (bitmap.width * bitmap.height > MAX_IMPORT_PIXELS) throw new Error('Palette images must be no larger than 16 megapixels.');
    canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    if (!context) throw new Error('Your browser could not read this palette image.');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = await extractPalette(image, { signal, onProgress });
    return { image, ...result, firstFrame: extension === 'gif' || file.type === 'image/gif', source: { kind: 'image' } };
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
