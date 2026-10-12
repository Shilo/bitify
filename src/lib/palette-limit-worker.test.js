import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

let worker, messages;
beforeEach(async () => {
  vi.resetModules(); messages = []; worker = { postMessage: message => messages.push(message) };
  vi.stubGlobal('self', worker); await import('./palette-limit-worker.js');
});
afterEach(() => vi.unstubAllGlobals());
const send = data => worker.onmessage({ data });
const start = () => send({ type: 'start', colors: ['#ff0000', '#0000ff'], maxColors: 1, alphaCut: 128, metric: 'rgb' });

describe('limited palette worker streaming protocol', () => {
  it('requests one chunk at a time, completes and can run the next job', async () => {
    for (let run = 0; run < 2; run++) {
      const before = messages.length; start();
      await vi.waitFor(() => expect(messages.at(-1)).toEqual({ type: 'next', pass: 1 }));
      expect(messages.slice(before).filter(m => m.type === 'next')).toHaveLength(1);
      send({ type: 'chunk', data: Uint8ClampedArray.from([255, 0, 0, 255]), weight: 80 });
      await vi.waitFor(() => expect(messages.slice(before).filter(m => m.type === 'next')).toHaveLength(2));
      send({ type: 'endPass' });
      await vi.waitFor(() => expect(messages.at(-1).type).toBe('result'));
      expect(messages.at(-1).result.indices).toEqual([0]);
    }
  });
  it('cancels a waiting source request without returning a partial palette', async () => {
    start(); await vi.waitFor(() => expect(messages.at(-1).type).toBe('next'));
    send({ type: 'cancel' });
    await vi.waitFor(() => expect(messages.at(-1)).toMatchObject({ type: 'error', name: 'AbortError' }));
    expect(messages.some(m => m.type === 'result')).toBe(false);
  });
  it('rejects protocol collisions, and releases the canceled active job', async () => {
    start(); start(); expect(messages.at(-1)).toMatchObject({ type: 'error', message: 'Invalid palette-limit worker request.' });
    send({ type: 'cancel' }); await vi.waitFor(() => expect(messages.at(-1).name).toBe('AbortError'));
  });
});
