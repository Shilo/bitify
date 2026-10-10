<script module>
  import { mask, colorize, previewBall } from './lib/bitify.js';
  import { PRESETS, PALETTE_USES, STYLES, STYLE_USES, isPalette, inOrder, inks } from './lib/presets.js';
  import { SETTINGS, STYLE_SETTINGS, defaults, changed, shown } from './lib/settings.js';

  const BALL = previewBall(); // previews each style
</script>

<script>
  import Pixels from './Pixels.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { on } from 'svelte/events';
  import { tick } from 'svelte';
  import { sliderDrag } from './lib/gesture.js';
  import { tooltip } from './lib/tooltip.js';

  let {
    first = $bindable(),
    second = $bindable(),
    none = $bindable(), // which color is None: 0 neither, 1 the first, 2 the second
    style = $bindable(),
    settings = $bindable(), // each style's own settings, by style
    showOriginal = $bindable(),
    dragging = $bindable(), // whether a slider of the style panel is being dragged
    autos, // [lowest, highest] value Auto is using, for each setting that has an Auto
    soft, // whether an image on the wall has a partly see-through pixel
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

  // Reserve the complete editing stack, including the chooser, above the islands.
  // Measurements include safe-area padding; no continuous image-layout animation.
  let panelHeight = $state(0);
  $effect(() => {
    if (!dock) return;
    panel, pop, more, width, height, panelHeight;
    let cancelled = false, observer;
    const root = document.documentElement;
    const measure = () => {
      if (cancelled) return;
      const area = document.getElementById('app').getBoundingClientRect();
      const dockBounds = dock.getBoundingClientRect();
      const bounds = [dock, ...dock.querySelectorAll('.panel, .menu, .tray')].map(el => el.getBoundingClientRect());
      const top = Math.min(...bounds.map(rect => rect.top));
      const header = document.querySelector('.bar').getBoundingClientRect();
      const panelTop = Math.min(dockBounds.top, ...[...dock.querySelectorAll('.panel')].map(el => el.getBoundingClientRect().top));
      root.style.setProperty('--canvas-header-space', `${header.bottom - area.top}px`);
      root.style.setProperty('--canvas-panel-base', `${area.bottom - panelTop + 16}px`);
      root.style.setProperty('--dock-base', `${Math.max(0, area.bottom - dockBounds.top + 16)}px`);
      root.style.setProperty('--panel-space', `${Math.max(0, dockBounds.top - top + (panel ? 12 : 0))}px`);
    };
    tick().then(() => {
      if (cancelled) return;
      measure();
      observer = new ResizeObserver(measure);
      for (const el of [dock, ...dock.querySelectorAll('.panel, .menu, .tray')]) observer.observe(el);
    });
    return () => { cancelled = true; observer?.disconnect(); };
  });

  const styleName = $derived(STYLES.find(s => s[0] === style)[1]);
  const saveLabel = $derived(count > 1 ? 'Download all' : 'Download');
  const demo = key => new ImageData(colorize(mask(BALL, key, settings[key]), ...inks(first, second, none, key)), BALL.w, BALL.h);

  // The current style's settings: the values, and which settings they are. The threshold has its
  // place on the strip, or Cuts in Stencil, which has no threshold; `rest` is the others.
  const own = $derived(settings[style]);
  // The opacity cut is left out unless an image on the wall has a partly see-through pixel: it
  // changes nothing for any other image. Silhouette then has no settings at all.
  const keys = $derived(STYLE_SETTINGS[style].filter(key => key !== 'alpha' || soft));
  const lead = $derived(['threshold', 'cuts', 'detail'].includes(keys[0]) ? keys[0] : null);
  const rest = $derived(keys.filter(key => key !== lead));
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
  // Decorative group boundaries belong between neighbors, never at a wrapped row's edge.
  const styleDividers = list => {
    const starts = list.querySelectorAll('.group-start');
    const update = () => {
      const first = list.firstElementChild.offsetLeft;
      for (const button of starts) button.classList.toggle('with-divider', button.offsetLeft > first);
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    update();
    return { destroy: () => observer.disconnect() };
  };
  let pressed = $state('threshold');
  const active = $derived(keys.includes(pressed) ? pressed : keys[0]);
  // The pressed chip is the only thing that says which setting the control below belongs to, so
  // it is kept in view: when the panel opens, when another style brings other chips, and when
  // it is pressed while half out of sight.
  let chipRow = $state();
  // The box around the row is marked with the sides that have more chips to scroll to, which
  // app.css shows as a short fade with an arrow, as it does for the palettes.
  function fades() {
    if (!chipRow) return;
    chipRow.parentNode.classList.toggle('more-left', chipRow.scrollLeft > 1);
    chipRow.parentNode.classList.toggle('more-right', chipRow.scrollLeft + chipRow.clientWidth < chipRow.scrollWidth - 1);
  }
  $effect(() => {
    active, style, width, height; // read, so this runs when any of them changes
    chipRow?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    fades();
  });
  // Reset then has nothing to reset and is disabled. Pressed from the keyboard (a click with no
  // press behind it) it would keep the focus, and a disabled button passes no keys on: Space
  // and the arrow keys would go dead. So the focus moves to More, or to the pressed chip.
  function reset(e) {
    settings[style] = defaults(style);
    if (!e.detail) (dock.querySelector('.extra') ?? dock.querySelector('.chip[aria-pressed="true"]'))?.focus();
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
    if (box.validity.badInput) return; // a number half typed, such as a lone minus sign, also reads as empty
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
    none = none && 3 - none; // None goes with its color
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
    const chip = row.querySelector('.pal[aria-pressed="true"]');
    if (chip) row.scrollLeft += chip.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - chip.offsetWidth) / 2;
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
    <div class="seg glass-segmented" role="group" aria-label={label}>
      {#each options as [value, name, spoken]}
        <button aria-pressed={own[key] === value} aria-label={spoken} onclick={() => (own[key] = value)}>{name}</button>
      {/each}
    </div>
  {:else}
    <input
      type="range" class="glass-range"
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
        <button aria-pressed={own[key] === null} use:tooltip={`Calculate ${label.toLowerCase()} automatically from each image.`} onclick={() => (own[key] = null)}>Auto</button>
      {/if}
    </div>
  {/if}
{/snippet}

<div class="dock glass-card" bind:this={dock}>
  {#if panel === 'palettes'}
    <div class="panel fit glass-card" bind:offsetHeight={panelHeight} onwheel={e => (e.currentTarget.querySelector('.pals').scrollLeft += e.deltaY)}>
      <!-- The name/transparency controls stay fixed beside the swatches. A mouse wheel
           anywhere in the panel scrolls the swatches, which have no visible scrollbar. -->
      <span class="pname">
        <span class="title"><span class="key">Palette</span> {PRESETS.find(chosen)?.name ?? 'Custom'}</span>
        <!-- Which color is None, if either. It is no palette, so it sits with the name, apart from
             the palettes: a small switch of three pictures, both colors and each color gone
             (.seg.mini and .glyph in app.css). -->
        <span class="seg mini glass-segmented" role="group" aria-label="Transparent color">
          {#each [['Both colors', ''], ['No color for lines and dark pixels', ' first'], ['No color for fill and light pixels', ' second']] as [label, half], n}
            <button aria-pressed={none === n} aria-label={label} use:tooltip={['Draw both colors without making either transparent.', 'Make outlines and dark areas transparent.', 'Make fills and highlights transparent.'][n]} onclick={() => (none = n)}><span class="glyph{half}"></span></button>
          {/each}
        </span>
      </span>
      <div class="pals" use:scroller>
        <div class="chips" role="group" aria-label="Palettes" style:--cols={Math.ceil(PRESETS.length / 2)}>
          {#each PRESETS as p, i}
            {#if i && i % 4 === 0}<span class="sep"></span>{/if}
            <button
              class="pal"
              aria-pressed={chosen(p)}
              aria-label={p.name}
              use:tooltip={`${p.name}: ${PALETTE_USES[p.name]}`}
              style:background="linear-gradient(135deg, {p.dark} 50%, {p.light} 50%)"
              onclick={() => choose(p)}
            ></button>
          {/each}
        </div>
      </div>
    </div>
  {:else if panel === 'style'}
    <div class="panel glass-card" class:bare={chips && !keys.length} bind:offsetHeight={panelHeight}>
      <div class="pick anchor">
        {#if pop === 'styles'}
          <div class="menu glass-card" role="group" aria-label="Style" use:reveal use:styleDividers onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
            {#each STYLES as [key, name]}
              <button class="preset" class:group-start={key === 'stencil' || key === 'checker' || key === 'silhouette'} aria-pressed={style === key} use:tooltip={STYLE_USES[key]} onclick={() => { style = key; showOriginal = false; pop = null; }}>
                <Pixels class="demo" pixels={demo(key)} />{name}
              </button>
            {/each}
          </div>
        {/if}
        <span class="key" id="style-label">Style</span>
        <button class="btn glass-btn" aria-labelledby="style-label style-name" aria-expanded={pop === 'styles'} aria-haspopup="true" use:tooltip={'Choose how images are converted into two colors.'} onclick={() => (pop = pop === 'styles' ? null : 'styles')}>
          <Pixels class="demo" pixels={demo(style)} /><span id="style-name">{styleName}</span><PixelIcon name="caret" />
        </button>
      </div>
      {#if chips && !keys.length}
        <!-- a style with no settings to show: the style button alone, as wide as the panel (.bare in app.css) -->
      {:else if chips}
        <div class="setbox">
        <div class="sets" role="group" aria-label="Settings" bind:this={chipRow} onscroll={fades} onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
          {#each keys as key}
            <button
              class="chip"
              class:changed={changed(style, own, [key])}
              aria-label="{SETTINGS[key].label}: {shown(key, own[key], true)}"
              aria-pressed={key === active}
              onclick={() => (pressed = key)}
            >
              <span>{SETTINGS[key].label}</span><b>{shown(key, own[key])}</b>
            </button>
          {/each}
          <!-- Reset ends the row, and not the control's, which needs its whole width on a narrow phone. -->
          <button class="chip reset" disabled={!changed(style, own, keys)} aria-label="Reset {styleName}" use:tooltip={'Restore this style’s default settings.'} onclick={reset}>
            <PixelIcon name="reset" />Reset
          </button>
        </div>
        </div>
        <div class="thr">{@render control(active)}</div>
      {:else}
        <span class="sep"></span>
        {#if lead}
          <div class="thr">{@render control(lead)}</div>
        {:else}
          <span class="grow"></span>
        {/if}
        {#if rest.length}
          <button class="btn extra glass-btn" aria-expanded={more} aria-label="More settings" use:tooltip={'Show additional settings for the current style.'} onclick={() => (more = !more)}>
            <PixelIcon name="more" />
          </button>
        {/if}
        {#if more && rest.length}
          <div class="adv">
            {#each rest as key}
              <div class="row"><span class="key" class:changed={changed(style, own, [key])}>{SETTINGS[key].label}</span>{@render control(key)}</div>
            {/each}
            <div class="foot">
              <button class="btn glass-btn" disabled={!changed(style, own, keys)} aria-label="Reset {styleName}" use:tooltip={'Restore this style’s default settings.'} onclick={reset}><PixelIcon name="reset" />Reset</button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  {#snippet colorPair()}
    <div class="pair">
      <!-- A color that is None shows no color (.sw.none in app.css). Its picker still opens, on the
           color it had, and choosing one there brings the color back. -->
      <label class="sw" class:none={none === 1} style:background={none === 1 ? null : first} use:tooltip={none === 1 ? 'Choose a color to restore outlines and dark areas.' : 'Choose the color for outlines and dark areas.'}>
        <input type="color" bind:value={first} oninput={() => none === 1 && (none = 0)} aria-label="Color for lines and dark pixels{none === 1 ? ': None' : ''}" />
      </label>
      <button class="ib" onclick={swap} aria-label="Swap colors" use:tooltip={'Exchange the two colors, including transparency.'}><PixelIcon name="swap" /></button>
      <label class="sw" class:none={none === 2} style:background={none === 2 ? null : second} use:tooltip={none === 2 ? 'Choose a color to restore fills and highlights.' : 'Choose the color for fills and highlights.'}>
        <input type="color" bind:value={second} oninput={() => none === 2 && (none = 0)} aria-label="Color for fill and light pixels{none === 2 ? ': None' : ''}" />
      </label>
    </div>
  {/snippet}
  {#snippet paletteButton()}
    <button class="btn glass-btn" aria-expanded={panel === 'palettes'} aria-label="Palette" use:tooltip={'Choose a color pair or make one color transparent.'} onclick={() => toggle('palettes')}>
      <PixelIcon name="grid" /><span class="lbl">Palette</span>
    </button>
  {/snippet}
  {#snippet styleButton()}
    <button class="btn glass-btn" aria-expanded={panel === 'style'} aria-label="Style" use:tooltip={'Adjust the conversion style and its settings.'} onclick={() => toggle('style')}>
      <PixelIcon name="sliders" /><span class="lbl">Style</span>
    </button>
  {/snippet}
  <div class="color-tools tool-group" role="group" aria-label="Colors and palette">
    {@render colorPair()}
    {@render paletteButton()}
  </div>
  <span class="sep"></span>
  <div class="style-tools tool-group" role="group" aria-label="Conversion and style">
    <button class="btn glass-btn view-toggle" aria-label="{styleName} conversion" aria-pressed={!showOriginal}
      aria-describedby="view-status"
      use:tooltip={showOriginal ? `Showing original. Click to apply ${styleName}.` : `Showing ${styleName}. Click to compare the original.`}
      onclick={() => (showOriginal = !showOriginal)}>
      <span class="view-state" aria-hidden="true"></span><span>{styleName}</span>
    </button>
    {@render styleButton()}
    <span id="view-status" class="view-status">{showOriginal ? 'Showing original images.' : `Showing images converted with ${styleName}.`}</span>
  </div>
  <span class="sep"></span>
  <!-- Only two or more images are "all". One saves as the file itself, not a zip. -->
  <button class="btn primary glass-btn" disabled={!count} aria-label={saveLabel} use:tooltip={count > 1 ? 'Save every image in a ZIP archive.' : count ? 'Save the image at its original size.' : 'Add an image to enable saving.'} onclick={onsaveall}>
    <PixelIcon name="save" /><span class="lbl">{saveLabel}</span>
  </button>
</div>
