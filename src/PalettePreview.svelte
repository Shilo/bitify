<script>
  // Insets and a stepped join keep both inks visible, even with similar colors.
  let { first, second, none = 0, compact = false } = $props();
</script>

<span class="palette-preview" class:compact aria-hidden="true" style:--preview-first={first} style:--preview-second={second}>
  <span class="preview-ink first-ink" class:transparent={none === 1}></span>
  <span class="preview-ink second-ink" class:transparent={none === 2}></span>
</span>
