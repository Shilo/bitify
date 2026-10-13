import { afterEach, describe, expect, it, vi } from 'vitest';
import { crc32, inflateSync } from 'node:zlib';
import omggif from 'omggif';
import { unzipSync } from 'fflate';
import { palettePngBytes, palettePngBytesAsync, pngBytes, pngBlob, fileBytes, downloadName, outNames, saveAll } from './save.js';
import { encodePaletteGif } from './gif.js';
import { yieldExport } from './palette-export.js';

const colors = count => Array.from({ length: count }, (_, i) => `#${i.toString(16).padStart(2, '0')}00${(255 - i).toString(16).padStart(2, '0')}`);
describe('export scheduling and cancellation', () => {
  it('uses posted tasks with closed ports and retains the unsupported-channel timer fallback', async () => {
    const close1 = vi.fn(), close2 = vi.fn();
    vi.stubGlobal('MessageChannel', class { constructor() {
      this.port1 = { close: close1 }; this.port2 = { close: close2, postMessage: () => queueMicrotask(() => this.port1.onmessage()) };
    } });
    await yieldExport(); expect(close1).toHaveBeenCalledOnce(); expect(close2).toHaveBeenCalledOnce();
    vi.stubGlobal('MessageChannel', undefined); await yieldExport();
    vi.unstubAllGlobals();
  });
  it('cancels before PNG/GIF work and between replayed frames', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(fileBytes({}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    const during = new AbortController(), getFrame = vi.fn(async () => {
      during.abort(); return { indices: Uint16Array.of(0), delay: 100 };
    });
    await expect(encodePaletteGif({ colors: colors(2), w: 1, h: 1, frameCount: 3, getFrame }, { signal: during.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getFrame).toHaveBeenCalledOnce();
  });
  it('terminates a GIF compressor waiting for a frame acknowledgement on cancellation', async () => {
    let worker;
    vi.stubGlobal('Worker', class {
      constructor() { worker = this; this.terminate = vi.fn(); }
      postMessage(message) {
        if (message.type === 'start') queueMicrotask(() => this.onmessage?.({ data: {} }));
        if (message.type === 'frame') this.pendingFrame = true;
      }
    });
    const controller = new AbortController();
    const pending = encodePaletteGif({ colors: colors(2), w: 1, h: 1, frames: [{ indices: Uint16Array.of(0), delay: 100 }] }, { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(worker?.pendingFrame).toBe(true)); controller.abort(); await rejected;
    expect(worker.terminate).toHaveBeenCalled();
    expect(worker.onmessage).toBeNull(); expect(worker.onmessageerror).toBeNull();
    vi.unstubAllGlobals();
  });
});
const still = (palette, values, w = values.length) => ({ family: 'full-palette', name: 'sprite.png', colors: palette, indices: Uint16Array.from(values), w, h: values.length / w });
const rgba = (palette, values) => values.flatMap(index => index === 256 ? [0, 0, 0, 0] : [parseInt(palette[index].slice(1, 3), 16), parseInt(palette[index].slice(3, 5), 16), parseInt(palette[index].slice(5, 7), 16), 255]);

// Independent PNG reader: verifies CRCs with Node, inflates with Node, and
// unpacks each row from IHDR/PLTE/tRNS rather than the encoder's helpers.
function readPng(bytes) {
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length), chunks = new Map();
  for (let at = 8; at < bytes.length;) {
    const length = view.getUint32(at), body = bytes.subarray(at + 4, at + 8 + length);
    expect(crc32(body)).toBe(view.getUint32(at + 8 + length));
    chunks.set(String.fromCharCode(...body.subarray(0, 4)), body.subarray(4));
    at += 12 + length;
  }
  const header = chunks.get('IHDR'), head = new DataView(header.buffer, header.byteOffset);
  const w = head.getUint32(0), h = head.getUint32(4), depth = header[8], type = header[9];
  const raw = inflateSync(chunks.get('IDAT')), palette = chunks.get('PLTE'), alpha = chunks.get('tRNS');
  const stride = Math.ceil(w * (type === 6 ? 32 : depth) / 8) + 1, pixels = [];
  expect(raw.length).toBe(stride * h);
  for (let y = 0; y < h; y++) {
    expect(raw[y * stride]).toBe(0);
    for (let x = 0; x < w; x++) {
      if (type === 6) pixels.push(...raw.subarray(y * stride + 1 + x * 4, y * stride + 5 + x * 4));
      else {
        const bit = x * depth;
        const index = (raw[y * stride + 1 + (bit >> 3)] >> (8 - depth - (bit % 8))) & ((1 << depth) - 1);
        const opacity = alpha?.[index] ?? 255;
        // RGB under alpha zero is intentionally immaterial to membership.
        pixels.push(...(opacity ? palette.subarray(index * 3, index * 3 + 3) : [0, 0, 0]), opacity);
      }
    }
  }
  return { w, h, depth, type, pixels, palette, alpha, chunks };
}

// GifReader is used independently of the production decodeGif compositor.
// Exported frames are full-screen and disposal2 clears them between frames.
function readGif(bytes) {
  const reader = new omggif.GifReader(bytes), frames = [];
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i), pixels = new Uint8Array(reader.width * reader.height * 4);
    reader.decodeAndBlitFrameRGBA(i, pixels);
    frames.push({ info, pixels: [...pixels] });
  }
  return { reader, frames, tableSize: 1 << ((bytes[10] & 7) + 1) };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('full palette PNG', () => {
  it('round-trips every opaque palette size 1–256 with the smallest depth and independently padded odd-width rows', () => {
    for (let count = 1; count <= 256; count++) {
      const palette = colors(count), values = Array.from({ length: 257 * 3 }, (_, i) => i % count);
      const result = readPng(palettePngBytes(still(palette, values, 257)));
      expect(result.pixels, `count ${count}`).toEqual(rgba(palette, values));
      expect(result.depth).toBe(count <= 2 ? 1 : count <= 4 ? 2 : count <= 16 ? 4 : 8);
      expect(result.type).toBe(3);
      expect(result.palette.length).toBe(count * 3);
      expect(result.alpha).toBeUndefined();
      expect([...result.chunks.get('sRGB')]).toEqual([0]);
    }
  });

  it('round-trips transparency at every palette size and switches only 256used colors+empty to direct RGBA', () => {
    for (let count = 1; count <= 256; count++) {
      const palette = colors(count), values = Array.from({ length: 257 * 2 }, (_, i) => i % (count + 1) === count ? 256 : i % (count + 1));
      const result = readPng(palettePngBytes(still(palette, values, 257)));
      expect(result.pixels, `count ${count}`).toEqual(rgba(palette, values));
      expect(result.type).toBe(count === 256 ? 6 : 3);
      expect(result.depth).toBe(count + 1 <= 2 ? 1 : count + 1 <= 4 ? 2 : count + 1 <= 16 ? 4 : 8);
      if (count === 256) expect(result.palette).toBeUndefined();
      else expect(result.palette.length).toBe((count + 1) * 3);
    }
  });

  it('compacts only used entries in selected order and supports completely empty input', () => {
    const palette = colors(256);
    const image = still(palette, [255, 4, 256, 4, 255, 256], 3), copy = image.indices.slice();
    const result = readPng(pngBytes(image));
    expect(result.depth).toBe(2);
    expect(result.palette.length).toBe(9);
    expect([...result.palette.subarray(3)]).toEqual([...rgba(palette, [4]).slice(0, 3), ...rgba(palette, [255]).slice(0, 3)]);
    expect(result.pixels).toEqual(rgba(palette, [...image.indices]));
    expect(image.indices).toEqual(copy);
    const empty = readPng(palettePngBytes(still(palette, [256, 256, 256], 1)));
    expect([empty.depth, empty.palette.length]).toEqual([1, 3]);
    expect(empty.pixels).toEqual(rgba(palette, [256, 256, 256]));
  });

  it('async compression, fileBytes and clipboard blobs decode identically', async () => {
    const image = still(colors(256), [...Array(256).keys(), 256]);
    const reference = readPng(palettePngBytes(image));
    const outputs = [await palettePngBytesAsync(image), await fileBytes(image), new Uint8Array(await (await pngBlob(image)).arrayBuffer())];
    for (const output of outputs) expect(readPng(output).pixels).toEqual(reference.pixels);
  });

  it('rejects malformed sizes, colors and indices instead of producing a corrupt file', () => {
    const image = still(colors(2), [0, 1, 256]);
    for (const change of [{ w: 0 }, { h: 1.5 }, { colors: [] }, { colors: ['#abc'] }, { colors: ['#ffffff', '#FFFFFF'] }, { indices: Uint16Array.of(0) }, { indices: Uint16Array.of(0, 2, 256) }, { indices: Uint16Array.of(0, 257, 256) }, { indices: Uint8Array.of(0, 1, 0) }]) {
      expect(() => palettePngBytes({ ...image, ...change })).toThrow();
    }
  });
});

describe('full palette GIF', () => {
  it('uses the union over every frame, minimum2-entry table, exact colors, delays, loop and transparent disposal', async () => {
    const palette = colors(256), values = [[255, 256, 255], [256, 4, 256], [4, 255, 256]];
    const image = { family: 'full-palette', colors: palette, w: 3, h: 1, loop: 3, frames: values.map((v, i) => ({ indices: Uint16Array.from(v), delay: [200, 70, 130][i] })) };
    const result = readGif(await encodePaletteGif(image));
    expect(result.reader.loopCount()).toBe(3);
    expect(result.tableSize).toBe(4);
    expect(result.frames.map(frame => frame.info.delay)).toEqual([20, 7, 13]);
    for (let i = 0; i < values.length; i++) {
      expect(result.frames[i].pixels).toEqual(rgba(palette, values[i]));
      expect(result.frames[i].info.disposal).toBe(2);
      expect(result.frames[i].info.transparent_index).toBe(0);
      expect(result.frames[i].info.has_local_palette).toBe(false);
    }
    const one = readGif(await encodePaletteGif({ ...image, loop: null, frames: [{ indices: Uint16Array.of(255, 255, 255), delay: 100 }] }));
    expect(one.tableSize).toBe(2);
    expect(one.reader.loopCount()).toBe(null);
    expect(one.frames[0].info.transparent_index).toBe(null);
    expect(one.frames[0].pixels).toEqual(rgba(palette, [255, 255, 255]));
  });

  it('accepts all256 opaque colors,255+empty, and all-empty frames without reducing colors', async () => {
    const palette = colors(256);
    for (const values of [[...Array(256).keys()], [...Array(255).keys(), 256], Array(256).fill(256)]) {
      const image = { colors: palette, w: 256, h: 1, frames: [{ indices: Uint16Array.from(values), delay: 100 }], loop: 0 };
      const result = readGif(await encodePaletteGif(image));
      expect(result.frames[0].pixels).toEqual(rgba(palette, values));
      expect(result.tableSize).toBe(values[0] === 256 ? 2 : 256);
    }
  });

  it('rejects256+empty across different frames with an actionable typed error before the second pass', async () => {
    const calls = [], palette = colors(256);
    const image = { colors: palette, w: 256, h: 1, frameCount: 2, getFrame: async i => {
      calls.push(i);
      return { indices: i === 0 ? Uint16Array.from(Array(256).keys()) : new Uint16Array(256).fill(256), delay: 100 };
    } };
    await expect(encodePaletteGif(image)).rejects.toMatchObject({ code: 'PALETTE_GIF_LIMIT', colors: 256, transparent: true });
    expect(calls).toEqual([0, 1]);
    expect(palette).toEqual(colors(256));
  });

  it('replays a sequential source twice, rejects changed/out-of-range frames and validates GIF bounds', async () => {
    const calls = [], palette = colors(2);
    const image = { colors: palette, w: 3, h: 1, frameCount: 3, getFrame: async i => {
      calls.push(i);
      return { indices: Uint16Array.of(i % 2, 256, (i + 1) % 2), delay: 100 };
    } };
    const result = readGif(await fileBytes(image));
    expect(result.frames.length).toBe(3);
    expect(calls).toEqual([0, 1, 2, 0, 1, 2]);
    for (const change of [{ w: 65536 }, { loop: -1 }, { loop: 65536 }, { frameCount: 0 }, { getFrame: () => ({ indices: Uint16Array.of(0, 2, 256), delay: 100 }) }, { getFrame: () => ({ indices: Uint16Array.of(0, 1, 256), delay: Infinity }) }]) {
      await expect(encodePaletteGif({ ...image, ...change })).rejects.toThrow();
    }
    let n = 0;
    await expect(encodePaletteGif({ colors: palette, w: 1, h: 1, frameCount: 1, getFrame: () => ({ indices: Uint16Array.of(n++ ? 1 : 0), delay: 100 }) })).rejects.toThrow('changed');
  });

  it('keeps incompressible frames complete while growing the encoded buffer', async () => {
    const palette = colors(256), values = Array.from({ length: 127 * 61 }, (_, i) => ((Math.imul(i, 2654435761) >>> 20) ^ (i >>> 2)) & 255);
    const result = readGif(await encodePaletteGif({ colors: palette, w: 127, h: 61, frames: Array.from({ length: 4 }, () => ({ indices: Uint16Array.from(values), delay: 100 })) }));
    expect(result.frames.length).toBe(4);
    for (const frame of result.frames) expect(frame.pixels).toEqual(rgba(palette, values));
  });
});

describe('palette save names and batch atomicity', () => {
  function downloads() {
    const captured = [], clicked = [], originalTimeout = globalThis.setTimeout;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { captured.push(blob); return `blob:${captured.length}`; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay, ...args) => delay === 10000 ? 0 : originalTimeout(callback, delay, ...args));
    vi.stubGlobal('document', { body: { append() {} }, createElement: () => ({ click() { clicked.push(this.download); }, remove() {} }) });
    return { captured, clicked };
  }

  it('preserves legacy suffixes and numbers palette names case-insensitively', () => {
    expect(outNames(['a.png', 'A.gif', 'a-2.png'], ['png', 'png', 'png'], ['full-palette', 'full-palette', 'full-palette'])).toEqual(['a-palette.png', 'A-2-palette.png', 'a-2-2-palette.png']);
    expect(outNames(['a.png', 'a.png'], [], ['full-palette', undefined])).toEqual(['a-palette.png', 'a-1bit.png']);
    expect(downloadName({ name: 'walk.gif', family: 'full-palette', getFrame() {} })).toBe('walk-palette.gif');
  });

  it('awaits the one-image callback and snapshots descriptor names for a fully encoded ZIP', async () => {
    const result = downloads(), palette = colors(2), image = still(palette, [0, 1, 256]);
    await saveAll([{ name: 'wrong.png' }], async () => image);
    expect(result.clicked).toEqual(['sprite-palette.png']);
    const items = [{ name: 'first.png' }, { name: 'second.png' }];
    await saveAll(items, async item => ({ ...image, name: item.name === 'first.png' ? 'same.png' : 'SAME.png' }));
    expect(result.clicked).toEqual(['sprite-palette.png', 'colorfetti.zip']);
    const files = unzipSync(new Uint8Array(await result.captured[1].arrayBuffer()));
    expect(Object.keys(files)).toEqual(['same-palette.png', 'SAME-2-palette.png']);
    for (const file of Object.values(files)) expect(readPng(file).pixels).toEqual(rgba(palette, [0, 1, 256]));
  });

  it('downloads nothing if a later animation in a batch is blocked', async () => {
    const result = downloads(), palette = colors(256);
    await expect(saveAll([{ name: 'first.png' }, { name: 'second.gif' }], item => item.name.endsWith('.png') ? still(palette, [0]) : {
      name: item.name, colors: palette, family: 'full-palette', w: 257, h: 1,
      frames: [{ indices: Uint16Array.from([...Array(256).keys(), 256]), delay: 100 }],
    })).rejects.toMatchObject({ code: 'PALETTE_GIF_LIMIT' });
    expect(result.captured).toEqual([]);
    expect(result.clicked).toEqual([]);
  });
});
