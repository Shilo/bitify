import { preparePalette, quantizeAsync, checkCanceled, yieldTask, validateMatchingMetric, EMPTY_INDEX } from './quantize.js';

// A deliberately lossy, single pass over frozen nearest labels. Source contacts
// and error safeguards stay in Oklab even when nearest matching uses RGB.
const CONTACT_LIMIT = .22 ** 2, ERROR_LIMIT = .35 ** 2, TIE = 1e-10;
const linear = Float64Array.from({ length: 256 }, (_, n) => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
function lab(r, g, b, values, offset) {
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  values[offset] = .2104542553 * l + .793617785 * m - .0040720468 * s;
  values[offset + 1] = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
  values[offset + 2] = .0259040371 * l + .7827717662 * m - .808675766 * s;
}
function distance(a, ai, b, bi) {
  const l = a[ai] - b[bi], c = a[ai + 1] - b[bi + 1], d = a[ai + 2] - b[bi + 2];
  return l * l + c * c + d * d;
}
function dimensions(source) {
  const width = source?.width ?? source?.w, height = source?.height ?? source?.h, length = width * height;
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !Number.isSafeInteger(length * 4) || !source.data || source.data.length !== length * 4) throw new Error('Invalid cleanup image dimensions or pixel data.');
  return { width, height, length };
}

// Keep the costlier proposal loop interruptible between bounded 256-pixel
// blocks. The 8ms target is checked between blocks, not a hard device deadline.
async function batches(length, run, signal) {
  for (let start = 0; start < length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 256, length); run(start, end); start = end;
    } while (start < length && performance.now() < deadline);
    if (start < length) await yieldTask();
  }
  checkCanceled(signal);
}

async function proposals(source, base, paletteVectors, signal) {
  const { width: w, height: h, length } = dimensions(source), { data } = source;
  const small = new Uint8Array(length), targets = new Int32Array(length).fill(-1), labels = new Uint16Array(length).fill(EMPTY_INDEX);
  const neighbors = new Int32Array(8), neighborLabels = new Uint16Array(8), contacts = new Float64Array(8), vectors = new Float64Array(6);
  // Fixed direct-mapped source RGB cache: at most 4096 triples, no objects or
  // allocations per pixel. Collisions replace entries without changing results.
  const keys = new Int32Array(4096).fill(-1), cache = new Float64Array(4096 * 3);
  function vector(pixel, offset) {
    const at = pixel * 4, key = data[at] * 65536 + data[at + 1] * 256 + data[at + 2];
    const slot = Math.imul(key ^ key >>> 12, 2654435761) >>> 20, pos = slot * 3;
    if (keys[slot] !== key) { keys[slot] = key; lab(linear[data[at]], linear[data[at + 1]], linear[data[at + 2]], cache, pos); }
    vectors[offset] = cache[pos]; vectors[offset + 1] = cache[pos + 1]; vectors[offset + 2] = cache[pos + 2];
  }
  await batches(length, (start, end) => {
    for (let p = start; p < end; p++) {
      const own = base[p]; if (own === EMPTY_INDEX) continue;
      const x = p % w, y = Math.floor(p / w); let isolated = true;
      for (let dy = -1; dy <= 1 && isolated; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!(dx || dy) || x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
        if (base[p + dx + dy * w] === own) { isolated = false; break; }
      }
      small[p] = isolated ? 1 : 0;
    }
  }, signal);
  await batches(length, (start, end) => {
    for (let p = start; p < end; p++) {
      if (!small[p]) continue;
      const x = p % w, y = Math.floor(p / w), own = base[p]; let count = 0;
      vector(p, 0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!(dx || dy) || x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
        const q = p + dx + dy * w, label = base[q]; if (label === EMPTY_INDEX) continue;
        neighbors[count] = q; neighborLabels[count] = label; vector(q, 3);
        contacts[count++] = distance(vectors, 0, vectors, 3);
      }
      let best = Infinity, chosen = EMPTY_INDEX, target = -1, ambiguous = false;
      for (let i = 0; i < count; i++) {
        const label = neighborLabels[i]; let seen = false;
        for (let j = 0; j < i; j++) if (neighborLabels[j] === label) { seen = true; break; }
        if (seen) continue;
        let contact = 0, members = 0, anchor = -1;
        for (let j = i; j < count; j++) if (neighborLabels[j] === label) {
          members++; contact = Math.max(contact, contacts[j]); if (anchor < 0 && !small[neighbors[j]]) anchor = neighbors[j];
        }
        if (contact > CONTACT_LIMIT) continue;
        let candidate = label, destination = anchor;
        if (anchor < 0) {
          if (members !== 1) continue;
          destination = neighbors[i]; vector(destination, 3);
          const a = distance(vectors, 0, paletteVectors, own * 3) + distance(vectors, 3, paletteVectors, own * 3);
          const b = distance(vectors, 0, paletteVectors, label * 3) + distance(vectors, 3, paletteVectors, label * 3);
          if (Math.abs(a - b) <= TIE) continue;
          candidate = a < b ? own : label;
          if (distance(vectors, 3, paletteVectors, candidate * 3) - distance(vectors, 3, paletteVectors, label * 3) > ERROR_LIMIT) continue;
        }
        if (distance(vectors, 0, paletteVectors, candidate * 3) - distance(vectors, 0, paletteVectors, own * 3) > ERROR_LIMIT) continue;
        if (contact < best - TIE) { best = contact; chosen = candidate; target = destination; ambiguous = false; }
        else if (Math.abs(contact - best) <= TIE && (chosen !== candidate || small[target] || small[destination])) ambiguous = true;
      }
      if (target >= 0 && !ambiguous) { targets[p] = target; labels[p] = chosen; }
    }
  }, signal);
  const proposed = base.slice();
  await batches(length, (start, end) => {
    for (let p = start; p < end; p++) {
      const q = targets[p]; if (q < 0) continue;
      if (!small[q]) proposed[p] = labels[p];
      else if (p < q && targets[q] === p && labels[p] === labels[q]) proposed[p] = proposed[q] = labels[p];
    }
  }, signal);
  return proposed;
}

