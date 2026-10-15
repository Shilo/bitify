// Independent authored PNG corpus. No production PNG encoder/decoder is imported.
// Node zlib handles compression/CRC only; Sharp independently validates fixtures.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { deflateSync, crc32 } from 'node:zlib';
const require = createRequire(import.meta.url), sharp = require(process.env.SHARP_MODULE ?? 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = path.join(import.meta.dirname, 'png-precision-validation-fixtures'); fs.mkdirSync(dir, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function chunk(type, data = Buffer.alloc(0)) { const body = Buffer.concat([Buffer.from(type), data]), result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length); body.copy(result, 4); result.writeUInt32BE(crc32(body), result.length - 4); return result; }
function header(width, height, type, depth, interlace = 0) { const data = Buffer.alloc(13); data.writeUInt32BE(width, 0); data.writeUInt32BE(height, 4); data.set([depth, type, 0, 0, interlace], 8); return chunk('IHDR', data); }
function png(width, height, type, depth, rows, extras = [], interlace = 0) { return Buffer.concat([signature, header(width, height, type, depth, interlace), ...extras, chunk('IDAT', deflateSync(rows)), chunk('IEND')]); }
function rgba(width, height) { return Buffer.from(Array.from({ length: width * height }, (_, p) => { const x = p % width, y = Math.floor(p / width); return [29 + x % 5, 43 + y % 5, 83 + (x + y) % 5, [0, 1, 64, 127, 128, 192, 254, 255][p % 8]]; }).flat()); }
function rowsRgba(data, width, height, sixteen = false) { const rows = []; for (let y = 0; y < height; y++) { rows.push(Buffer.from([0])); const row = data.subarray(y * width * 4, (y + 1) * width * 4); rows.push(sixteen ? Buffer.from([...row].flatMap(v => [v, v])) : row); } return Buffer.concat(rows); }
const width = 13, height = 11, authored = rgba(width, height), fixtures = [];
function add(id, bytes, options) { fixtures.push({ id, bytes, authored: options.authored ?? authored, width: options.width ?? width, height: options.height ?? height, ...options }); }
function validatePositiveChunks(bytes) {
  const types=[];let at=8;
  while(at<bytes.length){const length=bytes.readUInt32BE(at),end=at+12+length;if(end>bytes.length)throw Error('Invalid authored chunk length');
    const type=bytes.toString('ascii',at+4,at+8);if(bytes.readUInt32BE(end-4)!==crc32(bytes.subarray(at+4,end-4)))throw Error('Invalid authored '+type+' CRC');types.push(type);at=end;}
  if(types[0]!=='IHDR'||types.at(-1)!=='IEND'||!types.includes('IDAT'))throw Error('Invalid authored PNG structure');
  if(types.includes('sRGB')&&(types.indexOf('sRGB')>types.indexOf('IDAT')||(types.includes('PLTE')&&types.indexOf('sRGB')>types.indexOf('PLTE'))))throw Error('sRGB must precede PLTE/IDAT');
  if(types.includes('PLTE')&&types.includes('tRNS')&&types.indexOf('tRNS')<types.indexOf('PLTE'))throw Error('tRNS must follow PLTE');
}
const srgb = chunk('sRGB', Buffer.from([0]));
add('rgba8-srgb-low-alpha', png(width, height, 6, 8, rowsRgba(authored, width, height), [srgb]), { oraclePolicy: 'exact-srgb8', colorType: 6, bitDepth: 8, note: 'Authored near colors and alpha0/1/64/127/128/192/254/255; no premultiplication in oracle.' });
const palette = Array.from({ length: 16 }, (_, i) => [29 + i, 43 + i % 5, 83 + i % 7]);
for (const depth of [1, 4]) {
  const count = 2 ** depth, alphas = Array.from({ length: count }, (_, i) => [0, 1, 64, 127, 128, 192, 254, 255][i % 8]), output = Buffer.alloc(width * height * 4), rows = [];
  for (let y = 0; y < height; y++) { const row = Buffer.alloc(Math.ceil(width * depth / 8)); for (let x = 0; x < width; x++) { const index = (y * width + x) % count, bit = x * depth; row[bit >> 3] |= index << (8 - depth - (bit & 7)); output.set([...palette[index], alphas[index]], (y * width + x) * 4); } rows.push(Buffer.from([0]), row); }
  add(`indexed${depth}-trns`, png(width, height, 3, depth, Buffer.concat(rows), [srgb, chunk('PLTE', Buffer.from(palette.slice(0, count).flat())), chunk('tRNS', Buffer.from(alphas))]), { authored: output, oraclePolicy: 'exact-srgb8', colorType: 3, bitDepth: depth, note: 'Odd row widths exercise packed index padding; tRNS includes partial alpha.' });
}
for (const type of [0, 4, 6]) {
  const channels = type === 0 ? 1 : type === 4 ? 2 : 4, rows = [], output = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0])); const row = Buffer.alloc(width * channels * 2);
    for (let x = 0; x < width; x++) { const p = (y * width + x) * 4, values = type === 6 ? [...authored.subarray(p, p + 4)] : type === 4 ? [authored[p], authored[p + 3]] : [authored[p]]; for (let c = 0; c < channels; c++) row.writeUInt16BE(values[c] * 257, (x * channels + c) * 2); output.set(type === 6 ? values : [values[0], values[0], values[0], type === 4 ? values[1] : 255], p); }
    rows.push(row);
  }
  add(type === 0 ? 'gray16' : type === 4 ? 'gray-alpha16' : 'rgba16', png(width, height, type, 16, Buffer.concat(rows), type === 6 ? [srgb] : []), { authored: output, oraclePolicy: 'exact-srgb8', colorType: type, bitDepth: 16, note: 'Every16bit sample is8bitvalue×257, avoiding ambiguous lower16bit rounding claims.' });
}
const rgbRows = [], rgbOutput = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++) { const row = Buffer.alloc(width * 3); for (let x = 0; x < width; x++) { const color = palette[(y * width + x) % 4]; row.set(color, x * 3); rgbOutput.set([...color, (y * width + x) % 4 === 1 ? 0 : 255], (y * width + x) * 4); } rgbRows.push(Buffer.from([0]), row); }
const trns = Buffer.alloc(6); palette[1].forEach((v, i) => trns.writeUInt16BE(v, i * 2));
add('rgb8-trns-key', png(width, height, 2, 8, Buffer.concat(rgbRows), [chunk('tRNS', trns), srgb]), { authored: rgbOutput, oraclePolicy: 'exact-srgb8', colorType: 2, bitDepth: 8, note: 'RGB transparency key is compared at original sample precision.' });
const adamRows = [], passes = [[0,0,8,8], [4,0,8,8], [0,4,4,8], [2,0,4,4], [0,2,2,4], [1,0,2,2], [0,1,1,2]];
for (const [sx, sy, dx, dy] of passes) for (let y = sy; y < height; y += dy) { if (sx >= width) continue; const row = []; for (let x = sx; x < width; x += dx) row.push(...authored.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)); adamRows.push(Buffer.from([0, ...row])); }
add('rgba8-adam7', png(width, height, 6, 8, Buffer.concat(adamRows), [srgb], 1), { oraclePolicy: 'exact-srgb8', colorType: 6, bitDepth: 8, interlace: 1, note: 'Hand-authored seven-pass Adam7; raw sample oracle unchanged.' });
const gamma = Buffer.alloc(4); gamma.writeUInt32BE(100000);
add('rgba8-linear-gamma', png(width, height, 6, 8, rowsRgba(authored, width, height), [chunk('gAMA', gamma)]), { oraclePolicy: 'browser-color-managed', colorType: 6, bitDepth: 8, note: 'Linear gamma must not be treated as encoded sRGB; compare browser-managed baseline, alpha remains exact.' });
const p3 = await sharp(authored, { raw: { width, height, channels: 4 } }).withIccProfile('p3').png().toBuffer();
add('rgba8-p3-icc', p3, { oraclePolicy: 'browser-color-managed', colorType: 6, bitDepth: 8, note: 'Valid DisplayP3 ICC output; raw-file RGB is not the sRGB oracle.' });
const exif = Buffer.alloc(26); exif.write('MM', 0, 'ascii'); exif.writeUInt16BE(42, 2); exif.writeUInt32BE(8, 4); exif.writeUInt16BE(1, 8); exif.writeUInt16BE(0x0112, 10); exif.writeUInt16BE(3, 12); exif.writeUInt32BE(1, 14); exif.writeUInt16BE(6, 18);
add('rgba8-exif-rotate90', png(width, height, 6, 8, rowsRgba(authored, width, height), [srgb, chunk('eXIf', exif)]), { oraclePolicy: 'browser-transform', colorType: 6, bitDepth: 8, orientation: 6, note: 'Presentation transform must retain existing browser behavior; encoded-grid RGB alone is not an orientation oracle.' });
function frameControl(sequence) { const data = Buffer.alloc(26); data.writeUInt32BE(sequence, 0); data.writeUInt32BE(width, 4); data.writeUInt32BE(height, 8); data.writeUInt16BE(1, 20); data.writeUInt16BE(10, 22); return chunk('fcTL', data); }
const animation = Buffer.alloc(8); animation.writeUInt32BE(2, 0);
const second = Buffer.from(Array.from({ length: width * height }, () => [255, 0, 0, 255]).flat()), compressed = deflateSync(rowsRgba(second, width, height));
for (const included of [true, false]) {
  const pieces = [signature, header(width, height, 6, 8), srgb, chunk('acTL', animation)];
  if (included) pieces.push(frameControl(0));
  pieces.push(chunk('IDAT', deflateSync(rowsRgba(authored, width, height))), frameControl(included ? 1 : 0), chunk('fdAT', Buffer.concat([Buffer.from([0,0,0,included ? 2 : 1]), compressed])));
  if (!included) pieces.push(frameControl(2), chunk('fdAT', Buffer.concat([Buffer.from([0,0,0,3]), compressed])));
  pieces.push(chunk('IEND'));
  add(included ? 'apng-default-is-frame0' : 'apng-default-excluded', Buffer.concat(pieces), { oraclePolicy: 'browser-animation', colorType: 6, bitDepth: 8, note: included ? 'Default PNG participates in animation; preserve existing static-first behavior.' : 'Static default differs from animation frame0; record preferred static/animation behavior rather than silently choosing another frame.' });
}
const valid = fixtures[0].bytes, badCrc = Buffer.from(valid); badCrc[badCrc.length - 1] ^= 1;
add('invalid-crc', badCrc, { oraclePolicy: 'invalid', colorType: 6, bitDepth: 8, note: 'CRC-corrupted IEND; native tolerance is recorded, not interpreted as validity.' });
add('invalid-truncated', valid.subarray(0, valid.length - 30), { oraclePolicy: 'invalid', colorType: 6, bitDepth: 8, note: 'Truncated compressed stream or trailing chunks; no fabricated pixels accepted.' });
add('unknown-critical', Buffer.concat([valid.subarray(0, 33), chunk('ABCD'), valid.subarray(33)]), { oraclePolicy: 'invalid', colorType: 6, bitDepth: 8, note: 'Unknown critical chunk is not safe for a narrow parser to ignore.' });
add('declared-oversize-header', Buffer.concat([signature, header(0x7fffffff, 2, 6, 8), chunk('IDAT', deflateSync(Buffer.from([0]))), chunk('IEND')]), { oraclePolicy: 'metadata-only', width: 0x7fffffff, height: 2, colorType: 6, bitDepth: 8, note: 'Do not actually decode this in a browser. Bound/overflow guard fixture only; data cannot satisfy declared geometry.' });

