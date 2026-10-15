import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalLospecUrl, looksLikeLospecReference, lospecReference } from './palette-lospec-url.js';
import { fetchLospecPalette, LOSPEC_MAX_BYTES, parseLospecPalette } from './palette-lospec.js';
import { LIBRARY_KEY, restoreLibrary, savePalette, serializeLibrary } from './palette-library.js';

const payload = { name: 'SLSO8', author: 'sulfur sauer', colors: ['0d2b45', '203c56', '544e68', '8d697a', 'd08159', 'ffaa5e', 'ffd4a3', 'ffecd6'] };
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
afterEach(() => vi.useRealTimers());

describe('Lospec references and palette data', () => {
  it('canonicalizes only exact public palette pages, JSON endpoints and internal slugs', () => {
    for (const input of ['slso8', 'SLSO8', 'https://lospec.com/palette-list/slso8', 'https://www.lospec.com/palette-list/SLSO8.json/', 'http://lospec.com/palette-list/slso8?tracking=1#colors']) {
      expect(lospecReference(input)).toEqual({ slug: 'slso8', url: 'https://lospec.com/palette-list/slso8', jsonUrl: 'https://lospec.com/palette-list/slso8.json' });
    }
    for (const input of [null, {}, '', 'slso8/name', 'x'.repeat(121), 'https://evil.test/palette-list/slso8', 'https://lospec.com.evil.test/palette-list/slso8', 'https://user:secret@lospec.com/palette-list/slso8', 'https://lospec.com:443/palette-list/slso8', 'https://lospec.com/palette-list/a%2fb', 'https://lospec.com/palette-list/../slso8', 'https://lospec.com/palette-list/a--b', 'https://lospec.com/other/slso8', 'javascript:alert(1)', 'https://lospec.com/palette-list/slso8.json.json']) {
      expect(() => lospecReference(input)).toThrow('Lospec palette link');
      expect(canonicalLospecUrl(input)).toBeNull();
    }
    expect(canonicalLospecUrl('slso8')).toBeNull();
  });

  it('keeps ordinary HEX and malformed plain text on the existing local path', () => {
    for (const text of ['abcdef', '#fff', '#000000, #ffffff', 'slso8', 'not colors', 'GIMP Palette\n0 0 0']) expect(looksLikeLospecReference(text)).toBe(false);
    for (const text of ['https://lospec.com/palette-list/slso8', 'https://evil.test/x', 'ftp://lospec.com/a', 'lospec.com/palette-list/slso8']) expect(looksLikeLospecReference(text)).toBe(true);
  });

  it('owns normalized ordered opaque colors, with bounded optional plain-text metadata', () => {
    const input = { name: 'A\nPalette', author: '<Author>\u0000', colors: [' FFFFFF ', '#fff', '#000', '#ABCDEF'] };
    const result = parseLospecPalette(input, 'slso8');
    expect(result).toEqual({ name: 'A Palette', colors: ['#ffffff', '#000000', '#abcdef'], source: { kind: 'lospec', url: 'https://lospec.com/palette-list/slso8', credit: '<Author>' } });
    input.colors.reverse(); expect(result.colors[0]).toBe('#ffffff');
    for (const author of [null, 42, {}, []]) expect(parseLospecPalette({ colors: ['123456'], author }, 'slso8')).toEqual({ name: 'slso8', colors: ['#123456'], source: { kind: 'lospec', url: 'https://lospec.com/palette-list/slso8' } });
    expect([...parseLospecPalette({ name: '😀'.repeat(80), colors: ['000000'], author: 'a'.repeat(200) }, 'slso8').name]).toHaveLength(64);
    expect(parseLospecPalette({ colors: ['000000'], author: 'a'.repeat(200) }, 'slso8').source.credit).toHaveLength(160);
    for (const value of [null, [], {}, { colors: [] }, { colors: ['#12345678'] }, { colors: ['rgba(0,0,0,1)'] }, { colors: [1] }, { colors: Array.from({ length: 257 }, (_, i) => i.toString(16).padStart(6, '0')) }]) expect(() => parseLospecPalette(value, 'slso8')).toThrow('1–256');
    expect(parseLospecPalette({ colors: Array(257).fill('000000') }, 'slso8').colors).toEqual(['#000000']);
  });

  it('round-trips validated source attribution while dropping untrusted link destinations', () => {
    const imported = parseLospecPalette(payload, 'https://lospec.com/palette-list/slso8');
    const storage = { getItem: () => null, setItem: vi.fn() };
    const saved = savePalette(storage, [], imported).record;
    expect(storage.setItem.mock.calls[0][0]).toBe(LIBRARY_KEY);
    expect(restoreLibrary(serializeLibrary([saved]))[0].source).toEqual(imported.source);
    for (const url of ['javascript:alert(1)', 'https://evil.test/palette-list/slso8', 'slso8', 'https://user@lospec.com/palette-list/slso8']) {
      const restored = restoreLibrary(serializeLibrary([{ ...saved, source: { kind: 'lospec', credit: 'Plain text', url } }]))[0];
      expect(restored.source).toEqual({ kind: 'custom', credit: 'Plain text' });
    }
    expect(restoreLibrary(serializeLibrary([{ ...saved, source: { kind: 'hex', url: imported.source.url } }]))[0].source).toEqual({ kind: 'hex' });
  });
});

