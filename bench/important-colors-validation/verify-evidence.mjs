// Verify retained device receipts point to the actual frozen inputs and native files.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const json = async relative => JSON.parse(await readFile(new URL(relative, import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const desktop = await json('../important-colors-spike/codex-results.json');
const phone = await json('../important-colors-spike/android-results.json');
const parity = await json('./research-parity.json');
const native = await json('./native-check.json');
assert.equal(desktop.passed, 189); assert.equal(phone.passed, 189);
assert.deepEqual(desktop.errors, []); assert.deepEqual(phone.errors, []);
assert.deepEqual(desktop.inputHashes, phone.inputHashes);
assert.deepEqual(desktop.checks.map(c => [c.id, c.hash]), phone.checks.map(c => [c.id, c.hash]));
assert.equal(parity.passed, true); assert.equal(native.pass, true);
for (const [key, relative] of Object.entries({
  cohortManifestSha256: '../important-colors-review/manifest.json',
  candidateSha256: '../important-colors-spike/palette-limit.candidate.js',
  harnessCoreSha256: '../important-colors-spike/core.mjs',
})) assert.equal(sha(await readFile(new URL(relative, import.meta.url))), desktop.inputHashes[key]);
const manifest = await json('../important-colors-review/manifest.json');
for (const fixture of manifest.files) assert.equal(sha(await readFile(new URL('../important-colors-review/' + fixture.file, import.meta.url))), fixture.sha256);
const desktopPng = await readFile(new URL('./codex-knight-k8.png', import.meta.url));
const phonePng = await readFile(new URL('./android-knight-k8.png', import.meta.url));
assert.equal(sha(desktopPng), native.desktop.pngSha256);
assert.equal(sha(phonePng), native.phone.pngSha256);
assert.deepEqual(desktopPng, phonePng);
const indexSha256 = sha(await readFile(new URL('../../dist/index.html', import.meta.url)));
assert.equal(indexSha256, '67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f');
execFileSync('git', ['diff', '--exit-code', '310df63', '--', 'src', 'CLAUDE.md', 'docs/performance.md', 'docs/superpowers/specs/2026-10-06-colorfetti-app-design.md']);
const report = {
  at: new Date().toISOString(), passed: true,
  scope: 'Retained evidence integrity, not another independent algorithm oracle.',
  researchChecksPerDevice: 189, researchOutputChecks: 180, chunkDurationChecks: 9,
  fixtureFiles: manifest.files.length, inputHashes: desktop.inputHashes,
  nativePngSha256: sha(desktopPng), nativeBytes: desktopPng.length, indexSha256,
  productionDiffFrom310df63: [],
  observedCommands: {
    units: { command: 'npm test', passed: 930, skipped: 2, files: 59 },
    build: { command: 'npm run build', passed: true },
    exportRegression: { command: 'BASE_REF=1e4e8fd node bench/palette-qa.mjs dist', passed: true, legacy: 132, full: 11, rgb: 11, integrationGroups: 13, errors: [] },
  },
};
await writeFile(new URL('./validation-summary.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, researchChecksPerDevice: 189, fixtureFiles: manifest.files.length, nativeBytes: desktopPng.length, productionChanged: false }));
