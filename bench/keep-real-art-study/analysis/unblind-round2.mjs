// Unblinds the round-2 none-vs-linear judgments. Usage: node unblind-round2.mjs <keyFile> <judgeDir>
import fs from 'node:fs';
const [keyFile, dir] = process.argv.slice(2);
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8')).sheets;
const rows = [];
for (const judge of ['C', 'D']) for (const j of JSON.parse(fs.readFileSync(`${dir}/${judge}-judgments.json`, 'utf8'))) {
  const file = j.file.endsWith('.png') ? j.file : j.file + '.png', map = key[file];
  const winner = j.preferred === 'tie' ? 'tie' : map[j.preferred];
  rows.push({ judge, file, cases: map.cases, winner, loserSeverity: winner === 'tie' ? 0 : j.loserSeverity, where: j.where, note: j.note });
}
const tally = g => ({ n: g.length, linear: g.filter(r => r.winner === 'linear').length, none: g.filter(r => r.winner === 'none').length, tie: g.filter(r => r.winner === 'tie').length,
  linearLosesMeaningful: g.filter(r => r.winner === 'none' && r.loserSeverity >= 2).length, noneLosesMeaningful: g.filter(r => r.winner === 'linear' && r.loserSeverity >= 2).length,
  linearLosesMajor: g.filter(r => r.winner === 'none' && r.loserSeverity >= 3).length, noneLosesMajor: g.filter(r => r.winner === 'linear' && r.loserSeverity >= 3).length });
const rgb = rows.filter(r => r.cases.some(c => c.endsWith('-rgb')));
const overlap = rows.filter(r => r.judge === 'C').map(c => [c, rows.find(d => d.judge === 'D' && d.file === c.file)]).filter(([, d]) => d)
  .map(([c, d]) => ({ file: c.file, cases: c.cases, C: `${c.winner}/${c.loserSeverity}`, D: `${d.winner}/${d.loserSeverity}` }));
const out = { all: tally(rows), rgbMatching: tally(rgb), oklabOrWall: tally(rows.filter(r => !rgb.includes(r))), overlap,
  linearMeaningfulLosses: rows.filter(r => r.winner === 'none' && r.loserSeverity >= 2).map(r => `${r.judge}:${r.file} ${r.cases.join(',')} sev${r.loserSeverity} | ${r.note}`) };
fs.writeFileSync(new URL('./unblinded-round2.json', import.meta.url), JSON.stringify({ ...out, rows }, null, 1));
console.log(JSON.stringify(out, null, 1));
