import { checkCanceled } from './quantize.js';
import { MAX_IMAGE_BYTES } from './palette-decode.js';

const IMAGE_TYPES = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp' };
const ASE_TYPES = new Set(['application/x-aseprite', 'application/x-aseprite-file', 'application/aseprite', 'application/x-ase']);
const TOO_LARGE = 'Palette downloads must be no larger than 32 MiB.';

function imageType(header, length) {
  const starts = values => length >= values.length && values.every((value, i) => header[i] === value);
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (starts([255, 216, 255])) return 'image/jpeg';
  if (starts([71, 73, 70, 56, 55, 97]) || starts([71, 73, 70, 56, 57, 97])) return 'image/gif';
  if (starts([66, 77])) return 'image/bmp';
  if (starts([82, 73, 70, 70]) && length >= 12 && header[8] === 87 && header[9] === 69 && header[10] === 66 && header[11] === 80) return 'image/webp';
  return null;
}

// The modal uses droppedImages() to copy protected drag strings synchronously.
// Keep artwork's fetchDroppedImage policy unchanged; this fetch bounds actual
// streamed bytes before constructing a File and also recognizes Aseprite tables.
export async function fetchDroppedPalette(url, signal) {
  checkCanceled(signal);
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Use an HTTP or HTTPS palette link.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Use an HTTP or HTTPS palette link without credentials.');
  let response;
  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
    checkCanceled(signal);
  } catch (error) {
    if (signal?.aborted) { try { await response?.body?.cancel(); } catch { /* Preserve cancellation. */ } }
    checkCanceled(signal);
    // Fetch deliberately does not distinguish CORS denial from network failure.
    if (error instanceof TypeError) throw new Error('Could not download this palette. The website may block direct imports, or the link or connection may be unavailable.', { cause: error });
    throw error;
  }
  const cancelBody = async () => { try { await response.body?.cancel(); } catch { /* Preserve the download error. */ } };
  if (!response.ok) { await cancelBody(); checkCanceled(signal); throw new Error('Palette download failed.'); }
  const mime = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (mime && !mime.startsWith('image/') && mime !== 'application/octet-stream' && !ASE_TYPES.has(mime)) {
    await cancelBody(); checkCanceled(signal); throw new Error('The link did not return a palette image or Aseprite file.');
  }
  const declared = response.headers.get('content-length');
  if (declared && /^\d+$/.test(declared.trim()) && Number(declared) > MAX_IMAGE_BYTES) {
    await cancelBody(); checkCanceled(signal); throw new Error(TOO_LARGE);
  }
  if (!response.body) throw new Error('The palette download was empty.');
  const reader = response.body.getReader(), chunks = [], header = new Uint8Array(12);
  let total = 0, headLength = 0;
  const abort = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    checkCanceled(signal);
    for (;;) {
      const { done, value } = await reader.read();
      checkCanceled(signal);
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) throw new Error(TOO_LARGE);
      if (headLength < header.length) {
        const count = Math.min(header.length - headLength, value.byteLength);
        header.set(value.subarray(0, count), headLength); headLength += count;
      }
      chunks.push(value);
    }
  } catch (error) {
    try { await reader.cancel(); } catch { /* Preserve the read/limit error. */ }
    checkCanceled(signal); throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }
  checkCanceled(signal);
  if (!total) throw new Error('The palette download was empty.');
  if (headLength >= 4 && header[0] === 65 && header[1] === 83 && header[2] === 69 && header[3] === 70) throw new Error('Adobe ASE swatches are unsupported. Use an Aseprite palette, PNG or HEX file.');
  let name = parsed.pathname.split('/').pop() || 'palette';
  try { name = decodeURIComponent(name); } catch { /* Keep invalid escapes as supplied. */ }
  const extension = name.split('.').pop().toLowerCase();
  const detected = imageType(header, headLength);
  const aseMagic = headLength >= 6 && header[4] === 0xe0 && header[5] === 0xa5;
  // An Aseprite size DWORD can itself start with BM/JPEG bytes. Only an
  // ambiguous signature needs a size comparison; all table validation is lazy.
  const aseSize = aseMagic && new DataView(header.buffer).getUint32(0, true) === total;
  let type = detected || mime;
  if (aseMagic && (!detected || aseSize)) {
    // Signature routes the file; the lazy Aseprite parser validates its framing
    // and table. This is not a second interpretation of that binary format.
    if (!['ase', 'aseprite'].includes(extension)) name = name.replace(/\.[^.]*$/, '') + '.ase';
    type = 'application/octet-stream';
  } else {
    if (detected && IMAGE_TYPES[extension] !== detected) {
      const suffix = Object.keys(IMAGE_TYPES).find(ext => IMAGE_TYPES[ext] === detected);
      name = name.replace(/\.[^.]*$/, '') + `.${suffix}`;
    }
    if (!type || type === 'application/octet-stream') type = IMAGE_TYPES[extension] || type;
    if (!detected && !type?.startsWith('image/') && !['ase', 'aseprite'].includes(extension)) throw new Error('The link did not return a supported palette image or Aseprite file.');
    if (!name.includes('.')) {
      const suffix = Object.keys(IMAGE_TYPES).find(ext => IMAGE_TYPES[ext] === type);
      if (suffix) name += `.${suffix}`;
    }
  }
  checkCanceled(signal);
  return new File(chunks, name, { type });
}
