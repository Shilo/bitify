// Owned clipboard fixtures and an exact PNG payload verifier. No clipboard access.
// Generate: node bench/palette-clipboard-fixtures.mjs
// Verify:   node bench/palette-clipboard-fixtures.mjs verify palette-keep path.png
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import omggif from 'omggif';
import { FULL_PRESETS } from '../src/lib/palette-library.js';
import { fullPaletteImage } from '../src/lib/palette-state.js';
import { colorize as paletteRgba } from '../src/lib/quantize.js';
import { analyze, mask, colorize as legacyRgba } from '../src/lib/recolor.js';
import { pngBytes, palettePngBytesAsync } from '../src/lib/save.js';
import { prepareCleanupAsync } from '../src/lib/palette-cleanup.js';

const require = createRequire(import.meta.url);
let sharp; try { sharp = require(process.env.SHARP_MODULE ?? 'sharp'); }
catch { sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
export const clipboardFixtureDirectory = fileURLToPath(new URL('./palette-clipboard-review/fixtures/', import.meta.url));
const artifact = name => new URL('./palette-clipboard-review/fixtures/' + name, import.meta.url);
const hash = data => createHash('sha256').update(data).digest('hex');
const rgbAt = (data, p) => '#' + Buffer.from(data.subarray(p, p + 3)).toString('hex');
const rgb = color => [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16));
const alphaValues = data => [...new Set(Array.from({ length: data.length / 4 }, (_, i) => data[i * 4 + 3]))].sort((a, b) => a - b);
const visibleColors = data => [...new Set(Array.from({ length: data.length / 4 }, (_, i) => data[i * 4 + 3] ? rgbAt(data, i * 4) : null).filter(Boolean))].sort();

export function loadClipboardManifest() {
  return JSON.parse(fs.readFileSync(artifact('manifest.json'), 'utf8'));
}

function compareRgba(actual, expected, label) {
  assert.equal(actual.length, expected.length, label + ' pixel length differs');
  let alphaMismatches = 0, visibleRgbMismatches = 0, visiblePixels = 0;
  for (let p = 0; p < expected.length; p += 4) {
    if (actual[p + 3] !== expected[p + 3]) alphaMismatches++;
    if (expected[p + 3]) { visiblePixels++; if (actual[p] !== expected[p] || actual[p + 1] !== expected[p + 1] || actual[p + 2] !== expected[p + 2]) visibleRgbMismatches++; }
  }
  assert.equal(alphaMismatches, 0, `${label}: ${alphaMismatches} alpha bytes differ`);
  assert.equal(visibleRgbMismatches, 0, `${label}: ${visibleRgbMismatches} visible RGB pixels differ`);
  return { pixels: expected.length / 4, visiblePixels, alphaMismatches, visibleRgbMismatches };
}

// Decodes actual clipboard/pasted/saved PNG bytes independently of the encoders.
// Hidden alpha-zero RGB is immaterial; every other channel must match exactly.
export async function verifyClipboardPng(bytes, key) {
  const manifest = loadClipboardManifest(), entry = manifest.fixtures.find(entry => entry.key === key);
  assert(entry, 'Unknown clipboard fixture key: ' + key);
  assert(bytes instanceof Uint8Array, 'Clipboard verification requires encoded PNG bytes');
  bytes = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Clipboard payload is not PNG');
  const expectedBytes = fs.readFileSync(artifact(entry.expectedFile));
  assert.equal(hash(expectedBytes), entry.expectedPngSha256, 'Expected fixture PNG changed');
  const expected = await sharp(expectedBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const actual = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(actual.info.width, entry.width, 'Clipboard width differs');
  assert.equal(actual.info.height, entry.height, 'Clipboard height differs');
  assert.equal(hash(expected.data), entry.expectedRgbaSha256, 'Expected fixture pixels changed');
  return { key, width: actual.info.width, height: actual.info.height, ...compareRgba(actual.data, expected.data, key), alphaValues: alphaValues(actual.data), usedColors: visibleColors(actual.data).length, encodedBytes: bytes.byteLength, encodedSha256: hash(bytes), exactVisibleRgba: true };
}

async function sourcePng(name, image) {
  await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } }).png().toFile(fileURLToPath(artifact(name)));
  const bytes = fs.readFileSync(artifact(name));
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  compareRgba(decoded.data, image.data, name);
  return { sourceFile: name, sourcePngSha256: hash(bytes), sourceRgbaSha256: hash(image.data), sourceAlphaValues: alphaValues(image.data) };
}

