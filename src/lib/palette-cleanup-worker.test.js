import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareCleanupAsync } from './palette-cleanup.js';

let messages, host;
const source = (noise = false) => {
  const data = new Uint8ClampedArray(20);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  if (noise) data.set([8, 12, 22, 255], 8);
  return { width: 5, height: 1, data };
};
const colors = ['#000000', '#1d2b53'];
const metadata = sources => sources.map(({ width, height, data }) => ({ width, height, byteLength: data.length }));
const send = data => host.onmessage({ data });
const chunk = (image, data = image.data, last = true) => ({ type: 'chunk', width: image.width, height: image.height, data, last });
beforeEach(async () => {
  vi.resetModules(); messages = []; host = { postMessage: (data, transfer = []) => messages.push(structuredClone(data, { transfer })) };
  vi.stubGlobal('self', host); await import('./palette-cleanup-worker.js');
});
afterEach(() => vi.unstubAllGlobals());

describe('cleanup worker acknowledged frame protocol', () => {
  it('returns after the first empty guard, without requesting later frames, and accepts a fresh job', async () => {
    const image = source(), sources = [image, image, image];
    await send({ type: 'start', colors, alphaCut: 128, metric: 'oklab', frames: metadata(sources) });
    await send(chunk(image, image.data.slice(0, 8), false));
    await send(chunk(image, image.data.slice(8)));
    expect(messages.map(m => m.type)).toEqual(['next', 'next', 'result']);
    expect(messages[2].result).toEqual(await prepareCleanupAsync(sources, colors));
    await send({ type: 'start', colors, alphaCut: 128, metric: 'rgb', frames: metadata([image]) });
    await send(chunk(image)); expect(messages.at(-1).type).toBe('result');
  });
  it('stops after a later disagreement eliminates the last proposal', async () => {
    const sources = [source(true), source(), source(true)];
    await send({ type: 'start', colors, alphaCut: 128, metric: 'oklab', frames: metadata(sources) });
    await send(chunk(sources[0])); expect(messages.at(-1).type).toBe('next');
    await send(chunk(sources[1])); expect(messages.at(-1).type).toBe('result');
    expect(messages.at(-1).result).toEqual(await prepareCleanupAsync(sources, colors));
  });
  it('retains stationary proposals until every frame has been processed', async () => {
    const image = source(true), sources = [image, image, image];
    await send({ type: 'start', colors, alphaCut: 128, metric: 'oklab', frames: metadata(sources) });
    for (let i = 0; i < sources.length; i++) {
      await send(chunk(image)); expect(messages.at(-1).type).toBe(i === 2 ? 'result' : 'next');
    }
    expect(messages.at(-1).result.hasChanges).toBe(true);
    expect(messages.at(-1).result).toEqual(await prepareCleanupAsync(sources, colors));
  });
  it('rejects all-frame metadata mismatches before requesting any pixel buffer', async () => {
    for (const frames of [[], [...metadata([source()]), { width: 1, height: 1, byteLength: 4 }], [...metadata([source()]), { width: 5, height: 1, byteLength: 19 }]]) {
      await send({ type: 'start', colors, alphaCut: 128, metric: 'oklab', frames });
      expect(messages.at(-1).type).toBe('error');
    }
    expect(messages.every(m => m.type === 'error')).toBe(true);
  });
  it('rejects incomplete clips, frame boundaries and excess bytes instead of publishing partial results', async () => {
    const image = source();
    for (const invalid of [{ type: 'end' }, chunk(image, image.data.slice(0, 8)), chunk(image, new Uint8ClampedArray(24)), { ...chunk(image), width: 4 }]) {
      await send({ type: 'start', colors, alphaCut: 128, metric: 'oklab', frames: metadata([image]) });
      await send(invalid); expect(messages.at(-1).type).toBe('error');
    }
    expect(messages.every(m => m.type !== 'result')).toBe(true);
  });
});
