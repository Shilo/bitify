// Independently authored before seeing candidate results. Source bytes, not
// browser-decoded data, define these held-out acceptance cases.
const rgba = (r, g, b, a = 255) => [r, g, b, a];
function image(name, width, height, pixel, purpose) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return { name, purpose, original: { width, height, data } };
}
export function heldOutFixtures() {
  const core = [rgba(28, 32, 44), rgba(110, 100, 88), rgba(232, 210, 166)];
  return [
    image('faint-green-spill', 64, 64, (x, y) => x >= 20 && x < 44 && y >= 20 && y < 44 ? core[(x + y) % 3] : rgba(10, 240, 24, 1), 'Three useful opaque core shades; alpha-one surroundings must not displace them.'),
    image('intentional-cyan-halo', 64, 64, (x, y) => { const d = Math.hypot(x - 31.5, y - 31.5); return d < 9 ? core[Math.floor(d) % 3] : d < 29 ? rgba(38, 206, 244, 48) : rgba(0, 0, 0, 0); }, 'A visible uniform low-opacity cyan halo must remain a useful color.'),
    image('orange-light-fade', 64, 64, (x, y) => { const d = Math.hypot(x - 31.5, y - 31.5); return d < 8 ? rgba(255, 238, 202) : d < 30 ? rgba(255, 112 + Math.round(d * 2), Math.round(d), Math.max(1, Math.round((30 - d) / 22 * 180))) : rgba(0, 0, 0, 0); }, 'Intentional orange glow with varying RGB and alpha; evaluate on dark and light surfaces.'),
    image('antialias-edges', 48, 48, (x, y) => { const d = Math.hypot(x - 23.5, y - 23.5); return d < 12 ? rgba(94, 74, 162) : d < 13 ? rgba(94, 74, 162, Math.round((13 - d) * 255)) : rgba(232, 104, 42, 0); }, 'Soft edges share source RGB with the opaque body; all visible values should remain exact.'),
    image('rare-red-eyes', 64, 64, (x, y) => x >= 18 && x < 46 && y >= 18 && y < 46 ? y === 27 && (x === 25 || x === 38) ? rgba(255, 20, 45) : core[(x + y) % 3] : rgba(15, 220, 120, 5), 'Two important opaque accent pixels; weighting must not increase accent loss.'),
    image('all-soft-water-ramp', 64, 32, (x, y) => rgba(18 + x * 3, 55 + x * 2, 140 + y * 3, 12 + (x * 5 + y * 3) % 180), 'Artwork with no opaque core; do not equate low alpha with meaningless pixels.'),
    image('binary-opaque-control', 48, 48, (x, y) => (x + y) % 7 ? rgba(x * 5, y * 5, (x * 13 + y * 7) % 256) : rgba(235, 12, 164, 0), 'Binary transparency requires byte-identical output under Keep.'),
    image('binned-soft-spectrum', 96, 64, (x, y) => rgba((x + y * 96) >>> 8, (x + y * 96) & 255, ((x + y * 96) * 73) & 255, 1 + (x * 17 + y * 31) % 255), 'More than 4096 distinct RGBs; exercise bounded histograms and weighted second pass.'),
    image('source-rgb-small-alpha', 32, 16, (x, y) => rgba((x % 8) * 32, (y % 4) * 64, 128, 1 + (x + y * 32) % 255), 'Exactly 32 RGBs with different alpha; Auto All must retain each source color exactly.'),
  ];
}

const decode = n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
function lab(rgb) {
  const [r, g, b] = rgb.map(decode), l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s];
}
export function independentMetrics(source, actual) {
  if (source.width !== actual.width || source.height !== actual.height || source.data.length !== actual.data.length) throw new Error('Mismatched dimensions.');
  let alphaMismatch = 0, visibleRgbMismatch = 0, opaqueRgbMismatch = 0;
  const sets = Object.fromEntries(['all', 'soft', 'alpha128', 'opaque'].map(k => [k, Object.fromEntries(['black', 'white', 'checker'].map(b => [b, { samples: 0, squaredRgb: 0, squaredLab: 0 }]))]));
  for (let at = 0; at < source.data.length; at += 4) {
    const a = source.data[at + 3], outAlpha = actual.data[at + 3], changed = [0,1,2].some(k => source.data[at + k] !== actual.data[at + k]);
    if (a !== outAlpha) alphaMismatch++;
    if (a && changed) visibleRgbMismatch++;
    if (a === 255 && changed) opaqueRgbMismatch++;
    const pixel = at / 4, x = pixel % source.width, y = Math.floor(pixel / source.width);
    for (const [background, back] of [['black', 0], ['white', 255], ['checker', ((x >>> 3) + (y >>> 3)) % 2 ? 192 : 96]]) {
      const original = [0,1,2].map(k => source.data[at+k]*a/255+back*(1-a/255)), output = [0,1,2].map(k => actual.data[at+k]*outAlpha/255+back*(1-outAlpha/255));
      const squaredRgb = original.reduce((sum,v,k) => sum + (v-output[k])**2,0), l1=lab(original), l2=lab(output), squaredLab=l1.reduce((sum,v,k) => sum+(v-l2[k])**2,0);
      for (const key of ['all', ...(a > 0 && a < 128 ? ['soft'] : []), ...(a >= 128 ? ['alpha128'] : []), ...(a === 255 ? ['opaque'] : [])]) { const entry=sets[key][background]; entry.samples++; entry.squaredRgb+=squaredRgb; entry.squaredLab+=squaredLab; }
    }
  }
  for (const set of Object.values(sets)) for (const entry of Object.values(set)) { entry.rgbRmse=entry.samples ? Math.sqrt(entry.squaredRgb/(entry.samples*3)) : 0; entry.labRmse=entry.samples ? Math.sqrt(entry.squaredLab/entry.samples) : 0; }
  return { alphaMismatch, visibleRgbMismatch, opaqueRgbMismatch, sets };
}
