// Round 2: which tracked repo images would be affected by S1/D1 (Keep counts alpha>=1 pixels
// fully in Auto / Max colors selection)? Counts faint (1..127) and near-invisible (1..15) pixels.
// Run from repo root: node bench/claude-audit-2026-10-15/round2/keep-exposure-scan.mjs
import fs from 'node:fs'; import { execSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/');
const sharp = require('sharp');
const files = execSync('git ls-files "*.png" "*.gif" "*.webp"', { encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter(f => /^(public|src|bench\/(palette-|fixtures|claude-audit)|docs)/.test(f) && !/output|downloads|sheets|paired|service-research|webkit-fallback/.test(f));
const rows = [];
for (const f of files) {
  try {
    const { data, info } = await sharp(f, { limitInputPixels: 1 << 26 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let faint = 0, tiny = 0, visible = 0, opaque = 0;
    for (let p = 3; p < data.length; p += 4) { const a = data[p]; if (!a) continue; visible++; if (a === 255) opaque++; else if (a < 128) { faint++; if (a < 16) tiny++; } }
    if (faint) rows.push({ file: f, w: info.width, h: info.height, visible, opaque, faint1to127: faint, tiny1to15: tiny, faintShare: +(faint / visible).toFixed(3) });
  } catch { /* unreadable or too large */ }
}
rows.sort((a, b) => b.faintShare - a.faintShare);
const result = { scanned: files.length, withFaintPixels: rows.length, rows };
fs.writeFileSync(new URL('./keep-exposure-scan.out.json', import.meta.url), JSON.stringify(result, null, 1));
console.log('scanned', files.length, 'with faint pixels', rows.length); console.table(rows.slice(0, 25));
