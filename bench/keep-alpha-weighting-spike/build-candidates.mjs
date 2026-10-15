// Research copies only. No production source is written.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const root = new URL('../../', import.meta.url);
const hashes = {};
for (const [name, fn] of [['palette-generated', 'generated'], ['palette-limit', 'limit']]) {
  const source = await fs.readFile(new URL(`src/lib/${name}.js`, root), 'utf8');
  hashes[name] = crypto.createHash('sha256').update(source).digest('hex');
  let next = source.replaceAll("from './", "from '../../src/lib/");
  if (fn === 'generated') {
    next = next.replace('createGeneratedAccumulator(alphaCut = 128, { signal } = {})', "createGeneratedAccumulator(alphaCut = 128, { signal, alphaWeight = 'none' } = {})");
    next = next.replace('  checkCanceled(signal);', "  const opacityMass = makeOpacityMass(alphaWeight);\n  checkCanceled(signal);");
    const start = next.indexOf('    async addChunk('), end = next.indexOf('    async endAsset(');
    let block = next.slice(start, end);
    block = block.replace('          const rgb =', '          const pixelWeight = weight * opacityMass[data[at + 3]];\n          const rgb =');
    block = block.replaceAll('old + weight', 'old + pixelWeight').replaceAll('histogram.set(rgb, weight)', 'histogram.set(rgb, pixelWeight)').replaceAll('binAdd(bins, rgb, weight)', 'binAdd(bins, rgb, pixelWeight)');
    next = next.slice(0, start) + block + next.slice(end);
    next = next.replace('generatePaletteAsync(snapshot, { signal } = {})', "generatePaletteAsync(snapshot, { signal, alphaWeight = 'none' } = {})");
    next = next.replace('createGeneratedAccumulator(snapshot.alphaCut, { signal })', 'createGeneratedAccumulator(snapshot.alphaCut, { signal, alphaWeight })');
  } else {
    next = next.replace("metric = 'oklab', signal }", "metric = 'oklab', signal, alphaWeight = 'none' }");
    next = next.replace('  const palette =', '  const opacityMass = makeOpacityMass(alphaWeight);\n  const palette =');
    next = next.replaceAll('if (data[at + 3] >= alphaCut) {', 'if (data[at + 3] >= alphaCut) {\n        const pixelWeight = weight * opacityMass[data[at + 3]];');
    next = next.replaceAll('old.weight += weight', 'old.weight += pixelWeight').replaceAll('{ weight, winner, cost, vector:', '{ weight: pixelWeight, winner, cost, vector:');
    next = next.replaceAll('addBin(rgb, scratch, weight)', 'addBin(rgb, scratch, pixelWeight)').replaceAll('frequency[winner] += weight; fullCost += cost * weight', 'frequency[winner] += pixelWeight; fullCost += cost * pixelWeight');
    next = next.replaceAll('cost += fitted * weight; popularCost += baseline * weight', 'cost += fitted * pixelWeight; popularCost += baseline * pixelWeight');
  }
  const prelude = `// RESEARCH ONLY: fixed source hash ${hashes[name]}\nfunction makeOpacityMass(mode) {\n  if (!['none', 'linear', 'squared'].includes(mode)) throw new Error('Invalid research weighting');\n  return Float64Array.from({length:256}, (_, a) => mode === 'none' ? 1 : mode === 'linear' ? a / 255 : (a / 255) ** 2);\n}\n`;
  await fs.writeFile(new URL(`./${name}.candidate.js`, import.meta.url), prelude + next);
}
await fs.writeFile(new URL('./source-hashes.json', import.meta.url), JSON.stringify(hashes, null, 2) + '\n');
