<script>
  import { untrack } from 'svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { fitViewerImage } from './lib/viewer-layout.js';
  import { canvasGridSpacing } from './lib/canvas-grid.js';
  let { item, first, second, style, set, flipped = false, onsave, oncopy, onclose, busy = '', message = '' } = $props();
  let dialog, closeButton;
  let width = $state(0), height = $state(0);
  // Seed the local conversion preference once, opposite the main canvas.
  let converted = $state(untrack(() => flipped));
  let spaceHeld = $state(false), imageHeld = $state(false);
  const originalVisible = $derived(!converted !== (spaceHeld || imageHeld));
  const fit = $derived(fitViewerImage(item.img.w, item.img.h, width, height, 0));
  const grid = $derived(canvasGridSpacing([item.img], Math.max(fit.width, fit.height)));
  $effect(() => { dialog.showModal(); closeButton.focus(); });
  $effect(() => {
    const clear = () => { spaceHeld = false; imageHeld = false; };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); };
  });
  function keydown(e) {
    if (e.code !== 'Space' || e.target.closest('button')) return;
    e.preventDefault(); e.stopPropagation(); spaceHeld = true;
  }
</script>

<!-- A native top-layer dialog gives fullscreen image inspection without requiring
     browser fullscreen permission or leaving the app's keyboard focus unmanaged. -->
<dialog class="image-viewer" bind:this={dialog} aria-label="Image preview"
  style:--canvas-grid-step={`${grid.step}px`}
  style:background-position={`${(width - fit.width) / 2}px ${(height - fit.height) / 2}px`}
  onclose={() => { spaceHeld = false; onclose?.(); }} onkeydown={keydown} onkeyup={e => { if (e.code === 'Space') spaceHeld = false; }}>
  <nav class="viewer-workspace" aria-label="Preview controls">
    <div class="viewer-tools glass-card" role="group" aria-label="Image actions">
      {#if onsave}<button class="btn glass-btn icon-only" onclick={onsave} aria-label="Save image" use:tooltip={'Save the converted image at its original size.'}><PixelIcon name="save" /></button>{/if}
      {#if oncopy}<button class="btn glass-btn icon-only" onclick={oncopy} aria-label="Copy image" use:tooltip={'Copy the converted image as a PNG.'}><PixelIcon name="copy" /></button>{/if}
      <button class="btn glass-btn icon-only viewer-compare" aria-pressed={!originalVisible}
        aria-label={originalVisible ? 'Show converted image' : 'Show original image'}
        onclick={() => (converted = !converted)} use:tooltip={originalVisible ? 'Show the converted image.' : 'Show the original image.'}>
        <PixelIcon name="swap" />
      </button>
    </div>
    <button class="btn glass-btn icon-only viewer-close" bind:this={closeButton} onclick={() => dialog.close()} aria-label="Close preview" use:tooltip={'Close preview.'}><PixelIcon name="x" /></button>
  </nav>
  <div class="viewer-art" bind:clientWidth={width} bind:clientHeight={height}>
    <div class="viewer-tile" style:width="{fit.width}px">
      <Tile {item} {first} {second} {style} {set} flipped={originalVisible} oncompare={active => (imageHeld = active)} inset={0} aspect={fit.width / fit.height} />
    </div>
  </div>
  <!-- Keep feedback in the top-layer dialog; the page-level toast is inert while this viewer is open. -->
  <div class="glass-toast viewer-toast" class:is-visible={!!busy || !!message}
    role="status" aria-atomic="true" hidden={!busy && !message}>
    {#if busy}<span class="spin" aria-hidden="true"></span>{/if}
    <span class="glass-toast__text">{busy || message}</span>
  </div>
</dialog>
