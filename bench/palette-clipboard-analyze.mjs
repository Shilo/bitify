// Read-only transport diagnostics. No clipboard access or fixture regeneration.
// node bench/palette-clipboard-analyze.mjs palette-keep actual.png [report.json]
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let sharp; try { sharp = require(process.env.SHARP_MODULE ?? 'sharp'); }
catch { sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = name => new URL('./palette-clipboard-review/fixtures/' + name, import.meta.url);
const hex = (data, at) => '#' + Buffer.from(data.subarray(at, at + 3)).toString('hex');

function pngMetadata(bytes) {
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng) return { isPng: false };
  const result = { isPng: true, chunks: [] }; let at = 8;
  while (at + 12 <= bytes.length && result.chunks.length < 256) {
    const length = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8), end = at + 12 + length;
    if (end > bytes.length) { result.truncatedChunk = { type, length }; break; }
    const data = bytes.subarray(at + 8, at + 8 + length);
    result.chunks.push({ type, length });
    if (type === 'IHDR' && length === 13) result.header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], compression: data[10], filter: data[11], interlace: data[12] };
    if (type === 'sRGB') result.sRGBRenderingIntent = data[0];
    if (type === 'gAMA' && length === 4) result.gamma = data.readUInt32BE(0) / 100000;
    if (type === 'cHRM' && length === 32) result.chromaticities = Array.from({ length: 8 }, (_, i) => data.readUInt32BE(i * 4) / 100000);
    if (type === 'cICP') result.cICP = [...data];
    if (type === 'iCCP') { const zero = data.indexOf(0); result.embeddedProfile = { name: zero >= 0 ? data.toString('latin1', 0, zero) : null, compressedBytes: zero >= 0 ? data.length - zero - 2 : null, chunkSha256: hash(data) }; }
    at = end;
    if (type === 'IEND') break;
  }
  if (result.chunks.length === 256) result.chunkInventoryBoundReached = true;
  return result;
}
async function decode(bytes) {
  const [metadata, raw] = await Promise.all([sharp(bytes).metadata(), sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true })]);
  return { data: raw.data, width: raw.info.width, height: raw.info.height, metadata: { format: metadata.format, width: metadata.width, height: metadata.height, channels: metadata.channels, space: metadata.space, depth: metadata.depth, hasAlpha: metadata.hasAlpha, hasProfile: metadata.hasProfile, density: metadata.density, iccBytes: metadata.icc?.length ?? 0, iccSha256: metadata.icc ? hash(metadata.icc) : null }, png: pngMetadata(bytes) };
}

