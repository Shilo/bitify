import { describe, expect, it, vi } from 'vitest';
import { createAnimationCache } from './palette-animation-cache.js';
const source = () => ({ width: 2, height: 1, data: new Uint8Array(8) });
const result = () => ({ w: 2, h: 1, indices: new Uint16Array([0, 256]), used: new Uint8Array(256), hasTransparency: true });
const options = () => ({ sources: [source(), source()], palette: { colors: ['#000000'] }, width: 2, height: 1, alphaCut: 128, metric: 'oklab' });

describe('bounded animation preview cache', () => {
  it('bypasses stills and oversized clips without allocating or evicting', () => {
    const cache = createAnimationCache(600), args = options(), small = cache.acquire(args);
    expect(cache.acquire({ ...args, sources: [args.sources[0]] })).toBeNull();
    expect(cache.acquire({ ...args, width: 1000 })).toBeNull();
    expect(cache.stats()).toEqual({ bytes: 520, clips: 1 });
    small.release(); expect(cache.stats()).toEqual({ bytes: 0, clips: 0 });
  });
  it('fills lazily and shares identical frame work and results across consumers', async () => {
    const cache = createAnimationCache(), args = options(), a = cache.acquire(args), b = cache.acquire({ ...args, palette: { colors: ['#000000'] } });
    const produce = vi.fn(async () => result());
    const [x, y] = await Promise.all([a.getFrame(0, produce), b.getFrame(0, produce)]);
    expect(x).toBe(y); expect(await a.getFrame(0, produce)).toBe(x); expect(produce).toHaveBeenCalledTimes(1);
    a.release(); expect(cache.stats().clips).toBe(1); b.release(); expect(cache.stats().bytes).toBe(0);
  });
  it('keeps keys separate for dimensions, ordered colors, metric, cut, cleanup and source buffers', () => {
    const cache = createAnimationCache(), args = options(), handles = [cache.acquire(args)];
    for (const change of [{ width: 1 }, { metric: 'rgb' }, { alphaCut: 100 }, { cleanup: {} },
      { palette: { colors: ['#ffffff', '#000000'] } }, { sources: [source(), source()] }]) handles.push(cache.acquire({ ...args, ...change }));
    expect(cache.stats().clips).toBe(7); handles.forEach(h => h.release()); expect(cache.stats().bytes).toBe(0);
  });
  it('one cancellation preserves another consumer, while the last cancellation aborts production', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()), a = new AbortController(), b = new AbortController();
    let resolve, producerSignal;
    const produce = signal => { producerSignal = signal; return new Promise(r => { resolve = r; }); };
    const first = handle.getFrame(0, produce, { signal: a.signal }), second = handle.getFrame(0, produce, { signal: b.signal });
    await Promise.resolve(); a.abort(); await expect(first).rejects.toHaveProperty('name', 'AbortError');
    expect(producerSignal.aborted).toBe(false); resolve(result()); await expect(second).resolves.toHaveProperty('w', 2);
    const last = handle.getFrame(1, produce, { signal: b.signal }); await Promise.resolve(); b.abort();
    await expect(last).rejects.toHaveProperty('name', 'AbortError'); expect(producerSignal.aborted).toBe(true);
    resolve(result()); handle.release();
  });
  it('releases reservations and rejects late completion after invalidation', async () => {
    const cache = createAnimationCache(), handle = cache.acquire(options()); let resolve;
    const pending = handle.getFrame(0, () => new Promise(r => { resolve = r; })); await Promise.resolve();
    handle.release(); resolve(result()); await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(cache.stats()).toEqual({ bytes: 0, clips: 0 });
  });
  it('does not exceed the global budget with multiple different clips', () => {
    const cache = createAnimationCache(600), handle = cache.acquire(options());
    expect(cache.acquire(options())).toBeNull(); handle.release(); expect(cache.acquire(options())).not.toBeNull();
  });
  it('rejects malformed produced buffers without retaining a frame', async () => {
    const cache = createAnimationCache(), h = cache.acquire(options());
    await expect(h.getFrame(0, async () => ({ ...result(), indices: new Uint8Array(2) }))).rejects.toThrow('Invalid cached');
    await expect(h.getFrame(0, async () => result())).resolves.toHaveProperty('w', 2); h.release();
  });
});
