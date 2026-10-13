import { preparePalette, validateMatchingMetric, checkCanceled } from './quantize.js';

const CHUNK_BYTES = 128 * 1024;
const items = new WeakMap(), queue = [];
let running = false, worker;
const abortError = () => new DOMException('Palette limit canceled.', 'AbortError');

function snapshot(item, palette, alphaCut, metric, maxColors) {
  const frames = (item.frames ?? [item]).map(frame => {
    const original = frame.original, width = original?.width ?? original?.w, height = original?.height ?? original?.h, data = original?.data;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !data || data.length !== width * height * 4) throw new Error('Invalid palette-limit source image.');
    return { frame: frame.identity ?? frame, original, data, width, height, delay: frame.delay, weight: item.frames ? Number.isFinite(frame.delay) && frame.delay > 0 ? frame.delay : 100 : 1 };
  });
  if (!frames.length) throw new Error('Palette-limit animation has no frames.');
  return { colors: [...palette.colors], alphaCut, metric, maxColors, frames, framesIdentity: item.framesIdentity ?? item.frames, loop: item.loop };
}
function same(a, b) {
  return a.alphaCut === b.alphaCut && a.metric === b.metric && a.maxColors === b.maxColors && a.framesIdentity === b.framesIdentity && a.loop === b.loop
    && a.colors.length === b.colors.length && a.colors.every((color, i) => color === b.colors[i])
    && a.frames.length === b.frames.length && a.frames.every((f, i) => {
      const g = b.frames[i]; return f.frame === g.frame && f.original === g.original && f.data === g.data && f.width === g.width && f.height === g.height && f.delay === g.delay;
    });
}
async function* chunks(frames) {
  for (const frame of frames) for (let at = 0; at < frame.data.length; at += CHUNK_BYTES) yield { data: frame.data.subarray(at, Math.min(at + CHUNK_BYTES, frame.data.length)), weight: frame.weight };
}
function makeWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try { return worker = new Worker(new URL('./palette-limit-worker.js', import.meta.url), { type: 'module' }); }
  catch { return null; } // Cooperative fallback where workers are unavailable.
}
function runWorker(job, target) {
  const { signature: asked, controller } = job;
  return new Promise((resolve, reject) => {
    let pass = 0, frame = 0, at = 0;
    const clean = () => { target.onmessage = null; target.onerror = null; controller.signal.removeEventListener('abort', cancel); };
    const finish = (error, result) => { clean(); error ? reject(error) : resolve(result); };
    const cancel = () => {
      // A worker whose module is still loading cannot acknowledge cancellation.
      // Only the last subscriber aborts this controller; release the serial queue
      // immediately rather than waiting for that canceled worker to start.
      target.terminate(); worker = null; finish(abortError());
    };
    target.onerror = () => { target.terminate(); worker = null; finish(controller.signal.aborted ? abortError() : new Error('Palette limit worker failed.')); };
    target.onmessage = ({ data }) => {
      try {
        if (data.type === 'error') { const error = new Error(data.message); error.name = data.name || 'Error'; finish(error); return; }
        if (data.type === 'result') { checkCanceled(controller.signal); finish(null, data.result); return; }
        if (data.type !== 'next') throw new Error('Invalid palette-limit worker response.');
        checkCanceled(controller.signal);
        if (pass !== data.pass) { pass = data.pass; frame = 0; at = 0; }
        while (frame < asked.frames.length && at >= asked.frames[frame].data.length) { frame++; at = 0; }
        if (frame >= asked.frames.length) { target.postMessage({ type: 'endPass' }); return; }
        const source = asked.frames[frame], end = Math.min(at + CHUNK_BYTES, source.data.length);
        // Transfer a NEW slice, never detach or clone an entire source frame.
        const pixels = source.data.slice(at, end); at = end;
        target.postMessage({ type: 'chunk', data: pixels, weight: source.weight }, [pixels.buffer]);
      } catch (error) {
        target.terminate(); worker = null; finish(error);
      }
    };
    controller.signal.addEventListener('abort', cancel, { once: true });
    try { target.postMessage({ type: 'start', colors: asked.colors, alphaCut: asked.alphaCut, metric: asked.metric, maxColors: asked.maxColors }); }
    catch (error) { target.terminate(); worker = null; finish(error); }
  });
}
async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        checkCanceled(job.controller.signal);
        const target = makeWorker();
        const result = target ? await runWorker(job, target) : await (await import('./palette-limit.js')).selectPaletteSubset(job.signature.colors, job.signature.maxColors, () => chunks(job.signature.frames), { alphaCut: job.signature.alphaCut, metric: job.signature.metric, signal: job.controller.signal });
        checkCanceled(job.controller.signal);
        const palette = preparePalette(result.indices.map(i => job.signature.colors[i]));
        job.state.cached = { signature: job.signature, palette }; job.resolve(palette);
      } catch (error) { job.reject(error); }
      finally { job.state.active.delete(job); }
    }
  } finally { running = false; }
}
function subscribe(job, signal) {
  return new Promise((resolve, reject) => {
    let active = true;
    const consumer = {};
    job.consumers.add(consumer);
    const leave = () => { active = false; signal?.removeEventListener('abort', canceled); job.consumers.delete(consumer); };
    const canceled = () => { if (!active) return; leave(); reject(abortError()); if (!job.consumers.size) job.controller.abort(); };
    signal?.addEventListener('abort', canceled, { once: true });
    job.promise.then(palette => { if (!active) return; leave(); signal?.aborted ? reject(abortError()) : resolve(palette); }, error => { if (!active) return; leave(); reject(error); });
    if (signal?.aborted) canceled();
  });
}

export async function getLimitedPalette(item, preparedPalette, alphaCut, metric, maxColors = 0, { signal, sourceItem = item } = {}) {
  checkCanceled(signal);
  if (!Number.isInteger(maxColors) || maxColors < 0 || maxColors > 256) throw new Error('Max colors must be All or between 1 and 256.');
  if (!maxColors || maxColors >= preparedPalette.size) return preparedPalette;
  validateMatchingMetric(metric);
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  const signature = snapshot(sourceItem, preparedPalette, alphaCut, metric, maxColors);
  let state = items.get(item);
  if (!state) { state = { active: new Set(), cached: null }; items.set(item, state); }
  if (state.cached && same(state.cached.signature, signature)) { checkCanceled(signal); return state.cached.palette; }
  let job = [...state.active].find(candidate => !candidate.controller.signal.aborted && same(candidate.signature, signature));
  if (!job) {
    job = { signature, state, controller: new AbortController(), consumers: new Set() };
    job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
    job.promise.catch(() => {}); state.active.add(job); queue.push(job);
  }
  const result = subscribe(job, signal);
  void drain();
  return result;
}
