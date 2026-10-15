// OFFLINE. Colorfetti outputs via the actual src/lib modules in Node (Auto generator,
// Max colors subset, nearest/dither quantizer, Keep/Cut alpha, palette PNG encoder).
// Every PNG (service and local) is decoded with Sharp only; no custom PNG reader.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sha } from '../../palette-service-research/api-common.mjs';
import { quantizeAsync } from '../../../src/lib/quantize.js';
import { generatePaletteAsync } from '../../../src/lib/palette-generated.js';
import { captureGeneratedSources } from '../../../src/lib/palette-generated-sources.js';
import { selectPaletteSubset } from '../../../src/lib/palette-limit.js';
import { effectiveAlphaCut } from '../../../src/lib/palette-alpha.js';
import { palettePngBytesAsync } from '../../../src/lib/save.js';
import { CASES } from './cases.mjs';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = import.meta.dirname, svc = path.join(dir, 'service'), ours = path.join(dir, 'ours'), sheets = path.join(dir, 'sheets');
for (const d of [ours, sheets]) fs.mkdirSync(d, { recursive: true });
const read = (...p) => fs.readFileSync(path.join(...p));
const decode = async bytes => { const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data) }; };
const manifest = JSON.parse(read(dir, 'fixtures', 'manifest.json'));
const RARE = manifest.rareCoordinates;

// --- color math (independent of the app's tables) ---
const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const oklabLinear = (r, g, b) => { const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b); return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; };
const oklab = (d, p) => oklabLinear(lin(d[p]), lin(d[p + 1]), lin(d[p + 2]));
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const rgbKey = (d, p) => d[p] << 16 | d[p + 1] << 8 | d[p + 2];
const hex = k => '#' + k.toString(16).padStart(6, '0');

