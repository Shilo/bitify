import { zipSync, zlibSync } from 'fflate';

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
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
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

// Encodes RGBA pixels as a PNG by hand instead of through a canvas. Some browsers add noise to
// canvas readback as fingerprinting protection, which would put stray colors in a 1-bit image.
export function pngBytes({ pixels, w, h }) {
  const head = new Uint8Array(13);
  new DataView(head.buffer).setUint32(0, w);
  new DataView(head.buffer).setUint32(4, h);
  head.set([8, 6, 0, 0, 0], 8); // 8 bits per channel, RGBA, no interlace
  const stride = w * 4 + 1, rows = new Uint8Array(stride * h); // each row: filter byte 0, then its pixels
  for (let y = 0; y < h; y++) rows.set(pixels.subarray(y * w * 4, (y + 1) * w * 4), y * stride + 1);
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk('IHDR', head),
    chunk('IDAT', zlibSync(rows)),
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

// A still image here is { name, pixels, w, h }: the original file name and its bitified RGBA
// pixels. An animation is { name, w, h, first, second, loop, frames: [{ mask, delay }] }.
const kind = image => (image.frames ? 'gif' : 'png');
// The GIF code is loaded only when an animation is saved, which keeps it out of the first download.
export const fileBytes = async image => (image.frames ? (await import('./gif.js')).encodeGif(image) : pngBytes(image));

export async function saveOne(image) {
  download(new Blob([await fileBytes(image)], { type: 'image/' + kind(image) }), outNames([image.name], [kind(image)])[0]);
}

// One image saves as itself; a zip of one file would only be an extra step to open.
export async function saveAll(images) {
  if (images.length === 1) return saveOne(images[0]);
  const zip = zipBytes(outNames(images.map(i => i.name), images.map(kind)), await Promise.all(images.map(fileBytes)));
  download(new Blob([zip], { type: 'application/zip' }), 'bitify.zip');
}
