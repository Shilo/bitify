import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createGeneratedAccumulator } from './palette-generated.js';

let instances, failure, capture, getPalette;
class FakeWorker {
  constructor() { this.mode = failure; this.starts = 0; this.chunks = []; instances.push(this); }
  postMessage(message, transfers = []) {
    if (message.type === 'start' && this.mode === 'startThrow') throw new Error('startup failed');
    if (message.type === 'chunk') this.chunks.push({ size: message.pixels.byteLength, buffer: message.pixels.buffer });
    const data = structuredClone(message, { transfer: transfers });
    const process = async () => {
      if (data.type === 'start') {
        this.starts++; this.controller = new AbortController();
        if (this.mode === 'hang') return;
        if (this.mode === 'invalid') { this.onmessage?.({ data: { type: 'invalid' } }); return; }
        if (this.mode === 'workerError') { this.onerror?.(); return; }
        if (this.mode === 'messageError') { this.onmessageerror?.(); return; }
        this.accumulator = createGeneratedAccumulator(data.alphaCut, { signal: this.controller.signal }); this.inAsset = false;
      }
      if (data.type === 'chunk') {
        if (!this.inAsset) { this.accumulator.beginAsset(); this.inAsset = true; }
        await this.accumulator.addChunk(data.pixels, data.weight);
        if (data.lastAsset) { await this.accumulator.endAsset(); this.inAsset = false; }
      }
      if (data.type === 'end') {
        let result = await this.accumulator.finish();
        if (this.mode === 'badResult') result = { ...result, colors: ['bad'] };
        if (this.mode === 'overCapacity') result = { ...result, colors: Array.from({ length: 65 }, (_, n) => '#' + n.toString(16).padStart(6, '0')) };
        this.onmessage?.({ data: { type: 'result', result } }); return;
      }
      this.onmessage?.({ data: { type: 'next' } });
    };
    queueMicrotask(() => process().catch(error => this.onmessage?.({ data: { type: 'error', name: error.name, message: error.message } })));
  }
  terminate() { this.terminated = true; this.controller?.abort(); }
}
const image = (n = 1, rgb = [12, 34, 56]) => {
  const data = new Uint8ClampedArray(n * 4); for (let at = 0; at < data.length; at += 4) data.set([...rgb, 255], at);
  return { width: n, height: 1, data };
};
beforeEach(async () => {
  vi.resetModules(); instances = []; failure = 'normal'; vi.stubGlobal('Worker', FakeWorker);
  ({ captureGeneratedSources: capture } = await import('./palette-generated-sources.js'));
  ({ getGeneratedPalette: getPalette } = await import('./palette-generated-client.js'));
});
afterEach(() => vi.unstubAllGlobals());

