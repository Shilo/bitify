// Preview (Tile emulation) vs export (fullPaletteImage) agreement with cap + Cleanup + dither + Keep,
// plus independent PNG decoding (pngjs) and GIF alpha policy.
// Run: node bench/claude-audit-2026-10-15/impl-a/preview-export-agreement.mjs
import { createRequire } from 'node:module';
import { quantizePreviewAsync, preparePalette, EMPTY_INDEX } from '../../../src/lib/quantize.js';
import { conversionSnapshot, fullPaletteImage } from '../../../src/lib/palette-state.js';
import { getLimitedPalette } from '../../../src/lib/palette-limit-client.js';
import { getPaletteCleanup, applyCleanup } from '../../../src/lib/palette-cleanup-client.js';
import { effectiveAlphaCut } from '../../../src/lib/palette-alpha.js';
import { palettePngBytesAsync, palettePngBytes } from '../../../src/lib/save.js';
import { encodePaletteGif } from '../../../src/lib/gif.js';
import { createAnimationCache } from '../../../src/lib/palette-animation-cache.js';
import omggif from 'omggif';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const { PNG } = require('pngjs');

let seed = 99;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296), ri = n => Math.floor(rand() * n);
const failures = []; let checks = 0;
const fail = (what, info = {}) => { if (failures.length < 80) failures.push({ what, ...info }); };

function sprite(w, h, alphas, shift = 0) {
  const data = new Uint8ClampedArray(w * h * 4), base = [[200, 40, 40], [40, 180, 60], [30, 30, 200], [240, 220, 90], [128, 128, 128], [17, 17, 17]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, c = base[((x + shift) >> 3) + (y >> 3) & 5];
    data.set([Math.min(255, c[0] + ri(24)), Math.min(255, c[1] + ri(24)), Math.min(255, c[2] + ri(24))], p);
    if (ri(29) === 0) data.set([ri(256), ri(256), ri(256)], p); // isolated pixels for Cleanup
    data[p + 3] = alphas[ri(alphas.length)];
  }
  return { width: w, height: h, data };
}
const colors = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];

async function tilePreview(item, frame, s, mw, mh) {
  // Mirrors Tile.svelte: limit and cleanup keyed by effective cut; quantize with raw cut + alphaMode.
  const paletteCut = effectiveAlphaCut(s.alphaMode, s.alphaCut);
  let palette = preparePalette(s.colors);
  if (s.maxColors && s.maxColors < palette.size) palette = await getLimitedPalette(item, palette, paletteCut, s.metric, s.maxColors, {});
  const clean = s.cleanup ? await getPaletteCleanup(item, palette, paletteCut, s.metric, {}) : null;
  const result = await quantizePreviewAsync(frame.original, palette, s.alphaCut, mw, mh, { metric: s.metric, dither: s.dither, ditherStrength: s.ditherStrength, alphaMode: s.alphaMode });
  if (clean) applyCleanup(result, clean);
  return { result, palette };
}

function compareSampled(prev, full, w, h, info) {
  checks++;
  const { w: mw, h: mh } = prev;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const o = y * mw + x, q = Math.floor((y + .5) * h / mh) * w + Math.floor((x + .5) * w / mw);
    if (prev.indices[o] !== full.indices[q]) { fail('preview-export-index', { ...info, x, y, prev: prev.indices[o], full: full.indices[q] }); return; }
    if (!!prev.alpha !== !!full.alpha || prev.alpha && prev.alpha[o] !== full.alpha[q]) { fail('preview-export-alpha', { ...info, x, y }); return; }
  }
}

function decodePng(bytes) { return PNG.sync.read(Buffer.from(bytes)); }

const settingsMatrix = [];
for (const dither of ['none', '4x4', '8x8']) for (const ditherStrength of [0, 1, 50, 100]) for (const alphaMode of ['cut', 'keep'])
  for (const cleanup of [false, true]) for (const maxColors of [0, 4]) for (const metric of ['oklab', 'rgb'])
    if (!(dither === 'none' && ditherStrength !== 50)) settingsMatrix.push({ dither, ditherStrength, alphaMode, cleanup, maxColors, metric });

