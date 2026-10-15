// Classifies WebKit/Firefox (arg) Save mismatches: re-run the oracle on a source whose translucent RGB
// went through truncating 8-bit premultiply/unpremultiply (the canvas/bitmap fallback path).
import { decode, nearest, compare, fx, contract, repo } from './audit-lib.mjs';
import { resolve } from 'node:path';
const EDG8 = ['#fdfdf8', '#d32734', '#da7d22', '#e6da29', '#28c641', '#2d93dd', '#7b53ad', '#1b1c33'];
const src = (await decode(fx('alpha-sprite.png'))).frames[0], rt = Uint8Array.from(src);
for (let p = 0; p < rt.length; p += 4) { const a = rt[p + 3]; if (a && a < 255) for (let i = 0; i < 3; i++) rt[p + i] = Math.min(255, Math.floor(Math.floor(rt[p + i] * a / 255) * 255 / a)); } // truncating model fits WebKit exactly
const engine = process.argv[2] ?? 'webkit', dir = resolve(repo, '.tmp/device/downloads', engine), out = {};
for (const [file, mode] of [['Cut128-alpha-sprite-palette.png', 'cut'], ['Keep-alpha-sprite-palette.png', 'keep']]) {
  const d = (await decode(resolve(dir, file))).frames[0];
  out[file] = { vsFileBytes: compare(d, nearest(src, EDG8, { alphaMode: mode }).data), vsPremultipliedRoundTrip: compare(d, nearest(rt, EDG8, { alphaMode: mode }).data) };
}
for (const file of ['dither-4x4-50-keep-alpha-sprite-palette.png', 'dither-8x8-100-keep-alpha-sprite-palette.png']) {
  const d = (await decode(resolve(dir, file))).frames[0];
  out[file] = { exactChangedVsFile: contract(d, src, EDG8, { alphaMode: 'keep' }).exactChanged, exactChangedVsRoundTrip: contract(d, rt, EDG8, { alphaMode: 'keep' }).exactChanged };
}
console.log(JSON.stringify(out, null, 1));
