// Design probe (not a bug claim): under Keep, cap/Auto eligibility is cut1 with no alpha weighting,
// so a large faint halo can take a cap slot from visible opaque art.
import { preparePalette, quantize } from '../../../src/lib/quantize.js';
import { getLimitedPalette } from '../../../src/lib/palette-limit-client.js';
const W = 40, H = 40, data = new Uint8ClampedArray(W * H * 4);
const art = [[220, 30, 30], [30, 200, 40], [40, 60, 220]];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = (y * W + x) * 4, inside = x >= 10 && x < 30 && y >= 10 && y < 30;
  if (inside) data.set([...art[(x - 10) % 3 === 0 ? 0 : (y - 10) % 2 ? 1 : 2], 255], p);
  else data.set([255, 0, 255, 6], p); // faint magenta halo, alpha 6 (about 2% opacity)
}
const palette = preparePalette(['#dc1e1e', '#1ec828', '#283cdc', '#ff00ff', '#000000', '#ffffff']);
for (const [mode, cut] of [['cut', 128], ['keep', 1]]) {
  const limited = await getLimitedPalette({ original: { width: W, height: H, data } }, palette, cut, 'oklab', 3, {});
  const r = quantize({ width: W, height: H, data }, limited, 128, undefined, undefined, { alphaMode: mode });
  let opaqueWrong = 0; for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] === 255) { const want = '#' + [...data.subarray(i * 4, i * 4 + 3)].map(v => v.toString(16).padStart(2, '0')).join(''); if (limited.colors[r.indices[i]] !== want) opaqueWrong++; }
  console.log(JSON.stringify({ mode, cap: 3, subset: limited.colors, opaquePixelsChanged: opaqueWrong, opaquePixels: 400 }));
}
