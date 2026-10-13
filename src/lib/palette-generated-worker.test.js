import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureGeneratedSources } from './palette-generated-sources.js';
import { generatePaletteAsync } from './palette-generated.js';

let messages, host;
const image = (size = 96, offset = 0) => {
  const data = new Uint8ClampedArray(size * 4);
  for (let p = 0; p < size; p++) data.set([(p + offset) >>> 8 & 255, (p + offset) & 255, p * 13 & 255, p % 17 ? 255 : 127], p * 4);
  return { width: size, height: 1, data };
};
async function loadWorker() {
  vi.resetModules(); messages = [];
  host = { postMessage: (data, transfer = []) => messages.push(structuredClone(data, { transfer })) };
  vi.stubGlobal('self', host); await import('./palette-generated-worker.js');
}
const send = data => host.onmessage({ data: structuredClone(data) });
const chunk = (pixels, weight = 1, lastAsset = false) => ({ type: 'chunk', pixels, weight, lastAsset });
async function stream(snapshot, bytes = 128 * 1024) {
  await send({ type: 'start', alphaCut: snapshot.alphaCut });
  expect(messages.at(-1).type).toBe('next');
  for (const asset of snapshot.assets) for (let frame = 0; frame < asset.frames.length; frame++) {
    const source = asset.frames[frame];
    for (let at = 0; at < source.data.length; at += bytes) {
      const end = Math.min(at + bytes, source.data.length), before = messages.length;
      await send(chunk(source.data.slice(at, end), source.delay, end === source.data.length && frame === asset.frames.length - 1));
      expect(messages.length).toBe(before + 1); expect(messages.at(-1).type).toBe('next');
    }
  }
  await send({ type: 'end' }); expect(messages.at(-1).type).toBe('result');
  return messages.at(-1).result;
}
beforeEach(loadWorker);
afterEach(() => vi.unstubAllGlobals());

describe('generated palette real worker protocol', () => {
  it.each([96, 5000])('streaming multiple assets and weighted animation frames equals cooperative fitting (%i pixels)', async size => {
    const first = image(size), second = image(size, 71), still = image(64, 123), invisible = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
    const snapshot = captureGeneratedSources([{ frames: [{ original: first, delay: 20 }, { original: second, delay: 80 }] }, { original: still }, { original: invisible }]);
    const before = first.data.slice(), expected = await generatePaletteAsync(snapshot);
    const actual = await stream(snapshot, 508);
    expect(actual).toEqual(expected); expect(actual.assets).toBe(2);
    expect(actual.binned).toBe(size > 4096); expect(first.data).toEqual(before);
    // The same real worker accepts another complete request without leaking bins,
    // duration mass or the preceding wall's palette into the new result.
    const next = captureGeneratedSources([{ original: image(3) }]);
    expect(await stream(next, 4)).toEqual(await generatePaletteAsync(next));
  });
  it('rejects end during an unfinished asset and recovers without publishing a partial palette', async () => {
    await send({ type: 'start', alphaCut: 128 });
    await send(chunk(image(8).data, 80, false));
    await send({ type: 'end' });
    expect(messages.at(-1)).toMatchObject({ type: 'error' }); expect(messages.some(m => m.type === 'result')).toBe(false);
    const snapshot = captureGeneratedSources([{ original: image(2) }]);
    expect(await stream(snapshot)).toEqual(await generatePaletteAsync(snapshot));
  });
  it.each([
    chunk(new Uint8ClampedArray(3)),
    chunk(image(1).data, NaN),
    chunk(image(1).data, 0),
    { type: 'invalid' },
  ])('rejects malformed chunks/requests and permits a fresh job', async invalid => {
    await send({ type: 'start', alphaCut: 128 }); await send(invalid);
    expect(messages.at(-1).type).toBe('error'); expect(messages.some(m => m.type === 'result')).toBe(false);
    const snapshot = captureGeneratedSources([{ original: image(1) }]);
    expect(await stream(snapshot)).toEqual(await generatePaletteAsync(snapshot));
  });
  it('rejects requests before startup and invalid opacity without retaining worker state', async () => {
    await send(chunk(image(1).data)); expect(messages.at(-1).type).toBe('error');
    await send({ type: 'start', alphaCut: 0 }); expect(messages.at(-1).type).toBe('error');
    expect(await stream(captureGeneratedSources([]))).toEqual({ colors: [], binned: false, assets: 0 });
  });
  it('an abandoned acknowledged job publishes no partial result and its replacement runtime starts clean', async () => {
    await send({ type: 'start', alphaCut: 128 }); await send(chunk(image(256).data, 80, false));
    const abandoned = messages;
    expect(abandoned.map(m => m.type)).toEqual(['next', 'next']);
    // Cancellation belongs to the client: it terminates the Worker, rather than
    // sending an abort message. Reimporting gives the replacement its own module
    // state. Client tests separately assert termination/subscriber ownership.
    await loadWorker();
    const snapshot = captureGeneratedSources([{ original: image(2, 250) }]);
    expect(await stream(snapshot)).toEqual(await generatePaletteAsync(snapshot));
    expect(abandoned.some(m => m.type === 'result')).toBe(false);
  });
});
