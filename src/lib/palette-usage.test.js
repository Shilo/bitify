import { describe, expect, it, vi } from 'vitest';
import { collectPaletteUsage } from './palette-usage.js';
import { fullPaletteImage } from './palette-state.js';
import { EMPTY_INDEX } from './quantize.js';

const source = values => ({ width: values.length, height: 1, data: Uint8ClampedArray.from(values.flat()) });
const snapshot = { family: 'full-palette', colors: ['#ffffff', '#000000', '#ff0000', '#00ff00'], alphaCut: 128, metric: 'oklab', maxColors: 0 };
describe('full-source output palette inspection', () => {
  it('unions every animation frame, excluding empty pixels and keeping target order', async () => {
    const first = source([[0,0,0,255], [0,255,0,0]]), next = source([[255,0,0,255], [255,255,255,255]]);
    const item = { original: first, frames: [{ original: first, delay: 40 }, { original: next, delay: 90 }] };
    const result = await collectPaletteUsage(item, snapshot);
    expect(result).toEqual({ count: 3, colors: ['#ffffff', '#000000', '#ff0000'], frames: 2 });
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.colors)).toBe(true);
    expect((await collectPaletteUsage({original: first}, snapshot)).count).toBe(1);
  });
  it('reports an all-transparent fixed-palette image as zero colors', async () => {
    expect(await collectPaletteUsage({ original: source([[0,255,0,0]]) }, snapshot)).toEqual({ colors: [], count: 0, frames: 1 });
  });
  it('matches final full-source indices under cap, Cleanup, matching and dithering', async () => {
    const original = { width: 12, height: 12, data: Uint8ClampedArray.from(Array.from({ length: 144 }, (_, p) => [p % 7 * 40, p % 5 * 50, p % 3 * 90, p % 11 ? 255 : 0]).flat()) };
    for (const metric of ['rgb', 'oklab']) for (const cleanup of [false, true]) for (const dither of ['none', '4x4']) {
      const asked = { ...snapshot, metric, cleanup, dither, ditherStrength: 100, maxColors: 2 };
      const full = await fullPaletteImage({ original }, asked);
      const actual = new Set([...full.indices].filter(i => i !== EMPTY_INDEX).map(i => full.colors[i]));
      const usage = await collectPaletteUsage({ original }, asked);
      expect(usage.colors).toEqual(full.colors.filter(c => actual.has(c)));
      expect(usage.count).toBe(actual.size);
    }
  });
  it('rejects canceled work and non-Palette requests', async () => {
    const controller = new AbortController(); controller.abort();
    const item = { original: source([[0,0,0,255]]) };
    await expect(collectPaletteUsage(item, snapshot, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    await expect(collectPaletteUsage(item, { family: 'two-color' })).rejects.toThrow('Palette mode');
  });
  it('cancels between animation frames without publishing partial union metadata', async () => {
    const original = source([[0,0,0,255]]), controller = new AbortController();
    let framesRead = 0;
    const frames = Array.from({length: 100}, () => ({ get original() { framesRead++; return original; }, delay: 40 }));
    const pending = collectPaletteUsage({original, frames}, snapshot, {signal: controller.signal});
    // Capture happens synchronously, then each animation frame yields a task.
    await vi.waitFor(() => expect(framesRead).toBeGreaterThan(0));
    controller.abort();
    await expect(pending).rejects.toMatchObject({name: 'AbortError'});
  });
});
