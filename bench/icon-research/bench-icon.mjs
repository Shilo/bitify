import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = import.meta.dirname;
// Compare one module per process: node bench-icon.mjs [module] [output-json].
const { analyze, mask } = await import(pathToFileURL(process.argv[2] ? resolve(process.argv[2]) : `${root}/../../src/lib/bitify.js`));
const rows = JSON.parse(readFileSync(`${root}/inputs.json`)).filter(r => r.variant === 'original' && !r.id.endsWith('sheet'));
const originals = rows.map(r => ({ ...r, data: Uint8ClampedArray.from(r.data) }));
const time = fn => { const start = performance.now(); fn(); return +(performance.now() - start).toFixed(3); };
const images = originals.map(src => analyze(src));
// Warm the engine, then clear the preparation cache for each timing of the first pass.
for (let i = 0; i < 8; i++) for (const image of images) mask(image, 'icon');
const first = Math.min(...Array.from({ length: 5 }, () => time(() => { for (const image of images) { delete image.icons; mask(image, 'icon'); } })));
const cached = Math.min(...Array.from({ length: 5 }, () => time(() => { for (const image of images) mask(image, 'icon', { detail: 70 }); })));
const result = { inventory: { items: images.length, firstMs: first, cachedMs: cached }, stress: [] };
for (const [w, h] of [[512, 512], [2048, 2048], [4000, 3000]]) {
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 73;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    data.set([seed & 255, (seed >>> 8) & 255, (seed >>> 16) & 255, 255], i);
  }
  const image = analyze({ width: w, height: h, data });
  const firstMs = time(() => mask(image, 'icon'));
  const cachedMs = time(() => mask(image, 'icon', { detail: 70 }));
  result.stress.push({ w, h, firstMs, cachedMs });
}
writeFileSync(process.argv[3] ? resolve(process.argv[3]) : `${root}/icon-performance.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
