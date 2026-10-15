// RESEARCH ONLY. Applies analysis/selection-rule.md and writes blind judge packets.
// Usage: node bench/keep-real-art-study/analysis/select-judges.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), study = path.resolve(here, '..'), root = path.resolve(study, '../..');
const results = JSON.parse(await fs.readFile(path.join(study, 'results/results.json'), 'utf8'));
const manifest = Object.values(JSON.parse(await fs.readFile(path.join(study, 'cohort/manifest.json'), 'utf8')));
// Policy-behaviour clauses in manifest notes would unblind judges; strip them (recorded in judge-selection.json).
const REDACT = /; (current Keep lets faint pixels displace core colours|linear weighting worsens it slightly)/g;
const BGS = ['black', 'white', 'checker', 'colored'], SEED = 20261015, SHARED = 12, MAX_SIDE = 1600;

const unitOf = c => results.units[c.unit];
const isSynth = c => unitOf(c).category === 'synthetic-counterexample';
const sheetOf = c => c.sheet ?? c.duplicateSheetOf;
const eligible = results.cases.filter(sheetOf);
const groupD = (v, regions, bg) => {
  let n = 0, s = 0;
  for (const r of regions) { const m = v.backgrounds[bg][r], k = v.regionPixels[r]; if (m && k) { n += k; s += k * m.oklabRmse ** 2; } }
  return n ? Math.sqrt(s / n) : null;
};
const delta = (c, regions) => BGS.reduce((s, bg) => s + groupD(c.variants.linear, regions, bg) - groupD(c.variants.none, regions, bg), 0) / BGS.length;
const hasPixels = (c, regions) => regions.some(r => c.variants.none.regionPixels[r] > 0);

const picks = new Map(); // sheet -> { caseIds, reasons }
const add = (c, reason) => {
  const s = sheetOf(c), p = picks.get(s) ?? { sheet: s, cases: [], reasons: [] };
  if (!p.cases.includes(c.caseId)) p.cases.push(c.caseId);
  if (!p.reasons.includes(reason)) p.reasons.push(reason);
  picks.set(s, p);
};
// Rule 1
for (const c of eligible) if (isSynth(c) && !c.wall && ['auto-c3-oklab', 'auto-c4-oklab', 'res64-c4-oklab', 'res64-c4-rgb'].includes(c.setting)) add(c, 'rule1-synthetic');
// Rule 2
for (const c of eligible) if (!isSynth(c) && !c.wall && ['auto-c4-oklab', 'auto-c8-oklab', 'res64-c4-oklab', 'pico8-c4-oklab'].includes(c.setting)) add(c, 'rule2-real-unit');
// Rule 3
const real = eligible.filter(c => !isSynth(c) && !c.pairsIdentical.noneLinear);
for (const [name, G] of [['opaque+strong', ['opaque', 'strong']], ['soft+faint', ['soft', 'faint']]]) {
  real.filter(c => hasPixels(c, G)).map(c => ({ c, d: delta(c, G) }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d) || a.c.caseId.localeCompare(b.c.caseId))
    .slice(0, 8).forEach(({ c }) => add(c, `rule3-extreme-${name}`));
}
// Rule 4
const bestWall = new Map();
for (const c of real.filter(c => c.setting === 'wall-auto-c4-oklab')) {
  const d = Math.abs(delta(c, ['all'])), cat = unitOf(c).category, prev = bestWall.get(cat);
  if (!prev || d > prev.d || d === prev.d && c.caseId < prev.c.caseId) bestWall.set(cat, { c, d });
}
[...bestWall.entries()].sort((a, b) => b[1].d - a[1].d || a[0].localeCompare(b[0])).slice(0, 4).forEach(([, { c }]) => add(c, 'rule4-wall'));

