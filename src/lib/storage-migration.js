// Read current records first; old keys remain read-only aliases for existing installs.
const legacyKeys = { colorfetti: 'bitify', 'colorfetti-palettes-v1': 'bitify-palettes-v1' };
export function readStoredValue(storage, key) {
  const current = storage.getItem(key);
  if (current !== null) return current;
  const previous = legacyKeys[key] ? storage.getItem(legacyKeys[key]) : null;
  if (previous !== null) {
    try { storage.setItem(key, previous); } catch { /* Existing data remains readable when writes are refused. */ }
  }
  return previous;
}
