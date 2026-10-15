// RESEARCH ONLY. Node vs browser vs Android parity for the selected cases exported by
// evaluate.mjs (results/browser/cases.json). Sources are the Node-decoded RGBA bytes,
// so this isolates algorithm parity from browser image decoding.
import { loadCandidates, renderSetting, summarize, sha256 } from './pipeline.js';

async function loadUnit(u) {
  const frames = [];
  for (const [fi, delay] of u.delays.entries()) {
    const res = await fetch(`/cases/u${u.index}-f${fi}.rgba.gz`);
    if (!res.ok) throw new Error(`Missing source u${u.index}-f${fi}`);
    const data = new Uint8ClampedArray(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if (await sha256(data) !== u.rawSha256[fi]) throw new Error(`Source hash mismatch u${u.index}-f${fi}`);
    frames.push({ width: u.width, height: u.height, data, delay });
  }
  return { key: u.key, animated: u.animated, frames };
}

document.querySelector('#run').addEventListener('click', async () => {
  const button = document.querySelector('#run'), status = document.querySelector('#status'), out = document.querySelector('#out');
  button.disabled = true; status.textContent = 'Running';
  try {
    const spec = await (await fetch('/cases/cases.json', { cache: 'no-store' })).json(), candidates = await loadCandidates(spec.candidateDir);
    const report = { userAgent: navigator.userAgent, at: new Date().toISOString(), head: spec.head, scope: 'Research modules in a native browser on Node-decoded RGBA; not built-app decode/export.', cases: [] };
    for (const [i, c] of spec.cases.entries()) {
      const units = [];
      for (const u of c.units) units.push(await loadUnit(u));
      const row = { settingId: c.settingId, units: c.units.map(u => u.key), variants: {} };
      for (const [variant, expected] of Object.entries(c.expected)) {
        const t = performance.now(), actual = await summarize(await renderSetting(units, c.setting, variant, candidates));
        row.variants[variant] = { match: JSON.stringify(actual) === JSON.stringify(expected), ms: Math.round(performance.now() - t), ...(JSON.stringify(actual) === JSON.stringify(expected) ? {} : { actual, expected }) };
      }
      report.cases.push(row); status.textContent = `Running ${i + 1}/${spec.cases.length}`;
    }
    report.mismatches = report.cases.flatMap(r => Object.entries(r.variants).filter(([, v]) => !v.match).map(([v]) => `${r.settingId}:${r.units.join('+')}:${v}`));
    report.pass = report.mismatches.length === 0;
    const device = new URLSearchParams(location.search).get('device') ?? 'browser';
    report.serverReceipt = await (await fetch(`/report?device=${encodeURIComponent(device)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })).json();
    out.textContent = JSON.stringify(report, null, 2); status.textContent = report.pass ? 'PASS' : 'FAIL';
  } catch (error) { status.textContent = 'ERROR'; out.textContent = String(error.stack ?? error); }
  finally { button.disabled = false; }
});
