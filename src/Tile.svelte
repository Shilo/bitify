<script>
  import { mask, colorize } from './lib/bitify.js';
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';

  // `flipped` true means the wall is showing originals. Holding the tile shows the other version.
  // Without `onremove` the tile is a preview only and has no Download or Remove buttons.
  let { item, first, second, style, threshold, flipped, onsave, onremove } = $props();
  let held = $state(false);
  let holdTimer;

  // A touch may be the start of a scroll, so it only counts as a hold after a short wait.
  function press(e) {
    if (e.pointerType === 'mouse') held = true;
    else holdTimer = setTimeout(() => (held = true), 150);
  }
  function release() {
    clearTimeout(holdTimer);
    held = false;
  }

  // The mask depends only on the image, style and threshold, so a color change reuses it.
  const m = $derived(mask(item.img, style, threshold));
  const pixels = $derived(
    flipped !== held ? item.original : new ImageData(colorize(m, first, second), item.img.w, item.img.h),
  );
</script>

<figure class="tile">
  <div
    class="art"
    role="presentation"
    onpointerdown={press}
    onpointerup={release}
    onpointerleave={release}
    onpointercancel={release}
    oncontextmenu={e => e.preventDefault()}
  >
    <Pixels {pixels} />
  </div>
  {#if onremove}
    <div class="acts">
      <button class="ib" onclick={onsave} aria-label="Download {item.name}" title="Download"><PixelIcon name="save" /></button>
      <button class="ib" onclick={onremove} aria-label="Remove {item.name}" title="Remove"><PixelIcon name="x" /></button>
    </div>
  {/if}
  <figcaption class="cap">
    <span class="name" title={item.name}>{item.name}</span>
    <span class="dim">{item.img.w} × {item.img.h}</span>
  </figcaption>
</figure>
