import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import omggif from 'omggif';
import { analyzeImportFrames, importFrameMessage, importFrameTransfers } from './image-import-core.js';
import { decodeGif } from './gif.js';

const pixelPattern = [34, 35, 35, 255, 35, 35, 35, 128, 240, 246, 240, 255, 0, 0, 0, 0];
const width = 65, height = 64; // Genuine >4096px source exercises production worker routing.
const rgba = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) => pixelPattern[i % pixelPattern.length]);
const png = () => Object.assign(new Blob([new Uint8Array(20)], { type: 'image/png' }), { name: 'exact.png' });
function gif() {
  const bytes = new Uint8Array(2048), writer = new omggif.GifWriter(bytes, 2, 2, { palette: [0, 0x222323, 0xf0f6f0, 0xff8844], loop: 3 });
  writer.addFrame(0, 0, 2, 2, [1, 2, 0, 1], { transparent: 0, delay: 7, disposal: 1 });
  writer.addFrame(1, 1, 1, 1, [3], { transparent: 0, delay: 12, disposal: 3 });
  writer.addFrame(0, 0, 1, 1, [2], { transparent: 0, delay: 25, disposal: 2 });
  return Object.assign(new Blob([bytes.subarray(0, writer.end())], { type: 'image/gif' }), { name: 'animated.gif' });
}
let api, native, workers, fault;
beforeEach(async () => {
  vi.resetModules(); workers = []; fault = null;
  vi.stubGlobal('ImageData', class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } });
  native = vi.fn(function () {
    return { close() {}, async decode() { return { image: { displayWidth: width, displayHeight: height,
      visibleRect: { width, height }, close() {}, async copyTo(data) { data.set(rgba); } } }; } };
  });
  native.isTypeSupported = async () => true;
  vi.stubGlobal('ImageDecoder', native);
  vi.stubGlobal('createImageBitmap', vi.fn(() => { throw new Error('Native PNG must not use canvas'); }));
  vi.stubGlobal('Worker', class {
    constructor() {
      if (fault === 'construct') throw new Error('No worker');
      this.fault = fault; this.sent = []; workers.push(this);
    }
    terminate() { this.terminated = true; this.frames = null; }
    emit(data, buffers) {
      const copy = structuredClone(data, { transfer: buffers ?? [] });
      queueMicrotask(() => { if (!this.terminated) this.onmessage?.({ data: copy }); });
    }
    postMessage(data, transfers) {
      if (this.fault === 'post') throw new Error('Blocked worker');
      const copy = structuredClone(data, { transfer: transfers ?? [] });
      this.sent.push(copy.type);
      void this.process(copy);
    }
    async process(data) {
      if (this.fault === 'stall') return;
      if (data.type === 'start') {
        if (this.fault === 'error') { queueMicrotask(() => this.onerror?.()); return; }
        let input;
        if (data.mode === 'gif') {
          const decoded = decodeGif(new Uint8Array(await data.file.arrayBuffer()));
          input = { frames: decoded.frames.map(f => ({ original: { width: decoded.width, height: decoded.height, data: f.data }, delay: f.delay })), loop: decoded.loop };
        } else input = { frames: data.frames, loop: data.loop };
        this.frames = (await analyzeImportFrames(input, data.source, data.alphaCut, { cooperative: false })).frames;
        const first = this.frames[0].original;
        this.emit({ type: 'ready', count: this.frames.length, width: this.fault === 'metadata' ? first.width + 1 : first.width,
          height: first.height, loop: input.loop });
      } else if (data.index === this.frames.length) {
        if (this.fault === 'after-frame') this.emit({ type: 'error', message: 'Late failure' });
        else { this.frames = null; this.emit({ type: 'done' }); }
      } else {
        const frame = this.frames[data.index], message = importFrameMessage(frame, data.index);
        this.frames[data.index] = null;
        if (this.fault === 'sequence') message.index++;
        if (this.fault === 'rgba') message.pixels = new Uint8ClampedArray(1);
        if (this.fault === 'analysis') message.analysis.lum = new Uint8Array(1);
        if (this.fault === 'cut') message.analysis.cut++;
        if (this.fault === 'incomplete') { this.emit({ type: 'done' }); return; }
        this.emit(message, importFrameTransfers(message));
      }
    }
  });
  api = await import('./image-import-client.js');
});
afterEach(() => { workers.forEach(w => w.terminate()); vi.unstubAllGlobals(); });

