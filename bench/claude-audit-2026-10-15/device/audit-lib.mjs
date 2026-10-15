// Shared server + independent oracle for the device audit. No app module is imported:
// decoding uses Sharp (libvips/libspng/cgif), conversion is a scalar re-derivation.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, relative, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const req = createRequire('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json');
export const sharp = req('sharp');
export const repo = resolve(new URL('../../../', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
export const fxSmall = resolve(repo, 'bench/claude-audit-2026-10-15/device/fixtures');
export const fxBig = resolve(repo, '.tmp/device/fixtures');
export const fx = name => existsSync(resolve(fxSmall, name)) ? resolve(fxSmall, name) : resolve(fxBig, name);
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.json': 'application/json' };
export function serve(port, dist = resolve(repo, process.env.AUDIT_DIST ?? 'dist')) {
  const server = createServer((rq, rs) => {
    try {
      const url = new URL(rq.url, 'http://x');
      let file;
      if (url.pathname.startsWith('/fx/')) file = fx(decodeURIComponent(url.pathname.slice(4)));
      else if (url.pathname.startsWith('/colorfetti/')) file = resolve(dist, '.' + decodeURIComponent(url.pathname.slice(11) === '/' ? '/index.html' : url.pathname.slice(11)));
      else { rs.writeHead(302, { location: '/colorfetti/' }).end(); return; }
      const part = relative(url.pathname.startsWith('/fx/') ? resolve(file, '..') : dist, file);
      if (part.startsWith('..') || isAbsolute(part) || !existsSync(file)) { rs.writeHead(404).end(); return; }
      rs.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file));
    } catch (e) { rs.writeHead(500).end(String(e)); }
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

// Decode with Sharp. GIFs return composited frames + delays (ms) + loop.
export async function decode(bytesOrPath) {
  const img = sharp(bytesOrPath, { animated: true, limitInputPixels: false });
  const meta = await img.metadata(), { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pages = meta.pages ?? 1, h = meta.pageHeight ?? info.height, w = info.width, frame = w * h * 4;
  const frames = Array.from({ length: pages }, (_, i) => new Uint8Array(data.buffer, data.byteOffset + i * frame, frame));
  return { w, h, frames, delay: meta.delay, loop: meta.loop, format: meta.format, channels: meta.channels, bitsPerSample: meta.bitsPerSample, isPalette: meta.isPalette, paletteBitDepth: meta.paletteBitDepth };
}

const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function oklab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
// Expected nearest output. Cut: alpha < cut -> empty, else 255. Keep: alpha >= 1 kept as is.
export function nearest(src, colors, { metric = 'oklab', alphaMode = 'cut', cut = 128 } = {}) {
  const rgb = colors.map(hexRgb), key = metric === 'rgb' ? rgb : rgb.map(c => oklab(...c)), out = new Uint8Array(src.length), near = [];
  const memo = new Map();
  for (let p = 0; p < src.length; p += 4) {
    const a = src[p + 3];
    if (!a || (alphaMode === 'cut' && a < cut)) continue;
    const k = (src[p] << 16) | (src[p + 1] << 8) | src[p + 2];
    let pick = memo.get(k);
    if (pick === undefined) {
      pick = rgb.findIndex(c => c[0] === src[p] && c[1] === src[p + 1] && c[2] === src[p + 2]);
      if (pick < 0) {
        const v = metric === 'rgb' ? [src[p], src[p + 1], src[p + 2]] : oklab(src[p], src[p + 1], src[p + 2]);
        let best = Infinity, second = Infinity;
        for (let i = 0; i < key.length; i++) { const d = (key[i][0] - v[0]) ** 2 + (key[i][1] - v[1]) ** 2 + (key[i][2] - v[2]) ** 2; if (d < best) { second = best; best = d; pick = i; } else if (d < second) second = d; }
        if (second - best < 1e-9) near.push(k);
      }
      memo.set(k, pick);
    }
    out[p] = rgb[pick][0]; out[p + 1] = rgb[pick][1]; out[p + 2] = rgb[pick][2]; out[p + 3] = alphaMode === 'keep' ? a : 255;
  }
  return { data: out, nearTies: near.length };
}
export function compare(actual, expected, { rgbTolerance = 0 } = {}) {
  let alpha = 0, rgb = 0, first = null;
  for (let p = 0; p < expected.length; p += 4) {
    if (actual[p + 3] !== expected[p + 3]) { alpha++; first ??= { p: p / 4, actual: [...actual.subarray(p, p + 4)], expected: [...expected.subarray(p, p + 4)] }; continue; }
    if (expected[p + 3] && (Math.abs(actual[p] - expected[p]) > rgbTolerance || Math.abs(actual[p + 1] - expected[p + 1]) > rgbTolerance || Math.abs(actual[p + 2] - expected[p + 2]) > rgbTolerance)) { rgb++; first ??= { p: p / 4, actual: [...actual.subarray(p, p + 4)], expected: [...expected.subarray(p, p + 4)] }; }
  }
  return { alphaMismatch: alpha, rgbMismatch: rgb, first };
}
// Membership/alpha contract when no exact pixel oracle exists (dither, cap, Cleanup, Auto).
export function contract(actual, src, colors, { alphaMode = 'cut', cut = 128 } = {}) {
  const set = colors ? new Set(colors.map(c => c.toLowerCase())) : null, used = new Set();
  let offPalette = 0, alphaWrong = 0, exactChanged = 0;
  for (let p = 0; p < src.length; p += 4) {
    const a = src[p + 3], want = !a || (alphaMode === 'cut' && a < cut) ? 0 : alphaMode === 'keep' ? a : 255;
    if (actual[p + 3] !== want) alphaWrong++;
    if (!actual[p + 3]) continue;
    const hex = '#' + [0, 1, 2].map(i => actual[p + i].toString(16).padStart(2, '0')).join('');
    used.add(hex);
    if (set && !set.has(hex)) offPalette++;
    const srcHex = '#' + [0, 1, 2].map(i => src[p + i].toString(16).padStart(2, '0')).join('');
    if (set && set.has(srcHex) && srcHex !== hex) exactChanged++;
  }
  return { offPalette, alphaWrong, exactChanged, used: [...used].sort() };
}
export const usedColors = frames => { const s = new Set(); for (const f of frames) for (let p = 0; p < f.length; p += 4) if (f[p + 3]) s.add('#' + [0, 1, 2].map(i => f[p + i].toString(16).padStart(2, '0')).join('')); return [...s].sort(); };
