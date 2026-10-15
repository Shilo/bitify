// RESEARCH ONLY. Real-art acceptance harness for Keep opacity-aware palette selection.
// Usage:
//   node bench/keep-real-art-study/evaluate.mjs <manifest.json> [--out DIR] [--key FILE] [--no-control]
//   node bench/keep-real-art-study/evaluate.mjs --verify-key [--out DIR] [--key FILE]
// Defaults: --out bench/keep-real-art-study/results, --key bench/keep-real-art-study/blind-key.json.
// The matrix, metrics and blind protocol are fixed here before any cohort is seen.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { POLICIES, loadCandidates, renderSetting, summarize, sha256 } from './pipeline.js';
import { buildCandidates, sourceHash } from './build-candidates.mjs';

const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');

// ---------- Fixed settings matrix (per unit = still image or whole animation group) ----------
const S = (target, cap, metric, extra = {}) => ({ target, cap, metric, dither: 'none', ditherStrength: 50, ...extra });
export const UNIT_SETTINGS = [
  ['auto-c3-oklab', S('auto', 3, 'oklab')],
  ['auto-c4-oklab', S('auto', 4, 'oklab')],
  ['auto-c4-rgb', S('auto', 4, 'rgb')],
  ['auto-c8-oklab', S('auto', 8, 'oklab')],
  ['auto-c8-rgb', S('auto', 8, 'rgb')],
  ['auto-c16-oklab', S('auto', 16, 'oklab')],
  ['auto-all-oklab', S('auto', 0, 'oklab')],
  ['res64-c4-oklab', S('preset-res64', 4, 'oklab')],
  ['res64-c4-rgb', S('preset-res64', 4, 'rgb')],
  ['res64-c8-oklab', S('preset-res64', 8, 'oklab')],
  ['res64-c8-rgb', S('preset-res64', 8, 'rgb')],
  ['pico8-c4-oklab', S('preset-pico8', 4, 'oklab')],
  ['pico8-c4-rgb', S('preset-pico8', 4, 'rgb')],
  ['auto-c4-oklab-dither4x4', S('auto', 4, 'oklab', { dither: '4x4', ditherStrength: 50 })],
];
// Category walls (>=2 units): one shared Auto palette, equal asset mass, then per-unit caps.
export const WALL_SETTINGS = [['wall-auto-c4-oklab', S('auto', 4, 'oklab')], ['wall-auto-c8-oklab', S('auto', 8, 'oklab')]];

// ---------- Metric definitions (independent of the algorithms' objectives) ----------
const BACKGROUNDS = {
  black: () => [0, 0, 0], white: () => [255, 255, 255],
  checker: (x, y) => ((x >> 3) + (y >> 3)) & 1 ? [192, 192, 192] : [96, 96, 96],
  colored: () => [0x3a, 0x6e, 0xa5],
};
const BG_NAMES = Object.keys(BACKGROUNDS);
const REGIONS = ['opaque', 'strong', 'soft', 'faint'];
const regionOf = a => a === 255 ? 0 : a >= 128 ? 1 : a >= 16 ? 2 : a >= 1 ? 3 : -1;
const CLUSTER_RADIUS = 0.04, SALIENT_SHARE = 0.01, LOSS_DE = 0.08;
const VISUAL_BUDGET = 55 * 1024 * 1024, SHEET_MAX_SIDE = 384, STRIP_MAX_SIDE = 256, MAX_VISUAL_FRAMES = 4, BROWSER_CASES = 12, BROWSER_MAX_PIXELS = 1 << 20;

const decode = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
function oklab(r, g, b, out) { // linear-light inputs
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  out[0] = .2104542553 * l + .793617785 * m - .0040720468 * s; out[1] = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s; out[2] = .0259040371 * l + .7827717662 * m - .808675766 * s;
  return out;
}
const labOfRgb = rgb => oklab(decode(rgb >>> 16), decode(rgb >>> 8 & 255), decode(rgb & 255), [0, 0, 0]);
const hex = rgb => '#' + rgb.toString(16).padStart(6, '0');
const frameWeight = (unit, f) => unit.animated ? (Number.isFinite(f.delay) && f.delay > 0 ? f.delay : 100) : 1;

