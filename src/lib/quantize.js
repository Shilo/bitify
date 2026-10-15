import { normalizeColors } from './palette-library.js';
import { normalizeDither, normalizeDitherStrength } from './palette-dither-settings.js';
import { prepareDither, convertDither } from './palette-dither.js';
import { normalizeAlphaMode, effectiveAlphaCut } from './palette-alpha.js';

export const EMPTY_INDEX = 256;
const preparedData = new WeakMap();
const linear = Float64Array.from({ length: 256 }, (_, n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });

// Oklab's published linear-sRGB matrices (https://bottosson.github.io/posts/oklab/).
function lab(r, g, b, out, offset) {
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  out[offset] = .2104542553 * l + .7936177850 * m - .0040720468 * s;
  out[offset + 1] = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s;
  out[offset + 2] = .0259040371 * l + .7827717662 * m - .8086757660 * s;
}

export function preparePalette(colors) {
  const normalized = Object.freeze(normalizeColors(colors)), size = normalized.length;
  const labs = new Float64Array(size * 3), rgb = new Uint8Array(size * 3), exact = new Map();
  for (let i = 0; i < size; i++) {
    const color = parseInt(normalized[i].slice(1), 16), r = color >>> 16, g = color >>> 8 & 255, b = color & 255;
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
    lab(linear[r], linear[g], linear[b], labs, i * 3); exact.set(color, i);
  }
  const prepared = Object.freeze({ colors: normalized, size });
  preparedData.set(prepared, { labs, rgb, exact });
  return prepared;
}

function preparedOf(palette) { return preparedData.has(palette) ? palette : preparePalette(palette); }

export function validateMatchingMetric(metric = 'oklab') {
  if (metric !== 'oklab' && metric !== 'rgb') throw new Error('Matching metric must be Oklab or RGB.');
  return metric;
}

function job(image, palette, alphaCut, mw, mh, metric, alphaMode) {
  validateMatchingMetric(metric);
  const w = image.width ?? image.w, h = image.height ?? image.h;
  mw ??= w; mh ??= h;
  if (![w, h, mw, mh].every(n => Number.isSafeInteger(n) && n > 0) || mw > w || mh > h || !image.data || image.data.length !== w * h * 4) throw new Error('Invalid image dimensions or pixel data.');
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  const prepared = preparedOf(palette);
  alphaMode = normalizeAlphaMode(alphaMode);
  return { data: image.data, sourceW: w, xs: Int32Array.from({ length: mw }, (_, i) => Math.floor((i + .5) * w / mw)), ys: Int32Array.from({ length: mh }, (_, i) => Math.floor((i + .5) * h / mh)),
    ...preparedData.get(prepared), size: prepared.size, alphaCut: effectiveAlphaCut(alphaMode, alphaCut), metric, scratch: new Float64Array(3), memo: new Map(), hits: 0, misses: 0,
    result: { indices: new Uint16Array(mw * mh), w: mw, h: mh, used: new Uint8Array(256), hasTransparency: false, ...(alphaMode === 'keep' ? { alpha: new Uint8Array(mw * mh) } : {}) } };
}

function convert(state, start, end) {
  const { data, sourceW, xs, ys, exact, labs, rgb, metric, scratch, size, alphaCut, result } = state;
  const alpha = result.alpha;
  for (let o = start; o < end; o++) {
    const p = (ys[Math.floor(o / result.w)] * sourceW + xs[o % result.w]) * 4;
    if (data[p + 3] < alphaCut) { result.indices[o] = EMPTY_INDEX; result.hasTransparency = true; continue; }
    if (alpha) alpha[o] = data[p + 3];
    const key = data[p] << 16 | data[p + 1] << 8 | data[p + 2];
    let index = exact.get(key);
    if (index === undefined) {
      index = state.memo?.get(key);
      if (index !== undefined) state.hits++;
      else {
        let nearest = Infinity; index = 0;
        if (metric === 'rgb') {
          // This deliberately compares encoded channel values, not linear light.
          const r = data[p], g = data[p + 1], b = data[p + 2];
          for (let i = 0; i < size; i++) {
            const dr = r - rgb[i * 3], dg = g - rgb[i * 3 + 1], db = b - rgb[i * 3 + 2];
            const distance = dr * dr + dg * dg + db * db;
            if (distance < nearest) { nearest = distance; index = i; }
          }
        } else {
          lab(linear[data[p]], linear[data[p + 1]], linear[data[p + 2]], scratch, 0);
          for (let i = 0; i < size; i++) {
            const dl = scratch[0] - labs[i * 3], da = scratch[1] - labs[i * 3 + 1], db = scratch[2] - labs[i * 3 + 2];
            const distance = dl * dl + da * da + db * db;
            if (distance < nearest) { nearest = distance; index = i; }
          }
        }
        if (state.memo) {
          state.misses++;
          // Avoid Map growth/GC on photographs. Repeated sprite RGBs benefit, and
          // once bypassed a job never probes or allocates cache entries again.
          if (state.memo.size >= 4096 || state.misses >= 512 && state.hits < state.misses / 3) state.memo = null;
          else state.memo.set(key, index);
        }
      }
    }
    result.indices[o] = index; result.used[index] = 1;
  }
}

