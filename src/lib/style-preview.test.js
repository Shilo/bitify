import { describe, it, expect } from 'vitest';
import { stylePreview } from './style-preview.js';
import { STYLES } from './presets.js';
import { defaults } from './settings.js';

const preview = (style, none = 0, changes = {}) => stylePreview(style, { ...defaults(style), ...changes }, '#000000', '#ffffff', none);
const alphaCount = image => Array.from(image.data).filter((_, i) => i % 4 === 3 && image.data[i] === 0).length;

describe('style chooser preview', () => {
  it('makes all eleven default styles distinguishable while retaining a transparent silhouette', () => {
    const samples = STYLES.map(([key]) => preview(key));
    expect(new Set(samples.map(image => Array.from(image.data).join(','))).size).toBe(STYLES.length);
    for (const image of samples) {
      expect(image.width).toBe(32);
      expect(image.height).toBe(32);
      expect(alphaCount(image)).toBeGreaterThan(0);
      expect(alphaCount(image)).toBeLessThan(32 * 32);
    }
  });
  it('shows omitted ink as transparency, while Shape remains visible with its first color omitted', () => {
    expect(alphaCount(preview('solid', 1))).toBeGreaterThan(alphaCount(preview('solid')));
    expect(alphaCount(preview('solid', 2))).toBeGreaterThan(alphaCount(preview('solid')));
    expect(alphaCount(preview('silhouette', 1))).toBe(alphaCount(preview('silhouette')));
  });
  it('reflects brightness channel choices and remembered conversion settings', () => {
    expect(preview('solid', 0, { threshold: 140, source: 'red' }).data).not.toEqual(preview('solid', 0, { threshold: 140, source: 'blue' }).data);
    expect(preview('hatch', 0, { direction: '/' }).data).not.toEqual(preview('hatch', 0, { direction: '|' }).data);
  });
});
