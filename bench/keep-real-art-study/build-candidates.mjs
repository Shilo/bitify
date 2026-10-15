// RESEARCH ONLY. Same transform as bench/keep-alpha-weighting-spike/build-candidates.mjs,
// but writes to a separate directory and fails if any replacement no longer applies
// (the spike script would silently produce an unweighted copy). Never touches src/
// or the spike files. Used by evaluate.mjs only when the spike's recorded hashes
// no longer match src/lib at HEAD.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const sourceHash = async name => crypto.createHash('sha256').update(await fs.readFile(path.join(root, 'src/lib', name + '.js'), 'utf8')).digest('hex');

function replace(text, from, to, all = false) {
  const next = all ? text.replaceAll(from, to) : text.replace(from, to);
  if (next === text) throw new Error(`Candidate transform no longer applies: ${String(from).slice(0, 60)}`);
  return next;
}

export async function buildCandidates(outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const prefix = path.relative(outDir, path.join(root, 'src/lib')).split(path.sep).join('/') + '/';
  const hashes = {};
  for (const [name, fn] of [['palette-generated', 'generated'], ['palette-limit', 'limit']]) {
    const source = await fs.readFile(path.join(root, 'src/lib', name + '.js'), 'utf8');
    hashes[name] = crypto.createHash('sha256').update(source).digest('hex');
    let next = replace(source, "from './", `from '${prefix}`, true);
    if (fn === 'generated') {
      next = replace(next, 'createGeneratedAccumulator(alphaCut = 128, { signal } = {})', "createGeneratedAccumulator(alphaCut = 128, { signal, alphaWeight = 'none' } = {})");
      next = replace(next, '  checkCanceled(signal);', "  const opacityMass = makeOpacityMass(alphaWeight);\n  checkCanceled(signal);");
      const start = next.indexOf('    async addChunk('), end = next.indexOf('    async endAsset(');
      if (start < 0 || end < start) throw new Error('Candidate transform: addChunk block not found');
      let block = next.slice(start, end);
      block = replace(block, '          const rgb =', '          const pixelWeight = weight * opacityMass[data[at + 3]];\n          const rgb =');
      block = replace(replace(replace(block, 'old + weight', 'old + pixelWeight', true), 'histogram.set(rgb, weight)', 'histogram.set(rgb, pixelWeight)', true), 'binAdd(bins, rgb, weight)', 'binAdd(bins, rgb, pixelWeight)', true);
      next = next.slice(0, start) + block + next.slice(end);
      next = replace(next, 'generatePaletteAsync(snapshot, { signal } = {})', "generatePaletteAsync(snapshot, { signal, alphaWeight = 'none' } = {})");
      next = replace(next, 'createGeneratedAccumulator(snapshot.alphaCut, { signal })', 'createGeneratedAccumulator(snapshot.alphaCut, { signal, alphaWeight })');
    } else {
      next = replace(next, "metric = 'oklab', signal }", "metric = 'oklab', signal, alphaWeight = 'none' }");
      next = replace(next, '  const palette =', '  const opacityMass = makeOpacityMass(alphaWeight);\n  const palette =');
      next = replace(next, 'if (data[at + 3] >= alphaCut) {', 'if (data[at + 3] >= alphaCut) {\n        const pixelWeight = weight * opacityMass[data[at + 3]];', true);
      next = replace(replace(next, 'old.weight += weight', 'old.weight += pixelWeight', true), '{ weight, winner, cost, vector:', '{ weight: pixelWeight, winner, cost, vector:', true);
      next = replace(replace(next, 'addBin(rgb, scratch, weight)', 'addBin(rgb, scratch, pixelWeight)', true), 'frequency[winner] += weight; fullCost += cost * weight', 'frequency[winner] += pixelWeight; fullCost += cost * pixelWeight', true);
      next = replace(next, 'cost += fitted * weight; popularCost += baseline * weight', 'cost += fitted * pixelWeight; popularCost += baseline * pixelWeight', true);
    }
    const prelude = `// RESEARCH ONLY: fixed source hash ${hashes[name]}\nfunction makeOpacityMass(mode) {\n  if (!['none', 'linear', 'squared'].includes(mode)) throw new Error('Invalid research weighting');\n  return Float64Array.from({length:256}, (_, a) => mode === 'none' ? 1 : mode === 'linear' ? a / 255 : (a / 255) ** 2);\n}\n`;
    await fs.writeFile(path.join(outDir, `${name}.candidate.js`), prelude + next);
  }
  await fs.writeFile(path.join(outDir, 'source-hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
  return hashes;
}

// `node build-candidates.mjs --check <tmpdir>`: proves this copy of the transform
// reproduces the spike candidates byte-for-byte apart from the import prefix.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.resolve(process.argv[3] ?? path.join(root, 'bench/keep-real-art-study/candidates'));
  await buildCandidates(out);
  if (process.argv[2] === '--check') {
    const spike = path.join(root, 'bench/keep-alpha-weighting-spike'), prefix = path.relative(out, path.join(root, 'src/lib')).split(path.sep).join('/') + '/';
    for (const name of ['palette-generated', 'palette-limit']) {
      const a = (await fs.readFile(path.join(out, `${name}.candidate.js`), 'utf8')).replaceAll(`from '${prefix}`, "from '../../src/lib/");
      const b = await fs.readFile(path.join(spike, `${name}.candidate.js`), 'utf8');
      if (a !== b) throw new Error(`${name}: regenerated transform differs from spike candidate`);
    }
    console.log('Transform check: regenerated candidates equal spike candidates (modulo import prefix).');
  } else console.log('Wrote', pathToFileURL(out).href);
}
