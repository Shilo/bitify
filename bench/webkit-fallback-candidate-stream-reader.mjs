// Research metadata gate only. Pixel data, CRC and zlib stay browser-decoded.
import {checkCanceled, yieldTask} from '../src/lib/quantize.js';
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const u32 = (bytes, p = 0) => bytes[p] * 0x1000000 + (bytes[p + 1] << 16) + (bytes[p + 2] << 8) + bytes[p + 3];
export async function pngCandidateShape(file, signal) {
  checkCanceled(signal);
  if (!Number.isSafeInteger(file.size) || file.size < 45 || file.size > 32 * 1024 * 1024 ||
      typeof file.stream !== 'function') return null;
  const reader = file.stream().getReader();
  let current = new Uint8Array(0), position = 0, consumed = 0, received = 0, reads = 0;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, {once: true});
  async function move(length, output) {
    let moved = 0;
    while (moved < length) {
      checkCanceled(signal);
      if (position === current.length) {
        const chunk = await reader.read(); checkCanceled(signal);
        if (chunk.done || !(chunk.value instanceof Uint8Array) || ++reads > 131072) return false;
        current = chunk.value; position = 0; received += current.length;
        if (received > file.size) return false;
        if (!current.length) continue;
      }
      const count = Math.min(length - moved, current.length - position);
      if (output) output.set(current.subarray(position, position + count), moved);
      position += count; moved += count; consumed += count;
    }
    return true;
  }
  async function take(length) {
    const bytes = new Uint8Array(length);
    return await move(length, bytes) ? bytes : null;
  }
  try {
    const head = await take(33);
    if (!head || signature.some((value, p) => head[p] !== value) || u32(head, 8) !== 13 ||
        String.fromCharCode(...head.subarray(12, 16)) !== 'IHDR' || head[24] !== 8 || head[25] !== 6 ||
        head[26] || head[27] || head[28]) return null;
    const width = u32(head, 16), height = u32(head, 20);
    if (!width || !height || !Number.isSafeInteger(width * height)) return null;
    let seenSrgb = false, seenPhys = false, data = false, compressed = 0, deadline = performance.now() + 8;
    for (let chunks = 1; chunks < 65536 && consumed + 12 <= file.size; chunks++) {
      if (performance.now() >= deadline) { await yieldTask(); checkCanceled(signal); deadline = performance.now() + 8; }
      const chunk = await take(8);
      if (!chunk) return null;
      const length = u32(chunk), name = String.fromCharCode(...chunk.subarray(4)), end = consumed + length + 4;
      if (length > 0x7fffffff || end > file.size) return null;
      if (name === 'IDAT') { data = true; compressed += length; if (!await move(length, null)) return null; }
      else if (name === 'sRGB' && !data && !seenSrgb && length === 1) {
        const intent = await take(1);
        if (!intent || intent[0] > 3) return null;
        seenSrgb = true;
      } else if (name === 'pHYs' && !data && !seenPhys && length === 9) {
        const density = await take(9);
        if (!density || density[8] > 1) return null;
        seenPhys = true;
      } else if (name === 'IEND' && !length && data && compressed >= 6 && end === file.size) {
        return await move(4, null) ? {width, height} : null;
      } else return null;
      if (!await move(4, null)) return null;
    }
    return null;
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