export async function analyzeClipboardPng(bytes, key) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected encoded PNG bytes as Buffer or Uint8Array.');
  bytes = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const manifest = JSON.parse(fs.readFileSync(fixture('manifest.json'), 'utf8')), entry = manifest.fixtures.find(item => item.key === key);
  if (!entry) throw new Error('Unknown clipboard fixture: ' + key);
  const expectedBytes = fs.readFileSync(fixture(entry.expectedFile));
  if (hash(expectedBytes) !== entry.expectedPngSha256) throw new Error('Frozen expected PNG does not match its manifest hash.');
  const expected = await decode(expectedBytes);
  if (hash(expected.data) !== entry.expectedRgbaSha256) throw new Error('Frozen expected RGBA does not match its manifest hash.');
  const report = {
    key,
    scope: 'Exact independent Sharp decode comparison with the frozen production-conversion oracle. No new matching oracle, tolerance, clipboard access or causal attribution. Hidden expected-alpha-zero RGB is ignored; every alpha byte and expected-visible RGB byte is compared.',
    runtime: { node: process.version, sharp: sharp.versions.sharp },
    decodedChannelFormat: 'sRGB 8-bit RGBA through Sharp toColourspace(srgb), ensureAlpha and raw; PNG encoding/profile metadata is reported separately',
    expected: { width: expected.width, height: expected.height, encodedBytes: expectedBytes.length, encodedSha256: hash(expectedBytes), metadata: expected.metadata, png: expected.png, activePalette: entry.outputColors },
    actual: { encodedBytes: bytes.length, encodedSha256: hash(bytes), png: pngMetadata(bytes) },
    exactVisibleRgba: false,
  };
  let actual;
  try { actual = await decode(bytes); }
  catch (error) { report.actual.decodeError = error.message; report.comparisonStatus = 'actual payload could not be decoded'; return report; }
  Object.assign(report.actual, { width: actual.width, height: actual.height, metadata: actual.metadata });
  report.dimensionsMatch = actual.width === expected.width && actual.height === expected.height;
  if (!report.dimensionsMatch) { report.comparisonStatus = 'dimensions differ; channel comparisons omitted'; return report; }
  const palette = new Set(entry.outputColors), groups = new Map(), transitions = new Map(), actualColors = new Set();
  const totals = { pixels: expected.width * expected.height, expectedVisiblePixels: 0, actualVisiblePixels: 0, alphaMismatchPixels: 0, visibleRgbMismatchPixels: 0, visibleRgbMismatchChannels: 0, maxAbsChannelError: 0, maxAbsChannelErrors: [0, 0, 0], maxAlphaError: 0, actualVisiblePaletteMembershipViolations: 0, hiddenRgbDifferencesIgnored: 0 };
  for (let at = 0; at < expected.data.length; at += 4) {
    const ea = expected.data[at + 3], aa = actual.data[at + 3];
    let group = groups.get(ea);
    if (!group) { group = { expectedAlpha: ea, pixels: 0, actualAlphaCounts: {}, alphaMismatchPixels: 0, visibleRgbMismatchPixels: 0, visibleRgbMismatchChannels: 0, maxAbsChannelError: 0, maxAbsChannelErrors: [0, 0, 0], actualVisiblePaletteMembershipViolations: 0, examples: [] }; groups.set(ea, group); }
    group.pixels++; group.actualAlphaCounts[aa] = (group.actualAlphaCounts[aa] ?? 0) + 1;
    if (ea !== aa) { group.alphaMismatchPixels++; totals.alphaMismatchPixels++; totals.maxAlphaError = Math.max(totals.maxAlphaError, Math.abs(ea - aa)); }
    let rgbMismatch = false;
    if (ea) {
      totals.expectedVisiblePixels++;
      for (let c = 0; c < 3; c++) {
        const delta = Math.abs(expected.data[at + c] - actual.data[at + c]);
        group.maxAbsChannelErrors[c] = Math.max(group.maxAbsChannelErrors[c], delta); totals.maxAbsChannelErrors[c] = Math.max(totals.maxAbsChannelErrors[c], delta);
        if (delta) { group.visibleRgbMismatchChannels++; totals.visibleRgbMismatchChannels++; rgbMismatch = true; }
      }
      if (rgbMismatch) {
        group.visibleRgbMismatchPixels++; totals.visibleRgbMismatchPixels++;
        const transition = `${hex(expected.data, at)} -> ${hex(actual.data, at)} @ alpha ${ea}`;
        transitions.set(transition, (transitions.get(transition) ?? 0) + 1);
      }
    } else if (expected.data[at] !== actual.data[at] || expected.data[at + 1] !== actual.data[at + 1] || expected.data[at + 2] !== actual.data[at + 2]) totals.hiddenRgbDifferencesIgnored++;
    if (aa) { const color = hex(actual.data, at); actualColors.add(color); totals.actualVisiblePixels++; if (!palette.has(color)) { group.actualVisiblePaletteMembershipViolations++; totals.actualVisiblePaletteMembershipViolations++; } }
    if ((rgbMismatch || ea !== aa) && group.examples.length < 8) group.examples.push({ x: at / 4 % expected.width, y: Math.floor(at / 4 / expected.width), expected: [...expected.data.subarray(at, at + 4)], actual: [...actual.data.subarray(at, at + 4)] });
  }
  totals.maxAbsChannelError = Math.max(...totals.maxAbsChannelErrors);
  for (const group of groups.values()) group.maxAbsChannelError = Math.max(...group.maxAbsChannelErrors);
  report.comparisonStatus = 'compared at identical dimensions';
  report.totals = totals;
  report.byExpectedAlpha = [...groups.values()].sort((a, b) => a.expectedAlpha - b.expectedAlpha);
  report.rgbTransitions = [...transitions].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 32).map(([transition, pixels]) => ({ transition, pixels }));
  report.rgbTransitionKinds = transitions.size;
  report.actual.usedColors = actualColors.size;
  report.actual.colorsOutsideActivePalette = [...actualColors].filter(color => !palette.has(color)).sort();
  report.exactVisibleRgba = totals.alphaMismatchPixels === 0 && totals.visibleRgbMismatchPixels === 0;
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const report = await analyzeClipboardPng(fs.readFileSync(process.argv[3]), process.argv[2]);
  report.actual.sourcePath = process.argv[3];
  if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(report, null, 2) + '\n');
  else console.log(JSON.stringify(report, null, 2));
}
