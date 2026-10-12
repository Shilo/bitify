import { validateMatchingMetric, checkCanceled } from './quantize.js';
export { applyCleanup, applyCleanupAsync } from './palette-cleanup-apply.js';

const CHUNK_BYTES = 128 * 1024;
const items = new WeakMap(), queue = [];
let running = false, worker;
const abortError = () => new DOMException('Palette cleanup canceled.', 'AbortError');

function snapshot(item, palette, alphaCut, metric) {
  const frames = (item.frames ?? [item]).map(frame => {
    const original = frame.original, width = original?.width ?? original?.w, height = original?.height ?? original?.h, data = original?.data;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !data || data.length !== width * height * 4) throw new Error('Invalid palette-cleanup source image.');
    return { frame: frame.identity ?? frame, original, data, width, height, delay: frame.delay };
  });
  if (!frames.length) throw new Error('Palette-cleanup animation has no frames.');
  return { colors: [...palette.colors], alphaCut, metric, frames, framesIdentity: item.framesIdentity ?? item.frames, loop: item.loop };
}
function same(a, b) {
  return a.alphaCut === b.alphaCut && a.metric === b.metric && a.framesIdentity === b.framesIdentity && a.loop === b.loop
    && a.colors.length === b.colors.length && a.colors.every((color, i) => color === b.colors[i])
    && a.frames.length === b.frames.length && a.frames.every((f, i) => {
      const g = b.frames[i]; return f.frame === g.frame && f.original === g.original && f.data === g.data && f.width === g.width && f.height === g.height && f.delay === g.delay;
    });
}
function makeWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try { return worker = new Worker(new URL('./palette-cleanup-worker.js', import.meta.url), { type: 'module' }); }
  catch { return null; }
}
function runWorker(job, target) {
  const { signature: asked, controller } = job;
  return new Promise((resolve, reject) => {
    let frame = 0, at = 0, settled = false;
    const clean = () => { target.onmessage = null; target.onerror = null; controller.signal.removeEventListener('abort', cancel); };
    const finish = (error, result) => { if (settled) return; settled = true; clean(); error ? reject(error) : resolve(result); };
    const fail = error => { target.terminate(); worker = null; finish(error); };
    const cancel = () => fail(abortError());
    target.onerror = () => fail(controller.signal.aborted ? abortError() : new Error('Palette cleanup worker failed.'));
    target.onmessage = ({ data }) => {
      try {
        checkCanceled(controller.signal);
        if (data.type === 'error') { const error = new Error(data.message); error.name = data.name || 'Error'; fail(error); return; }
        if (data.type === 'result') { finish(null, data.result); return; }
        if (data.type !== 'next') throw new Error('Invalid palette-cleanup worker response.');
        if (frame >= asked.frames.length) { target.postMessage({ type: 'end' }); return; }
        const source = asked.frames[frame], end = Math.min(at + CHUNK_BYTES, source.data.length);
        // Each acknowledgment permits one fresh slice. Original buffers are never detached.
        const pixels = source.data.slice(at, end), last = end === source.data.length;
        at = last ? 0 : end; if (last) frame++;
        target.postMessage({ type: 'chunk', data: pixels, width: source.width, height: source.height, last }, [pixels.buffer]);
      } catch (error) { fail(error); }
    };
    controller.signal.addEventListener('abort', cancel, { once: true });
    try { target.postMessage({ type: 'start', colors: asked.colors, alphaCut: asked.alphaCut, metric: asked.metric }); }
    catch (error) { fail(error); }
  });
}
async function fallback(job) {
  const { createCleanupAccumulator } = await import('./palette-cleanup.js');
  checkCanceled(job.controller.signal);
  const accumulator = createCleanupAccumulator(job.signature.colors, job.signature.alphaCut, job.signature.metric, { signal: job.controller.signal });
  for (const frame of job.signature.frames) {
    checkCanceled(job.controller.signal);
    await accumulator.addSource({ width: frame.width, height: frame.height, data: frame.data });
  }
  return accumulator.finish();
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
        const result = target ? await runWorker(job, target) : await fallback(job);
        checkCanceled(job.controller.signal);
        job.state.cached = { signature: job.signature, result }; job.resolve(result);
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
    job.promise.then(result => { if (!active) return; leave(); signal?.aborted ? reject(abortError()) : resolve(result); }, error => { if (!active) return; leave(); reject(error); });
    if (signal?.aborted) canceled();
  });
}

// The full-source decision belongs to the item, independently of preview size,
// animation playback and subscribers. sourceItem is an export's captured source
// references; item remains its shared cache identity.
export async function getPaletteCleanup(item, palette, alphaCut, metric, { signal, sourceItem = item } = {}) {
  checkCanceled(signal); validateMatchingMetric(metric);
  if (!Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Opacity cut must be between 1 and 255.');
  const signature = snapshot(sourceItem, palette, alphaCut, metric);
  let state = items.get(item);
  if (!state) { state = { active: new Set(), cached: null }; items.set(item, state); }
  if (state.cached && same(state.cached.signature, signature)) { checkCanceled(signal); return state.cached.result; }
  let job = [...state.active].find(candidate => !candidate.controller.signal.aborted && same(candidate.signature, signature));
  if (!job) {
    job = { signature, state, controller: new AbortController(), consumers: new Set() };
    job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
    job.promise.catch(() => {}); state.active.add(job); queue.push(job);
  }
  const result = subscribe(job, signal); void drain(); return result;
}
