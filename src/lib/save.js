import { zipSync, zlibSync, zlib } from 'fflate';
import { hexToRgb } from './bitify.js';
import { exportPalette, markUsed, markUsedAsync, compactTable, EMPTY_INDEX, yieldExport } from './palette-export.js';
import { checkCanceled } from './quantize.js';

// Output file names for a list of original names: extension replaced by "-1bit.png", or
// "-1bit.gif" where `kinds` says 'gif', with -2, -3... added so no two outputs collide
// (case-insensitively, for Windows). Full-palette families use "-palette" instead.
export function outNames(names, kinds = [], families = []) {
  const taken = new Set();
  return names.map((name, n) => {
    const ext = kinds[n] === 'gif' ? 'gif' : 'png';
    const base = name.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-') || 'image';
    const suffix = families[n] === 'full-palette' ? 'palette' : '1bit';
    let out = `${base}-${suffix}.${ext}`;
    for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${base}-${i}-${suffix}.${ext}`;
    taken.add(out.toLowerCase());
    return out;
  });
}

// PNGs are already compressed, so entries are stored as they are.
export function zipBytes(names, files) {
  return zipSync(Object.fromEntries(names.map((name, i) => [name, files[i]])), { level: 0 });
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n;
});
function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set([...type].map(ch => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function chunkAsync(type, data, signal) {
  checkCanceled(signal);
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set([...type].map(ch => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  let crc = ~0;
  const end = 8 + data.length, batch = 262144;
  for (let start = 4; start < end; start += batch) {
    checkCanceled(signal);
    for (let at = start, stop = Math.min(end, start + batch); at < stop; at++) crc = CRC_TABLE[(crc ^ out[at]) & 255] ^ (crc >>> 8);
    if (start + batch < end) await yieldExport();
  }
  view.setUint32(end, ~crc >>> 0);
  return out;
}

// Encodes a mask (one byte per pixel: 0 empty, 1 first color, 2 second color, the output of
// bitify's `mask`) as a PNG, by hand instead of through a canvas. Some browsers add noise to
// canvas readback as fingerprinting protection, which would put stray colors in a 1-bit image.
// The PNG lists the colors once, as a palette, and holds two bits for each pixel instead of
// four bytes. That is a sixteenth of the data to compress, so a photo saves several times
// faster, into a smaller file, and without ever being held in memory as full RGBA.
// A color that is None (null) is made see-through like the empty pixel. The picture then has one
// color, and both see-through entries of the palette hold it too, so that a program which blends
// the edges of the picture has no other color to pull in. With two colors the empty pixel's
// entry is black, as it always was.
export function pngBytes(image) {
  if (image.colors) return palettePngBytes(image);
  const { mask, w, h, first, second } = image;
  const head = new Uint8Array(13);
  new DataView(head.buffer).setUint32(0, w);
  new DataView(head.buffer).setUint32(4, h);
  head.set([2, 3, 0, 0, 0], 8); // 2 bits per pixel, colors from a palette, no interlace
  // each row: filter byte 0, then its pixels four to a byte, the first in the top two bits
  const stride = Math.ceil(w / 4) + 1, rows = new Uint8Array(stride * h);
  for (let y = 0, p = 0; y < h; y++) for (let x = 0, at = y * stride + 1; x < w; x++, p++) rows[at + (x >> 2)] |= mask[p] << (6 - 2 * (x & 3));
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', head),
    chunk('PLTE', Uint8Array.of(...(first && second ? [0, 0, 0] : hexToRgb(first ?? second)), ...hexToRgb(first ?? second), ...hexToRgb(second ?? first))), // what 0, 1 and 2 stand for
    chunk('tRNS', Uint8Array.from(first ? (second ? [0] : [0, 255, 0]) : [0, 0])), // how solid each is: the empty pixel is see-through, and so is a color that is None
    chunk('IDAT', zlibSync(rows, { level: 3 })), // twice as quick as the usual level 6, for a file about 4% larger
    chunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { png.set(p, at); at += p.length; }
  return png;
}

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

function assemblePng(parts) {
  const result = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function palettePngLayout(image, state) {
  if (!state) {
    state = exportPalette(image);
    markUsed(image.indices, state);
  }
  const { table, map, transparent } = compactTable(state);
  const rgba = table.length > 256;
  const depth = rgba ? 8 : table.length <= 2 ? 1 : table.length <= 4 ? 2 : table.length <= 16 ? 4 : 8;
  const stride = (rgba ? image.w * 4 : Math.ceil(image.w * depth / 8)) + 1;
  const head = new Uint8Array(13), view = new DataView(head.buffer);
  view.setUint32(0, image.w); view.setUint32(4, image.h);
  head.set([depth, rgba ? 6 : 3, 0, 0, 0], 8);
  const parts = [PNG_SIGNATURE, chunk('IHDR', head), chunk('sRGB', Uint8Array.of(0))];
  if (!rgba) {
    const plte = new Uint8Array(table.length * 3);
    for (let i = 0; i < table.length; i++) {
      plte[i * 3] = table[i] >> 16; plte[i * 3 + 1] = table[i] >> 8; plte[i * 3 + 2] = table[i];
    }
    parts.push(chunk('PLTE', plte));
    if (transparent !== null) parts.push(chunk('tRNS', Uint8Array.of(0)));
  }
  return { ...state, map, rgba, depth, stride, parts, rows: new Uint8Array(stride * image.h) };
}

function packPaletteRows(image, layout, start, end) {
  const { w, indices } = image;
  const { rgba, rgb, map, depth, stride, rows } = layout;
  for (let y = start, p = start * w; y < end; y++) {
    const offset = y * stride + 1;
    if (rgba) {
      for (let x = 0; x < w; x++, p++) {
        const index = indices[p], at = offset + x * 4;
        if (index === EMPTY_INDEX) continue;
        const color = rgb[index];
        rows[at] = color >> 16; rows[at + 1] = color >> 8; rows[at + 2] = color; rows[at + 3] = 255;
      }
    } else {
      for (let x = 0; x < w; x++, p++) {
        const bit = x * depth;
        rows[offset + (bit >> 3)] |= map[indices[p]] << (8 - depth - (bit & 7));
      }
    }
  }
}

// Only used colors take a table slot. 256 opaque colors plus empty need RGBA;
// those bytes are written directly, with the same exact palette membership.
export function palettePngBytes(image) {
  const layout = palettePngLayout(image);
  packPaletteRows(image, layout, 0, image.h);
  return assemblePng([...layout.parts, chunk('IDAT', zlibSync(layout.rows, { level: 3 })), chunk('IEND', new Uint8Array(0))]);
}

// New-family jobs pack bounded row batches and compress in fflate's worker.
// Legacy pngBytes remains the existing synchronous, byte-identical path.
export async function palettePngBytesAsync(image, { signal } = {}) {
  checkCanceled(signal);
  const state = exportPalette(image);
  await markUsedAsync(image.indices, state, { signal });
  const layout = palettePngLayout(image, state);
  const batch = Math.max(1, Math.floor(65536 / image.w));
  for (let y = 0; y < image.h; y += batch) {
    checkCanceled(signal);
    packPaletteRows(image, layout, y, Math.min(image.h, y + batch));
    if (y + batch < image.h) await yieldExport();
  }
  checkCanceled(signal);
  const compressed = await new Promise((resolve, reject) => {
    let terminate, settled = false;
    const finish = (error, data) => {
      if (settled) return; settled = true;
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(data);
    };
    const cancel = () => {
      if (settled) return;
      terminate?.(); finish(new DOMException('The export was canceled.', 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      terminate = zlib(layout.rows, { level: 3, consume: true }, (error, data) => {
        if (signal?.aborted) { cancel(); return; }
        finish(error, data);
      });
    } catch (error) { finish(error); }
  });
  const idat = await chunkAsync('IDAT', compressed, signal);
  checkCanceled(signal);
  return assemblePng([...layout.parts, idat, chunk('IEND', new Uint8Array(0))]);
}

function download(blob, filename) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// A still image here is { name, w, h, first, second, mask }: the original file name, the two
// colors and the image's mask. An animation has { loop, frames: [{ mask, delay }] } in place of mask.
// Full palettes use { family, colors, indices } instead of the pair and mask;
// an animation may expose replayable { frameCount, getFrame(index), loop }.
const kind = image => (image.frames || image.getFrame ? 'gif' : 'png');
// The filename offered to the browser for one image; shared with the toast so its text matches the download.
export const downloadName = image => outNames([image.name], [kind(image)], [image.family])[0];
// The GIF code is loaded only when an animation is saved, which keeps it out of the first download.
export const fileBytes = async (image, { signal } = {}) => {
  checkCanceled(signal);
  if (kind(image) === 'gif') {
    const gif = await import('./gif.js');
    checkCanceled(signal);
    return image.colors ? gif.encodeGif(image, { signal }) : gif.encodeGifAsync(image, { signal });
  }
  return image.colors ? palettePngBytesAsync(image, { signal }) : pngBytes(image);
};

export async function saveOne(image) {
  download(new Blob([await fileBytes(image)], { type: 'image/' + kind(image) }), downloadName(image));
}

// A still image as a PNG file in memory. Full palettes return a promise of its
// Blob, because row packing/checksums yield and compression runs in a worker.
export const pngBlob = image => image.colors
  ? palettePngBytesAsync(image).then(bytes => new Blob([bytes], { type: 'image/png' }))
  : new Blob([pngBytes(image)], { type: 'image/png' });

// Puts a PNG, as `pngBlob` makes it, on the clipboard. Browsers accept no GIFs there.
// The write starts at once, with nothing awaited first, as Safari only allows it during a click or a key press.
// `png` may be a promise of the PNG, for a caller that needs a moment before making it: the
// clipboard is promised it now and given it when it is ready.
export const copyOne = png => navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(png) })]);

// One image saves as itself; a zip of one file would only be an extra step to open.
// `image` turns an item into what `fileBytes` takes. It is called for one item at a time, so
// that only one full-size mask is in memory at once however many photos are being saved.
// It may be asynchronous. No download occurs unless every file encoded successfully.
export async function saveAll(items, image) {
  if (items.length === 1) return saveOne(await image(items[0]));
  const kinds = [], families = [], names = [], files = [];
  for (const [index, item] of items.entries()) {
    const one = await image(item);
    kinds.push(kind(one));
    families.push(one.family);
    names.push(one.name);
    files.push(await fileBytes(one));
    // A batch of synchronous 1-bit stills must give input and rendering a turn
    // between files. Keep final ZIP assembly and download atomic.
    if (index + 1 < items.length) await yieldExport();
  }
  download(new Blob([zipBytes(outNames(names, kinds, families), files)], { type: 'application/zip' }), 'bitify.zip');
}