// Composite in encoded sRGB (how browsers/editors display straight alpha), then
// measure error in encoded 8-bit units, linear light (x255) and Oklab.
function regionMetrics(unit, outFrames) {
  const acc = BG_NAMES.map(() => Array.from({ length: 5 }, () => ({ w: 0, s8: 0, sl: 0, sk: 0 })));
  const pixels = [0, 0, 0, 0, 0];
  let alphaMismatch = 0, opaqueRgbChanged = 0, visibleRgbChanged = 0;
  const ls = [0, 0, 0], lo = [0, 0, 0], ks = [0, 0, 0], ko = [0, 0, 0];
  unit.frames.forEach((f, fi) => {
    const src = f.data, out = outFrames[fi], w = frameWeight(unit, f);
    for (let p = 0; p < src.length; p += 4) {
      const a = src[p + 3], r = regionOf(a);
      if (a !== out[p + 3]) alphaMismatch++;
      if (r < 0) continue;
      pixels[r]++; pixels[4]++;
      const same = a === out[p + 3] && src[p] === out[p] && src[p + 1] === out[p + 1] && src[p + 2] === out[p + 2];
      if (!same && (src[p] !== out[p] || src[p + 1] !== out[p + 1] || src[p + 2] !== out[p + 2])) { visibleRgbChanged++; if (a === 255) opaqueRgbChanged++; }
      const x = (p >> 2) % f.width, y = Math.floor((p >> 2) / f.width), as = a / 255, ao = out[p + 3] / 255;
      for (let b = 0; b < BG_NAMES.length; b++) {
        const e = acc[b][r], t = acc[b][4]; e.w += w; t.w += w;
        if (same) continue;
        const bg = BACKGROUNDS[BG_NAMES[b]](x, y);
        let s8 = 0;
        for (let c = 0; c < 3; c++) {
          const cs = src[p + c] * as + bg[c] * (1 - as), co = out[p + c] * ao + bg[c] * (1 - ao);
          s8 += (cs - co) ** 2; ls[c] = decode(cs); lo[c] = decode(co);
        }
        const sl = ((ls[0] - lo[0]) ** 2 + (ls[1] - lo[1]) ** 2 + (ls[2] - lo[2]) ** 2) * 65025;
        oklab(ls[0], ls[1], ls[2], ks); oklab(lo[0], lo[1], lo[2], ko);
        const sk = (ks[0] - ko[0]) ** 2 + (ks[1] - ko[1]) ** 2 + (ks[2] - ko[2]) ** 2;
        e.s8 += w * s8; e.sl += w * sl; e.sk += w * sk; t.s8 += w * s8; t.sl += w * sl; t.sk += w * sk;
      }
    }
  });
  const names = [...REGIONS, 'all'], round = v => Math.round(v * 1e6) / 1e6;
  const backgrounds = Object.fromEntries(BG_NAMES.map((bg, b) => [bg, Object.fromEntries(names.map((name, r) => {
    const e = acc[b][r];
    return [name, e.w ? { srgb8Rmse: round(Math.sqrt(e.s8 / (3 * e.w))), linearRmse: round(Math.sqrt(e.sl / (3 * e.w))), oklabRmse: round(Math.sqrt(e.sk / e.w)) } : null];
  }))]));
  return { regionPixels: Object.fromEntries(names.map((n, r) => [n, pixels[r]])), alphaMismatch, opaqueRgbChanged, visibleRgbChanged, backgrounds };
}

