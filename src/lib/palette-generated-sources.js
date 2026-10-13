// Lightweight synchronous capture. Decoded source bytes are immutable in the
// app; retain their references without copying the wall or freezing typed data.
const identities = new WeakMap();
const snapshots = new WeakSet();
let nextIdentity = 0;
function identity(value) {
  if (!identities.has(value)) identities.set(value, ++nextIdentity);
  return identities.get(value);
}
export function captureGeneratedSources(items, alphaCut = 128) {
  if (!Array.isArray(items) || !Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255) throw new Error('Invalid generated palette sources or opacity cut.');
  const assets = items.map(item => {
    const sources = item.frames ?? [item];
    if (!Array.isArray(sources) || !sources.length) throw new Error('Generated palette animation has no frames.');
    const frames = sources.map(frame => {
      const source = frame.original, width = source?.width ?? source?.w, height = source?.height ?? source?.h, data = source?.data;
      if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !Number.isSafeInteger(width * height * 4) || !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || data.length !== width * height * 4) throw new Error('Invalid generated palette image dimensions or pixel data.');
      const delay = item.frames ? Number.isFinite(frame.delay) && frame.delay > 0 ? frame.delay : 100 : 1;
      return Object.freeze({ original: source, data, width, height, delay, revision: frame.sourceRevision ?? item.sourceRevision ?? 0 });
    });
    if (frames.some(frame => frame.width !== frames[0].width || frame.height !== frames[0].height)) throw new Error('Generated palette animation frames must have matching dimensions.');
    const key = JSON.stringify(frames.map(frame => [identity(frame.original), identity(frame.data), frame.width, frame.height, frame.delay, frame.revision]));
    return Object.freeze({ frames: Object.freeze(frames), key });
  }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const snapshot = Object.freeze({ assets: Object.freeze(assets), alphaCut, key: JSON.stringify([1, alphaCut, assets.map(asset => asset.key)]) });
  snapshots.add(snapshot); return snapshot;
}
export function validateGeneratedSources(snapshot) {
  if (!snapshots.has(snapshot)) throw new Error('Capture generated palette sources before requesting colors.');
}
