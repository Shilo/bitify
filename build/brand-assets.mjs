// Production icon exports from the approved SVG. No image-processing dependency.
// node build/brand-assets.mjs [--check]
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('src/assets/logo.svg', root), 'utf8');
const check = process.argv.includes('--check');
const rects = [...source.matchAll(/<rect\b([^>]+)\/>/g)].map(([, text]) => {
  const attrs = Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
  return { x: Number(attrs.x ?? 0), y: Number(attrs.y ?? 0), width: Number(attrs.width),
    height: Number(attrs.height), fill: attrs.fill, background: attrs.id === 'backplate' };
});
const background = rects.find(r => r.background).fill;
const mark = rects.filter(r => !r.background);
assert.equal(mark.length, 8);
const rgb = hex => Buffer.from(hex.slice(1), 'hex');

// Each edge snaps once to the output grid. No interpolated or blended colors.
function raster(size, { maskable = false } = {}) {
  const grid = maskable ? 56 : 38, inset = maskable ? 9 : 0;
  const pixels = Buffer.alloc(size * size * 4);
  const backplate = rgb(background);
  for (let i = 0; i < pixels.length; i += 4) { backplate.copy(pixels, i); pixels[i + 3] = 255; }
  for (const rect of mark) {
    const left = Math.round((rect.x + inset) * size / grid);
    const top = Math.round((rect.y + inset) * size / grid);
    const right = Math.round((rect.x + rect.width + inset) * size / grid);
    const bottom = Math.round((rect.y + rect.height + inset) * size / grid);
    const color = rgb(rect.fill);
    assert(right > left && bottom > top, 'Every logo piece must survive export');
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (maskable) {
        // Check the furthest corner of each foreground pixel, not just its center.
        const dx = Math.max(Math.abs(x - size / 2), Math.abs(x + 1 - size / 2));
        const dy = Math.max(Math.abs(y - size / 2), Math.abs(y + 1 - size / 2));
        assert(Math.hypot(dx, dy) <= size * 0.4, 'Mark exceeds maskable safe circle');
      }
      const at = (y * size + x) * 4;
      color.copy(pixels, at); pixels[at + 3] = 255;
    }
  }
  return pixels;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n;
});
function chunk(type, data) {
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length); bytes.write(type, 4, 4, 'ascii'); data.copy(bytes, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, -4)) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, bytes.length - 4);
  return bytes;
}
function png(size, options) {
  const pixels = raster(size, options), header = Buffer.alloc(13);
  header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('sRGB', Buffer.from([0])), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function ico(sizes) {
  const entries = sizes.map(size => {
    const rgba = raster(size), maskBytes = Math.ceil(size / 32) * 4 * size;
    const dib = Buffer.alloc(40 + rgba.length + maskBytes);
    dib.writeUInt32LE(40); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
    dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(rgba.length + maskBytes, 20);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const from = (y * size + x) * 4, to = 40 + ((size - 1 - y) * size + x) * 4;
      dib[to] = rgba[from + 2]; dib[to + 1] = rgba[from + 1]; dib[to + 2] = rgba[from]; dib[to + 3] = 255;
    }
    return { size, dib };
  });
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, dib }, i) => {
    const at = 6 + i * 16;
    header[at] = size; header[at + 1] = size;
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(dib.length, at + 8); header.writeUInt32LE(offset, at + 12); offset += dib.length;
  });
  return Buffer.concat([header, ...entries.map(e => e.dib)]);
}

const outputs = new Map([
  ['public/favicon.svg', Buffer.from(source)],
  ['public/favicon.ico', ico([16, 32, 48])],
  ['src/assets/logo.png', png(76)],
]);
for (const size of [16, 32]) outputs.set(`public/favicon-${size}x${size}.png`, png(size));
for (const size of [192, 512]) {
  outputs.set(`public/pwa-${size}x${size}.png`, png(size));
  outputs.set(`public/maskable-icon-${size}x${size}.png`, png(size, { maskable: true }));
}
for (const size of [152, 167, 180]) outputs.set(`public/apple-touch-icon-${size}x${size}.png`, png(size));
for (const [path, bytes] of outputs) {
  const url = new URL(path, root);
  if (check) assert.deepEqual(readFileSync(url), bytes, `${path} is out of date: run npm run icons`);
  else writeFileSync(url, bytes);
}
console.log(`${check ? 'Verified' : 'Generated'} ${outputs.size} exports; every piece survives and maskable foreground fits the safe circle.`);
