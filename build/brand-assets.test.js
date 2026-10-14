import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync, crc32 } from 'node:zlib';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const confetti = ['f47a34', '7952c7', 'e63e82', 'f4c340', '0eaaa5'];

// Independent PNG/ICO decoding: assert delivered pixels, not generator internals.
function png(path) {
  const bytes = read(path), compressed = [];
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let width, height;
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at), body = bytes.subarray(at + 4, at + 8 + length);
    expect(crc32(body)).toBe(bytes.readUInt32BE(at + 8 + length));
    const type = body.subarray(0, 4).toString();
    if (type === 'IHDR') { width = body.readUInt32BE(4); height = body.readUInt32BE(8); expect([...body.subarray(12)]).toEqual([8, 6, 0, 0, 0]); }
    if (type === 'IDAT') compressed.push(body.subarray(4));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(compressed)), pixels = Buffer.alloc(width * height * 4);
  expect(raw.length).toBe((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width * 4 + 1)]).toBe(0);
    raw.copy(pixels, y * width * 4, y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1));
  }
  return { width, height, pixels };
}
function inspect({ width, height, pixels }, background) {
  const colors = new Set(), alphas = new Set(), bounds = [width, height, -1, -1];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4, color = pixels.subarray(at, at + 3).toString('hex'), alpha = pixels[at + 3];
    alphas.add(alpha);
    if (alpha) colors.add(color);
    if (alpha && color !== background) {
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);
    }
  }
  return { colors: [...colors].sort(), alphas: [...alphas].sort((a, b) => a - b), bounds };
}

describe('transparent brand exports', () => {
  const files = ['src/assets/logo.png', 'src/assets/logo-dark.png', ...[16, 32, 48].flatMap(size => [`public/favicon-${size}x${size}.png`, `public/favicon-dark-${size}x${size}.png`])];
  it.each(files)('%s preserves every hue, transparency and full artwork bounds', path => {
    const image = png(path), dark = path.includes('dark'), expectedSize = path.startsWith('src/') ? 60 : Number(path.match(/(\d+)x/)[1]);
    expect([image.width, image.height]).toEqual([expectedSize, expectedSize]);
    const decoded = inspect(image);
    expect(decoded.colors).toEqual([...confetti, dark ? 'fffdf9' : '202020'].sort());
    expect(decoded.alphas).toEqual([0, 255]);
    expect(decoded.bounds).toEqual([0, 0, image.width - 1, image.height - 1]);
  });
  it('keeps the approved exact geometry with a transparent two-unit gap', () => {
    const svg = read('src/assets/logo.svg').toString();
    expect(svg).toContain('viewBox="0 0 30 30"');
    expect(svg).not.toContain('backplate');
    const image = png('src/assets/logo.png'), at = (x, y) => image.pixels.subarray((y * 60 + x) * 4, (y * 60 + x) * 4 + 4).toString('hex');
    expect(at(0, 0)).toBe('202020ff');
    expect(at(44, 0)).toBe('00000000');
    expect(at(48, 0)).toBe('f47a34ff');
    expect(at(16, 16)).toBe('e63e82ff');
    expect(at(16, 28)).toBe('00000000');
    expect(at(16, 32)).toBe('f4c340ff');
    expect(at(48, 16)).toBe('0eaaa5ff');
    expect(at(48, 48)).toBe('7952c7ff');
  });
  it.each(['public/favicon.ico', 'public/favicon-dark.ico'])('%s has exact RGBA frames and matching legacy transparency masks', path => {
    const bytes = read(path);
    expect(bytes.readUInt16LE(2)).toBe(1); expect(bytes.readUInt16LE(4)).toBe(3);
    for (const [i, size] of [16, 32, 48].entries()) {
      const entry = 6 + i * 16, start = bytes.readUInt32LE(entry + 12), stride = Math.ceil(size / 32) * 4;
      expect([bytes[entry], bytes[entry + 1]]).toEqual([size, size]);
      expect(bytes.readUInt16LE(start + 14)).toBe(32);
      expect(bytes.readInt32LE(start + 8)).toBe(size * 2);
      const expected = png(`public/favicon-${path.includes('dark') ? 'dark-' : ''}${size}x${size}.png`).pixels;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const from = (y * size + x) * 4, to = start + 40 + ((size - 1 - y) * size + x) * 4;
        expect([...bytes.subarray(to, to + 4)]).toEqual([expected[from + 2], expected[from + 1], expected[from], expected[from + 3]]);
        const mask = bytes[start + 40 + size * size * 4 + (size - 1 - y) * stride + (x >> 3)];
        expect(!!(mask & (1 << (7 - (x & 7))))).toBe(expected[from + 3] === 0);
      }
    }
  });
});

describe('installation exports', () => {
  const files = [192, 512].flatMap(size => [`public/pwa-${size}x${size}.png`, `public/maskable-icon-${size}x${size}.png`]).concat([152, 167, 180].map(size => `public/apple-touch-icon-${size}x${size}.png`));
  it.each(files)('%s is opaque, square and properly padded', path => {
    const image = png(path), size = Number(path.match(/(\d+)x/)[1]), decoded = inspect(image, 'fffdf9');
    expect([image.width, image.height]).toEqual([size, size]);
    expect(decoded.alphas).toEqual([255]);
    expect(decoded.colors).toEqual([...confetti, '202020', 'fffdf9'].sort());
    const [left, top, right, bottom] = decoded.bounds;
    expect(left).toBeGreaterThan(0); expect(top).toBeGreaterThan(0);
    expect(Math.abs(left - (size - right - 1))).toBeLessThanOrEqual(1);
    expect(Math.abs(top - (size - bottom - 1))).toBeLessThanOrEqual(1);
    if (path.includes('maskable')) {
      // Checking the bounding rectangle's furthest corners includes every mark pixel.
      for (const x of [left, right + 1]) for (const y of [top, bottom + 1]) expect(Math.hypot(x - size / 2, y - size / 2)).toBeLessThanOrEqual(size * 0.4);
    }
  });
  it('offers a transparent silhouette separately from ordinary and maskable icons', () => {
    const decoded = inspect(png('public/monochrome-192x192.png'));
    expect(decoded.colors).toEqual(['202020']); expect(decoded.alphas).toEqual([0, 255]);
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest.icons.filter(i => i.purpose === 'monochrome')).toHaveLength(1);
    expect(manifest.icons.filter(i => i.purpose === 'any')).toHaveLength(2);
    expect(manifest.icons.filter(i => i.purpose === 'maskable')).toHaveLength(2);
    for (const icon of manifest.icons) expect(read('public/' + icon.src).length).toBeGreaterThan(0);
  });
});
