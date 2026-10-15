// RESEARCH ONLY (round 2). Linear-vs-none metric verdicts per setting (real art), using
// regions-only material verdicts that ignore the faint region (|delta| >= 0.01 Oklab).
import fs from 'node:fs/promises';
const m = JSON.parse(await fs.readFile(new URL('../analysis/metrics.json', import.meta.url), 'utf8'));
const out = {};
for (const c of m.cases.filter(c => !c.synthetic)) {
  const p = c.policies.linear, t = out[c.setting] ??= { n: 0, identical: 0, better: 0, worse: 0, mixed: 0, tie: 0, worstSoftStrong: 0, worstCase: '' };
  t.n++; if (p.identicalToNone) { t.identical++; t.tie++; continue; }
  let w = false, b = false;
  for (const bg of Object.values(p.oklabDelta)) for (const r of ['opaque', 'strong', 'soft']) {
    if (c.regionPixels[r] < 16) continue; const d = bg[r];
    if (d >= 0.01) w = true; if (d <= -0.01) b = true;
    if (d > t.worstSoftStrong) { t.worstSoftStrong = +d.toFixed(3); t.worstCase = c.caseId; }
  }
  w && b ? t.mixed++ : w ? t.worse++ : b ? t.better++ : t.tie++;
}
console.table(out);
await fs.writeFile(new URL('./by-setting.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
