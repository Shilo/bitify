// Measures one build on the phone (see DEVICE in live.mjs): each scenario twice, the better kept.
//   DEVICE=9555 node final-device.mjs <dist dir>
import { execFileSync } from 'node:child_process';
const scenarios = [
  ['Sprite 256 by 256', 'w=256 h=256 kind=sprite'],
  ['12 sprites 256 by 256', 'w=256 h=256 kind=sprite count=12'],
  ['Photo 4 MP, Cutout', 'w=2048 h=2048'],
  ['Photo 12 MP, Cutout', 'w=4000 h=3000'],
  ['Photo 12 MP, Solid', 'w=4000 h=3000 style=solid'],
  ['Photo 12 MP, Lines', 'w=4000 h=3000 style=lines'],
  ['Photo 12 MP, Bayer', 'w=4000 h=3000 style=bayer'],
  ['Photo 12 MP, Atkinson', 'w=4000 h=3000 style=atkinson'],
  ['6 photos of 4 MP, Cutout', 'w=2048 h=2048 count=6'],
  ['Photo 12 MP, Cutout, slowed 4 times more', 'w=4000 h=3000 cpu=4'],
];
const KEYS = ['loaded', 'backStyle', 'perMove', 'slowestMove', 'release', 'save', 'heapMB'];
console.log(['scenario', ...KEYS, 'picture', 'draft', 'saved'].join(' | '));
for (const [name, opts] of scenarios) {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    try {
      const line = execFileSync('node', ['live.mjs', process.argv[2], ...opts.split(' '), ...(opts.includes('cpu=') ? [] : ['cpu=1']), 'steps=20'], { encoding: 'utf8', env: { ...process.env, LIMIT: '240' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').at(-1);
      const r = JSON.parse(line);
      if (!r.error) runs.push(r);
    } catch {}
  }
  if (!runs.length) { console.log(name + ' | failed'); continue; }
  console.log([name, ...KEYS.map(k => Math.round(Math.min(...runs.map(r => r[k])))), runs[0].canvas, runs[0].whileDragging, runs[0].savedDuringDrag].join(' | '));
}