function metrics(src, out, { target, prevOut } = {}) {
  const n = src.width * src.height, W = src.width;
  let alphaChanges = 0, visibilityChanges = 0, both = 0, rgbErr = 0, labErr = 0, wLab = 0, wSum = 0, exactKept = 0, targetViolations = 0, srcMembers = 0, srcMembersKept = 0;
  const used = new Set(), tset = target ? new Set(target.map(c => parseInt(c.slice(1), 16))) : null;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const sa = src.data[p + 3], oa = out.data[p + 3];
    if (sa !== oa) alphaChanges++;
    if (!!sa !== !!oa) visibilityChanges++;
    if (oa) { const k = rgbKey(out.data, p); used.add(k); if (tset && !tset.has(k)) targetViolations++; }
    if (!sa || !oa) continue;
    both++;
    const sk = rgbKey(src.data, p), ok = rgbKey(out.data, p);
    if (sk === ok) exactKept++;
    if (tset && tset.has(sk)) { srcMembers++; if (sk === ok) srcMembersKept++; }
    rgbErr += (src.data[p] - out.data[p]) ** 2 + (src.data[p + 1] - out.data[p + 1]) ** 2 + (src.data[p + 2] - out.data[p + 2]) ** 2;
    const e = d2(oklab(src.data, p), oklab(out.data, p)); labErr += e; wLab += e * sa / 255; wSum += sa / 255;
  }
  // 4x4 block tone: only blocks fully opaque in both source and output; linear-light average -> Oklab.
  let tone = 0, blocks = 0;
  for (let by = 0; by + 4 <= src.height; by += 4) for (let bx = 0; bx + 4 <= W; bx += 4) {
    const a = [0, 0, 0], b = [0, 0, 0]; let ok = true;
    for (let y = by; y < by + 4 && ok; y++) for (let x = bx; x < bx + 4; x++) { const p = (y * W + x) * 4; if (src.data[p + 3] !== 255 || out.data[p + 3] !== 255) { ok = false; break; } for (let c = 0; c < 3; c++) { a[c] += lin(src.data[p + c]) / 16; b[c] += lin(out.data[p + c]) / 16; } }
    if (ok) { blocks++; tone += d2(oklabLinear(...a), oklabLinear(...b)); }
  }
  // Rare accents: survives if its output differs from every 8-neighbour's output.
  const rare = src.width === 24 ? Object.fromEntries(Object.entries(RARE).map(([name, coords]) => [name, coords.map(([x, y]) => {
    const p = (y * W + x) * 4, k = rgbKey(out.data, p), nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const q = ((y + dy) * W + x + dx) * 4; if (out.data[q + 3]) nb.push(rgbKey(out.data, q)); }
    return { at: [x, y], source: hex(rgbKey(src.data, p)), output: hex(k), distinctFromNeighbours: !nb.includes(k), oklabError: +d2(oklab(src.data, p), oklab(out.data, p)).toFixed(6) };
  })])) : null;
  return { width: out.width, height: out.height, sameDims: out.width === src.width && out.height === src.height, alphaChanges, visibilityChanges, visibleRgb: used.size,
    usedColors: [...used].map(hex).sort(), targetViolations: tset ? targetViolations : null, exactSourceRetention: both ? +(exactKept / both).toFixed(4) : null,
    targetMemberRetention: tset ? (srcMembers ? `${srcMembersKept}/${srcMembers}` : '0/0') : null, pointRgbMse: both ? +(rgbErr / both).toFixed(3) : null,
    pointOklabMse: both ? +(labErr / both).toFixed(7) : null, alphaWeightedOklabMse: wSum ? +(wLab / wSum).toFixed(7) : null, tone4OklabMse: blocks ? +(tone / blocks).toFixed(7) : null, toneBlocks: blocks, rare, rgbaSha256: sha(out.data) };
}
const churn = (srcA, srcB, outA, outB) => { let unchanged = 0, changed = 0; for (let p = 0; p < srcA.data.length; p += 4) { if (![0, 1, 2, 3].every(c => srcA.data[p + c] === srcB.data[p + c])) continue; unchanged++; if (![0, 1, 2, 3].every(c => outA.data[p + c] === outB.data[p + c]) && (outA.data[p + 3] || outB.data[p + 3])) changed++; } return { unchangedSourceCoords: unchanged, changedOutputs: changed }; };
const changedVs = (a, b) => { let n = 0; for (let p = 0; p < a.data.length; p += 4) if (rgbKey(a.data, p) !== rgbKey(b.data, p) || a.data[p + 3] !== b.data[p + 3]) n++; return n; };

// --- Colorfetti pipeline (mirrors App: paletteCut = effectiveAlphaCut(mode, cut)) ---
async function colorfetti(frames, { count, target, dither = 'none', strength = 50, metric = 'oklab', alphaMode = 'cut', cut = 128 }) {
  const paletteCut = effectiveAlphaCut(alphaMode, cut), animated = frames.length > 1;
  let colors, autoSize = null;
  if (target) colors = target;
  else {
    const item = animated ? { frames: frames.map(f => ({ original: f, delay: 100 })) } : { original: frames[0] };
    colors = (await generatePaletteAsync(captureGeneratedSources([item], paletteCut))).colors; autoSize = colors.length;
    if (count && colors.length > count) {
      const sel = await selectPaletteSubset(colors, count, async function* () { for (const f of frames) yield { data: f.data, weight: animated ? 100 : 1 }; }, { alphaCut: paletteCut, metric });
      colors = sel.indices.map(i => colors[i]);
    }
  }
  const results = [];
  for (const f of frames) results.push(await quantizeAsync(f, colors, cut, undefined, undefined, { metric, dither, ditherStrength: strength, alphaMode }));
  return { colors, autoSize, results };
}
async function timed(fn, runs = 5) { const t = []; let v; for (let i = 0; i < runs; i++) { const s = performance.now(); v = await fn(); t.push(performance.now() - s); } t.sort((a, b) => a - b); return { value: v, medianMs: +t[runs >> 1].toFixed(3), samplesMs: t.map(x => +x.toFixed(3)) }; }
const stripColors = async file => { const t = await decode(read(dir, 'fixtures', file)); return Array.from({ length: t.width }, (_, i) => hex(rgbKey(t.data, i * 4))); };

