import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { outNames, zipBytes } from './save.js';

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
