// RESEARCH ONLY. Writes a supplementary browser-parity case set (device/extra-cases)
// from the frozen cohort without touching results/. evaluate.mjs exports only up to
// 14 small cases (all glow here); these add one per remaining category, two animation
// groups and one category wall. Decoding mirrors evaluate.mjs and is cross-checked
// against results/results.json (raw source hashes and per-variant output hashes).
// Usage: node bench/keep-real-art-study/device/export-extra-cases.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { POLICIES, VARIANTS, loadCandidates, renderSetting, summarize, sha256 } from '../pipeline.js';
import { UNIT_SETTINGS, WALL_SETTINGS } from '../evaluate.mjs';

const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), study = path.resolve(here, '..'), root = path.resolve(study, '../..');
const outDir = path.join(here, 'extra-cases');
const results = JSON.parse(await fs.readFile(path.join(study, 'results/results.json'), 'utf8'));


// [unit ids..., setting id]; a wall lists every member of its category in unit order.
const PICKS = [
  [['shadow-tree-topdown'], 'auto-c8-oklab'],
  [['aa-tango-face-smile'], 'auto-c4-oklab-dither4x4'],
  [['fade-radial-light'], 'res64-c4-oklab'],
  [['fx-sparks-64'], 'auto-all-oklab'],
  [['soft-cloud'], 'auto-c4-oklab'],
  [['synthetic-many-soft-colors'], 'auto-c16-oklab'],
  [['anim-para-fire'], 'auto-c8-oklab'],
  [['anim-rubberduck-magic'], 'pico8-c4-rgb'],
  [results.units.filter(u => u.category === 'antialiased').map(u => u.id), 'wall-auto-c8-oklab'],
];
const settings = new Map([...UNIT_SETTINGS, ...WALL_SETTINGS]);

async function decodePng(file) { // same as evaluate.mjs
  const { data, info } = await sharp(file).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}
async function loadUnit(id) {
  const meta = results.units.find(u => u.id === id), files = [];
  for (const f of meta.files) files.push(await decodePng(path.join(root, f)));
  const delays = meta.animated ? meta.delays : [1];
  const W = Math.max(...files.map(f => f.width)), H = Math.max(...files.map(f => f.height));
  const frames = files.map((f, i) => {
    let data = f.data;
    if (f.width !== W || f.height !== H) { // same centring as evaluate.mjs
      data = new Uint8ClampedArray(W * H * 4); const x0 = (W - f.width) >> 1, y0 = (H - f.height) >> 1;
      for (let y = 0; y < f.height; y++) data.set(f.data.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((y + y0) * W + x0) * 4);
    }
    return { width: W, height: H, data, delay: delays[i] };
  });
  const raw = await Promise.all(frames.map(f => sha256(f.data)));
  if (raw.join() !== meta.rawSha256.join()) throw new Error(`${id}: decoded bytes differ from results.json`);
  return { meta, unit: { key: meta.animated ? 'anim:' + id : id, animated: meta.animated, frames } };
}

const candidates = await loadCandidates(results.meta.candidateDir);
await fs.rm(outDir, { recursive: true, force: true }); await fs.mkdir(outDir, { recursive: true });
const cases = [], written = new Set();
for (const [ids, settingId] of PICKS) {
  const loaded = []; for (const id of ids) loaded.push(await loadUnit(id));
  const setting = settings.get(settingId), units = loaded.map(l => l.unit), expected = {};
  for (const v of VARIANTS) expected[v] = await summarize(await renderSetting(units, setting, v, candidates));
  if (JSON.stringify(expected.production) !== JSON.stringify(expected.none)) throw new Error(`${settingId}: production != none`);
  const wall = ids.length > 1 ? loaded[0].meta.category : undefined;
  for (const [m, { meta }] of loaded.entries()) { // independent check against the evaluator's own run
    const rec = results.cases.find(c => c.unit === meta.index && c.setting === settingId && c.wall === wall);
    for (const v of [...POLICIES, 'cut128']) {
      const a = expected[v].units[m], b = rec.variants[v];
      if (a.frameHashes.join() !== b.frameHashes.join() || a.colors.join() !== b.colors.join() || (b.sharedColors && b.sharedColors.join() !== expected[v].shared.join())) throw new Error(`${settingId}/${meta.id}/${v}: differs from results.json`);
    }
  }
  for (const { meta, unit } of loaded) if (!written.has(meta.index)) {
    written.add(meta.index);
    for (const [fi, f] of unit.frames.entries()) await fs.writeFile(path.join(outDir, `u${meta.index}-f${fi}.rgba.gz`), zlib.gzipSync(Buffer.from(f.data.buffer, f.data.byteOffset, f.data.length)));
  }
  const differs = loaded.some((_, m) => new Set(POLICIES.map(p => expected[p].units[m].frameHashes.join())).size > 1);
  cases.push({ settingId, setting, differs, category: loaded[0].meta.category, wall, units: loaded.map(({ meta, unit }) => ({ index: meta.index, key: unit.key, animated: unit.animated, width: unit.frames[0].width, height: unit.frames[0].height, delays: unit.frames.map(f => f.delay), rawSha256: meta.rawSha256 })), expected });
  console.log(`${settingId} ${ids.join('+')}: differs=${differs}, matches results.json`);
}
await fs.writeFile(path.join(outDir, 'cases.json'), JSON.stringify({ candidateDir: results.meta.candidateDir, head: results.meta.head, supplementary: true, cases }) + '\n');
