// Focused DOM-free boundary checks against unchanged production modules.
// Run: node bench/palette-follow-up-edge-qa.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { quantize, colorize, preparePalette } from '../src/lib/quantize.js';
import { collectPaletteUsage } from '../src/lib/palette-usage.js';
import { fullPaletteImage } from '../src/lib/palette-state.js';
import { palettePngBytesAsync } from '../src/lib/save.js';
import { createAnimationCache } from '../src/lib/palette-animation-cache.js';
import { captureGeneratedSources } from '../src/lib/palette-generated-sources.js';

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require(process.env.SHARP_MODULE ?? 'sharp'); }
catch { sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const targets = [['#00ff00'], Array.from({ length: 256 }, (_, i) => '#' + i.toString(16).padStart(2, '0').repeat(3))];
const sources = [0, 1].map(shift => {
  const source = { width: 257, height: 2, data: new Uint8ClampedArray(257 * 2 * 4) };
  for (let y = 0; y < 2; y++) for (let x = 0; x < 257; x++) {
    const gray = (x + shift) & 255;
    const alpha = x === 256 ? 0 : y === 0 ? 1 : [127, 128, 254, 255][x % 4];
    source.data.set([gray, gray, gray, alpha], (y * 257 + x) * 4);
  }
  return source;
});
const item = { original: sources[0], frames: sources.map((original, i) => ({ original, delay: [40, 160][i] })), loop: 0 };
const report = {
  completed: false,
  productionEdited: false,
  runtime: { node: process.version, sharp: sharp.versions.sharp },
  scope: '32 combinations = 2 target sizes × 2 alpha modes × 4 dither patterns × 2 Cleanup states. Eight all-transparent cases = 2 targets × 2 alpha modes × 2 Cleanup states, with RGB matching/cap2/8x8 fixed. These are combinations of synthetic fixtures, not independent artwork quality cases.',
  checks: 'Different two-frame sources; full-GIF used-color union from actual indices; every-frame independent PNG decode; full/sample coordinate consistency; both frames cached and warm-reused; exact cache byte reservation/release; all-transparent fixed palettes and explicit empty Auto rejection.',
  limitations: 'Main fixture uses exact grayscale palette members or a single chromatic target. It does not create multi-color Cleanup replacements or assess semantic detail quality. Hidden alpha-zero RGB is not compared. No browser, encoding-performance or GIF-container claims.',
  sourceHashes: sources.map(source => hash(source.data)),
  sourceShape: { width: 257, height: 2, frames: 2, delays: [40, 160], alphaValues: [0, 1, 127, 128, 254, 255] },
  sourceDependencies: Object.fromEntries(['quantize.js', 'palette-usage.js', 'palette-state.js', 'palette-alpha.js', 'palette-dither.js', 'palette-cleanup.js', 'palette-cleanup-apply.js', 'palette-animation-cache.js', 'palette-limit.js', 'palette-generated.js', 'palette-generated-sources.js', 'palette-library.js', 'palette-export.js', 'save.js'].map(file => [file, hash(fs.readFileSync(new URL('../src/lib/' + file, import.meta.url)))])),
  cases: [],
  allTransparent: [],
  summary: { combinedCornerCases: 0, independentPngRoundtrips: 0, coldCacheFrameConversions: 0, warmCacheFrameHits: 0, releasedCacheReservations: 0, allTransparentFixedCases: 0, emptyAutoExplicitlyRejected: false },
};

for (const colors of targets) for (const alphaMode of ['cut', 'keep']) for (const dither of ['none', '2x2', '4x4', '8x8']) for (const cleanup of [false, true]) {
  const settings = { family: 'full-palette', colors, metric: 'oklab', alphaCut: 128, alphaMode, dither, ditherStrength: 100, cleanup, maxColors: 0 };
  const image = await fullPaletteImage(item, settings);
  assert.equal(image.frameCount, 2); assert.equal(image.loop, 0);
  const frames = [await image.getFrame(0), await image.getFrame(1)];
  assert.deepEqual(frames.map(frame => frame.delay), [40, 160]);
  const usedByFrame = frames.map(frame => new Set([...frame.indices].filter(index => index !== 256).map(index => image.colors[index])));
  const used = new Set(usedByFrame.flatMap(colors => [...colors]));
  const usage = await collectPaletteUsage(item, settings);
  assert.equal(usage.count, used.size);
  assert.deepEqual(usage.colors, image.colors.filter(color => used.has(color)));
  assert.equal(usage.frames, 2);
  if (colors.length === 256) {
    assert.equal(usage.count, 256);
    assert.deepEqual(usedByFrame.map(colors => colors.size), alphaMode === 'keep' ? [256, 256] : [192, 192]);
  }

  for (const frame of frames) {
    const expected = colorize(frame, image.colors);
    const { data: decoded, info } = await sharp(await palettePngBytesAsync({ ...frame, colors: image.colors })).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 257); assert.equal(info.height, 2);
    for (let p = 0; p < decoded.length; p += 4) {
      assert.equal(decoded[p + 3], expected.data[p + 3]);
      if (decoded[p + 3]) for (let c = 0; c < 3; c++) assert.equal(decoded[p + c], expected.data[p + c]);
    }
    report.summary.independentPngRoundtrips++;
  }

  const cache = createAnimationCache();
  const handle = cache.acquire({ sources, palette: preparePalette(image.colors), width: 13, height: 1, ...settings });
  assert(handle);
  const reservedBytes = 2 * (13 * (alphaMode === 'keep' ? 3 : 2) + 256);
  assert.deepEqual(cache.stats(), { bytes: reservedBytes, clips: 1 });
  for (let f = 0; f < 2; f++) {
    let produced = 0;
    const small = await handle.getFrame(f, () => { produced++; return quantize(sources[f], image.colors, 128, 13, 1, settings); });
    assert.equal(produced, 1);
    assert.equal(small.alpha?.byteLength ?? 0, alphaMode === 'keep' ? 13 : 0);
    for (let x = 0; x < 13; x++) {
      const fullIndex = 257 + Math.floor((x + .5) * 257 / 13);
      assert.equal(small.indices[x], frames[f].indices[fullIndex]);
      if (alphaMode === 'keep') assert.equal(small.alpha[x], frames[f].alpha[fullIndex]);
    }
    assert.equal(await handle.getFrame(f, () => { throw new Error('Unexpected warm cache miss'); }), small);
    report.summary.coldCacheFrameConversions++; report.summary.warmCacheFrameHits++;
  }
  handle.release();
  assert.deepEqual(cache.stats(), { bytes: 0, clips: 0 });
  report.summary.releasedCacheReservations++;
  report.summary.combinedCornerCases++;
  report.cases.push({ targetSize: colors.length, alphaMode, dither, strength: 100, cleanup, frameUsedCounts: usedByFrame.map(colors => colors.size), wholeGifUsedCount: usage.count, reservedBytes, pngFramesDecoded: 2, coldCacheFrames: 2, warmCacheHits: 2, pass: true });
}

