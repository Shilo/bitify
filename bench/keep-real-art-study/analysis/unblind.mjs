// Unblinds judge records after both judges finished. Usage: node unblind.mjs <keyFile> <judgeDir>
import fs from 'node:fs';
const [keyFile, judgeDir] = process.argv.slice(2);
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).sheets;
const P = ['none', 'linear', 'squared'];
const rows = [];
for (const judge of ['A', 'B']) {
  const index = JSON.parse(fs.readFileSync(`${judgeDir}/${judge}/index.json`, 'utf8'));
  const sheetOf = Object.fromEntries(index.map(e => [e.file, e]));
  for (const j of JSON.parse(fs.readFileSync(`${judgeDir}/${judge}-judgments.json`, 'utf8'))) {
    const meta = sheetOf[j.file.endsWith('.png') ? j.file : j.file + '.png'], map = key[meta.sheet];
    const sev = {}; for (const L of ['X', 'Y', 'Z']) sev[map[L]] = j.severity[L];
    rows.push({ judge, file: j.file, sheet: meta.sheet, caseId: map.caseId, category: meta.category, setting: meta.setting, sev, note: j.note });
  }
}
const real = r => r.category !== 'synthetic-counterexample';
const summary = {};
for (const group of ['real', 'synthetic']) {
  const g = rows.filter(r => (group === 'real') === real(r));
  const s = { judgments: g.length };
  for (const p of P) s[p] = { meanSeverity: +(g.reduce((a, r) => a + r.sev[p], 0) / g.length).toFixed(3), meaningful: g.filter(r => r.sev[p] >= 2).length, major: g.filter(r => r.sev[p] >= 3).length };
  for (const p of ['linear', 'squared']) {
    const better = g.filter(r => r.sev[p] < r.sev.none), worse = g.filter(r => r.sev[p] > r.sev.none);
    s[p + 'VsNone'] = { better: better.length, worse: worse.length, tie: g.length - better.length - worse.length,
      worseMeaningful: worse.filter(r => r.sev[p] >= 2).map(r => `${r.judge}:${r.file} ${r.caseId} none=${r.sev.none} ${p}=${r.sev[p]}`),
      betterMeaningful: better.filter(r => r.sev.none >= 2).map(r => `${r.judge}:${r.file} ${r.caseId} none=${r.sev.none} ${p}=${r.sev[p]}`) };
  }
  summary[group] = s;
}
const shared = rows.filter(r => r.judge === 'A').map(a => [a, rows.find(b => b.judge === 'B' && b.sheet === a.sheet)]).filter(([, b]) => b);
summary.agreement = shared.map(([a, b]) => ({ sheet: a.sheet, caseId: a.caseId, A: a.sev, B: b.sev }));
fs.writeFileSync(new URL('./unblinded.json', import.meta.url), JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
