import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { preparePalette } from './quantize.js';
import { createCleanupAccumulator, prepareCleanupAsync, validateCleanupFrames } from './palette-cleanup.js';

let instances, failure, getPaletteCleanup;
class FakeWorker {
  constructor() { this.mode = failure; this.starts = 0; this.chunks = []; instances.push(this); }
  postMessage(message, transfers = []) {
    if (message.type === 'start' && this.mode === 'startThrow') throw new Error('startup post failed');
    if (message.type === 'chunk') this.chunks.push({ size: message.data.byteLength, buffer: message.data.buffer });
    const data = structuredClone(message, { transfer: transfers });
    if (data.type === 'start') {
      this.starts++; this.controller = new AbortController();
      if (this.mode === 'hang') return;
      if (this.mode === 'invalid') { queueMicrotask(() => this.onmessage?.({ data: { type: 'invalid' } })); return; }
      if (this.mode === 'workerError') { queueMicrotask(() => this.onerror?.()); return; }
      this.accumulator = createCleanupAccumulator(data.colors, data.alphaCut, data.metric, { signal: this.controller.signal });
      validateCleanupFrames(data.frames); this.frames = data.frames; this.frame = 0;
    }
    const process = async () => {
      if (data.type === 'chunk') {
        this.pixels ??= new Uint8ClampedArray(data.width * data.height * 4); this.at ??= 0;
        this.pixels.set(data.data, this.at); this.at += data.data.length;
        if (data.last) {
          await this.accumulator.addSource({ width: data.width, height: data.height, data: this.pixels }); this.pixels = null; this.at = 0; this.frame++;
          if (this.accumulator.exhausted || this.frame === this.frames.length) {
            const result = structuredClone(this.accumulator.finish());
            if (this.mode === 'badLabel') { result.replacements[0] = 255; result.hasChanges = true; }
            if (this.mode === 'badFlag') { result.replacements[0] = 0; result.hasChanges = false; }
            if (this.mode === 'badShape') result.width++;
            this.onmessage?.({ data: { type: 'result', result } }); return;
          }
        }
      }
      if (data.type === 'end') { this.onmessage?.({ data: { type: 'result', result: this.accumulator.finish() } }); return; }
      this.onmessage?.({ data: { type: 'next' } });
    };
    queueMicrotask(() => process().catch(error => this.onmessage?.({ data: { type: 'error', name: error.name, message: error.message } })));
  }
  terminate() { this.terminated = true; this.controller?.abort(); }
}
const image = (n = 1, color = [12, 34, 56, 255]) => ({ width: n, height: 1, data: Uint8ClampedArray.from(Array.from({ length: n }, () => color).flat()) });
const palette = () => preparePalette(['#000000', '#0000ff', '#ffffff']);
beforeEach(async () => {
  vi.resetModules(); instances = []; failure = 'normal'; vi.stubGlobal('Worker', FakeWorker);
  ({ getPaletteCleanup } = await import('./palette-cleanup-client.js'));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('whole-source cleanup job ownership', () => {
  it('stops pixel transfers after an empty first frame and validates every later frame first', async () => {
    const original = image(70000, [0, 0, 0, 255]), item = { frames: Array.from({ length: 8 }, () => ({ original })) };
    const result = await getPaletteCleanup(item, palette(), 128, 'oklab');
    expect(result.hasChanges).toBe(false);
    expect(instances[0].chunks.reduce((sum, chunk) => sum + chunk.size, 0)).toBe(original.data.byteLength);
    const starts = instances[0].starts;
    await expect(getPaletteCleanup({ frames: [{ original }, { original: image(1) }] }, palette(), 128, 'oklab')).rejects.toThrow('matching dimensions');
    await expect(getPaletteCleanup({ frames: [{ original }, { original: { ...original, data: new Uint8Array(3) } }] }, palette(), 128, 'oklab')).rejects.toThrow('source');
    expect(instances[0].starts).toBe(starts);
  });
  it.each([true, false])('stops after the guard loses its last surviving proposal (worker=%s)', async threaded => {
    if (!threaded) vi.stubGlobal('Worker', undefined);
    const colors = preparePalette(['#000000', '#1d2b53']);
    const noisy = image(5, [0, 0, 0, 255]); noisy.data.set([8, 12, 22, 255], 8);
    const flat = image(5, [0, 0, 0, 255]);
    const item = { frames: [noisy, flat, noisy, noisy].map(original => ({ original })) };
    const result = await getPaletteCleanup(item, colors, 128, 'oklab');
    expect(result).toEqual(await prepareCleanupAsync(item.frames.map(f => f.original), colors));
    expect(result.hasChanges).toBe(false);
    if (threaded) expect(instances[0].chunks).toHaveLength(2);
  });
  it('shares equivalent palettes and keeps only the last completed result per item', async () => {
    const item = { original: image() }, first = await getPaletteCleanup(item, palette(), 128, 'rgb');
    expect(await getPaletteCleanup(item, palette(), 128, 'rgb')).toBe(first); expect(instances[0].starts).toBe(1);
    await getPaletteCleanup(item, palette(), 129, 'rgb'); await getPaletteCleanup(item, palette(), 128, 'rgb');
    expect(instances[0].starts).toBe(3);
  });
  it('invalidates source, ordered palette, metric, cut and frame identities', async () => {
    const original = image(), frame = { original, delay: 80 }, item = { original, frames: [frame] };
    await getPaletteCleanup(item, palette(), 128, 'rgb');
    frame.delay = 90; await getPaletteCleanup(item, palette(), 128, 'rgb');
    item.frames = [frame]; await getPaletteCleanup(item, palette(), 128, 'rgb');
    frame.original = image(); await getPaletteCleanup(item, palette(), 128, 'rgb');
    frame.original.data = frame.original.data.slice(); await getPaletteCleanup(item, palette(), 128, 'rgb');
    await getPaletteCleanup(item, preparePalette(['#ffffff', '#000000']), 128, 'rgb');
    await getPaletteCleanup(item, palette(), 128, 'oklab'); await getPaletteCleanup(item, palette(), 129, 'oklab');
    expect(instances[0].starts).toBe(8);
  });
  it('lets a captured export share the preview job while owning frame metadata', async () => {
    const original = image(40000), frame = { original, delay: 80 }, item = { original, frames: [frame], loop: 3 };
    const sourceItem = { original, frames: [{ identity: frame, original, delay: 80 }], framesIdentity: item.frames, loop: 3 };
    const controller = new AbortController(), preview = getPaletteCleanup(item, palette(), 128, 'rgb', { signal: controller.signal });
    const exported = getPaletteCleanup(item, palette(), 128, 'rgb', { sourceItem });
    const rejected = expect(preview).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await rejected;
    const result = await exported; expect(result.width).toBe(40000); expect(instances[0].starts).toBe(1); expect(instances[0].terminated).not.toBe(true);
  });
  it('cancels a stalled module load immediately and releases the serial queue', async () => {
    failure = 'hang'; const controller = new AbortController(), item = { original: image() };
    const held = getPaletteCleanup(item, palette(), 128, 'rgb', { signal: controller.signal });
    const rejected = expect(held).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await rejected;
    failure = 'normal'; expect((await getPaletteCleanup(item, palette(), 128, 'rgb')).width).toBe(1);
    expect(instances).toHaveLength(2); expect(instances[0].terminated).toBe(true); expect(instances[0].onmessage).toBeNull();
  });
  it('serializes clips and transfers bounded slices without changing or detaching sources', async () => {
    const a = image(70000), b = image(35000), before = a.data.slice(), item = { original: a, frames: [{ original: a }, { original: a }] };
    await Promise.all([getPaletteCleanup(item, palette(), 128, 'rgb'), getPaletteCleanup({ original: b }, palette(), 128, 'rgb')]);
    expect(instances).toHaveLength(1); expect(instances[0].starts).toBe(2);
    expect(instances[0].chunks.every(chunk => chunk.size <= 128 * 1024 && chunk.buffer !== a.data.buffer && chunk.buffer !== b.data.buffer)).toBe(true);
    expect(a.data).toEqual(before); expect(a.data.byteLength).toBe(70000 * 4); expect(b.data.byteLength).toBe(35000 * 4);
  });
  it.each(['startThrow', 'invalid', 'workerError', 'badLabel', 'badFlag', 'badShape'])('reports %s failures and recovers on the next request', async mode => {
    failure = mode; await expect(getPaletteCleanup({ original: image() }, palette(), 128, 'rgb')).rejects.toThrow();
    const broken = instances[0]; expect(broken.terminated).toBe(true); expect(broken.onmessage).toBeNull(); expect(broken.onerror).toBeNull();
    failure = 'normal'; expect((await getPaletteCleanup({ original: image() }, palette(), 128, 'rgb')).width).toBe(1);
  });
  it('cooperative fallback matches the worker across the complete animation', async () => {
    const sources = [image(4), image(4, [34, 56, 12, 255])], item = { original: sources[0], frames: sources.map(original => ({ original })) };
    const threaded = await getPaletteCleanup(item, palette(), 128, 'rgb');
    vi.stubGlobal('Worker', undefined);
    const fallback = await getPaletteCleanup({ ...item }, palette(), 128, 'rgb');
    expect(fallback).toEqual(threaded); expect(fallback).toEqual(await prepareCleanupAsync(sources, palette(), 128, 'rgb'));
  });
  it('falls back cooperatively when worker construction is blocked', async () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker unavailable by browser policy'); } });
    const original=image(4), result=await getPaletteCleanup({ original },palette(),128,'oklab');
    expect(result).toEqual(await prepareCleanupAsync([original],palette(),128,'oklab')); expect(instances).toHaveLength(0);
  });
  it('fallback cancellation is cooperative and does not retain a failed cache', async () => {
    vi.stubGlobal('Worker', undefined); const controller = new AbortController();
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => { clock += 10; if (clock > 40) controller.abort(); return clock; });
    try { await expect(getPaletteCleanup({ original: image(70000) }, palette(), 128, 'rgb', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' }); }
    finally { now.mockRestore(); }
    expect((await getPaletteCleanup({ original: image() }, palette(), 128, 'rgb')).width).toBe(1);
  });
  it('rejects invalid and already canceled requests without starting a worker', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(getPaletteCleanup({ original: image() }, palette(), 128, 'rgb', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(getPaletteCleanup({ original: image() }, palette(), 128, 'bad')).rejects.toThrow('Matching');
    await expect(getPaletteCleanup({ original: image() }, palette(), 0, 'rgb')).rejects.toThrow('Opacity');
    await expect(getPaletteCleanup({ original: { width: 0 } }, palette(), 128, 'rgb')).rejects.toThrow('source');
    expect(instances).toHaveLength(0);
  });
});
