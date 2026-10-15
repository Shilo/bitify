import { normalizeDither, normalizeDitherStrength } from './palette-dither-settings.js';
import { normalizeAlphaMode, paletteAlpha } from './palette-alpha.js';
// Shared preview storage only. Reserve the entire animation before lazy filling:
// a small per-frame LRU would miss every frame during a cyclic animation scan.
export const ANIMATION_CACHE_BYTES = 8 * 1024 * 1024;
const aborted = () => new DOMException('The preview was canceled.', 'AbortError');

export function createAnimationCache(budget = ANIMATION_CACHE_BYTES) {
  const entries = new Set();
  let reserved = 0;
  function same(a, b) {
    return a.width === b.width && a.height === b.height && a.colors === b.colors
      && a.alphaCut === b.alphaCut && a.alphaMode === b.alphaMode && a.metric === b.metric && a.cleanup === b.cleanup
      && a.dither === b.dither && a.ditherStrength === b.ditherStrength
      && a.sources.length === b.sources.length && a.sources.every((f, i) => {
        const g = b.sources[i];
        return f.data === g.data && f.width === g.width && f.height === g.height;
      });
  }
  function drop(entry) {
    if (!entries.delete(entry)) return;
    reserved -= entry.bytes;
    for (const job of entry.pending.values()) job.controller.abort();
    entry.pending.clear(); entry.frames.length = 0;
  }
  return {
    acquire({ sources, palette, alphaCut, alphaMode = 'cut', metric, cleanup = null, dither = 'none', ditherStrength = 50, width, height }) {
      // Stills and oversized previews incur no cache allocation or eviction.
      if (!sources || sources.length < 2) return null;
      alphaMode = normalizeAlphaMode(alphaMode);
      const bytes = sources.length * (width * height * (alphaMode === 'keep' ? 3 : 2) + 256);
      if (![width, height, bytes].every(Number.isSafeInteger) || width < 1 || height < 1 || bytes > budget) return null;
      const key = { sources: sources.map(f => ({ data: f.data, width: f.width, height: f.height })),
        colors: palette.colors.join(','), alphaCut, alphaMode, metric, cleanup, dither: normalizeDither(dither), ditherStrength: normalizeDitherStrength(ditherStrength), width, height };
      let entry = [...entries].find(e => same(e.key, key));
      if (!entry) {
        if (reserved + bytes > budget) return null;
        entry = { key, bytes, refs: 0, frames: [], pending: new Map() };
        entries.add(entry); reserved += bytes;
      }
      entry.refs++;
      let released = false;
      return {
        getFrame(index, produce, { signal } = {}) {
          if (released || signal?.aborted) return Promise.reject(aborted());
          if (!Number.isInteger(index) || index < 0 || index >= key.sources.length) return Promise.reject(new Error('Invalid animation frame.'));
          if (entry.frames[index]) return Promise.resolve(entry.frames[index]);
          let job = entry.pending.get(index);
          if (!job) {
            job = { controller: new AbortController(), consumers: new Set() };
            entry.pending.set(index, job);
            job.promise = Promise.resolve().then(() => produce(job.controller.signal)).then(result => {
              if (job.controller.signal.aborted || !entries.has(entry)) throw aborted();
              if (!(result.indices instanceof Uint16Array) || result.indices.length !== width * height
                || result.w !== width || result.h !== height || !(result.used instanceof Uint8Array) || result.used.length !== 256) {
                throw new Error('Invalid cached animation preview.');
              }
              const alpha = paletteAlpha(result);
              if (key.alphaMode === 'keep' ? !alpha : alpha) throw new Error('Invalid cached animation alpha policy.');
              entry.frames[index] = result;
              return result;
            }).finally(() => { if (entry.pending.get(index) === job) entry.pending.delete(index); });
          }
          return new Promise((resolve, reject) => {
            const consumer = {};
            job.consumers.add(consumer);
            const finish = () => { signal?.removeEventListener('abort', cancel); job.consumers.delete(consumer); };
            const cancel = () => {
              finish(); reject(aborted());
              if (!job.consumers.size) {
                if (entry.pending.get(index) === job) entry.pending.delete(index);
                job.controller.abort();
              }
            };
            signal?.addEventListener('abort', cancel, { once: true });
            job.promise.then(value => { finish(); if (signal?.aborted || released) reject(aborted()); else resolve(value); }, error => { finish(); reject(error); });
          });
        },
        release() { if (!released) { released = true; if (!--entry.refs) drop(entry); } },
      };
    },
    stats() { return { bytes: reserved, clips: entries.size }; },
  };
}

export const animationPreviewCache = createAnimationCache();
