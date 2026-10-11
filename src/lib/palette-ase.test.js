import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseAsePalette } from './palette-ase.js';

const bytes = (...values) => Uint8Array.from(values.flat());
const join = arrays => { const result = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0)); let at = 0; for (const a of arrays) { result.set(a, at); at += a.length; } return result; };
const word = value => bytes(value & 255, value >>> 8 & 255);
const dword = value => bytes(value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255);
const chunk = (type, data = new Uint8Array()) => join([dword(data.length + 6), word(type), data]);
const rgba = (r, g, b, a = 255) => [r, g, b, a];
function modern(colors, { size = colors.length, first = 0, last = first + colors.length - 1, names, flags = 0 } = {}) {
  return chunk(0x2019, join([dword(size), dword(first), dword(last), new Uint8Array(8), ...colors.map((color, index) => {
    const name = names?.[index];
    const text = name === undefined ? null : new TextEncoder().encode(name);
    return join([word(flags || (text ? 1 : 0)), bytes(color), ...(text ? [word(text.length), text] : [])]);
  })]));
}
function legacy(type, packets) {
  return chunk(type, join([word(packets.length), ...packets.map(({ skip, colors }) => join([bytes(skip, colors.length === 256 ? 0 : colors.length), bytes(colors.flat())]))]));
}
function frame(chunks, newCount = false) {
  const data = join(chunks), header = new Uint8Array(16), v = new DataView(header.buffer);
  v.setUint32(0, data.length + 16, true); v.setUint16(4, 0xf1fa, true);
  v.setUint16(6, newCount ? 0xffff : chunks.length, true); v.setUint16(8, 80, true);
  if (newCount) v.setUint32(12, chunks.length, true);
  return join([header, data]);
}
function file(frames, { count = 256, depth = 8, transparent = 0 } = {}) {
  const header = new Uint8Array(128), v = new DataView(header.buffer), data = join(frames);
  v.setUint32(0, 128 + data.length, true); v.setUint16(4, 0xa5e0, true); v.setUint16(6, frames.length, true);
  v.setUint16(8, 16, true); v.setUint16(10, 16, true); v.setUint16(12, depth, true);
  header[28] = transparent; v.setUint16(32, count, true);
  return join([header, data]).buffer;
}
function change(buffer, at, value, size = 4) {
  const result = buffer.slice(0), v = new DataView(result);
  if (size === 2) v.setUint16(at, value, true); else v.setUint32(at, value, true);
  return result;
}
const red = rgba(255, 0, 0), green = rgba(0, 255, 0), blue = rgba(0, 0, 255);

