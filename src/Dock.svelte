<script module>
  import { analyze, mask, colorize } from './lib/bitify.js';

  const PRESETS = [
    { name: 'Torch', first: '#f6dfa4', second: '#0b0a0c' },
    { name: 'Citron', first: '#262262', second: '#e6f0b4' },
    { name: 'Moss', first: '#1e3a2b', second: '#d7e8a0' },
    { name: 'Plum', first: '#3b1f3f', second: '#f6c7b6' },
    { name: 'Ember', first: '#2a1414', second: '#ff9f45' },
    { name: 'Tide', first: '#0e3b5c', second: '#bfe9e0' },
    { name: 'Rose', first: '#4a0d2b', second: '#ffd1dc' },
    { name: 'Mono', first: '#000000', second: '#ffffff' },
  ];
  const STYLES = [
    ['lines', 'Lines'],
    ['solid', 'Solid'],
    ['checker', 'Checker'],
    ['bayer', 'Bayer'],
    ['atkinson', 'Atkinson'],
    ['silhouette', 'Silhouette'],
  ];

  // A small shaded ball with a stripe, used to preview each style.
  function ball() {
    const s = 14, data = new Uint8ClampedArray(s * s * 4);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const r = Math.hypot(x - 6.5, y - 6.5);
      if (r > 7) continue;
      const shade = Math.hypot(x - 4, y - 3) * 9;
      const l = Math.round(r > 6 ? 25 : y >= 7 && y <= 9 ? 95 - shade * 0.4 : 240 - shade);
      data.set([l, l, l, 255], (y * s + x) * 4);
    }
    return analyze({ width: s, height: s, data });
  }
  const BALL = ball();
</script>

<script>
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';

  let {
    first = $bindable(),
    second = $bindable(),
    style = $bindable(),
    threshold = $bindable(), // null means Auto
    showOriginal = $bindable(),
    count,
    onsaveall,
  } = $props();

  const touch = matchMedia('(pointer:coarse)').matches;
  let panel = $state(null); // null, 'palettes' or 'advanced'
  let dock;

  const hint = $derived(
    style === 'silhouette' ? 'Silhouette ignores the threshold.'
    : threshold === null ? 'Auto picks the best value for each image.'
    : style === 'lines' ? `Color changes stronger than ${threshold} become lines.`
    : `Pixels brighter than ${threshold} turn light.`,
  );

  const toggle = name => (panel = panel === name ? null : name);
  function swap() {
    const was = first;
    first = second;
    second = was;
  }
</script>

<svelte:window
  onpointerdown={e => { if (panel && !dock.contains(e.target)) panel = null; }}
  onkeydown={e => { if (e.key === 'Escape') panel = null; }}
/>

<div class="dock" bind:this={dock}>
  {#if panel === 'palettes'}
    <div class="panel">
      <p class="ptitle">Palettes</p>
      <div class="presets">
        {#each PRESETS as p}
          <button
            class="preset"
            aria-pressed={first === p.first && second === p.second}
            onclick={() => { first = p.first; second = p.second; }}
          >
            <span class="chip" style:background="linear-gradient(135deg, {p.first} 50%, {p.second} 50%)"></span>{p.name}
          </button>
        {/each}
      </div>
    </div>
  {:else if panel === 'advanced'}
    <div class="panel">
      <p class="ptitle">Style</p>
      <div class="presets styles">
        {#each STYLES as [key, name]}
          <button class="preset" aria-pressed={style === key} onclick={() => (style = key)}>
            <Pixels class="demo" pixels={new ImageData(colorize(mask(BALL, key), first, second), BALL.w, BALL.h)} />{name}
          </button>
        {/each}
      </div>
      <label class="ptitle" for="threshold">Threshold</label>
      <div class="trow">
        <input
          id="threshold"
          type="range"
          min="1"
          max="254"
          value={threshold ?? 128}
          oninput={e => (threshold = +e.currentTarget.value)}
        />
        <button class="btn sm" aria-pressed={threshold === null} onclick={() => (threshold = null)}>Auto</button>
      </div>
      <p class="hint">{hint}</p>
      <p class="hint">
        {touch ? 'Hold an image to see its other version.' : 'Hold an image, or hold Space, to see the other version.'}
      </p>
    </div>
  {/if}

  <div class="pair">
    <label class="sw" style:background={first} title="Color for lines and dark pixels">
      <input type="color" bind:value={first} aria-label="Color for lines and dark pixels" />
    </label>
    <button class="ib" onclick={swap} aria-label="Swap colors" title="Swap colors"><PixelIcon name="swap" /></button>
    <label class="sw" style:background={second} title="Color for fill and light pixels">
      <input type="color" bind:value={second} aria-label="Color for fill and light pixels" />
    </label>
  </div>
  <button class="btn" aria-expanded={panel === 'palettes'} aria-label="Palettes" title="Palettes" onclick={() => toggle('palettes')}>
    <PixelIcon name="grid" /><span class="lbl">Palettes</span>
  </button>
  <span class="sep"></span>
  <div class="seg" role="group" aria-label="View">
    <button aria-pressed={showOriginal} onclick={() => (showOriginal = true)}>Original</button>
    <button aria-pressed={!showOriginal} onclick={() => (showOriginal = false)}>Bitified</button>
  </div>
  <span class="sep"></span>
  <button class="btn" aria-expanded={panel === 'advanced'} aria-label="Advanced" title="Advanced" onclick={() => toggle('advanced')}>
    <PixelIcon name="sliders" /><span class="lbl">Advanced</span>
  </button>
  <button class="btn primary" disabled={!count} aria-label="Download all" title="Download all" onclick={onsaveall}>
    <PixelIcon name="save" /><span class="lbl">Download all</span>
  </button>
</div>
