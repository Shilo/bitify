import { zipSync, zlibSync } from 'fflate';
import { hexToRgb } from './bitify.js';

// Output file names for a list of original names: extension replaced by "-1bit.png", or
// "-1bit.gif" where `kinds` says 'gif', with -2, -3... added so no two outputs collide
// (case-insensitively, for Windows).
export function outNames(names, kinds = []) {
  const taken = new Set();
  return names.map((name, n) => {
    const ext = kinds[n] === 'gif' ? 'gif' : 'png';
    const base = name.replace(/\.[^.]+$/, '').replace(/[\\/]/g, '-') || 'image';
    let out = `${base}-1bit.${ext}`;
    for (let i = 2; taken.has(out.toLowerCase()); i++) out = `${base}-${i}-1bit.${ext}`;
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

// Encodes a mask (one byte per pixel: 0 empty, 1 first color, 2 second color, the output of
// bitify's `mask`) as a PNG, by hand instead of through a canvas. Some browsers add noise to
// canvas readback as fingerprinting protection, which would put stray colors in a 1-bit image.
// The PNG lists the colors once, as a palette, and holds two bits for each pixel instead of
// four bytes. That is a sixteenth of the data to compress, so a photo saves several times
// faster, into a smaller file, and without ever being held in memory as full RGBA.
export function pngBytes({ mask, w, h, first, second }) {
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
    chunk('PLTE', Uint8Array.of(0, 0, 0, ...hexToRgb(first), ...hexToRgb(second))), // what 0, 1 and 2 stand for
    chunk('tRNS', Uint8Array.of(0)), // the first of them, the empty pixel, is see-through
    chunk('IDAT', zlibSync(rows, { level: 3 })), // twice as quick as the usual level 6, for a file about 4% larger
    chunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { png.set(p, at); at += p.length; }
  return png;
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
const kind = image => (image.frames ? 'gif' : 'png');
// The GIF code is loaded only when an animation is saved, which keeps it out of the first download.
export const fileBytes = async image => (image.frames ? (await import('./gif.js')).encodeGif(image) : pngBytes(image));

export async function saveOne(image) {
  download(new Blob([await fileBytes(image)], { type: 'image/' + kind(image) }), outNames([image.name], [kind(image)])[0]);
}

// Puts a still image, { mask, w, h, first, second }, on the clipboard as a PNG. Browsers accept no GIFs there.
// The write starts at once, with nothing awaited first, as Safari only allows it during a click or a key press.
export const copyOne = image =>
  navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([pngBytes(image)], { type: 'image/png' }) })]);

// One image saves as itself; a zip of one file would only be an extra step to open.
// `image` turns an item into what `fileBytes` takes. It is called for one item at a time, so
// that only one full-size mask is in memory at once however many photos are being saved.
export async function saveAll(items, image) {
  if (items.length === 1) return saveOne(image(items[0]));
  const kinds = [], files = [];
  for (const item of items) {
    const one = image(item);
    kinds.push(kind(one));
    files.push(await fileBytes(one));
  }
  download(new Blob([zipBytes(outNames(items.map(i => i.name), kinds), files)], { type: 'application/zip' }), 'bitify.zip');
}
