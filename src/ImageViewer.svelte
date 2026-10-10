<script>
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { IMAGE_INSET } from './lib/workspace.js';
  let { item, first, second, style, set, flipped = false, onsave, oncopy, onclose } = $props();
  let dialog;
  let width = $state(0), height = $state(0);
  let compare = $state(false), spaceHeld = $state(false);
  const size = $derived(Math.max(48, Math.min(width - 24, height - 24 - 35)));
  $effect(() => { dialog.showModal(); });
  function keydown(e) {
    if (e.code !== 'Space' || e.target.closest('button')) return;
    e.preventDefault(); e.stopPropagation(); spaceHeld = true;
  }
</script>

<!-- A native top-layer dialog gives fullscreen image inspection without requiring
     browser fullscreen permission or leaving the app's keyboard focus unmanaged. -->
<dialog class="image-viewer" bind:this={dialog} aria-labelledby="viewer-title"
  onclose={onclose} onkeydown={keydown} onkeyup={e => { if (e.code === 'Space') spaceHeld = false; }}>
  <header class="viewer-header">
    <h2 id="viewer-title">{item.name}</h2>
    <div class="viewer-tools glass-card" role="group" aria-label="Image actions">
      <button class="btn glass-btn viewer-compare" aria-pressed={compare}
        onclick={() => (compare = !compare)} use:tooltip={'Toggle the original and converted image.'}>
        {flipped !== compare ? 'Original' : 'Converted'}
      </button>
      {#if oncopy}<button class="btn glass-btn icon-only" onclick={oncopy} aria-label="Copy image" use:tooltip={'Copy this image as a PNG.'}><PixelIcon name="copy" /></button>{/if}
      {#if onsave}<button class="btn glass-btn icon-only" onclick={onsave} aria-label="Export image" use:tooltip={'Export this image at its original size.'}><PixelIcon name="save" /></button>{/if}
    </div>
    <button class="btn glass-btn icon-only viewer-close" onclick={() => dialog.close()} aria-label="Close full screen" autofocus use:tooltip={'Close full screen.'}><PixelIcon name="x" /></button>
  </header>
  <div class="viewer-art" bind:clientWidth={width} bind:clientHeight={height}>
    <div class="viewer-tile" style:width="{size}px">
      <Tile {item} {first} {second} {style} {set} flipped={(flipped !== compare) !== spaceHeld} inset={IMAGE_INSET} />
    </div>
  </div>
</dialog>
