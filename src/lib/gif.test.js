import { afterEach, describe, it, expect, vi } from 'vitest';
import omggif from 'omggif';
import { decodeGif, decodeGifAsync, encodeGif, encodeGifAsync } from './gif.js';
import * as quantize from './quantize.js';

afterEach(() => vi.restoreAllMocks());

const RED = [255, 0, 0, 255], BLUE = [0, 0, 255, 255], GREEN = [0, 255, 0, 255], NONE = [0, 0, 0, 0];
// Splits RGBA bytes into one [r, g, b, a] per pixel, so expectations read as pictures.
const pixels = data => Array.from({ length: data.length / 4 }, (_, i) => [...data.slice(i * 4, i * 4 + 4)]);

// Builds a 2x2 GIF by hand. Palette: 0 transparent, 1 red, 2 blue, 3 green.
function gif(frames, loop) {
  const buf = new Uint8Array(2048);
  const writer = new omggif.GifWriter(buf, 2, 2, { palette: [0x000000, 0xff0000, 0x0000ff, 0x00ff00], loop });
  for (const [x, y, w, h, indices, opts] of frames) writer.addFrame(x, y, w, h, indices, { transparent: 0, ...opts });
  return buf.subarray(0, writer.end());
}

describe('decodeGif', () => {
  it('keeps fallback disposal, transparency, delays and loop byte-for-byte', async () => {
    const bytes = gif([
      [0, 0, 2, 2, [1, 0, 1, 1], { disposal: 1, delay: 7 }],
      [1, 1, 1, 1, [2], { disposal: 3, delay: 12 }],
      [0, 0, 1, 1, [3], { disposal: 2, delay: 25 }],
      [1, 0, 1, 1, [2], { delay: 0 }],
    ], 3);
    expect(await decodeGifAsync(bytes)).toEqual(decodeGif(bytes));
  });

  it('cancels the fallback before its first decoder task', async () => {
    const controller = new AbortController();
    const pending = decodeGifAsync(new Uint8Array(0), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('reads size, loop count, and each frame with its delay in milliseconds', () => {
    const out = decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], { delay: 20 }], [0, 0, 2, 2, [2, 2, 2, 2], { delay: 7 }]], 0));
    expect([out.width, out.height, out.loop, out.frames.length]).toEqual([2, 2, 0, 2]);
    expect(out.frames.map(f => f.delay)).toEqual([200, 70]);
    expect(pixels(out.frames[0].data)).toEqual([RED, RED, RED, RED]);
    expect(pixels(out.frames[1].data)).toEqual([BLUE, BLUE, BLUE, BLUE]);
  });

  it('reports no loop count when the file has none', () => {
    expect(decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], {}]])).loop).toBe(null);
  });

  it('plays a frame with almost no delay at 100ms, as browsers do', () => {
    const out = decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], { delay: 0 }], [0, 0, 2, 2, [1, 1, 1, 1], { delay: 1 }]], 0));
    expect(out.frames.map(f => f.delay)).toEqual([100, 100]);
  });

  it('draws a partial frame over the one before it when that frame is kept', () => {
    const out = decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], { disposal: 1 }], [1, 1, 1, 1, [2], {}]], 0));
    expect(pixels(out.frames[1].data)).toEqual([RED, RED, RED, BLUE]);
  });

  it('clears a frame that asks to be cleared before the next is drawn', () => {
    const out = decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], { disposal: 2 }], [1, 1, 1, 1, [2], {}]], 0));
    expect(pixels(out.frames[1].data)).toEqual([NONE, NONE, NONE, BLUE]);
  });

  it('puts back what was there when a frame asks to be undone', () => {
    const out = decodeGif(gif([
      [0, 0, 2, 2, [1, 1, 1, 1], { disposal: 1 }],
      [1, 1, 1, 1, [2], { disposal: 3 }],
      [0, 0, 1, 1, [3], {}],
    ], 0));
    expect(pixels(out.frames[1].data)).toEqual([RED, RED, RED, BLUE]);
    expect(pixels(out.frames[2].data)).toEqual([GREEN, RED, RED, RED]);
  });

  it('leaves transparent pixels of a frame showing what is underneath', () => {
    const out = decodeGif(gif([[0, 0, 2, 2, [1, 1, 1, 1], { disposal: 1 }], [0, 0, 2, 2, [0, 2, 0, 2], {}]], 0));
    expect(pixels(out.frames[1].data)).toEqual([RED, BLUE, RED, BLUE]);
  });
});

