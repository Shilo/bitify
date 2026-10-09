// Reproduce the implementation comparison and preprocessing tests using production code.
import { readFileSync, writeFileSync } from 'node:fs';
import { analyze, mask } from '../../src/lib/bitify.js';
const root = import.meta.dirname;
const sources = JSON.parse(readFileSync(`${root}/inputs.json`));
const rows = sources.map(src => {
  const image = analyze({ ...src, data: Uint8ClampedArray.from(src.data) });
  return { ...src, old: [...mask(image, 'stencil')], fresh: [...mask(image, 'icon')], low: [...mask(image, 'icon', { detail: 0 })], high: [...mask(image, 'icon', { detail: 100 })] };
});
writeFileSync(`${root}/implemented.json`, JSON.stringify(rows.filter(r => r.variant === 'original').map(r => ({ ...r, w: r.width, h: r.height }))));
writeFileSync(`${root}/icon-variants.json`, JSON.stringify(rows));
const originals = rows.filter(r => r.variant === 'original' && !r.id.endsWith('sheet'));
const comparisons = {};
for (const variant of [...new Set(rows.map(r => r.variant))].filter(v => v !== 'original')) {
  let changedItems = 0, changedPixels = 0, vanished = 0;
  for (const original of originals) {
    const other = rows.find(r => r.id === original.id && r.variant === variant);
    const different = other.fresh.filter((v, i) => (v === 2) !== (original.fresh[i] === 2)).length;
    changedItems += +!!different; changedPixels += different;
    vanished += +!other.fresh.includes(2);
  }
  comparisons[variant] = { changedItems, changedPixels, vanished };
}
const breastplate = originals[0];
const metrics = { items: originals.length, variants: rows.length, comparisons, breastplate: Object.fromEntries(['old', 'fresh', 'low', 'high'].map(key => [key, breastplate[key].filter(v => v === 2).length])) };
writeFileSync(`${root}/icon-evaluation.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
