// User palettes are stored separately from settings. Nothing here stores source images.
export const LIBRARY_KEY = 'bitify-palettes-v1';
export const LIBRARY_LIMIT = 100;
export const LIBRARY_BYTES = 256 * 1024;

export function normalizeColors(colors, limit = 256) {
  if (!Array.isArray(colors) || colors.length > 4096) throw new Error('A palette must contain a list of colors.');
  const result = [], seen = new Set();
  for (let color of colors) {
    if (typeof color !== 'string') throw new Error('Colors must be opaque RGB hex values.');
    color = color.trim();
    if (/^#[\da-f]{3}$/i.test(color)) color = '#' + color.slice(1).split('').map(c => c + c).join('');
    else if (/^[\da-f]{6}$/i.test(color)) color = '#' + color;
    if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Colors must use #RGB or #RRGGBB, without alpha.');
    color = color.toLowerCase();
    if (!seen.has(color)) { seen.add(color); result.push(color); }
  }
  if (!result.length || result.length > limit) throw new Error(`Choose between 1 and ${limit} unique colors.`);
  return result;
}

export function validateName(name) {
  if (typeof name !== 'string') throw new Error('Give this palette a name.');
  const result = name.trim();
  if (!result || [...result].length > 64 || /[\u0000-\u001f\u007f]/.test(result)) throw new Error('Use a name of 1–64 characters.');
  return result;
}

// Suggest once when a new draft opens. Saving never changes a chosen name.
export function newPaletteName(records) {
  const occupied = new Set(records.map(record => record.name.trim().toLowerCase()));
  const base = 'New palette';
  if (!occupied.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (occupied.has(`${base} ${suffix}`.toLowerCase())) suffix++;
  return `${base} ${suffix}`;
}

export function exportHex(colors) { return normalizeColors(colors).join('\n') + '\n'; }

const preset = (id, name, colors, credit, url) => Object.freeze({
  id: 'preset-' + id, name, colors: Object.freeze(normalizeColors(colors.split(' '))), revision: 1,
  source: Object.freeze({ kind: 'preset', credit, ...(url ? { url } : {}) }),
});

// Published RGB sets, preserving their published order. Game Boy green is explicitly
// inspired: the original LCD does not specify one canonical set of RGB values.
export const FULL_PRESETS = Object.freeze([
  preset('pico8', 'PICO-8', '000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa', 'Lexaloffle Games', 'https://www.lexaloffle.com/pico-8.php'),
  preset('db16', 'DawnBringer 16', '140c1c 442434 30346d 4e4a4e 854c30 346524 d04648 757161 597dce d27d2c 8595a1 6daa2c d2aa99 6dc2ca dad45e deeed6', 'DawnBringer', 'https://lospec.com/palette-list/dawnbringer-16'),
  preset('edg32', 'ENDESGA 32', 'be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569', 'ENDESGA', 'https://lospec.com/palette-list/endesga-32'),
  preset('gameboy', 'Game Boy green', '0f380f 306230 8bac0f 9bbc0f', 'Game Boy LCD-inspired RGB interpretation'),
  preset('gray8', 'Grayscale 8', '000000 242424 494949 6d6d6d 929292 b6b6b6 dbdbdb ffffff', 'Bitify: eight evenly spaced sRGB grays'),
]);

function sourceOf(source) {
  const kinds = ['image', 'hex', 'gpl', 'pal', 'custom', 'copy'];
  const kind = kinds.includes(source?.kind) ? source.kind : 'custom';
  // Imported text is never accepted as a link. Attribution is plain text only.
  return { kind, ...(typeof source?.credit === 'string' ? { credit: source.credit.slice(0, 160) } : {}) };
}

function recordOf(value) {
  if (!value || !/^user-[\w-]{1,80}$/.test(value.id) || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('Invalid saved palette.');
  return { id: value.id, name: validateName(value.name), colors: normalizeColors(value.colors), revision: value.revision, source: sourceOf(value.source) };
}

export function restoreLibrary(text) {
  if (typeof text !== 'string' || text.length > LIBRARY_BYTES || new TextEncoder().encode(text).length > LIBRARY_BYTES) return [];
  let parsed;
  try { parsed = JSON.parse(text); } catch { return []; }
  if (parsed?.version !== 1 || !Array.isArray(parsed.palettes) || parsed.palettes.length > LIBRARY_LIMIT) return [];
  const records = [], seen = new Set();
  for (const value of parsed.palettes) {
    try {
      const record = recordOf(value);
      if (!seen.has(record.id)) { seen.add(record.id); records.push(record); }
    } catch { /* One damaged record does not discard the rest of the library. */ }
  }
  return records;
}

export function serializeLibrary(records) {
  if (!Array.isArray(records) || records.length > LIBRARY_LIMIT) throw new Error('You can save up to 100 palettes.');
  const clean = records.map(recordOf);
  if (new Set(clean.map(r => r.id)).size !== clean.length) throw new Error('Duplicate palette ID.');
  const text = JSON.stringify({ version: 1, palettes: clean });
  if (new TextEncoder().encode(text).length > LIBRARY_BYTES) throw new Error('The saved palette library is full. Export a backup and remove a palette.');
  return text;
}

function conflict() {
  const error = new Error('This palette changed in another tab. Reload it or save a copy.');
  error.code = 'PALETTE_CONFLICT';
  return error;
}

// Re-read just before a write to preserve unrelated changes from another tab. Web
// Storage has no transaction/CAS: simultaneous writes remain a platform limitation.
export function savePalette(storage, records, draft, { id, expectedRevision } = {}) {
  const latest = restoreLibrary(storage.getItem(LIBRARY_KEY));
  const previous = id ? latest.find(r => r.id === id) : null;
  if (id && (!previous || previous.revision !== expectedRevision || previous.revision === Number.MAX_SAFE_INTEGER)) throw conflict();
  const newId = id || 'user-' + globalThis.crypto.randomUUID();
  const record = recordOf({ id: newId, name: draft.name, colors: draft.colors, revision: previous ? previous.revision + 1 : 1, source: draft.source });
  const next = previous ? latest.map(r => r.id === id ? record : r) : [...latest, record];
  storage.setItem(LIBRARY_KEY, serializeLibrary(next));
  return { records: next, record };
}

export function deletePalette(storage, records, id, { expectedRevision } = {}) {
  const latest = restoreLibrary(storage.getItem(LIBRARY_KEY)), record = latest.find(r => r.id === id);
  if (!record || record.revision !== expectedRevision) throw conflict();
  const next = latest.filter(r => r.id !== id);
  storage.setItem(LIBRARY_KEY, serializeLibrary(next));
  return next;
}
