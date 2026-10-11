import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodePaletteFile, MAX_IMAGE_BYTES } from './palette-decode.js';

afterEach(() => vi.unstubAllGlobals());
const fixture = () => readFileSync(new URL('./fixtures/palette-import/palette.ase', import.meta.url));
const file = (name, bytes = fixture()) => ({ name, size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

describe('palette file routing and cancellation', () => {
  it.each(['palette.ase', 'palette.aseprite', 'PALETTE.ASE', 'PALETTE.ASEPRITE'])('imports %s without an image decoder', async name => {
    const bitmap = vi.fn(); vi.stubGlobal('createImageBitmap', bitmap);
    const result = await decodePaletteFile(file(name));
    expect(result.colors).toHaveLength(255);
    expect(result.colors[0]).toBe('#ff494b');
    expect(result.colors[254]).toBe('#f6f4f4');
    expect(result).toMatchObject({ image: null, total: 255, partialAlpha: false, firstFrame: false, source: { kind: 'aseprite' } });
    expect(bitmap).not.toHaveBeenCalled();
  });
  it('enforces the byte limit before reading or decoding', async () => {
    const input = { name: 'oversize.ase', size: MAX_IMAGE_BYTES + 1, arrayBuffer: vi.fn() };
    await expect(decodePaletteFile(input)).rejects.toThrow(/32 MiB/);
    expect(input.arrayBuffer).not.toHaveBeenCalled();
  });
  it('rejects canceled work before reading and after a pending read', async () => {
    const canceled = new AbortController(); canceled.abort();
    const input = { ...file('canceled.ase'), arrayBuffer: vi.fn() };
    await expect(decodePaletteFile(input, { signal: canceled.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(input.arrayBuffer).not.toHaveBeenCalled();
    let release, notify;
    const started = new Promise(resolve => notify = resolve);
    const pending = new Promise(resolve => release = resolve), controller = new AbortController();
    const bytes = fixture();
    const result = decodePaletteFile({ ...file('pending.ase'), arrayBuffer: () => { notify(); return pending; } }, { signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await started; controller.abort(); release(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    await rejected;
  });
  it('rejects Adobe ASE and unsupported extensions through useful errors', async () => {
    await expect(decodePaletteFile(file('adobe.ase', Buffer.from('ASEF')))).rejects.toThrow(/Aseprite/);
    await expect(decodePaletteFile({ name: 'palette.aco', size: 0 })).rejects.toThrow(/Aseprite palette file/);
  });
  it('keeps cancellation authoritative when a pending Aseprite read fails', async () => {
    let rejectRead, notify;
    const started = new Promise(resolve => notify = resolve);
    const pending = new Promise((resolve, reject) => rejectRead = reject), controller = new AbortController();
    const result = decodePaletteFile({ name: 'pending.ase', size: 2055, arrayBuffer: () => { notify(); return pending; } }, { signal: controller.signal });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await started; controller.abort(); rejectRead(new Error('Late read failure'));
    await rejected;
  });
  it('preserves a read failure when the import was not canceled', async () => {
    const problem = new Error('Palette file could not be read');
    await expect(decodePaletteFile({ name: 'unreadable.ase', size: 2055, arrayBuffer: async () => { throw problem; } })).rejects.toBe(problem);
  });
  it.each([
    ['hex', '#123456 #abcdef #123456'], ['txt', '#123456 #abcdef'],
    ['gpl', 'GIMP Palette\n18 52 86\n171 205 239'],
    ['pal', 'JASC-PAL\n0100\n2\n18 52 86\n171 205 239'],
  ])('retains existing %s text routing', async (extension, text) => {
    const read = vi.fn(async () => text), buffer = vi.fn();
    const result = await decodePaletteFile({ name: 'palette.' + extension, size: text.length, text: read, arrayBuffer: buffer });
    expect(result.colors).toEqual(['#123456', '#abcdef']);
    expect(result.source.kind).toBe(extension === 'txt' ? 'hex' : extension);
    expect(buffer).not.toHaveBeenCalled();
  });
  it('retains image extraction and bitmap cleanup', async () => {
    const image = { width: 2, height: 1, data: Uint8ClampedArray.of(18, 52, 86, 255, 171, 205, 239, 127) };
    const bitmap = { width: 2, height: 1, close: vi.fn() }, context = { drawImage: vi.fn(), getImageData: vi.fn(() => image) };
    const canvas = { getContext: vi.fn(() => context) };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    const result = await decodePaletteFile({ name: 'palette.gif', type: 'image/gif', size: 10 });
    expect(result).toMatchObject({ colors: ['#123456', '#abcdef'], firstFrame: true, partialAlpha: true, source: { kind: 'image' } });
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });
});
