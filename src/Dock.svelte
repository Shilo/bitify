<script module>
  import { mask, colorize, previewBall } from './lib/bitify.js';
  import { PRESETS, STYLES, isPalette, inOrder } from './lib/presets.js';

  const BALL = previewBall(); // previews each style
</script>

<script>
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { on } from 'svelte/events';

  let {
    first = $bindable(),
    second = $bindable(),
    style = $bindable(),
    threshold = $bindable(), // null means Auto
    showOriginal = $bindable(),
    autoRange, // [lowest, highest] threshold Auto is using
    count,
    onsaveall,
  } = $props();

  const touch = matchMedia('(pointer:coarse)').matches;
  let panel = $state(null); // null, 'palettes' or 'style'
  let pop = $state(null); // what is open above the style panel: null, 'styles' or 'help'
  let dock;
  let eaten = false; // the last press closed something, so its click is dropped too
  // A finger moves a slider through its touch, which stopping the press does not stop.
  // Svelte's own touch listeners are passive and could not stop it either.
  $effect(() => on(window, 'touchstart', e => eaten && e.cancelable && e.preventDefault(), { capture: true, passive: false }));

  // A panel does not cover the wall: while one is open the wall gives up that much room and
  // refits above it (see --panel-space in app.css).
  let panelHeight = $state(0);
  $effect(() => {
    document.documentElement.style.setProperty('--panel-space', panel ? `${panelHeight + 10}px` : '0px');
  });

  const styleName = $derived(STYLES.find(s => s[0] === style)[1]);
  const demo = key => new ImageData(colorize(mask(BALL, key), first, second), BALL.w, BALL.h);

  // What Auto picked, shown in the number box while it is empty: a range when images differ.
  const autoShown = $derived(autoRange[0] === autoRange[1] ? `${autoRange[0]}` : `${autoRange[0]}–${autoRange[1]}`);

  // Typing a number sets the threshold; clearing the box goes back to Auto.
  function typed(e) {
    const box = e.currentTarget;
    if (box.value === '') threshold = null;
    else box.value = threshold = Math.min(254, Math.max(1, Math.round(+box.value)));
  }

  const toggle = name => (panel = panel === name ? null : name);
  function swap() {
    const was = first;
    first = second;
    second = was;
  }

  // A palette matches the current colors either way round, and choosing one keeps them the
  // way round they are: dark first, unless Swap has put the lighter color first.
  const chosen = p => isPalette(p, first, second);
  function choose(p) {
    [first, second] = inOrder(p, first, second);
  }
  // The palettes scroll sideways. They open scrolled to the chosen one, and the panel is marked
  // with the sides that have more to scroll to, which app.css shows as a fade with an arrow.
  function scroller(row) {
    const chips = row.querySelector('.chips');
    const mark = () => {
      row.parentNode.classList.toggle('more-left', row.scrollLeft > 1);
      row.parentNode.classList.toggle('more-right', row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    };
    // The chips go in two rows when one row does not fit, so more of them show at once. app.css
    // keeps them in one row on a screen too short to spare the height.
    const fit = () => {
      chips.classList.remove('two');
      chips.classList.toggle('two', row.scrollWidth > row.clientWidth + 1);
      mark();
    };
    fit();
    const chip = row.querySelector('[aria-pressed="true"]');
    if (chip) row.scrollLeft = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.addEventListener('scroll', mark, { passive: true });
    // the window, not the row: once in two rows the row no longer changes size as the window widens
    addEventListener('resize', fit);
    return { destroy: () => removeEventListener('resize', fit) };
  }
</script>

<!-- A press outside what is open closes it and does nothing else: only the list of styles or
     the help if one is open, and the panel otherwise. These listen on the way down, so the
     press and the click that follows it never reach what was pressed. -->
<svelte:window
  onpointerdowncapture={e => {
    eaten = pop ? !e.target.closest?.('.anchor') : !!panel && !dock.contains(e.target);
    if (!eaten) return;
    if (pop) pop = null;
    else panel = null;
    e.stopPropagation();
    e.preventDefault();
  }}
  onclickcapture={e => {
    if (!eaten || !e.detail) return; // a click from the keyboard has no press to belong to
    eaten = false;
    e.stopPropagation();
    e.preventDefault();
  }}
  onkeydown={e => {
    if (e.key !== 'Escape') return;
    if (pop) pop = null;
    else panel = null;
  }}
/>

<div class="dock" bind:this={dock}>
  {#if panel === 'palettes'}
    <div class="panel fit" bind:offsetHeight={panelHeight}>
      <!-- The scrolling box fills the panel, so a swipe anywhere on the panel moves the palettes.
           A mouse wheel moves them too, since there is no scrollbar to drag. -->
      <div class="pals" use:scroller onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
        <span class="pname"><span class="key">Palette</span> {PRESETS.find(chosen)?.name ?? 'Custom'}</span>
        <div class="chips" role="group" aria-label="Palettes" style:--cols={Math.ceil(PRESETS.length / 2)}>
          {#each PRESETS as p, i}
            {#if i && i % 4 === 0}<span class="sep"></span>{/if}
            <button
              class="pal"
              aria-pressed={chosen(p)}
              aria-label={p.name}
              title={p.name}
              style:background="linear-gradient(135deg, {p.dark} 50%, {p.light} 50%)"
              onclick={() => choose(p)}
            ></button>
          {/each}
        </div>
      </div>
    </div>
  {:else if panel === 'style'}
    <div class="panel" bind:offsetHeight={panelHeight}>
      <div class="pick anchor">
        {#if pop === 'styles'}
          <div class="menu" role="group" aria-label="Style">
            {#each STYLES as [key, name]}
              <button class="preset" aria-pressed={style === key} onclick={() => { style = key; pop = null; }}>
                <Pixels class="demo" pixels={demo(key)} />{name}
              </button>
            {/each}
          </div>
        {/if}
        <span class="key" id="style-label">Style</span>
        <button class="btn" aria-labelledby="style-label style-name" aria-expanded={pop === 'styles'} aria-haspopup="true" onclick={() => (pop = pop === 'styles' ? null : 'styles')}>
          <Pixels class="demo" pixels={demo(style)} /><span id="style-name">{styleName}</span><PixelIcon name="caret" />
        </button>
      </div>
      <span class="sep"></span>
      <div class="thr">
        <input
          id="threshold"
          type="range"
          min="1"
          max="254"
          aria-label="Threshold"
          value={threshold ?? Math.round((autoRange[0] + autoRange[1]) / 2)}
          oninput={e => (threshold = +e.currentTarget.value)}
        />
        <div class="field">
          <input
            class="tnum"
            type="number"
            min="1"
            max="254"
            aria-label="Threshold value"
            value={threshold ?? ''}
            placeholder={autoShown}
            style:--chars={threshold === null ? Math.max(3, autoShown.length) : 3}
            oninput={typed}
          />
          <button aria-pressed={threshold === null} title="Auto threshold" onclick={() => (threshold = null)}>Auto</button>
        </div>
      </div>
      <span class="sep"></span>
      <div class="anchor">
        {#if pop === 'help'}
          <div class="tip" id="help" role="tooltip">
            <p>
              {#if style === 'silhouette'}
                Silhouette ignores the threshold.
              {:else if threshold === null}
                Auto picks the best value for each image.
              {:else if style === 'lines'}
                Color changes stronger than <b>{threshold}</b> become lines.
              {:else if style === 'cutout'}
                Parts brighter than <b>{threshold}</b> are filled.
              {:else}
                Pixels brighter than <b>{threshold}</b> turn light.
              {/if}
            </p>
            <p>
              {#if touch}
                <b>Hold</b> an image to see its other version.
              {:else}
                <b>Hold</b> an image, or hold <kbd>Space</kbd>, to see the other version.
              {/if}
            </p>
            {#if touch}
              <p><b>Swipe up or down</b> to change the style.</p>
              <p><b>Swipe left or right</b> to change the palette.</p>
            {:else}
              <p><b>Scroll</b> to change the style.</p>
              <p><b>Hold <kbd>Shift</kbd> and scroll</b> to change the palette.</p>
            {/if}
          </div>
        {/if}
        <button class="btn sm" aria-expanded={pop === 'help'} aria-describedby="help" aria-label="Help" title="Help" onclick={() => (pop = pop === 'help' ? null : 'help')}>?</button>
      </div>
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
  <button class="btn" aria-expanded={panel === 'palettes'} aria-label="Palette" title="Palette" onclick={() => toggle('palettes')}>
    <PixelIcon name="grid" /><span class="lbl">Palette</span>
  </button>
  <span class="sep"></span>
  <!-- The bitified half is named after the style, so the style in use always shows. -->
  <div class="seg" role="group" aria-label="View">
    <button aria-pressed={showOriginal} onclick={() => (showOriginal = true)}>Original</button>
    <button aria-pressed={!showOriginal} aria-label="Bitified: {styleName}" title="Bitified: {styleName}" onclick={() => (showOriginal = false)}>{styleName}</button>
  </div>
  <button class="btn" aria-expanded={panel === 'style'} aria-label="Style" title="Style" onclick={() => toggle('style')}>
    <PixelIcon name="sliders" /><span class="lbl">Style</span>
  </button>
  <span class="sep"></span>
  <button class="btn primary" disabled={!count} aria-label="Download all" title="Download all" onclick={onsaveall}>
    <PixelIcon name="save" /><span class="lbl">Download all</span>
  </button>
</div>
