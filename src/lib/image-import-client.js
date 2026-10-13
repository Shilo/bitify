import { decodeImageFile } from './image-decode.js';
import { checkCanceled } from './quantize.js';
import { analyzeImportFrames, validateImportSettings, validateImportPixels, validateImportFrame } from './image-import-core.js';

const queue = [], owned = new WeakMap();
let worker, running = false;
const abortError = () => new DOMException('The image import was canceled.', 'AbortError');
function makeWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try { return worker = new Worker(new URL('./image-import-worker.js', import.meta.url), { type: 'module' }); }
  catch { return null; }
}
function framesPayload(decoded) {
  return decoded.frames.map(frame => {
    validateImportPixels(frame.original);
    return { original: { width: frame.original.width, height: frame.original.height,
      data: frame.original.data }, delay: frame.delay };
  });
}
function runWorker(job, target) {
  return new Promise((resolve, reject) => {
    let meta, frames = [], settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true;
      target.onmessage = target.onerror = null;
      job.controller.signal.removeEventListener('abort', cancel);
      if (error) frames.length = 0;
      error ? reject(error) : resolve(result);
    };
    const fail = error => { target.terminate(); if (worker === target) worker = null; finish(error); };
    const cancel = () => fail(abortError());
    target.onerror = () => fail(new Error('Image import worker failed.'));
    target.onmessage = ({ data }) => {
      try {
        checkCanceled(job.controller.signal);
        if (data.type === 'error') throw new Error(data.message || 'Image import worker failed.');
        if (data.type === 'ready') {
          if (meta || !Number.isSafeInteger(data.count) || data.count < 1
            || data.count > (job.input?.frames.length ?? Math.max(1, job.file.size))
            || !Number.isSafeInteger(data.width) || data.width < 1 || !Number.isSafeInteger(data.height) || data.height < 1
            || !Number.isSafeInteger(data.width * data.height * 4)
            || data.loop !== undefined && data.loop !== null && (!Number.isInteger(data.loop) || data.loop < 0 || data.loop > 65535))
            throw new Error('Invalid imported image metadata.');
          if (job.expected && (data.count !== job.expected.count || data.width !== job.expected.width
            || data.height !== job.expected.height || data.loop !== job.expected.loop))
            throw new Error('Imported image metadata changed.');
          meta = data;
          target.postMessage({ type: 'next', index: 0 });
          return;
        }
        if (data.type === 'frame') {
          if (!meta || frames.length >= meta.count) throw new Error('Unexpected imported frame.');
          const frame = validateImportFrame(data, frames.length, meta.width, meta.height);
          if (frame.analysis.cut !== job.alphaCut) throw new Error('Imported analysis settings changed.');
          const original = new ImageData(frame.pixels, meta.width, meta.height);
          frames.push({ original, img: { ...frame.analysis, data: original.data }, delay: frame.delay });
          target.postMessage({ type: 'next', index: frames.length });
          return;
        }
        if (data.type !== 'done' || !meta || frames.length !== meta.count) throw new Error('Incomplete imported image.');
        finish(null, { frames, loop: meta.loop, analysisSource: job.source, analysisCut: job.alphaCut });
      } catch (error) { fail(error); }
    };
    job.controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      checkCanceled(job.controller.signal);
      const data = { type: 'start', source: job.source, alphaCut: job.alphaCut };
      if (!job.input) target.postMessage({ ...data, mode: 'gif', file: job.file });
      else {
        const frames = framesPayload(job.input);
        job.expected = { count: frames.length, width: frames[0].original.width,
          height: frames[0].original.height, loop: job.input.loop };
        const buffers = frames.map(frame => frame.original.data.buffer);
        if (new Set(buffers).size !== buffers.length) throw new Error('Imported source frames must own their pixels.');
        target.postMessage({ ...data, mode: 'frames', frames, loop: job.input.loop }, buffers);
        job.input = null; // Only unpublished import pixels are transferred. Retain the File for recovery.
      }
    } catch (error) { fail(error); }
  });
}
async function browserDecode(file, signal) {
  if (file.type === 'image/gif') {
    try {
      const { decodeGifAsync } = await import('./gif.js');
      checkCanceled(signal);
      const gif = await decodeGifAsync(new Uint8Array(await file.arrayBuffer()), { signal });
      if (gif.frames.length > 1) return { frames: gif.frames.map(frame => ({
        original: new ImageData(frame.data, gif.width, gif.height), delay: frame.delay })), loop: gif.loop };
    } catch { checkCanceled(signal); } // Keep existing browser fallback for unreadable/single-frame GIFs.
  }
  return { frames: [{ original: await decodeImageFile(file, { signal }) }] };
}
async function fallback(job) {
  checkCanceled(job.controller.signal);
  const decoded = job.input?.frames.every(frame => frame.original.data.length === frame.original.width * frame.original.height * 4)
    ? job.input : await browserDecode(job.file, job.controller.signal);
  return analyzeImportFrames(decoded, job.source, job.alphaCut, { signal: job.controller.signal });
}
async function drain() {
  if (running) return; running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        checkCanceled(job.controller.signal);
        const target = makeWorker();
        let result;
        if (target) {
          try { result = await runWorker(job, target); }
          catch {
            checkCanceled(job.controller.signal);
            job.input = null; // Recover from the immutable File, including invalid/aliased or partially transferred inputs.
            result = await fallback(job);
          }
        } else result = await fallback(job);
        checkCanceled(job.controller.signal);
        owned.set(result, job.file);
        job.resolve(result);
      } catch (error) { job.reject(error); }
      finally { job.removeAbort?.(); job.file = job.input = job.expected = null; }
    }
  } finally { running = false; }
}
function enqueue(file, input, source, alphaCut, signal) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  const job = { file, input, source, alphaCut, controller: new AbortController() };
  const result = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
  const cancel = () => {
    job.controller.abort();
    const index = queue.indexOf(job);
    if (index >= 0) {
      queue.splice(index, 1); job.file = job.input = null;
      job.removeAbort?.(); job.reject(abortError());
    }
  };
  signal?.addEventListener('abort', cancel, { once: true });
  job.removeAbort = () => signal?.removeEventListener('abort', cancel);
  queue.push(job); void drain();
  return result;
}

export async function decodeImportedFile(file, { source = 'luma', alphaCut = 128, signal } = {}) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  const input = file.type === 'image/gif' ? null
    : { frames: [{ original: await decodeImageFile(file, { signal }) }] };
  return enqueue(file, input, source, alphaCut, signal);
}

// Reanalysis is allowed only before publication. Never transfer live wall buffers.
export function reanalyzeImported(decoded, { source = 'luma', alphaCut = 128, signal } = {}) {
  validateImportSettings(source, alphaCut); checkCanceled(signal);
  if (!owned.has(decoded)) throw new Error('Only unpublished imports can be prepared.');
  const file = owned.get(decoded); owned.delete(decoded);
  for (const frame of decoded.frames) delete frame.img; // Unpublished analysis is obsolete; keep only recoverable originals.
  return enqueue(file, decoded, source, alphaCut, signal);
}
export function takeImportedFrames(decoded) {
  if (!owned.has(decoded)) throw new Error('Only unpublished imports can be published.');
  owned.delete(decoded);
  return decoded;
}