const hidden = { width: 17, height: 3, data: Uint8ClampedArray.from({ length: 17 * 3 * 4 }, (_, i) => i % 4 === 3 ? 0 : i * 53 & 255) };
for (const alphaMode of ['cut', 'keep']) for (const colors of targets) for (const cleanup of [false, true]) {
  const settings = { family: 'full-palette', colors, alphaMode, alphaCut: 128, metric: 'rgb', maxColors: 2, cleanup, dither: '8x8', ditherStrength: 100 };
  assert.deepEqual(await collectPaletteUsage({ original: hidden }, settings), { count: 0, colors: [], frames: 1 });
  report.summary.allTransparentFixedCases++;
  report.allTransparent.push({ targetSize: colors.length, alphaMode, cleanup, metric: 'rgb', requestedMaxColors: 2, dither: '8x8', usedCount: 0, pass: true });
}
await assert.rejects(fullPaletteImage({ original: hidden }, { family: 'full-palette', colors: [], generated: captureGeneratedSources([{ original: hidden }], 1), alphaMode: 'keep', alphaCut: 128 }), /No visible colors/);
report.summary.emptyAutoExplicitlyRejected = true;
assert.deepEqual(sources.map(source => hash(source.data)), report.sourceHashes);
report.summary.sourceBytesUnchanged = true;
report.completed = true;
const output = new URL('./palette-follow-up-review/edge-contract-results.json', import.meta.url);
fs.mkdirSync(path.dirname(fileURLToPath(output)), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
