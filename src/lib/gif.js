// Reading and writing animated GIFs. No DOM, so it runs in tests.
import omggif from 'omggif';
import { exportPalette, markUsedAsync, compactTable, EMPTY_INDEX, yieldExport } from './palette-export.js';
import { checkCanceled, yieldTask } from './quantize.js';

// Decodes a GIF into full-size RGBA frames, each as it appears on screen. GIF frames can be
// partial patches drawn over earlier ones, so they are composited here once.
// Returns { width, height, loop, frames: [{ data, delay }] }: delay is in milliseconds, loop is
// the repeat count (0 = forever, null = the file plays once).
function* decodeGifSteps(bytes) {
  const reader = new omggif.GifReader(bytes), { width, height } = reader;
  const canvas = new Uint8ClampedArray(width * height * 4), frames = [];
  let before = null; // the previous frame, whose "disposal" says how to leave the canvas
  let saved = null;
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);
    if (before?.disposal === 2) {
      // the previous frame asked for its area to be cleared
      for (let y = before.y; y < before.y + before.height; y++) {
        canvas.fill(0, (y * width + before.x) * 4, (y * width + before.x + before.width) * 4);
      }
    } else if (before?.disposal === 3) {
      canvas.set(saved); // the previous frame asked to be undone
    }
    if (info.disposal === 3) saved = canvas.slice();
    reader.decodeAndBlitFrameRGBA(i, canvas);
    // browsers play frames marked 0 or 1 hundredths of a second at 100ms
    frames.push({ data: canvas.slice(), delay: info.delay > 1 ? info.delay * 10 : 100 });
    before = info;
    yield;
  }
  return { width, height, loop: reader.loopCount(), frames };
}

export function decodeGif(bytes) {
  const steps = decodeGifSteps(bytes);
  let next;
  do { next = steps.next(); } while (!next.done);
  return next.value;
}

// Workers use the exact synchronous decoder above. Its browser fallback gives
// input/rendering a turn before decoding and between bounded groups of frames.
// A single large LZW frame is still synchronous when workers are unavailable.
export async function decodeGifAsync(bytes, { signal } = {}) {
  checkCanceled(signal);
  await yieldTask();
  checkCanceled(signal);
  const steps = decodeGifSteps(bytes);
  let deadline = performance.now() + 8;
  while (true) {
    checkCanceled(signal);
    const next = steps.next();
    if (next.done) return next.value;
    if (performance.now() >= deadline) {
      await yieldTask();
      checkCanceled(signal);
      deadline = performance.now() + 8;
    }
  }
}

// Encodes a two-color animation as a GIF with a transparent background. Each frame's `mask` has
// one byte per pixel: 0 empty, 1 first color, 2 second color (the output of bitify's `mask`),
// which are used directly as palette indexes. Colors are '#rrggbb', or null for a color that is
// None. A GIF frame has one see-through index, 0, so that color's pixels are written as 0 too.
export function encodeGif(image) {
  if (image.colors) return encodePaletteGif(image);
  const { w, h, frames, first, second, loop } = image;
  const color = hex => (hex ? parseInt(hex.slice(1), 16) : 0);
  const gone = first ? (second ? 0 : 2) : 1; // the index of the color that is None, or 0
  // room for frames that do not compress at all
  const buffer = new Uint8Array(1024 + frames.length * (w * h * 2 + 1024));
  const writer = new omggif.GifWriter(buffer, w, h, {
    palette: [0x000000, color(first), color(second), 0x000000], // a GIF palette needs 2, 4, 8... entries
    loop: loop ?? undefined,
  });
  for (const { mask, delay } of frames) {
    // disposal 2 clears each frame before the next, so empty pixels never show an older frame
    writer.addFrame(0, 0, w, h, gone ? mask.map(v => (v === gone ? 0 : v)) : mask, { delay: Math.round(delay / 10), disposal: 2, transparent: 0 });
  }
  return buffer.subarray(0, writer.end());
}

