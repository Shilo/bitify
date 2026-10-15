// User palettes are stored separately from settings. Nothing here stores source images.
import { readStoredValue } from './storage-migration.js';
import { canonicalLospecUrl } from './palette-lospec-url.js';
export const LIBRARY_KEY = 'colorfetti-palettes-v1';
export const LIBRARY_LIMIT = 100;
export const LIBRARY_BYTES = 256 * 1024;
export const GENERATED_MAX_COLORS = 64;

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
  preset('res64', 'Resurrect 64', '2e222f 3e3546 625565 966c6c ab947a 694f62 7f708a 9babb2 c7dcd0 ffffff 6e2727 b33831 ea4f36 f57d4a ae2334 e83b3b fb6b1d f79617 f9c22b 7a3045 9e4539 cd683d e6904e fbb954 4c3e24 676633 a2a947 d5e04b fbff86 165a4c 239063 1ebc73 91db69 cddf6c 313638 374e4a 547e64 92a984 b2ba90 0b5e65 0b8a8f 0eaf9b 30e1b9 8ff8e2 323353 484a77 4d65b4 4d9be6 8fd3ff 45293f 6b3e75 905ea9 a884f3 eaaded 753c54 a24b6f cf657f ed8099 831c5d c32454 f04f78 f68181 fca790 fdcbb0', 'Kerrie Lake', 'https://lospec.com/palette-list/resurrect-64'),
  preset('edg32', 'ENDESGA 32', 'be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569', 'ENDESGA', 'https://lospec.com/palette-list/endesga-32'),
  preset('pico8', 'PICO-8', '000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa', 'Lexaloffle Games', 'https://www.lexaloffle.com/pico-8.php'),
  preset('db16', 'DawnBringer 16', '140c1c 442434 30346d 4e4a4e 854c30 346524 d04648 757161 597dce d27d2c 8595a1 6daa2c d2aa99 6dc2ca dad45e deeed6', 'DawnBringer', 'https://lospec.com/palette-list/dawnbringer-16'),
  preset('edg8', 'ENDESGA 8', 'fdfdf8 d32734 da7d22 e6da29 28c641 2d93dd 7b53ad 1b1c33', 'ENDESGA', 'https://lospec.com/palette-list/endesga-8'),
  preset('gray8', 'Grayscale 8', '000000 242424 494949 6d6d6d 929292 b6b6b6 dbdbdb ffffff', 'Colorfetti: eight evenly spaced sRGB grays'),
  preset('icecreamgb', 'Ice Cream GB', '7c3f58 eb6b6f f9a875 fff6d3', 'Kerrie Lake', 'https://lospec.com/palette-list/ice-cream-gb'),
  preset('gameboy', 'Game Boy green', '0f380f 306230 8bac0f 9bbc0f', 'Game Boy LCD-inspired RGB interpretation'),
  preset('mono', 'Black & white', '000000 ffffff', 'Opaque sRGB black and white'),
  preset('glow', 'Glow', '222323 f0f6f0', 'Polyducks', 'https://lospec.com/palette-list/1bit-monitor-glow'),
  preset('paper', 'Paper', '382b26 b8c2b9', 'Doph', 'https://lospec.com/palette-list/paperback-2'),
]);

// Curated fallback for existing missing/deleted selections. Fresh visits use Generated.
export const DEFAULT_FULL_PALETTE = FULL_PRESETS.find(p => p.id === 'preset-edg32');
export const GENERATED_PALETTE_ID = 'generated-32';
export const GENERATED_PALETTE = Object.freeze({ id: GENERATED_PALETTE_ID, name: 'Auto',
  colors: Object.freeze([]), revision: 1, source: Object.freeze({ kind: 'generated',
    credit: 'Shared colors from all images; updates when images change.' }) });

function sourceOf(source) {
  const kinds = ['image', 'hex', 'gpl', 'pal', 'aseprite', 'custom', 'copy', 'lospec'];
  const kind = kinds.includes(source?.kind) ? source.kind : 'custom';
  // Only a validated Lospec palette page is retained as an imported source link.
  const url = kind === 'lospec' ? canonicalLospecUrl(source?.url) : null;
  return { kind: kind === 'lospec' && !url ? 'custom' : kind,
    ...(url ? { url } : {}), ...(typeof source?.credit === 'string' ? { credit: source.credit.slice(0, 160) } : {}) };
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
  const latest = restoreLibrary(readStoredValue(storage, LIBRARY_KEY));
  const previous = id ? latest.find(r => r.id === id) : null;
  if (id && (!previous || previous.revision !== expectedRevision || previous.revision === Number.MAX_SAFE_INTEGER)) throw conflict();
  const newId = id || 'user-' + globalThis.crypto.randomUUID();
  const record = recordOf({ id: newId, name: draft.name, colors: draft.colors, revision: previous ? previous.revision + 1 : 1, source: draft.source });
  const next = previous ? latest.map(r => r.id === id ? record : r) : [...latest, record];
  storage.setItem(LIBRARY_KEY, serializeLibrary(next));
  return { records: next, record };
}

export function deletePalette(storage, records, id, { expectedRevision } = {}) {
  const latest = restoreLibrary(readStoredValue(storage, LIBRARY_KEY)), record = latest.find(r => r.id === id);
  if (!record || record.revision !== expectedRevision) throw conflict();
  const next = latest.filter(r => r.id !== id);
  storage.setItem(LIBRARY_KEY, serializeLibrary(next));
  return next;
}