// Salient source colors: alpha x count x frame-duration mass per exact RGB, pooled
// into 15-bit RGB bins (weighted-mean Oklab), then greedy leader clustering in
// descending mass with fixed seed radius CLUSTER_RADIUS. Clusters >= SALIENT_SHARE
// of visible mass are salient.
function sourceClusters(unit) {
  const mass = new Map(); let total = 0;
  for (const f of unit.frames) {
    const w = frameWeight(unit, f), d = f.data;
    for (let p = 0; p < d.length; p += 4) if (d[p + 3]) { const k = d[p] << 16 | d[p + 1] << 8 | d[p + 2], m = d[p + 3] / 255 * w; mass.set(k, (mass.get(k) ?? 0) + m); total += m; }
  }
  const bins = new Map();
  for (const [rgb, m] of mass) {
    const key = (rgb >>> 19) << 10 | (rgb >>> 11 & 31) << 5 | (rgb >>> 3 & 31), lab = labOfRgb(rgb);
    let b = bins.get(key); if (!b) bins.set(key, b = { m: 0, l: 0, a: 0, bb: 0, top: rgb, topM: 0 });
    b.m += m; b.l += lab[0] * m; b.a += lab[1] * m; b.bb += lab[2] * m; if (m > b.topM) { b.topM = m; b.top = rgb; }
  }
  const ordered = [...bins.entries()].sort((x, y) => y[1].m - x[1].m || x[0] - y[0]).map(([, b]) => ({ ...b, lab: [b.l / b.m, b.a / b.m, b.bb / b.m] }));
  const clusters = [];
  for (const b of ordered) {
    let best = null, bestD = CLUSTER_RADIUS ** 2;
    for (const c of clusters) { const d = (c.seed[0] - b.lab[0]) ** 2 + (c.seed[1] - b.lab[1]) ** 2 + (c.seed[2] - b.lab[2]) ** 2; if (d <= bestD) { bestD = d; best = c; } }
    if (!best) clusters.push(best = { seed: b.lab, hex: hex(b.top), m: 0, l: 0, a: 0, bb: 0 });
    best.m += b.m; best.l += b.l; best.a += b.a; best.bb += b.bb;
  }
  return clusters.filter(c => total && c.m / total >= SALIENT_SHARE).map(c => ({ hex: c.hex, share: c.m / total, lab: [c.l / c.m, c.a / c.m, c.bb / c.m] }));
}
function salientLoss(clusters, outFrames) {
  const colors = new Set();
  for (const d of outFrames) for (let p = 0; p < d.length; p += 4) if (d[p + 3]) colors.add(d[p] << 16 | d[p + 1] << 8 | d[p + 2]);
  const labs = [...colors].map(labOfRgb), lost = [];
  for (const c of clusters) {
    let best = Infinity; for (const l of labs) best = Math.min(best, (l[0] - c.lab[0]) ** 2 + (l[1] - c.lab[1]) ** 2 + (l[2] - c.lab[2]) ** 2);
    const de = Math.sqrt(best); if (de > LOSS_DE) lost.push({ hex: c.hex, share: +c.share.toFixed(4), deltaE: +de.toFixed(4) });
  }
  return { distinctOutputColors: colors.size, salientClusters: clusters.length, lost, lostShare: +lost.reduce((s, l) => s + l.share, 0).toFixed(4) };
}

