// Research harness: generates files in a separate headless Aseprite process,
// exercises existing Colorfetti parsers, and records results. No product changes.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAsePalette } from '../../src/lib/palette-ase.js';
import { parsePaletteText, extractPalette } from '../../src/lib/palette-import.js';
import { unzlibSync } from 'fflate';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('./', import.meta.url));
const out = join(root, 'fixtures');
mkdirSync(out, { recursive: true });
const exe = process.env.ASEPRITE_EXE || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe';
const native = spawnSync(exe, ['-b', '--script-param', `out=${out.replaceAll('\\', '/')}`, '--script', resolve(root, 'generate.lua')], {
  windowsHide: true, encoding: 'utf8', timeout: 30000
});
if (native.error || native.status !== 0) throw native.error || new Error(`Aseprite exit ${native.status}: ${native.stderr}`);

// Independent PNG decoder restricted to the native test files' known 8-bit
// indexed/RGBA/RGB noninterlaced layouts. Rejects any unimplemented layout.
function pngPixels(bytes) {
  let width, height, depth, type, palette, alpha;
  const compressed = [];
  for (let p = 8; p < bytes.length;) {
    const size = bytes.readUInt32BE(p), kind = bytes.toString('ascii', p+4, p+8), data = bytes.subarray(p+8, p+8+size);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9];
      if (depth !== 8 || data[12] !== 0 || ![2,3,6].includes(type)) throw new Error('Unexpected fixture PNG layout');
    } else if (kind === 'PLTE') palette = data;
    else if (kind === 'tRNS') alpha = data;
    else if (kind === 'IDAT') compressed.push(data);
    p += size + 12;
  }
  const raw = unzlibSync(Buffer.concat(compressed)), bpp = type === 3 ? 1 : type === 2 ? 3 : 4;
  const stride = width*bpp, decoded = new Uint8Array(height*stride), rgba = new Uint8ClampedArray(width*height*4);
  for (let y = 0; y < height; y++) {
    const filter = raw[y*(stride+1)];
    for (let x = 0; x < stride; x++) {
      const at = y*stride+x, a = x >= bpp ? decoded[at-bpp] : 0, b = y ? decoded[at-stride] : 0, c = y && x >= bpp ? decoded[at-stride-bpp] : 0;
      let prediction = 0;
      if (filter === 1) prediction = a;
      else if (filter === 2) prediction = b;
      else if (filter === 3) prediction = Math.floor((a+b)/2);
      else if (filter === 4) {
        const p = a+b-c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
        prediction = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error('Unexpected PNG filter');
      decoded[at] = raw[y*(stride+1)+x+1] + prediction;
    }
  }
  for (let i = 0; i < width*height; i++) {
    const p = i*bpp, dest = i*4;
    if (type === 3) {
      const index = decoded[p];
      rgba.set(palette.subarray(index*3, index*3+3), dest); rgba[dest+3] = alpha?.[index] ?? 255;
    } else {
      rgba.set(decoded.subarray(p, p+3), dest); rgba[dest+3] = type === 6 ? decoded[p+3] : 255;
    }
  }
  return { width, height, data: rgba };
}
const results = { researchDate: '2026-10-16', nativeLog: readFileSync(join(out, 'native-log.txt'), 'utf8'), files: [] };
for (const name of readdirSync(out).sort()) {
  if (name.endsWith('.txt')) continue;
  const data = readFileSync(join(out, name)), ext = name.split('.').pop();
  const record = { name, bytes: data.length };
  try {
    let result;
    if (['ase','aseprite'].includes(ext)) result = await parseAsePalette(data.buffer.slice(data.byteOffset, data.byteOffset+data.byteLength));
    else if (['hex','gpl','pal'].includes(ext)) result = {colors: parsePaletteText(data.toString(), ext)};
    else if (ext === 'png') {
      const pixels = pngPixels(data);
      result = await extractPalette(pixels);
      record.dimensions = [pixels.width, pixels.height];
    } else {
      record.status = 'unsupported by current file router'; results.files.push(record); continue;
    }
    record.status = 'accepted'; record.colors = result.colors;
    if ('partialAlpha' in result) record.partialAlpha = result.partialAlpha;
  } catch (error) { record.status = 'rejected'; record.error = error.message; }
  results.files.push(record);
}
// Text payload format is verified from upstream native clipboard code, not an
// OS clipboard read. This checks parser compatibility with that exact grammar.
results.clipboardGrammar = parsePaletteText('#123456\n#ff0000\n#0000ff');
const find = name => results.files.find(file => file.name === name);
const opaque = ['#123456', '#ff0000', '#0000ff', '#000000'];
const alpha = ['#123456', '#ff0000', '#0000ff', '#04c850'];
for (const ext of ['ase', 'aseprite', 'png', 'hex', 'gpl', 'pal']) {
  assert.equal(find(`opaque-palette.${ext}`).status, 'accepted');
  assert.deepEqual(find(`opaque-palette.${ext}`).colors, opaque);
}
for (const ext of ['ase', 'aseprite', 'png']) {
  assert.deepEqual(find(`alpha-palette.${ext}`).colors, alpha);
  assert.equal(find(`alpha-palette.${ext}`).partialAlpha, true);
}
for (const ext of ['gpl', 'pal']) assert.equal(find(`alpha-palette.${ext}`).status, 'rejected');
assert.deepEqual(find('alpha-palette.hex').colors, ['#123456', '#ff0000', '#0000ff', '#090807', '#04c850']);
assert.deepEqual(find('opaque-artwork.aseprite').colors, opaque);
assert.deepEqual(find('opaque-artwork.png').colors, ['#ff00ff']);
assert.deepEqual(results.clipboardGrammar, ['#123456', '#ff0000', '#0000ff']);
results.assertions = 'passed';
writeFileSync(join(root, 'results.json'), JSON.stringify(results, null, 2)+'\n');
console.log(JSON.stringify(results, null, 2));
