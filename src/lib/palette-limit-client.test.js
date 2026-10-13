import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { preparePalette } from './quantize.js';
import { selectPaletteSubset } from './palette-limit.js';

let instances, failure, getLimitedPalette;
class FakeWorker {
  constructor() { this.mode = failure; this.starts = 0; this.cancels = 0; this.chunks = []; this.controller = null; instances.push(this); }
  postMessage(message, transfers = []) {
    if (message.type === 'start' && this.mode === 'startThrow') throw new Error('startup post failed');
    if (message.type === 'chunk') this.chunks.push({ size: message.data.byteLength, buffer: message.data.buffer });
    const data = structuredClone(message, { transfer: transfers });
    if (data.type === 'cancel') { this.cancels++; this.controller?.abort(); this.waiter?.reject(new DOMException('Canceled', 'AbortError')); return; }
    if (data.type === 'chunk' || data.type === 'endPass') { this.waiter.resolve(data.type === 'chunk' ? { data: data.data, weight: data.weight } : null); return; }
    this.starts++; this.controller = new AbortController();
    if (this.mode === 'hang') return;
    if (this.mode === 'invalid') { queueMicrotask(() => this.onmessage?.({ data: { type: 'invalid' } })); return; }
    if (this.mode === 'workerError') { queueMicrotask(() => this.onerror?.()); return; }
    const self = this; let pass = 0;
    async function* read() {
      const current = ++pass;
      for (;;) {
        const chunk = await new Promise((resolve, reject) => { self.waiter = { resolve, reject }; queueMicrotask(() => self.onmessage?.({ data: { type: 'next', pass: current } })); });
        self.waiter = null; if (!chunk) return; yield chunk;
      }
    }
    selectPaletteSubset(data.colors, data.maxColors, read, { metric: data.metric, alphaCut: data.alphaCut, signal: this.controller.signal })
      .then(result => this.onmessage?.({ data: { type: 'result', result } }))
      .catch(error => this.onmessage?.({ data: { type: 'error', name: error.name, message: error.message } }));
  }
  terminate() { this.terminated = true; this.controller?.abort(); this.waiter?.reject(new DOMException('Terminated', 'AbortError')); }
}
const image = (color = [255, 0, 0, 255], n = 1) => ({ width: n, height: 1, data: Uint8ClampedArray.from(Array.from({ length: n }, () => color).flat()) });
const palette = () => preparePalette(['#ff0000', '#0000ff', '#ffffff']);
beforeEach(async () => {
  vi.resetModules(); instances = []; failure = 'normal'; vi.stubGlobal('Worker', FakeWorker);
  ({ getLimitedPalette } = await import('./palette-limit-client.js'));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('limited palette job ownership and cache', () => {
  it('removes last-canceled queued work while preserving a running export and a queued shared subscriber', async () => {
    failure = 'hang';
    const heldItem = { original: image() }, heldController = new AbortController();
    const heldPreview = getLimitedPalette(heldItem, palette(), 128, 'rgb', 1, { signal: heldController.signal });
    const heldExport = getLimitedPalette(heldItem, palette(), 128, 'rgb', 1);
    const heldRejected = expect(heldPreview).rejects.toMatchObject({ name: 'AbortError' }); heldController.abort(); await heldRejected;
    const disposable = { original: image([0, 0, 255, 255]) }, disposableController = new AbortController();
    const canceled = getLimitedPalette(disposable, palette(), 128, 'rgb', 1, { signal: disposableController.signal });
    const canceledRejected = expect(canceled).rejects.toMatchObject({ name: 'AbortError' }); disposableController.abort(); await canceledRejected;
    const sharedItem = { original: image([255, 255, 255, 255]) }, sharedController = new AbortController();
    const sharedPreview = getLimitedPalette(sharedItem, palette(), 128, 'rgb', 1, { signal: sharedController.signal });
    const sharedExport = getLimitedPalette(sharedItem, palette(), 128, 'rgb', 1);
    const sharedRejected = expect(sharedPreview).rejects.toMatchObject({ name: 'AbortError' }); sharedController.abort(); await sharedRejected;
    const replacement = getLimitedPalette(disposable, palette(), 128, 'rgb', 1);
    expect(instances[0].starts).toBe(1); expect(instances[0].terminated).not.toBe(true);
    instances[0].mode = 'normal'; instances[0].onmessage({ data: { type: 'result', result: { indices: [0] } } });
    expect((await heldExport).colors).toEqual(['#ff0000']);
    expect((await sharedExport).colors).toEqual(['#ffffff']); expect((await replacement).colors).toEqual(['#0000ff']);
    expect(instances[0].starts).toBe(3); expect(instances[0].terminated).not.toBe(true);
  });
  it.skipIf(typeof globalThis.gc !== 'function')('releases canceled queued source buffers before a running export completes', async () => {
    failure = 'hang'; const heldItem = { original: image() }, held = getLimitedPalette(heldItem, palette(), 128, 'rgb', 1);
    async function canceledSource() {
      const original = image([12, 34, 56, 255], 40000), weak = new WeakRef(original.data), controller = new AbortController();
      const pending = getLimitedPalette({ original }, palette(), 128, 'rgb', 1, { signal: controller.signal });
      controller.abort(); await pending.catch(() => {}); return weak;
    }
    const weak = await canceledSource();
    for (let i = 0; i < 8; i++) { await new Promise(resolve => setTimeout(resolve, 0)); globalThis.gc(); }
    const released = weak.deref() === undefined;
    instances[0].mode = 'normal'; instances[0].onmessage({ data: { type: 'result', result: { indices: [0] } } }); await held;
    expect(released).toBe(true);
  });
  it('All and a sufficient cap return the original without touching sources or a worker', async () => {
    const prepared = palette();
    expect(await getLimitedPalette(null, prepared, 0, 'invalid', 0)).toBe(prepared);
    expect(await getLimitedPalette(null, prepared, 0, 'invalid', 3)).toBe(prepared);
    expect(instances).toHaveLength(0);
  });
  it('shares cached results across equivalent prepared objects, keeping only the last result per item', async () => {
    const item = { original: image() }, first = await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    expect(await getLimitedPalette(item, palette(), 128, 'rgb', 1)).toBe(first); expect(instances[0].starts).toBe(1);
    await getLimitedPalette(item, palette(), 129, 'rgb', 1);
    await getLimitedPalette(item, palette(), 128, 'rgb', 1); expect(instances[0].starts).toBe(3);
  });
  it('invalidates on ordered colors, metric, cut, cap, source and frame/delay identities', async () => {
    const original = image(), frame = { original, delay: 80 }, item = { original, frames: [frame] };
    await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    frame.delay = 90; await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    item.frames = [frame]; await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    frame.original = image(); await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    frame.original.data = new Uint8ClampedArray(frame.original.data); await getLimitedPalette(item, palette(), 128, 'rgb', 1);
    await getLimitedPalette(item, preparePalette(['#0000ff', '#ff0000', '#ffffff']), 128, 'rgb', 1);
    await getLimitedPalette(item, palette(), 128, 'oklab', 1);
    await getLimitedPalette(item, palette(), 129, 'oklab', 1);
    await getLimitedPalette(item, palette(), 129, 'oklab', 2);
    expect(instances[0].starts).toBe(9);
  });
  it('one preview cancellation cannot abort a shared export selection', async () => {
    const item = { original: image([12, 34, 56, 255], 40000) }, controller = new AbortController();
    const preview = getLimitedPalette(item, palette(), 128, 'rgb', 1, { signal: controller.signal });
    const exported = getLimitedPalette(item, palette(), 128, 'rgb', 1);
    const rejected = expect(preview).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await rejected;
    expect((await exported).size).toBe(1); expect(instances[0].starts).toBe(1); expect(instances[0].cancels).toBe(0);
  });
  it('last consumer cancellation stops the underlying job and a later request can recover', async () => {
    const item = { original: image([12, 34, 56, 255], 40000) }, a = new AbortController(), b = new AbortController();
    const first = getLimitedPalette(item, palette(), 128, 'rgb', 1, { signal: a.signal }), second = getLimitedPalette(item, palette(), 128, 'rgb', 1, { signal: b.signal });
    const checkA = expect(first).rejects.toMatchObject({ name: 'AbortError' }), checkB = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    a.abort(); b.abort(); await Promise.all([checkA, checkB]);
    expect((await getLimitedPalette(item, palette(), 128, 'rgb', 1)).size).toBe(1);
    expect(instances.some(instance => instance.cancels || instance.terminated)).toBe(true);
  });
  it('cancels a stalled worker startup without blocking a new cap behind its missing reply', async () => {
    failure = 'hang';
    const item = { original: image() }, prepared = palette(), controller = new AbortController();
    const held = getLimitedPalette(item, prepared, 128, 'rgb', 1, { signal: controller.signal });
    const rejected = expect(held).rejects.toMatchObject({ name: 'AbortError' });
    expect(instances).toHaveLength(1); expect(instances[0].starts).toBe(1);
    controller.abort(); await rejected;
    expect(await getLimitedPalette(item, prepared, 128, 'rgb', 0)).toBe(prepared);
    failure = 'normal';
    let timeout;
    try {
      const result = await Promise.race([
        getLimitedPalette(item, prepared, 128, 'rgb', 2),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('New cap waited for canceled startup.')), 1000); }),
      ]);
      expect(result.colors).toEqual(['#ff0000']);
      expect(instances).toHaveLength(2);
      expect(instances[0].terminated).toBe(true); expect(instances[0].onmessage).toBeNull(); expect(instances[0].onerror).toBeNull();
    } finally { clearTimeout(timeout); }
  });
  it('serializes different jobs and transfers bounded fresh chunks without detaching original pixels', async () => {
    const a = { original: image([12, 34, 56, 255], 70000) }, b = { original: image([0, 0, 255, 255], 35000) };
    await Promise.all([getLimitedPalette(a, palette(), 128, 'rgb', 1), getLimitedPalette(b, palette(), 128, 'rgb', 1)]);
    expect(instances).toHaveLength(1); expect(instances[0].starts).toBe(2);
    expect(instances[0].chunks.every(chunk => chunk.size <= 128 * 1024 && chunk.buffer !== a.original.data.buffer && chunk.buffer !== b.original.data.buffer)).toBe(true);
    expect(a.original.data.byteLength).toBe(70000 * 4); expect(b.original.data.byteLength).toBe(35000 * 4);
  });
  it.each(['startThrow', 'invalid', 'workerError'])('cleans failed %s worker state and permits the next queued job', async mode => {
    failure = mode;
    await expect(getLimitedPalette({ original: image() }, palette(), 128, 'rgb', 1)).rejects.toThrow();
    const broken = instances[0]; expect(broken.terminated).toBe(true); expect(broken.onmessage).toBeNull(); expect(broken.onerror).toBeNull();
    failure = 'normal'; expect((await getLimitedPalette({ original: image() }, palette(), 128, 'rgb', 1)).colors).toEqual(['#ff0000']);
    expect(instances).toHaveLength(2);
  });
  it('uses the same cooperative selector when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    expect((await getLimitedPalette({ original: image() }, palette(), 128, 'rgb', 1)).colors).toEqual(['#ff0000']);
    expect(instances).toHaveLength(0);
  });
  it('cooperatively cancels the no-Worker fallback and permits a later request', async () => {
    vi.stubGlobal('Worker', undefined);
    const controller = new AbortController(), item = { original: image([12, 34, 56, 255], 70000) };
    let clock = 0; const now = vi.spyOn(performance, 'now').mockImplementation(() => { clock += 10; if (clock > 40) controller.abort(); return clock; });
    try {
      const pending = getLimitedPalette(item, palette(), 128, 'rgb', 1, { signal: controller.signal });
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' }); expect(clock).toBeGreaterThan(40);
      expect((await getLimitedPalette({ original: image() }, palette(), 128, 'rgb', 1)).size).toBe(1);
    } finally { now.mockRestore(); }
  });
  it('rejects pre-aborted and invalid requests without starting jobs', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(getLimitedPalette({ original: image() }, palette(), 128, 'rgb', 1, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(getLimitedPalette({ original: image() }, palette(), 128, 'rgb', -1)).rejects.toThrow('Max colors');
    await expect(getLimitedPalette({ original: image() }, palette(), 128, 'unknown', 1)).rejects.toThrow('Matching');
    await expect(getLimitedPalette({ original: image() }, palette(), 0, 'rgb', 1)).rejects.toThrow('Opacity');
    await expect(getLimitedPalette({ original: { width: 0 } }, palette(), 128, 'rgb', 1)).rejects.toThrow('source');
    expect(instances).toHaveLength(0);
  });
});
