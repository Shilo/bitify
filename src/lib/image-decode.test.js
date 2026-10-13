import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeImageFile } from './image-decode.js';
import { decodePaletteFile } from './palette-decode.js';
import { generatePaletteAsync } from './palette-generated.js';
import { captureGeneratedSources } from './palette-generated-sources.js';

afterEach(() => vi.unstubAllGlobals());
const file = (name = 'sprite.png') => ({ name, type: name.endsWith('png') ? 'image/png' : 'image/jpeg', size: 10, stream: vi.fn(() => new ReadableStream()) });
const pixels = Uint8ClampedArray.of(34, 35, 35, 255, 240, 246, 240, 255, 34, 35, 35, 128, 0, 0, 0, 0);
function setupNative({ supported = true, copy, decode, construct } = {}) {
  const frame = { displayWidth: 4, displayHeight: 1, visibleRect: { width: 4, height: 1 }, close: vi.fn(),
    copyTo: vi.fn(copy ?? (async data => data.set(pixels))) };
  const decoder = { decode: vi.fn(decode ?? (async () => ({ image: frame }))), close: vi.fn() };
  const Native = vi.fn(function (options) { if (construct) return construct(options); return decoder; });
  Native.isTypeSupported = vi.fn(async () => supported);
  vi.stubGlobal('ImageDecoder', Native);
  vi.stubGlobal('ImageData', class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } });
  return { frame, decoder, Native };
}
function setupCanvas() {
  const image = { width: 4, height: 1, data: pixels.slice() };
  const bitmap = { width: 4, height: 1, close: vi.fn() };
  const context = { drawImage: vi.fn(), getImageData: vi.fn(() => image) }, canvas = { getContext: vi.fn(() => context) };
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  return { image, bitmap, context, canvas };
}