export function quantize(image, palette, alphaCut = 128, mw, mh, { metric = 'oklab', dither = 'none', ditherStrength = 50, alphaMode = 'cut' } = {}) {
  const state = job(image, palette, alphaCut, mw, mh, metric, alphaMode);
  const enabled = normalizeDither(dither) !== 'none' && normalizeDitherStrength(ditherStrength) > 0 && state.size > 1;
  if (enabled) state.ditherData = prepareDither(state, dither, normalizeDitherStrength(ditherStrength), linear, lab);
  (enabled ? convertDither : convert)(state, 0, state.result.indices.length);
  return state.result;
}

export function checkCanceled(signal) {
  if (signal?.aborted) throw new DOMException('The palette operation was canceled.', 'AbortError');
}
// A posted task gives input/rendering a turn without the nested-timer 4ms clamp.
// Close ports after delivery; no scheduler or long-lived channel is retained.
export const yieldTask = () => new Promise(resolve => {
  if (typeof MessageChannel === 'undefined') { setTimeout(resolve, 0); return; }
  const channel = new MessageChannel();
  channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); };
  channel.port2.postMessage(null);
});

export async function quantizeAsync(image, palette, alphaCut = 128, mw, mh, { metric = 'oklab', dither = 'none', ditherStrength = 50, alphaMode = 'cut', signal, onProgress, chunkPixels = 2048 } = {}) {
  checkCanceled(signal);
  const state = job(image, palette, alphaCut, mw, mh, metric, alphaMode), length = state.result.indices.length;
  const enabled = normalizeDither(dither) !== 'none' && normalizeDitherStrength(ditherStrength) > 0 && state.size > 1;
  if (enabled) state.ditherData = prepareDither(state, dither, normalizeDitherStrength(ditherStrength), linear, lab);
  const chunk = Math.min(enabled ? 128 : 8192, Math.max(128, Math.floor(chunkPixels) || 2048));
  const convertSlice = enabled ? convertDither : convert;
  for (let start = 0; start < length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal); convertSlice(state, start, Math.min(start + chunk, length));
      start += chunk;
    } while (start < length && performance.now() < deadline);
    onProgress?.(Math.min(start, length) / length);
    if (start < length) await yieldTask();
  }
  checkCanceled(signal);
  return state.result;
}

// A wall can start many tile effects in one flush. Defer even their first
// conversion slice so those individually bounded slices cannot form one long task.
// Exports keep the direct async path; animation cache hits need no posted task.
export async function quantizePreviewAsync(image, palette, alphaCut = 128, mw, mh, options = {}) {
  const captured = { ...options };
  checkCanceled(captured.signal);
  await yieldTask();
  return quantizeAsync(image, palette, alphaCut, mw, mh, captured);
}

export function colorize(result, palette) {
  const prepared = preparedOf(palette), { rgb } = preparedData.get(prepared);
  const data = new Uint8ClampedArray(result.w * result.h * 4);
  for (let i = 0; i < result.indices.length; i++) {
    const index = result.indices[i];
    if (index === EMPTY_INDEX) continue;
    if (index >= prepared.size) throw new Error('The result does not match this palette.');
    data[i * 4] = rgb[index * 3]; data[i * 4 + 1] = rgb[index * 3 + 1]; data[i * 4 + 2] = rgb[index * 3 + 2]; data[i * 4 + 3] = result.alpha ? result.alpha[i] : 255;
  }
  return { data, w: result.w, h: result.h, width: result.w, height: result.h };
}
