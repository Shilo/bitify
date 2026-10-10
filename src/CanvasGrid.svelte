<script>
  import { tick } from 'svelte';
  import { IMAGE_INSET } from './lib/workspace.js';
  import { canvasGridSpacing, canvasGridOrigin } from './lib/canvas-grid.js';
  let { items, example } = $props();
  let across = $state(0);
  let origin = $state({ x: 0, y: 0 });
  // Every fitted tile shares one square width; observe only the first art surface.
  // This also measures the differently sized example on an empty workspace.
  $effect(() => {
    items, example;
    let cancelled = false, observer, stop;
    tick().then(() => {
      if (cancelled) return;
      const art = document.querySelector('#app .tile .art');
      if (!art) return;
      const measure = () => {
        across = Math.max(0, art.clientWidth - 2 * IMAGE_INSET);
        const source = (items[0] ?? example)?.img;
        const canvas = art.querySelector('canvas');
        if (source && canvas) origin = canvasGridOrigin(canvas.getBoundingClientRect(), source);
      };
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(art);
      // Header reflow and tile centering can move an unchanged image box.
      for (const node of [art.parentElement.parentElement, document.querySelector('#app .bar')]) {
        if (node) observer.observe(node);
      }
      document.addEventListener('scroll', measure, true);
      window.addEventListener('resize', measure);
      window.visualViewport?.addEventListener('resize', measure);
      stop = () => {
        document.removeEventListener('scroll', measure, true);
        window.removeEventListener('resize', measure);
        window.visualViewport?.removeEventListener('resize', measure);
      };
    });
    return () => { cancelled = true; observer?.disconnect(); stop?.(); };
  });
  const spacing = $derived(canvasGridSpacing(
    (items.length ? items : example ? [example] : []).map(item => item.img), across,
  ));
  $effect(() => {
    document.documentElement.style.setProperty('--canvas-grid-step', `${spacing.step}px`);
    document.documentElement.style.setProperty('--canvas-grid-x', `${origin.x}px`);
    document.documentElement.style.setProperty('--canvas-grid-y', `${origin.y}px`);
    return () => {
      for (const property of ['--canvas-grid-step', '--canvas-grid-x', '--canvas-grid-y']) document.documentElement.style.removeProperty(property);
    };
  });
</script>