// Consume complete frames one at a time. Only the first baseline and surviving
// replacements persist, so preparing a GIF never retains converted full clips.
export function createCleanupAccumulator(palette, alphaCut = 128, metric = 'oklab', { signal } = {}) {
  checkCanceled(signal); validateMatchingMetric(metric);
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  const prepared = preparePalette(palette?.colors ?? palette), paletteVectors = new Float64Array(prepared.size * 3);
  for (let i = 0; i < prepared.size; i++) {
    const value = parseInt(prepared.colors[i].slice(1), 16);
    lab(linear[value >>> 16], linear[value >>> 8 & 255], linear[value & 255], paletteVectors, i * 3);
  }
  let width, height, firstBase, replacements, surviving = 0, busy = false, finished = false;
  return {
    async addSource(source) {
      checkCanceled(signal);
      if (busy || finished) throw new Error('Cleanup sources must be added sequentially before finishing.');
      const shape = dimensions(source);
      if (width !== undefined && (shape.width !== width || shape.height !== height)) throw new Error('Cleanup animation frames must have matching dimensions.');
      busy = true;
      try {
        if (firstBase && !surviving) return;
        const { indices: base } = await quantizeAsync(source, prepared, alphaCut, undefined, undefined, { signal, metric });
        const proposed = await proposals(source, base, paletteVectors, signal);
        if (!firstBase) {
          width = shape.width; height = shape.height; firstBase = base; replacements = proposed;
          await batches(base.length, (start, end) => {
            for (let p = start; p < end; p++) {
              if (proposed[p] === base[p]) replacements[p] = EMPTY_INDEX;
              else surviving++;
            }
          }, signal);
        } else {
          await batches(base.length, (start, end) => {
            for (let p = start; p < end; p++) if (replacements[p] !== EMPTY_INDEX && (base[p] !== firstBase[p] || proposed[p] !== replacements[p])) {
              replacements[p] = EMPTY_INDEX; surviving--;
            }
          }, signal);
        }
      } finally { busy = false; }
    },
    finish() {
      checkCanceled(signal);
      if (busy || !firstBase || finished) throw new Error('Cleanup needs completed source frames before finishing.');
      finished = true; firstBase = undefined;
      return { replacements, width, height };
    },
  };
}

export async function prepareCleanupAsync(sources, palette, alphaCut = 128, metric = 'oklab', options = {}) {
  if (!Array.isArray(sources) || !sources.length) throw new Error('Cleanup needs at least one source image.');
  const accumulator = createCleanupAccumulator(palette, alphaCut, metric, options);
  for (const source of sources) await accumulator.addSource(source);
  return accumulator.finish();
}

export { applyCleanup, applyCleanupAsync } from './palette-cleanup-apply.js';
