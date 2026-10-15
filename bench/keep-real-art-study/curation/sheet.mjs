// Usage: node sheet.mjs <out.png> <cellPx> <png>...  Contact sheet of SOURCE art only, each fitted into a cell
// over a checkerboard (top) and black (bottom), nearest-neighbour. For curator inspection, not evaluation.
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const [out, cellArg, ...files] = process.argv.slice(2);
const cell = +cellArg, cols = Math.min(files.length, 6), rows = Math.ceil(files.length / cols);
const W = cols * cell, H = rows * cell * 2;
const bg = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const top = Math.floor(y / cell) % 2 === 0, v = top ? (((x >> 3) + (y >> 3)) & 1 ? 200 : 120) : 0;
  bg.fill(v, (y * W + x) * 3, (y * W + x) * 3 + 3);
}
const comps = [];
for (const [i, f] of files.entries()) {
  const m = await sharp(f).metadata(), s = Math.min(cell / m.width, cell / m.height);
  const k = s >= 1 ? Math.floor(s) : s;
  const w = Math.max(1, Math.round(m.width * k)), h = Math.max(1, Math.round(m.height * k));
  const img = await sharp(f).ensureAlpha().resize(w, h, { kernel: s >= 1 ? 'nearest' : 'lanczos3' }).png().toBuffer();
  const left = (i % cols) * cell, top = Math.floor(i / cols) * cell * 2;
  comps.push({ input: img, left, top }, { input: img, left, top: top + cell });
}
await sharp(bg, { raw: { width: W, height: H, channels: 3 } }).composite(comps).png().toFile(out);
console.log(out, W, H);
