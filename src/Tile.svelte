<script>
  import { mask, colorize, shrink, spritesOf, iconOf } from './lib/bitify.js';
  import { shown } from './lib/layout.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';

  // `flipped` true means the wall is showing originals. Holding the tile shows the other version.
  // Without `onremove` the tile is a preview only and has no buttons.
  // `set` is the style's settings. `budget` is set while one of their sliders is being dragged:
  // the milliseconds this tile may take to convert its image after each move.
  let { item, first, second, style, set, flipped, budget = 0, inset = 8, onshare, oncopy, onsave, onremove } = $props();
  let held = $state(false);
  let holdTimer, downX = 0, downY = 0;

  // A touch may be the start of a scroll or a swipe, so it only counts as a hold after a short
  // wait, and not at all if the finger has moved by then.
  function press(e) {
    if (e.pointerType === 'mouse') held = true;
    else {
      downX = e.clientX;
      downY = e.clientY;
      holdTimer = setTimeout(() => (held = true), 150);
    }
  }
  function move(e) {
    if (!held && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) clearTimeout(holdTimer);
  }
  function release() {
    clearTimeout(holdTimer);
    held = false;
  }

  // An animation has `frames`; a still image is treated as a single frame.
  const frames = $derived(item.frames ?? [item]);
  let at = $state(0); // which frame is on screen

  // A photo has far more pixels than its tile can show, and converting them all on every change
  // is what makes a phone stall. So a tile converts and draws a picture of the image at its own
  // size, a pixel for each pixel of the screen. Anything that fits the tile, sprites included,
  // is drawn whole.
  let box = $state(0); // the width of the square the image sits in, in CSS pixels
  let pace = 0; // how long this tile's last conversion took, in milliseconds per pixel converted
  // On a slow phone even that many pixels take too long to keep up with a finger on the slider.
  // So during a drag a large image is drawn as a rougher draft, a smaller picture: one that, at
  // the pace this device last converted this image, fits the budget. It sharpens when the slider
  // rests or is let go. `shown` in layout.js has the rules. The image sits 8px in from each side
  // of the square, and a square with no room for it has not been laid out yet.
  const size = $derived(box > inset * 2 ? shown(item.img.w, item.img.h, (box - inset * 2) * devicePixelRatio, budget, pace) : null);
  // the picture's width and height, each on its own so that nothing is redrawn when `size` is worked out again to the same numbers
  const mw = $derived(size ? size[0] : 0);
  const mh = $derived(size ? size[1] : 0);

  // A frame is converted when it is first shown and then kept: its mask until the style, one of
  // its settings or the picture's size changes, its colored pixels until a color changes too. So a
  // color change reuses the masks, and an animation converts one frame at a time as it plays.
  const masks = $derived.by(() => {
    style, set, mw, mh; // read, so the masks are dropped when any of these changes
    return frames.map(() => null);
  });
  const colored = $derived.by(() => {
    first, second;
    return masks.map(() => null);
  });
  const originals = $derived.by(() => {
    mw, mh;
    return frames.map(() => null);
  });
  const pixels = $derived.by(() => {
    if (!mw) return null;
    const frame = frames[at];
    if (flipped !== held) return (originals[at] ??= mw < item.img.w ? new ImageData(shrink(frame.original, mw, mh), mw) : frame.original);
    if (!masks[at]) {
      // Stencil's first conversion of an image walks all of it, once. That is not the pace of a conversion, so it is done before the clock starts.
      if (style === 'stencil') spritesOf(frame.img);
      if (style === 'icon') iconOf(frame.img, set?.border ?? 'auto');
      const start = performance.now();
      masks[at] = mask(frame.img, style, set, mw, mh);
      pace = (performance.now() - start) / masks[at].length;
    }
    return (colored[at] ??= new ImageData(colorize(masks[at], first, second), mw));
  });

  // Plays an animation: after the current frame's delay, step to the next and start again.
  $effect(() => {
    if (frames.length < 2) return;
    const timer = setTimeout(() => (at = (at + 1) % frames.length), frames[at].delay);
    return () => clearTimeout(timer);
  });
</script>

<figure class="tile">
  <div
    class="art"
    class:held
    role="presentation"
    onpointerdown={press}
    onpointermove={move}
    onpointerup={release}
    onpointerleave={release}
    onpointercancel={release}
    oncontextmenu={e => e.preventDefault()}
    bind:clientWidth={box}
  >
    {#if pixels}<Pixels {pixels} />{/if}
  </div>
  {#if onremove}
    <div class="acts">
      <!-- app.css shows Share on touch screens and Copy and Download everywhere else -->
      <button class="ib touch" onclick={onshare} aria-label="Share {item.name}" use:tooltip={'Copy or download this image.'}><PixelIcon name="share" /></button>
      <button class="ib mouse" onclick={oncopy} aria-label="Copy {item.name}" use:tooltip={'Copy this image to the clipboard as a PNG.'}><PixelIcon name="copy" /></button>
      <button class="ib mouse" onclick={onsave} aria-label="Download {item.name}" use:tooltip={'Save this image at its original size.'}><PixelIcon name="save" /></button>
      <button class="ib" onclick={onremove} aria-label="Remove {item.name}" use:tooltip={'Remove this image from the wall.'}><PixelIcon name="x" /></button>
    </div>
  {/if}
  <figcaption class="cap">
    <span class="name" use:tooltip={item.name}>{item.name}</span>
    <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}</span>
  </figcaption>
</figure>
