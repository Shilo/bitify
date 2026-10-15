// Do Black & white and Glow produce the same light/dark partition (i.e. differ only in ink RGB)?
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = 'bench/palette-curation-spike/';
const out = {};
for (const fx of ['items64', 'armor16', 'material-synthetic', 'ramp-synthetic']) for (const d of ['none', '4x4']) {
  const dec = async f => (await sharp(dir + f).ensureAlpha().raw().toBuffer());
  const [a, b, c] = await Promise.all([`${fx}-mono-${d}.png`, `${fx}-glow-${d}.png`, `${fx}-paper-${d}.png`].map(dec));
  let n = 0, glowDiff = 0, paperDiff = 0;
  for (let p = 0; p < a.length; p += 4) { if (!a[p + 3]) continue; n++; const light = a[p] > 128; if ((b[p] > 128) !== light) glowDiff++; if ((c[p] > 128) !== light) paperDiff++; }
  out[`${fx}/${d}`] = { visible: n, glowPartitionDiffers: glowDiff, paperPartitionDiffers: paperDiff };
}
console.log(JSON.stringify(out, null, 1));
