import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExportDrag } from './export-drag.js';

afterEach(() => { vi.useRealTimers(); });
describe('preparatory export drag ownership', () => {
  function fixture(prepare) {
    let key = 'initial';
    const request = vi.fn(item => ({ item, key }));
    const notify = vi.fn(), revoke = vi.fn();
    const controller = createExportDrag({ request, prepare, notify, revoke, delay: 1 });
    return { controller, request, notify, revoke, change: () => { key = 'changed'; controller.refresh(); } };
  }
  const record = url => ({ url, file: new File(['pixels'], 'test.png', { type: 'image/png' }), width: 1, height: 1 });
  it('does not compute snapshots for observers without a ready export', () => {
    const f = fixture(vi.fn());
    expect(f.controller.readyFor({ id: 1 })).toBeNull(); expect(f.request).not.toHaveBeenCalled();
    f.controller.destroy();
    expect(f.controller.readyFor({ id: 1 })).toBeNull(); expect(f.request).not.toHaveBeenCalled();
  });
  it('cancels obsolete preparation and lets the next item start without an error toast', async () => {
    vi.useFakeTimers(); const calls = [];
    const f = fixture((asked, { signal }) => new Promise((resolve, reject) => {
      calls.push({ asked, signal, resolve });
      signal.addEventListener('abort', () => reject(new DOMException('Canceled', 'AbortError')), { once: true });
    }));
    const first = { id: 1 }, next = { id: 2 };
    f.controller.hover(first); await vi.advanceTimersByTimeAsync(1);
    f.controller.hover(next); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); expect(calls[0].signal.aborted).toBe(true);
    calls[1].resolve(record('blob:new')); await vi.advanceTimersByTimeAsync(0);
    expect(f.controller.readyFor(next)?.url).toBe('blob:new'); expect(f.notify).not.toHaveBeenCalled();
    f.controller.destroy(); expect(f.revoke).toHaveBeenCalledWith('blob:new');
  });
  it('rejects a late canceled result, retains completed reuse, and invalidates changed settings', async () => {
    vi.useFakeTimers(); const calls = [];
    const f = fixture((asked, { signal }) => new Promise(resolve => calls.push({ asked, signal, resolve })));
    const item = { id: 1 };
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    f.controller.leave(item); expect(calls[0].signal.aborted).toBe(true);
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); // Module-loading work need not resolve before the next hover starts.
    calls[0].resolve(record('blob:late')); await vi.advanceTimersByTimeAsync(0);
    expect(f.revoke).toHaveBeenCalledWith('blob:late'); expect(calls).toHaveLength(2);
    calls[1].resolve(record('blob:ready')); await vi.advanceTimersByTimeAsync(0);
    f.controller.cancelHover(); f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2); expect(f.controller.readyFor(item)?.url).toBe('blob:ready');
    f.change(); await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(3); expect(f.controller.readyFor(item)).toBeNull();
    f.controller.destroy(); expect(calls[2].signal.aborted).toBe(true);
    calls[2].resolve(record('blob:disposed')); await vi.advanceTimersByTimeAsync(0);
    expect(f.revoke).toHaveBeenCalledWith('blob:disposed'); expect(f.notify).not.toHaveBeenCalled();
  });
  it('retains a native drag and its grace URL through cancellation and settings changes', async () => {
    vi.useFakeTimers(); const item = { id: 1 }, f = fixture(async () => record('blob:native'));
    f.controller.hover(item); await vi.advanceTimersByTimeAsync(1);
    const ready = f.controller.readyFor(item);
    const image = { src: ready.url, complete: true, naturalWidth: 1, naturalHeight: 1 };
    const event = { target: image, preventDefault: vi.fn(), dataTransfer: { files: [ready.file], clearData: vi.fn(), setData: vi.fn() } };
    expect(f.controller.start(event, item, { record: ready, image, decoded: true })).toBe(true);
    f.controller.cancelHover(); f.change(); expect(f.revoke).not.toHaveBeenCalled();
    f.controller.end(); expect(f.revoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000); expect(f.revoke).toHaveBeenCalledWith('blob:native');
    f.controller.destroy();
  });
});
