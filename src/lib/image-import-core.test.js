import { describe, it, expect } from 'vitest';
import { analyze, unify, mask } from './recolor.js';
import { STYLES } from './presets.js';
import { defaults } from './settings.js';
import { analyzeImportFrames, importFrameMessage, importFrameTransfers, validateImportFrame, validateImportSettings } from './image-import-core.js';

function fixture() {
  return { loop: 3, frames: [80, 120, 250].map((delay, f) => ({ delay, original: {
    width: 7, height: 6, data: Uint8ClampedArray.from({ length: 168 }, (_, i) =>
      i % 4 === 3 ? [0, 64, 128, 200, 255][(Math.floor(i / 4) + f) % 5] : (i * 61 + f * 83) % 256),
  } })) };
}

describe('import analysis and transferable reconstruction', () => {
  for (const source of ['luma', 'value', 'red', 'green', 'blue']) {
    for (const alphaCut of [1, 128, 255]) {
      it(`preserves whole-clip analysis and every style: ${source}/${alphaCut}`, async () => {
        const input = fixture(), expected = structuredClone(input), pixels = input.frames.map(f => f.original.data.slice());
        for (const f of expected.frames) f.img = analyze(f.original, source, alphaCut);
        unify(expected.frames.map(f => f.img));
        const actual = await analyzeImportFrames(input, source, alphaCut, { cooperative: false });
        expect(actual.loop).toBe(3);
        expect(actual.frames.map(f => f.delay)).toEqual([80, 120, 250]);
        for (let i = 0; i < actual.frames.length; i++) {
          expect(actual.frames[i].original.data).toEqual(pixels[i]);
          const message = importFrameMessage(actual.frames[i], i);
          const received = structuredClone(message, { transfer: importFrameTransfers(message) });
          expect(message.pixels.byteLength).toBe(0);
          const { pixels: rgba, analysis } = validateImportFrame(received, i, 7, 6);
          const reconstructed = { ...analysis, data: rgba };
          expect(reconstructed).toEqual(expected.frames[i].img);
          for (const [style] of STYLES) {
            expect(mask(reconstructed, style, defaults(style))).toEqual(mask(expected.frames[i].img, style, defaults(style)));
            expect(mask(reconstructed, style, defaults(style), 4, 3)).toEqual(mask(expected.frames[i].img, style, defaults(style), 4, 3));
          }
        }
      });
    }
  }
  it('rejects malformed returned pixels, metadata and analysis', async () => {
    const result = await analyzeImportFrames(fixture(), 'luma', 128, { cooperative: false });
    const valid = importFrameMessage(result.frames[0], 0);
    for (const mutation of [
      m => m.index++, m => m.width++, m => m.pixels = new Uint8ClampedArray(1),
      m => m.analysis.lum = new Uint8Array(1), m => m.analysis.hist = new Uint32Array(2),
      m => m.analysis.soft = 1, m => m.analysis.auto = NaN, m => m.delay = -1,
    ]) {
      const invalid = structuredClone(valid); mutation(invalid);
      expect(() => validateImportFrame(invalid, 0, 7, 6)).toThrow();
    }
  });
  it('cancels cooperative work before touching source pixels', async () => {
    const controller = new AbortController();
    let touched = 0;
    const input = { frames: [{ get original() { touched++; throw new Error('touched'); } }] };
    controller.abort();
    await expect(analyzeImportFrames(input, 'luma', 128, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(touched).toBe(0);
    expect(() => validateImportSettings('other', 128)).toThrow();
    expect(() => validateImportSettings('luma', 0)).toThrow();
  });
  it('cancels a small still during its initial posted task without analyzing it', async () => {
    const controller = new AbortController(), input = fixture();
    const result = analyzeImportFrames(input, 'luma', 128, { signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(input.frames.every(f => !Object.hasOwn(f, 'img'))).toBe(true);
  });
});