export async function generateClipboardFixtures() {
  fs.mkdirSync(clipboardFixtureDirectory, { recursive: true });
  const pico = FULL_PRESETS.find(palette => palette.id === 'preset-pico8').colors;
  const dominant = [0, 1, 6, 7, 8, 10, 11, 12].map(index => pico[index]);
  const original = { width: 32, height: 24, data: new Uint8ClampedArray(32 * 24 * 4) };
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const color = x < 10 ? [0, 0, 0] : x < 24 ? rgb(dominant[(Math.floor(x / 3) + Math.floor(y / 6)) % 8]) : Array(3).fill(Math.round((x - 24) * 255 / 7));
    original.data.set([...color, [0, 1, 64, 127, 128, 192, 254, 255][y % 8]], (y * 32 + x) * 4);
  }
  for (const y of [10, 12]) original.data.set([8, 12, 22, original.data[(y * 32 + 5) * 4 + 3]], (y * 32 + 5) * 4);
  const source = await sourcePng('palette-source.png', original);
  const manifest = {
    version: 1,
    scope: 'Owned synthetic sources; conversion oracle is the current production pipeline, not an independent palette algorithm. Independent Sharp decoding verifies encoded PNG alpha/visibleRGB. Real browser clipboard transport and external paste must be tested separately.',
    runtime: { node: process.version, sharp: sharp.versions.sharp },
    sourceDependencies: Object.fromEntries(['palette-state.js', 'quantize.js', 'palette-dither.js', 'palette-alpha.js', 'palette-limit.js', 'palette-cleanup.js', 'palette-cleanup-apply.js', 'save.js', 'recolor.js', 'palette-export.js', 'palette-library.js'].map(name => [name, hash(fs.readFileSync(new URL('../src/lib/' + name, import.meta.url)))])),
    fixtures: [],
  };
  const base = { family: 'full-palette', colors: pico, paletteId: 'preset-pico8', metric: 'oklab', alphaCut: 128, maxColors: 8, cleanup: true, dither: '4x4', ditherStrength: 50 };
  async function retain(key, about, frame, colors, rgba, bytes) {
    const file = key + '-expected.png'; fs.writeFileSync(artifact(file), bytes);
    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    compareRgba(decoded.data, rgba, key + ' reference encoder');
    const entry = { key, ...about, expectedFile: file, width: frame.w, height: frame.h, outputColors: colors, expectedPngSha256: hash(bytes), expectedRgbaSha256: hash(decoded.data), expectedAlphaValues: alphaValues(decoded.data), usedColors: visibleColors(decoded.data).length };
    manifest.fixtures.push(entry); return entry;
  }
  for (const alphaMode of ['keep', 'cut']) {
    const settings = { ...base, alphaMode }, image = await fullPaletteImage({ name: 'palette-source.png', original }, settings, { still: true });
    const rgba = paletteRgba(image, image.colors).data;
    let exactSourcePixels = 0;
    for (let p = 0; p < original.data.length; p += 4) if (original.data[p + 3] >= (alphaMode === 'keep' ? 1 : 128) && image.colors.includes(rgbAt(original.data, p))) { assert.equal(rgbAt(rgba, p), rgbAt(original.data, p)); exactSourcePixels++; }
    const cleanup = await prepareCleanupAsync([original], image.colors, alphaMode === 'keep' ? 1 : 128, 'oklab');
    const cleanupSites = [...cleanup.replacements].filter(index => index < 256).length;
    await retain('palette-' + alphaMode, { ...source, family: 'full-palette', settings, exactActiveSourcePixelsVerified: exactSourcePixels, cleanupSites, opacityContract: alphaMode === 'keep' ? 'Every original alpha byte retained; hidden RGB excluded from comparison' : 'Alpha below128 empty,128andabove opaque' }, image, image.colors, rgba, await palettePngBytesAsync(image));
  }
  const onebitSettings = { family: 'two-color', first: '#000000', second: '#ffffff', none: 0, style: 'solid', set: { threshold: 128, source: 'luma', alpha: 128 } };
  const analysis = analyze(original, 'luma', 128), imageMask = mask(analysis, 'solid', onebitSettings.set), onebit = { name: 'palette-source.png', w: original.width, h: original.height, first: '#000000', second: '#ffffff', mask: imageMask };
  await retain('onebit', { ...source, family: 'two-color', settings: onebitSettings, opacityContract: 'Legacy thresholded alpha, Solid manualthreshold128, Mono pair' }, onebit, ['#000000', '#ffffff'], legacyRgba(imageMask, onebit.first, onebit.second), pngBytes(onebit));

  const gifFrames = [40, 240, 80].map((delay, f) => {
    const frame = { width: 32, height: 24, data: new Uint8ClampedArray(32 * 24 * 4) };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      const index = (Math.floor(x / 4) + Math.floor(y / 6) + (f === 1 ? 8 : f * 3)) % 16;
      frame.data.set([...rgb(pico[index]), x < 2 || y < 2 ? 0 : 255], (y * 32 + x) * 4);
    }
    return { original: frame, delay };
  });
  const table = [0, ...pico.map(color => parseInt(color.slice(1), 16))]; while (table.length & table.length - 1) table.push(0);
  const gifBuffer = new Uint8Array(65536), writer = new omggif.GifWriter(gifBuffer, 32, 24, { palette: table, loop: 0 });
  for (const frame of gifFrames) {
    const indices = Uint8Array.from({ length: 32 * 24 }, (_, p) => frame.original.data[p * 4 + 3] ? pico.indexOf(rgbAt(frame.original.data, p * 4)) + 1 : 0);
    writer.addFrame(0, 0, 32, 24, indices, { delay: frame.delay / 10, disposal: 2, transparent: 0 });
  }
  const gifBytes = gifBuffer.subarray(0, writer.end()); fs.writeFileSync(artifact('clip-source.gif'), gifBytes);
  const reader = new omggif.GifReader(gifBytes);
  assert.equal(reader.numFrames(), 3); assert.equal(reader.loopCount(), 0);
  const frames = gifFrames.map((frame, i) => { const data = new Uint8ClampedArray(32 * 24 * 4); reader.decodeAndBlitFrameRGBA(i, data); compareRgba(data, frame.original.data, 'GIF source frame' + i); assert.equal(reader.frameInfo(i).delay * 10, frame.delay); return { original: { width: 32, height: 24, data }, delay: frame.delay }; });
  const gifItem = { name: 'clip-source.gif', original: frames[0].original, frames, loop: 0 }, gifSettings = { ...base, alphaMode: 'keep' };
  const first = await fullPaletteImage(gifItem, gifSettings, { still: true }), frameOnly = await fullPaletteImage({ name: gifItem.name, original: gifItem.original }, gifSettings, { still: true });
  assert.notDeepEqual(first.colors, frameOnly.colors, 'GIF fixture must distinguish full-animation subset preparation from frame-only fitting');
  await retain('gif-frame0', { sourceFile: 'clip-source.gif', sourcePngSha256: null, sourceGifSha256: hash(gifBytes), sourceAlphaValues: [0, 255], family: 'full-palette', settings: gifSettings, copiedFrame: 0, sourceFrames: 3, delays: frames.map(frame => frame.delay), loop: 0, fullAnimationSubsetVerified: true, incorrectFrameOnlySubset: frameOnly.colors, opacityContract: 'Binary sourcealpha, frame0PNG copy usingduration-weighted fullGIFsubset' }, first, first.colors, paletteRgba(first, first.colors).data, await palettePngBytesAsync(first));
  fs.writeFileSync(artifact('manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const verification = [];
  for (const entry of manifest.fixtures) verification.push(await verifyClipboardPng(fs.readFileSync(artifact(entry.expectedFile)), entry.key));
  await assert.rejects(verifyClipboardPng(Buffer.from('not PNG'), 'palette-keep'), /not PNG/);
  await assert.rejects(verifyClipboardPng(fs.readFileSync(artifact('palette-cut-expected.png')), 'palette-keep'), /alpha bytes differ/);
  const keep = await sharp(fs.readFileSync(artifact('palette-keep-expected.png'))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const changed = Buffer.from(keep.data), visible = Array.from({ length: changed.length / 4 }, (_, i) => i * 4).find(p => changed[p + 3]);
  changed[visible] ^= 1;
  const encodeRaw = data => sharp(data, { raw: { width: keep.info.width, height: keep.info.height, channels: 4 } }).png().toBuffer();
  await assert.rejects(verifyClipboardPng(await encodeRaw(changed), 'palette-keep'), /visible RGB pixels differ/);
  changed.set(keep.data); changed[visible + 3] ^= 1;
  await assert.rejects(verifyClipboardPng(await encodeRaw(changed), 'palette-keep'), /alpha bytes differ/);
  changed.set(keep.data); assert.equal(changed[3], 0); changed.set([255, 0, 255], 0);
  await verifyClipboardPng(await encodeRaw(changed), 'palette-keep');
  const verifierChecks = { nonPngRejected: true, wrongAlphaModeRejected: true, visibleRgbCorruptionRejected: true, alphaCorruptionRejected: true, hiddenRgbNormalizationAccepted: true };
  fs.writeFileSync(artifact('fixture-self-check.json'), JSON.stringify({ completed: true, clipboardAccessed: false, verification, verifierChecks }, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  if (process.argv[2] === 'verify') console.log(JSON.stringify(await verifyClipboardPng(fs.readFileSync(process.argv[4]), process.argv[3])));
  else { const manifest = await generateClipboardFixtures(); console.log(JSON.stringify({ fixtures: manifest.fixtures.map(entry => ({ key: entry.key, width: entry.width, height: entry.height, usedColors: entry.usedColors, alphaValues: entry.expectedAlphaValues, cleanupSites: entry.cleanupSites })), clipboardAccessed: false })); }
}