// ---------- Visuals ----------
function compositeRGB(data, w, h, bgName) {
  const out = Buffer.alloc(w * h * 3), bgf = BACKGROUNDS[bgName];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, a = data[p + 3] / 255, bg = bgf(x, y);
    for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = Math.round(data[p + c] * a + bg[c] * (1 - a));
  }
  return out;
}
const cellSize = (w, h, maxSide) => { const k = Math.floor(maxSide / Math.max(w, h)); return k >= 1 ? { cw: w * Math.min(4, k), ch: h * Math.min(4, k), k: Math.min(4, k) } : { cw: Math.max(1, Math.round(w * maxSide / Math.max(w, h))), ch: Math.max(1, Math.round(h * maxSide / Math.max(w, h))), k: maxSide / Math.max(w, h) }; };
const cellPng = (data, w, h, bg, cw, ch) => sharp(compositeRGB(data, w, h, bg), { raw: { width: w, height: h, channels: 3 } }).resize(cw, ch, { kernel: 'nearest' }).png().toBuffer();
const esc = s => String(s).replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);
const label = (text, width, height, size = 13) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="2" y="${height - 6}" font-family="Arial" font-size="${size}" fill="#111">${esc(text)}</text></svg>`);
const sampledFrames = n => n <= MAX_VISUAL_FRAMES ? [...Array(n).keys()] : [...new Set([0, Math.round(n / 3), Math.round(2 * n / 3), n - 1])];
export function sheetLayout(w, h, nFrames) {
  const { cw, ch, k } = cellSize(w, h, SHEET_MAX_SIDE), gap = 6, labelW = 110, header = 30, colHeader = 22;
  return { cw, ch, k, gap, labelW, header, colHeader, width: labelW + 4 * (cw + gap) + gap, height: header + colHeader + nFrames * BG_NAMES.length * (ch + gap) + gap,
    cell: (frameRow, bg, col) => ({ left: labelW + gap + col * (cw + gap), top: header + colHeader + (frameRow * BG_NAMES.length + bg) * (ch + gap) }) };
}
async function renderSheet(file, title, unit, columns) { // columns: [{name, frames}]
  const f0 = unit.frames[0], frames = sampledFrames(unit.frames.length), L = sheetLayout(f0.width, f0.height, frames.length), overlays = [];
  overlays.push({ input: label(title, L.width, L.header, 14), left: 0, top: 0 });
  columns.forEach((c, col) => overlays.push({ input: label(c.name, L.cw, L.colHeader), left: L.cell(0, 0, col).left, top: L.header }));
  for (const [row, fi] of frames.entries()) for (const [b, bg] of BG_NAMES.entries()) {
    const at = L.cell(row, b, 0);
    overlays.push({ input: label(`${unit.animated ? `f${fi} ` : ''}${bg}`, L.labelW, Math.min(L.ch, 24), 12), left: 2, top: at.top });
    for (const [col, c] of columns.entries()) overlays.push({ input: await cellPng(c.frames[fi], f0.width, f0.height, bg, L.cw, L.ch), ...L.cell(row, b, col) });
  }
  const png = await sharp({ create: { width: L.width, height: L.height, channels: 3, background: '#e8e8e8' } }).composite(overlays).png().toBuffer();
  await fs.writeFile(file, png); return png.length;
}
async function compositeStrip(data, w, h) { // row 1: 1x on 4 backgrounds; row 2: nearest enlargement (<=4x, <=256px)
  const { cw, ch, k } = cellSize(w, h, STRIP_MAX_SIDE), gap = 4, big = k >= 2, overlays = [];
  for (const [i, bg] of BG_NAMES.entries()) {
    overlays.push({ input: await cellPng(data, w, h, bg, w, h), left: gap + i * (w + gap), top: gap });
    if (big) overlays.push({ input: await cellPng(data, w, h, bg, cw, ch), left: gap + i * (cw + gap), top: 2 * gap + h });
  }
  return sharp({ create: { width: gap + 4 * ((big ? cw : w) + gap), height: gap + h + gap + (big ? ch + gap : 0), channels: 3, background: '#777777' } }).composite(overlays).png().toBuffer();
}

// ---------- Blind ordering ----------
function blindOrder(seed, caseId) {
  const bytes = crypto.createHmac('sha256', Buffer.from(seed, 'hex')).update(caseId).digest(), order = [...POLICIES];
  for (let i = order.length - 1; i > 0; i--) { const j = bytes[i] % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return order; // order[0] -> X, order[1] -> Y, order[2] -> Z
}
const LETTERS = ['X', 'Y', 'Z'];

// ---------- Inputs ----------
async function decodePng(file) {
  const meta = await sharp(file).metadata();
  if ((meta.pages ?? 1) > 1) throw new Error(`${file}: multi-page input; list animation frames individually in the manifest.`);
  const { data, info } = await sharp(file).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${file}: expected RGBA`);
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}
const pick = (...values) => values.find(v => v !== undefined && v !== null);
async function loadUnits(manifestPath) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')), base = path.dirname(manifestPath);
  const entries = Array.isArray(manifest) ? manifest : pick(manifest.assets, manifest.items, manifest.entries, manifest.files);
  if (!Array.isArray(entries) || !entries.length) throw new Error('Manifest has no asset entries.');
  const stills = [], groups = new Map();
  for (const e of entries) {
    const file = path.resolve(base, pick(e.file, e.path)), bytes = await fs.readFile(file);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (e.sha256 && e.sha256.toLowerCase() !== digest) throw new Error(`${e.id}: sha256 mismatch (cohort changed after freezing?)`);
    const frame = await decodePng(file);
    if ((e.w ?? e.width) && (e.w ?? e.width) !== frame.width || (e.h ?? e.height) && (e.h ?? e.height) !== frame.height) throw new Error(`${e.id}: manifest size does not match decoded size`);
    const anim = e.animation ?? {}, group = pick(anim.group, e.animationGroup, e.group);
    const record = { id: String(e.id), category: String(pick(e.category, 'uncategorized')), file: path.relative(root, file).split(path.sep).join('/'), sha256: digest, ...frame };
    if (group === undefined) { stills.push({ key: record.id, id: record.id, category: record.category, animated: false, files: [record.file], fileSha256: [digest], frames: [{ ...frame, delay: 1 }] }); continue; }
    record.index = Number(pick(anim.frame, anim.frameIndex, anim.index, e.frameIndex, e.frame, 0));
    record.delay = Number(pick(anim.duration, anim.durationMs, anim.delay, e.duration, e.durationMs, e.delay, 100));
    if (!groups.has(group)) groups.set(group, []); groups.get(group).push(record);
  }
  const units = [...stills];
  for (const [group, frames] of groups) {
    frames.sort((a, b) => a.index - b.index);
    if (new Set(frames.map(f => f.category)).size > 1) throw new Error(`Animation ${group} spans categories`);
    // Separately exported frames may differ in size. Center them on a shared canvas;
    // alpha-0 padding is empty in Keep and excluded from every region metric.
    const W = Math.max(...frames.map(f => f.width)), H = Math.max(...frames.map(f => f.height));
    for (const f of frames) if (f.width !== W || f.height !== H) {
      const data = new Uint8ClampedArray(W * H * 4), x0 = (W - f.width) >> 1, y0 = (H - f.height) >> 1;
      for (let y = 0; y < f.height; y++) data.set(f.data.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((y + y0) * W + x0) * 4);
      Object.assign(f, { width: W, height: H, data, padded: true });
    }
    units.push({ key: 'anim:' + group, id: String(group), category: frames[0].category, animated: true, files: frames.map(f => f.file), fileSha256: frames.map(f => f.sha256), frames: frames.map(f => ({ width: f.width, height: f.height, data: f.data, delay: f.delay })) });
  }
  return { units, manifestSha256: crypto.createHash('sha256').update(await fs.readFile(manifestPath)).digest('hex') };
}

