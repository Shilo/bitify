import { createCleanupAccumulator, validateCleanupFrames } from './palette-cleanup.js';

let accumulator, frames, frame = 0, pixels, at = 0, active = false;
function finish() {
  const result = accumulator.finish(); accumulator = null; frames = null; active = false;
  self.postMessage({ type: 'result', result }, [result.replacements.buffer]);
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'start' && !active) {
      validateCleanupFrames(data.frames);
      frames = data.frames; frame = 0; active = true; accumulator = createCleanupAccumulator(data.colors, data.alphaCut, data.metric);
      self.postMessage({ type: 'next' }); return;
    }
    if (!active) throw new Error('Invalid palette-cleanup worker request.');
    if (data.type === 'end') {
      if (pixels) throw new Error('Incomplete palette-cleanup source frame.');
      if (frame !== frames.length) throw new Error('Incomplete palette-cleanup animation.');
      finish(); return;
    }
    if (data.type !== 'chunk') throw new Error('Invalid palette-cleanup worker request.');
    const expected = frames[frame];
    if (!expected || data.width !== expected.width || data.height !== expected.height || !data.data?.length || data.data.length % 4 || at + data.data.length > expected.byteLength) throw new Error('Invalid palette-cleanup source chunk.');
    if (!pixels) { pixels = new Uint8ClampedArray(data.width * data.height * 4); at = 0; }
    pixels.set(data.data, at); at += data.data.length;
    if (data.last) {
      if (at !== pixels.length) throw new Error('Incomplete palette-cleanup source frame.');
      await accumulator.addSource({ width: data.width, height: data.height, data: pixels });
      pixels = null; at = 0; frame++;
      if (accumulator.exhausted || frame === frames.length) { finish(); return; }
    }
    self.postMessage({ type: 'next' });
  } catch (error) {
    accumulator = null; frames = null; pixels = null; active = false; at = 0;
    self.postMessage({ type: 'error', name: error.name, message: error.message });
  }
};
