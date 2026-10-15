// Compare reproduced spike results to the historical committed results, ignoring timing fields.
import fs from 'node:fs';
const TIMING = /(ms|Ms|minMs|maxMs|medianMs|runs|preparationMs|environment|date|cpu)$/;
function strip(v) {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !TIMING.test(k)).map(([k, x]) => [k, strip(x)]));
  return v;
}
function diff(a, b, p = '', out = []) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) { out.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); return out; }
  if (a && typeof a === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], p + '.' + k, out); return out; }
  if (a !== b) out.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  return out;
}
const pairs = [
  ['bench/palette-collection-spike/results.json', 'bench/claude-audit-2026-10-15/research/collection-spike/results.json'],
  ['bench/palette-preset-spike/output/results.json', 'bench/claude-audit-2026-10-15/research/preset-spike/output/results.json'],
  ['bench/palette-algorithm-spikes/output/results.json', 'bench/claude-audit-2026-10-15/research/algorithm-spikes/output/results.json'],
];
const report = {};
for (const [h, n] of pairs) {
  const d = diff(strip(JSON.parse(fs.readFileSync(h, 'utf8'))), strip(JSON.parse(fs.readFileSync(n, 'utf8'))));
  report[h] = { differences: d.length, first: d.slice(0, 20) };
}
// Byte-compare every PNG output (deterministic images).
for (const [h, n] of [['bench/palette-algorithm-spikes/output', 'bench/claude-audit-2026-10-15/research/algorithm-spikes/output'], ['bench/palette-preset-spike/output', 'bench/claude-audit-2026-10-15/research/preset-spike/output']]) {
  const files = fs.readdirSync(h).filter(f => f.endsWith('.png') || f.endsWith('.svg') || f.endsWith('.html'));
  const mismatched = files.filter(f => !fs.existsSync(`${n}/${f}`) || !fs.readFileSync(`${h}/${f}`).equals(fs.readFileSync(`${n}/${f}`)));
  report[h + ' files'] = { compared: files.length, mismatched };
}
fs.writeFileSync('bench/claude-audit-2026-10-15/research/reproduction-comparison.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
