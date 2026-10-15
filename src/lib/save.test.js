import { afterEach, describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { inflateSync, crc32 } from 'node:zlib';
import { unzipSync } from 'fflate';
import { outNames, zipBytes, pngBytes, fileBytes, copyOne } from './save.js';
import { decodeGif, encodeGif } from './gif.js';

describe('clipboard promise ownership', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts the native write synchronously with the same unresolved PNG promise', async () => {
    let resolveImage, data;
    const png = new Promise(resolve => { resolveImage = resolve; });
    vi.stubGlobal('ClipboardItem', class { constructor(value) { data = value; } });
    const written = Promise.resolve('native result'), write = vi.fn(() => written);
    vi.stubGlobal('navigator', { clipboard: { write } });
    const result = copyOne(png);
    expect(write).toHaveBeenCalledOnce();
    expect(data['image/png']).toBe(png);
    expect(result).toBe(written);
    resolveImage(new Blob(['owned PNG'], { type: 'image/png' }));
    await expect(result).resolves.toBe('native result');
  });

  it('keeps producer rejection visible to the native writer rather than substituting a successful image', async () => {
    let rejectImage;
    const png = new Promise((_, reject) => { rejectImage = reject; });
    vi.stubGlobal('ClipboardItem', class { constructor(value) { this.png = value['image/png']; } });
    vi.stubGlobal('navigator', { clipboard: { write: items => items[0].png.then(() => undefined) } });
    const error = new Error('Owned encoder failed'), failed = expect(copyOne(png)).rejects.toBe(error);
    rejectImage(error);
    await failed;
  });

  it('owns late producer rejection when platform setup/write fails without consuming the image', () => {
    // Isolate process-level rejection reporting from Vitest's own rejection
    // listener, while exercising the real module and the actual event loop.
    const script = `
      import { copyOne } from ${JSON.stringify(new URL('./save.js', import.meta.url).href)};
      const outcomes = [];
      for (const scenario of ['missing-clipboard', 'missing-item', 'item-constructor-throws', 'write-throws', 'write-rejects']) {
        const unhandled = [], listener = error => unhandled.push(error.message);
        process.on('unhandledRejection', listener);
        let rejectImage;
        const png = new Promise((_, reject) => { rejectImage = reject; });
        Object.defineProperty(globalThis, 'navigator', { configurable: true, value: scenario === 'missing-clipboard' ? {} : { clipboard: { write() {
          const error = new DOMException('Owned platform refusal.', 'NotAllowedError');
          if (scenario === 'write-rejects') return Promise.reject(error);
          throw error;
        } } } });
        if (scenario === 'missing-item') delete globalThis.ClipboardItem;
        else globalThis.ClipboardItem = class { constructor() { if (scenario === 'item-constructor-throws') throw new TypeError('Owned constructor refusal.'); } };
        let failure;
        try { await copyOne(png); } catch (error) { failure = error.name; }
        rejectImage(new Error('Owned late encoder failure.'));
        await new Promise(resolve => setTimeout(resolve, 20));
        process.removeListener('unhandledRejection', listener);
        outcomes.push({ scenario, failure, unhandled });
      }
      console.log(JSON.stringify(outcomes));
    `;
    const outcomes = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }));
    expect(outcomes.map(value => value.failure)).toEqual(['TypeError', 'ReferenceError', 'TypeError', 'NotAllowedError', 'NotAllowedError']);
    for (const outcome of outcomes) expect(outcome.unhandled, outcome.scenario).toEqual([]);
  });
});

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
    // 5 wide, 2 high, so a row does not end on a whole byte: first color, empty, second, second, first
    const row = [1, 0, 2, 2, 1];
    const png = pngBytes({ mask: Uint8Array.from([...row, ...row]), w: 5, h: 2, first: '#f6dfa4', second: '#0b0a0c' });

    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const all = chunks(png), [head, colors, clear, data] = all;
    expect(all.map(c => c.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
    expect(all.every(c => c.crcOk)).toBe(true);
    // width 5, height 2, 2 bits per pixel, colors from a palette, no interlace
    expect([...head.data]).toEqual([0, 0, 0, 5, 0, 0, 0, 2, 2, 3, 0, 0, 0]);
    // the palette is empty, first color, second color, and only the empty one is see-through
    expect([...colors.data]).toEqual([0, 0, 0, 246, 223, 164, 11, 10, 12]);
    expect([...clear.data]).toEqual([0]);
    // each row is a filter byte of 0, then its pixels four to a byte, the first in the top two bits
    expect([...inflateSync(data.data)]).toEqual([0, 0b01001010, 0b01000000, 0, 0b01001010, 0b01000000]);
  });

  it('makes a color that is None see-through, and gives every see-through entry the color that is left', () => {
    const row = [1, 0, 2, 2, 1], image = { mask: Uint8Array.from([...row, ...row]), w: 5, h: 2 };
    const [, colors1, clear1, data1] = chunks(pngBytes({ ...image, first: null, second: '#0b0a0c' }));
    expect([...colors1.data]).toEqual([11, 10, 12, 11, 10, 12, 11, 10, 12]);
    expect([...clear1.data]).toEqual([0, 0]);
    const [, colors2, clear2] = chunks(pngBytes({ ...image, first: '#f6dfa4', second: null }));
    expect([...colors2.data]).toEqual([246, 223, 164, 246, 223, 164, 246, 223, 164]);
    expect([...clear2.data]).toEqual([0, 255, 0]);
    // the pixels themselves are written as ever
    expect([...inflateSync(data1.data)]).toEqual([0, 0b01001010, 0b01000000, 0, 0b01001010, 0b01000000]);
  });
});

