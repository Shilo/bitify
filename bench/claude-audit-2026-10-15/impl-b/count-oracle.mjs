// Impl-B audit: Count output colors vs an independent decode of the actual saved file.
// Oracle: encode with the app's export path (fileBytes), decode with Sharp/libvips
// (independent PNG/GIF decoder), count distinct RGB among alpha>0 pixels across all
// frames. Count must equal that set exactly, in every snapshot combination.
// Run: node bench/claude-audit-2026-10-15/impl-b/count-oracle.mjs
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const sharp = require('sharp');
const root = new URL('../../../src/lib/', import.meta.url);
const { collectPaletteUsage } = await import(new URL('palette-usage.js', root));
const { fullPaletteImage } = await import(new URL('palette-state.js', root));
const { fileBytes } = await import(new URL('save.js', root));

function img(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
}
// Frame A: grays only. Frame B: saturated colors appear only here (union != first frame).
const A = img(16, 16, (x, y) => [x * 16, x * 16, y * 16, 255]);
const B = img(16, 16, (x, y) => x < 8 ? [255, 0, 0, 255] : [0, 0, 255, y < 4 ? 0 : 255]);
// Alpha fixture: hidden alpha-0 green must never count; alpha 1/64/127/254 visible under Keep.
const alphaImg = img(8, 1, x => [[0,255,0,0],[255,255,0,1],[255,0,255,64],[0,255,255,127],[200,10,10,128],[10,10,200,192],[120,120,120,254],[0,0,0,255]][x]);
const gradient = img(64, 8, x => [x * 4, 255 - x * 4, 128, 255]);

const palettes = { edg8: ['#fdfdf8','#d32734','#da7d22','#e6da29','#28c641','#2d93dd','#7b53ad','#1b1c33'], bw: ['#000000','#ffffff'] };
async function oracle(bytes, animated) {
  const { data, info } = await sharp(Buffer.from(bytes), animated ? { pages: -1 } : {}).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const set = new Set();
  for (let p = 0; p < data.length; p += 4) if (data[p + 3] > 0) set.add((data[p] << 16 | data[p + 1] << 8 | data[p + 2]).toString(16).padStart(6, '0'));
  return { set, pages: info.pages ?? 1 };
}
const cases = [];
for (const [name, item, animated] of [
  ['gif-union', { name: 'a.gif', original: A, loop: 0, frames: [{ original: A, delay: 100 }, { original: B, delay: 100 }] }, true],
  ['alpha', { name: 'alpha.png', original: alphaImg }, false],
  ['gradient', { name: 'g.png', original: gradient }, false],
]) for (const pal of Object.keys(palettes)) for (const alphaMode of ['cut', 'keep']) for (const dither of ['none', '4x4']) for (const maxColors of [0, 2]) for (const cleanup of [false, true]) {
  if (animated && alphaMode === 'keep') continue; // GIF has no partial alpha; B frame alpha is binary
  const snapshot = { family: 'full-palette', colors: palettes[pal], alphaCut: 128, alphaMode, metric: 'oklab', maxColors, cleanup, dither, ditherStrength: 100 };
  const usage = await collectPaletteUsage(item, snapshot);
  const image = await fullPaletteImage(item, snapshot);
  let bytes;
  try { bytes = await fileBytes(image); } catch (e) { cases.push({ name, pal, alphaMode, dither, maxColors, cleanup, error: e.message }); continue; }
  const { set, pages } = await oracle(bytes, animated);
  const got = new Set(usage.colors.map(c => c.slice(1)));
  const ok = got.size === set.size && [...set].every(c => got.has(c)) && usage.count === set.size;
  cases.push({ name, pal, alphaMode, dither, maxColors, cleanup, count: usage.count, oracle: set.size, pages, frames: usage.frames, ok });
}
// First-frame-only would be a bug: show the gif case has more colors than frame A alone.
const firstOnly = await collectPaletteUsage({ name: 'a.png', original: A }, { family: 'full-palette', colors: palettes.edg8, alphaCut: 128, alphaMode: 'cut', metric: 'oklab', maxColors: 0, cleanup: false, dither: 'none', ditherStrength: 50 });
const union = cases.find(c => c.name === 'gif-union' && c.pal === 'edg8' && c.dither === 'none' && !c.maxColors && !c.cleanup);
const failed = cases.filter(c => !c.ok);
console.log(JSON.stringify({ total: cases.length, failed, firstFrameOnly: firstOnly.count, gifUnion: union?.count, sample: cases.slice(0, 4) }, null, 1));
process.exitCode = failed.length ? 1 : 0;
