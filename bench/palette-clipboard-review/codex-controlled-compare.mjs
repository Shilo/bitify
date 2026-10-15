// Read-only comparison of independently captured Save and trusted native Paste.
// Source perturbations below are models, not measurements of a browser decoder.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { fullPaletteImage } from '../../src/lib/palette-state.js';
import { colorize } from '../../src/lib/quantize.js';
const require = createRequire(import.meta.url), sharp = require(process.env.SHARP_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname, hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rgbAt = (data, p) => '#' + Buffer.from(data.subarray(p, p + 3)).toString('hex');
async function decoded(name) { const bytes = fs.readFileSync(path.join(dir, name)), raw = await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { name, data: raw.data, width: raw.info.width, height: raw.info.height, pngSha256: hash(bytes), rgbaSha256: hash(raw.data) }; }
function compare(expected, actual) {
  const result = { expected: expected.name, actual: actual.name, dimensionsMatch: expected.width === actual.width && expected.height === actual.height, alphaMismatchPixels: 0, visibleRgbMismatchPixels: 0, maxRgbChannelError: 0, byExpectedAlpha: [], transitions: [] };
  if (!result.dimensionsMatch) return result;
  const groups = new Map(), transitions = new Map();
  for (let p = 0; p < expected.data.length; p += 4) {
    const alpha = expected.data[p + 3];
    let group = groups.get(alpha); if (!group) { group = { alpha, pixels: 0, alphaMismatchPixels: 0, rgbMismatchPixels: 0, maxRgbChannelError: 0 }; groups.set(alpha, group); }
    group.pixels++;
    if (alpha !== actual.data[p + 3]) { group.alphaMismatchPixels++; result.alphaMismatchPixels++; }
    if (!alpha) continue;
    const delta = Math.max(...[0, 1, 2].map(c => Math.abs(expected.data[p + c] - actual.data[p + c])));
    if (delta) { result.visibleRgbMismatchPixels++; group.rgbMismatchPixels++; const transition = `${rgbAt(expected.data, p)} -> ${rgbAt(actual.data, p)} @ alpha ${alpha}`; transitions.set(transition, (transitions.get(transition) ?? 0) + 1); }
    group.maxRgbChannelError = Math.max(group.maxRgbChannelError, delta); result.maxRgbChannelError = Math.max(result.maxRgbChannelError, delta);
  }
  result.byExpectedAlpha = [...groups.values()].sort((a, b) => a.alpha - b.alpha);
  result.transitions = [...transitions].sort((a, b) => b[1] - a[1]).map(([transition, pixels]) => ({ transition, pixels }));
  result.exactVisibleRgba = result.dimensionsMatch && !result.alphaMismatchPixels && !result.visibleRgbMismatchPixels;
  return result;
}
function membership(image, colors) {
  const palette = new Set(colors), used = new Set(); let pixelsOutside = 0;
  for (let p = 0; p < image.data.length; p += 4) if (image.data[p + 3]) { const color = rgbAt(image.data, p); used.add(color); pixelsOutside += !palette.has(color); }
  return { usedColors: [...used].sort(), colorsOutside: [...used].filter(c => !palette.has(c)).sort(), visiblePixelsOutside: pixelsOutside };
}
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'fixtures/manifest.json'))), entry = manifest.fixtures.find(f => f.key === 'palette-keep');
const golden = await decoded('fixtures/' + entry.expectedFile), saved = await decoded('codex-app-save.png'), pasted = await decoded('codex-palette-keep-pasted.png'), source = await decoded('fixtures/' + entry.sourceFile);
const pico = FULL_PRESETS.find(palette => palette.id === 'preset-pico8').colors;
const report = { scope: 'Controlled read-only pair comparison. Save is independent of clipboard transport. Frozen golden is production-derived from exact source bytes; models are plausible input transformations only, not observed decoder output or proof of cause.', hashes: { golden: golden.pngSha256, saved: saved.pngSha256, pasted: pasted.pngSha256, source: source.pngSha256 }, comparisons: { goldenToSave: compare(golden, saved), goldenToPaste: compare(golden, pasted), saveToPaste: compare(saved, pasted) }, membership: { goldenWithinActiveSubset: membership(golden, entry.outputColors), saveWithinGoldenSubset: membership(saved, entry.outputColors), saveWithinPublishedPico8: membership(saved, pico), pasteWithinSavedOutputColors: membership(pasted, membership(saved, pico).usedColors), pasteWithinPublishedPico8: membership(pasted, pico) }, models: [] };
for (const model of ['identity', 'round-premul-round-unpremul', 'round-premul-floor-unpremul', 'floor-premul-round-unpremul']) {
  const original = { width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) };
  for (let p = 0; p < original.data.length; p += 4) if (original.data[p + 3] > 0 && original.data[p + 3] < 255 && model !== 'identity') {
    const alpha = original.data[p + 3];
    for (let c = 0; c < 3; c++) {
      const premul = model.startsWith('floor') ? Math.floor(original.data[p + c] * alpha / 255) : Math.round(original.data[p + c] * alpha / 255);
      original.data[p + c] = model.includes('floor-unpremul') ? Math.floor(premul * 255 / alpha) : Math.round(premul * 255 / alpha);
    }
  }
  const conversion = await fullPaletteImage({ name: model, original }, entry.settings, { still: true }), rgba = colorize(conversion, conversion.colors), output = { name: model, width: rgba.w, height: rgba.h, data: rgba.data };
  report.models.push({ model, selectedColors: conversion.colors, sourceDifference: compare(source, { name: model + ' source', ...original }), comparedToGolden: compare(golden, output), comparedToActualSave: compare(saved, output) });
}
fs.writeFileSync(path.join(dir, 'codex-controlled-comparison.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ comparisons: Object.fromEntries(Object.entries(report.comparisons).map(([key, value]) => [key, { alpha: value.alphaMismatchPixels, rgb: value.visibleRgbMismatchPixels, opaqueRgb: value.byExpectedAlpha.find(g => g.alpha === 255)?.rgbMismatchPixels, max: value.maxRgbChannelError }])), saveColors: report.membership.saveWithinPublishedPico8, models: report.models.map(m => ({ model: m.model, rgbComparedToActualSave: m.comparedToActualSave.visibleRgbMismatchPixels, selectedColors: m.selectedColors })) }, null, 2));
