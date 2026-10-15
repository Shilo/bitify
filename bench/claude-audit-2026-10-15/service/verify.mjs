// OFFLINE. Sharp/libpng format check of every PNG written, request-hash consistency,
// billing reconciliation, and an in-process secret scan that prints only a count.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sha } from '../../palette-service-research/api-common.mjs';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname;
const all = fs.readdirSync(dir, { recursive: true }).map(f => path.join(dir, f)).filter(f => fs.statSync(f).isFile());
const pngs = {};
for (const f of all.filter(f => f.endsWith('.png') && !f.includes(`${path.sep}sheets${path.sep}`))) {
  const m = await sharp(fs.readFileSync(f), { failOn: 'error' }).metadata(); // libpng rejects CRC/format errors
  pngs[path.relative(dir, f)] = { format: m.format, width: m.width, height: m.height, channels: m.channels, bitDepth: m.bitsPerSample, palette: !!m.isPalette, hasAlpha: m.hasAlpha, bytes: fs.statSync(f).size };
}
const mismatched = [];
for (const f of all.filter(f => /service[\\/](response|mcp)-.*\.json$/.test(f))) {
  const r = JSON.parse(fs.readFileSync(f));
  for (const i of r.request.inputs) if (sha(fs.readFileSync(path.join(dir, 'fixtures', i.file))) !== i.pngSha256) mismatched.push(`${path.basename(f)}:${i.file}`);
}
const responses = all.filter(f => /service[\\/]response-.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(f)));
const mcp = all.filter(f => /service[\\/]mcp-.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(f)));
const before = JSON.parse(fs.readFileSync(path.join(dir, 'balance-before.json'))), after = JSON.parse(fs.readFileSync(path.join(dir, 'service', 'balance-after.json')));
const reported = responses.reduce((s, r) => s + (r.result?.usage?.generations ?? 0), 0) + mcp.reduce((s, r) => s + (r.result?.charged_generations ?? 0), 0);
// Secret scan over every file in this folder plus the report; value never printed.
const secret = process.env.PIXELLAB_SECRET;
const scanned = [...all, path.join(dir, '../../../docs/research/2026-10-15-claude-audit-service.md')].filter(f => fs.existsSync(f));
const matches = secret ? scanned.filter(f => fs.readFileSync(f).includes(Buffer.from(secret))).length : null;
const report = { at: new Date().toISOString(), pngFilesValidated: Object.keys(pngs).length, nonPng: Object.entries(pngs).filter(([, m]) => m.format !== 'png').map(([f]) => f), pngs,
  requestHashMismatches: mismatched, billing: { successfulRest: responses.filter(r => r.status === 200).length, successfulMcp: mcp.filter(r => r.result?.status === 'completed').length, reportedGenerations: +reported.toFixed(4),
    balanceBefore: before.subscriptionGenerations, balanceAfter: after.subscriptionGenerations, balanceDelta: +(before.subscriptionGenerations - after.subscriptionGenerations).toFixed(4), usdBefore: before.credits?.usd, usdAfter: after.credits?.usd },
  secretScan: { filesScanned: scanned.length, filesContainingSecret: matches } };
fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, pngs: undefined }, null, 1));
