// Runs live.mjs over a list of scenarios for the old and the new build and prints one table.
//   node matrix.mjs [name-filter]
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const scenarios = [
  // name, options, [runs of old build, runs of new build], slider moves for the old build
  ['sprite 256 cutout, phone 4x', 'w=256 h=256 kind=sprite cpu=4', [3, 3], 20],
  ['12 sprites 256, phone 4x', 'w=256 h=256 kind=sprite cpu=4 count=12', [2, 3], 20],
  ['photo 4MP cutout, phone 4x', 'w=2048 h=2048 cpu=4', [2, 3], 4],
  ['photo 12MP cutout, phone 4x', 'w=4000 h=3000 cpu=4', [2, 3], 3],
  ['photo 12MP solid, phone 4x', 'w=4000 h=3000 cpu=4 style=solid', [2, 3], 6],
  ['photo 12MP lines, phone 4x', 'w=4000 h=3000 cpu=4 style=lines', [1, 3], 4],
  ['photo 12MP bayer, phone 4x', 'w=4000 h=3000 cpu=4 style=bayer', [1, 3], 6],
  ['photo 12MP atkinson, phone 4x', 'w=4000 h=3000 cpu=4 style=atkinson', [1, 3], 4],
  ['photo 12MP cutout, phone 6x', 'w=4000 h=3000 cpu=6', [1, 3], 3],
  ['6 photos 4MP cutout, phone 4x', 'w=2048 h=2048 cpu=4 count=6', [1, 2], 3],
  ['photo 12MP cutout, tablet 4x', 'w=4000 h=3000 cpu=4 profile=tablet', [1, 3], 3],
  ['photo 12MP cutout, desktop 1x', 'w=4000 h=3000 cpu=1 profile=desktop', [2, 3], 6],
  ['photo 24MP cutout, desktop 1x', 'w=6000 h=4000 cpu=1 profile=desktop', [1, 3], 4],
].filter(s => !process.argv[2] || s[0].includes(process.argv[2]));
// With DEVICE set (see live.mjs) the same things are measured on a real phone, at its own speed.
const onDevice = [
  ['sprite 256 cutout', 'w=256 h=256 kind=sprite cpu=1', [2, 3], 20],
  ['12 sprites 256', 'w=256 h=256 kind=sprite cpu=1 count=12', [2, 3], 20],
  ['photo 4MP cutout', 'w=2048 h=2048 cpu=1', [2, 3], 8],
  ['photo 12MP cutout', 'w=4000 h=3000 cpu=1', [2, 3], 6],
  ['photo 12MP solid', 'w=4000 h=3000 cpu=1 style=solid', [2, 3], 8],
  ['photo 12MP lines', 'w=4000 h=3000 cpu=1 style=lines', [1, 3], 6],
  ['photo 12MP bayer', 'w=4000 h=3000 cpu=1 style=bayer', [1, 3], 8],
  ['photo 12MP atkinson', 'w=4000 h=3000 cpu=1 style=atkinson', [1, 3], 6],
  ['6 photos 4MP cutout', 'w=2048 h=2048 cpu=1 count=6', [1, 2], 6],
  ['photo 12MP cutout, phone slowed 4x more', 'w=4000 h=3000 cpu=4', [1, 3], 4],
].filter(s => !process.argv[2] || s[0].includes(process.argv[2]));
if (process.env.DEVICE) scenarios.splice(0, scenarios.length, ...onDevice);

const METRICS = ['loaded', 'nextStyle', 'backStyle', 'palette', 'compare', 'perMove', 'slowestMove', 'dragFreeze', 'release', 'save', 'saveKB', 'heapMB'];
// the machine is shared with other work, so the best run is the fairest: the least disturbed one
const best = (m, v) => (m === 'fps' ? Math.max(...v) : Math.min(...v));
function measure(build, opts, runs, steps) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    try {
      const line = execFileSync('node', ['live.mjs', build, ...opts.split(' '), `steps=${steps}`], { encoding: 'utf8', env: { ...process.env, LIMIT: process.env.LIMIT ?? '900' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').at(-1);
      appendFileSync('matrix.jsonl', line + '\n');
      const r = JSON.parse(line);
      if (!r.error) results.push(r);
    } catch (e) { appendFileSync('matrix.jsonl', JSON.stringify({ build, opts, error: String(e).slice(0, 200) }) + '\n'); }
  }
  return results.length ? Object.fromEntries([...METRICS.map(m => [m, best(m, results.map(r => r[m]))]), ['canvas', results[0].canvas + (results[0].whileDragging !== results[0].canvas ? ', ' + results[0].whileDragging + ' while dragging' : '')]]) : null;
}
for (const [name, opts, [oldRuns, newRuns], oldSteps] of scenarios) {
  const was = measure('dist-base', opts, oldRuns, oldSteps), now = measure('dist-new', opts, newRuns, 20);
  console.log(`\n## ${name}   (canvas ${was?.canvas} -> ${now?.canvas})`);
  for (const m of METRICS) {
    const a = was?.[m], b = now?.[m], gain = a > 0 && b > 0 ? (m === 'fps' ? b / a : a / b) : 0;
    console.log(`${m.padEnd(11)} ${String(a ?? '-').padStart(8)} -> ${String(b ?? '-').padStart(8)}   ${gain ? gain.toFixed(1) + 'x' : ''}`);
  }
}
