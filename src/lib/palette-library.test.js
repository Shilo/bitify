import { describe, it, expect } from 'vitest';
import { FULL_PRESETS, DEFAULT_FULL_PALETTE, LIBRARY_KEY, normalizeColors, validateName, newPaletteName, restoreLibrary, serializeLibrary, savePalette, deletePalette, exportHex } from './palette-library.js';

function storage(initial = []) {
  const map = new Map([[LIBRARY_KEY, serializeLibrary(initial)], ['unrelated', 'keep']]);
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
}
const record = (id = 'user-one', revision = 1) => ({ id, name: 'Mine', colors: ['#aabbcc'], revision, source: { kind: 'hex' } });

describe('palette library', () => {
  it('preserves Aseprite source attribution through saving and restoration', () => {
    const input = { ...record(), source: { kind: 'aseprite' } };
    expect(restoreLibrary(serializeLibrary([input]))[0].source).toEqual({ kind: 'aseprite' });
  });
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

  it('suggests the plain new name when free, independently of numbered names', () => {
    expect(newPaletteName([])).toBe('New palette');
    expect(newPaletteName([{ name: 'New palette 2' }, { name: 'New palette 3' }, { name: 'Custom palette' }])).toBe('New palette');
  });

  it('finds the first free suffix using trimmed case-insensitive saved and session names', () => {
    const records = [{ id: 'user-one', name: ' NEW PALETTE ' }, { id: 'session-two', name: 'new Palette 2' }, { id: 'user-four', name: 'New palette 4' }];
    const previous = structuredClone(records);
    expect(newPaletteName(records)).toBe('New palette 3');
    expect(records).toEqual(previous);
    expect(newPaletteName([...records, { name: 'new palette 3' }])).toBe('New palette 5');
  });

  it('keeps the suggestion valid when all 100 library slots have consecutive names', () => {
    const records = Array.from({ length: 100 }, (_, i) => ({ name: i ? `New palette ${i + 1}` : 'New palette' }));
    expect(newPaletteName(records)).toBe('New palette 101');
    expect(validateName(newPaletteName(records))).toBe('New palette 101');
  });

  it('provides immutable presets with vetted counts, provenance and distinct normalized colors', () => {
    expect(FULL_PRESETS.map(p => p.colors.length)).toEqual([64, 32, 32, 16, 16, 8, 8, 4, 4, 2, 2, 2]);
    expect(FULL_PRESETS.map(p => p.id)).toEqual(['preset-res64', 'preset-edg32', 'preset-mulfok32', 'preset-pico8', 'preset-db16', 'preset-edg8', 'preset-gray8', 'preset-icecreamgb', 'preset-gameboy', 'preset-mono', 'preset-glow', 'preset-paper']);
    expect(DEFAULT_FULL_PALETTE.id).toBe('preset-edg32');
    expect(FULL_PRESETS[1].colors[0]).toBe('#be4a2f');
    expect(FULL_PRESETS[0].colors.at(-1)).toBe('#fdcbb0');
    expect(FULL_PRESETS.find(p => p.id === 'preset-icecreamgb').colors).toEqual(['#7c3f58', '#eb6b6f', '#f9a875', '#fff6d3']);
    expect(FULL_PRESETS.find(p => p.id === 'preset-glow').colors).toEqual(['#222323', '#f0f6f0']);
    expect(FULL_PRESETS.find(p => p.id === 'preset-paper').colors).toEqual(['#382b26', '#b8c2b9']);
    const eight = FULL_PRESETS.find(p => p.id === 'preset-edg8');
    expect(eight.colors).toEqual(['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33']);
    expect(eight.source).toEqual({ kind: 'preset', credit: 'ENDESGA', url: 'https://lospec.com/palette-list/endesga-8' });
    expect(FULL_PRESETS.find(p => p.id === 'preset-mono').colors).toEqual(['#000000', '#ffffff']);
    for (const preset of FULL_PRESETS) {
      expect(preset.source.credit).toBeTruthy();
      expect(new Set(preset.colors).size).toBe(preset.colors.length);
      expect(Object.isFrozen(preset.colors)).toBe(true);
    }
    expect(() => { FULL_PRESETS[0].colors.push('#123456'); }).toThrow();
  });

  it('preserves mulfok32 canonical RGB order and creator attribution', () => {
    const pastel = FULL_PRESETS.find(p => p.id === 'preset-mulfok32');
    expect(pastel.name).toBe('Mulfok 32');
    expect(pastel.colors).toEqual('5ba675 6bc96c abdd64 fcef8d ffb879 ea6262 cc425e a32858 751756 390947 611851 873555 a6555f c97373 f2ae99 ffc3f2 ee8fcb d46eb3 873e84 1f102a 4a3052 7b5480 a6859f d9bdc8 ffffff aee2ff 8db7ff 6d80fa 8465ec 834dc4 7d2da0 4e187c'.split(' ').map(c => '#' + c));
    expect(pastel.source).toEqual({ kind: 'preset', credit: 'mulfok', url: 'https://lospec.com/palette-list/mulfok32' });
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
