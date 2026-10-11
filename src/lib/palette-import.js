import { normalizeColors } from './palette-library.js';
import { checkCanceled, yieldTask } from './quantize.js';

export const MAX_IMPORT_PIXELS = 16 * 1024 * 1024;
export const MAX_DRAFT_COLORS = 4096;
export const MAX_TEXT_BYTES = 256 * 1024;

function rgbRow(line, allowName) {
  const match = (allowName ? /^\s*(\d+)\s+(\d+)\s+(\d+)(?:\s+[^\r\n]*)?\s*$/ : /^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/).exec(line);
  if (!match || match.slice(1, 4).some(n => Number(n) > 255)) throw new Error('Palette RGB rows must contain three integers between 0 and 255.');
  return '#' + match.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('');
}

export function parsePaletteText(text, kind = 'hex') {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_TEXT_BYTES) throw new Error('Palette text must be no larger than 256 KiB.');
  text = text.replace(/^\uFEFF/, '').trim();
  kind = kind.toLowerCase();
  if (kind === 'txt') kind = 'hex';
  if (kind === 'hex' && /^GIMP Palette(?:\r?\n|$)/.test(text)) kind = 'gpl';
  if (kind === 'hex' && /^JASC-PAL(?:\r?\n|$)/.test(text)) kind = 'pal';
  const lines = text.split(/\r?\n/);
  if (kind === 'gpl') {
    if (lines.shift() !== 'GIMP Palette') throw new Error('This is not a legacy RGB GIMP palette.');
    const colors = [];
    let rowsStarted = false;
    for (const line of lines) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      if (!rowsStarted && /^(?:Name:.*|Columns:\s*\d+\s*)$/.test(line)) continue;
      rowsStarted = true; colors.push(rgbRow(line, true));
      if (colors.length > MAX_DRAFT_COLORS) throw new Error('Palette files can contain at most 4096 colors for review.');
    }
    return normalizeColors(colors, MAX_DRAFT_COLORS);
  }
  if (kind === 'pal' || kind === 'jasc') {
    if (lines[0] !== 'JASC-PAL' || lines[1] !== '0100' || !/^\d+$/.test(lines[2] || '')) throw new Error('Only text JASC-PAL version 0100 is supported.');
    const count = Number(lines[2]);
    if (count < 1 || count > MAX_DRAFT_COLORS || lines.length !== count + 3) throw new Error('The JASC palette color count does not match its RGB rows.');
    return normalizeColors(lines.slice(3).map(line => rgbRow(line, false)), MAX_DRAFT_COLORS);
  }
  if (kind !== 'hex') throw new Error('Use HEX/TXT, legacy RGB GPL, or JASC-PAL files.');
  const tokens = text.split(/[\s,;]+/);
  if (tokens.some(token => !/^(?:#[\da-f]{3}|#?[\da-f]{6})$/i.test(token))) throw new Error('Paste #RGB, #RRGGBB, or six-digit hex colors separated by spaces or commas.');
  return normalizeColors(tokens, MAX_DRAFT_COLORS);
}

function validateImage(image) {
  const { width, height, data } = image || {};
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0) || width * height > MAX_IMPORT_PIXELS || !data || data.length !== width * height * 4) throw new Error('Palette images must contain valid pixels and no more than 16 megapixels.');
}

// Every visible RGB is checked. A 24-bit membership bitset uses 2 MiB regardless
// of entropy; only the first 4096 candidates become strings for review.
export async function extractPalette(image, { solid = false, signal, onProgress } = {}) {
  checkCanceled(signal); validateImage(image);
  const { width, height, data } = image, length = width * height;
  const bits = new Uint8Array(1 << 21), colors = [];
  let total = 0, partialAlpha = false;
  const chunk = 32768;
  for (let start = 0; start < length; start += chunk) {
    checkCanceled(signal);
    for (let pixel = start; pixel < Math.min(start + chunk, length); pixel++) {
      const p = pixel * 4, alpha = data[p + 3];
      if (!alpha) continue;
      if (alpha < 255) partialAlpha = true;
      const key = data[p] << 16 | data[p + 1] << 8 | data[p + 2], byte = key >>> 3, flag = 1 << (key & 7);
      if (!solid) {
        if (!(bits[byte] & flag)) {
          bits[byte] |= flag; total++;
          if (colors.length < MAX_DRAFT_COLORS) colors.push('#' + key.toString(16).padStart(6, '0'));
        }
      } else {
        const x = pixel % width, y = Math.floor(pixel / width);
        if (!x || x === width - 1 || !y || y === height - 1 || bits[byte] & flag) continue;
        // Palette colors are opaque RGB: varying visible alpha does not split a
        // color. A fully empty neighbor is excluded from solid candidates.
        let flat = true;
        for (let dy = -1; dy <= 1 && flat; dy++) for (let dx = -1; dx <= 1; dx++) {
          const n = ((y + dy) * width + x + dx) * 4;
          if (!data[n + 3] || data[n] !== data[p] || data[n + 1] !== data[p + 1] || data[n + 2] !== data[p + 2]) { flat = false; break; }
        }
        if (flat) bits[byte] |= flag;
      }
    }
    onProgress?.(Math.min(start + chunk, length) / length * (solid ? .5 : 1));
    if (start + chunk < length || solid) await yieldTask();
  }
  if (solid) {
    // Revisit the original in reading order, so cleanup does not reorder a color
    // whose first pixel lay at the edge of its solid patch.
    for (let start = 0; start < length; start += chunk) {
      checkCanceled(signal);
      for (let pixel = start; pixel < Math.min(start + chunk, length); pixel++) {
        const p = pixel * 4;
        if (!data[p + 3]) continue;
        const key = data[p] << 16 | data[p + 1] << 8 | data[p + 2], byte = key >>> 3, flag = 1 << (key & 7);
        if (bits[byte] & flag) {
          bits[byte] &= ~flag; total++;
          if (colors.length < MAX_DRAFT_COLORS) colors.push('#' + key.toString(16).padStart(6, '0'));
        }
      }
      onProgress?.(.5 + Math.min(start + chunk, length) / length * .5);
      if (start + chunk < length) await yieldTask();
    }
  }
  checkCanceled(signal);
  return { colors, total, partialAlpha, overLimit: total > 256, truncated: total > MAX_DRAFT_COLORS };
}
