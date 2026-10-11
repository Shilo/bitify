import { afterEach, describe, expect, it, vi } from 'vitest';
import { droppedImages, fetchDroppedImage, hasImageDrop } from './image-drop.js';

const signed = 'https://cdn.discordapp.com/attachments/123/456/sprite.png?ex=abc&is=def&hm=signature';
const transfer = (data = {}, files = []) => ({ types: Object.keys(data), files, getData: type => data[type] ?? data[type.toLowerCase()] ?? '' });
afterEach(() => vi.unstubAllGlobals());

describe('image drag payloads', () => {
  it('accepts advertised types without reading protected payloads during hover', () => {
    for (const type of ['Files', 'text/uri-list', 'text/plain', 'text/html', 'DownloadURL', 'downloadurl']) {
      expect(hasImageDrop({ types: [type], getData: () => { throw new Error('protected'); } })).toBe(true);
    }
    expect(hasImageDrop({ types: ['application/x-custom'] })).toBe(false);
    expect(hasImageDrop(null)).toBe(false);
  });
  it('prefers files over accompanying URLs, without duplicate imports', () => {
    const file = new File(['pixels'], 'sprite.png', { type: 'image/png' });
    expect(droppedImages(transfer({ 'text/uri-list': signed, 'text/plain': signed }, [file]))).toEqual({ files: [file], urls: [] });
  });
  it('preserves a signed Discord URL from plain text', () => {
    expect(droppedImages(transfer({ 'text/plain': ` ${signed}\n` }))).toEqual({ files: [], urls: [signed] });
  });
  it('reads URI lists with comments, multiple URLs and duplicates', () => {
    const other = 'https://media.discordapp.net/attachments/123/456/other.gif?width=500';
    expect(droppedImages(transfer({ 'text/uri-list': `# images\r\n${signed}\r\n${other}\r\n${signed}` })).urls).toEqual([signed, other]);
  });
  it('uses one representation of a URL present in multiple formats', () => {
    expect(droppedImages(transfer({ 'text/uri-list': signed, 'text/plain': signed })).urls).toEqual([signed]);
  });
  it('reads Chromium DownloadURL without breaking URL colons', () => {
    const drag = transfer({ downloadurl: `image/png:sprite.png:${signed}` });
    expect(hasImageDrop(drag)).toBe(true);
    expect(droppedImages(drag).urls).toEqual([signed]);
  });
  it('falls back to plain text if other flavors contain no valid URLs', () => {
    expect(droppedImages(transfer({ 'text/uri-list': '# comment', DownloadURL: 'bad', 'text/plain': signed })).urls).toEqual([signed]);
  });
  it('ignores ordinary text, page markup and unsafe URL schemes or credentials', () => {
    for (const text of ['hello', '<img src="https://example.com/sprite.png">', 'javascript:alert(1)', 'file:///sprite.png', 'data:image/png;base64,AAAA', 'https://user:pass@example.com/sprite.png', '/relative.png']) {
      expect(droppedImages(transfer({ 'text/plain': text })).urls).toEqual([]);
    }
    expect(droppedImages(null)).toEqual({ files: [], urls: [] });
  });
});

describe('fetching dropped images', () => {
  const respond = (body, type, status = 200) => {
    const fetch = vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'content-type': type } }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };
  it('fetches the complete URL without credentials or a referrer and returns an image file', async () => {
    const fetch = respond('pixels', 'image/png'), signal = new AbortController().signal;
    const file = await fetchDroppedImage(signed, signal);
    expect(fetch).toHaveBeenCalledWith(signed, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal });
    expect(file.name).toBe('sprite.png');
    expect(file.type).toBe('image/png');
    expect(await file.text()).toBe('pixels');
  });
  it('decodes a URL filename without including query signatures', async () => {
    respond('pixels', 'image/png');
    expect((await fetchDroppedImage('https://example.com/pixel%20art.png?signature=abc')).name).toBe('pixel art.png');
  });
  it('keeps GIFs animated when the server sends an unspecified binary type', async () => {
    respond('GIF89a', 'application/octet-stream');
    expect((await fetchDroppedImage('https://example.com/sprite.GIF')).type).toBe('image/gif');
  });
  it('identifies extensionless GIFs by their bytes when the MIME type is generic or missing', async () => {
    for (const type of ['application/octet-stream', '']) {
      for (const signature of ['GIF87a', 'GIF89a']) {
        respond(`${signature}pixels`, type);
        const file = await fetchDroppedImage('https://example.com/image?id=123');
        expect(file.type).toBe('image/gif');
        expect(file.name).toBe('image.gif');
      }
    }
  });
  it('normalizes image MIME parameters so GIF responses use the animation decoder', async () => {
    respond('GIF89apixels', 'image/gif; charset=binary');
    expect((await fetchDroppedImage('https://example.com/animation')).type).toBe('image/gif');
  });
  it('does not identify unrelated generic bytes as a GIF', async () => {
    for (const body of ['GIF89', 'gif89a', 'GIF90a', 'not an image']) {
      respond(body, 'application/octet-stream');
      expect((await fetchDroppedImage('https://example.com/image')).type).toBe('application/octet-stream');
    }
  });
  it('adds an extension for extensionless image URLs', async () => {
    respond('pixels', 'image/webp');
    expect((await fetchDroppedImage('https://example.com/image?id=123')).name).toBe('image.webp');
  });
  it('handles malformed escapes in filenames', async () => {
    respond('pixels', 'image/png');
    expect((await fetchDroppedImage('https://example.com/%broken.png')).name).toBe('%broken.png');
  });
  it('rejects failed requests, non-image responses and empty images', async () => {
    for (const [body, type, status] of [['expired', 'text/plain', 403], ['<html>not an image</html>', 'text/html', 200], ['', 'image/png', 200]]) {
      respond(body, type, status);
      await expect(fetchDroppedImage(signed)).rejects.toThrow();
    }
  });
  it('propagates cross-origin/network failures and cancellation', async () => {
    for (const error of [new TypeError('Failed to fetch'), new DOMException('Aborted', 'AbortError')]) {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
      await expect(fetchDroppedImage(signed)).rejects.toBe(error);
    }
  });
});