describe('lazy serial image imports', () => {
  it('uses identical cooperative analysis for a 4096px still, without loading a worker', async () => {
    const small = rgba.slice(0, 4096 * 4);
    native.mockImplementation(function () {
      return { close() {}, async decode() { return { image: { displayWidth: 64, displayHeight: 64,
        visibleRect: { width: 64, height: 64 }, close() {}, async copyTo(data) { data.set(small); } } }; } };
    });
    const expected = await analyzeImportFrames({ frames: [{ original: { width: 64, height: 64, data: small } }] }, 'blue', 200, { cooperative: false });
    const decoded = await api.decodeImportedFile(png(), { source: 'blue', alphaCut: 200 });
    expect(workers).toHaveLength(0);
    expect(decoded.frames[0].original.data).toEqual(small);
    expect(decoded.frames[0].img).toEqual(expected.frames[0].img);
    const original = decoded.frames[0].original;
    const next = await api.reanalyzeImported(decoded, { source: 'green', alphaCut: 1 });
    expect(next.frames[0].original).toBe(original); // No extra RGBA copy or detached source.
    expect(next.frames[0].img.data).toBe(original.data);
    expect(next).toMatchObject({ analysisSource: 'green', analysisCut: 1 });
    api.takeImportedFrames(next);
    expect(() => api.reanalyzeImported(next)).toThrow('unpublished');
    expect(workers).toHaveLength(0); expect(native).toHaveBeenCalledOnce();
  });
  it('retains native straight PNG bytes and aliasing through actual transfers, with no canvas', async () => {
    expect(workers).toHaveLength(0);
    const decoded = await api.decodeImportedFile(png());
    expect(native).toHaveBeenCalledOnce();
    expect(decoded.frames[0].original.data).toEqual(rgba);
    expect(decoded.frames[0].img.data).toBe(decoded.frames[0].original.data);
    expect(workers[0].sent).toEqual(['start', 'next', 'next']);
    expect(workers[0].frames).toBe(null);
    api.takeImportedFrames(decoded);
    expect(() => api.reanalyzeImported(decoded, { source: 'red' })).toThrow('unpublished');
    expect(decoded.frames[0].original.data).toEqual(rgba);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it('decodes the whole GIF once, preserving compositing, every delay and loop', async () => {
    const file = gif(), expected = decodeGif(new Uint8Array(await file.arrayBuffer()));
    const decoded = await api.decodeImportedFile(file);
    expect(native).not.toHaveBeenCalled(); expect(decoded.loop).toBe(3);
    expect(decoded.frames.map(f => f.delay)).toEqual([70, 120, 250]);
    expect(decoded.frames.map(f => f.original.data)).toEqual(expected.frames.map(f => f.data));
    expect(decoded.frames.map(f => f.img.auto)).toEqual([decoded.frames[0].img.auto, decoded.frames[0].img.auto, decoded.frames[0].img.auto]);
    expect(workers[0].frames).toBe(null);
  });
  it.each(['absent', 'construct', 'post', 'error', 'metadata', 'sequence', 'rgba', 'analysis', 'cut', 'incomplete', 'after-frame'])
    ('recovers %s failures through the original native PNG decoder', async mode => {
      fault = mode;
      if (mode === 'absent') vi.stubGlobal('Worker', undefined);
      const decoded = await api.decodeImportedFile(png());
      expect(decoded.frames).toHaveLength(1);
      expect(decoded.frames[0].original.data).toEqual(rgba);
      expect(decoded.frames[0].img.data).toBe(decoded.frames[0].original.data);
      expect(native).toHaveBeenCalledTimes(['absent', 'construct'].includes(mode) ? 1 : 2);
      expect(createImageBitmap).not.toHaveBeenCalled();
      if (workers.length) expect(workers[0].terminated).toBe(true);
    });
  it('discards partial failed GIF output and recovers all source frames from its File', async () => {
    fault = 'after-frame'; const file = gif(), expected = decodeGif(new Uint8Array(await file.arrayBuffer()));
    const decoded = await api.decodeImportedFile(file);
    expect(decoded.frames.map(f => f.original.data)).toEqual(expected.frames.map(f => f.data));
    expect(decoded.frames.map(f => f.delay)).toEqual(expected.frames.map(f => f.delay));
    expect(decoded.loop).toBe(expected.loop); expect(workers[0].terminated).toBe(true);
  });
  it('reprepares only unpublished sources and releases obsolete analysis before awaiting', async () => {
    const first = await api.decodeImportedFile(png());
    expect(() => api.reanalyzeImported(first, { alphaCut: 0 })).toThrow();
    expect(first.frames[0].img).toBeDefined();
    const pending = api.reanalyzeImported(first, { source: 'red', alphaCut: 200 });
    expect(Object.hasOwn(first.frames[0], 'img')).toBe(false);
    const next = await pending;
    expect(first.frames[0].original.data.byteLength).toBe(0);
    expect(next.frames[0].original.data).toEqual(rgba);
    expect(next).toMatchObject({ analysisSource: 'red', analysisCut: 200 });
    expect(next.frames[0].img.cut).toBe(200);
    expect(next.frames[0].img.data).toBe(next.frames[0].original.data);
    expect(native).toHaveBeenCalledOnce();
    api.takeImportedFrames(next);
  });
  it('recovers aliased unpublished GIF sources from the immutable File', async () => {
    const file = gif(), expected = decodeGif(new Uint8Array(await file.arrayBuffer()));
    const first = await api.decodeImportedFile(file);
    first.frames[1].original.data = first.frames[0].original.data;
    const next = await api.reanalyzeImported(first, { source: 'green', alphaCut: 200 });
    expect(workers[0].terminated).toBe(true);
    expect(next.frames.map(f => f.original.data)).toEqual(expected.frames.map(f => f.data));
    expect(next.frames.map(f => f.delay)).toEqual(expected.frames.map(f => f.delay));
    expect(next.loop).toBe(expected.loop);
  });
  it('cancels both running and queued imports without fallback or resurrection', async () => {
    fault = 'stall'; const a = new AbortController(), b = new AbortController();
    const one = api.decodeImportedFile(png(), { signal: a.signal });
    const rejectedOne = expect(one).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(workers[0]?.sent).toEqual(['start']));
    const two = api.decodeImportedFile(png(), { signal: b.signal });
    const rejectedTwo = expect(two).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(native).toHaveBeenCalledTimes(2));
    b.abort(); a.abort(); await rejectedOne; await rejectedTwo;
    expect(workers).toHaveLength(1); expect(workers[0].terminated).toBe(true);
    fault = null;
    const next = await api.decodeImportedFile(png());
    expect(next.frames[0].original.data).toEqual(rgba);
    expect(native).toHaveBeenCalledTimes(3); expect(workers).toHaveLength(2);
  });
  it('does not claim ownership or decode anything for pre-canceled work', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(api.decodeImportedFile(png(), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(native).not.toHaveBeenCalled(); expect(workers).toHaveLength(0);
  });
});