// A replayable async getFrame(index) keeps only one converted Uint16 frame in
// memory. The first pass finds the stable global table; the second encodes.
// Callers snapshot the palette, source frames and conversion at the save click.
export async function encodePaletteGif(image) {
  const state = exportPalette(image);
  const { w, h, loop } = image;
  if (w > 65535 || h > 65535) throw new Error('GIF dimensions cannot exceed 65535 pixels.');
  if (loop != null && (!Number.isInteger(loop) || loop < 0 || loop > 65535)) throw new Error('Invalid GIF loop count.');
  const count = image.getFrame ? image.frameCount : image.frames?.length;
  if (!Number.isInteger(count) || count < 1) throw new Error('A GIF needs at least one frame.');
  const getFrame = image.getFrame ?? (i => image.frames[i]);
  const delays = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const frame = await getFrame(i);
    if (!frame || !Number.isFinite(frame.delay) || frame.delay < 0 || frame.delay > 655350) throw new Error('Invalid GIF frame delay.');
    await markUsedAsync(frame.indices, state);
    delays[i] = frame.delay;
    if (i + 1 < count) await yieldExport();
  }
  const { table, map, transparent } = compactTable(state);
  if (table.length > 256) {
    const error = new Error('This animation needs 256 colors plus transparency. This GIF exporter supports 255 colors with transparency.');
    error.code = 'PALETTE_GIF_LIMIT';
    error.colors = table.length - 1;
    error.transparent = true;
    throw error;
  }
  let padded = 2;
  while (padded < table.length) padded *= 2;
  while (table.length < padded) table.push(0);
  const options = { w, h, table, transparent, loop };
  const writer = typeof Worker === 'undefined' ? createPaletteGifWriter(options) : await paletteGifWorker(options);
  try {
    for (let i = 0; i < count; i++) {
      const frame = await getFrame(i);
      if (!frame || frame.delay !== delays[i]) throw new Error('The animation changed while it was being exported.');
      // Validate again: a broken/replaced frame source must never silently map
      // an unexpected color to slot zero.
      if (!(frame.indices instanceof Uint16Array) || frame.indices.length !== state.pixels) throw new Error('Invalid palette image indices.');
      const indexed = new Uint8Array(state.pixels), batch = 262144;
      for (let start = 0; start < indexed.length; start += batch) {
        for (let p = start, end = Math.min(indexed.length, start + batch); p < end; p++) {
          const index = frame.indices[p];
          if (index > EMPTY_INDEX || !state.used[index]) throw new Error('The animation changed while it was being exported.');
          indexed[p] = map[index];
        }
        if (start + batch < indexed.length) await yieldExport();
      }
      // Ack/backpressure: do not convert the next frame until this one has
      // compressed. Only the newly made Uint8 array is transferred.
      await writer.add(indexed, frame.delay);
      if (i + 1 < count) await yieldExport();
    }
    return await writer.end();
  } finally {
    writer.close();
  }
}

// Also used inside the module worker and by DOM-free tests / browsers without
// Worker. An available worker that fails is reported, never retried silently.
export function createPaletteGifWriter({ w, h, table, transparent, loop }) {
  let buffer = new Uint8Array(1024);
  const writer = new omggif.GifWriter(buffer, w, h, { palette: table, loop: loop ?? undefined });
  return {
    add(indexed, delay) {
      // Reserve only the next frame's maximum LZW output, growing as needed.
      const need = writer.getOutputBufferPosition() + w * h * 2 + 1024;
      if (need > buffer.length) {
        const grown = new Uint8Array(Math.max(need, buffer.length * 2));
        grown.set(buffer.subarray(0, writer.getOutputBufferPosition()));
        buffer = grown;
        writer.setOutputBuffer(buffer);
      }
      writer.addFrame(0, 0, w, h, indexed, {
        delay: Math.round(delay / 10), disposal: 2,
        ...(transparent === null ? {} : { transparent }),
      });
    },
    end: () => buffer.slice(0, writer.end()),
    close() {},
  };
}

async function paletteGifWorker(options) {
  const worker = new Worker(new URL('./palette-gif-worker.js', import.meta.url), { type: 'module' });
  let pending = null, failure = null;
  const fail = error => {
    failure = error;
    pending?.reject(error);
    pending = null;
  };
  worker.onmessage = ({ data }) => {
    if (data.error) { fail(new Error(data.error)); return; }
    pending?.resolve(data.bytes);
    pending = null;
  };
  worker.onerror = event => fail(new Error(event.message || 'GIF export worker failed.'));
  worker.onmessageerror = () => fail(new Error('GIF export worker returned unreadable data.'));
  const request = (message, transfer = []) => new Promise((resolve, reject) => {
    if (failure) { reject(failure); return; }
    pending = { resolve, reject };
    try { worker.postMessage(message, transfer); } catch (error) { fail(error); }
  });
  try {
    await request({ type: 'start', options });
    return {
      add: (indices, delay) => request({ type: 'frame', indices, delay }, [indices.buffer]),
      end: () => request({ type: 'end' }),
      close: () => worker.terminate(),
    };
  } catch (error) {
    worker.terminate();
    throw error;
  }
}
