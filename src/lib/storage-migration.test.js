import { describe, expect, it } from 'vitest';
import { readStoredValue } from './storage-migration.js';
const storage = entries => {
  const values = new Map(entries);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
describe('brand storage migration', () => {
  it.each([['colorfetti', 'bitify'], ['colorfetti-palettes-v1', 'bitify-palettes-v1']])('preserves %s records byte for byte', (key, legacy) => {
    const raw = '{"existing":"selection"}', store = storage([[legacy, raw]]);
    expect(readStoredValue(store, key)).toBe(raw);
    expect(store.getItem(key)).toBe(raw);
    expect(store.getItem(legacy)).toBe(raw);
  });
  it('keeps current selections and an explicitly cleared library authoritative', () => {
    const store = storage([['colorfetti', 'current'], ['bitify', 'old'], ['colorfetti-palettes-v1', '[]'], ['bitify-palettes-v1', '["old"]']]);
    expect(readStoredValue(store, 'colorfetti')).toBe('current');
    expect(readStoredValue(store, 'colorfetti-palettes-v1')).toBe('[]');
  });
  it('reads existing data when migration writes are refused', () => {
    const store = storage([['bitify', 'existing']]);
    store.setItem = () => { throw new Error('blocked'); };
    expect(readStoredValue(store, 'colorfetti')).toBe('existing');
  });
  it('returns missing data and lets callers handle read failures', () => {
    expect(readStoredValue(storage([]), 'colorfetti')).toBeNull();
    expect(() => readStoredValue({ getItem() { throw new Error('blocked'); } }, 'colorfetti')).toThrow('blocked');
  });
});
