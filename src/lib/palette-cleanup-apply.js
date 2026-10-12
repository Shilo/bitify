import { checkCanceled, yieldTask, EMPTY_INDEX } from './quantize.js';

function state(result, cleanup, sourceWidth, sourceHeight) {
  const replacements = cleanup?.replacements ?? cleanup, width = cleanup?.width ?? sourceWidth, height = cleanup?.height ?? sourceHeight;
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !(replacements instanceof Uint16Array) || replacements.length !== width * height || !Number.isSafeInteger(result?.w) || result.w < 1 || !Number.isSafeInteger(result.h) || result.h < 1 || result.w > width || result.h > height || !(result.indices instanceof Uint16Array) || result.indices.length !== result.w * result.h || !(result.used instanceof Uint8Array) || result.used.length !== 256) throw new Error('Invalid cleanup result dimensions or buffers.');
  result.used.fill(0); result.hasTransparency = false;
  return { result, replacements, width, height };
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
