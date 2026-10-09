<script>
  import { onMount } from 'svelte';
  const initialReview = new URLSearchParams(location.search).get('review') === 'open';
  let dialog;
  let mode = $state(document.documentElement.dataset.prototype || 'dock');
  let grid = $state('lines');
  let opaque = $state(false);
  let alpha = $state(false);
  const directions = [
    { id: 'dock', name: '01 / Canvas dock', label: 'Grouped alternative', text: 'A quiet, continuous workspace. One glass control group, with editing panels that give the images room.' },
    { id: 'inspector', name: '02 / Studio rail', label: 'Desktop alternative', text: 'Tools move to the trailing edge on a wide screen. Compare the cost of width against the cost of height.' },
    { id: 'clear', name: '03 / Floating islands', label: 'Recommended', text: 'Two transparent editing islands: colors with Palette, conversion with Style. Download floats separately.' },
  ];
  function apply() {
    const root = document.documentElement;
    root.dataset.prototype = mode;
    root.dataset.grid = grid;
    root.dataset.opaque = String(opaque);
    root.dataset.alpha = String(alpha);
    const params = new URLSearchParams(location.search);
    params.set('prototype', mode);
    history.replaceState(null, '', `${location.pathname}?${params}`);
    window.dispatchEvent(new Event('resize'));
  }
  $effect(apply);
  function sample(kind) {
    window.dispatchEvent(new CustomEvent('bitify-prototype-sample', { detail: kind }));
    dialog.close();
  }
  onMount(() => {
    if (initialReview) dialog.showModal();
  });
</script>

<button class="btn glass-btn prototype-review-button" aria-haspopup="dialog" onclick={() => dialog.showModal()}>Designs</button>
<dialog class="prototype-review" bind:this={dialog} aria-labelledby="prototype-title" onclick={e => e.target === dialog && dialog.close()}>
  <div class="prototype-review-head">
    <div><p class="prototype-eyebrow">BITIFY / DESIGN EXPLORATION</p><h2 id="prototype-title">A canvas, with room to breathe.</h2><p>Three working directions. Same conversion engine, different use of space.</p></div>
    <button class="btn" aria-label="Close design comparison" onclick={() => dialog.close()}>Close</button>
  </div>
  <div class="prototype-directions">
    {#each directions as direction}
      <button class="prototype-direction" aria-pressed={mode === direction.id} onclick={() => { mode = direction.id; }}>
        <span class="prototype-mini" data-direction={direction.id}><span class="mini-header"></span><span class="mini-images"><i></i><i></i><i></i></span><span class="mini-controls"></span></span>
        <span class="prototype-tag">{direction.label}</span><strong>{direction.name}</strong><span>{direction.text}</span>
      </button>
    {/each}
  </div>
  <div class="prototype-review-options">
    <label>Canvas grid<select bind:value={grid}><option value="lines">Fine lines</option><option value="dots">Dots</option><option value="off">Quiet / no grid</option></select></label>
    <label class="prototype-check"><input type="checkbox" bind:checked={opaque} />Solid controls</label>
    <label class="prototype-check"><input type="checkbox" bind:checked={alpha} />Checkerboard comparison</label>
  </div>
  <div class="prototype-samples"><span>Try a workspace</span><button class="btn" onclick={() => sample('single')}>One image</button><button class="btn" onclick={() => sample('batch')}>Six images</button><button class="btn" onclick={() => sample('stress')}>Many images</button><button class="btn" onclick={() => sample('empty')}>Empty</button></div>
  <p class="prototype-note">My recommendation: start with Floating islands. Keep related controls together, the background continuous, and text-heavy panels readable. Studio rail is the serious desktop alternative. GlassKit approximates the material; native iOS refraction and adaptive contrast are separate capabilities.</p>
  <div class="prototype-review-foot"><span>Exploratory worktree · local image processing</span><button class="btn primary" onclick={() => dialog.close()}>Explore this design</button></div>
</dialog>
