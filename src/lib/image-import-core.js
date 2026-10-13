import { analyze, unify } from './recolor.js';
import { checkCanceled, yieldTask } from './quantize.js';

export function validateImportSettings(source = 'luma', alphaCut = 128) {
  if (!['luma', 'value', 'red', 'green', 'blue'].includes(source)
    || !Number.isInteger(alphaCut) || alphaCut < 1 || alphaCut > 255)
    throw new Error('Invalid import analysis settings.');
}

export function validateImportPixels(original) {
  const { width, height, data } = original ?? {};
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1
    || !Number.isSafeInteger(width * height * 4)
    || !(data instanceof Uint8ClampedArray) || data.length !== width * height * 4)
    throw new Error('Invalid imported frame pixels.');
  return width * height;
}

export async function analyzeImportFrames(decoded, source = 'luma', alphaCut = 128,
  { signal, cooperative = true } = {}) {
  validateImportSettings(source, alphaCut);
  checkCanceled(signal);
  if (!Array.isArray(decoded?.frames) || !decoded.frames.length)
    throw new Error('An imported image needs frames.');
  const first = decoded.frames[0].original;
  for (const frame of decoded.frames) {
    checkCanceled(signal);
    validateImportPixels(frame.original);
    if (frame.original.width !== first.width || frame.original.height !== first.height)
      throw new Error('Imported animation frames must have matching dimensions.');
    if (cooperative) { await yieldTask(); checkCanceled(signal); }
    frame.img = analyze(frame.original, source, alphaCut);
  }
  if (cooperative) { await yieldTask(); checkCanceled(signal); }
  unify(decoded.frames.map(frame => frame.img));
  checkCanceled(signal);
  return { ...decoded, analysisSource: source, analysisCut: alphaCut };
}

export function importFrameMessage(frame, index) {
  const { data, ...analysis } = frame.img;
  return { type: 'frame', index, width: frame.original.width, height: frame.original.height,
    pixels: data, analysis, delay: frame.delay };
}

export function importFrameTransfers(message) {
  return [message.pixels.buffer, message.analysis.lum.buffer, message.analysis.right.buffer,
    message.analysis.down.buffer, message.analysis.hist.buffer, message.analysis.edges.buffer];
}

export function validateImportFrame(message, index, width, height) {
  const { pixels, analysis, delay } = message ?? {};
  if (message?.type !== 'frame' || message.index !== index || message.width !== width || message.height !== height)
    throw new Error('Invalid imported frame sequence or dimensions.');
  const length = validateImportPixels({ width, height, data: pixels });
  if (!analysis || analysis.w !== width || analysis.h !== height
    || ['lum', 'right', 'down'].some(key => !(analysis[key] instanceof Uint8Array) || analysis[key].length !== length)
    || ['hist', 'edges'].some(key => !(analysis[key] instanceof Uint32Array) || analysis[key].length !== 256)
    || ['hasAlpha', 'soft'].some(key => typeof analysis[key] !== 'boolean')
    || ['cut', 'lo', 'hi', 'auto', 'autoLine', 'autoTone', 'autoSeam'].some(key => !Number.isInteger(analysis[key]) || analysis[key] < 0 || analysis[key] > 255)
    || analysis.cut < 1 || delay !== undefined && (!Number.isFinite(delay) || delay <= 0))
    throw new Error('Invalid imported frame analysis.');
  return { pixels, analysis, delay };
}