const variantsFor = c => {
  if (c.id.startsWith('hue-')) return c.dither ? [] : [{ name: 'oklab-off' }, { name: 'rgb-off', metric: 'rgb' }, ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(s => ({ name: `oklab-4x4-${s}`, dither: '4x4', strength: s }))];
  if (c.alpha) return [{ name: 'auto-cap-keep', alphaMode: 'keep' }, { name: 'auto-cap-cut128' }];
  if (c.target) return [{ name: 'oklab' }, { name: 'rgb', metric: 'rgb' }];
  return [{ name: 'auto-cap-oklab' }, { name: 'auto-cap-rgb', metric: 'rgb' }];
};

const report = { at: new Date().toISOString(), method: 'Colorfetti: actual src/lib modules in Node 25 (generatePaletteAsync+captureGeneratedSources Auto, selectPaletteSubset Max colors, quantizeAsync nearest/ordered dither, effectiveAlphaCut Keep/Cut, palettePngBytesAsync). Not the built browser app; no worker/UI/decode path. All PNGs decoded by Sharp.',
  engineSha256: Object.fromEntries(['quantize.js', 'palette-dither.js', 'palette-generated.js', 'palette-limit.js', 'palette-alpha.js', 'save.js'].map(n => [n, sha(read(dir, '../../../src/lib', n))])), fixtures: manifest.files, cases: [] };
const decoded = {};
for (const c of CASES) {
  const src = await Promise.all(c.inputs.map(async n => decoded[n] ??= await decode(read(dir, 'fixtures', n))));
  const target = c.target ? await stripColors(c.target) : null;
  const resp = JSON.parse(read(svc, c.mcp ? `mcp-${c.id}.json` : `response-${c.id}.json`));
  const serviceFiles = c.inputs.map((_, i) => `service-${c.id}-${i}.png`);
  const serviceOut = await Promise.all(serviceFiles.map(f => decode(read(svc, f))));
  const row = { id: c.id, claim: c.claim, settings: { count: c.count ?? null, target: c.target ?? null, dither: c.dither ?? 'none', serviceStrength: c.strength ?? null },
    service: { surface: c.mcp ? 'MCP' : 'REST', latencyMs: resp.ms ?? resp.elapsedMs, usage: resp.result?.usage ?? { generations: resp.result?.charged_generations }, reportedNColors: resp.result?.n_colors ?? null,
      pngBytes: serviceFiles.map(f => read(svc, f).length), pngSha256: serviceFiles.map(f => sha(read(svc, f))), frames: serviceOut.map((o, i) => metrics(src[i], o, { target })) }, ours: [] };
  if (serviceOut.length === 2) row.service.churn = churn(src[0], src[1], serviceOut[0], serviceOut[1]);
  if (c.repeatOf) { const prior = await decode(read(svc, `service-${c.repeatOf}-0.png`)); row.service.identicalToRepeatOf = sha(prior.data) === sha(serviceOut[0].data); row.service.pixelsDifferentFromRepeatOf = changedVs(prior, serviceOut[0]); }
  for (const v of variantsFor(c)) {
    const opts = { count: c.count, target, dither: v.dither ?? 'none', strength: v.strength ?? 50, metric: v.metric ?? 'oklab', alphaMode: v.alphaMode ?? 'cut' };
    const run = await timed(() => colorfetti(src, opts));
    const { colors, autoSize, results } = run.value;
    const enc = await timed(() => Promise.all(results.map(r => palettePngBytesAsync({ ...r, colors }))), 3);
    const files = [];
    for (let i = 0; i < results.length; i++) { const f = `ours-${c.id}-${v.name}-${i}.png`; fs.writeFileSync(path.join(ours, f), enc.value[i]); files.push(f); }
    const outs = await Promise.all(files.map(f => decode(read(ours, f))));
    const vr = { variant: v.name, settings: opts.target ? { ...opts, target: c.target } : opts, autoPaletteSize: autoSize, paletteColors: colors.length, convertMedianMs: run.medianMs, encodeMedianMs: enc.medianMs,
      pngBytes: files.map(f => read(ours, f).length), files, frames: outs.map((o, i) => metrics(src[i], o, { target })) };
    if (outs.length === 2) vr.churn = churn(src[0], src[1], outs[0], outs[1]);
    row.ours.push(vr);
  }
  report.cases.push(row);
}

