// OFFLINE follow-ups (no service calls): (1) Max colors sweep on the held-out knight —
// at which cap do red cloth / blue eye / green gem first survive? (2) Keep with spill
// ONLY at alpha 1 (invisible): does Auto+cap still spend a slot on it?
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { png } from '../../palette-service-research/api-common.mjs';
import { generatePaletteAsync } from '../../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../../src/lib/palette-limit.js';
import { effectiveAlphaCut } from '../../../src/lib/palette-alpha.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname;
const decode = async b => { const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data) }; };
async function autoCap(frames, cap, alphaMode = 'cut') {
  const cut = effectiveAlphaCut(alphaMode, 128), item = frames.length > 1 ? { frames: frames.map(f => ({ original: f, delay: 100 })) } : { original: frames[0] };
  const colors = (await generatePaletteAsync(captureGeneratedSources([item], cut))).colors;
  if (colors.length <= cap) return colors;
  const sel = await selectPaletteSubset(colors, cap, async function* () { for (const f of frames) yield { data: f.data, weight: frames.length > 1 ? 100 : 1 }; }, { alphaCut: cut, metric: 'oklab' });
  return sel.indices.map(i => colors[i]);
}
const a = await decode(fs.readFileSync(path.join(dir, 'fixtures/knight-a.png'))), b = await decode(fs.readFileSync(path.join(dir, 'fixtures/knight-b.png')));
const red = ['#d4364a', '#962638', '#5c1a2c'], has = (cs, set) => cs.filter(c => set.includes(c));
const sweep = [];
for (const cap of [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
  const one = await autoCap([a], cap), two = await autoCap([a, b], cap);
  sweep.push({ cap, singleFrame: { red: has(one, red), eye: one.includes('#2a7fff'), gem: one.includes('#3ee07a') }, twoFrame: { red: has(two, red), eye: two.includes('#2a7fff'), gem: two.includes('#3ee07a') } });
}
// Spill only at alpha 1: an orange disc with a large invisible green ring.
const spill = png(32, 32, (x, y) => { const r = Math.hypot(x - 15.5, y - 15.5); if (r < 2.5) return [255, 243, 176, 255]; if (r < 6) return [255, 138, 30, 255]; if (r < 8) return [220, 90, 20, 255]; if (r < 15) return [0, 255, 64, 1]; return [0, 0, 0, 0]; });
fs.writeFileSync(path.join(dir, 'fixtures/spill-alpha1.png'), spill);
const s = await decode(spill);
const spillResult = {};
for (const mode of ['keep', 'cut']) for (const cap of [2, 3]) spillResult[`${mode}-cap${cap}`] = await autoCap([s], cap, mode);
const out = { at: new Date().toISOString(), note: 'Offline, actual src/lib Auto + Max colors (Oklab). No service calls.', knightCapSweep: sweep,
  spillAlpha1: { fixture: `fixtures/spill-alpha1.png (3 opaque colors plus ${s.data.filter((v, i) => i % 4 === 3 && v === 1).length} alpha-1 green pixels, invisible)`, results: spillResult } };
fs.writeFileSync(path.join(dir, 'extras.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
