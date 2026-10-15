// Multi-source extension of the single-armor strength sweep. Offline, production quantize only.
// Sources: 2 real-art fixtures + 2 synthetic preset-spike fixtures (same as curation study).
// Targets: ENDESGA 8, PICO-8 (full 16), Grayscale 8, Game Boy green 4, Black & white 2.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { quantize, colorize } from '../../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../../src/lib/palette-library.js';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const decode = async f => { const { data, info } = await sharp(f).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) }; };
const lin = n => n <= .04045 * 255 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4;
const lab = (r, g, b) => { const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s]; };
const d2 = (a, b) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
function metrics(src, out) {
  const { width: w, height: h } = src; let point = 0, n = 0; const used = new Set();
  for (let p = 0; p < src.data.length; p += 4) { if (src.data[p+3] < 128) continue; n++; used.add(out.data[p] << 16 | out.data[p+1] << 8 | out.data[p+2]);
    point += d2(lab(lin(src.data[p]), lin(src.data[p+1]), lin(src.data[p+2])), lab(lin(out.data[p]), lin(out.data[p+1]), lin(out.data[p+2]))); }
  let tone = 0, blocks = 0;
  for (let y = 0; y + 4 <= h; y += 4) for (let x = 0; x + 4 <= w; x += 4) { const a = [0,0,0], b = [0,0,0]; let ok = true;
    for (let yy = y; yy < y + 4 && ok; yy++) for (let xx = x; xx < x + 4; xx++) { const p = (yy * w + xx) * 4; if (src.data[p+3] < 128) { ok = false; break; } for (let c = 0; c < 3; c++) { a[c] += lin(src.data[p+c]) / 16; b[c] += lin(out.data[p+c]) / 16; } }
    if (ok) { blocks++; tone += d2(lab(...a), lab(...b)); } }
  return { point: point / n, tone: blocks ? tone / blocks : null, blocks, used: used.size };
}
const sources = { items64: 'bench/icon-research/general-source.png', armor16: 'bench/icon-research/breastplate-source.png', material: 'bench/palette-preset-spike/output/material-sprite-source.png', ramp: 'bench/palette-preset-spike/output/chromatic-ramp-source.png' };
const targets = ['preset-edg8', 'preset-pico8', 'preset-gray8', 'preset-gameboy', 'preset-mono'];
const strengths = [0, 10, 20, 30, 40, 50, 60, 75, 100];
const rows = [];
for (const [sid, file] of Object.entries(sources)) { const src = await decode(file);
  for (const tid of targets) { const colors = FULL_PRESETS.find(p => p.id === tid).colors; const series = [];
    for (const s of strengths) { const q = quantize(src, colors, 128, undefined, undefined, { metric: 'oklab', dither: '4x4', ditherStrength: s }); series.push({ s, ...metrics(src, { data: colorize(q, colors).data }) }); }
    const toned = series.filter(r => r.tone !== null);
    const best = toned.length ? toned.reduce((a, b) => b.tone < a.tone ? b : a).s : null;
    const s50 = series.find(r => r.s === 50), s0 = series[0];
    rows.push({ source: sid, target: tid, opaqueBlocks: s0.blocks, bestToneStrength: best,
      toneMonotoneNonIncreasing: toned.every((r, i) => !i || r.tone <= toned[i-1].tone + 1e-12),
      tone0: s0.tone, tone50: s50.tone, toneBest: toned.find(r => r.s === best)?.tone ?? null,
      point0: s0.point, point50: s50.point, used0: s0.used, used50: s50.used, usedMin: Math.min(...series.map(r => r.used)), series });
  } }
const summary = { cases: rows.length, bestToneStrengthHistogram: rows.reduce((m, r) => (m[r.bestToneStrength] = (m[r.bestToneStrength] ?? 0) + 1, m), {}),
  s50ToneWorseThanOff: rows.filter(r => r.tone50 !== null && r.tone50 > r.tone0).map(r => r.source + '/' + r.target),
  usedColorsDropAt50: rows.filter(r => r.used50 < r.used0).map(r => `${r.source}/${r.target} ${r.used0}->${r.used50}`),
  nonMonotoneTone: rows.filter(r => !r.toneMonotoneNonIncreasing).length };
fs.writeFileSync('bench/claude-audit-2026-10-15/research/strength-sweep-multi.json', JSON.stringify({ method: '4x4 ordered, Oklab, cut128, Cleanup Off, production quantize; tone = 4x4 linear-light block mean, fully opaque blocks only; point = per-visible-pixel squared Oklab; no human preference', summary, rows }, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
for (const r of rows) console.log(r.source.padEnd(9), r.target.padEnd(15), 'blocks', String(r.opaqueBlocks).padStart(4), 'best', String(r.bestToneStrength).padStart(3), 'tone0', r.tone0?.toFixed(5), 'tone50', r.tone50?.toFixed(5), 'pt0', r.point0.toFixed(4), 'pt50', r.point50.toFixed(4), 'used', r.used0 + '->' + r.used50);
