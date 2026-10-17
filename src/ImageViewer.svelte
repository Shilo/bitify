<script>
  import { untrack } from 'svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { fitViewerImage, viewerInspectionScale } from './lib/viewer-layout.js';
  import { canvasGridSpacing } from './lib/canvas-grid.js';
  import { viewerNavigation, MIN_VIEWER_ZOOM, MAX_VIEWER_ZOOM } from './lib/viewer-navigation.js';
  let { item, first, second, style, set, family = 'two-color', palette, palettePending = false, analysisPending = false, alphaCut = 128, alphaMode = 'cut', metric = 'oklab', maxColors = 0, cleanup = false, dither = 'none', ditherStrength = 50, onpalettestatus, paletteRetry = 0, paletteFailureNotice = '', onpaletteretry, exportDisabled = false, flipped = false, onsave, oncopy, onclose, busy = '', message = '', colorUsageLabel = '', colorUsagePending = false, exportDrag } = $props();
  let dialog;
  let width = $state(0), height = $state(0);
  const view = $state({ scale: 1, x: 0, y: 0, dragging: false });
  let inspectionScale = $state(1);
  // Snapshot the visible main-canvas state; all Preview changes remain local.
  let converted = $state(untrack(() => !flipped));
  let spaceHeld = $state(false), imageHeld = $state(false);
  const originalVisible = $derived(!converted !== (spaceHeld || imageHeld));
  const fit = $derived(fitViewerImage(item.img.w, item.img.h, width, height, 0));
  const navigation = viewerNavigation({ onchange: next => Object.assign(view, next), onhold: active => (imageHeld = active), onclose: () => dialog.close(), canClose: () => !spaceHeld });
  const grid = $derived(canvasGridSpacing([item.img], Math.max(fit.width, fit.height) * view.scale));
  const samplingTarget = $derived(viewerInspectionScale(fit.width, fit.height, view.scale, devicePixelRatio, item.frames?.length ?? 1));
  // Transform immediately; refine only after the sampling target settles. Large photos
  // keep a bounded preview rather than allocating full sources for every pinch.
  $effect(() => {
    const scale = samplingTarget;
    if (scale === untrack(() => inspectionScale)) return;
    const timer = setTimeout(() => (inspectionScale = scale), 180);
    return () => clearTimeout(timer);
  });
  $effect(() => { dialog.showModal(); dialog.focus(); });
  $effect(() => {
    const clear = () => { spaceHeld = false; imageHeld = false; navigation.cancel(); };
    const hidden = () => { if (document.hidden) clear(); };
    const focused = e => { if (e.target.closest('dialog') !== dialog) clear(); };
    // Pointer clicks may blur toolbar buttons back to the page. Keep comparison
    // available for the lifetime of this modal, regardless of that focus target.
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('focusin', focused);
    return () => { window.removeEventListener('keydown', keydown, true); window.removeEventListener('keyup', keyup, true); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); document.removeEventListener('focusin', focused); };
  });
  function keydown(e) {
    if (!dialog?.open || document.querySelector('dialog.palette-import-modal[open]') || e.code !== 'Space' || e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    // Space is the preview comparison shortcut, including when a toolbar has focus.
    e.preventDefault(); e.stopPropagation(); spaceHeld = true;
  }
  function keyup(e) {
    if (!dialog?.open || document.querySelector('dialog.palette-import-modal[open]') || e.code !== 'Space') return;
    e.preventDefault(); e.stopPropagation(); spaceHeld = false;
  }
</script>

<!-- A native top-layer dialog gives fullscreen image inspection without requiring
     browser fullscreen permission or leaving the app's keyboard focus unmanaged. -->
<dialog class="image-viewer" bind:this={dialog} aria-label="Image preview" tabindex="-1"
  style:--canvas-grid-step={`${grid.step}px`}
  style:background-position={`${(width - fit.width * view.scale) / 2 + view.x}px ${(height - fit.height * view.scale) / 2 + view.y}px`}
  use:navigation.attach={{ width, height, imageWidth: fit.width, imageHeight: fit.height }}
  onclose={() => { spaceHeld = false; imageHeld = false; navigation.cancel(); onclose?.(); }}>
  <div class="viewer-zoom viewer-tools glass-card" role="group" aria-label="Preview zoom">
    <button class="btn glass-btn icon-only" onclick={() => navigation.zoomBy(1 / 1.25)} disabled={view.scale <= MIN_VIEWER_ZOOM} aria-label="Zoom out" use:tooltip={'Zoom out. (−)'}>−</button>
    <button class="btn glass-btn icon-only" onclick={() => navigation.reset()} disabled={view.scale === 1 && view.x === 0 && view.y === 0} aria-label="Fit image" use:tooltip={'Fit the whole image. (0)'}><PixelIcon name="fit" /></button>
    <button class="btn glass-btn icon-only" onclick={() => navigation.zoomBy(1.25)} disabled={view.scale >= MAX_VIEWER_ZOOM} aria-label="Zoom in" use:tooltip={'Zoom in. (+)'}>+</button>
  </div>
  <nav class="viewer-workspace" aria-label="Preview controls">
    <div class="viewer-tools glass-card" role="group" aria-label="Image actions">
      {#if onsave}<button class="btn glass-btn glass-btn--primary icon-only" onclick={onsave} disabled={exportDisabled} aria-label="Save image" use:tooltip={'Save the converted image at its original size.'}><PixelIcon name="save" /></button>{/if}
      {#if oncopy}<button class="btn glass-btn icon-only" onclick={oncopy} disabled={exportDisabled} aria-label="Copy image" use:tooltip={'Copy the converted image as a PNG.'}><PixelIcon name="copy" /></button>{/if}
      <button class="btn glass-btn icon-only viewer-compare" aria-pressed={!originalVisible}
        aria-label={originalVisible ? 'Show converted image' : 'Show original image'}
        onclick={() => (converted = !converted)} use:tooltip={originalVisible ? 'Show the converted image.' : 'Show the original image.'}>
        <PixelIcon name="swap" />
      </button>
    </div>
    <button class="btn glass-btn icon-only viewer-close" onclick={() => dialog.close()} aria-label="Close preview" use:tooltip={'Close preview.'}><PixelIcon name="x" /></button>
  </nav>
  <div class="viewer-art" class:is-zoomed={view.scale > 1} class:is-dragging={view.dragging} bind:clientWidth={width} bind:clientHeight={height}>
    <div class="viewer-tile" style:width="{fit.width}px" style:transform={`translate(${view.x}px, ${view.y}px) scale(${view.scale})`}>
      <Tile {item} {first} {second} {style} {set} {family} {palette} {palettePending} {analysisPending} {alphaCut} {alphaMode} {metric} {maxColors} {cleanup} {dither} {ditherStrength} {onpalettestatus} {paletteRetry} {colorUsageLabel} {colorUsagePending} {inspectionScale} flipped={originalVisible} activationLabel={`Close preview of ${item.name}`} inset={0} aspect={fit.width / fit.height} />
    </div>
  </div>
  <!-- Keep feedback in the top-layer dialog; the page-level toast is inert while this viewer is open. -->
  <div class="glass-toast viewer-toast" class:is-visible={!!busy || !!message || !!paletteFailureNotice}
    role="status" aria-atomic="true" hidden={!busy && !message && !paletteFailureNotice}>
    {#if busy}<span class="spin" aria-hidden="true"></span>{/if}
    <span class="glass-toast__text">{paletteFailureNotice || busy || message}</span>
    {#if paletteFailureNotice}<button class="btn glass-btn" onclick={onpaletteretry}>Retry</button>{/if}
  </div>
</dialog>
