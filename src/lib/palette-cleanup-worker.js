import { createCleanupAccumulator } from './palette-cleanup.js';

let accumulator, pixels, at = 0, active = false;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'start' && !active) {
      active = true; accumulator = createCleanupAccumulator(data.colors, data.alphaCut, data.metric);
      self.postMessage({ type: 'next' }); return;
    }
    if (!active) throw new Error('Invalid palette-cleanup worker request.');
    if (data.type === 'end') {
      if (pixels) throw new Error('Incomplete palette-cleanup source frame.');
      const result = accumulator.finish(); accumulator = null; active = false;
      self.postMessage({ type: 'result', result }, [result.replacements.buffer]); return;
    }
    if (data.type !== 'chunk') throw new Error('Invalid palette-cleanup worker request.');
    if (!pixels) { pixels = new Uint8ClampedArray(data.width * data.height * 4); at = 0; }
    pixels.set(data.data, at); at += data.data.length;
    if (data.last) {
      if (at !== pixels.length) throw new Error('Incomplete palette-cleanup source frame.');
      await accumulator.addSource({ width: data.width, height: data.height, data: pixels });
      pixels = null; at = 0;
    }
    self.postMessage({ type: 'next' });
  } catch (error) {
    accumulator = null; pixels = null; active = false; at = 0;
    self.postMessage({ type: 'error', name: error.name, message: error.message });
  }
};
