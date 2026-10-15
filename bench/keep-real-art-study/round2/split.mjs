// RESEARCH ONLY (round 2). Splits round-1 unblinded linear-vs-none judgments by
// RGB~alpha (black-matte style) sources, setting family and cap.
import fs from 'node:fs/promises';
const u = JSON.parse(await fs.readFile(new URL('../analysis/unblinded.json', import.meta.url), 'utf8'));
const faint = JSON.parse(await fs.readFile(new URL('./faint-rgb.json', import.meta.url), 'utf8'));
const matte = new Set(faint.filter(r => r.alphaVsMaxChannelCorr >= 0.9).map(r => r.id));
const unitOf = id => id.split('|')[0].replace(/^anim:/, ''), tally = {};
const add = (k, r) => { const t = tally[k] ??= { n: 0, better: 0, worse: 0, tie: 0, meaningfulBetter: 0, meaningfulWorse: 0 }; t.n++;
  const d = r.sev.linear - r.sev.none; d < 0 ? t.better++ : d > 0 ? t.worse++ : t.tie++;
  if (r.sev.none >= 2 && r.sev.linear < 2) t.meaningfulBetter++; if (r.sev.linear >= 2 && r.sev.none < 2) t.meaningfulWorse++; };
for (const r of u.rows.filter(r => r.category !== 'synthetic-counterexample')) {
  const s = r.setting, cap = s.includes('wall') ? 'wall-' + s.match(/c(\d+)/)[1] : (s.match(/c(\d+)|all/) || ['?'])[0];
  add(matte.has(unitOf(r.caseId)) ? 'source: RGB~alpha (matte)' : 'source: other', r);
  add('cap: ' + cap, r); add('target: ' + s.split('-')[0], r);
}
console.log('matte units:', [...matte].join(', '));
console.table(tally);
await fs.writeFile(new URL('./split.json', import.meta.url), JSON.stringify({ matte: [...matte], tally }, null, 1) + '\n');