describe('encodeGif', () => {
  // masks: 0 empty, 1 first color, 2 second color
  const image = {
    w: 3, h: 2, first: '#f6dfa4', second: '#0b0a0c', loop: 0,
    frames: [
      { mask: Uint8Array.of(1, 0, 2, 2, 0, 1), delay: 200 },
      { mask: Uint8Array.of(0, 1, 0, 0, 2, 0), delay: 80 },
    ],
  };
  const A = [246, 223, 164, 255], B = [11, 10, 12, 255];

  it('writes a GIF that reads back as the same two-color frames, with empty pixels transparent', () => {
    const out = decodeGif(encodeGif(image));
    expect([out.width, out.height, out.loop, out.frames.length]).toEqual([3, 2, 0, 2]);
    expect(out.frames.map(f => f.delay)).toEqual([200, 80]);
    expect(pixels(out.frames[0].data)).toEqual([A, NONE, B, B, NONE, A]);
    // nothing of the first frame may show through the second
    expect(pixels(out.frames[1].data)).toEqual([NONE, A, NONE, NONE, B, NONE]);
  });

  it('writes the pixels of a color that is None as empty ones, and leaves the masks it was given alone', () => {
    const out = decodeGif(encodeGif({ ...image, first: null }));
    expect(pixels(out.frames[0].data)).toEqual([NONE, NONE, B, B, NONE, NONE]);
    expect(pixels(out.frames[1].data)).toEqual([NONE, NONE, NONE, NONE, B, NONE]);
    expect(pixels(decodeGif(encodeGif({ ...image, second: null })).frames[0].data)).toEqual([A, NONE, NONE, NONE, NONE, A]);
    expect([...image.frames[0].mask]).toEqual([1, 0, 2, 2, 0, 1]);
  });

  it('keeps a GIF that plays once playing once', () => {
    expect(decodeGif(encodeGif({ ...image, loop: null })).loop).toBe(null);
    expect(decodeGif(encodeGif({ ...image, loop: 3 })).loop).toBe(3);
  });

  it('copes with a large frame that does not compress', () => {
    const w = 200, h = 150, mask = Uint8Array.from({ length: w * h }, (_, i) => ((i * 2654435761) >>> 30) % 3);
    const out = decodeGif(encodeGif({ ...image, w, h, frames: [{ mask, delay: 100 }, { mask, delay: 100 }] }));
    expect(out.frames.length).toBe(2);
    expect(out.frames[1].data.length).toBe(w * h * 4);
    expect([...out.frames[1].data.slice(0, 4)]).toEqual([NONE, A, B][mask[0]]);
  });
});

