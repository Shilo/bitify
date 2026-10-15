// RESEARCH ONLY. Validates evaluate.mjs on the existing SYNTHETIC fixtures only
// (never the real-art cohort). Writes everything under $TEMP/keep-real-art-validation.
// Usage: node bench/keep-real-art-study/validate.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { heldOutFixtures } from '../keep-alpha-weighting-review/fixtures.mjs';
import { fixtures as spikeFixtures } from '../keep-alpha-weighting-spike/experiment.mjs';

const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(os.tmpdir(), 'keep-real-art-validation');
await fs.rm(dir, { recursive: true, force: true }); await fs.mkdir(path.join(dir, 'cohort'), { recursive: true });

const held = Object.fromEntries(heldOutFixtures().map(f => [f.name, f.original])), spike = Object.fromEntries((await spikeFixtures()).map(f => [f.name, f.items[0].original ?? f.items[0]]));
const glow = spike['warm-glow'], faintGlow = { ...glow, data: glow.data.map((v, i) => i % 4 === 3 ? Math.round(v * .2) : v) };
const assets = [
  ['faint-green-spill', 'spill', held['faint-green-spill']],
  ['magenta-alpha1-spill', 'spill', spike['opaque-core-alpha1-spill']],
  ['intentional-cyan-halo', 'halo', held['intentional-cyan-halo']],
  ['many-soft-colors', 'soft', spike['many-soft-colors']],
  ['binary-opaque-control', 'soft', held['binary-opaque-control']],
  ['glow-f0', 'anim', glow, { group: 'warm-glow-fade', frame: 0, duration: 20 }],
  ['glow-f1', 'anim', faintGlow, { group: 'warm-glow-fade', frame: 1, duration: 180 }],
];
const manifest = { note: 'Synthetic validation fixtures only (not real art).', assets: [] };
for (const [id, category, img, animation] of assets) {
  const file = `cohort/${id}.png`;
  await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toFile(path.join(dir, file));
  manifest.assets.push({ id, category, file, w: img.width, h: img.height, ...(animation ? { animation } : {}) });
}
await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const out = path.join(dir, 'results'), key = path.join(dir, 'blind-key.json'), node = process.execPath, evaluate = path.join(here, 'evaluate.mjs');
execFileSync(node, [evaluate, path.join(dir, 'manifest.json'), '--out', out, '--key', key], { stdio: 'inherit' });
const results = JSON.parse(await fs.readFile(path.join(out, 'results.json'), 'utf8'));

const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: !!pass, detail }); };
const find = (unit, setting) => results.cases.find(c => c.unitId === unit && c.setting === setting);
const m = (c, v, region, bg = 'black', k = 'srgb8Rmse') => c.variants[v].backgrounds[bg][region]?.[k];

