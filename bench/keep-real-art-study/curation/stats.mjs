// Usage: node stats.mjs <png>... -> one JSON line per file. Decodes only with Sharp.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
export async function alphaStats(input) {
  const buf = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  const meta = await sharp(buf).metadata();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const c = { a0: 0, a1_15: 0, a16_127: 0, a128_254: 0, a255: 0 }, rgb = new Set();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) c.a0++; else if (a < 16) c.a1_15++; else if (a < 128) c.a16_127++; else if (a < 255) c.a128_254++; else c.a255++;
    if (a) rgb.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  }
  const nonzero = data.length / 4 - c.a0, partial = c.a1_15 + c.a16_127 + c.a128_254;
  return { sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length, w: info.width, h: info.height,
    format: meta.format, channels: meta.channels, depth: meta.depth, space: meta.space, palette: !!meta.isPalette, hasProfile: !!meta.icc,
    alphaStats: { ...c, nonzero, partialFraction: nonzero ? +(partial / nonzero).toFixed(4) : 0, visibleRgbColors: rgb.size } };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) for (const f of process.argv.slice(2)) {
  try { console.log(JSON.stringify({ file: f, ...(await alphaStats(f)) })); } catch (e) { console.log(JSON.stringify({ file: f, error: e.message })); }
}
