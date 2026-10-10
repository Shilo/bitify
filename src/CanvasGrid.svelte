<script>
  import { tick } from 'svelte';
  import { IMAGE_INSET } from './lib/workspace.js';
  import { canvasGridSpacing, canvasGridOrigin, canvasGridAnchor } from './lib/canvas-grid.js';
  let { items, example } = $props();
  const anchor = canvasGridAnchor();
  const sources = $derived(items.length ? items : example ? [example] : []);
  // Reanalysis, style changes and GIF frames do not change the workspace identity.
  const key = $derived(sources.map(item => `${item.id}:${item.img.w}x${item.img.h}`).join('|'));
  $effect(() => {
    key;
    let cancelled = false, art, surface, firstFrame, secondFrame;
    const paint = placement => {
      if (!placement) return;
      const root = document.documentElement.style;
      root.setProperty('--canvas-grid-step', `${placement.spacing.step}px`);
      root.setProperty('--canvas-grid-x', `${placement.x}px`);
      root.setProperty('--canvas-grid-y', `${placement.y}px`);
    };
    const measure = () => {
      if (!art?.isConnected || cancelled) return;
      const canvas = art.querySelector('canvas');
      const source = sources[0]?.img;
      const across = art.clientWidth - 2 * IMAGE_INSET;
      if (!canvas || !source || across <= 0) return;
      paint(anchor.update({
        key,
        viewport: `${window.innerWidth}x${window.innerHeight}:${window.visualViewport?.width ?? 0}x${window.visualViewport?.height ?? 0}`,
        origin: canvasGridOrigin(canvas.getBoundingClientRect(), source),
        spacing: canvasGridSpacing(sources.map(item => item.img), across),
      }));
    };
    // Two frames let ResizeObserver-driven fitting settle before an initial or
    // resized viewport anchor is captured. Tool-only refits keep that anchor.
    const schedule = () => {
      cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame);
      firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(measure); });
    };
    const observer = new ResizeObserver(schedule);
    const connect = () => {
      if (cancelled) return;
      const next = document.querySelector('#app .grid .tile .art, #app .empty .tile .art');
      if (next !== art) {
        art = next; surface = art?.closest('.grid,.empty');
        observer.disconnect();
        for (const node of [art, surface, document.querySelector('#app .bar')]) if (node) observer.observe(node);
      }
      schedule();
    };
    // Observe structure only: canvas pixel/frame writes never schedule a measure.
    const children = new MutationObserver(connect);
    children.observe(document.querySelector('#app'), { childList: true, subtree: true });
    tick().then(connect);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelled = true; observer.disconnect(); children.disconnect();
      cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  });
  $effect(() => () => {
    for (const property of ['--canvas-grid-step', '--canvas-grid-x', '--canvas-grid-y']) document.documentElement.style.removeProperty(property);
  });
</script>