// Strength calibration on the hue ramp: changed pixels versus each product's own Off.
{
  const off = await decode(read(svc, 'service-hue-edg8-none-0.png')), src = decoded['hue-ramp.png'];
  const svcRows = ['none', '4x4-s2', '4x4-s8'].map(s => [s, `service-hue-edg8-${s}-0.png`]);
  const oursRows = [['off', 'oklab-off'], ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(s => [String(s), `oklab-4x4-${s}`])].map(([s, v]) => [s, `ours-hue-edg8-none-${v}-0.png`]);
  const oursOff = await decode(read(ours, 'ours-hue-edg8-none-oklab-off-0.png'));
  const rowsOf = async (rows, base, folder) => Promise.all(rows.map(async ([s, f]) => { const o = await decode(read(folder, f)); const m = metrics(src, o, {}); return { strength: s, changedVsOwnOff: changedVs(base, o), visibleRgb: m.visibleRgb, pointOklabMse: m.pointOklabMse, tone4OklabMse: m.tone4OklabMse }; }));
  const S = await rowsOf(svcRows, off, svc), O = await rowsOf(oursRows, oursOff, ours);
  const nearest = (s, key) => O.slice(1).reduce((best, r) => Math.abs(r[key] - s[key]) < Math.abs(best[key] - s[key]) ? r : best).strength;
  report.calibration = { fixture: 'hue-ramp.png onto ENDESGA 8, 4x4', pixels: 1024, service: S, colorfetti: O, nearestLocalStrength: Object.fromEntries(S.slice(1).map(s => [s.strength, { byChangedPixels: nearest(s, 'changedVsOwnOff'), byTone: nearest(s, 'tone4OklabMse') }])),
    offAgreement: { pixelsDifferentServiceOffVsOursOff: changedVs(off, oursOff) } };
}
fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(report, null, 2) + '\n');

