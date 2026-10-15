// Confirms the agreement fixtures exercise Cleanup replacements, cap subsets and dither texture.
import { preparePalette, quantize } from '../../../src/lib/quantize.js';
import { getLimitedPalette } from '../../../src/lib/palette-limit-client.js';
import { getPaletteCleanup } from '../../../src/lib/palette-cleanup-client.js';
let seed = 99;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296), ri = n => Math.floor(rand() * n);
function sprite(w, h, alphas, shift = 0) {
  const data = new Uint8ClampedArray(w * h * 4), base = [[200, 40, 40], [40, 180, 60], [30, 30, 200], [240, 220, 90], [128, 128, 128], [17, 17, 17]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, c = base[((x + shift) >> 3) + (y >> 3) & 5];
    data.set([Math.min(255, c[0] + ri(24)), Math.min(255, c[1] + ri(24)), Math.min(255, c[2] + ri(24))], p);
    if (ri(29) === 0) data.set([ri(256), ri(256), ri(256)], p);
    data[p + 3] = alphas[ri(alphas.length)];
  }
  return { width: w, height: h, data };
}
const colors = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
const still = sprite(53, 37, [0, 1, 64, 127, 128, 192, 254, 255, 255, 255]);
const item = { original: still };
for (const cut of [1, 128]) {
  const full = preparePalette(colors);
  const lim = await getLimitedPalette(item, full, cut, 'oklab', 4, {});
  const clean = await getPaletteCleanup(item, full, cut, 'oklab', {});
  let replaced = 0; for (const v of clean.replacements) if (v !== 256) replaced++;
  const n = quantize(still, full, cut), d = quantize(still, full, cut, undefined, undefined, { dither: '4x4', ditherStrength: 50 });
  let diff = 0; for (let i = 0; i < n.indices.length; i++) if (n.indices[i] !== d.indices[i]) diff++;
  console.log(JSON.stringify({ cut, limitedSize: lim.size, cleanupReplacements: replaced, ditherChangedPixels: diff }));
}
