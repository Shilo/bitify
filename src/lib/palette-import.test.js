import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { parsePaletteText, extractPalette } from './palette-import.js';

// Fixture-only independent RGB/RGBA PNG reader, not an application decoder.
function fixture(name) {
  const bytes = readFileSync(new URL('./fixtures/palette-import/' + name + '.png', import.meta.url));
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), channels = bytes[25] === 6 ? 4 : 3;
  expect(bytes[24]).toBe(8); expect([2, 6]).toContain(bytes[25]); expect(bytes[28]).toBe(0);
  const chunks = [];
  for (let p = 8; p < bytes.length;) {
    const length = bytes.readUInt32BE(p);
    if (bytes.toString('ascii', p + 4, p + 8) === 'IDAT') chunks.push(bytes.subarray(p + 8, p + 8 + length));
    p += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, rows = new Uint8Array(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? rows[y * stride + x - channels] : 0, b = y ? rows[(y - 1) * stride + x] : 0, c = y && x >= channels ? rows[(y - 1) * stride + x - channels] : 0;
      rows[y * stride + x] = raw[y * (stride + 1) + x + 1] + [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) { data.set(rows.subarray(i * channels, i * channels + 3), i * 4); data[i * 4 + 3] = channels === 4 ? rows[i * 4 + 3] : 255; }
  return { width, height, data };
}

describe('palette text import', () => {
  it('bounds malformed GPL rows without ambiguous whitespace backtracking', () => {
    // A regressed synchronous regex cannot be interrupted by Vitest's timeout.
    // Run the large adversarial witness in a separately killable process.
    const child = spawnSync(process.execPath, ['--input-type=module', '-e',
      "const {parsePaletteText}=await import(process.argv[1]); try { parsePaletteText('GIMP Palette\\n0 0 0'+' '.repeat(200000)+'a\\rb','gpl'); process.exit(1); } catch(error) { process.exit(error.message.includes('Palette RGB rows') ? 0 : 2); }",
      new URL('./palette-import.js', import.meta.url).href], { timeout: 5000 });
    expect(child.error).toBeUndefined(); expect(child.status).toBe(0);
    expect(parsePaletteText('GIMP Palette\n  1\t2  3   named shade  \n255 0 128', 'gpl')).toEqual(['#010203', '#ff0080']);
    expect(() => parsePaletteText('GIMP Palette\n1 2 3Name', 'gpl')).toThrow('Palette RGB rows');
    expect(() => parsePaletteText('JASC-PAL\n0100\n1\n1 2 3 name', 'pal')).toThrow('Palette RGB rows');
  }, 10000);
  it('accepts explicit hex grammar and deduplicates without mining arbitrary documents', () => {
    expect(parsePaletteText('\uFEFF#ABC, abcdef;\n000000 #aabbcc')).toEqual(['#aabbcc', '#abcdef', '#000000']);
    for (const text of ['', 'aabbccgarbage', '#1234', '#12345678', 'Color: #abcdef', '<style>#abcdef</style>', '#abcdef,,x']) expect(() => parsePaletteText(text)).toThrow();
  });
  it('parses legacy RGB GPL metadata/comments and rejects invalid/extended rows', () => {
    expect(parsePaletteText('GIMP Palette\nName: My colors\nColumns: 2\n# comment\n255 0 16 Red\n0 255 0\n255 0 16 Duplicate', 'gpl')).toEqual(['#ff0010', '#00ff00']);
    for (const text of ['GIMP Palette\n256 0 0', 'GIMP Palette\n-1 0 0', 'GIMP Palette\n1.2 0 0', 'GIMP Palette\nRGB 0 0 0', 'GIMP Palette\n']) expect(() => parsePaletteText(text, 'gpl')).toThrow();
  });
  it('enforces JASC-PAL header/version/declared row count and rejects binary PAL', () => {
    expect(parsePaletteText('JASC-PAL\n0100\n2\n0 0 0\n255 255 255\n', 'pal')).toEqual(['#000000', '#ffffff']);
    for (const text of ['RIFF binary', 'JASC-PAL\n0200\n1\n1 2 3', 'JASC-PAL\n0100\n2\n1 2 3', 'JASC-PAL\n0100\n1\n1 2 3 4']) expect(() => parsePaletteText(text, 'pal')).toThrow();
  });
});

describe('full pixel palette extraction', () => {
  it('matches all three attached fixtures exactly and offers cleanup only when requested', async () => {
    for (const [name, exact, flat] of [['tiny', 255, 0], ['strip', 31, 31], ['grid', 345, 31]]) {
      const source = fixture(name), original = source.data.slice();
      expect((await extractPalette(source)).total).toBe(exact);
      const cleaned = await extractPalette(source, { solid: true });
      expect(cleaned.total).toBe(flat);
      expect(source.data).toEqual(original);
      if (name === 'strip') expect(cleaned.colors.filter(c => c !== '#202125')).toHaveLength(30);
      if (name === 'grid') expect(cleaned.colors.filter(c => c !== '#babacc')).toHaveLength(30);
    }
  });
  it('keeps rare pixels, black/white and visible partial alpha, while skipping alpha zero', async () => {
    const source = { width: 5, height: 1, data: Uint8ClampedArray.of(255, 255, 255, 255, 0, 0, 0, 1, 1, 2, 3, 0, 80, 90, 100, 127, 0, 0, 0, 255) };
    expect(await extractPalette(source)).toMatchObject({ colors: ['#ffffff', '#000000', '#505a64'], total: 3, partialAlpha: true, overLimit: false });
    expect((await extractPalette(source, { solid: true })).colors).toEqual([]);
  });
  it('treats matching visible RGB with varying alpha as a solid candidate, but excludes empty neighbors', async () => {
    const data = Uint8ClampedArray.from(Array.from({ length: 9 }, (_, i) => [11, 22, 33, i ? 255 : 1]).flat());
    const source = { width: 3, height: 3, data };
    expect(await extractPalette(source, { solid: true })).toMatchObject({ colors: ['#0b1621'], partialAlpha: true, total: 1 });
    data[3] = 0;
    expect((await extractPalette(source, { solid: true })).colors).toEqual([]);
  });
  it('counts beyond the retained4096 draft limit honestly and never repeats colors', async () => {
    const data = new Uint8ClampedArray(4097 * 4);
    for (let i = 0; i < 4097; i++) data.set([i >> 16, i >> 8 & 255, i & 255, 255], i * 4);
    const result = await extractPalette({ width: 4097, height: 1, data });
    expect(result.total).toBe(4097); expect(result.colors).toHaveLength(4096);
    expect(result.truncated).toBe(true); expect(result.overLimit).toBe(true);
    expect(new Set(result.colors).size).toBe(4096);
  });
  it('reports transparent images, supports cancel and rejects invalid dimensions', async () => {
    expect(await extractPalette({ width: 1, height: 1, data: new Uint8ClampedArray(4) })).toMatchObject({ colors: [], total: 0 });
    const controller = new AbortController(); controller.abort();
    await expect(extractPalette(fixture('tiny'), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const active = new AbortController();
    await expect(extractPalette(fixture('strip'), { signal: active.signal, onProgress: () => active.abort() })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(extractPalette({ width: 5000, height: 5000, data: [] })).rejects.toThrow(/16 megapixels/);
  });
});
