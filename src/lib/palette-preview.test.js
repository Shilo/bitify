import { describe, it, expect } from 'vitest';
import { palettePreviewColors, paintPalettePreview, paintPaletteSwatch, paintPalettePair } from './palette-preview.js';
import { PRESETS } from './presets.js';
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

// Deliberately exposes only painting: a readback/encoding/resource API call fails.
function mockCanvas(hasContext = true) {
  const commands = [];
  let fillStyle;
  const context = {
    set fillStyle(color) { fillStyle = color; commands.push(['color', color]); },
    fillRect(...args) { commands.push(['rect', fillStyle, ...args]); },
    beginPath() { commands.push(['begin']); },
    moveTo(...args) { commands.push(['move', ...args]); },
    lineTo(...args) { commands.push(['line', ...args]); },
    arc(...args) { commands.push(['arc', ...args]); },
    closePath() { commands.push(['close']); },
    fill() { commands.push(['fill', fillStyle]); },
  };
  const canvas = {
    set width(value) { commands.push(['width', value]); },
    set height(value) { commands.push(['height', value]); },
    getContext(kind) { commands.push(['context', kind]); return hasContext ? context : null; },
  };
  return { canvas, commands };
}
const fillsOf = commands => commands.filter(command => command[0] === 'color').map(command => command[1]);

