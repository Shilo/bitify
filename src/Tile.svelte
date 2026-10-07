<script>
  import { mask, colorize, shrink } from './lib/bitify.js';
  import { sampling } from './lib/layout.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';

  // `flipped` true means the wall is showing originals. Holding the tile shows the other version.
  // Without `onremove` the tile is a preview only and has no buttons.
  // `budget` is set while the threshold slider is being dragged: the milliseconds this tile may
  // take to convert its image after each move.
  let { item, first, second, style, threshold, flipped, budget = 0, onshare, oncopy, onsave, onremove } = $props();
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
  // is what makes a phone stall. So only every k-th pixel of every k-th row is converted and
  // drawn: the most that still gives the screen a pixel of the image for each of its own.
  // k is 1 for anything that fits the tile, sprites included, and 0 until the tile has been laid out.
  let box = $state(0); // the width of the square the image sits in, in CSS pixels
  let pace = 0; // how long this tile's last conversion took, in milliseconds per pixel converted
  // On a slow phone even that many pixels take too long to keep up with a finger on the slider.
  // So during a drag a large image is drawn as a rougher draft, with a larger k: the one that,
  // at the pace this device last converted this image, fits the budget. It sharpens when the
  // slider is let go. `sampling` in layout.js has the rules. The image sits 8px in from each side
  // of the square, and a square with no room for it has not been laid out yet.
  const k = $derived(box > 16 ? sampling(item.img.w, item.img.h, (box - 16) * devicePixelRatio, budget, pace) : 0);

  // A frame is converted when it is first shown and then kept: its mask until the style, the
  // threshold or k changes, its colored pixels until a color changes too. So a color change
  // reuses the masks, and an animation converts one frame at a time as it plays.
  const masks = $derived.by(() => {
    style, threshold, k; // read, so the masks are dropped when any of these changes
    return frames.map(() => null);
  });
  const colored = $derived.by(() => {
    first, second;
    return masks.map(() => null);
  });
  const originals = $derived.by(() => {
    k;
    return frames.map(() => null);
  });
  const pixels = $derived.by(() => {
    if (!k) return null;
    const frame = frames[at], width = Math.ceil(item.img.w / k);
    if (flipped !== held) return (originals[at] ??= k > 1 ? new ImageData(shrink(frame.original, k), width) : frame.original);
    if (!masks[at]) {
      const start = performance.now();
      masks[at] = mask(frame.img, style, threshold, k);
      pace = (performance.now() - start) / masks[at].length;
    }
    return (colored[at] ??= new ImageData(colorize(masks[at], first, second), width));
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
      <button class="ib touch" onclick={onshare} aria-label="Share {item.name}" title="Share"><PixelIcon name="share" /></button>
      <button class="ib mouse" onclick={oncopy} aria-label="Copy {item.name}" title="Copy"><PixelIcon name="copy" /></button>
      <button class="ib mouse" onclick={onsave} aria-label="Download {item.name}" title="Download"><PixelIcon name="save" /></button>
      <button class="ib" onclick={onremove} aria-label="Remove {item.name}" title="Remove"><PixelIcon name="x" /></button>
    </div>
  {/if}
  <figcaption class="cap">
    <span class="name" title={item.name}>{item.name}</span>
    <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}</span>
  </figcaption>
</figure>
