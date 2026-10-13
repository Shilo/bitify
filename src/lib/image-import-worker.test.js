import { afterEach, it, expect, vi } from 'vitest';
import { validateImportFrame } from './image-import-core.js';
afterEach(() => vi.unstubAllGlobals());

it('the actual worker streams and releases each prepared frame on its exact acknowledgment', async () => {
  vi.resetModules();
  const received = [], transferred = [];
  const scope = { postMessage(message, buffers) {
    received.push(structuredClone(message, { transfer: buffers ?? [] }));
    if (buffers) transferred.push(buffers.map(b => b.byteLength));
  } };
  vi.stubGlobal('self', scope);
  await import('./image-import-worker.js');
  const frames = [80, 120].map((delay, f) => ({ delay, original: { width: 2, height: 1,
    data: Uint8ClampedArray.of(34 + f, 35, 35, 255, 240, 246, 240, 128) } }));
  const expected = frames.map(f => f.original.data.slice());
  await scope.onmessage({ data: { type: 'start', mode: 'frames', source: 'blue', alphaCut: 200, frames, loop: 2 } });
  expect(received).toEqual([{ type: 'ready', count: 2, width: 2, height: 1, loop: 2 }]);
  for (let i = 0; i < 2; i++) {
    await scope.onmessage({ data: { type: 'next', index: i } });
    expect(frames[i]).toBe(null);
    expect(validateImportFrame(received[i + 1], i, 2, 1).pixels).toEqual(expected[i]);
    expect(transferred[i]).toEqual([0, 0, 0, 0, 0, 0]);
  }
  await scope.onmessage({ data: { type: 'next', index: 2 } });
  expect(received.at(-1)).toEqual({ type: 'done' });
  await scope.onmessage({ data: { type: 'next', index: 2 } });
  expect(received.at(-1)).toMatchObject({ type: 'error' });
  await scope.onmessage({ data: { type: 'start', mode: 'frames', source: 'luma', alphaCut: 128,
    frames: [{ original: { width: 1, height: 1, data: Uint8ClampedArray.of(0, 0, 0, 255) } }] } });
  expect(received.at(-1)).toMatchObject({ type: 'ready', count: 1 });
  await scope.onmessage({ data: { type: 'next', index: 1 } });
  expect(received.at(-1)).toMatchObject({ type: 'error' });
});
