<script>
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { IMAGE_INSET } from './lib/workspace.js';
  import { fitViewerImage } from './lib/viewer-layout.js';
  let { item, first, second, style, set, flipped = false, onsave, oncopy, onclose, busy = '', message = '' } = $props();
  let dialog, closeButton;
  let width = $state(0), height = $state(0);
  let headerHeight = $state(0);
  let compare = $state(false), spaceHeld = $state(false), imageHeld = $state(false);
  const originalVisible = $derived((flipped !== compare) !== (spaceHeld || imageHeld));
  const fit = $derived(fitViewerImage(item.img.w, item.img.h, width, height, IMAGE_INSET));
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
<dialog class="image-viewer" bind:this={dialog} aria-labelledby="viewer-title" style:--viewer-header-space="{headerHeight}px"
  onclose={() => { spaceHeld = false; onclose?.(); }} onkeydown={keydown} onkeyup={e => { if (e.code === 'Space') spaceHeld = false; }}>
  <header class="viewer-header" bind:clientHeight={headerHeight}>
    <h2 class="glass-card" id="viewer-title">{item.name}</h2>
    <div class="viewer-tools glass-card" role="group" aria-label="Image actions">
      <button class="btn glass-btn icon-only viewer-compare" aria-pressed={originalVisible}
        aria-label={originalVisible ? 'Show converted image' : 'Show original image'}
        onclick={() => (compare = !compare)} use:tooltip={originalVisible ? 'Show the converted image.' : 'Show the original image.'}>
        <PixelIcon name="swap" />
      </button>
      {#if oncopy}<button class="btn glass-btn icon-only" onclick={oncopy} aria-label="Copy image" use:tooltip={'Copy this image as a PNG.'}><PixelIcon name="copy" /></button>{/if}
      {#if onsave}<button class="btn glass-btn icon-only" onclick={onsave} aria-label="Export image" use:tooltip={'Export this image at its original size.'}><PixelIcon name="save" /></button>{/if}
    </div>
    <button class="btn glass-btn icon-only viewer-close" bind:this={closeButton} onclick={() => dialog.close()} aria-label="Close full screen" use:tooltip={'Close full screen.'}><PixelIcon name="x" /></button>
  </header>
  <div class="viewer-art" bind:clientWidth={width} bind:clientHeight={height}>
    <div class="viewer-tile" style:width="{fit.width}px">
      <Tile {item} {first} {second} {style} {set} flipped={originalVisible} oncompare={active => (imageHeld = active)} inset={IMAGE_INSET} aspect={fit.width / fit.height} />
    </div>
  </div>
  <div class="glass-toast viewer-toast" class:is-visible={!!busy || !!message}
    role="status" aria-atomic="true" hidden={!busy && !message}>
    {#if busy}<span class="spin" aria-hidden="true"></span>{/if}
    <span class="glass-toast__text">{busy || message}</span>
  </div>
</dialog>
