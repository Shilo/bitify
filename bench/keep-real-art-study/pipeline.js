// RESEARCH ONLY. Shared by evaluate.mjs (Node) and browser-check.js (browser):
// no Node or DOM APIs. Mirrors the app's full-palette path (palette-state.js
// fullPaletteImage + palette-limit-client.js + App's generated capture):
// Auto = generatePaletteAsync(captureGeneratedSources(items, effectiveCut)),
// cap = selectPaletteSubset over 128 KiB chunks with frame-duration weights,
// output = quantizeAsync(..., alphaMode) + colorize. Cleanup is Off.
import { captureGeneratedSources } from '../../src/lib/palette-generated-sources.js';
import { generatePaletteAsync as productionGenerate } from '../../src/lib/palette-generated.js';
import { selectPaletteSubset as productionSelect } from '../../src/lib/palette-limit.js';
import { preparePalette, quantizeAsync, colorize } from '../../src/lib/quantize.js';
import { FULL_PRESETS } from '../../src/lib/palette-library.js';

export const POLICIES = ['none', 'linear', 'squared'];
// production = unmodified src/lib in Keep (must equal 'none'); cut128 = reference column.
export const VARIANTS = ['production', ...POLICIES, 'cut128'];
const CHUNK_BYTES = 128 * 1024, USER_CUT = 128;

export async function loadCandidates(dir) {
  const base = new URL(dir.endsWith('/') ? dir : dir + '/', import.meta.url);
  const [g, l] = await Promise.all([import(new URL('palette-generated.candidate.js', base).href), import(new URL('palette-limit.candidate.js', base).href)]);
  return { generate: g.generatePaletteAsync, select: l.selectPaletteSubset };
}

export function presetColors(id) {
  const preset = FULL_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error(`Missing stable preset ${id}`);
  return preset.colors;
}

// unit = { key, frames: [{ width, height, data, delay }], animated }
const appItem = unit => unit.animated
  ? { frames: unit.frames.map(f => ({ original: f, delay: f.delay })) }
  : { original: unit.frames[0] };
const frameWeight = (unit, f) => unit.animated ? (Number.isFinite(f.delay) && f.delay > 0 ? f.delay : 100) : 1;

async function memo(cache, key, make) {
  if (!cache) return make();
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// setting = { target: 'auto' | preset id, cap: 0 (All) | n, metric, dither, ditherStrength }
export async function renderSetting(units, setting, variant, candidates, cache) {
  if (!VARIANTS.includes(variant)) throw new Error('Unknown variant ' + variant);
  const keep = variant !== 'cut128', cut = keep ? 1 : USER_CUT, alphaWeight = POLICIES.includes(variant) ? variant : null;
  const generate = alphaWeight ? s => candidates.generate(s, { alphaWeight }) : s => productionGenerate(s);
  const select = alphaWeight ? (c, k, r, o) => candidates.select(c, k, r, { ...o, alphaWeight }) : productionSelect;
  const unitsKey = units.map(u => u.key).join('+');
  const shared = setting.target === 'auto'
    ? (await memo(cache, `gen|${unitsKey}|${variant}`, async () => generate(captureGeneratedSources(units.map(appItem), cut)))).colors
    : presetColors(setting.target);
  if (!shared.length) return { shared: [], empty: true, units: units.map(() => null) };
  const prepared = preparePalette(shared), out = [];
  for (const unit of units) {
    let palette = prepared;
    if (setting.cap && setting.cap < prepared.size) {
      palette = await memo(cache, `sel|${unit.key}|${variant}|${setting.target}|${unitsKey}|${setting.cap}|${setting.metric}`, async () => {
        const chunks = async function* () { for (const f of unit.frames) for (let at = 0; at < f.data.length; at += CHUNK_BYTES) yield { data: f.data.subarray(at, Math.min(at + CHUNK_BYTES, f.data.length)), weight: frameWeight(unit, f) }; };
        const r = await select(prepared.colors, setting.cap, chunks, { alphaCut: cut, metric: setting.metric });
        return preparePalette(r.indices.map(i => prepared.colors[i]));
      });
    }
    const frames = [];
    for (const f of unit.frames) {
      const q = await quantizeAsync(f, palette, USER_CUT, undefined, undefined, { metric: setting.metric, dither: setting.dither ?? 'none', ditherStrength: setting.ditherStrength ?? 50, alphaMode: keep ? 'keep' : 'cut' });
      frames.push(colorize(q, palette).data);
    }
    out.push({ colors: [...palette.colors], frames });
  }
  return { shared: [...shared], empty: false, units: out };
}

export async function sha256(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', view)), n => n.toString(16).padStart(2, '0')).join('');
}

// Comparable summary: shared palette, per-unit subset and per-frame output hashes.
export async function summarize(result) {
  return { shared: result.shared, empty: result.empty, units: await Promise.all(result.units.map(async u => u && { colors: u.colors, frameHashes: await Promise.all(u.frames.map(sha256)) })) };
}
