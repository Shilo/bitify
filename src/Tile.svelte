<script>
  import { untrack } from 'svelte';
  import { mask, colorize, shrink, spritesOf, iconOf } from './lib/recolor.js';
  import { shown } from './lib/layout.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { imageGesture, IMAGE_HOLD_MS } from './lib/image-gesture.js';
  import { comparisonHold } from './lib/comparison-hold.js';
  import { quantizePreviewAsync, colorize as palettePixels } from './lib/quantize.js';
  import { getLimitedPalette } from './lib/palette-limit-client.js';
  import { animationPreviewCache } from './lib/palette-animation-cache.js';
  import { animationVisibility } from './lib/animation-visibility.js';
  import { exportDragArt } from './lib/export-drag.js';
  import { paletteFailureInputs, samePaletteFailureInputs } from './lib/palette-failure.js';

  // `flipped` true means originals are visible. App-managed comparison updates
  // that same value and the dock toggle; standalone previews use a local hold.
  // Without `onremove` the tile is a preview only and has no buttons.
  // `set` is the style's settings. `budget` is set while one of their sliders is being dragged:
  // the milliseconds this tile may take to convert its image after each move.
  let { item, first, second, style, set, family = 'two-color', palette, palettePending = false, analysisPending = false, alphaCut = 128, metric = 'oklab', maxColors = 0, cleanup = false, active = true, exportDisabled = false, onpalettestatus, paletteRetry = 0, flipped, budget = 0, inset = 8, aspect = 1, onshare, oncopy, onsave, onremove, onopen, onactivate, activationLabel, oncompare, comparing = false, exportDrag } = $props();
  const failureOwner = Symbol('palette preview surface');
  const reportStage = (type, stage, inputs, attempt, error) => untrack(() => onpalettestatus?.({ type, owner: failureOwner, stage, inputs, attempt, error }));
  $effect(() => () => onpalettestatus?.({ type: 'remove', owner: failureOwner }));
  let held = $state(false);
  const originalVisible = $derived(oncompare ? flipped : flipped !== held);
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
  let inView = $state(true);
  function trackVisibility(visible) { inView = visible; }

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
  // A subset belongs to the full item, not the current animation frame or tile
  // dimensions. Frame playback/resize cannot cancel this shared preparation.
  const stageInputs = $derived(paletteFailureInputs(item, palette, alphaCut, metric, maxColors));
  let limitAttempt = $state(0), cleanupAttempt = $state(0);
  const limitRequest = $derived({ item, palette, alphaCut, metric, maxColors, inputs: stageInputs, attempt: limitAttempt });
  let limited = $state.raw(null);
  const limitFailed = $derived(family === 'full-palette' && !!maxColors && maxColors < (palette?.size ?? 0)
    && samePaletteFailureInputs(limited?.inputs, stageInputs) && !!limited?.error);
  const conversionPalette = $derived(!maxColors || maxColors >= (palette?.size ?? 0) ? palette
    : limited?.request === limitRequest ? limited.palette : null);
  $effect(() => {
    const request = limitRequest;
    const previous = untrack(() => limited);
    const error = samePaletteFailureInputs(previous?.inputs, request.inputs) ? previous?.error : null;
    limited = { request, inputs: request.inputs, error };
    if (family !== 'full-palette' || !request.palette || !request.maxColors || request.maxColors >= request.palette.size) {
      limited = null;
      reportStage('clear', 'limit'); return;
    }
    const controller = new AbortController();
    reportStage('begin', 'limit', request.inputs, controller);
    getLimitedPalette(request.item, request.palette, request.alphaCut, request.metric, request.maxColors, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) {
        limited = { request, inputs: request.inputs, palette: result };
        reportStage('ready', 'limit', request.inputs, controller);
      }
    }).catch(error => {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      limited = { request, inputs: request.inputs, error };
      reportStage('failed', 'limit', request.inputs, controller, error);
    });
    return () => controller.abort();
  });
  // One whole-source/clip cleanup decision is shared across frame playback,
  // resized previews and exports. Off does not load the optional code.
  const cleanupRequest = $derived({ item, palette: conversionPalette, alphaCut, metric, cleanup, inputs: stageInputs, attempt: cleanupAttempt });
  let cleaned = $state.raw(null);
  const cleanupFailed = $derived(family === 'full-palette' && cleanup
    && samePaletteFailureInputs(cleaned?.inputs, stageInputs) && !!cleaned?.error);
  const failureDescription = $derived(limitFailed ? "Couldn't limit colors. Retry or choose All."
    : cleanupFailed ? "Couldn't clean up pixels. Retry or turn Cleanup off." : '');
  const conversionCleanup = $derived(cleanup && cleaned?.request === cleanupRequest && cleaned.result ? cleaned : null);
  let seenRetry = untrack(() => paletteRetry);
  $effect(() => {
    const command = paletteRetry;
    if (command === seenRetry) return;
    seenRetry = command;
    // Inspect failure only when explicitly commanded, never in reaction to a catch.
    untrack(() => { if (limitFailed) limitAttempt++; if (cleanupFailed) cleanupAttempt++; });
  });
  $effect(() => {
    const request = cleanupRequest;
    const previous = untrack(() => cleaned);
    const error = samePaletteFailureInputs(previous?.inputs, request.inputs) ? previous?.error : null;
    cleaned = { request, inputs: request.inputs, error };
    if (family !== 'full-palette' || !request.cleanup) { cleaned = null; reportStage('clear', 'cleanup'); return; }
    // A same-input limiter retry temporarily removes the prerequisite palette.
    // Keep the cleanup failure owned and blocked until its own successful retry.
    if (!request.palette) return;
    const controller = new AbortController();
    reportStage('begin', 'cleanup', request.inputs, controller);
    import('./lib/palette-cleanup-client.js').then(async client => {
      const result = await client.getPaletteCleanup(request.item, request.palette, request.alphaCut, request.metric, { signal: controller.signal });
      if (!controller.signal.aborted) {
        cleaned = { request, inputs: request.inputs, result, apply: client.applyCleanup };
        reportStage('ready', 'cleanup', request.inputs, controller);
      }
    }).catch(error => {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      cleaned = { request, inputs: request.inputs, error };
      reportStage('failed', 'cleanup', request.inputs, controller, error);
    });
    return () => controller.abort();
  });
  // One current frame lives outside the legacy mask cache. Cancelling a job prevents
  // a previous palette, matching rule, opacity, size or frame from replacing the current preview.
  let fullPixels = $state.raw(null), fullReady = $state(false);
  const cacheRequest = $derived({ sources: frames.map(frame => frame.original), colors: conversionPalette,
    width: mw, height: mh, alphaCut, metric, cleanup: conversionCleanup?.result ?? null });
  let cachedClip = $state.raw(null);
  const clipCache = $derived(cachedClip?.request === cacheRequest ? cachedClip.handle : null);
  $effect(() => {
    const request = cacheRequest;
    if (family !== 'full-palette' || !request.colors || !request.width || cleanup && !request.cleanup) { cachedClip = null; return; }
    const handle = animationPreviewCache.acquire({ ...request, palette: request.colors });
    cachedClip = { request, handle };
    return () => { handle?.release(); };
  });
  let fullItem, fullCompleted;
  $effect(() => {
    const frame = frames[at], frameAt = at, source = frame.original, data = source.data, sourceWidth = source.width, sourceHeight = source.height;
    const colors = conversionPalette, width = mw, height = mh, cut = alphaCut, matching = metric, clean = conversionCleanup, cleaning = cleanup;
    fullReady = false;
    // Keep the last completed frame while the next frame or settings convert.
    // Clearing it on every async frame removes the canvas and exposes the grid.
    // Readiness still belongs to the requested frame, not these retained pixels.
    if (family !== 'full-palette' || fullItem !== item || !palette && !palettePending) {
      fullPixels = null;
      fullCompleted = null;
    }
    fullItem = item;
    if (family !== 'full-palette' || !width || !colors || cleaning && !clean || originalVisible || !active
      || frames.length > 1 && !inView) return;
    // This record belongs only to the retained, successfully published pixels.
    // Original/viewer/visibility changes do not alter their conversion inputs.
    // A canceled request or a different animation frame can never make it ready.
    const completed = fullCompleted;
    if (completed && completed.frame === frame && completed.frameAt === frameAt
      && completed.source === source && completed.data === data && completed.sourceWidth === sourceWidth && completed.sourceHeight === sourceHeight
      && completed.colors === colors && completed.width === width && completed.height === height
      && completed.cut === cut && completed.matching === matching && completed.cleaning === cleaning
      && completed.cleaned === clean?.result && completed.apply === clean?.apply) {
      fullReady = true;
      return;
    }
    const controller = new AbortController();
    const produce = async signal => {
      const result = await quantizePreviewAsync(source, colors, cut, width, height, { signal, metric: matching });
      if (clean) clean.apply(result, clean.result);
      return result;
    };
    const pending = clipCache ? clipCache.getFrame(at, produce, { signal: controller.signal }) : produce(controller.signal);
    pending.then(result => {
      if (!controller.signal.aborted) {
        fullPixels = new ImageData(palettePixels(result, colors).data, width, height);
        fullCompleted = { frame, frameAt, source, data, sourceWidth, sourceHeight, colors, width, height, cut, matching,
          cleaning, cleaned: clean?.result, apply: clean?.apply };
        fullReady = true;
      }
    }).catch(error => { if (error.name !== 'AbortError') console.error('Palette preview failed', error); });
    return () => controller.abort();
  });
  const completedPixels = $derived.by(() => {
    if (!mw) return null;
    const frame = frames[at];
    if (originalVisible) return (originals[at] ??= mw < item.img.w ? new ImageData(shrink(frame.original, mw, mh), mw) : frame.original);
    if (family === 'full-palette') return fullItem === item ? fullPixels : null;
    if (analysisPending) return null;
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
  // The first Generated selection has no palette yet. Retain an already painted
  // conversion of this same item, including a prior 1-bit conversion, while it loads.
  // Originals remain explicit; a resolved empty result must expose transparency.
  let lastConverted = $state.raw(null);
  $effect(() => {
    const completed = completedPixels, currentItem = item;
    if (completed && !originalVisible) lastConverted = { item: currentItem, pixels: completed };
    else if (family === 'full-palette' && !palettePending && !palette
      || untrack(() => lastConverted?.item) !== currentItem) lastConverted = null;
  });
  const pixels = $derived(completedPixels ?? (!originalVisible && (family === 'two-color' ? analysisPending : palettePending || palette && !fullReady)
    && lastConverted?.item === item ? lastConverted.pixels : null));

  // Plays an animation: after the current frame's delay, step to the next and start again.
  $effect(() => {
    // Offscreen animations retain their current canvas and caches. Resume the
    // held frame's delay when visible; hidden time does not advance their clock.
    if (!active || frames.length < 2 || !inView) return;
    if (family === 'two-color' && !originalVisible && analysisPending) return;
    // Original playback follows source delays independently of conversion. Read
    // originalVisible first so a finished preview cannot restart that timer.
    if (family === 'full-palette' && !originalVisible && !fullReady) return;
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
    aria-label={activationLabel ?? (onopen ? `Preview ${item.name}` : `Hold to compare ${item.name}`)}
    aria-haspopup={onopen && !onactivate ? 'dialog' : undefined}
    onkeydown={keydown}
    onkeyup={e => { if (e.key === ' ') { e.preventDefault(); hold('keyboard', false); } }}
    onclick={e => { if (!e.detail || clickReady) activate(e.currentTarget); clickReady = false; }}
    onpointerdown={press}
    onpointermove={move}
    onpointerup={release}
    onpointerleave={() => { if (gesture.canHold()) cancelPointer(); }}
    onpointercancel={cancelPointer}
    onblur={cancel}
    oncontextmenu={e => e.preventDefault()}
    bind:clientWidth={box}
    bind:clientHeight={boxHeight}
    use:animationVisibility={frames.length > 1 ? trackVisibility : undefined}
    use:exportDragArt={exportDrag ? { controller: exportDrag, item, cancel: cancelPointer } : undefined}
  >
    {#if pixels}<Pixels {pixels} />{/if}
  </button>
  {#if onremove}
    <div class="acts">
      <!-- Desktop actions retain their readable capsule; touch actions live in the caption. -->
      <button class="ib mouse glass-btn--primary" onclick={onsave} disabled={exportDisabled} aria-label="Save {item.name}" use:tooltip={'Save this image at its original size.'}><PixelIcon name="save" /></button>
      <button class="ib mouse" onclick={oncopy} disabled={exportDisabled} aria-label="Copy {item.name}" use:tooltip={'Copy this image to the clipboard as a PNG.'}><PixelIcon name="copy" /></button>
      <button class="ib mouse" onclick={e => activate(e.currentTarget)} aria-label="Preview {item.name}" aria-haspopup="dialog" use:tooltip={'Preview this image.'}><PixelIcon name="expand" /></button>
      <button class="ib danger" onclick={onremove} aria-label="Remove {item.name}" use:tooltip={'Remove this image from the canvas.'}><PixelIcon name="trash" /></button>
    </div>
  {/if}
  {#if onactivate}
    <figcaption class="example-caption">
      <button class="cap btn glass-btn glass-btn--primary example-add" onclick={e => activate(e.currentTarget)} aria-label="Add images" use:tooltip={'Choose images from your device.'}>
        <span class="caption-details">
          <span class="name">{item.name}</span>
          <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}</span>
        </span>
        <span class="example-add-label">
          <span class="example-label-desktop">Add, drop or paste images</span>
          <span class="example-label-touch">Add images</span>
        </span>
        <PixelIcon name="import" />
      </button>
    </figcaption>
  {:else}
    <figcaption class="cap" class:has-image-actions={!!onremove}>
      {#if onopen}
        <button type="button" class="caption-preview" onclick={e => activate(e.currentTarget)} aria-label="Preview {item.name}" aria-haspopup="dialog">
          <span class="caption-details">
            <span class="name" use:tooltip={item.name}>{item.name}</span>
            <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}{#if failureDescription}<span class="palette-failure-mark" use:tooltip={failureDescription}> · Retry needed</span>{/if}</span>
          </span>
        </button>
      {:else}
        <span class="caption-details">
          <span class="name" use:tooltip={item.name}>{item.name}</span>
          <span class="dim">{item.img.w}<span class="by">×</span>{item.img.h}{#if failureDescription}<span class="palette-failure-mark" use:tooltip={failureDescription}> · Retry needed</span>{/if}</span>
        </span>
      {/if}
      {#if onremove}
        <button class="ib glass-btn tile-share" onclick={onshare} aria-label="Image actions for {item.name}" aria-haspopup="dialog" use:tooltip={'Save, copy, preview or remove this image.'}><PixelIcon name="more" /></button>
      {/if}
    </figcaption>
  {/if}
</figure>
