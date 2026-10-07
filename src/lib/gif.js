// Reading and writing animated GIFs. No DOM, so it runs in tests.
import omggif from 'omggif';

// Decodes a GIF into full-size RGBA frames, each as it appears on screen. GIF frames can be
// partial patches drawn over earlier ones, so they are composited here once.
// Returns { width, height, loop, frames: [{ data, delay }] }: delay is in milliseconds, loop is
// the repeat count (0 = forever, null = the file plays once).
export function decodeGif(bytes) {
  const reader = new omggif.GifReader(bytes), { width, height } = reader;
  const canvas = new Uint8ClampedArray(width * height * 4), frames = [];
  let before = null; // the previous frame, whose "disposal" says how to leave the canvas
  let saved = null;
  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);
    if (before?.disposal === 2) {
      // the previous frame asked for its area to be cleared
      for (let y = before.y; y < before.y + before.height; y++) {
        canvas.fill(0, (y * width + before.x) * 4, (y * width + before.x + before.width) * 4);
      }
    } else if (before?.disposal === 3) {
      canvas.set(saved); // the previous frame asked to be undone
    }
    if (info.disposal === 3) saved = canvas.slice();
    reader.decodeAndBlitFrameRGBA(i, canvas);
    // browsers play frames marked 0 or 1 hundredths of a second at 100ms
    frames.push({ data: canvas.slice(), delay: info.delay > 1 ? info.delay * 10 : 100 });
    before = info;
  }
  return { width, height, loop: reader.loopCount(), frames };
}

// Encodes a two-color animation as a GIF with a transparent background. Each frame's `mask` has
// one byte per pixel: 0 empty, 1 first color, 2 second color (the output of bitify's `mask`),
// which are used directly as palette indexes. Colors are '#rrggbb'.
export function encodeGif({ w, h, frames, first, second, loop }) {
  const color = hex => parseInt(hex.slice(1), 16);
  // room for frames that do not compress at all
  const buffer = new Uint8Array(1024 + frames.length * (w * h * 2 + 1024));
  const writer = new omggif.GifWriter(buffer, w, h, {
    palette: [0x000000, color(first), color(second), 0x000000], // a GIF palette needs 2, 4, 8... entries
    loop: loop ?? undefined,
  });
  for (const { mask, delay } of frames) {
    // disposal 2 clears each frame before the next, so empty pixels never show an older frame
    writer.addFrame(0, 0, w, h, mask, { delay: Math.round(delay / 10), disposal: 2, transparent: 0 });
  }
  return buffer.subarray(0, writer.end());
}
