import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp; try { sharp = require('sharp'); } catch { sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const dir = import.meta.dirname, report = JSON.parse(fs.readFileSync(path.join(dir, 'results.json')));
const cases = [['armor', 4], ['sprite', 8], ['rare-exact-red-eye', 4]].map(([name, k]) => report.cases.find(row => row.scope === name && row.itemName === name && row.k === k && row.metric === 'oklab' && row.alphaMode === 'cut'));
const overlays = [], width = 320, height = 265;
for (let row = 0; row < cases.length; row++) {
  const entry = cases[row], mean = entry.candidates.centroid.variants.mean, strict = entry.candidates.centroid.variants.strict;
  const cells = [
    { title: `${entry.itemName}: source`, file: entry.itemName + '-source.png', detail: 'Native size at left, enlarged at right' },
    { title: `Current Auto64 then cap ${entry.k}`, file: entry.baselineFile, detail: `Point ${entry.baseline.objective.toFixed(7)}` },
    { title: 'Mean-only centroid refinement', file: mean.file, detail: `Point ${mean.output.objective.toFixed(7)}; ${mean.stats.worsenedRgb} RGBs worsen` },
    { title: 'Strict / rare guard: baseline retained', file: strict.file, detail: 'No admissible refinement in this case' },
  ];
  for (let column = 0; column < cells.length; column++) {
    const cell = cells[column], bytes = fs.readFileSync(path.join(dir, cell.file));
    const svg = `<svg width="320" height="265"><rect width="320" height="265" fill="#fffdf9"/><rect x="8" y="85" width="68" height="68" fill="#dedbd5"/><rect x="100" y="78" width="180" height="180" fill="#dedbd5"/><g fill="#241d2d" font-family="Arial" font-size="13"><text x="8" y="23">${cell.title}</text><text x="8" y="48">${cell.detail}</text></g></svg>`;
    overlays.push({ input: Buffer.from(svg), left: column * width, top: row * height });
    overlays.push({ input: bytes, left: column * width + 10, top: row * height + 87 });
    overlays.push({ input: await sharp(bytes).resize(180, 180, { kernel: 'nearest', fit: 'contain', background: '#dedbd5' }).png().toBuffer(), left: column * width + 100, top: row * height + 78 });
  }
}
await sharp({ create: { width: width * 4, height: height * cases.length, channels: 4, background: '#fffdf9' } }).composite(overlays).png().toFile(path.join(dir, 'key-comparisons.png'));
console.log('Wrote key-comparisons.png');
