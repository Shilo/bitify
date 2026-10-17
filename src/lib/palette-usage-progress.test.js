import { describe, it, expect } from 'vitest';
import { addUsageFrame, completedUsage } from './palette-usage-progress.js';
const flags = (...indices) => { const used = new Uint8Array(256); indices.forEach(i => used[i] = 1); return used; };
describe('exact preview output metadata', () => {
  it('counts only after all frames and translates local subset indices into RGB', () => {
    const target = ['#ff0000', '#00ff00', '#0000ff'];
    let progress = addUsageFrame(null, ['#0000ff', '#ff0000'], flags(0), 2, 3);
    expect(completedUsage(progress, target)).toBeNull();
    expect(addUsageFrame(progress, target, flags(0, 1), 2, 3)).toBeNull();
    progress = addUsageFrame(progress, ['#00ff00'], flags(0), 0, 3);
    expect(completedUsage(progress, target)).toBeNull();
    progress = addUsageFrame(progress, target, flags(), 1, 3);
    expect(completedUsage(progress, target)).toEqual({ count: 2, colors: ['#00ff00', '#0000ff'], frames: 3 });
    expect(progress.seen.byteLength).toBe(3);
  });
  it('counts zero-color transparent stills without adding an empty palette slot', () => {
    const p = addUsageFrame(null, ['#000000'], flags(), 0, 1);
    expect(completedUsage(p, ['#000000'])).toEqual({ count: 0, colors: [], frames: 1 });
  });
  it('rejects partial or malformed metadata rather than inventing a count', () => {
    for (const args of [[-1, 1], [1, 1], [0, 0], [0.5, 2]])
      expect(addUsageFrame(null, ['#000000'], flags(0), ...args)).toBeNull();
    expect(addUsageFrame(null, [], new Uint8Array(2), 0, 1)).toBeNull();
  });
});
