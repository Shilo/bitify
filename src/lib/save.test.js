import { describe, it, expect } from 'vitest';
import { inflateSync, crc32 } from 'node:zlib';
import { unzipSync } from 'fflate';
import { outNames, zipBytes, pngBytes, fileBytes } from './save.js';
import { decodeGif } from './gif.js';

describe('outNames', () => {
  it('replaces the extension with -1bit.png', () => {
    expect(outNames(['hero.png', 'my.sprite.v2.gif'])).toEqual(['hero-1bit.png', 'my.sprite.v2-1bit.png']);
  });

  it('copes with names that have no extension, no base, or a path', () => {
    expect(outNames(['sprite', '.png', 'dir/a.png'])).toEqual(['sprite-1bit.png', 'image-1bit.png', 'dir-a-1bit.png']);
  });

  it('numbers duplicates, ignoring case', () => {
    expect(outNames(['a.png', 'a.png', 'A.gif'])).toEqual(['a-1bit.png', 'a-2-1bit.png', 'A-3-1bit.png']);
  });

  it('never returns the same name twice', () => {
    const out = outNames(['a.png', 'a.png', 'a-2.png']);
    expect(new Set(out).size).toBe(3);
  });
});

describe('zipBytes', () => {
  it('makes a zip that unpacks to the same files', () => {
    const zipped = zipBytes(['x-1bit.png', 'y-1bit.png'], [Uint8Array.of(1, 2, 3), Uint8Array.of(4)]);
    const files = unzipSync(zipped);
    expect(Object.keys(files)).toEqual(['x-1bit.png', 'y-1bit.png']);
    expect([...files['x-1bit.png']]).toEqual([1, 2, 3]);
    expect([...files['y-1bit.png']]).toEqual([4]);
  });
});

describe('pngBytes', () => {
  // Splits a PNG into its chunks and checks each chunk's CRC with Node's own implementation.
  function chunks(png) {
    const view = new DataView(png.buffer, png.byteOffset), out = [];
    for (let o = 8; o < png.length; ) {
      const len = view.getUint32(o), body = png.subarray(o + 4, o + 8 + len);
      out.push({ type: String.fromCharCode(...body.subarray(0, 4)), data: body.subarray(4), crcOk: crc32(body) === view.getUint32(o + 8 + len) });
      o += 12 + len;
    }
    return out;
  }

  it('writes a valid PNG holding exactly the given pixels', () => {
    // 3 wide, 2 high: first color, empty, second color on each row
    const row = [246, 223, 164, 255, 0, 0, 0, 0, 11, 10, 12, 255];
    const png = pngBytes({ pixels: Uint8ClampedArray.from([...row, ...row]), w: 3, h: 2 });

    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const [head, data, end] = chunks(png);
    expect([head.type, data.type, end.type]).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect([head.crcOk, data.crcOk, end.crcOk]).toEqual([true, true, true]);
    // width 3, height 2, 8 bits per channel, RGBA, no interlace
    expect([...head.data]).toEqual([0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0]);
    // each row is a filter byte of 0 followed by the row's pixels, untouched
    expect([...inflateSync(data.data)]).toEqual([0, ...row, 0, ...row]);
  });
});

describe('animations', () => {
  it('names an animated image .gif and a still one .png', () => {
    expect(outNames(['walk.gif', 'hero.png', 'walk.png'], ['gif', 'png', 'png'])).toEqual(['walk-1bit.gif', 'hero-1bit.png', 'walk-1bit.png']);
  });

  it('keeps two animations with the same name apart', () => {
    expect(outNames(['walk.gif', 'walk.gif'], ['gif', 'gif'])).toEqual(['walk-1bit.gif', 'walk-2-1bit.gif']);
  });

  it('encodes an image with frames as a GIF and one without as a PNG', async () => {
    const still = await fileBytes({ name: 'a.png', pixels: Uint8ClampedArray.of(246, 223, 164, 255), w: 1, h: 1 });
    expect([...still.subarray(0, 4)]).toEqual([137, 80, 78, 71]);

    const moving = await fileBytes({ name: 'a.gif', w: 1, h: 1, first: '#f6dfa4', second: '#0b0a0c', loop: 0,
      frames: [{ mask: Uint8Array.of(1), delay: 200 }, { mask: Uint8Array.of(2), delay: 200 }] });
    expect(String.fromCharCode(...moving.subarray(0, 6))).toBe('GIF89a');
    expect(decodeGif(moving).frames.map(f => [...f.data])).toEqual([[246, 223, 164, 255], [11, 10, 12, 255]]);
  });
});
