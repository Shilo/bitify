// Verify retained CUA-driven native downloads and current-production QA receipts.
// This does not drive the browser or access any clipboard.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyClipboardPng, loadClipboardManifest} from './palette-clipboard-fixtures.mjs';

const prefix = 'bench/webkit-fallback-validation-codex-';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const suites = ['qa', 'improvements'].map(name => {
  const file = prefix + name + '.json';
  const receipt = JSON.parse(fs.readFileSync(file));
  assert.equal(receipt.completed, true, name + ' did not complete');
  assert(receipt.checks.every(check => check.pass), name + ' contains a failure');
  assert.equal(receipt.checks.length, name === 'qa' ? 20 : 16);
  return {file, checks: receipt.checks.length, passed: true, userAgent: receipt.userAgent};
});
const png = prefix + 'native-saved.png';
const verification = await verifyClipboardPng(fs.readFileSync(png), 'palette-keep');
const observedColors = ['#000000', '#c2c3c7', '#ff004d', '#ffec27', '#00e436', '#29adff', '#1d2b53', '#83769c'];
const fixture = loadClipboardManifest().fixtures.find(row => row.key === 'palette-keep');
assert.deepEqual([...observedColors].sort(), [...fixture.outputColors].sort());
const report = {
  verifiedAt: new Date().toISOString(),
  scope: 'CUA Codex Browser, unchanged shipping build. Actual picker import and native Save download; independently decoded retained PNG. Research GL helper is not integrated. QA copy hooks inspect payloads only, not OS clipboard delivery.',
  distIndexSha256: hash('dist/index.html'),
  decoderSha256: hash('src/lib/image-decode.js'),
  suites,
  nativeSave: {
    file: png,
    source: 'bench/palette-clipboard-review/fixtures/palette-source.png',
    sourcePngSha256: fixture.sourcePngSha256,
    settingsObservedInRecolor: {palette: 'PICO-8', maxColors: 8, matching: 'Oklab', cleanup: 'On', dither: '4x4', strength: 50, opacity: 'Keep'},
    verification,
  },
  paletteImageImport: {
    source: png,
    evidence: 'CUA dialog snapshot and screenshot; exact Select color aria-labels read from the DOM',
    observedColors,
    nameObserved: 'Fallback review owned draft',
    savePalettePressed: false,
    closedThrough: 'Close palette editor',
    screenshot: prefix + 'palette-import.png',
  },
};
assert.equal(report.distIndexSha256, '16d2776e085ab2d3907d055ccf5bd52e2fb20bdd089a7c0a87b2fc19cdb92837');
assert.equal(report.decoderSha256, 'e1207e72ec51656ee6a0b516632599b60de0e510110fd319036203c9cefe15a9');
fs.writeFileSync(prefix + 'app.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: true, suites: suites.map(row => row.checks), nativeSave: verification, paletteColors: observedColors.length}, null, 2));
