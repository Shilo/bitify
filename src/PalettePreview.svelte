<script>
  import { paintPalettePreview, paintPalettePair } from './lib/palette-preview.js';
  // A smooth diagonal pair shows the palette's two inks. Compact transparency glyphs use
  // the theme's text color, so they stay legible independently of the chosen palette.
  let { first, second, colors, none = 0, compact = false } = $props();
</script>

{#if compact}
  <span class="glyph" class:first={none === 1} class:second={none === 2} aria-hidden="true"></span>
{:else if colors}
  <canvas class="full-palette-preview" aria-hidden="true" use:paintPalettePreview={colors}></canvas>
{:else}
  <canvas class="palette-preview" aria-hidden="true" style:--preview-first={first} style:--preview-second={second} use:paintPalettePair={[first, second]}></canvas>
{/if}
