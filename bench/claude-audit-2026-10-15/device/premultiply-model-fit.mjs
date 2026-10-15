// Brute-forces 8-bit premultiply/unpremultiply rounding models against an engine's Cut128/Keep
// sprite saves (arg: downloads subfolder, e.g. firefox, webkit, firefox-pre). Residual 0/0 = fully explained.
import { decode, nearest, compare, fx, repo } from './audit-lib.mjs';
import { resolve } from 'node:path';
const EDG8 = ['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33'];
const src = (await decode(fx('alpha-sprite.png'))).frames[0], dir = resolve(repo, '.tmp/device/downloads', process.argv[2]);
const P = { floor: (c, a) => Math.floor(c * a / 255), round: (c, a) => Math.round(c * a / 255), ceil: (c, a) => Math.floor((c * a + 254) / 255) };
const U = { floor: (p, a) => Math.floor(p * 255 / a), round: (p, a) => Math.floor((p * 255 + (a >> 1)) / a), ceil: (p, a) => Math.ceil(p * 255 / a) };
const act = {}; for (const [file, mode] of [['Cut128-alpha-sprite-palette.png', 'cut'], ['Keep-alpha-sprite-palette.png', 'keep']]) act[mode] = (await decode(resolve(dir, file))).frames[0];
const out = { engine: process.argv[2], fileBytesModel: ['cut', 'keep'].map(m => compare(act[m], nearest(src, EDG8, { alphaMode: m }).data).rgbMismatch).join('/'), models: {} };
for (const [pn, pf] of Object.entries(P)) for (const [un, uf] of Object.entries(U)) {
  const rt = Uint8Array.from(src); for (let p = 0; p < rt.length; p += 4) { const a = rt[p + 3]; if (a && a < 255) for (let i = 0; i < 3; i++) rt[p + i] = Math.min(255, uf(pf(rt[p + i], a), a)); }
  out.models[pn + '-premultiply/' + un + '-unpremultiply'] = ['cut', 'keep'].map(m => compare(act[m], nearest(rt, EDG8, { alphaMode: m }).data).rgbMismatch).join('/');
}
console.log(JSON.stringify(out, null, 1));
