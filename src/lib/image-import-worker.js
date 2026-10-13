import { analyzeImportFrames, importFrameMessage, importFrameTransfers } from './image-import-core.js';

let state, preparing = false;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'start') {
      if (state || preparing) throw new Error('An import is already running.');
      preparing = true;
      let decoded;
      if (data.mode === 'gif') {
        const { decodeGif } = await import('./gif.js');
        const gif = decodeGif(new Uint8Array(await data.file.arrayBuffer()));
        if (gif.frames.length < 2) throw new Error('Use browser decoding for a single-frame GIF.');
        decoded = { frames: gif.frames.map(frame => ({ original: { width: gif.width,
          height: gif.height, data: frame.data }, delay: frame.delay })), loop: gif.loop };
      } else if (data.mode === 'frames') decoded = { frames: data.frames, loop: data.loop };
      else throw new Error('Invalid import operation.');
      state = { decoded: await analyzeImportFrames(decoded, data.source, data.alphaCut, { cooperative: false }), index: 0 };
      preparing = false;
      const first = state.decoded.frames[0].original;
      self.postMessage({ type: 'ready', count: state.decoded.frames.length,
        width: first.width, height: first.height, loop: state.decoded.loop });
      return;
    }
    if (data.type !== 'next' || !state || data.index !== state.index)
      throw new Error('Invalid import acknowledgment.');
    if (state.index === state.decoded.frames.length) {
      state = null;
      self.postMessage({ type: 'done' });
      return;
    }
    const index = state.index++, frame = state.decoded.frames[index];
    const message = importFrameMessage(frame, index);
    state.decoded.frames[index] = null; // Transfer ownership; never retain streamed source frames.
    self.postMessage(message, importFrameTransfers(message));
  } catch (error) {
    state = null; preparing = false;
    self.postMessage({ type: 'error', name: error.name, message: error.message });
  }
};
