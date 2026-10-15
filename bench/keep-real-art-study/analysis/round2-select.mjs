// RESEARCH ONLY. Applies analysis/round2-selection-rule.md: two-way blind none vs linear sheets.
// Usage: node bench/keep-real-art-study/analysis/round2-select.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const here = path.dirname(fileURLToPath(import.meta.url)), study = path.resolve(here, '..'), root = path.resolve(study, '../..');
const read = async f => JSON.parse(await fs.readFile(f, 'utf8'));
const R = await read(path.join(study, 'results/results.json')), M = await read(path.join(here, 'metrics.json')), U = await read(path.join(here, 'unblinded.json'));
const manifest = Object.values(await read(path.join(study, 'cohort/manifest.json')));
const outDir = path.join(root, '.tmp/keep-judge/R2'), keyFile = path.join(root, '.tmp/keep-blind/round2-key.json');

// ---------- Selection ----------
const caseById = new Map(R.cases.map(c => [c.caseId, c])), metricById = new Map(M.cases.map(c => [c.caseId, c]));
const isReal = c => R.units[c.unit].category !== 'synthetic-counterexample';
const eligible = c => c && isReal(c) && !c.pairsIdentical.noneLinear;
const picks = new Map();
const add = (id, reason) => { const c = caseById.get(id); if (!eligible(c)) return; const p = picks.get(id) ?? { caseId: id, reasons: [] }; if (!p.reasons.includes(reason)) p.reasons.push(reason); picks.set(id, p); };
for (const c of R.cases) if (!c.wall && c.setting.endsWith('-rgb')) add(c.caseId, 'rule1-rgb');
const worst = c => Math.max(-Infinity, ...['opaque', 'strong', 'soft', 'faint'].filter(r => (c.regionPixels[r] ?? 0) >= 16).flatMap(r => Object.values(c.policies.linear.oklabDelta).map(d => d[r] ?? -Infinity)));
M.cases.filter(c => eligible(caseById.get(c.caseId))).map(c => ({ id: c.caseId, w: worst(c) })).sort((a, b) => b.w - a.w || a.id.localeCompare(b.id)).slice(0, 12).forEach(x => add(x.id, 'rule2-top12-linear-regression'));
for (const r of U.rows) if (r.sev.linear > r.sev.none) add(r.caseId, 'rule3-judged-worse');
let t = 20261016;
const rand = () => { t = (t + 0x6D2B79F5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const controls = [...new Set(U.rows.filter(r => r.sev.linear < r.sev.none && eligible(caseById.get(r.caseId)) && !picks.has(r.caseId)).map(r => r.caseId))].sort();
shuffle(controls).slice(0, 8).forEach(id => add(id, 'rule4-control-judged-better'));
// Merge identical output tuples.
const merged = new Map();
for (const p of picks.values()) {
  const c = caseById.get(p.caseId), k = `${c.unit}|${c.variants.none.frameHashes.join()}|${c.variants.linear.frameHashes.join()}`;
  const m = merged.get(k) ?? { cases: [], reasons: [] }; m.cases.push(p.caseId); for (const r of p.reasons) if (!m.reasons.includes(r)) m.reasons.push(r); merged.set(k, m);
}
t = 20261017;
const sheets = shuffle([...merged.values()].sort((a, b) => a.cases[0].localeCompare(b.cases[0])));

// ---------- Pixels ----------
const BG = { black: () => [0, 0, 0], white: () => [255, 255, 255], checker: (x, y) => ((x >> 3) + (y >> 3)) & 1 ? [192, 192, 192] : [96, 96, 96], '#3a6ea5': () => [0x3a, 0x6e, 0xa5] };
const BGN = Object.keys(BG);
const rawPng = async f => { const { data, info } = await sharp(f).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.length) }; };
async function sourceFrames(unit) { // same decode and centre padding as evaluate.mjs
  const frames = await Promise.all(unit.files.map(f => rawPng(path.join(root, f))));
  const W = Math.max(...frames.map(f => f.w)), H = Math.max(...frames.map(f => f.h));
  return frames.map(f => { if (f.w === W && f.h === H) return f.data; const d = new Uint8Array(W * H * 4), x0 = (W - f.w) >> 1, y0 = (H - f.h) >> 1; for (let y = 0; y < f.h; y++) d.set(f.data.subarray(y * f.w * 4, (y + 1) * f.w * 4), ((y + y0) * W + x0) * 4); return d; });
}
const composite = (d, w, h, bg) => { const o = Buffer.alloc(w * h * 3), f = BG[bg]; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4, a = d[p + 3] / 255, b = f(x, y); for (let c = 0; c < 3; c++) o[(y * w + x) * 3 + c] = Math.round(d[p + c] * a + b[c] * (1 - a)); } return o; };
const dec = new Float64Array(256).map((_, v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
const lab = (r, g, b, o) => { r = dec[r]; g = dec[g]; b = dec[b]; const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); o[0] = .2104542553 * l + .793617785 * m - .0040720468 * s; o[1] = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s; o[2] = .0259040371 * l + .7827717662 * m - .808675766 * s; };
const sampled = n => n <= 4 ? [...Array(n).keys()] : [...new Set([0, Math.round(n / 3), Math.round(2 * n / 3), n - 1])];
function bestCrop(w, h, srcs, nones, lins) {
  const score = new Float64Array(w * h), a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
  for (let i = 0; i < srcs.length; i++) for (const bg of BGN) {
    const s = composite(srcs[i], w, h, bg), n = composite(nones[i], w, h, bg), l = composite(lins[i], w, h, bg);
    for (let p = 0, q = 0; p < w * h; p++, q += 3) {
      if (s[q] === n[q] && s[q + 1] === n[q + 1] && s[q + 2] === n[q + 2] && n[q] === l[q] && n[q + 1] === l[q + 1] && n[q + 2] === l[q + 2]) continue;
      lab(s[q], s[q + 1], s[q + 2], a); lab(n[q], n[q + 1], n[q + 2], b); lab(l[q], l[q + 1], l[q + 2], c);
      score[p] += Math.abs(Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) - Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  const cw = Math.min(96, w), ch = Math.min(96, h), S = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) S[(y + 1) * (w + 1) + x + 1] = score[y * w + x] + S[y * (w + 1) + x + 1] + S[(y + 1) * (w + 1) + x] - S[y * (w + 1) + x];
  let best = -1, bx = 0, by = 0;
  const xs = [], ys = []; for (let x = 0; x <= w - cw; x += 4) xs.push(x); if (xs.at(-1) !== w - cw) xs.push(w - cw); for (let y = 0; y <= h - ch; y += 4) ys.push(y); if (ys.at(-1) !== h - ch) ys.push(h - ch);
  for (const y of ys) for (const x of xs) { const v = S[(y + ch) * (w + 1) + x + cw] - S[y * (w + 1) + x + cw] - S[(y + ch) * (w + 1) + x] + S[y * (w + 1) + x]; if (v > best) { best = v; bx = x; by = y; } }
  return { x: bx, y: by, w: cw, h: ch };
}

// ---------- Rendering ----------
const esc = s => String(s).replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);
const label = (text, width, height, size = 13) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="2" y="${height - 6}" font-family="Arial" font-size="${size}" fill="#111">${esc(text)}</text></svg>`);
const panelsOf = (w, h, crop) => {
  const side = Math.max(w, h), fit = side > 320 ? 320 / side : 1, enl = side <= 128 ? Math.floor(320 / side) : 0, cs = Math.max(1, Math.floor(288 / Math.max(crop.w, crop.h)));
  return [
    { name: fit === 1 ? '1x' : `fit ${(fit * 100).toFixed(0)}% (image ${w}x${h})`, w: Math.round(w * fit), h: Math.round(h * fit), make: (d, bg) => sharp(composite(d, w, h, bg), { raw: { width: w, height: h, channels: 3 } }).resize(Math.round(w * fit), Math.round(h * fit), fit === 1 ? { kernel: 'nearest' } : {}).png().toBuffer() },
    ...(fit < 1 ? [{ name: 'crop 1x', w: crop.w, h: crop.h, make: (d, bg) => sharp(composite(d, w, h, bg), { raw: { width: w, height: h, channels: 3 } }).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).png().toBuffer() }] : []),
    ...(enl >= 2 ? [{ name: `${enl}x`, w: w * enl, h: h * enl, make: (d, bg) => sharp(composite(d, w, h, bg), { raw: { width: w, height: h, channels: 3 } }).resize(w * enl, h * enl, { kernel: 'nearest' }).png().toBuffer() }] : []),
    ...(enl >= 2 && crop.w === w && crop.h === h ? [] : [{ name: `crop x${crop.x} y${crop.y} ${crop.w}x${crop.h} at ${cs}x`, w: crop.w * cs, h: crop.h * cs, make: (d, bg) => sharp(composite(d, w, h, bg), { raw: { width: w, height: h, channels: 3 } }).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).resize(crop.w * cs, crop.h * cs, { kernel: 'nearest' }).png().toBuffer() }]),
  ];
};
async function renderSheet(file, title, w, h, frames, columns, crop) { // columns: [{name, frames}]
  const P = panelsOf(w, h, crop), gap = 6, pgap = 4, labelW = 120, header = 30, colHeader = 22, subHeader = 18;
  const cellW = P.reduce((s, p) => s + p.w + pgap, -pgap), cellH = Math.max(...P.map(p => p.h)), rowH = cellH + gap;
  const width = labelW + columns.length * (cellW + gap * 3) + gap, height = header + colHeader + subHeader + frames.length * BGN.length * rowH + gap, ov = [];
  ov.push({ input: label(title, width, header, 14), left: 0, top: 0 });
  for (const [ci, c] of columns.entries()) {
    const left = labelW + gap + ci * (cellW + gap * 3);
    ov.push({ input: label(c.name, cellW, colHeader, 15), left, top: header });
    let px = left; for (const p of P) { ov.push({ input: label(p.name, Math.max(p.w, 40), subHeader, 11), left: px, top: header + colHeader }); px += p.w + pgap; }
  }
  for (const [fr, fi] of frames.entries()) for (const [bi, bg] of BGN.entries()) {
    const top = header + colHeader + subHeader + (fr * BGN.length + bi) * rowH;
    ov.push({ input: label(`${frames.length > 1 || columns[0].frames.length > 1 ? `f${fi} ` : ''}${bg}`, labelW, 22, 12), left: 2, top });
    for (const [ci, c] of columns.entries()) { let px = labelW + gap + ci * (cellW + gap * 3); for (const p of P) { ov.push({ input: await p.make(c.frames[fi], bg), left: px, top }); px += p.w + pgap; } }
  }
  await sharp({ create: { width, height, channels: 3, background: '#e8e8e8' } }).composite(ov).png().toFile(file);
  return { width, height };
}

// ---------- Run ----------
const seed = crypto.randomBytes(32).toString('hex'), key = { note: 'SECRET round-2 P/Q -> policy mapping. Do not share with judges until judgments are recorded.', seed, sheets: {} };
await fs.rm(outDir, { recursive: true, force: true }); await fs.mkdir(outDir, { recursive: true });
const alphaProfile = unitId => {
  const es = manifest.filter(e => e.id === unitId || e.animation?.group === unitId), sum = {};
  for (const e of es) for (const [k, v] of Object.entries(e.alphaStats)) if (typeof v === 'number' && k !== 'partialFraction') sum[k] = (sum[k] ?? 0) + v;
  const pct = k => +(100 * sum[k] / (sum.nonzero || 1)).toFixed(1);
  return { visiblePixels: sum.nonzero, percentOfVisible: { opaque255: pct('a255'), strong128_254: pct('a128_254'), soft16_127: pct('a16_127'), faint1_15: pct('a1_15') } };
};
const index = [], selection = { rule: 'bench/keep-real-art-study/analysis/round2-selection-rule.md', controlSeed: 20261016, orderSeed: 20261017, sheets: [] };
const srcCache = new Map();
for (const [i, s] of sheets.entries()) {
  const K = `K${String(i + 1).padStart(3, '0')}`, c = caseById.get(s.cases[0]), u = R.units[c.unit];
  if (!srcCache.has(u.id)) { srcCache.clear(); srcCache.set(u.id, await sourceFrames(u)); }
  const src = srcCache.get(u.id), w = u.width, h = u.height, fr = sampled(src.length);
  const out = async v => Promise.all(c.variants[v].files.map(async f => (await rawPng(path.join(study, 'results', f))).data));
  const none = await out('none'), lin = await out('linear');
  const crop = bestCrop(w, h, fr.map(f => src[f]), fr.map(f => none[f]), fr.map(f => lin[f]));
  const flip = crypto.createHmac('sha256', Buffer.from(seed, 'hex')).update(s.cases[0]).digest()[0] & 1, order = flip ? ['linear', 'none'] : ['none', 'linear'];
  const outs = { none, linear: lin }, settings = [...new Set(s.cases.map(id => caseById.get(id).setting))];
  const title = `${K} | asset ${u.id}${u.animated ? ` (${u.frames} frames)` : ''} | ${settings.join(', ')} | P/Q order randomized`;
  const dims = await renderSheet(path.join(outDir, `${K}.png`), title, w, h, fr, [{ name: 'Source', frames: src }, { name: 'P', frames: outs[order[0]] }, { name: 'Q', frames: outs[order[1]] }], crop);
  key.sheets[`${K}.png`] = { cases: s.cases, P: order[0], Q: order[1] };
  index.push({ file: `${K}.png`, unitId: u.id, category: u.category, setting: settings.length > 1 ? settings : settings[0], animated: u.animated, frames: u.frames, framesShown: fr, sourceAlphaProfile: alphaProfile(u.id), sheetSize: `${dims.width}x${dims.height}`, crop });
  selection.sheets.push({ file: `${K}.png`, cases: s.cases, reasons: s.reasons, crop });
  console.log(K, s.cases.join(' '), `${dims.width}x${dims.height}`);
}
const byRule = r => [...picks.values()].filter(p => p.reasons.includes(r)).length;
selection.counts = { cases: picks.size, sheets: sheets.length, byRule: Object.fromEntries(['rule1-rgb', 'rule2-top12-linear-regression', 'rule3-judged-worse', 'rule4-control-judged-better'].map(r => [r, byRule(r)])) };
await fs.writeFile(keyFile, JSON.stringify(key, null, 2) + '\n');
await fs.writeFile(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1) + '\n');
await fs.writeFile(path.join(here, 'round2-selection.json'), JSON.stringify(selection, null, 1) + '\n');
await fs.writeFile(path.join(outDir, 'READY'), `sheets=${sheets.length} cases=${picks.size}\n`);
console.log(JSON.stringify(selection.counts));