// Packets
let t = SEED >>> 0;
const rand = () => { t = (t + 0x6D2B79F5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const all = shuffle([...picks.values()].sort((a, b) => a.sheet.localeCompare(b.sheet)));
const shared = all.slice(0, SHARED), A = [...shared], B = [...shared];
all.slice(SHARED).forEach((p, i) => (i % 2 ? B : A).push(p));
shuffle(A); shuffle(B);

const alphaProfile = unitId => {
  const entries = manifest.filter(e => e.id === unitId || e.animation?.group === unitId), sum = {};
  for (const e of entries) for (const [k, v] of Object.entries(e.alphaStats)) if (typeof v === 'number' && k !== 'partialFraction') sum[k] = (sum[k] ?? 0) + v;
  const nz = sum.nonzero || 1, pct = k => +(100 * sum[k] / nz).toFixed(1);
  return { frames: entries.length, visiblePixels: sum.nonzero, percentOfVisible: { opaque255: pct('a255'), strong128_254: pct('a128_254'), soft16_127: pct('a16_127'), faint1_15: pct('a1_15') }, visibleRgbColors: entries.length > 1 ? `per frame ${Math.min(...entries.map(e => e.alphaStats.visibleRgbColors))}-${Math.max(...entries.map(e => e.alphaStats.visibleRgbColors))}` : sum.visibleRgbColors, notes: [...new Set(entries.map(e => e.notes).filter(Boolean))].join(' ').replace(REDACT, '') };
};
const caseById = new Map(results.cases.map(c => [c.caseId, c]));
const out = path.join(root, '.tmp/keep-judge'), selection = { rule: 'bench/keep-real-art-study/analysis/selection-rule.md', seed: SEED, notesRedaction: String(REDACT), shared: shared.map(p => p.sheet), packets: {} };
await fs.rm(out, { recursive: true, force: true });
for (const [name, list] of [['A', A], ['B', B]]) {
  const dir = path.join(out, name); await fs.mkdir(dir, { recursive: true });
  const index = [];
  for (const [i, p] of list.entries()) {
    const j = `J${String(i + 1).padStart(3, '0')}`, src = path.join(study, 'results', p.sheet), c = caseById.get(p.cases[0]), u = unitOf(c);
    await fs.copyFile(src, path.join(dir, `${j}.png`));
    const meta = await sharp(src).metadata(), side = Math.max(meta.width, meta.height);
    let view = null;
    if (side > MAX_SIDE) {
      const k = Math.ceil(side / MAX_SIDE); view = `${j}-view.png`;
      await sharp(src).resize(Math.floor(meta.width / k), Math.floor(meta.height / k), { kernel: 'nearest' }).png().toFile(path.join(dir, view));
      view = { file: view, note: `nearest-neighbour downscale by ${k} for viewing; ${j}.png is full size (${meta.width}x${meta.height})` };
    }
    const settings = [...new Set(p.cases.map(id => caseById.get(id).setting))];
    const { notes, ...profile } = alphaProfile(u.id);
    index.push({ file: `${j}.png`, view, sheet: path.basename(p.sheet), unitId: u.id, category: u.category, animated: u.animated, setting: settings.length > 1 ? settings : settings[0], sourceAlphaProfile: profile, manifestNotes: notes });
    (selection.packets[name] ??= []).push({ j, sheet: p.sheet, shared: shared.includes(p), cases: p.cases, reasons: p.reasons });
  }
  await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(index, null, 1) + '\n');
}
selection.sheets = [...picks.values()].sort((a, b) => a.sheet.localeCompare(b.sheet));
selection.counts = { total: picks.size, shared: shared.length, A: A.length, B: B.length, byReason: Object.fromEntries(['rule1-synthetic', 'rule2-real-unit', 'rule3-extreme-opaque+strong', 'rule3-extreme-soft+faint', 'rule4-wall'].map(r => [r, [...picks.values()].filter(p => p.reasons.includes(r)).length])), firstReason: Object.fromEntries(['rule1-synthetic', 'rule2-real-unit', 'rule3-extreme-opaque+strong', 'rule3-extreme-soft+faint', 'rule4-wall'].map(r => [r, [...picks.values()].filter(p => p.reasons[0] === r).length])) };
await fs.writeFile(path.join(here, 'judge-selection.json'), JSON.stringify(selection, null, 1) + '\n');
await fs.writeFile(path.join(out, 'READY'), `packets A=${A.length} B=${B.length} shared=${shared.length} total=${picks.size}\n`);
console.log(JSON.stringify(selection.counts));
