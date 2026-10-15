import { checkCanceled, yieldTask } from './quantize.js';

class PixelLimitError extends Error {}

function nativeSrgb(frame) {
  const space = frame.colorSpace;
  return (frame.format === 'RGBA' || frame.format === 'BGRA') && space?.fullRange === true &&
    space.matrix === 'rgb' && space.primaries === 'bt709' && space.transfer === 'iec61966-2-1';
}

async function swapRedBlue(pixels, signal) {
  for (let start = 0; start < pixels.length;) {
    const deadline = performance.now() + 8;
    do {
      checkCanceled(signal);
      const end = Math.min(start + 131072, pixels.length);
      for (let p = start; p < end; p += 4) {
        const red = pixels[p]; pixels[p] = pixels[p + 2]; pixels[p + 2] = red;
      }
      start = end;
    } while (start < pixels.length && performance.now() < deadline);
    if (start < pixels.length) await yieldTask();
  }
  checkCanceled(signal);
}

// PNG pixels can be copied directly from the browser decoder without canvas
// readback noise or a premultiply/unpremultiply round trip. Other formats keep
// their existing decoder; GIF animation is handled separately by the caller.
export async function decodeImageFile(file, { signal, maxPixels = Infinity,
  limitMessage = 'This image is too large.' } = {}) {
  const dimensions = (width, height) => {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
      throw new Error('Your browser could not read this image.');
    if (width * height > maxPixels) throw new PixelLimitError(limitMessage);
  };
  checkCanceled(signal);
  if ((file.type === 'image/png' || /\.png$/i.test(file.name || '')) && typeof ImageDecoder !== 'undefined') {
    let decoder, frame, closed = false;
    const close = () => { if (decoder && !closed) { closed = true; decoder.close(); } };
    try {
      if (await ImageDecoder.isTypeSupported('image/png')) {
        checkCanceled(signal);
        const data = typeof file.stream === 'function' ? file.stream() : await file.arrayBuffer();
        checkCanceled(signal);
        decoder = new ImageDecoder({ data, type: 'image/png', preferAnimation: false, colorSpaceConversion: 'default' });
        signal?.addEventListener('abort', close, { once: true });
        frame = (await decoder.decode({ frameIndex: 0, completeFramesOnly: true })).image;
        checkCanceled(signal);
        const width = frame.displayWidth, height = frame.displayHeight;
        dimensions(width, height);
        // copyTo copies visible pixels, rather than applying presentation transforms.
        // Let drawImage handle any decoder that exposes a transformed PNG frame.
        if (!frame.rotation && !frame.flip && frame.visibleRect.width === width && frame.visibleRect.height === height) {
          const pixels = new Uint8ClampedArray(width * height * 4);
          const layout = [{ offset: 0, stride: width * 4 }];
          if (nativeSrgb(frame)) {
            // Already-managed packed sRGB needs only channel ordering. Asking for
            // RGBA/sRGB again can round low-alpha RGB on some native decoders.
            const planes = await frame.copyTo(pixels, { layout });
            checkCanceled(signal);
            if (planes?.length !== 1 || planes[0].offset !== 0 || planes[0].stride !== width * 4)
              throw new Error('Unsupported native image layout.');
            if (frame.format === 'BGRA') await swapRedBlue(pixels, signal);
          } else {
            await frame.copyTo(pixels, { format: 'RGBA', colorSpace: 'srgb', layout });
          }
          checkCanceled(signal);
          return new ImageData(pixels, width, height);
        }
      }
    } catch (problem) {
      checkCanceled(signal);
      if (problem instanceof PixelLimitError) throw problem;
      // Unsupported native decoding/copy formats keep the existing browser path.
    } finally {
      signal?.removeEventListener('abort', close);
      frame?.close();
      close();
    }
  }
  checkCanceled(signal);
  const bitmap = await createImageBitmap(file);
  let canvas;
  try {
    checkCanceled(signal);
    dimensions(bitmap.width, bitmap.height);
    canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    if (!context) throw new Error('Your browser could not read this image.');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    checkCanceled(signal);
    return image;
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
