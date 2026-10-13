import { afterEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';

const pause = vi.hoisted(() => vi.fn());
vi.mock('./palette-export.js', async importOriginal => ({ ...await importOriginal(), yieldExport: pause }));
import { saveAll, pngBytes } from './save.js';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); pause.mockReset(); });

function downloads() {
  const blobs = [], names = [];
  vi.stubGlobal('document', {
    createElement: () => ({ click() { names.push(this.download); }, remove() {} }),
    body: { append() {} },
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:test'; });
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0);
  return { blobs, names };
}
const images = ['one.png', 'two.png', 'three.png'].map((name, i) => ({
  name, w: 1, h: 1, first: '#ffffff', second: '#000000', mask: Uint8Array.of(i),
}));

describe('atomic batch export scheduling', () => {
  it('yields between files, preserving order and identical PNG content', async () => {
    const captured = downloads(), order = [];
    pause.mockImplementation(async () => { order.push('yield'); expect(captured.names).toEqual([]); });
    await saveAll(images, image => { order.push(image.name); return image; });
    expect(order).toEqual(['one.png', 'yield', 'two.png', 'yield', 'three.png']);
    expect(captured.names).toEqual(['bitify.zip']);
    const files = unzipSync(new Uint8Array(await captured.blobs[0].arrayBuffer()));
    expect(Object.keys(files)).toEqual(['one-1bit.png', 'two-1bit.png', 'three-1bit.png']);
    for (const image of images) expect(files[image.name.replace('.png', '-1bit.png')]).toEqual(pngBytes(image));
  });

  it('downloads nothing if a later file fails after yielding', async () => {
    const captured = downloads();
    await expect(saveAll(images, image => {
      if (image === images[1]) throw new Error('source unavailable');
      return image;
    })).rejects.toThrow('source unavailable');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(captured.names).toEqual([]);
    expect(captured.blobs).toEqual([]);
  });

  it('keeps a single-file download without an extra batch yield', async () => {
    const captured = downloads();
    await saveAll(images.slice(0, 1), image => image);
    expect(captured.names).toEqual(['one-1bit.png']);
    expect(pause).not.toHaveBeenCalled();
  });
});