async function resolveCandidates() {
  const spike = path.join(root, 'bench/keep-alpha-weighting-spike'), recorded = JSON.parse(await fs.readFile(path.join(spike, 'source-hashes.json'), 'utf8'));
  const current = { 'palette-generated': await sourceHash('palette-generated'), 'palette-limit': await sourceHash('palette-limit') };
  if (Object.keys(current).every(k => current[k] === recorded[k])) return { dir: '../keep-alpha-weighting-spike', regenerated: false, sourceHashes: current };
  await buildCandidates(path.join(here, 'candidates'));
  return { dir: './candidates', regenerated: true, sourceHashes: current };
}
const fileHash = async f => crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');

// ---------- Main evaluation ----------
async function evaluate(manifestPath, outDir, keyPath, control) {
  const t0 = performance.now(), { units, manifestSha256 } = await loadUnits(manifestPath), cand = await resolveCandidates(), candidates = await loadCandidates(cand.dir);
  for (const sub of ['outputs', 'composites', 'sheets', 'browser']) { await fs.rm(path.join(outDir, sub), { recursive: true, force: true }); await fs.mkdir(path.join(outDir, sub), { recursive: true }); }
  let key; try { key = JSON.parse(await fs.readFile(keyPath, 'utf8')); } catch { key = null; }
  if (!key?.seed) key = { seed: crypto.randomBytes(32).toString('hex') };
  key.note = 'SECRET. Blind sheet letter -> policy mapping. Do not share with judges until judgments are recorded.';
  key.results = path.relative(root, outDir).split(path.sep).join('/'); key.sheets = {};
  const results = { meta: {
    created: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), manifest: path.relative(root, manifestPath).split(path.sep).join('/'), manifestSha256,
    candidateDir: cand.dir, candidatesRegenerated: cand.regenerated, productionSourceHashes: cand.sourceHashes,
    fileHashes: Object.fromEntries(await Promise.all(['src/lib/quantize.js', 'src/lib/palette-dither.js', 'src/lib/palette-generated-sources.js', 'src/lib/palette-library.js', 'bench/keep-real-art-study/pipeline.js', 'bench/keep-real-art-study/evaluate.mjs'].map(async f => [f, await fileHash(path.join(root, f))]))),
    variants: { production: 'unmodified src/lib, Keep (control; must equal none)', none: 'candidate, equal pixel mass (current policy)', linear: 'candidate, mass x alpha/255', squared: 'candidate, mass x (alpha/255)^2', cut128: 'unmodified src/lib, Cut at 128 (reference column, no weighting)' },
    unitSettings: Object.fromEntries(UNIT_SETTINGS), wallSettings: Object.fromEntries(WALL_SETTINGS),
    metrics: { compositing: 'encoded-sRGB straight-alpha blend: c*a + bg*(1-a), a = byte/255; output uses its own alpha', errors: 'srgb8Rmse (encoded 0-255 per channel), linearRmse (linear light x255 per channel), oklabRmse (Euclidean dE_ok); weighted by frame duration for animations', backgrounds: { black: '#000000', white: '#ffffff', checker: '8px source-pixel squares #606060/#c0c0c0', colored: '#3a6ea5' }, regions: 'by SOURCE alpha: opaque 255, strong 128-254, soft 16-127, faint 1-15, all >=1', salient: `exact RGB mass alpha/255 x count x duration -> 15-bit RGB bins (mean Oklab) -> leader clustering radius ${CLUSTER_RADIUS} dE_ok in descending mass; salient if >= ${SALIENT_SHARE * 100}% of visible mass; lost if nearest visible output color > ${LOSS_DE} dE_ok` },
    decode: 'Sharp/libvips 8-bit sRGB RGBA (not browser decode); per-frame raw hashes recorded',
  }, units: [], cases: [], controlFailures: [], visuals: { bytes: 0, skippedComposites: 0 } };
  const cache = new Map(), written = new Set(), sheetsByTuple = new Map(), renders = [];
  let sheetNo = 0;
  const clustersOf = new Map(units.map(u => [u.key, sourceClusters(u)]));
  for (const [i, u] of units.entries()) {
    u.index = i;
    results.units.push({ index: i, id: u.id, category: u.category, animated: u.animated, files: u.files, fileSha256: u.fileSha256, width: u.frames[0].width, height: u.frames[0].height, frames: u.frames.length, delays: u.animated ? u.frames.map(f => f.delay) : undefined,
      rawSha256: await Promise.all(u.frames.map(f => sha256(f.data))), alphaHistogram: (() => { const r = [0, 0, 0, 0, 0]; for (const f of u.frames) for (let p = 3; p < f.data.length; p += 4) r[regionOf(f.data[p]) + 1]++; return { transparent: r[0], opaque: r[1], strong: r[2], soft: r[3], faint: r[4] }; })(),
      salientClusters: clustersOf.get(u.key).map(c => ({ hex: c.hex, share: +c.share.toFixed(4) })) });
    const src = sampledFrames(u.frames.length);
    for (const fi of src) { const png = await compositeStrip(u.frames[fi].data, u.frames[0].width, u.frames[0].height); await fs.writeFile(path.join(outDir, 'composites', `source-u${i}-f${fi}.png`), png); results.visuals.bytes += png.length; }
  }
  const metricCache = new Map();
  const writeOutputs = async (unit, frames, hashes) => {
    const files = [];
    for (const [fi, d] of frames.entries()) {
      const h = hashes[fi].slice(0, 16), file = `outputs/${h}.png`; files.push(file);
      if (written.has(h)) continue; written.add(h);
      const { width, height } = unit.frames[0], png = await sharp(Buffer.from(d.buffer, d.byteOffset, d.length), { raw: { width, height, channels: 4 } }).png().toBuffer();
      await fs.writeFile(path.join(outDir, file), png); results.visuals.bytes += png.length;
      if (sampledFrames(frames.length).includes(fi)) {
        if (results.visuals.bytes > VISUAL_BUDGET) { results.visuals.skippedComposites++; continue; }
        const strip = await compositeStrip(d, width, height); await fs.writeFile(path.join(outDir, 'composites', `${h}.png`), strip); results.visuals.bytes += strip.length;
      }
    }
    return files;
  };
  const runSetting = async (settingId, setting, members, wall) => {
    const rendered = {}, summaries = {};
    for (const v of [...(control ? ['production'] : []), ...POLICIES, 'cut128']) {
      const t = performance.now(); rendered[v] = await renderSetting(members, setting, v, candidates, cache); rendered[v].ms = performance.now() - t;
      summaries[v] = await summarize(rendered[v]);
    }
    if (control && JSON.stringify(summaries.production) !== JSON.stringify(summaries.none)) results.controlFailures.push({ setting: settingId, units: members.map(u => u.id) });
    renders.push({ settingId, setting, members: members.map(u => u.index), summaries, differs: members.some((_, m) => new Set(POLICIES.map(p => summaries[p].units[m]?.frameHashes.join())).size > 1) });
    for (const [m, unit] of members.entries()) {
      const caseId = `${unit.key}|${settingId}`, record = { caseId, unit: unit.index, unitId: unit.id, setting: settingId, wall: wall ?? undefined, variants: {} };
      for (const v of [...POLICIES, 'cut128']) {
        const r = rendered[v], s = summaries[v];
        if (r.empty) { record.variants[v] = { empty: true, note: 'Auto has no visible colors at this cut (app disables conversion)' }; continue; }
        const out = r.units[m], unitHash = s.units[m].frameHashes.join(), mk = `${unit.key}|${unitHash}`;
        if (!metricCache.has(mk)) metricCache.set(mk, { ...regionMetrics(unit, out.frames), salient: salientLoss(clustersOf.get(unit.key), out.frames) });
        record.variants[v] = { ms: Math.round(r.ms), sharedColors: setting.target === 'auto' ? s.shared : undefined, colors: out.colors, frameHashes: s.units[m].frameHashes, files: await writeOutputs(unit, out.frames, s.units[m].frameHashes), ...metricCache.get(mk) };
      }
      const h = Object.fromEntries(POLICIES.map(p => [p, record.variants[p].frameHashes?.join() ?? 'empty']));
      record.identicalAcrossPolicies = new Set(Object.values(h)).size === 1;
      record.pairsIdentical = { noneLinear: h.none === h.linear, noneSquared: h.none === h.squared, linearSquared: h.linear === h.squared };
      if (!record.identicalAcrossPolicies && POLICIES.every(p => !record.variants[p].empty)) {
        const tuple = `${unit.key}|${POLICIES.map(p => h[p]).join('|')}`;
        if (sheetsByTuple.has(tuple)) record.duplicateSheetOf = sheetsByTuple.get(tuple);
        else {
          const name = `sheet-${String(++sheetNo).padStart(4, '0')}.png`, order = blindOrder(key.seed, caseId), sheet = `sheets/${name}`;
          const columns = [{ name: 'Source', frames: unit.frames.map(f => f.data) }, ...order.map((p, i) => ({ name: LETTERS[i], frames: rendered[p].units[m].frames }))];
          const st = setting, title = `${name.replace('.png', '')} | asset ${unit.id}${unit.animated ? ` (${unit.frames.length} frames)` : ''} | ${st.target === 'auto' ? (wall ? 'Auto shared wall' : 'Auto') : st.target.replace('preset-', '')} cap ${st.cap || 'All'} ${st.metric}${st.dither !== 'none' ? ` dither ${st.dither}@${st.ditherStrength}` : ''} | X/Y/Z order randomized`;
          results.visuals.bytes += await renderSheet(path.join(outDir, sheet), title, unit, columns);
          key.sheets[name] = { caseId, ...Object.fromEntries(order.map((p, i) => [LETTERS[i], p])), hashes: Object.fromEntries(order.map((p, i) => [LETTERS[i], h[p]])) };
          sheetsByTuple.set(tuple, sheet); record.sheet = sheet;
        }
      }
      results.cases.push(record);
    }
  };
  for (const u of units) {
    const t = performance.now();
    for (const [id, setting] of UNIT_SETTINGS) await runSetting(id, setting, [u]);
    results.units[u.index].ms = Math.round(performance.now() - t);
    console.log(`unit ${u.index + 1}/${units.length} ${u.id}: ${results.units[u.index].ms} ms`);
    for (const k of [...cache.keys()]) if (k.includes(u.key)) cache.delete(k);
  }
  const categories = [...new Set(units.map(u => u.category))];
  for (const c of categories) {
    const members = units.filter(u => u.category === c); if (members.length < 2) continue;
    const t = performance.now();
    for (const [id, setting] of WALL_SETTINGS) await runSetting(id, setting, members, c);
    cache.clear(); console.log(`wall ${c} (${members.length} units): ${Math.round(performance.now() - t)} ms`);
  }
  // Browser parity export: one differing render per setting id, then two identical ones.
  const chosen = [], seen = new Set(), pixelsOf = r => r.members.reduce((s, i) => s + units[i].frames.length * units[i].frames[0].width * units[i].frames[0].height, 0);
  for (const r of renders) if (r.differs && !seen.has(r.settingId) && pixelsOf(r) <= BROWSER_MAX_PIXELS && chosen.length < BROWSER_CASES) { seen.add(r.settingId); chosen.push(r); }
  chosen.push(...renders.filter(r => !r.differs && pixelsOf(r) <= BROWSER_MAX_PIXELS).slice(0, 2));
  const exported = new Set(), browserCases = [];
  for (const r of chosen) {
    for (const i of r.members) if (!exported.has(i)) { exported.add(i); for (const [fi, f] of units[i].frames.entries()) await fs.writeFile(path.join(outDir, 'browser', `u${i}-f${fi}.rgba.gz`), zlib.gzipSync(Buffer.from(f.data.buffer, f.data.byteOffset, f.data.length))); }
    browserCases.push({ settingId: r.settingId, setting: r.setting, differs: r.differs, units: r.members.map(i => ({ index: i, key: units[i].key, animated: units[i].animated, width: units[i].frames[0].width, height: units[i].frames[0].height, delays: units[i].frames.map(f => f.delay), rawSha256: results.units[i].rawSha256 })), expected: r.summaries });
  }
  await fs.writeFile(path.join(outDir, 'browser', 'cases.json'), JSON.stringify({ candidateDir: cand.dir, head: results.meta.head, cases: browserCases }) + '\n');
  results.meta.totalMs = Math.round(performance.now() - t0);
  results.summary = { units: units.length, cases: results.cases.length, identicalAcrossPolicies: results.cases.filter(c => c.identicalAcrossPolicies).length, sheets: sheetNo, duplicateSheets: results.cases.filter(c => c.duplicateSheetOf).length, controlFailures: results.controlFailures.length, browserCases: browserCases.length };
  await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1) + '\n');
  await fs.writeFile(keyPath, JSON.stringify(key, null, 2) + '\n');
  console.log(JSON.stringify(results.summary), `visual bytes ${results.visuals.bytes}`);
  return results;
}