// --- nearest-neighbour contact sheets over mid-gray (alpha visible) ---
async function sheet(name, rows, scale) {
  const cellW = Math.max(...rows.flatMap(r => r.cells.map(c => c.w))) * scale + 24, labelH = 30, cellH = Math.max(...rows.flatMap(r => r.cells.map(c => c.h))) * scale + labelH + 12;
  const cols = Math.max(...rows.map(r => r.cells.length)), W = cols * cellW + 180, H = rows.length * cellH, overlays = [];
  for (const [ri, r] of rows.entries()) {
    overlays.push({ input: Buffer.from(`<svg width="176" height="${cellH}"><text x="6" y="22" font-family="Arial" font-size="13" fill="#111">${r.label}</text></svg>`), left: 0, top: ri * cellH });
    for (const [ci, c] of r.cells.entries()) {
      const left = 180 + ci * cellW, top = ri * cellH;
      overlays.push({ input: Buffer.from(`<svg width="${cellW}" height="${labelH}"><text x="2" y="20" font-family="Arial" font-size="12" fill="#111">${c.label.replaceAll('&', '&amp;')}</text></svg>`), left, top });
      overlays.push({ input: await sharp(c.file).resize(c.w * scale, c.h * scale, { kernel: 'nearest' }).png().toBuffer(), left, top: top + labelH });
    }
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: '#8a8a8a' } }).composite(overlays).png().toFile(path.join(sheets, name));
}
const cell = (file, label, w, h) => ({ file, label, w, h });
const F = n => path.join(dir, 'fixtures', n), S = n => path.join(svc, n), O = n => path.join(ours, n);
const m = (id, v) => report.cases.find(c => c.id === id)[v === 's' ? 'service' : 'ours'];
const lab = (id, v) => { const r = v === 's' ? m(id, 's').frames[0] : m(id).find(x => x.variant === v).frames[0]; return `${r.visibleRgb}c pt${r.pointOklabMse}`; };
await sheet('knight.png', [
  ...['knight-count4', 'knight-count16', 'knight-pico8', 'knight-edg8'].map(id => { const v = id.includes('count') ? ['auto-cap-oklab', 'auto-cap-rgb'] : ['oklab', 'rgb']; return { label: id, cells: [cell(F('knight-a.png'), 'source', 24, 24), cell(S(`service-${id}-0.png`), `PixelLab ${lab(id, 's')}`, 24, 24), ...v.map(x => cell(O(`ours-${id}-${x}-0.png`), `CF ${x.replace('auto-cap-', '')} ${lab(id, x)}`, 24, 24))] }; }),
  { label: 'count4 MCP repeat', cells: [cell(F('knight-a.png'), 'source', 24, 24), cell(S('service-knight-count4-mcp-0.png'), 'PixelLab MCP', 24, 24), cell(S('service-knight-count4-0.png'), 'PixelLab REST', 24, 24)] },
  { label: '2-frame count8', cells: [cell(F('knight-a.png'), 'src A', 24, 24), cell(F('knight-b.png'), 'src B', 24, 24), cell(S('service-knight-2frame-count8-0.png'), 'PL A', 24, 24), cell(S('service-knight-2frame-count8-1.png'), 'PL B', 24, 24), cell(O('ours-knight-2frame-count8-auto-cap-oklab-0.png'), 'CF A', 24, 24), cell(O('ours-knight-2frame-count8-auto-cap-oklab-1.png'), 'CF B', 24, 24)] },
], 8);
await sheet('hue.png', [
  { label: 'source / Off', cells: [cell(F('hue-ramp.png'), 'source', 64, 16), cell(S('service-hue-edg8-none-0.png'), 'PixelLab Off', 64, 16), cell(O('ours-hue-edg8-none-oklab-off-0.png'), 'CF Oklab Off', 64, 16), cell(O('ours-hue-edg8-none-rgb-off-0.png'), 'CF RGB Off', 64, 16)] },
  { label: 'PixelLab 4x4', cells: [cell(S('service-hue-edg8-4x4-s2-0.png'), 'PL s2', 64, 16), cell(S('service-hue-edg8-4x4-s8-0.png'), 'PL s8', 64, 16)] },
  { label: 'CF 4x4 low', cells: [10, 20, 30, 40].map(s => cell(O(`ours-hue-edg8-none-oklab-4x4-${s}-0.png`), `CF ${s}`, 64, 16)) },
  { label: 'CF 4x4 high', cells: [50, 70, 100].map(s => cell(O(`ours-hue-edg8-none-oklab-4x4-${s}-0.png`), `CF ${s}`, 64, 16)) },
], 4);
await sheet('glow.png', [{ label: 'glow count4', cells: [cell(F('glow-alpha.png'), 'source', 32, 32), cell(S('service-glow-count4-0.png'), `PixelLab ${lab('glow-count4', 's')}`, 32, 32), cell(O('ours-glow-count4-auto-cap-keep-0.png'), `CF Keep ${lab('glow-count4', 'auto-cap-keep')}`, 32, 32), cell(O('ours-glow-count4-auto-cap-cut128-0.png'), `CF Cut128 ${lab('glow-count4', 'auto-cap-cut128')}`, 32, 32)] },
  { label: 'spill a=1 count3', cells: [cell(F('spill-alpha1.png'), 'source', 32, 32), cell(S('service-spill1-count3-0.png'), `PixelLab ${lab('spill1-count3', 's')}`, 32, 32), cell(O('ours-spill1-count3-auto-cap-keep-0.png'), `CF Keep ${lab('spill1-count3', 'auto-cap-keep')}`, 32, 32), cell(O('ours-spill1-count3-auto-cap-cut128-0.png'), `CF Cut128 ${lab('spill1-count3', 'auto-cap-cut128')}`, 32, 32)] }], 7);
console.log('wrote results.json and sheets');
