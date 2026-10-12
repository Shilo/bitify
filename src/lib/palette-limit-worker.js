import { selectPaletteSubset } from './palette-limit.js';

let controller, waiting;
let pass = 0;
async function* readChunks() {
  const currentPass = ++pass;
  for (;;) {
    const chunk = await new Promise((resolve, reject) => {
      waiting = { resolve, reject };
      self.postMessage({ type: 'next', pass: currentPass });
    });
    waiting = null;
    if (!chunk) return;
    yield chunk;
  }
}
self.onmessage = ({ data }) => {
  if (data.type === 'chunk' || data.type === 'endPass') {
    waiting?.resolve(data.type === 'chunk' ? { data: data.data, weight: data.weight } : null);
    return;
  }
  if (data.type === 'cancel') {
    controller?.abort(); waiting?.reject(new DOMException('Palette limit canceled.', 'AbortError')); return;
  }
  if (data.type !== 'start' || controller) { self.postMessage({ type: 'error', message: 'Invalid palette-limit worker request.' }); return; }
  controller = new AbortController(); pass = 0;
  selectPaletteSubset(data.colors, data.maxColors, readChunks, { alphaCut: data.alphaCut, metric: data.metric, signal: controller.signal })
    .then(result => self.postMessage({ type: 'result', result }))
    .catch(error => self.postMessage({ type: 'error', message: error.message, name: error.name }))
    .finally(() => { controller = null; waiting = null; });
};
