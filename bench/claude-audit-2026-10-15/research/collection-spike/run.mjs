import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { selectPaletteSubset } from '../../../../src/lib/palette-limit.js';
import { quantize } from '../../../../src/lib/quantize.js';

// Original synthetic fixtures. This investigates collection semantics using the
// existing limiter; it does not implement a new app feature.
const palette = ['#000000', '#FFFFFF', '#FF0000', '#0000FF'];
function fixture(accent, count = 100) {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    const color = i < count * .5 ? [0, 0, 0] : i < count * .95 ? accent : [150, 0, 150];
    data.set([...color, 255], i * 4);
  }
  return { width: count, height: 1, data };
}
const assets = [fixture([255, 0, 0]), fixture([0, 0, 255])];
const chunks = (items, normalize) => async function* () {
  for (const item of items) yield { data: item.data, weight: normalize ? 1 / (item.width * item.height) : 1 };
};
function mapping(item, colors) {
  const result = quantize(item, colors);
  return { used: [...new Set(result.indices)].map(i => colors[i]), sharedProbe: colors[result.indices.at(-1)] };
}
const individual = [];
for (const item of assets) {
  const subset = await selectPaletteSubset(palette, 2, chunks([item], false));
  const colors = subset.indices.map(i => palette[i]);
  individual.push({ colors, ...mapping(item, colors), weightedSquaredError: subset.cost });
}
const common = await selectPaletteSubset(palette, 2, chunks(assets, true));
const colors = common.indices.map(i => palette[i]);
const collection = { colors, assets: assets.map(item => mapping(item, colors)), equalAssetSquaredError: common.cost };
const union = [...new Set(individual.flatMap(item => item.used))];
assert.equal(individual.every(item => item.used.length <= 2), true);
assert.equal(union.length, 3);
assert.equal(new Set(collection.assets.flatMap(item => item.used)).size <= 2, true);
assert.notEqual(individual[0].sharedProbe, individual[1].sharedProbe);
assert.equal(collection.assets[0].sharedProbe, collection.assets[1].sharedProbe);

// Unequal sizes expose why collection weighting must be an explicit decision.
const unequal = [fixture([255, 0, 0], 1000), fixture([0, 0, 255], 100)];
const weighting = {};
for (const normalize of [false, true]) {
  const selected = await selectPaletteSubset(palette, 2, chunks(unequal, normalize));
  weighting[normalize ? 'equalAsset' : 'pixelMass'] = selected.indices.map(i => palette[i]);
}
const report = {
  fixture: 'two original 100 pixel assets, each 50 black, 45 red or blue, 5 common purple',
  target: palette, cap: 2, individual, individualUnion: union, collection, unequalSizeWeighting: weighting,
  conclusion: 'A per-image cap does not impose a collection cap. Shared source colors can map differently with independent subsets. A shared subset enforces a common bound but sacrifices asset-specific accents.',
};
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
