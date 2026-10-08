import { describe, it, expect } from 'vitest';
import omggif from 'omggif';
import { decodeGif, encodeGif } from './gif.js';

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
