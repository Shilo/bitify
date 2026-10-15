// Usage: node cells.mjs <png> <cellW> <cellH>     -> per-cell nonzero/partial alpha counts (row-major index)
//        node cells.mjs <png> bbox x y w h         -> alpha>0 bounding box inside a rough rect
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const [file, a, ...rest] = process.argv.slice(2);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const A = (x, y) => data[(y * info.width + x) * 4 + 3];
if (a === 'bbox') {
  const [x0, y0, w, h] = rest.map(Number);
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = y0; y < Math.min(info.height, y0 + h); y++) for (let x = x0; x < Math.min(info.width, x0 + w); x++) if (A(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  console.log({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
} else {
  const cw = +a, ch = +rest[0], cols = Math.floor(info.width / cw), rows = Math.floor(info.height / ch), out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let nz = 0, part = 0, edge = 0;
    for (let y = r * ch; y < (r + 1) * ch; y++) for (let x = c * cw; x < (c + 1) * cw; x++) { const v = A(x, y); if (v) { nz++; if (v < 255) part++; if (x === c * cw || y === r * ch || x === (c + 1) * cw - 1 || y === (r + 1) * ch - 1) edge++; } }
    out.push(`${r * cols + c}:${nz}/${part}${edge ? '/E' + edge : ''}`);
  }
  console.log(info.width + 'x' + info.height, cols + 'x' + rows, out.join(' '));
}
