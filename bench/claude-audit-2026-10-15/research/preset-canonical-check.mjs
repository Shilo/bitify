// Compare production FULL_PRESETS against Lospec JSON snapshots fetched 2026-10-15 (exact RGB and order).
import fs from 'node:fs';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
const dir = new URL('./lospec-fetch-2026-10-15/', import.meta.url);
const map = { 'preset-res64': 'resurrect-64', 'preset-edg32': 'endesga-32', 'preset-pico8': 'pico-8', 'preset-db16': 'dawnbringer-16', 'preset-edg8': 'endesga-8', 'preset-icecreamgb': 'ice-cream-gb' };
const out = [];
for (const [id, slug] of Object.entries(map)) {
  const j = JSON.parse(fs.readFileSync(new URL(slug + '.json', dir), 'utf8'));
  const lospec = j.colors.map(c => '#' + c.toLowerCase());
  const prod = FULL_PRESETS.find(p => p.id === id).colors.map(c => c.toLowerCase());
  const sameSet = lospec.length === prod.length && lospec.every(c => prod.includes(c));
  const sameOrder = sameSet && lospec.every((c, i) => prod[i] === c);
  out.push({ id, slug, lospecName: j.name, author: j.author, count: lospec.length, prodCount: prod.length, sameSet, sameOrder,
    missing: lospec.filter(c => !prod.includes(c)), extra: prod.filter(c => !lospec.includes(c)) });
}
// Grayscale 8 should be round(i*255/7).
const g = FULL_PRESETS.find(p => p.id === 'preset-gray8').colors.map(c => c.toLowerCase());
out.push({ id: 'preset-gray8', expected: 'round(i*255/7)', ok: g.every((c, i) => c === '#' + Math.round(i * 255 / 7).toString(16).padStart(2, '0').repeat(3)) });
// Distinctness: no two presets identical as sets.
const sets = FULL_PRESETS.map(p => [p.id, [...p.colors].map(c => c.toLowerCase()).sort().join()]);
out.push({ duplicatePresetSets: sets.filter((a, i) => sets.findIndex(b => b[1] === a[1]) !== i).map(a => a[0]) });
fs.writeFileSync(new URL('./preset-canonical-check.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
