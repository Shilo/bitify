<script module>
  import { mask, colorize, previewBall } from './lib/bitify.js';
  import { PRESETS, STYLES, isPalette, inOrder } from './lib/presets.js';
  import { SETTINGS, STYLE_SETTINGS, defaults, changed, shown } from './lib/settings.js';

  const BALL = previewBall(); // previews each style
</script>

<script>
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { on } from 'svelte/events';
  import { tick } from 'svelte';
  import { sliderDrag } from './lib/gesture.js';

  let {
    first = $bindable(),
    second = $bindable(),
    style = $bindable(),
    settings = $bindable(), // each style's own settings, by style
    showOriginal = $bindable(),
    dragging = $bindable(), // whether a slider of the style panel is being dragged
    autos, // [lowest, highest] value Auto is using, for each setting that has an Auto
    count,
    onsaveall,
  } = $props();

  let panel = $state(null); // null, 'palettes' or 'style'
  // `dragging` while a slider of the style panel is being dragged and has not come to rest (see
  // sliderDrag). `tick` settles once the wall has redrawn for a move.
  const drag = sliderDrag(now => (dragging = now), tick);
  // Closing the panel takes the slider away, and with it the events that end a drag. So does
  // anything else that changes which sliders show. The drag is ended here too when the dock
  // itself goes, so its timer never outlives it.
  $effect(() => {
    panel, style, more, active, chips; // read, so this runs when any of them changes
    drag.end();
    return drag.end;
  });
  let pop = $state(null); // what is open above the style panel: null or 'styles'
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
  const saveLabel = $derived(count > 1 ? 'Download all' : 'Download');
  const demo = key => new ImageData(colorize(mask(BALL, key, settings[key]), first, second), BALL.w, BALL.h);

  // The current style's settings: the values, and which settings they are. The threshold has its
  // place on the strip; `rest` is the others.
  const own = $derived(settings[style]);
  const keys = $derived(STYLE_SETTINGS[style]);
  const rest = $derived(keys.filter(key => key !== 'threshold'));
  // A wide screen shows the others all at once, in a tray that More opens under the strip.
  let more = $state(false);
  // A phone has no room for that with the images still in view. It shows every setting as a chip
  // and one setting's control at a time: `active`, the chip last pressed, or the first while
  // the style has no such setting.
  // A phone on its side has the width but not the height, and gets the chips too, in one row.
  // These are the screens app.css lays out for a phone: 520px wide or less, or 520px high or
  // less and wider than high.
  let width = $state(innerWidth);
  let height = $state(innerHeight);
  const chips = $derived(width <= 520 || (height <= 520 && width > height));
  // The list of styles is one row that scrolls sideways on a phone on its side. It opens with
  // the current style in view.
  const reveal = list => list.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  let pressed = $state('threshold');
  const active = $derived(keys.includes(pressed) ? pressed : keys[0]);
  function reset() {
    settings[style] = defaults(style);
  }

  // A number box is empty while its setting is on Auto or off, and then shows this instead: what
  // Auto picked (a range when images differ), or the word for off.
  const hint = key => {
    const [low, high] = SETTINGS[key].auto ? autos[key] : [];
    return SETTINGS[key].auto ? (low === high ? `${low}` : `${low}–${high}`) : (SETTINGS[key].zero ?? '');
  };
  const boxed = key => (own[key] === null || (own[key] === 0 && SETTINGS[key].zero) ? '' : own[key]);
  // Typing a number sets the setting. Clearing the box goes back to Auto, or turns off a setting
  // that 0 turns off; for any other setting an empty box changes nothing, and waits for a number.
  function typed(e, key) {
    const box = e.currentTarget, { min, max, auto, zero } = SETTINGS[key];
    if (box.value === '') {
      if (auto) own[key] = null;
      else if (zero) own[key] = 0;
      return;
    }
    own[key] = Math.min(max, Math.max(min, Math.round(+box.value)));
    box.value = boxed(key);
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

<!-- A press outside what is open closes it and does nothing else: only the list of styles
     if it is open, and the panel otherwise. These listen on the way down, so the
     press and the click that follows it never reach what was pressed. -->
<svelte:window
  bind:innerWidth={width}
  bind:innerHeight={height}
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

<!-- One setting's control: a few buttons to choose between, or a slider with a number box, joined
     to an Auto button where the setting has an Auto. -->
{#snippet control(key)}
  {@const { label, options, min, max, auto } = SETTINGS[key]}
  {#if options}
    <div class="seg" role="group" aria-label={label}>
      {#each options as [value, name]}
        <button aria-pressed={own[key] === value} onclick={() => (own[key] = value)}>{name}</button>
      {/each}
    </div>
  {:else}
    <input
      type="range"
      {min}
      {max}
      aria-label={label}
      value={own[key] ?? Math.round((autos[key][0] + autos[key][1]) / 2)}
      onpointerdown={drag.press}
      oninput={e => { own[key] = +e.currentTarget.value; drag.move(); }}
      onchange={drag.end}
      onpointerup={drag.end}
      onpointercancel={drag.end}
      onblur={drag.end}
    />
    <div class="field">
      <input
        class="tnum"
        type="number"
        {min}
        {max}
        aria-label="{label} value"
        value={boxed(key)}
        placeholder={hint(key)}
        style:--chars={boxed(key) === '' ? Math.max(3, hint(key).length) : 3}
        oninput={e => typed(e, key)}
        onblur={e => (e.currentTarget.value = boxed(key))}
      />
      {#if auto}
        <button aria-pressed={own[key] === null} title="Auto {label.toLowerCase()}" onclick={() => (own[key] = null)}>Auto</button>
      {/if}
    </div>
  {/if}
{/snippet}

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
          <div class="menu" role="group" aria-label="Style" use:reveal onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
            {#each STYLES as [key, name]}
              <button class="preset" aria-pressed={style === key} onclick={() => { style = key; showOriginal = false; pop = null; }}>
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
      {#if chips}
        <div class="sets" role="group" aria-label="Settings" onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
          {#each keys as key}
            <button
              class="chip"
              class:changed={changed(style, own, [key])}
              aria-pressed={key === active}
              onclick={e => { pressed = key; e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
            >
              <span>{SETTINGS[key].label}</span><b>{shown(key, own[key])}</b>
            </button>
          {/each}
        </div>
        <div class="thr">
          {@render control(active)}
          <button class="ib" disabled={!changed(style, own)} aria-label="Reset {styleName}" title="Reset {styleName}" onclick={reset}><PixelIcon name="reset" /></button>
        </div>
      {:else}
        <span class="sep"></span>
        {#if keys[0] === 'threshold'}
          <div class="thr">{@render control('threshold')}</div>
        {:else}
          <span class="grow"></span>
        {/if}
        <button class="btn extra" aria-expanded={more} aria-label="More settings" title="More settings" onclick={() => (more = !more)}>
          More{#if changed(style, own, rest)}<span class="dot"></span>{/if}<PixelIcon name="caret" />
        </button>
        {#if more}
          <div class="adv">
            {#each rest as key}
              <div class="row"><span class="key">{SETTINGS[key].label}</span>{@render control(key)}</div>
            {/each}
            <div class="foot">
              <span>{styleName} keeps these for itself.</span>
              <button class="btn" disabled={!changed(style, own)} onclick={reset}>Reset</button>
            </div>
          </div>
        {/if}
      {/if}
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
  <!-- Only two or more images are "all". One saves as the file itself, not a zip. -->
  <button class="btn primary" disabled={!count} aria-label={saveLabel} title={saveLabel} onclick={onsaveall}>
    <PixelIcon name="save" /><span class="lbl">{saveLabel}</span>
  </button>
</div>
