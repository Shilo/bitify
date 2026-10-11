import { describe, it, expect } from 'vitest';
import { palettePreviewColors } from './palette-preview.js';
import { FULL_PRESETS } from './palette-library.js';

const gray = n => '#' + n.toString(16).padStart(2, '0').repeat(3);

describe('palette thumbnail overview', () => {
  it.each([1, 2, 8, 9, 12, 13, 16, 17, 32, 64, 255, 256])('uses at most sixteen original colors in palette order for %i entries', count => {
    const colors = Object.freeze(Array.from({ length: count }, (_, i) => gray(i)));
    const before = [...colors], result = palettePreviewColors(colors);
    expect(result).toHaveLength(Math.min(count, 16));
    expect(new Set(result).size).toBe(result.length);
    expect(result.every(color => colors.includes(color))).toBe(true);
    expect(result.map(color => colors.indexOf(color))).toEqual(result.map(color => colors.indexOf(color)).sort((a, b) => a - b));
    expect(colors).toEqual(before);
    expect(palettePreviewColors(colors)).toEqual(result);
    if (count <= 16) expect(result).toEqual(colors);
  });

  it('covers broad gray range rather than the first sixteen dark shades', () => {
    const result = palettePreviewColors(Array.from({ length: 256 }, (_, i) => gray(i)));
    expect(result).toContain('#000000');
    expect(result).toContain('#ffffff');
    expect(result.some(color => parseInt(color.slice(1, 3), 16) > 96 && parseInt(color.slice(1, 3), 16) < 160)).toBe(true);
  });

  it('retains distant hue groups even when a gray block dominates entry count and naive even samples', () => {
    const colors = [...Array.from({ length: 240 }, (_, i) => gray(i)), '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const result = palettePreviewColors(colors);
    for (const color of colors.slice(240)) expect(result).toContain(color);
  });

  it('uses only published preset entries, leaving every preset untouched', () => {
    for (const preset of FULL_PRESETS) {
      const before = [...preset.colors], result = palettePreviewColors(preset.colors);
      expect(result.every(color => before.includes(color))).toBe(true);
      expect(result).toHaveLength(Math.min(before.length, 16));
      expect(preset.colors).toEqual(before);
    }
  });

  it.each(FULL_PRESETS.filter(preset => ['preset-pico8', 'preset-db16'].includes(preset.id)))('shows all sixteen $name colors in their published order', preset => {
    expect(preset.colors).toHaveLength(16);
    const result = palettePreviewColors(preset.colors);
    expect(result).toEqual(preset.colors);
    expect(result).not.toBe(preset.colors);
  });
});