describe('bounded direct Lospec acquisition', () => {
  it('uses only the canonical JSON URL without credentials, referrer, proxy or redirects', async () => {
    const fetcher = vi.fn(async () => json(payload));
    const result = await fetchLospecPalette('https://www.lospec.com/palette-list/SLSO8?ignored=yes', { fetcher });
    expect(result).toEqual(parseLospecPalette(payload, 'slso8'));
    expect(fetcher).toHaveBeenCalledWith('https://lospec.com/palette-list/slso8.json', expect.objectContaining({ mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: expect.any(AbortSignal) }));
    const invalid = vi.fn();
    await expect(fetchLospecPalette('https://evil.test/slso8', { fetcher: invalid })).rejects.toThrow('Lospec palette link');
    expect(invalid).not.toHaveBeenCalled();
  });

  it('rejects missing, unavailable, non-JSON, malformed and empty responses without partial data', async () => {
    for (const [response, message] of [[new Response('missing', { status: 404 }), 'not found'], [new Response('busy', { status: 429 }), 'busy'], [new Response('unavailable', { status: 503 }), 'could not provide'], [new Response('<html>', { headers: { 'content-type': 'text/html' } }), 'valid palette'], [new Response('{', { headers: { 'content-type': 'application/json' } }), 'valid palette'], [new Response(null), 'valid palette'], [json({ colors: ['#ffffffff'] }), 'valid palette']]) {
      await expect(fetchLospecPalette('slso8', { fetcher: async () => response })).rejects.toThrow(message);
      expect(response.body?.locked ?? false).toBe(false);
    }
    await expect(fetchLospecPalette('slso8', { fetcher: async () => { throw new TypeError('CORS'); } })).rejects.toThrow('Could not reach Lospec');
  });

  it('accepts Lospec public JSON served as octet-stream while still validating its contents', async () => {
    const response = value => new Response(value, { headers: { 'content-type': 'application/octet-stream; charset=utf-8' } });
    expect((await fetchLospecPalette('slso8', { fetcher: async () => response(JSON.stringify(payload)) })).colors).toEqual(payload.colors.map(c => '#' + c));
    for (const value of ['<html>Blocked</html>', JSON.stringify({ colors: ['#ffffffff'] })]) await expect(fetchLospecPalette('slso8', { fetcher: async () => response(value) })).rejects.toThrow('valid palette');
  });

  it('enforces declared and actual streamed byte bounds and cancels the body', async () => {
    for (const declared of [null, String(LOSPEC_MAX_BYTES + 1)]) {
      const canceled = vi.fn(), stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(LOSPEC_MAX_BYTES + 1)); }, cancel: canceled });
      const response = new Response(stream, { headers: { 'content-type': 'application/json', ...(declared ? { 'content-length': declared } : {}) } });
      await expect(fetchLospecPalette('slso8', { fetcher: async () => response })).rejects.toThrow('64 KiB');
      expect(canceled).toHaveBeenCalledTimes(1); expect(stream.locked).toBe(false);
    }
    const bytes = new TextEncoder().encode(JSON.stringify(payload)), stream = new ReadableStream({ start(c) { c.enqueue(bytes.subarray(0, 7)); c.enqueue(bytes.subarray(7)); c.close(); } });
    expect((await fetchLospecPalette('slso8', { fetcher: async () => new Response(stream, { headers: { 'content-type': 'application/json' } }) })).colors).toEqual(payload.colors.map(c => '#' + c));
  });

  it('honors cancellation before fetching and while a body read is pending', async () => {
    const controller = new AbortController(), fetcher = vi.fn(); controller.abort();
    await expect(fetchLospecPalette('slso8', { signal: controller.signal, fetcher })).rejects.toHaveProperty('name', 'AbortError');
    expect(fetcher).not.toHaveBeenCalled();
    const live = new AbortController(), canceled = vi.fn(), stream = new ReadableStream({ cancel: canceled });
    const pending = fetchLospecPalette('slso8', { signal: live.signal, fetcher: async () => new Response(stream, { headers: { 'content-type': 'application/json' } }) });
    await vi.waitFor(() => expect(stream.locked).toBe(true));
    const rejected = expect(pending).rejects.toHaveProperty('name', 'AbortError'); live.abort(); await rejected;
    expect(canceled).toHaveBeenCalledTimes(1); expect(stream.locked).toBe(false);
  });

  it('preserves cancellation when an old request resolves after close and a new request succeeds', async () => {
    let resolveOld;
    const old = new AbortController(), pending = fetchLospecPalette('slso8', { signal: old.signal, fetcher: () => new Promise(resolve => { resolveOld = resolve; }) });
    old.abort();
    const current = await fetchLospecPalette('https://lospec.com/palette-list/endesga-8', { fetcher: async () => json({ name: 'Current', colors: ['123456'] }) });
    const rejected = expect(pending).rejects.toHaveProperty('name', 'AbortError'); resolveOld(json(payload)); await rejected;
    expect(current.name).toBe('Current'); expect(current.colors).toEqual(['#123456']);
  });

  it('times out a pending request and pending body, clearing its timer after success', async () => {
    vi.useFakeTimers();
    const pending = fetchLospecPalette('slso8', { timeoutMs: 25, fetcher: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) });
    const rejected = expect(pending).rejects.toThrow('timed out'); await vi.advanceTimersByTimeAsync(25); await rejected;
    const stream = new ReadableStream({ cancel() {} });
    const reading = fetchLospecPalette('slso8', { timeoutMs: 25, fetcher: async () => new Response(stream, { headers: { 'content-type': 'application/json' } }) });
    const readRejected = expect(reading).rejects.toThrow('timed out'); await vi.advanceTimersByTimeAsync(25); await readRejected;
    await fetchLospecPalette('slso8', { fetcher: async () => json(payload) });
    expect(vi.getTimerCount()).toBe(0);
  });
});
