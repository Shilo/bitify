// Owned synthetic held-out fixtures for the Claude service audit. Offline.
// Writes fixtures/*.png and fixtures/manifest.json; verifies each with Sharp.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { png, sha } from '../../palette-service-research/api-common.mjs';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = path.join(import.meta.dirname, 'fixtures');
fs.mkdirSync(dir, { recursive: true });
const hex = c => [...Buffer.from(c.replace('#', ''), 'hex'), 255];

// Knight: label grid -> colors. Shapes shaded light/mid/dark by column inside the shape.
const C = {
  outline: '#1a1420', skin: ['#f2c79b', '#d9966b', '#a8603f'], metal: ['#e8eef2', '#a9b4c2', '#6c7a8c', '#3d4655'],
  cloth: ['#d4364a', '#962638', '#5c1a2c'], wood: ['#b07a46', '#7a4f2c', '#4a2f1c'], eye: '#2a7fff', gem: '#3ee07a', spec: '#ffffff',
};
function knight(swordUp) {
  const W = 24, H = 24, grid = Array.from({ length: H }, () => Array(W).fill(null));
  const rect = (x0, y0, x1, y1, ramp) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0); grid[y][x] = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]; } };
  rect(8, 2, 15, 6, C.metal);        // helm
  rect(9, 6, 14, 9, C.skin);         // face
  rect(7, 10, 16, 15, C.metal);      // breastplate
  rect(10, 11, 13, 17, C.cloth);     // tabard
  rect(8, 16, 10, 20, C.wood);       // left leg / boot
  rect(13, 16, 15, 20, C.wood);      // right leg / boot
  rect(3, 10, 6, 16, C.wood);        // shield (wood)
  const s = swordUp ? -4 : 0;        // sword moves between frames
  rect(18, 4 + s, 19, 13 + s, C.metal); // blade
  rect(17, 14 + s, 20, 14 + s, C.wood); // guard
  rect(18, 15 + s, 19, 17 + s, C.wood); // grip
  grid[7][10] = C.eye; grid[7][13] = C.eye; // two-pixel eyes (rare)
  grid[13][4] = C.gem;                        // one-pixel shield gem (rare)
  grid[11][8] = C.spec;                       // one-pixel specular (rare)
  const filled = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] && grid[y][x] !== C.outline;
  const out = grid.map((row, y) => row.map((c, x) => c ?? ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled(x + dx, y + dy)) ? C.outline : null)));
  return png(W, H, (x, y) => out[y][x] ? hex(out[y][x]) : [0, 0, 0, 0]);
}
// Saturated hue x lightness ramp, 64x16 (HSL, s=1).
function hsl(h, s, l) { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0), f(8), f(4)].map(v => Math.round(v * 255)); }
const hue = png(64, 16, (x, y) => [...hsl(x * 360 / 64, 1, .2 + y * .65 / 15), 255]);
// Glow with alpha bands 255/254/192/128/127/64/1/0; right-half faint bands carry green spill RGB.
const glow = png(32, 32, (x, y) => {
  const r = Math.hypot(x - 15.5, y - 15.5), spill = x >= 16;
  if (r < 2.5) return [255, 243, 176, 255];
  if (r < 6) return [255, 138, 30, 255];
  if (r < 7) return [240, 110, 24, 254];
  if (r < 8) return [220, 90, 20, 192];
  if (r < 9) return [200, 70, 16, 128];
  if (r < 10) return [190, 60, 14, 127];
  if (r < 11.5) return spill ? [32, 224, 64, 64] : [170, 50, 12, 64];
  if (r < 14) return spill ? [0, 255, 64, 1] : [150, 40, 10, 1];
  return [0, 0, 0, 0];
});
const strip = colors => png(colors.length, 1, x => hex(colors[x]));
const preset = id => FULL_PRESETS.find(p => p.id === 'preset-' + id).colors;
const files = {
  'knight-a.png': knight(false), 'knight-b.png': knight(true), 'hue-ramp.png': hue, 'glow-alpha.png': glow,
  'target-pico8.png': strip(preset('pico8')), 'target-edg8.png': strip(preset('edg8')), 'tiny-2x2.png': png(2, 2, x => x ? [255, 0, 0, 255] : [0, 0, 255, 255]),
};
const manifest = { at: new Date().toISOString(), note: 'Owned synthetic fixtures created for this audit; no user art.', rareCoordinates: { eye: [[10, 7], [13, 7]], gem: [[4, 13]], specular: [[8, 11]] }, files: {} };
for (const [name, bytes] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), bytes);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colors = new Set(), alphas = {};
  for (let p = 0; p < data.length; p += 4) { alphas[data[p + 3]] = (alphas[data[p + 3]] ?? 0) + 1; if (data[p + 3]) colors.add(data.readUIntBE(p, 3)); }
  manifest.files[name] = { pngSha256: sha(bytes), rgbaSha256: sha(data), width: info.width, height: info.height, visibleRgb: colors.size, alphaHistogram: alphas };
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(Object.fromEntries(Object.entries(manifest.files).map(([n, f]) => [n, `${f.width}x${f.height} rgb${f.visibleRgb} alphas ${Object.keys(f.alphaHistogram).join('/')}`])));
