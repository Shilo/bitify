import { describe, it, expect } from 'vitest';
import { FULL_PRESETS, LIBRARY_KEY, normalizeColors, validateName, customPaletteName, restoreLibrary, serializeLibrary, savePalette, deletePalette, exportHex } from './palette-library.js';

function storage(initial = []) {
  const map = new Map([[LIBRARY_KEY, serializeLibrary(initial)], ['unrelated', 'keep']]);
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
}
const record = (id = 'user-one', revision = 1) => ({ id, name: 'Mine', colors: ['#aabbcc'], revision, source: { kind: 'hex' } });

describe('palette library', () => {
  it('normalizes opaque colors with stable duplicate removal and HEX round-trip contents', () => {
    expect(normalizeColors([' #ABC ', '#aabbcc', 'ffffff', '#000'])).toEqual(['#aabbcc', '#ffffff', '#000000']);
    expect(exportHex(['#abc', '#ABC', '#000'])).toBe('#aabbcc\n#000000\n');
    for (const colors of [[], ['rgb(1,2,3)'], ['#fff8'], ['#12345678'], [3], [null]]) expect(() => normalizeColors(colors)).toThrow();
  });

  it('allows 64 Unicode characters and rejects blank/control/overlong names', () => {
    expect(validateName(' 😀 ')).toBe('😀');
    expect(validateName('😀'.repeat(64))).toBe('😀'.repeat(64));
    for (const name of [' ', 'in\nside', 'a'.repeat(65), 'a\u0000b']) expect(() => validateName(name)).toThrow();
  });

  it('suggests the plain custom name when free, independently of numbered names', () => {
    expect(customPaletteName([])).toBe('Custom palette');
    expect(customPaletteName([{ name: 'Custom palette 2' }, { name: 'Custom palette 3' }])).toBe('Custom palette');
  });

  it('finds the first free suffix using trimmed case-insensitive saved and session names', () => {
    const records = [{ id: 'user-one', name: ' CUSTOM PALETTE ' }, { id: 'session-two', name: 'custom Palette 2' }, { id: 'user-four', name: 'Custom palette 4' }];
    const previous = structuredClone(records);
    expect(customPaletteName(records)).toBe('Custom palette 3');
    expect(records).toEqual(previous);
    expect(customPaletteName([...records, { name: 'custom palette 3' }])).toBe('Custom palette 5');
  });

  it('keeps the suggestion valid when all 100 library slots have consecutive names', () => {
    const records = Array.from({ length: 100 }, (_, i) => ({ name: i ? `Custom palette ${i + 1}` : 'Custom palette' }));
    expect(customPaletteName(records)).toBe('Custom palette 101');
    expect(validateName(customPaletteName(records))).toBe('Custom palette 101');
  });

  it('provides immutable presets with vetted counts, provenance and distinct normalized colors', () => {
    expect(FULL_PRESETS.map(p => p.colors.length)).toEqual([16, 16, 32, 4, 8]);
    expect(FULL_PRESETS[2].colors[0]).toBe('#be4a2f');
    for (const preset of FULL_PRESETS) {
      expect(preset.source.credit).toBeTruthy();
      expect(new Set(preset.colors).size).toBe(preset.colors.length);
      expect(Object.isFrozen(preset.colors)).toBe(true);
    }
    expect(() => { FULL_PRESETS[0].colors.push('#123456'); }).toThrow();
  });

  it('restores valid records independently of damaged or duplicate records', () => {
    const text = JSON.stringify({ version: 1, palettes: [record(), { ...record('user-bad'), colors: ['#12'] }, { ...record('user-two'), name: '<script>alert(1)</script>', source: { kind: 'image', url: 'javascript:bad', credit: 'plain' } }, record()] });
    const restored = restoreLibrary(text);
    expect(restored.map(r => r.id)).toEqual(['user-one', 'user-two']);
    expect(restored[1].source).toEqual({ kind: 'image', credit: 'plain' });
    for (const malformed of [null, '{', '{}', JSON.stringify({ version: 2, palettes: [record()] }), 'x'.repeat(262145)]) expect(restoreLibrary(malformed)).toEqual([]);
  });

  it('writes only after validation and returns persisted revisions while retaining unrelated records', () => {
    const store = storage([record()]);
    const added = savePalette(store, [], { name: 'New', colors: ['#000'], source: { kind: 'image' } });
    expect(added.records).toHaveLength(2);
    expect(added.record.id.startsWith('user-')).toBe(true);
    const edited = savePalette(store, [], { name: 'Edit', colors: ['#fff'] }, { id: 'user-one', expectedRevision: 1 });
    expect(edited.record.revision).toBe(2);
    expect(restoreLibrary(store.getItem(LIBRARY_KEY))).toEqual(edited.records);
    expect(store.getItem('unrelated')).toBe('keep');
  });

  it('detects changed/deleted revisions before Save/Delete and allows a new copy', () => {
    const store = storage([record('user-one', 2)]), draft = { name: 'Draft', colors: ['#fff'] };
    expect(() => savePalette(store, [record()], draft, { id: 'user-one', expectedRevision: 1 })).toThrow(/another tab/);
    try { deletePalette(store, [], 'user-one', { expectedRevision: 1 }); } catch (error) { expect(error.code).toBe('PALETTE_CONFLICT'); }
    expect(savePalette(store, [], draft).records).toHaveLength(2);
    expect(deletePalette(store, [], 'user-one', { expectedRevision: 2 })).toHaveLength(1);
    expect(() => savePalette(store, [], draft, { id: 'user-one', expectedRevision: 2 })).toThrow(/another tab/);
  });

  it('propagates blocked/quota storage failures without mutating the caller or previous data', () => {
    const previous = [record()], store = storage(previous), old = store.getItem(LIBRARY_KEY);
    store.setItem = () => { throw new Error('quota'); };
    expect(() => savePalette(store, previous, { name: 'Copy', colors: ['#fff'] })).toThrow('quota');
    expect(() => deletePalette(store, previous, 'user-one', { expectedRevision: 1 })).toThrow('quota');
    expect(store.getItem(LIBRARY_KEY)).toBe(old);
    expect(previous).toEqual([record()]);
    expect(() => savePalette({ getItem: () => { throw new Error('blocked'); } }, previous, { name: 'Copy', colors: ['#fff'] })).toThrow('blocked');
  });

  it('caps count and serialized UTF-8 size before storage writes', () => {
    const records = Array.from({ length: 100 }, (_, i) => ({ ...record('user-' + i), name: '😀'.repeat(64), colors: Array.from({ length: 256 }, (_, j) => '#' + j.toString(16).padStart(6, '0')) }));
    expect(() => serializeLibrary([...records, record('user-last')])).toThrow(/100/);
    expect(() => serializeLibrary(records)).toThrow(/full/);
  });
});
