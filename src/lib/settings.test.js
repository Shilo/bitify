import { describe, it, expect } from 'vitest';
import { restore, DEFAULTS, SETTINGS, STYLE_SETTINGS, defaults, changed, allowed, shown } from './settings.js';

const styles = Object.keys(STYLE_SETTINGS);

describe('the settings of a style', () => {
  it('gives every style a known list of settings, with the threshold first where there is one', () => {
    expect(styles).toEqual(['cutout', 'solid', 'lines', 'checker', 'hatch', 'bayer', 'noise', 'atkinson', 'silhouette']);
    for (const [style, keys] of Object.entries(STYLE_SETTINGS)) {
      for (const key of keys) expect(SETTINGS[key], `${style} ${key}`).toBeDefined();
      if (keys.includes('threshold')) expect(keys[0]).toBe('threshold');
    }
    expect(STYLE_SETTINGS.silhouette).toEqual(['alpha']);
  });

  it('starts every setting at a value it allows', () => {
    for (const key of Object.keys(SETTINGS)) expect(allowed(key, SETTINGS[key].default), key).toBe(true);
    expect(defaults('cutout')).toEqual({ threshold: null, seams: null, rim: true, source: 'luma', alpha: 128 });
  });

  it('allows a choice only from its options, and a number only whole and in range', () => {
    expect(allowed('direction', '\\')).toBe(true);
    expect(allowed('direction', 'x')).toBe(false);
    expect(allowed('scale', 2)).toBe(true);
    expect(allowed('scale', '2')).toBe(false);
    expect(allowed('rim', false)).toBe(true);
    expect(allowed('rim', 0)).toBe(false);
    expect(allowed('threshold', null)).toBe(true);
    expect(allowed('threshold', 255)).toBe(false);
    expect(allowed('seams', 255)).toBe(true);
    expect(allowed('alpha', null)).toBe(false); // no Auto for this one
    expect(allowed('darks', 0)).toBe(true);
    expect(allowed('shading', 12.5)).toBe(false);
    expect(allowed('shading', undefined)).toBe(false);
  });

  it('tells when a style has left its defaults, in all its settings or in some', () => {
    const own = { ...defaults('hatch'), threshold: 90 };
    expect(changed('hatch', defaults('hatch'))).toBe(false);
    expect(changed('hatch', own)).toBe(true);
    expect(changed('hatch', own, ['shading', 'scale'])).toBe(false);
  });

  it('shows a value as text', () => {
    expect(shown('threshold', null)).toBe('Auto');
    expect(shown('threshold', 90)).toBe('90');
    expect(shown('shading', 60)).toBe('60%');
    expect(shown('darks', 0)).toBe('Off');
    expect(shown('darks', 40)).toBe('40');
    expect(shown('rim', false)).toBe('Off');
    expect(shown('direction', '-')).toBe('—');
    expect(shown('source', 'red')).toBe('R');
    // a sign is read out as a word; anything else as it is shown
    expect(['/', '\\', '-', '|'].map(v => shown('direction', v, true))).toEqual(['Rising', 'Falling', 'Level', 'Upright']);
    expect(shown('source', 'red', true)).toBe('R');
    expect(shown('threshold', null, true)).toBe('Auto');
    expect(shown('shading', 60, true)).toBe('60%');
  });
});

describe('restore', () => {
  it('gives back what was stored', () => {
    const settings = { ...DEFAULTS.settings, lines: { threshold: 90, thickness: 2, darks: 40, alpha: 200 }, hatch: { ...defaults('hatch'), direction: '\\', spacing: 5, scale: 3, shading: 60, source: 'value' } };
    const saved = { first: '#f0f6f0', second: '#222323', style: 'lines', settings };
    expect(restore(JSON.stringify(saved), styles)).toEqual(saved);
    expect(restore(JSON.stringify({ ...saved, theme: 'light' }), styles)).toEqual({ ...saved, theme: 'light' });
  });

  it('falls back to the defaults when nothing usable is stored', () => {
    for (const text of [null, '', 'not json', 'null', '7', '[]']) expect(restore(text, styles)).toEqual(DEFAULTS);
  });

  it('replaces only the values it cannot use', () => {
    const text = JSON.stringify({ first: 'red', second: '#ABCDEF', style: 'gone', settings: { cutout: { threshold: 255, seams: 40, rim: 'yes' }, lines: 7, nosuch: { threshold: 3 } } });
    expect(restore(text, styles)).toEqual({ ...DEFAULTS, second: '#ABCDEF', settings: { ...DEFAULTS.settings, cutout: { ...defaults('cutout'), seams: 40 } } });
    expect(restore(JSON.stringify({ theme: 'dark' }), styles).theme).toBe('dark');
    expect(restore(JSON.stringify({ theme: 'blue' }), styles).theme).toBe(undefined);
  });

  it('starts each style from its defaults when what was stored is from before styles had settings', () => {
    expect(restore(JSON.stringify({ first: '#000000', second: '#ffffff', style: 'bayer', threshold: 90 }), styles)).toEqual({ ...DEFAULTS, first: '#000000', second: '#ffffff', style: 'bayer' });
  });

  it('never hands out the defaults themselves, which the app goes on to change', () => {
    const a = restore(null, styles);
    a.settings.cutout.threshold = 5;
    expect(restore(null, styles).settings.cutout.threshold).toBe(null);
    expect(DEFAULTS.settings.cutout.threshold).toBe(null);
  });
});