describe('color-critical palette canvas painting', () => {
  it.each(PRESETS)('keeps the $name two-ink colors and diagonal orientation without readback', preset => {
    const { canvas, commands } = mockCanvas();
    paintPalettePair(canvas, [preset.dark, preset.light]);
    expect(commands).toEqual([
      ['width', 100], ['height', 100], ['context', '2d'], ['color', preset.light], ['rect', preset.light, 0, 0, 100, 100],
      ['begin'], ['move', 0, 0], ['line', 100, 0], ['line', 0, 100], ['close'], ['color', preset.dark], ['fill', preset.dark],
    ]);
  });

  it('updates two inks atomically and tolerates an unavailable context', () => {
    const { canvas, commands } = mockCanvas();
    const action = paintPalettePair(canvas, ['#000000', '#ffffff']);
    action.update(['#abcdef', '#123456']);
    expect(fillsOf(commands)).toEqual(['#ffffff', '#000000', '#123456', '#abcdef']);
    const before = [...commands];
    for (const value of [null, [], ['#000000'], ['#000000', 'transparent'], ['#000000', '#ffffff', '#123456']]) {
      expect(() => action.update(value)).toThrow(TypeError);
      expect(commands).toEqual(before);
    }
    expect(() => paintPalettePair(mockCanvas(false).canvas, ['#000000', '#ffffff'])).not.toThrow();
  });

  it.each(['#000000', '#ffffff', '#FFF1e8', '#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ffff00', '#ff00ff', '#808080', '#123456', '#abcdef'])('paints exact opaque %s into a single source pixel without interpreting the color', color => {
    const { canvas, commands } = mockCanvas();
    paintPaletteSwatch(canvas, color);
    expect(commands).toEqual([['width', 1], ['height', 1], ['context', '2d'], ['color', color], ['rect', color, 0, 0, 1, 1]]);
  });

  it('updates the same swatch without listeners, image URLs or retained drawing state', () => {
    const { canvas, commands } = mockCanvas();
    const action = paintPaletteSwatch(canvas, '#000000');
    expect(Object.keys(action)).toEqual(['update']);
    action.update('#fff1e8');
    expect(fillsOf(commands)).toEqual(['#000000', '#fff1e8']);
    expect(commands.slice(-5)).toEqual([['width', 1], ['height', 1], ['context', '2d'], ['color', '#fff1e8'], ['rect', '#fff1e8', 0, 0, 1, 1]]);
  });

  it('clears an empty overview and paints a single color without paths', () => {
    const { canvas, commands } = mockCanvas();
    const action = paintPalettePreview(canvas, ['#fff1e8']);
    expect(commands).toEqual([['width', 100], ['height', 100], ['context', '2d'], ['color', '#fff1e8'], ['rect', '#fff1e8', 0, 0, 100, 100]]);
    action.update([]);
    expect(commands.slice(-3)).toEqual([['width', 100], ['height', 100], ['context', '2d']]);
    expect(fillsOf(commands)).toEqual(['#fff1e8']);
  });

  it('retains the former top-starting clockwise two-color split', () => {
    const { canvas, commands } = mockCanvas();
    paintPalettePreview(canvas, ['#000000', '#ffffff']);
    expect(fillsOf(commands)).toEqual(['#000000', '#ffffff']);
    expect(commands.slice(5)).toEqual([['begin'], ['move', 50, 50], ['arc', 50, 50, 50, Math.PI / 2, Math.PI * 1.5, false], ['close'], ['color', '#ffffff'], ['fill', '#ffffff']]);
  });

  it.each(FULL_PRESETS)('paints only $name published colors in the unchanged overview order', preset => {
    const before = [...preset.colors], first = mockCanvas(), second = mockCanvas();
    paintPalettePreview(first.canvas, preset.colors);
    paintPalettePreview(second.canvas, preset.colors);
    expect(fillsOf(first.commands)).toEqual(palettePreviewColors(preset.colors));
    expect(preset.colors).toEqual(before);
    expect(first.commands).toEqual(second.commands);
    expect(first.commands.filter(command => command[0] === 'arc')).toHaveLength(Math.min(16, preset.colors.length) - 1);
  });

  it.each([2, 3, 4, 8, 16, 17, 64, 256])('bounds canvas storage and ordered clockwise geometry for %i entries', count => {
    const colors = Object.freeze(Array.from({ length: count }, (_, i) => gray(i)));
    const { canvas, commands } = mockCanvas();
    paintPalettePreview(canvas, colors);
    const overview = palettePreviewColors(colors), arcs = commands.filter(command => command[0] === 'arc');
    expect(commands.slice(0, 5)).toEqual([['width', 100], ['height', 100], ['context', '2d'], ['color', overview[0]], ['rect', overview[0], 0, 0, 100, 100]]);
    expect(fillsOf(commands)).toEqual(overview);
    expect(arcs.length).toBeLessThanOrEqual(15);
    for (let i = 0; i < arcs.length; i++) {
      const [, x, y, radius, start, end, anticlockwise] = arcs[i];
      expect([x, y, radius]).toEqual([50, 50, 50]);
      expect(start).toBeCloseTo((i + 1) * Math.PI * 2 / overview.length - Math.PI / 2, 12);
      expect(end).toBeCloseTo((i + 2) * Math.PI * 2 / overview.length - Math.PI / 2, 12);
      expect(end - start).toBeGreaterThan(0);
      expect(end - start).toBeLessThanOrEqual(Math.PI);
      expect(anticlockwise).toBe(false);
    }
    expect(commands.filter(command => command[0] === 'begin')).toHaveLength(arcs.length);
    expect(commands.filter(command => command[0] === 'close')).toHaveLength(arcs.length);
    expect(commands.filter(command => command[0] === 'fill')).toHaveLength(arcs.length);
  });

  it.each([null, undefined, 0, '#fff', '#00000000', 'ffffff', 'red', '#ffffff\n', '#fff1e8"/><script>alert(1)</script>', '#fff1e8;url(https://example.com)'])('rejects malformed or interpreted color %j without changing the canvas', color => {
    const { canvas, commands } = mockCanvas();
    expect(() => paintPaletteSwatch(canvas, color)).toThrow(TypeError);
    expect(() => paintPalettePreview(canvas, ['#000000', color])).toThrow(TypeError);
    expect(commands).toEqual([]);
  });

  it('validates hidden overview entries, input bounds and updates before touching previous paint', () => {
    const { canvas, commands } = mockCanvas(), action = paintPalettePreview(canvas, ['#000000']);
    const before = [...commands], colors = Array.from({ length: 256 }, (_, i) => gray(i));
    colors[128] = '#ffffff" onload="alert(1)';
    expect(() => action.update(colors)).toThrow(TypeError);
    expect(() => action.update(Array(257).fill('#000000'))).toThrow(TypeError);
    for (const value of [null, undefined, '#ffffff', {}, new Set(['#ffffff'])]) expect(() => action.update(value)).toThrow(TypeError);
    expect(commands).toEqual(before);
    const swatch = paintPaletteSwatch(canvas, '#ffffff'), swatchBefore = [...commands];
    expect(() => swatch.update('transparent')).toThrow(TypeError);
    expect(commands).toEqual(swatchBefore);
  });

  it('tolerates an unavailable painting context without attempting another rendering path', () => {
    const { canvas, commands } = mockCanvas(false);
    expect(() => paintPaletteSwatch(canvas, '#ffffff')).not.toThrow();
    expect(() => paintPalettePreview(canvas, ['#000000', '#ffffff'])).not.toThrow();
    expect(fillsOf(commands)).toEqual([]);
  });
});
