import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { framesOf, render, targetFor, hashFrames, measure, revive } from './core.mjs';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname, review = path.resolve(dir, '../important-colors-review');
const manifestBytes = await fs.readFile(path.join(review, 'manifest.json'));
const manifest = JSON.parse(manifestBytes), freeze = JSON.parse(await fs.readFile(path.join(dir, 'candidate-freeze.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(await fs.readFile(path.resolve(dir, '../../src/lib/palette-limit.js'))), freeze.productionSha256, 'Production selector changed; rebuild and review the research copy.');
const pngDir = path.join(dir, 'outputs'); await fs.mkdir(pngDir, { recursive: true });
const items = [];
for (const source of manifest.files) {
  const bytes = await fs.readFile(path.join(review, source.file)); assert.equal(sha(bytes), source.sha256);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const original = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
  const regions = (source.regions ?? []).map(region => {
    let points = region.pixels;
    if (region.sourceColors) { const allowed = new Set(region.sourceColors.map(c => c.replace('#', '').toLowerCase())); points = []; for (let p = 0; p < data.length; p += 4) if (data[p + 3] && allowed.has(data.subarray(p, p + 3).toString('hex'))) points.push([(p / 4) % info.width, Math.floor(p / 4 / info.width)]); }
    return { name: region.id, ...(points ? { points } : { x: region.rect[0], y: region.rect[1], width: region.rect[2], height: region.rect[3] }) };
  });
  items.push({ id: source.id, name: source.id, kind: source.kind, regions, original });
}
for (const animation of manifest.animations) {
  const frames = animation.frames.map((id, f) => ({ original: items.find(item => item.id === id).original, delay: animation.delays[f] }));
  const first = items.find(item => item.id === animation.frames[0]);
  const regions = animation.frames.flatMap((id, frame) => items.find(item => item.id === id).regions.map(region => ({ ...region, frame })));
  items.push({ id: animation.id, name: animation.id, kind: first.kind, frames, original: frames[0].original, regions });
}
const serialize = item => ({ ...item, original: { ...item.original, data: [...item.original.data] }, ...(item.frames ? { frames: item.frames.map(f => ({ ...f, original: { ...f.original, data: [...f.original.data] } })) } : {}) });
await fs.writeFile(path.join(dir, 'cohort-input.json'), JSON.stringify({ freeze, manifestSha256: sha(manifestBytes), items: items.map(serialize) }));
const report = { freeze, manifestSha256: sha(manifestBytes), productionEdited: false, scope: 'Exact RGB subset selection only. Auto generation, matching, alpha, Cleanup and dithering unchanged.', rows: [], invariants: [], performance: [] };
const inputHashes = { cohortManifestSha256: sha(manifestBytes), candidateSha256: sha(await fs.readFile(path.join(dir, 'palette-limit.candidate.js'))), harnessCoreSha256: sha(await fs.readFile(path.join(dir, 'core.mjs'))) };
const device = { freeze, inputHashes, items: [], cases: [], invariants: [], performance: [] };
const selectedDeviceItems = new Set(['owned-knight-walk', 'dungeon-archer', 'dungeon-wizard', 'platformer-pilot', 'intentional-eye', 'ramp-control', 'town-water-bucket', 'real-inventory']);
const deviceSeen = new Set();
for (const item of items) {
  const auto = await targetFor([item], null, 128);
  const targets = manifest.settings.palettes.map(id => {
    if (id === 'auto') return ['auto', auto];
    const preset = FULL_PRESETS.find(p => p.id === id);
    assert(preset, 'Frozen target ID must be a real preset: ' + id);
    return [id.slice('preset-'.length), preset.colors];
  });
  for (const [targetId, colors] of targets) for (const metric of ['oklab', 'rgb']) for (const cap of [2, 4, 8, 16]) {
    const options = { cap, metric, alphaCut: 128, alphaMode: 'cut' }, id = `${item.id}-${targetId}-${metric}-k${cap}`;
    const baseline = await render(item, colors, options), baselineHash = await hashFrames(baseline.outputs);
    const none = await render(item, colors, { ...options, method: 'none' });
    assert.equal(await hashFrames(none.outputs), baselineHash, 'Research none differs from actual production');
    const row = { id, item: item.id, kind: item.kind, target: targetId, options, targetColors: colors, baseline: { colors: baseline.colors, hash: baselineHash, metrics: measure(item, baseline, options), selectMs: baseline.selectMs }, candidates: {} };
    const results = { baseline };
    for (const method of ['concave', 'hue']) {
      const result = await render(item, colors, { ...options, method }), hash = await hashFrames(result.outputs), metrics = measure(item, result, options, baseline);
      assert.equal(metrics.alphaWrong, 0); assert.equal(metrics.membershipWrong, 0); assert.equal(metrics.stableChurn, 0); assert(metrics.usedCount <= Math.min(cap, colors.length));
      assert(result.colors.every(color => colors.includes(color)));
      row.candidates[method] = { colors: result.colors, hash, metrics, selectMs: result.selectMs, binned: result.selection.binned, fastPath: result.selection.fastPath };
      results[method] = result;
    }
    if (Object.values(row.candidates).some(c => c.hash !== baselineHash)) {
      row.outputFiles = {};
      for (const [method, result] of Object.entries(results)) {
        const files = [];
        for (let f = 0; f < result.outputs.length; f++) { const output = result.outputs[f], file = `outputs/${id}-${method}-f${f}.png`; await sharp(output.data, { raw: { width: output.width, height: output.height, channels: 4 } }).png().toFile(path.join(dir, file)); files.push(file); }
        row.outputFiles[method] = files;
      }
    }
    report.rows.push(row);
    if (selectedDeviceItems.has(item.id) && ((targetId === 'auto' && [4, 8].includes(cap)) || (targetId === 'res64' && cap === 4))) {
      if (!deviceSeen.has(item.id)) { device.items.push(serialize(item)); deviceSeen.add(item.id); }
      for (const [method, result] of Object.entries(results)) device.cases.push({ id: `${id}-${method}`, item: item.id, colors, options: { ...options, method }, hash: await hashFrames(result.outputs), show: item.id === 'owned-knight-walk' && targetId === 'auto' && metric === 'oklab' && cap === 8 });
    }
  }
  console.log(`Measured ${item.id}: ${report.rows.length} rows`);
}
// Frozen invariants exercise chunking and GIF delay normalization independently
// of visual judgments. Splitting chunks must not change the algorithm's answer.
for (const id of ['owned-knight-walk', 'dungeon-archer', 'intentional-eye']) {
  const item = items.find(v => v.id === id), colors = await targetFor([item], null, 128);
  for (const method of ['baseline', 'concave', 'hue']) {
    const options = { cap: 4, metric: 'oklab', alphaCut: 128, alphaMode: 'cut', method }, base = await render(item, colors, options), split = await render(item, colors, { ...options, chunkBytes: 16, durationScale: 7 });
    assert.equal(await hashFrames(base.outputs), await hashFrames(split.outputs));
    const invariant = { id: `${id}-${method}-chunk-duration`, item: id, colors, options };
    report.invariants.push({ ...invariant, passed: true }); device.invariants.push(invariant);
  }
}
for (const id of ['owned-knight-walk', 'dungeon-wizard']) { const item = items.find(v => v.id === id); device.performance.push({ id: `${id}-selection`, item: id, colors: await targetFor([item], null, 128), options: { cap: 4, metric: 'oklab', alphaCut: 128, alphaMode: 'cut' } }); }
const summary = {};
for (const method of ['concave', 'hue']) {
  const changed = report.rows.filter(r => r.candidates[method].hash !== r.baseline.hash);
  summary[method] = { rows: report.rows.length, changed: changed.length, realChanged: changed.filter(r => r.kind === 'real').length, pointBetter: changed.filter(r => r.candidates[method].metrics.pointLab < r.baseline.metrics.pointLab).length, pointWorse: changed.filter(r => r.candidates[method].metrics.pointLab > r.baseline.metrics.pointLab).length, exactLossRows: changed.filter(r => r.candidates[method].metrics.exactLost > 0).length, meaning: 'Point error is diagnostic, not a semantic or visible-quality judgment.' };
}
report.summary = summary;
report.inputHashes = inputHashes;
await fs.writeFile(path.join(dir, 'results.json'), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(path.join(dir, 'device-input.json'), JSON.stringify(device));
console.log(JSON.stringify(summary, null, 2));
