// Offline research. Calls unchanged production cores; never edits application code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import omggif from 'omggif';
import { refineAutoSubset, colorCoordinates } from './candidate.mjs';
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset } from '../../src/lib/palette-limit.js';
import { fullPaletteImage } from '../../src/lib/palette-state.js';
import { quantize, colorize } from '../../src/lib/quantize.js';
import { prepareCleanupAsync } from '../../src/lib/palette-cleanup.js';
import { palettePngBytesAsync } from '../../src/lib/save.js';
const require = createRequire(import.meta.url);
let sharp; try { sharp = require('sharp'); } catch { sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const dir = import.meta.dirname, hash = bytes => createHash('sha256').update(bytes).digest('hex');
const writeJson = (file, value) => fs.writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2) + '\n');
const framesOf = item => item.frames ?? [{ original: item.original, delay: 1 }];
const rgbAt = (data, p) => data[p] * 65536 + data[p + 1] * 256 + data[p + 2];
const hexAt = (data, p) => '#' + rgbAt(data, p).toString(16).padStart(6, '0');
const square = (a, b) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const image = (width, height, pixel) => ({ width, height, data: Uint8ClampedArray.from(Array.from({ length: width * height }, (_, i) => pixel(i % width, Math.floor(i / width))).flat()) });
async function png(name, original) { await sharp(original.data, { raw: { width: original.width ?? original.w, height: original.height ?? original.h, channels: 4 } }).png().toFile(path.join(dir, name)); }
async function source(name, file) {
  const bytes = fs.readFileSync(new URL(file, import.meta.url));
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { name, original: { width: decoded.info.width, height: decoded.info.height, data: new Uint8ClampedArray(decoded.data) }, provenance: { path: file, fileSha256: hash(bytes) } };
}
const sprite = await source('sprite', '../icon-research/general-source.png');
const armor = await source('armor', '../icon-research/breastplate-source.png');
const ramp = { name: 'gray-ramp', original: image(64, 32, x => { const v = Math.round(x * 255 / 63); return [v, v, v, 255]; }) };
const cube = { name: 'rgb-cube', original: image(64, 64, (x, y) => [Math.round(x % 16 * 255 / 15), Math.round(y % 16 * 255 / 15), Math.round((Math.floor(x / 16) + Math.floor(y / 16) * 4) * 255 / 15), 255]) };
const eye = (name, color) => ({ name, marks: [{ name: 'one-pixel eye', x: 48, y: 16 }], original: image(64, 64, (x, y) => x === 48 && y === 16 ? [...color, 255] : x < 2 || y < 2 || x > 61 || y > 61 ? [0, 0, 0, 0] : [24 + x % 32 * 2, 48 + y % 16 * 3, 88 + (x + y) % 32 * 3, 255]) });
const rare = eye('rare-exact-red-eye', [255, 0, 0]), muted = eye('rare-muted-eye', [106, 59, 59]);
const outline = { name: 'rare-outline-material', marks: [{ name: 'one-pixel black outline', x: 32, y: 2 }, { name: 'copper stripe', x: 31, y: 16 }], original: image(64, 32, (x, y) => x === 32 && y === 2 ? [0, 0, 0, 255] : x === 31 ? [152, 83, 45, 255] : [75 + x % 16 * 3, 80 + y % 16 * 2, 99 + (x + y) % 16 * 3, 255]) };
const gamut = { name: 'saturated-gamut', original: image(64, 32, (x, y) => x < 32 ? [255, x * 8, y * 8, 255] : [y * 8, 255, (x - 32) * 8, 255]) };
const alpha = { name: 'alpha-boundaries', original: image(32, 18, (x, y) => [x * 8, 255 - x * 7, y * 14, [0, 1, 127, 128, 254, 255][Math.floor(y / 3)]]) };
const ties = { name: 'nearby-critical-hues', marks: [{ name: 'warm detail', x: 23, y: 8 }, { name: 'cool detail', x: 24, y: 8 }], original: image(32, 16, (x, y) => x === 23 && y === 8 ? [136, 118, 111, 255] : x === 24 && y === 8 ? [118, 124, 136, 255] : [88 + x % 16 * 3, 86 + y * 4, 90 + (x + y) % 16 * 3, 255]) };
const high = { name: 'high-unique-6144', original: image(96, 64, (x, y) => { const key = Math.imul(y * 96 + x, 2654435761) & 0xffffff; return [key >>> 16, key >>> 8 & 255, key & 255, 255]; }) };
const gifBytes = fs.readFileSync(new URL('../palette-fitting-spike/duration-weighted-source.gif', import.meta.url)), reader = new omggif.GifReader(gifBytes);
const clipFrames = Array.from({ length: reader.numFrames() }, (_, i) => { const data = new Uint8ClampedArray(reader.width * reader.height * 4); reader.decodeAndBlitFrameRGBA(i, data); return { original: { width: reader.width, height: reader.height, data }, delay: reader.frameInfo(i).delay * 10 }; });
assert.deepEqual(clipFrames.map(f => f.delay), [40, 160, 80]);
const clip = { name: 'duration-weighted-armor-gif', original: clipFrames[0].original, frames: clipFrames, loop: reader.loopCount(), provenance: { path: '../palette-fitting-spike/duration-weighted-source.gif', fileSha256: hash(gifBytes), decodedFrames: 3 } };
const flashFrames = [40, 200, 80].map((delay, f) => ({ delay, original: image(32, 32, (x, y) => x === 24 && y === 8 && f === 0 ? [255, 247, 220, 255] : [30 + x % 16 * 5, 50 + y % 16 * 5 + (f === 1 ? 8 : 0), 90 + (x + y) % 16 * 5, 255]) }));
const flash = { name: 'short-frame-highlight', original: flashFrames[0].original, frames: flashFrames, loop: 0, marks: [{ name: 'short held highlight', x: 24, y: 8 }] };
const items = [sprite, armor, ramp, cube, rare, muted, outline, gamut, alpha, ties, high, clip, flash];
for (const item of items) { item.sourceHashes = framesOf(item).map(f => hash(f.original.data)); await png(item.name + '-source.png', item.original); }

