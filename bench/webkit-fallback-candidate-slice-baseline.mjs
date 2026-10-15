// Research candidate: native HTML-image texture copying, not PNG pixel decoding.
import {checkCanceled, yieldTask} from '../src/lib/quantize.js';
const MAX_BYTES = 32 * 1024 * 1024, MAX_PIXELS = 16 * 1024 * 1024;
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
async function read(file, start, length, signal) {
  const bytes = new Uint8Array(await file.slice(start, start + length).arrayBuffer());
  checkCanceled(signal);
  return bytes;
}
function u32(bytes, p = 0) {
  return (bytes[p] * 0x1000000 + (bytes[p + 1] << 16) + (bytes[p + 2] << 8) + bytes[p + 3]);
}
async function eligible(file, signal) {
  if (!Number.isSafeInteger(file.size) || file.size < 45 || file.size > MAX_BYTES) return null;
  const head = await read(file, 0, 33, signal);
  if (head.length !== 33 || signature.some((value, p) => head[p] !== value) || u32(head, 8) !== 13 ||
      String.fromCharCode(...head.subarray(12, 16)) !== 'IHDR' || head[24] !== 8 || head[25] !== 6 ||
      head[26] || head[27] || head[28]) return null;
  const width = u32(head, 16), height = u32(head, 20);
  if (!width || !height || !Number.isSafeInteger(width * height)) return null;
  let at = 33, seenSrgb = false, seenPhys = false, data = false, compressed = 0;
  for (let count = 1; count < 256 && at + 12 <= file.size; count++) {
    const chunk = await read(file, at, 8, signal);
    if (chunk.length !== 8) return null;
    const length = u32(chunk), name = String.fromCharCode(...chunk.subarray(4)), end = at + length + 12;
    if (length > 0x7fffffff || end > file.size) return null;
    if (name === 'IDAT') { data = true; compressed += length; }
    else if (name === 'sRGB' && !data && !seenSrgb && length === 1) {
      const intent = await read(file, at + 8, 1, signal);
      if (intent.length !== 1 || intent[0] > 3) return null;
      seenSrgb = true;
    } else if (name === 'pHYs' && !data && !seenPhys && length === 9) {
      const units = await read(file, at + 16, 1, signal);
      if (units.length !== 1 || units[0] > 1) return null;
      seenPhys = true;
    } else if (name === 'IEND' && !length && data && compressed >= 6 && end === file.size) {
      return {width, height};
    } else return null;
    at = end;
  }
  return null;
}

export async function decodePngWithWebGL(file, {signal, validateDimensions} = {}) {
  checkCanceled(signal);
  const shape = await eligible(file, signal);
  if (!shape) return null;
  validateDimensions?.(shape.width, shape.height);
  if (shape.width * shape.height > MAX_PIXELS) return null;
  await yieldTask();
  checkCanceled(signal);
  let canvas, gl, texture, framebuffer, image, url;
  try {
    canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    gl = canvas.getContext('webgl', {alpha: true, antialias: false, depth: false,
      stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false});
    if (!gl || gl.isContextLost()) return null;
    const maximum = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (!Number.isInteger(maximum) || maximum < shape.width || maximum < shape.height) return null;
    image = new Image(); url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      const cancel = () => done(new DOMException('The image import was canceled.', 'AbortError'));
      const done = failure => {
        image.onload = image.onerror = null;
        signal?.removeEventListener('abort', cancel);
        failure ? reject(failure) : resolve();
      };
      image.onload = () => done(); image.onerror = () => done(new Error('Could not decode PNG image.'));
      signal?.addEventListener('abort', cancel, {once: true});
      if (signal?.aborted) { done(new DOMException('The image import was canceled.', 'AbortError')); return; }
      image.src = url;
    });
    checkCanceled(signal);
    if (image.naturalWidth !== shape.width || image.naturalHeight !== shape.height) return null;
    await yieldTask();
    checkCanceled(signal);
    texture = gl.createTexture(); framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('Could not allocate image texture.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    if ('unpackColorSpace' in gl) {
      gl.unpackColorSpace = 'srgb';
      if (gl.unpackColorSpace !== 'srgb') return null;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR ||
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error('Could not prepare image texture.');
    checkCanceled(signal);
    const pixels = new Uint8ClampedArray(shape.width * shape.height * 4);
    const bytes = new Uint8Array(pixels.buffer), stride = shape.width * 4;
    const rows = Math.max(1, Math.floor(131072 / stride));
    for (let y = 0; y < shape.height;) {
      const deadline = performance.now() + 8;
      do {
        checkCanceled(signal);
        const count = Math.min(rows, shape.height - y);
        gl.readPixels(0, y, shape.width, count, gl.RGBA, gl.UNSIGNED_BYTE,
          bytes.subarray(y * stride, (y + count) * stride));
        if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('Could not read image texture.');
        y += count;
      } while (y < shape.height && performance.now() < deadline);
      if (y < shape.height) await yieldTask();
    }
    checkCanceled(signal);
    return new ImageData(pixels, shape.width, shape.height);
  } finally {
    if (image) { image.onload = image.onerror = null; image.src = ''; }
    if (url) URL.revokeObjectURL(url);
    if (gl) {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (texture) gl.deleteTexture(texture);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    if (canvas) canvas.width = canvas.height = 0;
  }
}
