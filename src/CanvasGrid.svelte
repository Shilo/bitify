<script>
  import { tick } from 'svelte';
  import { IMAGE_INSET } from './lib/workspace.js';
  import { canvasGridSpacing } from './lib/canvas-grid.js';
  let { items, example } = $props();
  let across = $state(0);
  // Every fitted tile shares one square width; observe only the first art surface.
  // This also measures the differently sized example on an empty workspace.
  $effect(() => {
    items, example;
    let cancelled = false, observer;
    tick().then(() => {
      if (cancelled) return;
      const art = document.querySelector('#app .tile .art');
      if (!art) return;
      const measure = () => (across = Math.max(0, art.clientWidth - 2 * IMAGE_INSET));
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(art);
    });
    return () => { cancelled = true; observer?.disconnect(); };
  });
  const spacing = $derived(canvasGridSpacing(
    (items.length ? items : example ? [example] : []).map(item => item.img), across,
  ));
  $effect(() => {
    document.documentElement.style.setProperty('--canvas-grid-step', `${spacing.step}px`);
    return () => document.documentElement.style.removeProperty('--canvas-grid-step');
  });
</script>
