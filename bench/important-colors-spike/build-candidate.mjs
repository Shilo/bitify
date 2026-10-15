// Frozen research hypotheses; writes a research copy, never production source.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const input = new URL('../../src/lib/palette-limit.js', import.meta.url);
const source = await fs.readFile(input, 'utf8');
const hash = crypto.createHash('sha256').update(source).digest('hex');
let copy = source.replaceAll("from './", "from '../../src/lib/");
copy = copy.replace("metric = 'oklab', signal }", "metric = 'oklab', signal, importance = 'none' }");
copy = copy.replace('  const palette =', "  if (!['none', 'concave', 'hue'].includes(importance)) throw new Error('Invalid research importance.');\n  const palette =");
copy = copy.replace('  const popular =', '  let popular =');
const marker = '  const U = source.length, weights =';
if (!copy.includes(marker)) throw new Error('Source changed; review candidate transform.');
copy = copy.replace(marker, `  // Exact RGB only: the bounded bin path deliberately keeps its current objective.
  // This fast bypass avoids claiming equal-hue weighting of mixed RGB bins.
  if (!binned && importance !== 'none') {
    const originalMass = source.reduce((sum, entry) => sum + entry.weight, 0);
    const groups = new Float64Array(13), groupOf = new Uint8Array(source.length);
    if (importance === 'hue') for (let u = 0; u < source.length; u++) {
      const rgb = [...histogramPlaceholder];
    }
    const weighted = new Float64Array(source.length);
    if (importance === 'concave') {
      let mass = 0;
      for (let u = 0; u < source.length; u++) { weighted[u] = source[u].weight ** .75; mass += weighted[u]; }
      for (let u = 0; u < source.length; u++) weighted[u] *= originalMass / mass;
    } else {
      let occupied = 0;
      for (const mass of groups) if (mass > 0) occupied++;
      for (let u = 0; u < source.length; u++) weighted[u] = .9 * source[u].weight + .1 * originalMass / occupied * source[u].weight / groups[groupOf[u]];
    }
    frequency.fill(0);
    for (let u = 0; u < source.length; u++) { source[u].weight = weighted[u]; frequency[source[u].winner] += weighted[u]; }
    popular = [...winners].sort((a, b) => frequency[b] - frequency[a] || a - b).slice(0, K).sort((a, b) => a - b);
  }
  const U = source.length, weights =`);
// RGB keys are retained in the already bounded research histogram entries. This
// adds a scalar per distinct RGB; no additional source-sized map is introduced.
copy = copy.replace('{ weight, winner, cost, vector:', '{ rgb, weight, winner, cost, vector:');
copy = copy.replace('      const rgb = [...histogramPlaceholder];', `      const rgb = source[u].rgb;
      coordinates(rgb >>> 16, rgb >>> 8 & 255, rgb & 255, 'oklab', scratch);
      const chroma = Math.hypot(scratch[1], scratch[2]);
      let hue = Math.atan2(scratch[2], scratch[1]); if (hue < 0) hue += Math.PI * 2;
      const group = chroma < .04 ? 12 : Math.min(11, Math.floor(hue * 12 / (Math.PI * 2)));
      groupOf[u] = group; groups[group] += source[u].weight;`);
await fs.writeFile(new URL('./palette-limit.candidate.js', import.meta.url), `// RESEARCH ONLY. Production source SHA256 ${hash}\n` + copy);
await fs.writeFile(new URL('./candidate-freeze.json', import.meta.url), JSON.stringify({ productionSha256: hash, freeze: 'Before cohort outputs; no tuning after results.', candidates: { concave: { objective: 'Source exact RGB mass to power .75, normalized to original mass', exponent: .75 }, hue: { objective: '90% original mass +10% equally weighted occupied Oklab hue groups; 12 sectors + neutral group', originalShare: .9, balancedShare: .1, sectors: 12, neutralChromaBelow: .04 } }, invariant: 'Auto generation, nearest mapping, alpha and target colors unchanged; full-nearest and empty fast paths unchanged; binned high-entropy path unchanged.' }, null, 2) + '\n');