describe('embedded Aseprite palette import', () => {
  it('preserves ordered RGB, deduplicates RGB, skips alpha zero and reports partial alpha', async () => {
    const result = await parseAsePalette(file([frame([modern([red, rgba(12, 34, 56, 1), rgba(99, 99, 99, 0), rgba(255, 0, 0, 128), blue], { names: ['red', '青'] })])]));
    expect(result).toEqual({ image: null, colors: ['#ff0000', '#0c2238', '#0000ff'], total: 3, partialAlpha: true, overLimit: false, truncated: false, firstFrame: false, source: { kind: 'aseprite' } });
  });
  it('keeps an opaque indexed-header transparent slot as a legitimate palette entry', async () => {
    const result = await parseAsePalette(file([frame([modern([red, green])])], { transparent: 1 }));
    expect(result.colors).toEqual(['#ff0000', '#00ff00']);
  });
  it('uses only the first frame table and notices additional frames', async () => {
    const result = await parseAsePalette(file([frame([modern([red])]), frame([modern([blue])])]));
    expect(result.colors).toEqual(['#ff0000']); expect(result.firstFrame).toBe(true);
  });
  it('does not invent a palette from later frames or cel data', async () => {
    await expect(parseAsePalette(file([frame([chunk(0x2005, bytes(1, 2, 3))]), frame([modern([red])])]))).rejects.toThrow('No embedded palette');
  });
  it.each([0x0004, 0x0011])('prefers modern tables over legacy type %# regardless of chunk order', async type => {
    const old = legacy(type, [{ skip: 0, colors: [[0, 0, 0]] }]);
    for (const chunks of [[old, modern([red])], [modern([red]), old]]) expect((await parseAsePalette(file([frame(chunks)]))).colors).toEqual(['#ff0000']);
  });
  it('merges known modern ranges in index order, including overlapping updates', async () => {
    const result = await parseAsePalette(file([frame([modern([blue], { size: 3, first: 2 }), modern([red, green], { size: 0 }), modern([rgba(12, 34, 56)], { size: 0, first: 1 })])]));
    expect(result.colors).toEqual(['#ff0000', '#0c2238', '#0000ff']);
  });
  it('supports unchanged modern size from explicit header size without inventing entries', async () => {
    expect((await parseAsePalette(file([frame([modern([red, green], { size: 0 })])], { count: 2 }))).colors).toEqual(['#ff0000', '#00ff00']);
  });
  it('rejects modern holes even when a legacy table could fill them', async () => {
    const old = legacy(0x0004, [{ skip: 0, colors: [[0, 0, 0], [1, 1, 1]] }]);
    await expect(parseAsePalette(file([frame([old, modern([red], { size: 2 })])], { count: 2 }))).rejects.toThrow('incomplete');
  });
  it('does not resurrect removed entries after modern shrink and expansion', async () => {
    await expect(parseAsePalette(file([frame([modern([red, green, blue]), modern([red], { size: 1 }), modern([green], { size: 3, first: 1 })])]))).rejects.toThrow('incomplete');
  });
  it('legacy packet skips accumulate from previous packet starts, not their ends', async () => {
    const result = await parseAsePalette(file([frame([legacy(0x0004, [{ skip: 0, colors: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, { skip: 2, colors: [[10, 11, 12], [13, 14, 15]] }])])], { count: 4 }));
    expect(result.colors).toEqual(['#010203', '#040506', '#0a0b0c', '#0d0e0f']);
  });
  it('legacy six-bit expansion matches official bit replication, not rounded scaling', async () => {
    const result = await parseAsePalette(file([frame([legacy(0x0011, [{ skip: 0, colors: [[15, 16, 48], [0, 63, 31]] }])])], { count: 2 }));
    expect(result.colors).toEqual(['#3c41c3', '#00ff7d']);
    await expect(parseAsePalette(file([frame([legacy(0x0011, [{ skip: 0, colors: [[64, 0, 0]] }])])], { count: 1 }))).rejects.toThrow('Invalid');
  });
  it('legacy zero packet count means 256 colors and zero header colors means 256', async () => {
    const colors = Array.from({ length: 256 }, (_, i) => [i, 0, 255 - i]);
    const result = await parseAsePalette(file([frame([legacy(0x0004, [{ skip: 0, colors }])])], { count: 0 }));
    expect(result.total).toBe(256); expect(result.colors[255]).toBe('#ff0000');
  });
  it('rejects legacy missing slots and out-of-table packet ranges', async () => {
    await expect(parseAsePalette(file([frame([legacy(0x0004, [{ skip: 1, colors: [[0, 0, 0]] }])])], { count: 2 }))).rejects.toThrow('incomplete');
    await expect(parseAsePalette(file([frame([legacy(0x0004, [{ skip: 2, colors: [[0, 0, 0]] }])])], { count: 2 }))).rejects.toThrow('Invalid');
  });
  it.each([1, 256, 257, 4096])('retains all %i entries for review with honest save eligibility', async count => {
    const colors = Array.from({ length: count }, (_, i) => rgba(i >>> 8, i & 255, 3));
    const result = await parseAsePalette(file([frame([modern(colors)])]));
    expect(result.total).toBe(count); expect(result.colors).toHaveLength(count); expect(result.overLimit).toBe(count > 256); expect(result.truncated).toBe(false);
  });
  it('rejects more than 4096 table entries before allocation', async () => {
    await expect(parseAsePalette(file([frame([modern([red], { size: 4097 })])]))).rejects.toThrow('Invalid');
  });
  it('imports raw channels unchanged regardless of ICC, linear or custom-gamma metadata', async () => {
    for (const metadata of [join([word(2), word(0), dword(0), new Uint8Array(8), dword(3), bytes(1, 2, 3)]), join([word(1), word(1), dword(65536), new Uint8Array(8)]), join([word(1), word(1), dword(144178), new Uint8Array(8)])]) {
      expect((await parseAsePalette(file([frame([chunk(0x2007, metadata), modern([rgba(31, 127, 240)])])]))).colors).toEqual(['#1f7ff0']);
    }
  });
  it('skips unrendered unknown and cel payloads, using the extended chunk count', async () => {
    expect((await parseAsePalette(file([frame([chunk(0x2005, bytes(255, 0, 99)), chunk(0xbeef), modern([red])], true)]))).colors).toEqual(['#ff0000']);
  });
  it('rejects empty-alpha-only tables', async () => {
    await expect(parseAsePalette(file([frame([modern([rgba(1, 2, 3, 0)])])]))).rejects.toThrow('no visible colors');
  });
  it('rejects malformed headers, framing, bounds, names and flags', async () => {
    const valid = file([frame([modern([red], { names: ['x'] })])]);
    const corrupt = [valid.slice(0, 127), valid.slice(0, -1), change(valid, 0, 0), change(valid, 4, 0, 2), change(valid, 6, 0, 2), change(valid, 8, 0, 2), change(valid, 12, 24, 2), change(valid, 128, 15), change(valid, 132, 0, 2), change(valid, 134, 2, 2), change(valid, 144, 5), change(valid, 144, 9999), change(valid, 160, 1), change(valid, 170, 2, 2), change(valid, 176, 65535, 2)];
    for (const input of corrupt) await expect(parseAsePalette(input)).rejects.toThrow();
  });
  it('rejects truncated later frames and extra trailing data', async () => {
    const input = file([frame([modern([red])]), frame([])]), at = 128 + new DataView(input).getUint32(128, true);
    await expect(parseAsePalette(change(input, at, 99))).rejects.toThrow('Invalid');
    const extra = join([new Uint8Array(input), bytes(0)]).buffer;
    await expect(parseAsePalette(change(extra, 0, extra.byteLength))).rejects.toThrow('Invalid');
  });
  it('bounds the input itself and rejects Adobe ASE as an Aseprite document', async () => {
    await expect(parseAsePalette(new ArrayBuffer(32 * 1024 * 1024 + 1))).rejects.toThrow('32 MiB');
    await expect(parseAsePalette(bytes(65, 83, 69, 70, ...new Array(124).fill(0)).buffer)).rejects.toThrow('Invalid');
  });
  it.each(['framing', 'entries'])('cancels during cooperative %s work, without publishing a result', async kind => {
    const controller = new AbortController(), progress = [];
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => clock += 10);
    const input = file([frame(kind === 'framing' ? [...Array.from({ length: 1024 }, () => chunk(0xbeef)), modern([red])] : [modern(Array.from({ length: 4096 }, (_, i) => rgba(i >>> 8, i & 255, 0)))])]);
    try {
      await expect(parseAsePalette(input, { signal: controller.signal, onProgress: p => { progress.push(p); if (p > 0) controller.abort(); } })).rejects.toMatchObject({ name: 'AbortError' });
      expect(progress.some(p => p > 0 && p < 1)).toBe(true);
    } finally { now.mockRestore(); }
  });
  it('rejects a pre-aborted signal', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(parseAsePalette(file([frame([modern([red])])]), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('yields adaptively through many chunks and reports monotonic progress through completion', async () => {
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => clock += 10);
    const progress = [];
    try {
      const result = await parseAsePalette(file([frame([...Array.from({ length: 1024 }, () => chunk(0xbeef)), modern([red])])]), { onProgress: p => progress.push(p) });
      expect(result.colors).toEqual(['#ff0000']); expect(progress.length).toBeGreaterThan(2);
      expect(progress[0]).toBe(0); expect(progress.at(-1)).toBe(1);
      expect(progress.every((p, i) => p >= 0 && p <= 1 && (!i || p >= progress[i - 1]))).toBe(true);
    } finally { now.mockRestore(); }
  });
  it('decodes the supplied indexed document: 255 opaque colors, one alpha-zero entry', async () => {
    const bytes = readFileSync(new URL('./fixtures/palette-import/palette.ase', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('f7a97806651302378fb9f4866ba11562d3f7a2f97a6fa825d1f389eed98d8532');
    const result = await parseAsePalette(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    expect(result.total).toBe(255); expect(result.colors[0]).toBe('#ff494b'); expect(result.colors.at(-1)).toBe('#f6f4f4');
    expect(result.partialAlpha).toBe(false); expect(result.firstFrame).toBe(false);
  });
});
