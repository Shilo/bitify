import { createPaletteGifWriter } from './gif.js';

let writer;
self.onmessage = ({ data }) => {
  try {
    if (data.type === 'start') {
      writer = createPaletteGifWriter(data.options);
      self.postMessage({ ok: true });
    } else if (data.type === 'frame') {
      writer.add(data.indices, data.delay);
      self.postMessage({ ok: true });
    } else if (data.type === 'end') {
      const bytes = writer.end();
      writer = null;
      self.postMessage({ bytes }, [bytes.buffer]);
    } else throw new Error('Unknown GIF export worker request.');
  } catch (error) {
    self.postMessage({ error: error.message || 'GIF export failed.' });
  }
};