describe('cooperative 1-bit GIF encoding', () => {
  const image = { w: 3, h: 2, first: '#222323', second: '#f0f6f0', loop: 0,
    frames: Array.from({ length: 4 }, (_, frame) => ({ mask: Uint8Array.from({ length: 6 }, (_, pixel) => (pixel + frame) % 3), delay: 80 + frame * 10 })) };
  it('yields before asking for the first lazy frame and includes mask generation in its 8ms budget', async () => {
    let clock = 0; const events = [], getFrame = vi.fn(index => { events.push(`mask${index}`); clock += 9; return image.frames[index]; });
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const yieldSpy = vi.spyOn(quantize, 'yieldTask').mockImplementation(async () => { events.push('yield'); });
    const output = await encodeGifAsync({ ...image, frames: undefined, frameCount: 4, getFrame });
    expect(events).toEqual(['yield', 'mask0', 'yield', 'mask1', 'yield', 'mask2', 'yield', 'mask3']);
    expect(yieldSpy).toHaveBeenCalledTimes(4); expect(output).toEqual(encodeGif(image));
  });
  it('includes LZW compression cost in the same frame-group budget', async () => {
    let clock = 0; const OriginalWriter = omggif.GifWriter;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const yieldSpy = vi.spyOn(quantize, 'yieldTask').mockImplementation(async () => {});
    vi.spyOn(omggif, 'GifWriter').mockImplementation(function (...args) {
      const writer = new OriginalWriter(...args), add = writer.addFrame;
      writer.addFrame = (...frame) => { const result = add(...frame); clock += 9; return result; }; return writer;
    });
    expect(await encodeGifAsync(image)).toEqual(encodeGif(image)); expect(yieldSpy).toHaveBeenCalledTimes(4);
  });
  it('grows output through many frames without changing bytes or mutating None masks', async () => {
    const OriginalWriter = omggif.GifWriter, initial = [], growth = [];
    vi.spyOn(omggif, 'GifWriter').mockImplementation(function (buffer, ...args) {
      initial.push(buffer.length);
      const writer = new OriginalWriter(buffer, ...args), set = writer.setOutputBuffer;
      writer.setOutputBuffer = next => { growth.push(next.length); return set(next); }; return writer;
    });
    const source = { ...image, w: 160, h: 120, first: null, loop: 3,
      frames: Array.from({ length: 20 }, (_, frame) => ({ mask: Uint8Array.from({ length: 160 * 120 }, (_, pixel) => ((Math.imul(pixel + frame * 23, 2654435761) >>> 20) % 3)), delay: 123 + frame * 7 })) };
    const before = source.frames.map(frame => frame.mask.slice());
    const actual = await encodeGifAsync(source);
    expect(initial).toEqual([1024]); expect(growth.length).toBeGreaterThan(1);
    expect(actual.length).toBeGreaterThan(1024); expect(actual).toEqual(encodeGif(source));
    expect(source.frames.map(frame => frame.mask)).toEqual(before);
    const decoded = decodeGif(actual);
    expect(decoded.frames).toHaveLength(20); expect(decoded.loop).toBe(3);
    expect(decoded.frames.map(frame => frame.delay)).toEqual(source.frames.map(frame => Math.round(frame.delay / 10) * 10));
  });
  it('cancels during the first yield without asking for any frame', async () => {
    const controller = new AbortController(), getFrame = vi.fn();
    vi.spyOn(quantize, 'yieldTask').mockImplementation(async () => controller.abort());
    await expect(encodeGifAsync({ ...image, frameCount: 4, getFrame }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getFrame).not.toHaveBeenCalled();
  });
  it('cancels after lazy generation without encoding or asking for later frames', async () => {
    const controller = new AbortController(), OriginalWriter = omggif.GifWriter; let add;
    vi.spyOn(omggif, 'GifWriter').mockImplementation(function (...args) {
      const writer = new OriginalWriter(...args); add = vi.fn(writer.addFrame); writer.addFrame = add; return writer;
    });
    const getFrame = vi.fn(index => { controller.abort(); return image.frames[index]; });
    await expect(encodeGifAsync({ ...image, frameCount: 4, getFrame }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getFrame).toHaveBeenCalledOnce(); expect(add).not.toHaveBeenCalled();
  });
  it('checks cancellation after compression before finishing or asking for another frame', async () => {
    const controller = new AbortController(), OriginalWriter = omggif.GifWriter; let end;
    vi.spyOn(omggif, 'GifWriter').mockImplementation(function (...args) {
      const writer = new OriginalWriter(...args), add = writer.addFrame;
      writer.addFrame = (...frame) => { const result = add(...frame); controller.abort(); return result; };
      end = vi.fn(writer.end); writer.end = end; return writer;
    });
    const getFrame = vi.fn(index => image.frames[index]);
    await expect(encodeGifAsync({ ...image, frameCount: 4, getFrame }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getFrame).toHaveBeenCalledOnce(); expect(end).not.toHaveBeenCalled();
  });
  it('rejects a failed frame and never generates its successors', async () => {
    const getFrame = vi.fn(index => { if (index === 1) throw new Error('Frame failed'); return image.frames[index]; });
    await expect(encodeGifAsync({ ...image, frameCount: 4, getFrame })).rejects.toThrow('Frame failed');
    expect(getFrame.mock.calls).toEqual([[0], [1]]);
  });
  it.each([
    { w: 0 }, { h: 65536 }, { loop: -1 }, { frameCount: 0, getFrame() {} },
    { frames: [{ mask: new Uint8Array(1), delay: 80 }] }, { frames: [{ mask: image.frames[0].mask, delay: NaN }] },
  ])('rejects malformed animation inputs before returning bytes: %j', async changed => {
    await expect(encodeGifAsync({ ...image, ...changed })).rejects.toThrow();
  });
});
