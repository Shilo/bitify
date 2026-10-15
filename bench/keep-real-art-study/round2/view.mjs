// RESEARCH ONLY (round 2). Unblinded labeled view: columns source | none | linear | squared,
// rows black/white/checker/colored. Usage: node view.mjs "<caseId>" [scale] [x,y,w,h crop] [frame]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), study = path.resolve(here, '..');
const results = JSON.parse(await fs.readFile(path.join(study, 'results/results.json'), 'utf8'));
const [caseId, scaleArg = '1', cropArg, frameArg = '0'] = process.argv.slice(2);
const c = results.cases.find(c => c.caseId === caseId); if (!c) throw new Error('no case ' + caseId);
const unit = results.units[c.unit], fi = +frameArg;
const BG = { black: () => [0, 0, 0], white: () => [255, 255, 255], checker: (x, y) => ((x >> 3) + (y >> 3)) & 1 ? [192, 192, 192] : [96, 96, 96], colored: () => [0x3a, 0x6e, 0xa5] };
const raw = async f => { const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const cols = [['source', path.resolve(study, '../..', unit.files[fi])], ...['none', 'linear', 'squared'].map(v => [v, path.join(study, 'results', c.variants[v].files[fi])])];
const imgs = await Promise.all(cols.map(([, f]) => raw(f)));
// Animation frames may be padded to a shared canvas in outputs; centre the source like evaluate.mjs.
const W = imgs[1].w, H = imgs[1].h;
if (imgs[0].w !== W || imgs[0].h !== H) { const s = imgs[0], d = Buffer.alloc(W * H * 4), x0 = (W - s.w) >> 1, y0 = (H - s.h) >> 1; for (let y = 0; y < s.h; y++) s.data.copy(d, ((y + y0) * W + x0) * 4, y * s.w * 4, (y + 1) * s.w * 4); imgs[0] = { data: d, w: W, h: H }; }
const [cx, cy, cw, ch] = cropArg && cropArg !== '-' ? cropArg.split(',').map(Number) : [0, 0, W, H], k = +scaleArg, gap = 4, overlays = [];
for (const [r, name] of Object.keys(BG).entries()) for (const [col, img] of imgs.entries()) {
  const out = Buffer.alloc(cw * ch * 3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const p = ((y + cy) * W + x + cx) * 4, a = img.data[p + 3] / 255, bg = BG[name](x + cx, y + cy); for (let i = 0; i < 3; i++) out[(y * cw + x) * 3 + i] = Math.round(img.data[p + i] * a + bg[i] * (1 - a)); }
  overlays.push({ input: await sharp(out, { raw: { width: cw, height: ch, channels: 3 } }).resize(cw * k, ch * k, { kernel: 'nearest' }).png().toBuffer(), left: gap + col * (cw * k + gap), top: 20 + gap + r * (ch * k + gap) });
}
const width = gap + 4 * (cw * k + gap), height = 20 + gap + 4 * (ch * k + gap);
overlays.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">${cols.map(([n], i) => `<text x="${gap + i * (cw * k + gap) + 2}" y="15" font-family="Arial" font-size="13" fill="#000">${n}</text>`).join('')}</svg>`), left: 0, top: 0 });
const file = path.join(here, 'views', `${caseId.replace(/[|:]/g, '_')}${cropArg && cropArg !== '-' ? '_crop' : ''}_f${fi}.png`);
await sharp({ create: { width, height, channels: 3, background: '#e8e8e8' } }).composite(overlays).png().toFile(file);
console.log(file, W, H, 'colors', JSON.stringify(Object.fromEntries(['none', 'linear', 'squared'].map(v => [v, c.variants[v].colors]))));
