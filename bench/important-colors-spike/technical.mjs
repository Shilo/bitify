// Technical invariants, not additions to the frozen artistic acceptance cohort.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';
import { framesOf, render, targetFor, hashFrames, measure } from './core.mjs';
const dir = import.meta.dirname;
const device = JSON.parse(await fs.readFile(new URL('./device-input.json', import.meta.url)));
const report = { scope: 'Technical invariants only; no artistic acceptance claims.', checks: [], performance: [] };
function image(width, height, pixel) { const data = new Uint8ClampedArray(width * height * 4); for (let p = 0; p < width * height; p++) data.set(pixel(p), p * 4); return { width, height, data }; }
const high = { id: 'technical-binned', original: image(96, 64, p => { const v = Math.imul(p, 2654435761) & 0xffffff; return [v >>> 16, v >>> 8 & 255, v & 255, 255]; }), regions: [] };
const exact = { id: 'technical-exact', original: image(32, 16, p => [...[[220, 20, 50], [20, 180, 180], [12, 24, 45], [220, 230, 245]][p % 4], [0, 1, 127, 128, 254, 255][p % 6]]), regions: [] };
const stress = { id: 'technical-stress4096', original: image(128, 256, p => { const v = p % 4096; return [(v >>> 8) * 17, (v >>> 4 & 15) * 17, (v & 15) * 17, 255]; }), regions: [] };
const hueBoundary = { id: 'technical-hue-boundary', original: image(32, 32, p => p % 200 === 0 ? [140, 91 + p % 2, 91, 255] : p % 41 === 0 ? [120 + p % 2, 124, 124, 255] : [20 + p % 24, 40 + p % 24, 80 + p % 24, 255]), regions: [] };
const colors = FULL_PRESETS.find(p => p.id === 'preset-res64').colors;
const serial = item => ({ ...item, original: { ...item.original, data: [...item.original.data] } });
for (const item of [high, exact, stress, hueBoundary]) device.items.push(serial(item));
for (const item of [high, exact, hueBoundary]) for (const alphaMode of ['cut', 'keep']) for (const dither of ['none', '4x4']) for (const method of ['baseline', 'concave', 'hue']) {
  const options = { method, cap: 4, metric: 'oklab', alphaMode, alphaCut: 128, dither };
  const target = item === exact ? await targetFor([item], null, alphaMode === 'keep' ? 1 : 128) : colors;
  const output = await render(item, target, options), hash = await hashFrames(output.outputs), metrics = measure(item, output, options);
  assert.equal(metrics.alphaWrong, 0); assert.equal(metrics.membershipWrong, 0); assert(metrics.usedCount <= 4);
  if (item === high && method !== 'baseline') { const baseline = await render(item, target, { ...options, method: 'baseline' }); assert(output.selection.binned); assert.equal(hash, await hashFrames(baseline.outputs), 'Binned path must remain unchanged'); }
  if (item === exact) assert.equal(metrics.pointLab, 0, 'Visible exact RGBA must remain exact');
  const row = { id: `${item.id}-${alphaMode}-${dither}-${method}`, item: item.id, colors: target, options, hash };
  report.checks.push({ ...row, metrics }); device.cases.push(row);
}
for (const method of ['baseline', 'concave', 'hue']) {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(render(stress, colors, { method, cap: 8, metric: 'oklab', signal: controller.signal }), error => error.name === 'AbortError');
  report.checks.push({ id: `${method}-precanceled`, passed: true });
  const values = [];
  await render(stress, colors, { method, cap: 8, metric: 'oklab' });
  for (let i = 0; i < 3; i++) values.push((await render(stress, colors, { method, cap: 8, metric: 'oklab' })).selectMs);
  report.performance.push({ method, selectMs: values });
}
device.performance.push({ id: 'technical-stress4096-selection', item: stress.id, colors, options: { cap: 8, metric: 'oklab', alphaCut: 128, alphaMode: 'cut' } });
await fs.writeFile(new URL('./technical-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
await fs.writeFile(new URL('./device-input.json', import.meta.url), JSON.stringify(device));
console.log(`Technical checks ${report.checks.length}; device ${device.cases.length} cases +${device.invariants.length} invariants.`);
console.log(report.performance);
