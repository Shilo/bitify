// RESEARCH ONLY (round 2). Per cohort file: grayscale share and RGB luminance by alpha band,
// to test whether faint pixels carry black-matte / premultiplied-style dark RGB.
// Usage: node faint-rgb.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const cohort = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../cohort');
const manifest = JSON.parse(await fs.readFile(path.join(cohort, 'manifest.json'), 'utf8'));
const bands = [[1, 15], [16, 63], [64, 127], [128, 254], [255, 255]];
const rows = [];
for (const e of manifest) {
  if (e.animation && e.animation.frameIndex > 0) continue; // first frame per animation
  const { data } = await sharp(path.join(cohort, e.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const acc = bands.map(() => ({ n: 0, luma: 0, max: 0 })); let vis = 0, gray = 0, sxy = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
  for (let p = 0; p < data.length; p += 4) {
    const a = data[p + 3]; if (!a) continue; vis++;
    const r = data[p], g = data[p + 1], b = data[p + 2], y = .2126 * r + .7152 * g + .0722 * b, mx = Math.max(r, g, b);
    if (Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2) gray++;
    const i = bands.findIndex(([lo, hi]) => a >= lo && a <= hi), s = acc[i]; s.n++; s.luma += y; s.max += mx;
    sx += a; sy += mx; sxy += a * mx; sxx += a * a; syy += mx * mx;
  }
  const corr = (vis * sxy - sx * sy) / Math.sqrt((vis * sxx - sx * sx) * (vis * syy - sy * sy) || 1);
  rows.push({ id: e.animation ? e.animation.group : e.id, category: e.category, grayShare: +(gray / vis).toFixed(3), alphaVsMaxChannelCorr: +corr.toFixed(3),
    meanMaxChannelByAlpha: Object.fromEntries(bands.map(([lo, hi], i) => [`${lo}-${hi}`, acc[i].n ? +(acc[i].max / acc[i].n).toFixed(1) : null])),
    nByAlpha: Object.fromEntries(bands.map(([lo, hi], i) => [`${lo}-${hi}`, acc[i].n])) });
}
await fs.writeFile(new URL('./faint-rgb.json', import.meta.url), JSON.stringify(rows, null, 1) + '\n');
for (const r of rows) console.log(r.id.padEnd(36), r.category.padEnd(12), 'gray', String(r.grayShare).padEnd(6), 'corr', String(r.alphaVsMaxChannelCorr).padEnd(7), JSON.stringify(r.meanMaxChannelByAlpha));