const partial = [0, 1, 64, 127, 128, 192, 254, 255, 255, 255];
const still = sprite(53, 37, partial);
const stillItem = { id: 1, name: 'still.png', original: still, img: { w: 53, h: 37 } };
let pngKinds = { rgba: 0, indexed: 0 };
for (const s of settingsMatrix) {
  const snap = conversionSnapshot({ family: 'full-palette', palette: { name: 'p', colors }, alphaCut: 128, metric: s.metric, maxColors: s.maxColors, cleanup: s.cleanup, dither: s.dither, ditherStrength: s.ditherStrength, alphaMode: s.alphaMode });
  const exported = await fullPaletteImage(stillItem, snap, { still: true });
  for (const [mw, mh] of [[53, 37], [17, 11], [26, 37], [1, 1]]) {
    const { result, palette } = await tilePreview(stillItem, stillItem, snap, mw, mh);
    if (palette.colors.join() !== exported.colors.join()) fail('palette-mismatch', s);
    compareSampled(result, exported, 53, 37, { ...s, mw, mh });
  }
  // Independent PNG decode: RGB = palette color, A = source alpha (Keep) or 255 (Cut); empty = alpha 0.
  const bytes = await palettePngBytesAsync(exported), syncBytes = palettePngBytes(exported);
  checks++;
  if (Buffer.compare(Buffer.from(bytes), Buffer.from(syncBytes)) !== 0) fail('png-sync-async-differ', s);
  const png = decodePng(bytes);
  const colorType = bytes[25]; colorType === 6 ? pngKinds.rgba++ : pngKinds.indexed++;
  const eff = effectiveAlphaCut(s.alphaMode, 128);
  if (s.alphaMode === 'keep' && colorType !== 6) fail('keep-partial-not-rgba', s);
  if (s.alphaMode === 'cut' && colorType !== 3) fail('cut-not-indexed', s);
  for (let i = 0; i < 53 * 37; i++) {
    const a = still.data[i * 4 + 3], idx = exported.indices[i];
    const ea = a < eff ? 0 : s.alphaMode === 'keep' ? a : 255;
    if (png.data[i * 4 + 3] !== ea) { fail('png-alpha', { ...s, i, a, got: png.data[i * 4 + 3], ea }); break; }
    if (ea) {
      const v = parseInt(exported.colors[idx].slice(1), 16);
      if (png.data[i * 4] !== v >>> 16 || png.data[i * 4 + 1] !== (v >>> 8 & 255) || png.data[i * 4 + 2] !== (v & 255)) { fail('png-rgb', { ...s, i }); break; }
      // exact source member retained
      const src = still.data[i * 4] << 16 | still.data[i * 4 + 1] << 8 | still.data[i * 4 + 2];
      if (exported.colors.some(c => parseInt(c.slice(1), 16) === src) && v !== src) { fail('exact-member-lost', { ...s, i }); break; }
    }
  }
}

// Binary alpha: Keep output bytes must equal Cut128 output bytes (PNG still and GIF).
{
  const bin = sprite(40, 24, [0, 255, 255]), item = { id: 2, name: 'bin.png', original: bin, img: { w: 40, h: 24 } };
  for (const dither of ['none', '2x2']) {
    const a = await fullPaletteImage(item, conversionSnapshot({ family: 'full-palette', palette: { name: 'p', colors }, alphaCut: 128, metric: 'oklab', maxColors: 0, cleanup: false, dither, ditherStrength: 50, alphaMode: 'cut' }), { still: true });
    const b = await fullPaletteImage(item, conversionSnapshot({ family: 'full-palette', palette: { name: 'p', colors }, alphaCut: 128, metric: 'oklab', maxColors: 0, cleanup: false, dither, ditherStrength: 50, alphaMode: 'keep' }), { still: true });
    checks++;
    if (Buffer.compare(Buffer.from(await palettePngBytesAsync(a)), Buffer.from(await palettePngBytesAsync(b))) !== 0) fail('binary-keep-png-differs', { dither });
  }
}

