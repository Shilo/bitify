// Research candidate: native HTML-image texture copying, not PNG pixel decoding.
import {checkCanceled, yieldTask} from '../src/lib/quantize.js';
import {pngCandidateShape} from './webkit-fallback-candidate-stream-reader.mjs';
const MAX_PIXELS = 16 * 1024 * 1024;

export async function decodePngWithWebGL(file, {signal, validateDimensions} = {}) {
  checkCanceled(signal);
  const shape = await pngCandidateShape(file, signal);
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
