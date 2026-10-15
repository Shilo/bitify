// RESEARCH ONLY. Re-times each parity case in Node (same pipeline, no cache, same
// decoded sources), then tabulates the browser receipts (each already compared its
// palettes/output hashes with Node's expected summaries) into device/receipts/summary.json.
// Usage: node bench/keep-real-art-study/device/compare.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadCandidates, renderSetting, summarize } from '../pipeline.js';

const here = path.dirname(fileURLToPath(import.meta.url)), receipts = path.join(here, 'receipts');
const sets = { main: path.resolve(here, '../results/browser'), extra: path.join(here, 'extra-cases') };
const summary = { at: new Date().toISOString(), node: process.version, scope: 'Research-module parity on Node-decoded RGBA in native browser engines; not built-app import/export.', sets: {} };
for (const [name, dir] of Object.entries(sets)) {
  const spec = JSON.parse(await fs.readFile(path.join(dir, 'cases.json'), 'utf8')), candidates = await loadCandidates(spec.candidateDir);
  const devices = {};
  for (const f of await fs.readdir(receipts)) {
    const m = f.match(new RegExp(`^${name}-(.+)\\.json$`)); if (!m) continue;
    const r = JSON.parse(await fs.readFile(path.join(receipts, f), 'utf8'));
    devices[m[1]] = { userAgent: r.userAgent, at: r.at, head: r.head, pass: r.pass, mismatches: r.mismatches, checks: r.cases.reduce((n, c) => n + Object.keys(c.variants).length, 0), matched: r.cases.reduce((n, c) => n + Object.values(c.variants).filter(v => v.match).length, 0), totalMs: r.cases.reduce((n, c) => n + Object.values(c.variants).reduce((s, v) => s + v.ms, 0), 0) };
  }
  const rows = [];
  for (const [i, c] of spec.cases.entries()) {
    const units = await Promise.all(c.units.map(async u => ({ key: u.key, animated: u.animated, frames: await Promise.all(u.delays.map(async (delay, fi) => { const b = zlib.gunzipSync(await fs.readFile(path.join(dir, `u${u.index}-f${fi}.rgba.gz`))); return { width: u.width, height: u.height, delay, data: new Uint8ClampedArray(b.buffer, b.byteOffset, b.length) }; })) })));
    const row = { settingId: c.settingId, units: c.units.map(u => u.key), pixels: c.units.reduce((s, u) => s + u.width * u.height * u.delays.length, 0), ms: {} };
    for (const v of Object.keys(c.expected)) {
      const t = performance.now(), s = await summarize(await renderSetting(units, c.setting, v, candidates));
      if (JSON.stringify(s) !== JSON.stringify(c.expected[v])) throw new Error(`Node rerun differs: ${name} ${c.settingId} ${v}`);
      row.ms[v] = { node: Math.round(performance.now() - t) };
    }
    for (const d of Object.keys(devices)) {
      const r = JSON.parse(await fs.readFile(path.join(receipts, `${name}-${d}.json`), 'utf8')).cases[i];
      if (r.settingId !== c.settingId || r.units.join() !== row.units.join()) throw new Error(`Receipt order differs: ${name}-${d}`);
      for (const [v, x] of Object.entries(r.variants)) row.ms[v][d] = x.ms;
    }
    rows.push(row);
  }
  summary.sets[name] = { cases: spec.cases.length, nodeTotalMs: rows.reduce((n, r) => n + Object.values(r.ms).reduce((s, x) => s + x.node, 0), 0), devices, rows };
}
await fs.writeFile(path.join(receipts, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
for (const [name, s] of Object.entries(summary.sets)) {
  console.log(`${name}: ${s.cases} cases, Node ${s.nodeTotalMs} ms`);
  for (const [d, x] of Object.entries(s.devices)) console.log(`  ${d}: ${x.matched}/${x.checks} matched, pass=${x.pass}, ${x.totalMs} ms`);
  for (const r of s.rows) console.log(`  ${r.settingId.padEnd(24)} ${String(r.pixels).padStart(7)} px  ` + Object.entries(r.ms).map(([v, x]) => `${v}=${Object.values(x).join('/')}`).join(' '));
}
