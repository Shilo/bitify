<script>
  import { palettePreviewColors } from './lib/palette-preview.js';
  // A smooth diagonal pair shows the palette's two inks. Compact transparency glyphs use
  // the theme's text color, so they stay legible independently of the chosen palette.
  let { first, second, colors, none = 0, compact = false } = $props();
  const overview = $derived(colors ? palettePreviewColors(colors) : []);
</script>

{#if compact}
  <span class="glyph" class:first={none === 1} class:second={none === 2} aria-hidden="true"></span>
{:else if colors}
  <span class="full-palette-preview" aria-hidden="true" style:background={overview.length ? `conic-gradient(${overview.map((c,i) => `${c} ${i*100/overview.length}% ${(i+1)*100/overview.length}%`).join(',')})` : undefined}></span>
{:else}
  <span class="palette-preview" aria-hidden="true" style:--preview-first={first} style:--preview-second={second}></span>
{/if}
