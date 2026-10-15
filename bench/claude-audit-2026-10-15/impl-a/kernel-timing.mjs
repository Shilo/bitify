// Node kernel timing (desktop, not phone): 1024x1024 high-entropy noise and a 6-color sprite, Off vs 8x8/100.
import { quantize, preparePalette } from '../../../src/lib/quantize.js';
let seed = 3; const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296), ri = n => Math.floor(rand() * n);
const N = 1024, noise = new Uint8ClampedArray(N * N * 4), sprite = new Uint8ClampedArray(N * N * 4);
for (let i = 0; i < N * N; i++) { noise.set([ri(256), ri(256), ri(256), 255], i * 4); const b = (i >> 6) % 6; sprite.set([b * 40, 255 - b * 40, b * 20, 255], i * 4); }
const pal = n => preparePalette(Array.from({ length: n }, (_, i) => '#' + ((i * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0')));
const rows = [];
for (const [name, data] of [['noise', noise], ['sprite', sprite]]) for (const n of [8, 64, 256]) for (const [mode, s] of [['none', 50], ['8x8', 100]]) {
  const p = pal(n), img = { width: N, height: N, data };
  quantize({ width: 64, height: 64, data: data.subarray(0, 64 * 64 * 4) }, p, 128, undefined, undefined, { dither: mode, ditherStrength: s });
  const t = performance.now(); quantize(img, p, 128, undefined, undefined, { dither: mode, ditherStrength: s }); rows.push({ name, colors: n, mode, ms: Math.round(performance.now() - t) });
}
console.log(JSON.stringify({ node: process.version, cpuNote: 'desktop Node; not phone', rows }, null, 1));
