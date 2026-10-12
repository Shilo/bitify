import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchDroppedPalette } from './palette-drop.js';
import { MAX_IMAGE_BYTES, decodePaletteFile } from './palette-decode.js';

const signed = 'https://cdn.discordapp.com/attachments/123/456/palette.png?ex=abc&is=def&hm=signature';
const ase = () => readFileSync(new URL('./fixtures/palette-import/palette.ase', import.meta.url));
const gif = new TextEncoder().encode('GIF89apixels');
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
afterEach(() => vi.unstubAllGlobals());
function respond(body, type = 'application/octet-stream', extra = {}) {
  const fetch = vi.fn().mockResolvedValue(new Response(body, { headers: { 'content-type': type, ...extra } }));
  vi.stubGlobal('fetch', fetch); return fetch;
}

describe('bounded dropped palette downloads', () => {
  it('preserves the complete signed URL with CORS, no credentials and no referrer', async () => {
    const fetch = respond(png, 'image/png'), signal = new AbortController().signal;
    const result = await fetchDroppedPalette(signed, signal);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(signed, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
    expect(result.name).toBe('palette.png'); expect(result.type).toBe('image/png');
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(png);
  });
  it.each(['file:///a.png', 'javascript:alert(1)', 'data:image/png;base64,AA', 'https://user:pass@example.com/a.png', '/a.png', 'invalid'])('rejects unsafe/nonabsolute URL %s before fetch', async url => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(fetchDroppedPalette(url)).rejects.toThrow(/HTTP or HTTPS/); expect(fetch).not.toHaveBeenCalled();
  });
  it('decodes request filenames without including signatures or losing them to generic redirects', async () => {
    const response = new Response(png, { headers: { 'content-type': 'image/png' } });
    Object.defineProperty(response, 'url', { value: 'https://cdn.example.com/generic' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect((await fetchDroppedPalette('https://example.com/pixel%20art.png?signature=abc')).name).toBe('pixel art.png');
    respond(png, 'image/png'); expect((await fetchDroppedPalette('https://example.com/%broken.png')).name).toBe('%broken.png');
  });
  it.each(['application/octet-stream', '', 'IMAGE/GIF; charset=binary'])('identifies parameterized/extensionless GIF with type %s', async mime => {
    respond(gif, mime); const result = await fetchDroppedPalette('https://example.com/image?raw=1');
    expect(result.type).toBe('image/gif'); expect(result.name).toBe('image.gif');
  });
  it.each([
    [png, 'image/png', 'png'], [Uint8Array.from([255, 216, 255, 0]), 'image/jpeg', 'jpg'],
    [Uint8Array.from([66, 77, 0]), 'image/bmp', 'bmp'],
    [Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), 'image/webp', 'webp'],
  ])('identifies supported image signature %s without a filename', async (bytes, mime, extension) => {
    respond(bytes); const result = await fetchDroppedPalette('https://example.com/');
    expect(result.name).toBe('palette.' + extension); expect(result.type).toBe(mime);
  });
  it('normalizes genuine image signatures away from misleading Aseprite/text/GIF filenames', async () => {
    for (const name of ['not.ase', 'not.aseprite', 'not.hex', 'not.gif']) {
      respond(png); const result = await fetchDroppedPalette('https://example.com/' + name);
      expect(result.name).toBe('not.png'); expect(result.type).toBe('image/png');
    }
  });
  it.each(['application/octet-stream', '', 'application/x-aseprite; charset=binary', 'APPLICATION/X-ASE'])('routes actual Aseprite bytes from generic/signed attachments with type %s', async type => {
    respond(ase(), type); const file = await fetchDroppedPalette('https://example.com/attachment?token=keep');
    expect(file.name).toBe('attachment.ase'); expect(file.type).toBe('application/octet-stream');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array(ase()));
    expect((await decodePaletteFile(file)).total).toBe(255);
  });
  it('routes Aseprite magic over a misleading image filename without revalidating the format', async () => {
    respond(Uint8Array.from([0, 0, 0, 0, 0xe0, 0xa5]));
    const file = await fetchDroppedPalette('https://example.com/download.png');
    expect(file.name).toBe('download.ase');
    await expect(decodePaletteFile(file)).rejects.toThrow('Invalid or incomplete Aseprite');
  });
  it('disambiguates a valid Aseprite file whose byte-length header also starts with BMP magic', async () => {
    const original = ase(), padded = new Uint8Array(0x4d42); padded.set(original);
    const view = new DataView(padded.buffer), extra = padded.length - original.length;
    view.setUint32(0, padded.length, true); view.setUint32(128, padded.length - 128, true);
    view.setUint16(134, view.getUint16(134, true) + 1, true);
    if (view.getUint32(140, true)) view.setUint32(140, view.getUint32(140, true) + 1, true);
    view.setUint32(original.length, extra, true); view.setUint16(original.length + 4, 0xbeef, true);
    expect(padded[0]).toBe(66); expect(padded[1]).toBe(77);
    expect((await decodePaletteFile(new File([padded], 'padded.ase'))).total).toBe(255);
    respond(padded); const downloaded = await fetchDroppedPalette('https://example.com/generic');
    expect(downloaded.name).toBe('generic.ase'); expect((await decodePaletteFile(downloaded)).total).toBe(255);
  });
  it('keeps image precedence for coincident Aseprite magic with an inconsistent file length', async () => {
    respond(Uint8Array.from([66, 77, 0, 0, 0xe0, 0xa5, 0, 0]));
    expect((await fetchDroppedPalette('https://example.com/generic')).type).toBe('image/bmp');
  });
  it('keeps existing Aseprite extensions', async () => {
    respond(ase()); expect((await fetchDroppedPalette('https://example.com/PALETTE.ASEPRITE')).name).toBe('PALETTE.ASEPRITE');
  });
  it('rejects Adobe ASEF rather than guessing from the .ase extension', async () => {
    respond('ASEF\0\0', 'application/x-ase');
    await expect(fetchDroppedPalette('https://example.com/palette.ase')).rejects.toThrow('Adobe ASE');
  });
  it('rejects unknown generic/known-MIME bytes without inventing Aseprite validity', async () => {
    for (const mime of ['application/octet-stream', 'application/x-aseprite', '']) {
      respond('not a palette', mime);
      await expect(fetchDroppedPalette('https://example.com/attachment')).rejects.toThrow('supported palette');
    }
  });
  it('preserves supported image extension fallback for generic server responses', async () => {
    respond('invalid pixels'); const file = await fetchDroppedPalette('https://example.com/image.PNG');
    expect(file.type).toBe('image/png'); expect(file.name).toBe('image.PNG');
  });
  it('rejects nonimage webpages, remote text, failed HTTP responses and empty bodies', async () => {
    for (const mime of ['text/html', 'text/plain', 'application/json']) {
      respond('not a palette', mime); await expect(fetchDroppedPalette(signed)).rejects.toThrow('did not return');
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('expired', { status: 403 })));
    await expect(fetchDroppedPalette(signed)).rejects.toThrow('download failed');
    respond('', 'image/png'); await expect(fetchDroppedPalette(signed)).rejects.toThrow('empty');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(fetchDroppedPalette(signed)).rejects.toThrow('empty');
  });
  it('enforces oversized declared Content-Length before any reads and cancels the body', async () => {
    const cancel = vi.fn(), body = new ReadableStream({ cancel });
    respond(body, 'image/png', { 'content-length': String(MAX_IMAGE_BYTES + 1) });
    await expect(fetchDroppedPalette(signed)).rejects.toThrow('32 MiB'); expect(cancel).toHaveBeenCalledOnce();
  });
  it('bounds actual streamed bytes when Content-Length lies, and cancels/relinquishes the reader', async () => {
    const cancel = vi.fn(); let at = 0;
    const parts = [new Uint8Array(MAX_IMAGE_BYTES), new Uint8Array(1)]; parts[0].set(png);
    const stream = new ReadableStream({ pull(controller) { if (at < parts.length) controller.enqueue(parts[at++]); }, cancel }, { highWaterMark: 0 });
    respond(stream, 'image/png', { 'content-length': '1' });
    await expect(fetchDroppedPalette(signed)).rejects.toThrow('32 MiB'); expect(cancel).toHaveBeenCalledOnce(); expect(stream.locked).toBe(false);
  });
  it('allows the exact 32MiB boundary and ignores malformed advisory lengths', async () => {
    const bytes = new Uint8Array(MAX_IMAGE_BYTES); bytes.set(png);
    respond(bytes, 'image/png', { 'content-length': '-1' });
    expect((await fetchDroppedPalette(signed)).size).toBe(MAX_IMAGE_BYTES);
  });
  it('recognizes a signature fragmented across network chunks', async () => {
    const input = ase();
    const stream = new ReadableStream({ start(c) { for (let i = 0; i < 12; i++) c.enqueue(input.subarray(i, i + 1)); c.enqueue(input.subarray(12)); c.close(); } });
    respond(stream); expect((await decodePaletteFile(await fetchDroppedPalette('https://example.com/raw'))).total).toBe(255);
  });
  it('rejects pre-cancellation without starting a fetch', async () => {
    const controller = new AbortController(); controller.abort(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(fetchDroppedPalette(signed, controller.signal)).rejects.toMatchObject({ name: 'AbortError' }); expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['resolve', 'reject'])('keeps cancellation authoritative after a late fetch %s', async outcome => {
    let resolve, reject; vi.stubGlobal('fetch', vi.fn(() => new Promise((yes, no) => { resolve = yes; reject = no; })));
    const controller = new AbortController(), pending = fetchDroppedPalette(signed, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); controller.abort();
    if (outcome === 'resolve') resolve(new Response(png)); else reject(new Error('late network failure'));
    await expectation;
  });
  it('cancels a late successful response body when fetch ignored the aborted signal', async () => {
    const cancel = vi.fn(), response = new Response(new ReadableStream({ cancel }));
    let resolve; vi.stubGlobal('fetch', vi.fn(() => new Promise(done => resolve = done)));
    const controller = new AbortController(), pending = fetchDroppedPalette(signed, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); resolve(response); await expectation; expect(cancel).toHaveBeenCalledOnce();
  });
  it('cancels a pending stream read on abort and releases its lock', async () => {
    const cancel = vi.fn(), stream = new ReadableStream({ pull() {}, cancel }); respond(stream, 'image/png');
    const controller = new AbortController(), pending = fetchDroppedPalette(signed, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(stream.locked).toBe(true)); controller.abort(); await expectation;
    expect(cancel).toHaveBeenCalledOnce(); expect(stream.locked).toBe(false);
  });
  it('keeps cancellation authoritative after read errors and catches cancel rejection', async () => {
    let rejectRead;
    const reader = { read: vi.fn(() => new Promise((_, reject) => rejectRead = reject)), cancel: vi.fn().mockRejectedValue(new Error('cancel failed')), releaseLock: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), body: { getReader: () => reader } }));
    const controller = new AbortController(), pending = fetchDroppedPalette(signed, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(reader.read).toHaveBeenCalled()); controller.abort(); rejectRead(new Error('late read failure')); await expectation;
    expect(reader.releaseLock).toHaveBeenCalledOnce();
  });
  it('explains fetch rejection without claiming to know whether it was CORS or a network failure', async () => {
    const error = new TypeError('Failed to fetch'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(fetchDroppedPalette(signed)).rejects.toMatchObject({
      message: 'Could not download this palette. The website may block direct imports, or the link or connection may be unavailable.', cause: error,
    });
  });
  it('preserves other fetch errors and stream errors when work was not canceled', async () => {
    const error = new Error('network unavailable'); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(fetchDroppedPalette(signed)).rejects.toBe(error);
    const readError = new TypeError('stream failed'); respond(new ReadableStream({ start(c) { c.error(readError); } }));
    await expect(fetchDroppedPalette(signed)).rejects.toBe(readError);
  });
  it('keeps cancellation authoritative over a late fetch TypeError', async () => {
    let reject; vi.stubGlobal('fetch', vi.fn(() => new Promise((_, no) => reject = no)));
    const controller = new AbortController(), pending = fetchDroppedPalette(signed, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); reject(new TypeError('Failed to fetch')); await expectation;
  });
});
