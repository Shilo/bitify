import { analyze, unifyAsync } from './recolor.js';
import { validateImportPixels, validateImportSettings } from './image-import-core.js';
import { checkCanceled, yieldTask } from './quantize.js';

function ownSettings({ source = 'luma', alphaCut = 128 } = {}) {
  validateImportSettings(source, alphaCut);
  return { source, alphaCut };
}
export function analysisKey(soft, settings = {}) {
  const { source, alphaCut } = ownSettings(settings);
  return `${source} ${soft ? alphaCut : ''}`;
}
export function analysisMatches(item, settings = {}) {
  const key = analysisKey(item?.img?.soft, settings);
  return !!item?.img && item.by === key;
}
function capture(item, settings) {
  if (analysisMatches(item, settings)) return { item, matching: true };
  if (!item || !item.img) throw new Error('Invalid reanalysis image.');
  const sources = item.frames === undefined ? [item] : item.frames;
  if (!Array.isArray(sources) || !sources.length) throw new Error('A reanalysis image needs frames.');
  const frames = sources.map(frame => {
    const original = frame?.original;
    validateImportPixels(original);
    if (frame.delay !== undefined && (!Number.isFinite(frame.delay) || frame.delay <= 0)) throw new Error('Invalid reanalysis frame delay.');
    return { frame: { ...frame }, pixels: { width: original.width, height: original.height, data: original.data } };
  });
  if (frames.some(frame => frame.pixels.width !== frames[0].pixels.width || frame.pixels.height !== frames[0].pixels.height))
    throw new Error('Reanalysis animation frames must have matching dimensions.');
  return { item: { ...item }, matching: false, frames, animated: item.frames !== undefined, settings };
}
async function prepare(captured, signal) {
  checkCanceled(signal);
  if (captured.matching) return captured.item;
  const { item, settings, animated } = captured, frames = [];
  for (const source of captured.frames) {
    await yieldTask();
    checkCanceled(signal);
    frames.push({ ...source.frame, img: analyze(source.pixels, settings.source, settings.alphaCut) });
    checkCanceled(signal);
  }
  await unifyAsync(frames.map(frame => frame.img), { signal });
  checkCanceled(signal);
  return { ...item, ...frames[0], by: analysisKey(frames[0].img.soft, settings), ...(animated ? { frames } : {}) };
}

// Published sources are immutable. Capture their references and metadata before
// yielding; allocate new analyses and frames, never detach or mutate live pixels.
// The caller owns epochs and atomic publication of the returned wall.
export async function reanalyzeItem(item, settings = {}, { signal } = {}) {
  checkCanceled(signal);
  const captured = capture(item, ownSettings(settings));
  return prepare(captured, signal);
}
export async function reanalyzeItems(items, settings = {}, { signal } = {}) {
  checkCanceled(signal);
  if (!Array.isArray(items)) throw new Error('Invalid reanalysis wall.');
  const asked = ownSettings(settings), captured = items.map(item => capture(item, asked)), result = [];
  for (const item of captured) result.push(await prepare(item, signal));
  checkCanceled(signal);
  return result;
}
