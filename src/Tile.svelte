<script>
  import { mask, colorize, shrink, spritesOf, iconOf } from './lib/bitify.js';
  import { shown } from './lib/layout.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { imageGesture, IMAGE_HOLD_MS } from './lib/image-gesture.js';
  import { comparisonHold } from './lib/comparison-hold.js';

  // `flipped` true means originals are visible. App-managed comparison updates
  // that same value and the dock toggle; standalone previews use a local hold.
  // Without `onremove` the tile is a preview only and has no buttons.
  // `set` is the style's settings. `budget` is set while one of their sliders is being dragged:
  // the milliseconds this tile may take to convert its image after each move.
  let { item, first, second, style, set, flipped, budget = 0, inset = 8, aspect = 1, onshare, oncopy, onsave, onremove, onopen, onactivate, activationLabel, oncompare, comparing = false } = $props();
  let held = $state(false);
  let holdTimer;
  let clickReady = false;
  const gesture = imageGesture();
  const holds = comparisonHold();

  function publishHold(active) {
    if (held === active) return;
    held = active;
    oncompare?.(active, item.id);
  }
  function hold(source, active) { publishHold(holds.set(source, active)); }
  function activate(trigger) { if (!held && !comparing) (onactivate ?? onopen)?.(item, trigger); }

  // A touch may be the start of a scroll or a swipe, so it only counts as a hold after a short
  // wait, and not at all if the finger has moved by then.
  function press(e) {
    hold('pointer', false);
    clearTimeout(holdTimer);
    clickReady = false;
    gesture.press(e);
    if (gesture.canHold()) holdTimer = setTimeout(() => { if (gesture.canHold()) hold('pointer', true); }, IMAGE_HOLD_MS);
  }
  function move(e) {
    gesture.move(e);
    if (!gesture.canHold()) { clearTimeout(holdTimer); hold('pointer', false); }
  }
  function release(e) {
    // Also check the final position: a browser may omit intermediate moves.
    gesture.move(e);
    clickReady = gesture.release(e);
    clearTimeout(holdTimer);
    hold('pointer', false);
  }
  function cancelPointer() {
    gesture.cancel(); clearTimeout(holdTimer); hold('pointer', false); clickReady = false;
  }
  function cancel() { cancelPointer(); publishHold(holds.clear()); }
  function keydown(e) {
    if (!['Enter', ' '].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === ' ') hold('keyboard', true);
    else if (!e.repeat) activate(e.currentTarget);
  }
  $effect(() => {
    const hidden = () => { if (document.hidden) cancel(); };
    // A second finger may land on another tile or control, outside this art.
    const multitouch = e => { if (e.pointerType === 'touch' && e.isPrimary === false) cancel(); };
    window.addEventListener('pointerdown', multitouch, { passive: true });
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      cancel();
      window.removeEventListener('pointerdown', multitouch);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  });

  // An animation has `frames`; a still image is treated as a single frame.
  const frames = $derived(item.frames ?? [item]);
  let at = $state(0); // which frame is on screen

  // A photo has far more pixels than its tile can show, and converting them all on every change
  // is what makes a phone stall. So a tile converts and draws a picture of the image at its own
  // size, a pixel for each pixel of the screen. Anything that fits the tile, sprites included,
  // is drawn whole.
  let box = $state(0); // the width of the square the image sits in, in CSS pixels
  let boxHeight = $state(0);
  let pace = 0; // how long this tile's last conversion took, in milliseconds per pixel converted
  // On a slow phone even that many pixels take too long to keep up with a finger on the slider.
  // So during a drag a large image is drawn as a rougher draft, a smaller picture: one that, at
  // the pace this device last converted this image, fits the budget. It sharpens when the slider
  // rests or is let go. `shown` in layout.js has the rules. The image sits 8px in from each side
  // of the square, and a square with no room for it has not been laid out yet.
  const across = $derived(Math.min((box - inset * 2) / item.img.w, (boxHeight - inset * 2) / item.img.h) * Math.max(item.img.w, item.img.h));
  const size = $derived(across > 0 ? shown(item.img.w, item.img.h, across * devicePixelRatio, budget, pace) : null);
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
    if (oncompare ? flipped : flipped !== held) return (originals[at] ??= mw < item.img.w ? new ImageData(shrink(frame.original, mw, mh), mw) : frame.original);
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
  <button
    type="button"
    class="art"
    style:aspect-ratio={aspect}
    class:held
    aria-label={activationLabel ?? (onopen ? `Open ${item.name} in full screen` : `Hold to compare ${item.name}`)}
    aria-haspopup={onopen && !onactivate ? 'dialog' : undefined}
    onkeydown={keydown}
    onkeyup={e => { if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); hold('keyboard', false); } }}
    onclick={e => { if (!e.detail || clickReady) activate(e.currentTarget); clickReady = false; }}
    onpointerdown={press}
    onpointermove={move}
    onpointerup={release}
    onpointerleave={cancelPointer}
    onpointercancel={cancelPointer}
    onblur={cancel}
    oncontextmenu={e => e.preventDefault()}
    bind:clientWidth={box}
    bind:clientHeight={boxHeight}
  >
    {#if pixels}<Pixels {pixels} />{/if}
  </button>
  {#if onremove}
    <div class="acts">
      <!-- Touch uses a compact action menu; mouse shows Copy and Export directly. -->
      <button class="ib touch" onclick={onshare} aria-label="Image actions for {item.name}" use:tooltip={'Copy or export this image.'}><PixelIcon name="more" /></button>
      <button class="ib mouse" onclick={oncopy} aria-label="Copy {item.name}" use:tooltip={'Copy this image to the clipboard as a PNG.'}><PixelIcon name="copy" /></button>
      <button class="ib mouse" onclick={onsave} aria-label="Export {item.name}" use:tooltip={'Export this image at its original size.'}><PixelIcon name="save" /></button>
      <button class="ib" onclick={onremove} aria-label="Remove {item.name}" use:tooltip={'Remove this image from the canvas.'}><PixelIcon name="trash" /></button>
    </div>
  {/if}
  <figcaption class="cap">
    <span class="name" use:tooltip={item.name}>{item.name}</span>
    <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}</span>
  </figcaption>
</figure>
