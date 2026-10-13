import { createGeneratedAccumulator } from './palette-generated.js';

let accumulator, inAsset = false;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'start' && !accumulator) { accumulator = createGeneratedAccumulator(data.alphaCut); self.postMessage({ type: 'next' }); return; }
    if (!accumulator) throw new Error('Invalid generated palette worker request.');
    if (data.type === 'end' && !inAsset) {
      const result = await accumulator.finish(); accumulator = null;
      self.postMessage({ type: 'result', result }); return;
    }
    if (data.type !== 'chunk') throw new Error('Invalid generated palette worker request.');
    if (!inAsset) { accumulator.beginAsset(); inAsset = true; }
    await accumulator.addChunk(data.pixels, data.weight);
    if (data.lastAsset) { await accumulator.endAsset(); inAsset = false; }
    self.postMessage({ type: 'next' });
  } catch (error) {
    accumulator = null; inAsset = false;
    self.postMessage({ type: 'error', name: error.name, message: error.message });
  }
};
