import { fullPaletteImage } from './palette-state.js';
import { checkCanceled, yieldTask } from './quantize.js';

// Explicit full-source inspection. Keep only at most 256 colors, never a second
// converted clip. Use the export pipeline so subset/Cleanup/dither decisions match.
export async function collectPaletteUsage(item, snapshot, { signal } = {}) {
  checkCanceled(signal);
  if (snapshot.family !== 'full-palette') throw new Error('Choose Palette mode to inspect output colors.');
  const image = await fullPaletteImage(item, snapshot, { signal });
  const used = new Uint8Array(256);
  const add = frame => {
    for (let i = 0; i < image.colors.length; i++) used[i] |= frame.used[i];
  };
  if (image.getFrame) {
    for (let i = 0; i < image.frameCount; i++) {
      checkCanceled(signal);
      add(await image.getFrame(i));
      if (i + 1 < image.frameCount) await yieldTask();
    }
  } else add(image);
  checkCanceled(signal);
  const colors = Object.freeze(image.colors.filter((_, i) => used[i]));
  return Object.freeze({ colors, count: colors.length, frames: image.frameCount ?? 1 });
}
