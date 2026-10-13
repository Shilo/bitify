import { afterEach, describe, expect, it, vi } from 'vitest';
import * as bitify from './bitify.js';
import * as quantize from './quantize.js';
import { analysisKey, analysisMatches, reanalyzeItem, reanalyzeItems } from './image-reanalysis.js';
import { defaults } from './settings.js';
import { STYLES } from './presets.js';

afterEach(() => vi.restoreAllMocks());
function fixture({ animated = true, partial = true } = {}) {
  const frames = [80, 120, 250].slice(0, animated ? 3 : 1).map((delay, f) => {
    const original = { width: 7, height: 6, data: Uint8ClampedArray.from({ length: 168 }, (_, at) => at % 4 === 3
      ? (partial ? [0, 64, 128, 200, 255] : [0, 255])[(Math.floor(at / 4) + f) % (partial ? 5 : 2)] : (at * 61 + f * 83) % 256) };
    return { original, img: bitify.analyze(original), delay };
  });
  bitify.unify(frames.map(frame => frame.img));
  return { id: 42, name: 'captured.gif', by: analysisKey(frames[0].img.soft), ...frames[0], ...(animated ? { frames, loop: 3 } : {}) };
}
function freshReference(item, { source, alphaCut }) {
  const frames = (item.frames ?? [item]).map(frame => ({ original: { ...frame.original, data: frame.original.data.slice() }, delay: frame.delay }));
  for (const frame of frames) frame.img = bitify.analyze(frame.original, source, alphaCut);
  bitify.unify(frames.map(frame => frame.img)); return frames;
}
describe('cooperative unpublished live analysis', () => {
  for (const source of ['luma', 'value', 'red', 'green', 'blue']) for (const alphaCut of [1, 128, 255]) {
    it(`matches independent synchronous whole-clip analysis and all style masks: ${source}/${alphaCut}`, async () => {
      const item = fixture(); item.by = 'obsolete';
      const originalAnalysis = item.frames.map(frame => structuredClone(frame.img)), originalBuffers = item.frames.map(frame => frame.original.data);
      const settings = { source, alphaCut }, expected = freshReference(item, settings);
      const result = await reanalyzeItem(item, settings);
      expect(result).not.toBe(item); expect(result).toMatchObject({ id: 42, name: 'captured.gif', loop: 3, by: analysisKey(true, settings) });
      expect(result.img).toBe(result.frames[0].img); expect(result.original).toBe(item.original);
      expect(result.frames.map(frame => frame.delay)).toEqual([80, 120, 250]);
      for (let i = 0; i < result.frames.length; i++) {
        expect(result.frames[i]).not.toBe(item.frames[i]); expect(result.frames[i].original).toBe(item.frames[i].original);
        expect(result.frames[i].img).toEqual(expected[i].img);
        expect(result.frames[i].img.data).toBe(originalBuffers[i]); expect(originalBuffers[i].byteLength).toBe(168);
        for (const [style] of STYLES) expect(bitify.mask(result.frames[i].img, style, defaults(style))).toEqual(bitify.mask(expected[i].img, style, defaults(style)));
        expect(item.frames[i].img).toEqual(originalAnalysis[i]);
      }
    });
  }
  it('matching analyses keep exact identity without analyzing or posting tasks; opaque cuts are irrelevant', async () => {
    const item = fixture({ partial: false }), post = vi.spyOn(quantize, 'yieldTask'), analyze = vi.spyOn(bitify, 'analyze');
    expect(analysisKey(false, { source: 'green', alphaCut: 255 })).toBe('green ');
    expect(analysisMatches(item, { source: 'luma', alphaCut: 255 })).toBe(true);
    expect(await reanalyzeItem(item, { source: 'luma', alphaCut: 255 })).toBe(item);
    expect(await reanalyzeItems([item], { source: 'luma', alphaCut: 1 })).toEqual([item]);
    expect(post).not.toHaveBeenCalled(); expect(analyze).not.toHaveBeenCalled();
  });
  it('captures the whole wall, frame sources/order/delays and settings before its first yield', async () => {
    const first = fixture(), second = fixture(), items = [first, second], settings = { source: 'blue', alphaCut: 200 };
    const originals = items.map(item => item.frames.map(frame => frame.original));
    const reference = items.map(item => freshReference(item, settings));
    let resume;
    vi.spyOn(quantize, 'yieldTask').mockImplementationOnce(() => new Promise(resolve => { resume = resolve; }));
    const pending = reanalyzeItems(items, settings);
    expect(resume).toBeTypeOf('function');
    settings.source = 'red'; settings.alphaCut = 1; items.reverse();
    first.frames[0].original = second.frames[1].original; first.frames[0].delay = 999; first.frames.reverse();
    first.name = 'changed'; second.id = 99; second.frames = []; second.loop = 0;
    resume(); const result = await pending;
    expect(result.map(item => item.id)).toEqual([42, 42]); expect(result.map(item => item.name)).toEqual(['captured.gif', 'captured.gif']);
    for (let n = 0; n < result.length; n++) {
      expect(result[n].loop).toBe(3); expect(result[n].by).toBe('blue 200');
      expect(result[n].frames.map(frame => frame.delay)).toEqual([80, 120, 250]);
      result[n].frames.forEach((frame, i) => { expect(frame.original).toBe(originals[n][i]); expect(frame.img).toEqual(reference[n][i].img); });
    }
  });
  it('reanalyzes a single frame without introducing clip unification or changing its still shape', async () => {
    const item = fixture({ animated: false }), settings = { source: 'value', alphaCut: 64 }, expected = freshReference(item, settings)[0];
    const result = await reanalyzeItem(item, settings);
    expect(result.img).toEqual(expected.img); expect(result.frames).toBeUndefined(); expect(result.original).toBe(item.original);
    const frames = [result.img], post = vi.spyOn(quantize, 'yieldTask');
    expect(await bitify.unifyAsync(frames)).toBe(frames); expect(post).not.toHaveBeenCalled();
  });
  it('cancels before source access or during its first posted task without analyzing', async () => {
    const controller = new AbortController(); controller.abort();
    const poison = { get img() { throw new Error('source read'); } };
    await expect(reanalyzeItem(poison, {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const live = new AbortController(), item = fixture(), analyze = vi.spyOn(bitify, 'analyze');
    vi.spyOn(quantize, 'yieldTask').mockImplementation(async () => live.abort());
    await expect(reanalyzeItem(item, { source: 'red' }, { signal: live.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(analyze).not.toHaveBeenCalled(); expect(item.by).toBe('luma 128');
  });
  it.each([1, 2, 4, 5])('cancels at posted boundary %i without mutating published or partially unifying new analyses', async boundary => {
    const item = fixture(), before = structuredClone(item), controller = new AbortController(), made = [];
    const originalAnalyze = bitify.analyze;
    vi.spyOn(bitify, 'analyze').mockImplementation((...args) => { const img = originalAnalyze(...args); made.push({ img, auto: img.auto, autoSeam: img.autoSeam }); return img; });
    let turn = 0; vi.spyOn(quantize, 'yieldTask').mockImplementation(async () => { if (++turn === boundary) controller.abort(); });
    await expect(reanalyzeItem(item, { source: 'green', alphaCut: 200 }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(item).toEqual(before);
    for (const frame of made) { expect(frame.img.auto).toBe(frame.auto); expect(frame.img.autoSeam).toBe(frame.autoSeam); }
    expect(turn).toBe(boundary);
  });
  it('rejects an analysis failure without exposing or publishing a partial wall', async () => {
    const first = fixture(), second = fixture(), before = structuredClone([first, second]), original = bitify.analyze;
    let calls = 0;
    vi.spyOn(bitify, 'analyze').mockImplementation((...args) => { if (++calls === 4) throw new Error('Analysis failed'); return original(...args); });
    await expect(reanalyzeItems([first, second], { source: 'red' })).rejects.toThrow('Analysis failed');
    expect([first, second]).toEqual(before); expect(calls).toBe(4);
  });
  it.each([
    item => item.frames = [], item => item.frames = null, item => item.frames[0].original = null,
    item => item.frames[1].original = { width: 1, height: 1, data: new Uint8ClampedArray(4) },
    item => item.frames[0].original = { width: 0, height: 6, data: new Uint8ClampedArray(0) },
    item => item.frames[0].original = { width: 7, height: 6, data: new Uint8Array(168) },
    item => item.frames[0].delay = NaN,
  ])('rejects malformed captured frames before doing any analysis', async damage => {
    const item = fixture(); damage(item); const post = vi.spyOn(quantize, 'yieldTask');
    await expect(reanalyzeItem(item, { source: 'green' })).rejects.toThrow(); expect(post).not.toHaveBeenCalled();
  });
  it('rejects invalid settings and walls', async () => {
    await expect(reanalyzeItem(fixture(), { source: 'invalid' })).rejects.toThrow('settings');
    for (const alphaCut of [0, 256, 1.5]) await expect(reanalyzeItems([fixture()], { alphaCut })).rejects.toThrow('settings');
    await expect(reanalyzeItems(null)).rejects.toThrow('wall'); expect(await reanalyzeItems([])).toEqual([]);
  });
});