describe('generated palette job ownership', () => {
  it('rejects shared unreadable-message jobs, releases handlers and drains queued/retry work without poisoning caches', async () => {
    failure = 'hang'; const snapshot = capture([{ original: image() }]);
    const first = getPalette(snapshot), shared = getPalette(snapshot);
    const rejected = expect(first).rejects.toThrow('could not be read'), sharedRejected = expect(shared).rejects.toThrow('could not be read');
    const queued = getPalette(capture([{ original: image(1, [9, 8, 7]) }]));
    await vi.waitFor(() => expect(instances[0]?.starts).toBe(1));
    const broken = instances[0], late = broken.onmessageerror;
    failure = 'normal'; broken.onmessageerror();
    await Promise.all([rejected, sharedRejected]); expect((await queued).colors).toEqual(['#090807']);
    expect((await getPalette(snapshot)).colors).toEqual(['#0c2238']);
    expect(broken.terminated).toBe(true);
    expect([broken.onmessage, broken.onerror, broken.onmessageerror]).toEqual([null, null, null]);
    late(); expect(instances[1].terminated).not.toBe(true); expect(instances).toHaveLength(2);
  });
  it('lets abort win over a late unreadable-message event and leaves the replacement worker healthy', async () => {
    failure = 'hang'; const controller = new AbortController(), snapshot = capture([{ original: image() }]);
    const pending = getPalette(snapshot, { signal: controller.signal }), rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(instances[0]?.onmessageerror).toBeTypeOf('function'));
    const late = instances[0].onmessageerror; controller.abort(); await rejected;
    failure = 'normal'; expect((await getPalette(snapshot)).colors).toEqual(['#0c2238']);
    late(); expect(instances[1].terminated).not.toBe(true);
  });
  it.each([33, 64])('accepts and caches complete %i-color worker results without merging', async count => {
    const original = image(count);
    for (let n = 0; n < count; n++) original.data.set([n, n * 2, n * 3, 255], n * 4);
    const snapshot = capture([{ original }]);
    const result = await getPalette(snapshot);
    expect(result.colors).toEqual(Array.from({ length: count }, (_, n) => '#' + [n, n * 2, n * 3].map(v => v.toString(16).padStart(2, '0')).join('')).sort());
    expect(await getPalette(snapshot)).toBe(result);
    expect(instances[0].starts).toBe(1);
  });
  it('empty/pre-aborted/invalid requests start no worker', async () => {
    expect((await getPalette(capture([]))).colors).toEqual([]);
    const controller = new AbortController(); controller.abort();
    await expect(getPalette(capture([{ original: image() }]), { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(getPalette({ assets: [] })).rejects.toThrow('Capture'); expect(instances).toHaveLength(0);
  });
  it('shares reorder-equivalent snapshots and keeps only two tiny completed results', async () => {
    const a = { original: image() }, b = { original: image(1, [22, 33, 44]) };
    const first = await getPalette(capture([a, b]));
    expect(await getPalette(capture([b, a]))).toBe(first); expect(instances[0].starts).toBe(1);
    await getPalette(capture([a])); await getPalette(capture([b])); await getPalette(capture([a, b]));
    expect(instances[0].starts).toBe(4); expect(Object.isFrozen(first.colors)).toBe(true);
  });
  it('a captured export survives preview cancellation and subsequent wall/frame changes', async () => {
    const original = image(70000), frame = { original, delay: 80 }, item = { frames: [frame] };
    const snapshot = capture([item]), controller = new AbortController();
    const preview = getPalette(snapshot, { signal: controller.signal }), exported = getPalette(capture([item]));
    const rejected = expect(preview).rejects.toMatchObject({ name: 'AbortError' }); controller.abort();
    frame.original = image(1, [1, 2, 3]); frame.delay = 900; item.frames = [];
    await rejected; expect((await exported).colors).toEqual(['#0c2238']);
    expect(instances[0].starts).toBe(1); expect(instances[0].terminated).not.toBe(true);
  });
  it('serializes walls with bounded transferred slices and never detaches source bytes', async () => {
    const a = image(70000), b = image(35000), before = a.data.slice();
    await Promise.all([getPalette(capture([{ frames: [{ original: a, delay: 20 }, { original: a, delay: 80 }] }])), getPalette(capture([{ original: b }]))]);
    expect(instances).toHaveLength(1); expect(instances[0].starts).toBe(2);
    expect(instances[0].chunks.every(chunk => chunk.size <= 128 * 1024 && chunk.buffer !== a.data.buffer && chunk.buffer !== b.data.buffer)).toBe(true);
    expect(a.data).toEqual(before); expect(a.data.byteLength).toBe(280000);
  });
  it('last subscriber cancels a stalled worker and replacement same-key job recovers', async () => {
    failure = 'hang'; const snapshot = capture([{ original: image() }]), controller = new AbortController();
    const first = getPalette(snapshot, { signal: controller.signal }), rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' }); controller.abort();
    failure = 'normal'; const second = getPalette(snapshot); await rejected;
    expect((await second).colors).toEqual(['#0c2238']); expect(instances[0].terminated).toBe(true); expect(instances).toHaveLength(2);
  });
  it('last subscriber removes an unstarted queued request', async () => {
    failure = 'hang'; const held = new AbortController(), queued = new AbortController();
    const first = getPalette(capture([{ original: image() }]), { signal: held.signal });
    const second = getPalette(capture([{ original: image(1, [9, 8, 7]) }]), { signal: queued.signal });
    const firstRejected = expect(first).rejects.toMatchObject({ name: 'AbortError' }), secondRejected = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    queued.abort(); held.abort(); await Promise.all([firstRejected, secondRejected]); expect(instances).toHaveLength(1);
    failure = 'normal'; expect((await getPalette(capture([{ original: image() }]))).colors).toEqual(['#0c2238']);
  });
  it.each(['startThrow', 'invalid', 'workerError', 'messageError', 'badResult', 'overCapacity'])('reports %s and terminates malformed workers before recovery', async mode => {
    failure = mode; await expect(getPalette(capture([{ original: image() }]))).rejects.toThrow(); expect(instances[0].terminated).toBe(true);
    failure = 'normal'; expect((await getPalette(capture([{ original: image() }]))).colors).toEqual(['#0c2238']);
  });
  it.each([undefined, class { constructor() { throw new Error('worker blocked'); } }])('cooperative fallback matches streaming worker when unavailable', async WorkerClass => {
    const frames = [{ original: image(40, [40, 50, 60]), delay: 20 }, { original: image(40, [90, 100, 110]), delay: 80 }];
    const expected = await getPalette(capture([{ frames }])); vi.stubGlobal('Worker', WorkerClass);
    // New client has no reusable worker/result cache. Sources helper remains the captured module.
    vi.resetModules(); const { captureGeneratedSources } = await import('./palette-generated-sources.js'); const { getGeneratedPalette } = await import('./palette-generated-client.js');
    expect(await getGeneratedPalette(captureGeneratedSources([{ frames }]))).toEqual(expected);
  });
});