function chunks(item) { return async function* () { for (const frame of framesOf(item)) yield { data: frame.original.data, weight: frame.delay }; }; }
async function subset(colors, k, item, metric, cut) {
  if (colors.length <= k) return { colors: [...colors], fastPath: 'uncapped' };
  const result = await selectPaletteSubset(colors, k, chunks(item), { alphaCut: cut, metric });
  return { ...result, colors: result.indices.map(index => colors[index]) };
}
async function rendered(item, colors, settings) {
  const conversion = await fullPaletteImage(item, { family: 'full-palette', colors, maxColors: 0, ...settings });
  const outputs = [];
  for (let f = 0; f < (conversion.frameCount ?? 1); f++) { const frame = conversion.getFrame ? await conversion.getFrame(f) : conversion; outputs.push({ ...colorize(frame, conversion.colors), indices: frame.indices, frame, delay: framesOf(item)[f].delay }); }
  return { outputs, conversion };
}
function metrics(item, outputs, settings, baselineOutputs) {
  const cut = settings.alphaMode === 'keep' ? 1 : settings.alphaCut, used = new Set();
  let mass = 0, objective = 0, oklab = 0, rgb = 0, changedPixels = 0, alphaMismatches = 0, exactSourceChanges = 0, unchangedCoordinateChurn = 0;
  const changes = new Map();
  for (let f = 0; f < outputs.length; f++) {
    const { original, delay } = framesOf(item)[f], output = outputs[f];
    assert.equal(output.width, original.width); assert.equal(output.height, original.height);
    for (let p = 0; p < original.data.length; p += 4) {
      const visible = original.data[p + 3] >= cut, expectedAlpha = visible ? settings.alphaMode === 'keep' ? original.data[p + 3] : 255 : 0;
      if (output.data[p + 3] !== expectedAlpha) alphaMismatches++;
      if (!visible) continue;
      const a = rgbAt(original.data, p), b = rgbAt(output.data, p), d = square(colorCoordinates(a, settings.metric), colorCoordinates(b, settings.metric));
      mass += delay; objective += d * delay; oklab += square(colorCoordinates(a), colorCoordinates(b)) * delay; rgb += square(colorCoordinates(a, 'rgb'), colorCoordinates(b, 'rgb')) * delay;
      used.add(hexAt(output.data, p));
      if (baselineOutputs && b !== rgbAt(baselineOutputs[f].data, p)) { changedPixels++; changes.set(a, (changes.get(a) ?? 0) + 1); if (a === rgbAt(baselineOutputs[f].data, p)) exactSourceChanges++; }
      if (f && a === rgbAt(framesOf(item)[f - 1].original.data, p) && original.data[p + 3] === framesOf(item)[f - 1].original.data[p + 3] && b !== rgbAt(outputs[f - 1].data, p)) unchangedCoordinateChurn++;
    }
  }
  // Local average is alpha-weighted linear RGB, then Oklab, with no windows that
  // cross a transparent boundary. This is tone fidelity on eligible blocks only.
  let blockError = 0, blockMass = 0, eligibleBlocks = 0, excludedBlocks = 0;
  const linear = v => v <= .04045 * 255 ? v / 255 / 12.92 : ((v / 255 + .055) / 1.055) ** 2.4;
  const labLinear = ([r, g, b]) => { const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; };
  for (let f = 0; f < outputs.length; f++) {
    const { original, delay } = framesOf(item)[f];
    for (let y = 0; y + 4 <= original.height; y += 4) for (let x = 0; x + 4 <= original.width; x += 4) {
      const a = [0, 0, 0], b = [0, 0, 0]; let alphaMass = 0, eligible = true;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) { const p = ((y + dy) * original.width + x + dx) * 4; if (original.data[p + 3] < cut) { eligible = false; continue; } const alphaWeight = settings.alphaMode === 'keep' ? original.data[p + 3] / 255 : 1; alphaMass += alphaWeight; for (let c = 0; c < 3; c++) { a[c] += linear(original.data[p + c]) * alphaWeight; b[c] += linear(outputs[f].data[p + c]) * alphaWeight; } }
      if (!eligible) { excludedBlocks++; continue; }
      eligibleBlocks++; blockMass += delay; blockError += square(labLinear(a.map(v => v / alphaMass)), labLinear(b.map(v => v / alphaMass))) * delay;
    }
  }
  return { objective: mass ? objective / mass : 0, pointOklab: mass ? oklab / mass : 0, pointEncodedRgb: mass ? rgb / mass : 0, block4Oklab: blockMass ? blockError / blockMass : null, eligibleBlocks, excludedBlocks, alphaMismatches, usedColors: [...used].sort(), usedCount: used.size, changedPixels, changedSourceRgb: changes.size, exactSourceChanges, unchangedCoordinateChurn, marks: (item.marks ?? []).map(mark => ({ ...mark, outputs: outputs.map(o => hexAt(o.data, (mark.y * o.width + mark.x) * 4)) })) };
}
const baseSettings = { alphaCut: 128, alphaMode: 'cut', metric: 'oklab', cleanup: false, dither: 'none', ditherStrength: 50 };
const hashes = Object.fromEntries(['candidate.mjs', '../../src/lib/palette-generated.js', '../../src/lib/palette-generated-sources.js', '../../src/lib/palette-limit.js', '../../src/lib/quantize.js', '../../src/lib/palette-dither.js', '../../src/lib/palette-cleanup.js', '../../src/lib/palette-state.js', '../../src/lib/save.js'].map(file => [file, hash(fs.readFileSync(new URL(file, import.meta.url)))]));
const report = { offline: true, productionEdited: false, hashes, methodology: { baseline: 'Current generated shared Auto64 captured once per scope, then current per-asset/full-GIF subset selection. New-centroid colors explicitly break shared target membership; exact subset-swaps preserve it.', objective: 'Mean sum-of-three-channel squared distance, encodedRGB or Oklab, unweighted by alpha; frame-delay weighted; Cut128/Keep1 eligibility.', strict: 'Every original visible source RGB nearest error must not increase at all; no epsilon. Exact baseline/source colors must remain literal palette members. Aggregate improvement must exceed 1e-12*max(1,baselineMean).', rare: 'Source RGB duration mass <=1% of item visible mass cannot worsen; exact baseline/source colors retained. Larger groups may worsen.', performance: 'Research candidate measures include histogram, all3guard variants, fitting/swaps and cooperative scheduler; exclude source decode, productionAuto/cap caches, worker transfer/UI. Not shipping latency.', blockMetric: 'Nonoverlapping4x4 windows with all source pixels eligible; alpha-weighted linearRGB average mapped toOklab. Excludes transparent-boundary windows and reports coverage. Point/tone metrics are not semantic quality.', overflow: 'Morethan16384source RGBs conservatively retains baseline and reports null/incomplete research objective.' }, sources: items.map(item => ({ name: item.name, width: item.original.width, height: item.original.height, frameCount: framesOf(item).length, delays: framesOf(item).map(f => f.delay), hashes: item.sourceHashes, provenance: item.provenance, marks: item.marks })), cases: [], interactions: [], timings: [], invariants: [] };
const scopes = [...items.map(item => ({ name: item.name, items: [item] })), { name: 'four-asset-wall', items: [sprite, armor, rare, alpha] }];
const deviceItems = [sprite, armor, alpha, high, clip, rare];
const device = { items: deviceItems.map(item => ({ name: item.name, original: { ...item.original, data: [...item.original.data] }, ...(item.frames ? { frames: item.frames.map(f => ({ delay: f.delay, original: { ...f.original, data: [...f.original.data] } })), loop: item.loop } : {}) })), cases: [] };
let num = 0;
for (const scope of scopes) {
  for (const alphaMode of scope.name === alpha.name || scope.name === 'four-asset-wall' ? ['cut', 'keep'] : ['cut']) {
    const cut = alphaMode === 'keep' ? 1 : 128, snapshot = captureGeneratedSources(scope.items, cut), started = performance.now(), auto = await generatePaletteAsync(snapshot), autoMs = performance.now() - started;
    for (const metric of ['oklab', 'rgb']) for (const k of [2, 4, 8, 16]) {
      const union = { baseline: new Set(), centroidStrict: new Set(), swapsStrict: new Set() };
      for (const item of scope.items) {
        const id = `${scope.name}-${item.name}-${alphaMode}-${metric}-k${k}`, chosen = await subset(auto.colors, k, item, metric, cut), settings = { ...baseSettings, metric, alphaMode };
        const baselineRendered = await rendered(item, chosen.colors, settings), baselineMetrics = metrics(item, baselineRendered.outputs, settings);
        // Independent actual production pipeline agreement, using captured wall.
        const app = await fullPaletteImage(item, { ...settings, generated: snapshot, colors: [], maxColors: k });
        assert.deepEqual([...app.colors], chosen.colors, 'Baseline diverged from current fullPaletteImage selection');
        const row = { id, scope: scope.name, itemName: item.name, k, metric, alphaMode, alphaCut: 128, autoColors: auto.colors, autoMs, subset: { ...chosen, colors: undefined }, baselineColors: chosen.colors, baseline: baselineMetrics, candidates: {} };
        if (scope.items.length === 1 && ['sprite', 'armor', rare.name, muted.name, outline.name, ties.name].includes(item.name) && metric === 'oklab' && [2, 4, 8].includes(k)) { row.baselineFile = `${id}-baseline.png`; await png(row.baselineFile, baselineRendered.outputs[0]); }
        for (const color of baselineMetrics.usedColors) union.baseline.add(color);
        for (const method of ['centroid', 'subset-swaps']) {
          const result = await refineAutoSubset(chosen.colors, item, { metric, alphaMode, alphaCut: 128, method, sharedColors: auto.colors });
          row.candidates[method] = result;
          for (const [policy, candidate] of Object.entries(result.variants)) {
            assert(candidate.colors.length === chosen.colors.length && candidate.colors.every(c => /^#[\da-f]{6}$/.test(c)));
            const output = await rendered(item, candidate.colors, settings), measured = metrics(item, output.outputs, settings, baselineRendered.outputs);
            candidate.output = measured;
            assert.equal(measured.alphaMismatches, 0);
            assert(measured.usedCount <= k);
            if (method === 'subset-swaps') assert(candidate.colors.every(c => auto.colors.includes(c)));
            if (policy === 'strict' && candidate.changed) { assert.equal(candidate.stats.worsenedRgb, 0); assert.equal(measured.exactSourceChanges, 0); }
            if (candidate.stats.objectiveComplete) assert(Math.abs(measured.objective - candidate.stats.pointError) <= 1e-8 * Math.max(1, measured.objective), 'Candidate objective differs from actual quantize');
            if (policy === 'strict') for (const color of measured.usedColors) union[method === 'centroid' ? 'centroidStrict' : 'swapsStrict'].add(color);
            if (scope.items.length === 1 && ['sprite', 'armor', rare.name, muted.name, outline.name, ties.name].includes(item.name) && metric === 'oklab' && [2, 4, 8].includes(k)) {
              const file = `${id}-${method}-${policy}.png`; await png(file, output.outputs[0]); candidate.file = file;
            }
          }
        }
        if (scope.items.length === 1 && deviceItems.includes(item) && ((metric === 'oklab' && k === 4) || (metric === 'rgb' && k === 8)) && device.cases.filter(c => c.itemName === item.name).length < 2) device.cases.push({ id, itemName: item.name, baselineColors: chosen.colors, sharedColors: auto.colors, metric, k, alphaMode, alphaCut: 128 });
        if (item === alpha && alphaMode === 'keep' && metric === 'oklab' && k === 4 && scope.items.length === 1) { const index = device.cases.findIndex(c => c.itemName === alpha.name && c.metric === 'rgb'); device.cases[index] = { id, itemName: item.name, baselineColors: chosen.colors, sharedColors: auto.colors, metric, k, alphaMode, alphaCut: 128 }; }
        report.cases.push(row); num++;
        if (num % 16 === 0) console.log('Measured', num, 'cases');
      }
      if (scope.items.length > 1) report.invariants.push({ scope: scope.name, k, metric, alphaMode, usedUnion: Object.fromEntries(Object.entries(union).map(([key, value]) => [key, value.size])) });
    }
    // Make browser fixtures available before costlier interaction measurements.
    writeJson('fixtures.json', device);
  }
}
writeJson('fixtures.json', device);
console.log('Nearest stage complete', report.cases.length, 'cases; browser fixtures', device.cases.length);

const focal = report.cases.filter(row => row.scope === row.itemName && ((row.itemName === 'armor' && row.k === 4) || (row.itemName === 'sprite' && row.k === 8 && row.metric === 'oklab') || (row.itemName === rare.name && row.k === 2 && row.metric === 'oklab') || (row.itemName === ties.name && row.k === 4 && row.metric === 'rgb') || (row.itemName === alpha.name && row.k === 4 && row.alphaMode === 'keep' && row.metric === 'oklab') || (row.itemName === clip.name && row.k === 4 && row.metric === 'oklab')));
const patterns = [{ dither: 'none', ditherStrength: 50 }, ...['2x2', '4x4', '8x8'].flatMap(dither => [0, 50, 100].map(ditherStrength => ({ dither, ditherStrength })))];
for (const row of focal) {
  const item = items.find(item => item.name === row.itemName), variants = [{ id: 'baseline', colors: row.baselineColors }];
  for (const [method, result] of Object.entries(row.candidates)) for (const [guard, candidate] of Object.entries(result.variants)) if (!variants.some(v => JSON.stringify(v.colors) === JSON.stringify(candidate.colors))) variants.push({ id: method + '-' + guard, colors: candidate.colors });
  const cleanups = new Map();
  for (const variant of variants) cleanups.set(variant.id, await prepareCleanupAsync(framesOf(item).map(f => f.original), variant.colors, row.alphaMode === 'keep' ? 1 : 128, row.metric));
  for (const cleanup of [false, true]) for (const pattern of patterns) {
    const settings = { ...baseSettings, alphaMode: row.alphaMode, metric: row.metric, cleanup, ...pattern }, baseline = await rendered(item, row.baselineColors, settings), baselineScore = metrics(item, baseline.outputs, settings);
    const interaction = { caseId: row.id, itemName: item.name, k: row.k, metric: row.metric, settings, baseline: baselineScore, variants: [] };
    const baselineReplacements = cleanups.get('baseline').replacements;
    for (const variant of variants.slice(1)) {
      const output = await rendered(item, variant.colors, settings), score = metrics(item, output.outputs, settings, baseline.outputs);
      const replacements = cleanups.get(variant.id).replacements;
      let changedCleanupSites = 0, baselineSites = 0, candidateSites = 0;
      for (let p = 0; p < replacements.length; p++) { if (baselineReplacements[p] < 256) baselineSites++; if (replacements[p] < 256) candidateSites++; if ((baselineReplacements[p] < 256) !== (replacements[p] < 256)) changedCleanupSites++; }
      assert.equal(score.alphaMismatches, 0); assert.equal(score.unchangedCoordinateChurn, 0);
      const detail = { id: variant.id, colors: variant.colors, ...score, baselineCleanupSites: baselineSites, candidateCleanupSites: candidateSites, changedCleanupSites };
      if (pattern.dither === '4x4' && pattern.ditherStrength === 100 || pattern.dither === 'none' && !cleanup) {
        const file = `${row.id}-${variant.id}-${cleanup ? 'cleanup' : 'raw'}-${pattern.dither}-${pattern.ditherStrength}.png`; await png(file, output.outputs[0]); detail.file = file;
        const baseFile = `${row.id}-baseline-${cleanup ? 'cleanup' : 'raw'}-${pattern.dither}-${pattern.ditherStrength}.png`; await png(baseFile, baseline.outputs[0]); interaction.baselineFile = baseFile;
      }
      interaction.variants.push(detail);
    }
    report.interactions.push(interaction);
  }
  console.log('Interactions', item.name, row.metric, row.alphaMode);
}

for (const row of [report.cases.find(r => r.itemName === 'sprite' && r.metric === 'oklab' && r.k === 8), report.cases.find(r => r.itemName === high.name && r.metric === 'oklab' && r.k === 16), report.cases.find(r => r.itemName === alpha.name && r.metric === 'rgb' && r.alphaMode === 'keep' && r.k === 8)]) {
  const item = items.find(i => i.name === row.itemName);
  for (const method of ['centroid', 'subset-swaps']) { const samples = []; for (let run = 0; run < 3; run++) { const begin = performance.now(); await refineAutoSubset(row.baselineColors, item, { metric: row.metric, alphaMode: row.alphaMode, method, sharedColors: row.autoColors }); samples.push(performance.now() - begin); } report.timings.push({ caseId: row.id, method, warmRuns: 3, samplesMs: samples, medianMs: median(samples) }); }
}

// Production encoder/decode checks for selected new palettes, including Keep.
for (const row of focal) {
  const item = items.find(i => i.name === row.itemName), colors = row.candidates.centroid.variants.strict.colors;
  const { conversion, outputs } = await rendered(item, colors, { ...baseSettings, alphaMode: row.alphaMode, metric: row.metric, dither: '4x4', ditherStrength: 50 });
  for (let f = 0; f < outputs.length; f++) { const frame = conversion.getFrame ? await conversion.getFrame(f) : conversion, bytes = await palettePngBytesAsync({ ...frame, colors }); const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer(); for (let p = 0; p < decoded.length; p += 4) { assert.equal(decoded[p + 3], outputs[f].data[p + 3]); if (decoded[p + 3]) for (let c = 0; c < 3; c++) assert.equal(decoded[p + c], outputs[f].data[p + c]); } }
}
report.invariants.push({ name: 'Production PNG encode / independent Sharp decode', cases: focal.length, pass: true });
report.summary = { cases: report.cases.length, interactionSettingsCases: report.interactions.length, methods: {} };
for (const method of ['centroid', 'subset-swaps']) report.summary.methods[method] = Object.fromEntries(['mean', 'strict', 'rare'].map(policy => { const variants = report.cases.map(r => r.candidates[method].variants[policy]); return [policy, { changed: variants.filter(v => v.changed).length, outsideSharedTarget: variants.filter(v => v.stats.newColorsOutsideSharedTarget > 0).length, worstRgbIncreases: Math.max(...variants.map(v => v.stats.worsenedRgb)) }]; }));
writeJson('results.json', report);

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const tile = (title, file) => `<article><h3>${escape(title)}</h3><img alt="${escape(title)} native" src="${file}"><img class="large" alt="${escape(title)} enlarged" src="${file}"></article>`;
const galleries = report.cases.filter(row => row.scope === row.itemName && row.metric === 'oklab' && row.candidates.centroid.variants.mean.file).map(row => `<section><h2>${escape(row.itemName)} K${row.k}</h2>${tile('Original', row.itemName + '-source.png')}${tile('Current Auto64 + cap', row.baselineFile)}${Object.entries(row.candidates).map(([method, result]) => Object.entries(result.variants).map(([policy, variant]) => tile(method + ' ' + policy + ': ' + variant.output.objective.toFixed(7), variant.file)).join('')).join('')}</section>`).join('');
const interactions = report.interactions.filter(i => i.baselineFile).map(i => `<section><h2>${escape(i.itemName)} K${i.k} ${i.metric} ${i.settings.cleanup ? 'Cleanup' : ''} ${i.settings.dither}/${i.settings.ditherStrength}</h2>${tile('Original', i.itemName + '-source.png')}${tile('Current Auto64 + cap', i.baselineFile)}${i.variants.filter(v => v.file).map(v => tile(v.id + ' point ' + v.objective.toFixed(7) + ' tone ' + (v.block4Oklab?.toFixed(7) ?? 'no blocks'), v.file)).join('')}</section>`).join('');
fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Guarded Auto refinement research</title><style>body{font:14px system-ui;background:#fffdf9;color:#241d2d;margin:24px}section{display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid #ccc;margin:20px 0}h2{width:100%}article{width:210px}img{image-rendering:pixelated;background:#dedbd5;margin:4px;vertical-align:top}.large{width:160px;height:160px;object-fit:contain}</style><h1>Guarded Auto refinement: research only</h1><p>Native pixels plus nearest enlarged views. RGB centroid changes shared target identity; subset swaps retain it. Mean point error is not semantic quality. See results.json for every metric, guard rejection and block coverage.</p>${galleries}<h1>Actual Cleanup and dither interactions</h1>${interactions}`);
console.log(JSON.stringify(report.summary, null, 2));
