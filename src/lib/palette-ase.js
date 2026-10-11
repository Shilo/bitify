import { checkCanceled, yieldTask } from './quantize.js';

const MAX_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 4096;
const MODERN = 0x2019;

// Embedded FIRST-FRAME palette entries, not artwork rendering. Document color
// profiles do not change these raw numeric RGB channels, just as with HEX/GPL.
// Format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
export async function parseAsePalette(buffer, { signal, onProgress } = {}) {
  checkCanceled(signal);
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_BYTES) throw new Error('Aseprite palette files must be no larger than 32 MiB.');
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  const invalid = () => { throw new Error('Invalid or incomplete Aseprite palette file.'); };
  const fits = (at, length, end = bytes.length) => {
    if (at < 0 || length < 0 || at + length > end) invalid();
  };
  const word = at => { fits(at, 2); return view.getUint16(at, true); };
  const dword = at => { fits(at, 4); return view.getUint32(at, true); };
  fits(0, 128);
  const frameCount = word(6), headerSize = word(32) || 256;
  if (dword(0) !== bytes.length || word(4) !== 0xa5e0 || !frameCount || !word(8) || !word(10) || ![8, 16, 32].includes(word(12))) invalid();
  if (frameCount > (bytes.length - 128) / 16) invalid();

  let deadline = performance.now() + 8, work = 0;
  const checkpoint = async progress => {
    checkCanceled(signal);
    if (performance.now() < deadline) return;
    onProgress?.(progress);
    await yieldTask();
    checkCanceled(signal);
    deadline = performance.now() + 8;
  };
  onProgress?.(0);
  let frameAt = 128, firstEnd, firstChunks, modern = false;
  // Validate framing without retaining descriptors or touching cel/profile data.
  // This also rejects truncated later frames instead of trusting their count.
  for (let frame = 0; frame < frameCount; frame++) {
    fits(frameAt, 16);
    const length = dword(frameAt), end = frameAt + length;
    if (length < 16 || word(frameAt + 4) !== 0xf1fa) invalid();
    fits(frameAt, length);
    const count = dword(frameAt + 12) || word(frameAt + 6);
    if (count > (length - 16) / 6) invalid();
    let at = frameAt + 16;
    for (let chunk = 0; chunk < count; chunk++) {
      fits(at, 6, end);
      const size = dword(at);
      if (size < 6) invalid();
      fits(at, size, end);
      if (frame === 0 && word(at + 4) === MODERN) modern = true;
      at += size;
      if ((++work & 127) === 0) await checkpoint(at / bytes.length / 2);
    }
    if (at !== end) invalid();
    if (frame === 0) { firstEnd = end; firstChunks = count; }
    frameAt = end;
    if ((++work & 127) === 0) await checkpoint(frameAt / bytes.length / 2);
  }
  if (frameAt !== bytes.length) invalid();

  let entries = [], at = 144;
  for (let chunk = 0; chunk < firstChunks; chunk++) {
    const end = at + dword(at), type = word(at + 4);
    let cursor = at + 6;
    const take = length => { fits(cursor, length, end); const start = cursor; cursor += length; return start; };
    if (type === MODERN) {
      const start = take(20), size = dword(start) || entries.length || headerSize;
      const first = dword(start + 4), last = dword(start + 8);
      if (size < 1 || size > MAX_ENTRIES || first > last || last >= size) invalid();
      entries.length = size;
      for (let index = first; index <= last; index++) {
        const pos = take(6), flags = word(pos);
        if (flags & ~1) throw new Error('Unsupported Aseprite palette entry flags.');
        entries[index] = [bytes[pos + 2], bytes[pos + 3], bytes[pos + 4], bytes[pos + 5]];
        if (flags & 1) { const name = take(2); take(word(name)); }
        if ((++work & 127) === 0) await checkpoint(0.5 + cursor / firstEnd / 2);
      }
      if (cursor !== end) invalid();
    } else if (!modern && (type === 0x0004 || type === 0x0011)) {
      if (headerSize > 256) invalid();
      entries.length = headerSize;
      const packets = word(take(2));
      let start = 0;
      for (let packet = 0; packet < packets; packet++) {
        const pos = take(2), count = bytes[pos + 1] || 256;
        // Official readColor[2]Chunk accumulates packet START skips, not the
        // previous packet's color count. Overlapping packets update known entries.
        start += bytes[pos];
        if (start + count > headerSize) invalid();
        for (let index = start; index < start + count; index++) {
          const pos = take(3);
          let r = bytes[pos], g = bytes[pos + 1], b = bytes[pos + 2];
          if (type === 0x0011) {
            if (r > 63 || g > 63 || b > 63) invalid();
            r = (r << 2) | (r >> 4); g = (g << 2) | (g >> 4); b = (b << 2) | (b >> 4);
          }
          entries[index] = [r, g, b, 255];
          if ((++work & 127) === 0) await checkpoint(0.5 + cursor / firstEnd / 2);
        }
        if ((++work & 127) === 0) await checkpoint(0.5 + cursor / firstEnd / 2);
      }
      if (cursor !== end) invalid();
    }
    at = end;
    if ((++work & 127) === 0) await checkpoint(0.5 + at / firstEnd / 2);
  }
  if (!entries.length) throw new Error('No embedded palette in the first frame. Export a PNG or HEX palette.');
  const colors = [], seen = new Set();
  let partialAlpha = false;
  for (let index = 0; index < entries.length; index++) {
    const rgba = entries[index];
    if (!rgba) throw new Error('The first-frame palette is incomplete. Export a PNG or HEX palette.');
    if (rgba[3]) {
      if (rgba[3] < 255) partialAlpha = true;
      const color = '#' + rgba.slice(0, 3).map(channel => channel.toString(16).padStart(2, '0')).join('');
      if (!seen.has(color)) { seen.add(color); colors.push(color); }
    }
    if ((++work & 127) === 0) await checkpoint(1);
  }
  checkCanceled(signal);
  if (!colors.length) throw new Error('The palette contains no visible colors.');
  onProgress?.(1);
  checkCanceled(signal);
  return { image: null, colors, total: colors.length, partialAlpha, overLimit: colors.length > 256,
    truncated: false, firstFrame: frameCount > 1, source: { kind: 'aseprite' } };
}
