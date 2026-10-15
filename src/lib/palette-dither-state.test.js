import { describe, expect, it } from 'vitest';
import omggif from 'omggif';
import { unzipSync } from 'fflate';
import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './palette-state.js';
import { quantize, quantizePreviewAsync, colorize, preparePalette } from './quantize.js';
import { prepareCleanupAsync } from './palette-cleanup.js';
import { fileBytes, zipBytes } from './save.js';

const palette = { name: 'Mono', colors: ['#000000', '#ffffff'] };
const source = () => ({ width: 8, height: 8, data: Uint8ClampedArray.from(Array.from({ length: 64 }, (_, i) => [100 + i % 8 * 8, 100 + i % 8 * 8, 100 + i % 8 * 8, i === 0 ? 0 : i === 1 ? 127 : 255]).flat()) });
const asked = (extra = {}) => conversionSnapshot({ family: 'full-palette', palette, alphaCut: 128, metric: 'rgb', dither: '4x4', ditherStrength: 80, ...extra });

describe('full-palette dithering state and export integration', () => {
  it('restores only supported modes and integer percentages independently of family', () => {
    for (const family of ['two-color', 'full-palette']) {
      for (const dither of ['none', '2x2', '4x4', '8x8']) for (const ditherStrength of [0, 1, 50, 100]) {
        expect(restorePaletteState(JSON.stringify({ family, dither, ditherStrength }))).toMatchObject({ family, dither, ditherStrength });
      }
      for (const value of [null, true, -1, 101, 1.5, '50', [], {}]) {
        expect(restorePaletteState(JSON.stringify({ family, dither: value, ditherStrength: value }))).toMatchObject({ dither: 'none', ditherStrength: 50 });
      }
    }
    for (const text of [null, '{}', '{', '[]']) expect(restorePaletteState(text)).toMatchObject({ dither: 'none', ditherStrength: 50 });
    expect(conversionSnapshot({ family: 'two-color', set: {}, dither: '8x8', ditherStrength: 100 })).not.toHaveProperty('dither');
  });

  it('owns dither settings at the gesture and before deferred animation frames', async () => {
    const original = source(), ui = { family: 'full-palette', palette, alphaCut: 128, metric: 'rgb', dither: '4x4', ditherStrength: 80 };
    const snapshot = conversionSnapshot(ui); ui.dither = 'none'; ui.ditherStrength = 0;
    expect(Object.isFrozen(snapshot)).toBe(true);
    const item = { name: 'fixture.gif', original, frames: [{ original, delay: 40 }, { original, delay: 90 }], loop: 3 };
    const mutable = { ...snapshot }, animation = await fullPaletteImage(item, mutable);
    mutable.dither = 'none'; mutable.ditherStrength = 0;
    const expected = quantize(original, palette.colors, 128, undefined, undefined, { metric: 'rgb', dither: '4x4', ditherStrength: 80 });
    expect(animation).toMatchObject({ dither: '4x4', ditherStrength: 80, loop: 3 });
    for (let i = 0; i < 2; i++) expect((await animation.getFrame(i)).indices).toEqual(expected.indices);
    expect(expected.indices).not.toEqual(quantize(original, palette.colors, 128, undefined, undefined, { metric: 'rgb' }).indices);
  });

  it('keeps full preview, PNG Copy, GIF Save and ZIP on captured pixels, alpha and timing', async () => {
    const original = source(), snapshot = asked();
    const item = { name: 'test.gif', original, frames: [{ original, delay: 40 }, { original, delay: 90 }], loop: 2 };
    const preview = await quantizePreviewAsync(original, palette.colors, 128, 8, 8, snapshot);
    const copy = await fullPaletteImage(item, snapshot, { still: true }), animation = await fullPaletteImage(item, snapshot);
    expect(copy.indices).toEqual(preview.indices);
    expect(copy.indices[0]).toBe(256); expect(copy.indices[1]).toBe(256);
    const png = await fileBytes(copy), gif = await fileBytes(animation);
    const files = unzipSync(zipBytes(['copy.png', 'save.gif'], [png, gif]));
    expect(files['copy.png']).toEqual(png);
    const reader = new omggif.GifReader(files['save.gif']);
    expect(reader.loopCount()).toBe(2); expect(reader.numFrames()).toBe(2);
    const expectedRgba = colorize(preview, palette.colors).data;
    for (let i = 0; i < 2; i++) {
      const rgba = new Uint8Array(8 * 8 * 4); reader.decodeAndBlitFrameRGBA(i, rgba);
      expect(rgba).toEqual(new Uint8Array(expectedRgba));
      expect(reader.frameInfo(i).delay * 10).toBe(item.frames[i].delay);
    }
  });

  it('applies frozen cleanup replacements as solid colors after dither without changing other pixels', async () => {
    const colors = ['#151515', '#171717'], all = Array(64).fill(colors[0]); all[27] = colors[1];
    const original = { width: 8, height: 8, data: Uint8ClampedArray.from(all.flatMap(hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 255])) };
    original.data[3] = 0;
    const target = ['#141414', '#181818', '#909090'];
    for (const metric of ['rgb', 'oklab']) for (const maxColors of [0, 2]) {
      const snapshot = asked({ palette: { name: 'Dark', colors: target }, metric, maxColors, cleanup: true, ditherStrength: 100 });
      const result = await fullPaletteImage({ name: 'clean.png', original }, snapshot);
      const frozen = await prepareCleanupAsync([original], result.colors, 128, metric);
      const baseline = quantize(original, result.colors, 128, undefined, undefined, snapshot);
      let changed = 0;
      for (let i = 0; i < 64; i++) {
        const replacement = frozen.replacements[i];
        if (i === 0) expect(result.indices[i]).toBe(256);
        else if (replacement < 256) { expect(result.indices[i]).toBe(replacement); changed++; }
        else expect(result.indices[i]).toBe(baseline.indices[i]);
      }
      expect(changed).toBeGreaterThan(0);
      const sampled = await quantizePreviewAsync(original, preparePalette(result.colors), 128, 4, 4, snapshot);
      const full = quantize(original, result.colors, 128, undefined, undefined, snapshot);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) expect(sampled.indices[y*4+x]).toBe(full.indices[(y*2+1)*8+x*2+1]);
    }
  });
});