// Animations: binary frames Keep == Cut GIF bytes; partial frame 2 Keep -> PALETTE_GIF_ALPHA; Cut -> ok.
async function gifBytes(item, mode, dither) {
  const snap = conversionSnapshot({ family: 'full-palette', palette: { name: 'p', colors }, alphaCut: 128, metric: 'oklab', maxColors: 4, cleanup: true, dither, ditherStrength: 60, alphaMode: mode });
  return encodePaletteGif(await fullPaletteImage(item, snap));
}
{
  const f = [sprite(32, 20, [0, 255, 255]), sprite(32, 20, [0, 255, 255], 3), sprite(32, 20, [0, 255, 255], 6)];
  const frames = f.map((original, i) => ({ original, delay: 80 + i * 10, img: { w: 32, h: 20 } }));
  const anim = { id: 3, name: 'a.gif', original: f[0], frames, loop: 0, img: { w: 32, h: 20 } };
  for (const dither of ['none', '8x8']) {
    const cut = await gifBytes(anim, 'cut', dither), keep = await gifBytes(anim, 'keep', dither);
    checks++;
    if (Buffer.compare(Buffer.from(cut), Buffer.from(keep)) !== 0) fail('binary-keep-gif-differs', { dither });
    // Independent decode of frames vs preview path with identical settings (full size)
    const reader = new omggif.GifReader(Buffer.from(cut));
    const snap = conversionSnapshot({ family: 'full-palette', palette: { name: 'p', colors }, alphaCut: 128, metric: 'oklab', maxColors: 4, cleanup: true, dither, ditherStrength: 60, alphaMode: 'cut' });
    for (let i = 0; i < 3; i++) {
      const rgba = new Uint8Array(32 * 20 * 4); reader.decodeAndBlitFrameRGBA(i, rgba);
      const { result, palette } = await tilePreview(anim, frames[i], snap, 32, 20);
      checks++;
      for (let p = 0; p < 640; p++) {
        const idx = result.indices[p];
        if (idx === EMPTY_INDEX) { if (rgba[p * 4 + 3] !== 0) { fail('gif-empty', { i, p }); break; } continue; }
        const v = parseInt(palette.colors[idx].slice(1), 16);
        if (rgba[p * 4] !== v >>> 16 || rgba[p * 4 + 1] !== (v >>> 8 & 255) || rgba[p * 4 + 2] !== (v & 255) || rgba[p * 4 + 3] !== 255) { fail('gif-pixel', { i, p, dither }); break; }
      }
      if (reader.frameInfo(i).delay * 10 !== frames[i].delay) fail('gif-delay', { i });
    }
  }
  // Partial alpha in only the 2nd frame (not reachable via GIF import; defensive path)
  const pf = [sprite(32, 20, [0, 255]), sprite(32, 20, [0, 127, 255]), sprite(32, 20, [0, 255])];
  const panim = { id: 4, name: 'p.gif', original: pf[0], frames: pf.map(original => ({ original, delay: 100 })), loop: 0, img: { w: 32, h: 20 } };
  checks++;
  try { await gifBytes(panim, 'keep', '4x4'); fail('partial-gif-not-rejected'); } catch (e) { if (e.code !== 'PALETTE_GIF_ALPHA') fail('partial-gif-wrong-error', { message: e.message }); }
  try { await gifBytes(panim, 'cut', '4x4'); } catch (e) { fail('partial-gif-cut-failed', { message: e.message }); }
}

// Animation cache identity
{
  const cache = createAnimationCache(1 << 20);
  const sources = [still, sprite(53, 37, partial)], palette = preparePalette(colors);
  const base = { sources, palette, alphaCut: 128, alphaMode: 'cut', metric: 'oklab', cleanup: null, dither: '4x4', ditherStrength: 50, width: 20, height: 10 };
  const h0 = cache.acquire(base);
  const variants = [{ alphaMode: 'keep' }, { dither: '8x8' }, { ditherStrength: 51 }, { dither: 'none' }, { metric: 'rgb' }];
  for (const v of variants) {
    const h = cache.acquire({ ...base, ...v });
    const r0 = await h0.getFrame(0, async () => ({ indices: new Uint16Array(200), w: 20, h: 10, used: new Uint8Array(256), hasTransparency: false, tag: 'base' }));
    const r1 = await h.getFrame(0, async () => ({ indices: new Uint16Array(200), w: 20, h: 10, used: new Uint8Array(256), hasTransparency: false, ...(v.alphaMode === 'keep' ? { alpha: new Uint8Array(200) } : {}), tag: 'v' }));
    checks++;
    if (r0 === r1 || r1.tag !== 'v') fail('cache-identity-shared', v);
    h.release();
  }
  // Keep entry receiving a Cut-shaped result must reject.
  const hk = cache.acquire({ ...base, alphaMode: 'keep', ditherStrength: 7 });
  checks++;
  try { await hk.getFrame(0, async () => ({ indices: new Uint16Array(200), w: 20, h: 10, used: new Uint8Array(256), hasTransparency: false })); fail('cache-accepted-missing-alpha'); } catch {}
  // byte accounting: 3 bytes/sample keep -> a budget that fits 2x cut but not 2x keep
  const small = createAnimationCache(2 * (20 * 10 * 2 + 256));
  checks++;
  if (!small.acquire(base)) fail('cache-cut-should-fit');
  const small2 = createAnimationCache(2 * (20 * 10 * 2 + 256));
  if (small2.acquire({ ...base, alphaMode: 'keep' })) fail('cache-keep-should-not-fit');
  h0.release();
}

console.log(JSON.stringify({ checks, settings: settingsMatrix.length, pngKinds, failureCount: failures.length, failures }, null, 1));