const manifest = { scope: 'Independent owned PNG corpus; no production encoder/decoder imports. Exact cases use authored unassociated samples; color/profile/transform/animation cases require preservation of browser-managed semantics, not forced raw equality. Metadata-only malformed geometry must never be sent to native allocation.', runtime: { node: process.version, sharp: sharp.versions.sharp }, references: ['https://www.w3.org/TR/png-3/', 'https://www.w3.org/TR/webcodecs/'], fixtures: [] };
for (const fixture of fixtures) {
  if(!['invalid','metadata-only'].includes(fixture.oraclePolicy))validatePositiveChunks(fixture.bytes);
  const file = fixture.id + '.png'; fs.writeFileSync(path.join(dir, file), fixture.bytes);
  const { bytes, authored: original, ...entry } = fixture;
  entry.file = file; entry.sha256 = hash(bytes); entry.bytes = bytes.length;
  if (!['invalid', 'metadata-only'].includes(entry.oraclePolicy)) {
    const raw = await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    entry.independentDecodedWidth = raw.info.width; entry.independentDecodedHeight = raw.info.height;
    entry.sharpRgbaFile = fixture.id + '-sharp.rgba'; fs.writeFileSync(path.join(dir, entry.sharpRgbaFile), raw.data); entry.sharpRgbaSha256 = hash(raw.data);
    entry.authoredRgbaFile = fixture.id + '-authored.rgba'; fs.writeFileSync(path.join(dir, entry.authoredRgbaFile), original); entry.authoredRgbaSha256 = hash(original);
    entry.alphaValues = [...new Set(Array.from({ length: original.length / 4 }, (_, i) => original[i * 4 + 3]))].sort((a, b) => a - b);
    if (entry.oraclePolicy === 'exact-srgb8') {
      let alpha = 0, rgb = 0; for (let p = 0; p < original.length; p += 4) { alpha += original[p + 3] !== raw.data[p + 3]; if (original[p + 3] && (original[p] !== raw.data[p] || original[p + 1] !== raw.data[p + 1] || original[p + 2] !== raw.data[p + 2])) rgb++; }
      entry.independentSharpCheck = { alphaMismatchPixels: alpha, visibleRgbMismatchPixels: rgb, pass: alpha === 0 && rgb === 0 };
      if (!entry.independentSharpCheck.pass) throw new Error('Independent decoder disagreed with authored sample oracle: ' + fixture.id + ' ' + JSON.stringify(entry.independentSharpCheck));
    }
  }
  manifest.fixtures.push(entry);
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ fixtures: manifest.fixtures.length, exact: manifest.fixtures.filter(f => f.oraclePolicy === 'exact-srgb8').length, browserManaged: manifest.fixtures.filter(f => f.oraclePolicy.startsWith('browser')).length, malformed: manifest.fixtures.filter(f => ['invalid', 'metadata-only'].includes(f.oraclePolicy)).length }));
