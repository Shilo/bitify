import { mask } from './recolor.js';
import { checkCanceled } from './quantize.js';

// Capture published analysis identities and scalar metadata before any yield.
// Reanalysis replaces those objects; retaining them also reuses their lazy
// Stencil/Icon preparation. No pixel copies or masks are made up front.
export function convertedAnimation(item, asked, { signal } = {}) {
  checkCanceled(signal);
  const frames = item.frames.map(frame => ({ img: frame.img, delay: frame.delay }));
  const style = asked.style, set = Object.freeze({ ...asked.set });
  return {
    name: item.name, w: item.img.w, h: item.img.h, first: asked.first, second: asked.second,
    loop: item.loop, frameCount: frames.length,
    getFrame(index) {
      checkCanceled(signal);
      if (!Number.isInteger(index) || index < 0 || index >= frames.length) throw new Error('Invalid animation frame index.');
      const frame = frames[index], result = { mask: mask(frame.img, style, set), delay: frame.delay };
      checkCanceled(signal);
      return result;
    },
  };
}
