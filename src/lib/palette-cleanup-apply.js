import { checkCanceled, yieldTask, EMPTY_INDEX } from './quantize.js';

const preparedResults = new WeakMap();
// Core-produced maps are owned by the cleanup job and are not mutated after
// completion. Worker copies acquire the same trust only after validation below.
export function registerPreparedCleanup(cleanup) {
  preparedResults.set(cleanup, { replacements: cleanup.replacements, width: cleanup.width, height: cleanup.height, hasChanges: cleanup.hasChanges });
  return cleanup;
}
export async function validatePreparedCleanupAsync(cleanup, paletteSize, signal) {
  checkCanceled(signal);
  const { replacements, width, height, hasChanges } = cleanup ?? {};
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !Number.isSafeInteger(width * height) || !(replacements instanceof Uint16Array) || replacements.length !== width * height || typeof hasChanges !== 'boolean') throw new Error('Invalid prepared cleanup result.');
  let changes = false;
  for (let start = 0; start < replacements.length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 2048, replacements.length);
      for (; start < end; start++) {
        const label = replacements[start];
        if (label !== EMPTY_INDEX && label >= paletteSize) throw new Error('Invalid prepared cleanup palette label.');
        if (label !== EMPTY_INDEX) changes = true;
      }
    } while (start < replacements.length && performance.now() < deadline);
    if (start < replacements.length) await yieldTask();
  }
  checkCanceled(signal);
  if (changes !== hasChanges) throw new Error('Invalid prepared cleanup change metadata.');
  return registerPreparedCleanup(cleanup);
}
function state(result, cleanup, sourceWidth, sourceHeight, preserveMetadata = false) {
  const replacements = cleanup?.replacements ?? cleanup, width = cleanup?.width ?? sourceWidth, height = cleanup?.height ?? sourceHeight;
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !(replacements instanceof Uint16Array) || replacements.length !== width * height || !Number.isSafeInteger(result?.w) || result.w < 1 || !Number.isSafeInteger(result.h) || result.h < 1 || result.w > width || result.h > height || !(result.indices instanceof Uint16Array) || result.indices.length !== result.w * result.h || !(result.used instanceof Uint8Array) || result.used.length !== 256) throw new Error('Invalid cleanup result dimensions or buffers.');
  if (!preserveMetadata) { result.used.fill(0); result.hasTransparency = false; }
  return { result, replacements, width, height };
}

function unchanged(cleanup) {
  const trusted = preparedResults.get(cleanup);
  return trusted && !trusted.hasChanges && cleanup.replacements === trusted.replacements && cleanup.width === trusted.width && cleanup.height === trusted.height;
}
// The client applies prepared decisions only to completed nearest results, whose
// used/transparency metadata is already correct. Arbitrary helper callers keep
// the original rebuild semantics; an untrusted hasChanges flag never skips work.
export function applyPreparedCleanup(result, cleanup, sourceWidth, sourceHeight) {
  if (!unchanged(cleanup)) return applyCleanup(result, cleanup, sourceWidth, sourceHeight);
  state(result, cleanup, undefined, undefined, true);
  return result;
}
export async function applyPreparedCleanupAsync(result, cleanup, options = {}) {
  if (!unchanged(cleanup)) return applyCleanupAsync(result, cleanup, options);
  checkCanceled(options.signal); state(result, cleanup, undefined, undefined, true);
  options.onProgress?.(1); checkCanceled(options.signal);
  return result;
}
function applyRange({ result, replacements, width, height }, start, end) {
  for (let y = Math.floor(start / result.w); start < end; y++) {
    const sourceRow = Math.floor((y + .5) * height / result.h) * width;
    const rowEnd = Math.min(end, (y + 1) * result.w);
    for (let x = start % result.w; start < rowEnd; start++, x++) {
      const p = start, next = replacements[sourceRow + Math.floor((x + .5) * width / result.w)];
      if (result.indices[p] === EMPTY_INDEX) result.hasTransparency = true;
      else {
        if (next < EMPTY_INDEX) result.indices[p] = next;
        result.used[result.indices[p]] = 1;
      }
    }
  }
}

// Apply full-source decisions to the quantizer's existing center-spread samples.
// Used colors are rebuilt because PNG/GIF packing consumes this metadata.
export function applyCleanup(result, cleanup, sourceWidth, sourceHeight) {
  applyRange(state(result, cleanup, sourceWidth, sourceHeight), 0, result.indices.length);
  return result;
}

// Full-resolution exports use the same range kernel with cooperative tasks.
export async function applyCleanupAsync(result, cleanup, { signal, onProgress } = {}) {
  checkCanceled(signal);
  const prepared = state(result, cleanup), length = result.indices.length;
  for (let start = 0; start < length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 2048, length); applyRange(prepared, start, end); start = end;
    } while (start < length && performance.now() < deadline);
    onProgress?.(start / length);
    if (start < length) await yieldTask();
  }
  checkCanceled(signal);
  return result;
}