describe('shared PNG source decoding', () => {
  it('copies straight native sRGB RGBA without canvas, retaining close shades and partial alpha', async () => {
    const native = setupNative(), canvas = setupCanvas(), input = file();
    const image = await decodeImageFile(input);
    expect(image).toMatchObject({ width: 4, height: 1 });
    expect(image.data).toEqual(pixels);
    expect(native.Native).toHaveBeenCalledWith({ data: expect.any(ReadableStream), type: 'image/png', preferAnimation: false, colorSpaceConversion: 'default' });
    expect(native.frame.copyTo).toHaveBeenCalledWith(image.data, { format: 'RGBA', colorSpace: 'srgb', layout: [{ offset: 0, stride: 16 }] });
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(canvas.context.getImageData).not.toHaveBeenCalled();
    expect(native.decoder.close).toHaveBeenCalledOnce(); expect(native.frame.close).toHaveBeenCalledOnce();
  });
  it('palette import shares the native source pixels rather than extracting noisy readback', async () => {
    setupNative(); setupCanvas();
    const result = await decodePaletteFile(file());
    expect(result.colors).toEqual(['#222323', '#f0f6f0']);
    expect(result.partialAlpha).toBe(true);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('Generated 32 retains precisely the two decoded sprite colors without merging other close shades', async () => {
    setupNative(); setupCanvas();
    const original = await decodeImageFile(file());
    expect((await generatePaletteAsync(captureGeneratedSources([{ original }]))).colors).toEqual(['#222323', '#f0f6f0']);
    const closeShades = Uint8ClampedArray.of(34, 35, 35, 255, 35, 35, 35, 255, 240, 246, 240, 255, 241, 246, 240, 255);
    setupNative({ copy: async data => data.set(closeShades) });
    const distinct = await decodeImageFile(file());
    expect((await generatePaletteAsync(captureGeneratedSources([{ original: distinct }]))).colors)
      .toEqual(['#222323', '#232323', '#f0f6f0', '#f1f6f0']);
  });
  it.each(['absent', 'unsupported', 'constructor', 'copy', 'transform'])('retains canvas fallback when native decoding is %s', async failure => {
    const native = setupNative({ supported: failure !== 'unsupported',
      construct: failure === 'constructor' ? () => { throw new Error('Unsupported decoder'); } : undefined,
      copy: failure === 'copy' ? async () => { throw new Error('Unsupported RGBA copy'); } : undefined });
    if (failure === 'absent') vi.stubGlobal('ImageDecoder', undefined);
    if (failure === 'transform') native.frame.rotation = 90;
    const canvas = setupCanvas();
    expect(await decodeImageFile(file())).toBe(canvas.image);
    expect(canvas.bitmap.close).toHaveBeenCalledOnce();
    expect(canvas.canvas.width).toBe(0); expect(canvas.canvas.height).toBe(0);
    if (['copy', 'transform'].includes(failure)) {
      expect(native.decoder.close).toHaveBeenCalledOnce(); expect(native.frame.close).toHaveBeenCalledOnce();
    }
  });
  it('keeps other image formats on their existing browser path', async () => {
    const native = setupNative(), canvas = setupCanvas();
    expect(await decodeImageFile(file('sprite.jpg'))).toBe(canvas.image);
    expect(native.Native.isTypeSupported).not.toHaveBeenCalled();
  });
  it('rejects native oversized images before copying without falling back', async () => {
    const native = setupNative(); setupCanvas();
    await expect(decodeImageFile(file(), { maxPixels: 3, limitMessage: 'Image limit' })).rejects.toThrow('Image limit');
    expect(native.frame.copyTo).not.toHaveBeenCalled(); expect(createImageBitmap).not.toHaveBeenCalled();
    expect(native.frame.close).toHaveBeenCalledOnce(); expect(native.decoder.close).toHaveBeenCalledOnce();
  });
  it('rejects canvas oversized images before drawing and closes bitmap', async () => {
    vi.stubGlobal('ImageDecoder', undefined); const canvas = setupCanvas();
    await expect(decodeImageFile(file(), { maxPixels: 3 })).rejects.toThrow('too large');
    expect(canvas.context.drawImage).not.toHaveBeenCalled(); expect(canvas.bitmap.close).toHaveBeenCalledOnce();
  });
  it('does no decode for pre-canceled work', async () => {
    const native = setupNative(); setupCanvas(); const controller = new AbortController(); controller.abort();
    await expect(decodeImageFile(file(), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(native.Native.isTypeSupported).not.toHaveBeenCalled(); expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('closes an in-flight decoder on abort without starting fallback', async () => {
    let started, rejectDecode;
    const ready = new Promise(resolve => started = resolve);
    const native = setupNative({ decode: () => { started(); return new Promise((resolve, reject) => rejectDecode = reject); } });
    native.decoder.close.mockImplementation(() => rejectDecode(new Error('Closed decoder')));
    setupCanvas(); const controller = new AbortController();
    const job = decodeImageFile(file(), { signal: controller.signal });
    const rejected = expect(job).rejects.toMatchObject({ name: 'AbortError' });
    await ready; controller.abort(); await rejected;
    expect(native.decoder.close).toHaveBeenCalledOnce(); expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('discards a late native copy after cancellation and closes both resources', async () => {
    let started, release;
    const ready = new Promise(resolve => started = resolve);
    const native = setupNative({ copy: () => { started(); return new Promise(resolve => release = resolve); } });
    setupCanvas(); const controller = new AbortController();
    const job = decodeImageFile(file(), { signal: controller.signal });
    const rejected = expect(job).rejects.toMatchObject({ name: 'AbortError' });
    await ready; controller.abort(); release(); await rejected;
    expect(native.decoder.close).toHaveBeenCalledOnce(); expect(native.frame.close).toHaveBeenCalledOnce();
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('keeps cancellation authoritative after a pending native-support probe', async () => {
    const native = setupNative(); setupCanvas(); let release;
    native.Native.isTypeSupported.mockImplementation(() => new Promise(resolve => release = resolve));
    const controller = new AbortController();
    const job = decodeImageFile(file(), { signal: controller.signal });
    const rejected = expect(job).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); release(true); await rejected;
    expect(native.Native).not.toHaveBeenCalled(); expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('releases a late fallback bitmap after cancellation without reading pixels', async () => {
    vi.stubGlobal('ImageDecoder', undefined); const canvas = setupCanvas(); let release;
    createImageBitmap.mockImplementation(() => new Promise(resolve => release = resolve));
    const controller = new AbortController();
    const job = decodeImageFile(file(), { signal: controller.signal });
    const rejected = expect(job).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); release(canvas.bitmap); await rejected;
    expect(canvas.bitmap.close).toHaveBeenCalledOnce(); expect(canvas.context.drawImage).not.toHaveBeenCalled();
  });
  it('releases fallback resources on readback failure', async () => {
    vi.stubGlobal('ImageDecoder', undefined); const canvas = setupCanvas();
    canvas.context.getImageData.mockImplementation(() => { throw new Error('Readback failed'); });
    await expect(decodeImageFile(file())).rejects.toThrow('Readback failed');
    expect(canvas.bitmap.close).toHaveBeenCalledOnce(); expect(canvas.canvas.width).toBe(0); expect(canvas.canvas.height).toBe(0);
  });
});
