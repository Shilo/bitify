import { describe, it, expect } from 'vitest';
import { restore, DEFAULTS } from './settings.js';

const styles = ['cutout', 'lines', 'solid'];

describe('restore', () => {
  it('gives back what was stored', () => {
    const saved = { first: '#f0f6f0', second: '#222323', style: 'lines', threshold: 90 };
    expect(restore(JSON.stringify(saved), styles)).toEqual(saved);
    expect(restore(JSON.stringify({ ...saved, threshold: null }), styles).threshold).toBe(null);
  });

  it('falls back to the defaults when nothing usable is stored', () => {
    for (const text of [null, '', 'not json', 'null', '7', '[]']) expect(restore(text, styles)).toEqual(DEFAULTS);
  });

  it('replaces only the values it cannot use', () => {
    const text = JSON.stringify({ first: 'red', second: '#ABCDEF', style: 'gone', threshold: 255 });
    expect(restore(text, styles)).toEqual({ ...DEFAULTS, second: '#ABCDEF' });
    expect(restore(JSON.stringify({ threshold: 12.5 }), styles).threshold).toBe(null);
    expect(restore(JSON.stringify({ threshold: '90' }), styles).threshold).toBe(null);
  });
});