describe('animations', () => {
  it('consumes a lazy 1-bit animation with the unchanged encoded bytes', async () => {
    const frames = [{ mask: Uint8Array.of(1, 0), delay: 70 }, { mask: Uint8Array.of(2, 1), delay: 120 }];
    const about = { name: 'lazy.gif', w: 2, h: 1, first: '#222323', second: null, loop: 3 };
    const requested = [];
    const bytes = await fileBytes({ ...about, frameCount: frames.length, getFrame: i => { requested.push(i); return frames[i]; } });
    expect(requested).toEqual([0, 1]);
    expect(bytes).toEqual(encodeGif({ ...about, frames }));
    expect(decodeGif(bytes)).toMatchObject({ width: 2, height: 1, loop: 3 });
  });
  it('names an animated image .gif and a still one .png', () => {
    expect(outNames(['walk.gif', 'hero.png', 'walk.png'], ['gif', 'png', 'png'])).toEqual(['walk-1bit.gif', 'hero-1bit.png', 'walk-1bit.png']);
  });

  it('keeps two animations with the same name apart', () => {
    expect(outNames(['walk.gif', 'walk.gif'], ['gif', 'gif'])).toEqual(['walk-1bit.gif', 'walk-2-1bit.gif']);
  });

  it('encodes an image with frames as a GIF and one without as a PNG', async () => {
    const still = await fileBytes({ name: 'a.png', mask: Uint8Array.of(1), w: 1, h: 1, first: '#f6dfa4', second: '#0b0a0c' });
    expect([...still.subarray(0, 4)]).toEqual([137, 80, 78, 71]);

    const moving = await fileBytes({ name: 'a.gif', w: 1, h: 1, first: '#f6dfa4', second: '#0b0a0c', loop: 0,
      frames: [{ mask: Uint8Array.of(1), delay: 200 }, { mask: Uint8Array.of(2), delay: 200 }] });
    expect(String.fromCharCode(...moving.subarray(0, 6))).toBe('GIF89a');
    expect(decodeGif(moving).frames.map(f => [...f.data])).toEqual([[246, 223, 164, 255], [11, 10, 12, 255]]);
  });
});
