import { describe, it, expect } from 'vitest';
import { PRESETS, STYLES, isPalette, inOrder, stepStyle, stepPalette } from './presets.js';

const [glow, mono] = PRESETS, rose = PRESETS.at(-1);

describe('stepStyle', () => {
  it('goes to the next and the previous style', () => {
    expect(stepStyle('lines', 1)).toBe(2);
    expect(stepStyle('lines', -1)).toBe(0);
  });
  it('wraps at both ends', () => {
    expect(stepStyle('cutout', -1)).toBe(STYLES.length - 1);
    expect(stepStyle('silhouette', 1)).toBe(0);
  });
});

describe('palettes', () => {
  it('match the current colors either way round', () => {
    expect(isPalette(glow, glow.dark, glow.light)).toBe(true);
    expect(isPalette(glow, glow.light, glow.dark)).toBe(true);
    expect(isPalette(glow, glow.dark, mono.light)).toBe(false);
  });
  it('keep the way round the current colors are', () => {
    expect(inOrder(mono, glow.dark, glow.light)).toEqual([mono.dark, mono.light]);
    expect(inOrder(mono, glow.light, glow.dark)).toEqual([mono.light, mono.dark]);
  });
});

describe('stepPalette', () => {
  it('goes to the next and the previous preset', () => {
    expect(stepPalette(glow.dark, glow.light, 1)).toMatchObject({ palette: mono, at: 1, of: PRESETS.length });
    expect(stepPalette(mono.dark, mono.light, -1).palette).toBe(glow);
  });
  it('wraps at both ends', () => {
    expect(stepPalette(glow.dark, glow.light, -1).palette).toBe(rose);
    expect(stepPalette(rose.dark, rose.light, 1).palette).toBe(glow);
  });
  it('finds the preset when Swap has turned the colors round', () => {
    expect(stepPalette(glow.light, glow.dark, 1).palette).toBe(mono);
  });
  it('keeps the user\'s own colors as a stop after the presets', () => {
    // red is the darker of the two, whichever is the first color
    const away = stepPalette('#00ff00', '#ff0000', 1);
    expect(away.palette).toBe(glow);
    expect(away.custom).toEqual({ name: 'Custom', dark: '#ff0000', light: '#00ff00' });
    expect(away.of).toBe(PRESETS.length + 1);

    const back = stepPalette(glow.dark, glow.light, -1, away.custom);
    expect(back.palette).toBe(away.custom);
    expect(back.at).toBe(PRESETS.length);
    expect(stepPalette('#ff0000', '#00ff00', -1, away.custom).palette).toBe(rose);
  });
});