check('control: production == none in every render', results.controlFailures.length === 0, results.controlFailures);
check('keep variants preserve every alpha byte', results.cases.every(c => ['none', 'linear', 'squared'].every(p => c.variants[p].empty || c.variants[p].alphaMismatch === 0)));
check('cut128 reference removes soft alpha where present', find('intentional-cyan-halo', 'auto-c3-oklab').variants.cut128.alphaMismatch > 0);
for (const unit of ['faint-green-spill', 'magenta-alpha1-spill']) {
  const c = find(unit, 'auto-c3-oklab');
  check(`${unit}: current policy damages opaque core at Auto cap3`, m(c, 'none', 'opaque') > 20, m(c, 'none', 'opaque'));
  for (const p of ['linear', 'squared']) check(`${unit}: ${p} restores the opaque core`, m(c, p, 'opaque') < 1 && m(c, p, 'opaque') < m(c, 'none', 'opaque'), m(c, p, 'opaque'));
  check(`${unit}: none loses a salient core cluster, linear does not`, c.variants.none.salient.lost.length > 0 && c.variants.linear.salient.lost.every(l => l.share < .05), { none: c.variants.none.salient.lost, linear: c.variants.linear.salient.lost });
}
{
  const c = find('intentional-cyan-halo', 'auto-c3-oklab');
  check('halo: none and linear keep cyan soft region exact', m(c, 'none', 'soft') === 0 && m(c, 'linear', 'soft') === 0, [m(c, 'none', 'soft'), m(c, 'linear', 'soft')]);
  check('halo: squared removes cyan (soft RMSE ~22.73, reviewer value)', Math.abs(m(c, 'squared', 'soft') - 22.73) < .05, m(c, 'squared', 'soft'));
  check('halo: squared lost salient cyan cluster', c.variants.squared.salient.lost.some(l => l.share > .3), c.variants.squared.salient.lost);
  check('halo: squared improves opaque region (aggregate hides soft loss)', m(c, 'squared', 'opaque') < m(c, 'none', 'opaque'), [m(c, 'none', 'opaque'), m(c, 'squared', 'opaque')]);
}
{ // Reproduce the spike's reported many-soft negatives from independent code.
  const a = find('many-soft-colors', 'auto-c3-oklab'), r = find('many-soft-colors', 'res64-c4-rgb');
  check('many-soft Auto cap3 Oklab: all-region RMSE none 36.4166 -> linear 36.8524', Math.abs(m(a, 'none', 'all') - 36.4166) < 1e-3 && Math.abs(m(a, 'linear', 'all') - 36.8524) < 1e-3, [m(a, 'none', 'all'), m(a, 'linear', 'all')]);
  check('many-soft Res64 cap4 RGB: all-region RMSE none 30.3781 -> linear 30.5197', Math.abs(m(r, 'none', 'all') - 30.3781) < 1e-3 && Math.abs(m(r, 'linear', 'all') - 30.5197) < 1e-3, [m(r, 'none', 'all'), m(r, 'linear', 'all')]);
}
check('binary control: identical across policies in every per-unit setting (walls share a palette with soft art, so may differ)', results.cases.filter(c => c.unitId === 'binary-opaque-control' && !c.wall).every(c => c.identicalAcrossPolicies));
check('region pixel counts partition the visible pixels', results.units.every(u => results.cases.filter(c => c.unit === u.index).every(c => { const r = c.variants.none.regionPixels; return r && r.opaque + r.strong + r.soft + r.faint === r.all && r.all === (u.alphaHistogram.opaque + u.alphaHistogram.strong + u.alphaHistogram.soft + u.alphaHistogram.faint) * 1; })));
check('auto-all on <=64-color source is exact (zero error everywhere)', ['faint-green-spill', 'intentional-cyan-halo'].every(u => ['none', 'linear', 'squared'].every(p => m(find(u, 'auto-all-oklab'), p, 'all', 'checker', 'oklabRmse') === 0)));
check('animation unit has duration-weighted frames', results.units.find(u => u.id === 'warm-glow-fade')?.frames === 2);
check('walls ran for categories with >=2 units', ['spill', 'soft'].every(cat => results.cases.some(c => c.wall === cat)));
check('dither row present for every unit', results.units.every(u => results.cases.some(c => c.unit === u.index && c.setting === 'auto-c4-oklab-dither4x4')));
check('byte-identical cases have no sheet; differing cases have sheet or duplicate', results.cases.every(c => c.identicalAcrossPolicies ? !c.sheet && !c.duplicateSheetOf : !!(c.sheet || c.duplicateSheetOf || ['none', 'linear', 'squared'].some(p => c.variants[p].empty))));
const sheetText = JSON.stringify(results);
check('results.json carries no blind letter mapping', !/"X":|"Y":|"Z":/.test(sheetText));
let verified = true;
try { execFileSync(node, [evaluate, '--verify-key', '--out', out, '--key', key], { stdio: 'inherit' }); } catch { verified = false; }
check('blind key round-trips (seed -> order, hashes, sheet pixels)', verified);
// Tamper test: swapping a mapping must be detected.
const k = JSON.parse(await fs.readFile(key, 'utf8')), first = Object.keys(k.sheets)[0];
[k.sheets[first].X, k.sheets[first].Y] = [k.sheets[first].Y, k.sheets[first].X];
await fs.writeFile(key + '.tampered.json', JSON.stringify(k));
let tamperCaught = false;
try { execFileSync(node, [evaluate, '--verify-key', '--out', out, '--key', key + '.tampered.json'], { stdio: 'pipe' }); } catch { tamperCaught = true; }
check('tampered blind key is rejected', tamperCaught);

const failed = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.pass ? '' : ' ' + JSON.stringify(c.detail)}`);
console.log(`${checks.length - failed.length}/${checks.length} checks pass; outputs in ${dir}`);
await fs.writeFile(path.join(dir, 'validation.json'), JSON.stringify({ checks, summary: results.summary, meta: results.meta, units: results.units.map(u => ({ id: u.id, ms: u.ms })) }, null, 2));
if (failed.length) process.exitCode = 1;
