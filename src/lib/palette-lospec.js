import { normalizeColors } from './palette-library.js';
import { lospecReference } from './palette-lospec-url.js';
import { checkCanceled } from './quantize.js';

export const LOSPEC_MAX_BYTES = 64 * 1024;
export const LOSPEC_TIMEOUT_MS = 15000;
const TOO_LARGE = 'Lospec palettes must be no larger than 64 KiB.';
const INVALID = 'Lospec did not return a valid palette with 1–256 opaque HEX colors.';

function plain(value, limit) {
  return typeof value === 'string' ? [...value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()].slice(0, limit).join('') : '';
}

export function parseLospecPalette(value, reference) {
  const { url, slug } = lospecReference(reference);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(INVALID);
  let colors;
  try { colors = normalizeColors(value.colors); } catch { throw new Error(INVALID); }
  const credit = plain(value.author, 160);
  return { name: plain(value.name, 64) || slug.slice(0, 64), colors,
    source: { kind: 'lospec', url, ...(credit ? { credit } : {}) } };
}

// No artwork, cookies, credentials or referrer are sent to the public palette endpoint.
export async function fetchLospecPalette(reference, { signal, fetcher = globalThis.fetch, timeoutMs = LOSPEC_TIMEOUT_MS } = {}) {
  checkCanceled(signal);
  const requested = lospecReference(reference), deadline = new AbortController();
  const timeout = setTimeout(() => deadline.abort(), timeoutMs);
  const operation = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
  let response, reader;
  const canceled = () => { reader?.cancel().catch(() => {}); };
  operation.addEventListener('abort', canceled, { once: true });
  try {
    response = await fetcher(requested.jsonUrl, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: operation });
    checkCanceled(operation);
    if (!response.ok) {
      if (response.status === 404) throw new Error('This Lospec palette was not found. Check the link or slug.');
      if (response.status === 429) throw new Error('Lospec is busy. Try again later or import a downloaded HEX file.');
      throw new Error('Lospec could not provide this palette. Try again or import a downloaded HEX file.');
    }
    const mime = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    // Lospec's public .json endpoint currently also serves octet-stream. The
    // bounded UTF-8 parse and palette schema below remain authoritative.
    if (mime && mime !== 'application/json' && mime !== 'text/json' && mime !== 'application/octet-stream' && !/^application\/[\w.+-]+\+json$/.test(mime)) throw new Error(INVALID);
    const declared = response.headers.get('content-length');
    if (declared && /^\d+$/.test(declared.trim()) && Number(declared) > LOSPEC_MAX_BYTES) throw new Error(TOO_LARGE);
    if (!response.body) throw new Error(INVALID);
    reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    for (;;) {
      checkCanceled(operation);
      const { value, done } = await reader.read();
      checkCanceled(operation);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > LOSPEC_MAX_BYTES) throw new Error(TOO_LARGE);
      chunks.push(value);
    }
    if (!bytes) throw new Error(INVALID);
    const data = new Uint8Array(bytes); let at = 0;
    for (const chunk of chunks) { data.set(chunk, at); at += chunk.byteLength; }
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); } catch { throw new Error(INVALID); }
    checkCanceled(operation);
    return parseLospecPalette(value, requested.url);
  } catch (problem) {
    try { if (reader) await reader.cancel(); else await response?.body?.cancel(); } catch { /* Keep the original failure. */ }
    checkCanceled(signal);
    if (deadline.signal.aborted) throw new Error('Lospec import timed out. Try again or import a downloaded HEX file.');
    if (problem instanceof TypeError) throw new Error('Could not reach Lospec. Check the link or connection, or import a downloaded HEX file.');
    throw problem;
  } finally {
    clearTimeout(timeout);
    operation.removeEventListener('abort', canceled);
    reader?.releaseLock();
  }
}
