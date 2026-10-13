import { checkCanceled } from './quantize.js';
import { validateGeneratedSources } from './palette-generated-sources.js';
import { GENERATED_MAX_COLORS } from './palette-library.js';

const CHUNK_BYTES = 128 * 1024, pending = new Map(), completed = new Map(), queue = [];
const EMPTY = Object.freeze({ colors: Object.freeze([]), binned: false, assets: 0 });
let running = false, worker;
const abortError = () => new DOMException('Generated palette canceled.', 'AbortError');
function makeWorker() {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try { return worker = new Worker(new URL('./palette-generated-worker.js', import.meta.url), { type: 'module' }); }
  catch { return null; }
}
function runWorker(job, target) {
  return new Promise((resolve, reject) => {
    let asset = 0, frame = 0, at = 0, settled = false;
    const clean = () => { target.onmessage = target.onerror = null; job.controller.signal.removeEventListener('abort', cancel); };
    const finish = (error, result) => { if (settled) return; settled = true; clean(); error ? reject(error) : resolve(result); };
    const fail = error => { target.terminate(); worker = null; finish(error); };
    const cancel = () => fail(abortError());
    target.onerror = () => fail(job.controller.signal.aborted ? abortError() : new Error('Generated palette worker failed.'));
    target.onmessage = ({ data }) => {
      try {
        checkCanceled(job.controller.signal);
        if (data.type === 'error') { const error = new Error(data.message); error.name = data.name || 'Error'; fail(error); return; }
        if (data.type === 'result') { finish(null, freezeResult(data.result)); return; }
        if (data.type !== 'next') throw new Error('Invalid generated palette worker response.');
        if (asset >= job.snapshot.assets.length) { target.postMessage({ type: 'end' }); return; }
        const source = job.snapshot.assets[asset].frames[frame], end = Math.min(at + CHUNK_BYTES, source.data.length);
        const pixels = source.data.slice(at, end), lastFrame = end === source.data.length, lastAsset = lastFrame && frame === job.snapshot.assets[asset].frames.length - 1;
        at = lastFrame ? 0 : end;
        if (lastAsset) { asset++; frame = 0; } else if (lastFrame) frame++;
        target.postMessage({ type: 'chunk', pixels, weight: source.delay, lastAsset }, [pixels.buffer]);
      } catch (error) { fail(error); }
    };
    job.controller.signal.addEventListener('abort', cancel, { once: true });
    try { target.postMessage({ type: 'start', alphaCut: job.snapshot.alphaCut }); } catch (error) { fail(error); }
  });
}
function freezeResult(result) {
  if (!result || !Array.isArray(result.colors) || result.colors.length > GENERATED_MAX_COLORS || result.colors.some(color => !/^#[\da-f]{6}$/.test(color)) || new Set(result.colors).size !== result.colors.length || typeof result.binned !== 'boolean' || !Number.isSafeInteger(result.assets) || result.assets < 0 || (result.cost !== undefined && (!Number.isFinite(result.cost) || result.cost < 0)) || (result.initialCost !== undefined && (!Number.isFinite(result.initialCost) || result.initialCost < 0))) throw new Error('Invalid generated palette result.');
  return Object.freeze({ ...result, colors: Object.freeze([...result.colors]) });
}
async function drain() {
  if (running) return; running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        checkCanceled(job.controller.signal);
        const target = makeWorker();
        const result = freezeResult(target ? await runWorker(job, target) : await (await import('./palette-generated.js')).generatePaletteAsync(job.snapshot, { signal: job.controller.signal }));
        checkCanceled(job.controller.signal);
        // Completed cache contains IDs/colors, never old wall/source references.
        completed.delete(job.snapshot.key); completed.set(job.snapshot.key, result);
        while (completed.size > 2) completed.delete(completed.keys().next().value);
        job.resolve(result);
      } catch (error) { job.reject(error); }
      finally { if (pending.get(job.snapshot.key) === job) pending.delete(job.snapshot.key); }
    }
  } finally { running = false; }
}
function subscribe(job, signal) {
  return new Promise((resolve, reject) => {
    const consumer = {}; let active = true; job.consumers.add(consumer);
    const leave = () => { active = false; signal?.removeEventListener('abort', cancel); job.consumers.delete(consumer); };
    const cancel = () => {
      if (!active) return; leave(); reject(abortError());
      if (!job.consumers.size) {
        job.controller.abort();
        const index = queue.indexOf(job);
        if (index >= 0) { queue.splice(index, 1); if (pending.get(job.snapshot.key) === job) pending.delete(job.snapshot.key); job.reject(abortError()); }
      }
    };
    signal?.addEventListener('abort', cancel, { once: true });
    job.promise.then(value => { if (!active) return; leave(); signal?.aborted ? reject(abortError()) : resolve(value); }, error => { if (!active) return; leave(); reject(error); });
    if (signal?.aborted) cancel();
  });
}
export async function getGeneratedPalette(snapshot, { signal } = {}) {
  validateGeneratedSources(snapshot); checkCanceled(signal);
  if (!snapshot.assets.length) return EMPTY;
  const cached = completed.get(snapshot.key); if (cached) { completed.delete(snapshot.key); completed.set(snapshot.key, cached); return cached; }
  let job = pending.get(snapshot.key);
  if (!job || job.controller.signal.aborted) {
    job = { snapshot, controller: new AbortController(), consumers: new Set() };
    job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
    job.promise.catch(() => {}); pending.set(snapshot.key, job); queue.push(job);
  }
  const result = subscribe(job, signal); void drain(); return result;
}
