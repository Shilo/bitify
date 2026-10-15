// RESEARCH ONLY. Unblinded metric analysis of results/results.json (policies none/linear/squared, cut128 reference).
// Usage: node bench/keep-real-art-study/analysis/metrics.mjs  -> analysis/metrics.json
//
// Materiality (fixed before any delta distribution was computed):
// - Region verdicts use Oklab RMSE (dE_ok) of the composited source vs output, per
//   source-alpha region (opaque/strong/soft/faint) and per background. A region is
//   materially worse/better on a background when |delta vs none| >= 0.01 dE_ok
//   (about half an Oklab JND of ~0.02, averaged over the region: a visible shift
//   across many pixels, not one pixel). Regions with < 16 source pixels are excluded
//   from verdicts (one stray pixel can move their RMSE arbitrarily) but still reported.
// - Strict per-case rule: worse if ANY eligible region on ANY background is >= +0.01,
//   or a salient source cluster (>=1% of visible alpha mass) becomes lost
//   (nearest output color > 0.08 dE_ok) that none kept. Better if any region <= -0.01
//   or a cluster none lost is kept. Both -> mixed (counts as a regression). 'all' is
//   reported but never decides a verdict, so an aggregate gain cannot hide a soft loss.
// - Linear-light RMSE (x255) is reported with a secondary threshold of 2.0 to show
//   whether the linear metric agrees in direction; it does not change the verdict.
// - Spill pathology (real art reproducing the synthetic defect): opaque+strong group
//   (pixel-weighted RMS over regions, mean over backgrounds) improves by >= 0.02 dE_ok
//   AND >= 25% relative under the policy vs none, in a unit whose faint+soft share of
//   visible pixels is >= 25%. Synthetic spill units are reported for calibration.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(await fs.readFile(path.join(here, '../results/results.json'), 'utf8'));
const BGS = ['black', 'white', 'checker', 'colored'], REGIONS = ['opaque', 'strong', 'soft', 'faint'], ALL = [...REGIONS, 'all'];
const T = { oklab: 0.01, linear: 2.0, minRegionPixels: 16, spillAbs: 0.02, spillRel: 0.25, spillSoftShare: 0.25 };
const POL = ['linear', 'squared'];
const r6 = v => v == null ? null : Math.round(v * 1e6) / 1e6;
const family = c => c.wall ? 'wall' : c.setting.includes('dither') ? 'auto-dither' : c.setting === 'auto-all-oklab' ? 'auto-all' : c.setting.startsWith('auto') ? 'auto-capped' : 'fixed-preset';
const isSynth = c => R.units[c.unit].category === 'synthetic-counterexample';
const groupD = (v, regions, bg) => {
  let n = 0, s = 0;
  for (const r of regions) { const m = v.backgrounds[bg][r], k = v.regionPixels[r]; if (m && k) { n += k; s += k * m.oklabRmse ** 2; } }
  return n ? Math.sqrt(s / n) : null;
};
const meanBg = f => { const xs = BGS.map(f).filter(x => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };

const cases = R.cases.map(c => {
  const u = R.units[c.unit], none = c.variants.none, rec = { caseId: c.caseId, unitId: c.unitId, category: u.category, synthetic: isSynth(c), family: family(c), setting: c.setting, wall: c.wall ?? null, sheet: c.sheet ?? c.duplicateSheetOf ?? null, identical: c.identicalAcrossPolicies, regionPixels: none.regionPixels, policies: {} };
  const lostNone = new Set(none.salient.lost.map(l => l.hex));
  for (const p of [...POL, 'cut128']) {
    const v = c.variants[p], d = {}, ld = {};
    if (v.empty || none.empty) { if (p !== 'cut128') throw new Error(c.caseId + ' empty ' + p); rec.policies[p] = { empty: true }; continue; }
    for (const bg of BGS) { d[bg] = {}; ld[bg] = {}; for (const r of ALL) { const a = v.backgrounds[bg][r], b = none.backgrounds[bg][r]; d[bg][r] = a && b ? r6(a.oklabRmse - b.oklabRmse) : null; ld[bg][r] = a && b ? r6(a.linearRmse - b.linearRmse) : null; } }
    const lostP = new Set(v.salient.lost.map(l => l.hex));
    const newlyLost = v.salient.lost.filter(l => !lostNone.has(l.hex)), regained = none.salient.lost.filter(l => !lostP.has(l.hex));
    const worseRegions = [], betterRegions = [];
    for (const r of REGIONS) {
      if ((none.regionPixels[r] ?? 0) < T.minRegionPixels) continue;
      const xs = BGS.map(bg => d[bg][r]).filter(x => x != null);
      const mx = Math.max(...xs), mn = Math.min(...xs);
      if (mx >= T.oklab) worseRegions.push({ region: r, maxDelta: mx, bg: BGS[xs.indexOf(mx)] });
      if (mn <= -T.oklab) betterRegions.push({ region: r, minDelta: mn, bg: BGS[xs.indexOf(mn)] });
    }
    const worse = worseRegions.length > 0 || newlyLost.length > 0, better = betterRegions.length > 0 || regained.length > 0;
    const os = meanBg(bg => groupD(none, ['opaque', 'strong'], bg)), osP = meanBg(bg => groupD(v, ['opaque', 'strong'], bg));
    const sf = meanBg(bg => groupD(none, ['soft', 'faint'], bg)), sfP = meanBg(bg => groupD(v, ['soft', 'faint'], bg));
    rec.policies[p] = {
      identicalToNone: v.frameHashes.join() === none.frameHashes.join(),
      verdict: worse && better ? 'mixed' : worse ? 'worse' : better ? 'better' : 'tie',
      worseRegions, betterRegions, newlyLostClusters: newlyLost, regainedClusters: regained,
      oklabDelta: d, linearDelta: ld,
      meanOklabDelta: Object.fromEntries(ALL.map(r => [r, r6(meanBg(bg => d[bg][r]))])),
      meanLinearDelta: Object.fromEntries(ALL.map(r => [r, r6(meanBg(bg => ld[bg][r]))])),
      opaqueStrong: { none: r6(os), policy: r6(osP), delta: os == null ? null : r6(osP - os) },
      softFaint: { none: r6(sf), policy: r6(sfP), delta: sf == null ? null : r6(sfP - sf) },
      colors: { none: none.salient.distinctOutputColors, policy: v.salient.distinctOutputColors, delta: v.salient.distinctOutputColors - none.salient.distinctOutputColors },
      lostShareDelta: r6(v.salient.lostShare - none.salient.lostShare),
      // POST-HOC sensitivity views (added after the primary run showed swap-type cluster churn); never replace 'verdict'.
      sensitivity: (() => { const v2 = (w, b) => w && b ? 'mixed' : w ? 'worse' : b ? 'better' : 'tie', nf = x => x.region !== 'faint', ls = v.salient.lostShare - none.salient.lostShare;
        return { regionsOnly: v2(worseRegions.length > 0, betterRegions.length > 0), noFaintRegions: v2(worseRegions.some(nf) || newlyLost.length > 0, betterRegions.some(nf) || regained.length > 0), regionsNoFaintNetCluster: v2(worseRegions.some(nf) || ls >= 0.01, betterRegions.some(nf) || ls <= -0.01) }; })(),
      linearAgrees: worseRegions.every(w => BGS.some(bg => ld[bg][w.region] >= T.linear)) && betterRegions.every(b => BGS.some(bg => ld[bg][b.region] <= -T.linear)),
    };
  }
  return rec;
});

// Summaries: category x family, plus real/synthetic x unit/wall rollups.
const tally = (list, p) => { const t = { n: list.length, identical: 0, better: 0, tie: 0, worse: 0, mixed: 0, sensitivity: {} }; for (const c of list) { const q = c.policies[p]; if (q.identicalToNone) t.identical++; t[q.verdict]++; for (const [k, x] of Object.entries(q.sensitivity)) { t.sensitivity[k] ??= { better: 0, tie: 0, worse: 0, mixed: 0 }; t.sensitivity[k][x]++; } } return t; };
const summary = {};
for (const p of POL) {
  summary[p] = { byCategoryFamily: {}, rollup: {} };
  for (const c of cases) { const k = `${c.category}|${c.family}`; (summary[p].byCategoryFamily[k] ??= []).push(c); }
  for (const k of Object.keys(summary[p].byCategoryFamily)) summary[p].byCategoryFamily[k] = tally(summary[p].byCategoryFamily[k], p);
  for (const [name, f] of [['real-unit', c => !c.synthetic && !c.wall], ['real-wall', c => !c.synthetic && c.wall], ['synthetic-unit', c => c.synthetic && !c.wall], ['synthetic-wall', c => c.synthetic && c.wall]]) summary[p].rollup[name] = tally(cases.filter(f), p);
  // which regions drive regressions in real art
  const reg = { opaque: 0, strong: 0, soft: 0, faint: 0, clusterLost: 0 }, regBetter = { opaque: 0, strong: 0, soft: 0, faint: 0, clusterRegained: 0 };
  for (const c of cases.filter(c => !c.synthetic)) { const q = c.policies[p]; for (const w of q.worseRegions) reg[w.region]++; if (q.newlyLostClusters.length) reg.clusterLost++; for (const b of q.betterRegions) regBetter[b.region]++; if (q.regainedClusters.length) regBetter.clusterRegained++; }
  summary[p].realArtRegionDrivers = { worse: reg, better: regBetter };
}
// Worst regressions / best improvements per policy (real art), by worst single region-background delta.
const worstOf = q => Math.max(0, ...q.worseRegions.map(w => w.maxDelta)), bestOf = q => Math.min(0, ...q.betterRegions.map(b => b.minDelta));
const brief = (c, p) => { const q = c.policies[p]; return { caseId: c.caseId, category: c.category, family: c.family, sheet: c.sheet, verdict: q.verdict, worseRegions: q.worseRegions, betterRegions: q.betterRegions, newlyLost: q.newlyLostClusters, regained: q.regainedClusters, meanOklabDelta: q.meanOklabDelta, meanLinearDelta: q.meanLinearDelta, opaqueStrong: q.opaqueStrong, softFaint: q.softFaint, colors: q.colors }; };
const top = {};
for (const p of POL) {
  const real = cases.filter(c => !c.synthetic);
  top[p] = {
    worst: real.filter(c => c.policies[p].verdict === 'worse' || c.policies[p].verdict === 'mixed').sort((a, b) => worstOf(b.policies[p]) - worstOf(a.policies[p]) || b.policies[p].newlyLostClusters.length - a.policies[p].newlyLostClusters.length).slice(0, 10).map(c => brief(c, p)),
    best: real.filter(c => c.policies[p].verdict === 'better' || c.policies[p].verdict === 'mixed').sort((a, b) => bestOf(a.policies[p]) - bestOf(b.policies[p])).slice(0, 10).map(c => brief(c, p)),
  };
}
// Spill pathology screen.
const unitShare = u => { const h = u.alphaHistogram, vis = h.opaque + h.strong + h.soft + h.faint; return vis ? (h.soft + h.faint) / vis : 0; };
const spill = {};
for (const p of POL) spill[p] = cases.filter(c => { const q = c.policies[p].opaqueStrong; return q.delta != null && -q.delta >= T.spillAbs && -q.delta >= T.spillRel * q.none && unitShare(R.units.find(u => u.id === c.unitId)) >= T.spillSoftShare; })
  .map(c => ({ caseId: c.caseId, synthetic: c.synthetic, category: c.category, sheet: c.sheet, softFaintShare: +unitShare(R.units.find(u => u.id === c.unitId)).toFixed(3), opaqueStrong: c.policies[p].opaqueStrong, softFaint: c.policies[p].softFaint, verdict: c.policies[p].verdict, worseRegions: c.policies[p].worseRegions, newlyLost: c.policies[p].newlyLostClusters, regained: c.policies[p].regainedClusters }));

const out = { meta: { created: new Date().toISOString(), source: 'bench/keep-real-art-study/results/results.json', resultsCreated: R.meta.created, resultsHead: R.meta.head, thresholds: T, verdictRule: 'see header of analysis/metrics.mjs', deltas: 'policy - none, Oklab RMSE (dE_ok) and linear RMSE (x255), per region per background; negative = better' }, summary, top, spill, cases };
await fs.writeFile(path.join(here, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ rollup: Object.fromEntries(POL.map(p => [p, summary[p].rollup])), drivers: Object.fromEntries(POL.map(p => [p, summary[p].realArtRegionDrivers])), spill: Object.fromEntries(POL.map(p => [p, spill[p].map(s => `${s.caseId} ${s.opaqueStrong.none}->${s.opaqueStrong.policy} ${s.verdict}`)])) }, null, 1));