// ---------- Blind key round trip ----------
async function verifyKey(outDir, keyPath) {
  const key = JSON.parse(await fs.readFile(keyPath, 'utf8')), results = JSON.parse(await fs.readFile(path.join(outDir, 'results.json'), 'utf8')), failures = [];
  if (JSON.stringify(results).includes(key.seed)) failures.push('seed leaked into results.json');
  for (const f of await fs.readdir(path.join(outDir, 'sheets'))) if (/none|linear|squared|cut/i.test(f)) failures.push(`sheet filename leaks policy: ${f}`);
  let checked = 0;
  for (const c of results.cases.filter(c => c.sheet)) {
    const name = path.basename(c.sheet), entry = key.sheets[name];
    if (!entry || entry.caseId !== c.caseId) { failures.push(`${name}: missing or wrong case`); continue; }
    const order = blindOrder(key.seed, c.caseId);
    order.forEach((p, i) => { if (entry[LETTERS[i]] !== p) failures.push(`${name}: ${LETTERS[i]} mapping not reproducible from seed`); if (entry.hashes[LETTERS[i]] !== c.variants[p].frameHashes.join()) failures.push(`${name}: ${LETTERS[i]} hash != results ${p}`); });
    // Pixel round trip: the sheet's frame-0 black cell under each letter must be the mapped policy's output.
    const unit = results.units[c.unit], L = sheetLayout(unit.width, unit.height, sampledFrames(unit.frames).length);
    const sheet = await sharp(path.join(outDir, c.sheet)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [i, p] of order.entries()) {
      const { data, info } = await sharp(path.join(outDir, c.variants[p].files[0])).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const expected = await sharp(await cellPng(new Uint8Array(data), info.width, info.height, 'black', L.cw, L.ch)).raw().toBuffer(), at = L.cell(0, 0, i + 1);
      for (let y = 0; y < L.ch; y++) if (Buffer.compare(sheet.data.subarray(((at.top + y) * sheet.info.width + at.left) * 3, ((at.top + y) * sheet.info.width + at.left + L.cw) * 3), expected.subarray(y * L.cw * 3, (y + 1) * L.cw * 3))) { failures.push(`${name}: ${LETTERS[i]} cell pixels != ${p} output`); break; }
    }
    checked++;
  }
  const report = { checked, keySheets: Object.keys(key.sheets).length, failures };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length || checked !== report.keySheets) process.exitCode = 1;
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const outDir = path.resolve(opt('--out') ?? path.join(here, 'results')), keyPath = path.resolve(opt('--key') ?? path.join(here, 'blind-key.json'));
  if (path.resolve(path.dirname(keyPath)).startsWith(outDir)) throw new Error('The blind key must live outside the results directory.');
  if (args.includes('--verify-key')) await verifyKey(outDir, keyPath);
  else {
    const control = !args.includes('--no-control'), manifest = args.find(a => !a.startsWith('--'));
    if (!manifest) throw new Error('Usage: evaluate.mjs <manifest.json> [--out DIR] [--key FILE] [--no-control] | --verify-key');
    await fs.mkdir(outDir, { recursive: true });
    await evaluate(path.resolve(manifest), outDir, keyPath, control);
  }
}
