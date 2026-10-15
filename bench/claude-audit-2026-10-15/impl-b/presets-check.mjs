// Impl-B audit: preset invariants with an independent expectation list.
// Run: node bench/claude-audit-2026-10-15/impl-b/presets-check.mjs
const { FULL_PRESETS, GENERATED_PALETTE_ID, DEFAULT_FULL_PALETTE } = await import(new URL('../../../src/lib/palette-library.js', import.meta.url));
const expectOrder = ['Resurrect 64','ENDESGA 32','PICO-8','DawnBringer 16','ENDESGA 8','Grayscale 8','Ice Cream GB','Game Boy green','Black & white','Glow','Paper'];
const ids = FULL_PRESETS.map(p => p.id);
// Distinctness between presets: no two presets share the same color SET.
const sets = FULL_PRESETS.map(p => [...p.colors].sort().join());
// Minimum pairwise sRGB distance within ENDESGA 8 / B&W (sanity, not taste).
const d = (a, b) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.hypot((x >> 16) - (y >> 16), (x >> 8 & 255) - (y >> 8 & 255), (x & 255) - (y & 255)); };
const minD = p => { let m = Infinity; for (let i = 0; i < p.colors.length; i++) for (let j = i + 1; j < p.colors.length; j++) m = Math.min(m, d(p.colors[i], p.colors[j])); return Math.round(m); };
const counts = FULL_PRESETS.map(p => p.colors.length);
console.log(JSON.stringify({
  orderMatchesClaude: JSON.stringify(FULL_PRESETS.map(p => p.name)) === JSON.stringify(expectOrder),
  idsUnique: new Set(ids).size === ids.length, noGeneratedCollision: !ids.includes(GENERATED_PALETTE_ID), idsPrefixed: ids.every(i => /^preset-[a-z0-9]+$/.test(i)),
  colorSetsDistinct: new Set(sets).size === sets.length, nonIncreasingCounts: counts.every((c, i) => !i || c <= counts[i - 1]), counts,
  frozen: Object.isFrozen(FULL_PRESETS) && FULL_PRESETS.every(p => Object.isFrozen(p) && Object.isFrozen(p.colors)),
  bw: FULL_PRESETS.find(p => p.id === 'preset-mono').colors, minDistance: Object.fromEntries(FULL_PRESETS.map(p => [p.id, minD(p)])),
  default: DEFAULT_FULL_PALETTE.id,
}, null, 1));
