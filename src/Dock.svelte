<script module>
  import { stylePreview } from './lib/style-preview.js';
  import { PRESETS, PALETTE_USES, STYLES, STYLE_USES, isPalette, inOrder } from './lib/presets.js';
  import { SETTINGS, STYLE_SETTINGS, defaults, changed, shown } from './lib/settings.js';


</script>

<script>
  import Pixels from './Pixels.svelte';
  import PalettePreview from './PalettePreview.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { on } from 'svelte/events';
  import { tick } from 'svelte';
  import { sliderDrag } from './lib/gesture.js';
  import { tooltip } from './lib/tooltip.js';
  import { compactPaletteName } from './lib/palette-label.js';

  let {
    first = $bindable(),
    second = $bindable(),
    none = $bindable(), // which color is None: 0 neither, 1 the first, 2 the second
    style = $bindable(),
    settings = $bindable(), // each style's own settings, by style
    showOriginal = $bindable(),
    previewing = false, // a held comparison temporarily inverts the persisted view
    canvasScrollable = false,
    editing = $bindable(false),
    dragging = $bindable(), // whether a slider of the style panel is being dragged
    autos, // [lowest, highest] value Auto is using, for each setting that has an Auto
    soft, // whether an image on the wall has a partly see-through pixel
    family = $bindable('two-color'),
    alphaCut = $bindable(128),
    metric = $bindable('oklab'),
    maxColors = $bindable(0),
    lastMaxColors = $bindable(16),
    fullPalette, fullPresets = [], savedPalettes = [], onpalette, onimportpalette, oneditpalette,
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
  $effect(() => { editing = !!(panel || pop); });
  const effectiveOriginal = $derived(showOriginal !== previewing);
  let dock;
  let eaten = false; // the last press closed something, so its click is dropped too
  // A finger moves a slider through its touch, which stopping the press does not stop.
  // Svelte's own touch listeners are passive and could not stop it either.
  $effect(() => on(window, 'touchstart', e => eaten && e.cancelable && e.preventDefault(), { capture: true, passive: false }));

  // App measures the complete bottom workspace, including editing and file rows.
  let panelHeight = $state(0);

  const styleName = $derived(family === 'full-palette' ? fullPalette.name : STYLES.find(s => s[0] === style)[1]);
  const selectedName = $derived(family === 'full-palette' ? fullPalette.name : PRESETS.find(chosen)?.name ?? 'Custom');
  let showSelectedName = $state(false);
  // Measure the candidate independently of its visibility. Hiding it must not
  // change the fit calculation or trigger a resize/show/hide feedback loop.
  function fitPaletteHeader(node) {
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const controls = node.querySelector('.palette-family-tabs'), actions = node.querySelector('.palette-header-actions');
      const candidate = node.querySelector('.palette-name-measure');
      const gap = parseFloat(getComputedStyle(node).gap) || 0;
      showSelectedName = node.clientWidth >= controls.offsetWidth + actions.offsetWidth + candidate.offsetWidth + gap * 2;
    };
    const observer = new ResizeObserver(measure); observer.observe(node);
    tick().then(measure); document.fonts.ready.then(measure);
    return { update: () => tick().then(measure), destroy: () => { disposed = true; observer.disconnect(); } };
  }
  function paletteRail(node) {
    let disposed = false;
    const mark = () => {
      node.parentNode.classList.toggle('rail-left', node.scrollLeft > 1);
      node.parentNode.classList.toggle('rail-right', node.scrollLeft + node.clientWidth < node.scrollWidth - 1);
    };
    const reveal = () => {
      if (disposed) return;
      const button = node.querySelector('[aria-pressed="true"]');
      if (button) {
        const a = node.getBoundingClientRect(), b = button.getBoundingClientRect();
        const left = node.scrollLeft > 1 ? 36 : 4;
        const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1 ? 36 : 4;
        if (b.left < a.left + left) node.scrollLeft += b.left - a.left - left;
        else if (b.right > a.right - right) node.scrollLeft += b.right - a.right + right;
      }
      mark();
    };
    const observer = new ResizeObserver(reveal); observer.observe(node);
    node.addEventListener('scroll', mark, { passive: true }); tick().then(reveal);
    return { update: () => tick().then(reveal), destroy: () => { disposed = true; observer.disconnect(); node.removeEventListener('scroll', mark); } };
  }
  $effect(() => { family; pop = null; });
  const demo = key => {
    const preview = stylePreview(key, settings[key], first, second, none);
    return new ImageData(preview.data, preview.width, preview.height);
  };

  // The current style's settings: the values, and which settings they are. The threshold has its
  // place on the strip, or Cuts in Stencil, which has no threshold; `rest` is the others.
  const own = $derived(settings[style]);
  // The opacity cut is left out unless an image on the wall has a partly see-through pixel: it
  // changes nothing for any other image. Silhouette then has no settings at all.
  const keys = $derived(STYLE_SETTINGS[style].filter(key => key !== 'alpha' || soft));
  const lead = $derived(['threshold', 'cuts', 'detail'].includes(keys[0]) ? keys[0] : null);
  const rest = $derived(keys.filter(key => key !== lead));
  // One measured label column fits the longest currently visible name, including its changed
  // marker. Short names retain alignment without paying for hidden settings' longer names.
  let labelWidth = $state(0);
  $effect(() => {
    if (!dock) return;
    panel, more, rest, own, chips;
    let cancelled = false, observer;
    tick().then(() => {
      if (cancelled) return;
      const labels = [...dock.querySelectorAll('.setting-label')];
      const measure = () => { labelWidth = Math.ceil(Math.max(0, ...labels.map(el => el.getBoundingClientRect().width))); };
      measure();
      observer = new ResizeObserver(measure);
      labels.forEach(el => observer.observe(el));
    });
    return () => { cancelled = true; observer?.disconnect(); };
  });
  // A wide screen shows the others all at once, in a tray that More opens under the strip.
  let more = $state(false);
  // Compact screens show every setting as a chip, with one control at a time and no More.
  // These are the screens app.css lays out for a phone: 520px wide or less, or 520px high or
  // less and wider than high.
  const compact = matchMedia('(max-width: 520px), (max-height: 520px) and (orientation: landscape)');
  let chips = $state(compact.matches);
  // Android rotation can expose transitional innerWidth/innerHeight values to resize
  // listeners. Read CSS's breakpoint directly rather than retaining those dimensions.
  $effect(() => {
    const update = () => (chips = compact.matches);
    update();
    compact.addEventListener('change', update);
    return () => compact.removeEventListener('change', update);
  });
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
    active, style;
    if (!chipRow) return;
    const refresh = () => {
      chipRow?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      fades();
    };
    refresh();
    const observer = new ResizeObserver(refresh);
    observer.observe(chipRow);
    return () => observer.disconnect();
  });
  // Reset then has nothing to reset and is disabled. Pressed from the keyboard (a click with no
  // press behind it) it would keep the focus, and a disabled button passes no keys on: Space
  // and the arrow keys would go dead. So the focus moves to More, or to the pressed chip.
  function reset(e) {
    settings[style] = defaults(style);
    if (!e.detail) (dock.querySelector('.extra') ?? dock.querySelector('.chip[aria-pressed="true"]'))?.focus();
  }
  function resetPaletteSettings(e) {
    metric = 'oklab'; alphaCut = 128; maxColors = 0; lastMaxColors = 16;
    if (!e.detail) dock.querySelector('[aria-label="Oklab matching"]')?.focus();
  }

  // Source-wide preparation is expensive: keep edits local until the gesture
  // finishes. All takes the existing conversion path without preparation.
  let limitNumber = $state(''), limitRange = $state(16);
  $effect(() => {
    limitNumber = maxColors ? String(maxColors) : '';
    limitRange = maxColors || lastMaxColors;
  });
  function applyLimit(value) {
    if (!Number.isInteger(value) || value < 0 || value > 256) return;
    if (value) lastMaxColors = value;
    maxColors = value;
    limitNumber = value ? String(value) : '';
    limitRange = value || lastMaxColors;
  }
  function finishLimitNumber(e) {
    const box = e.currentTarget;
    if (box.validity.valid && (box.value === '' || Number.isInteger(box.valueAsNumber))) applyLimit(box.value === '' ? 0 : box.valueAsNumber);
    // Restore incomplete/out-of-range edits; they never changed conversion.
    box.value = limitNumber = maxColors ? String(maxColors) : '';
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
    showOriginal = false;
    const was = first;
    first = second;
    second = was;
    none = none && 3 - none; // None goes with its color
  }

  // A palette matches the current colors either way round, and choosing one keeps them the
  // way round they are: dark first, unless Swap has put the lighter color first.
  const chosen = p => isPalette(p, first, second);
  function choose(p) {
    showOriginal = false;
    [first, second] = inOrder(p, first, second);
  }
</script>

<!-- A press outside what is open closes it and does nothing else: only the list of styles
     if it is open, and the panel otherwise. These listen on the way down, so the
     press and the click that follows it never reach what was pressed. -->
<svelte:window
  onpointerdowncapture={e => {
    if (document.querySelector('dialog[open]')) { eaten = false; return; }
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
    if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return;
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
        <button class="glass-segmented__item" aria-pressed={own[key] === value} aria-label={spoken} onclick={() => (own[key] = value)}>{name}</button>
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

<div class="dock glass-card" class:canvas-scrollable={canvasScrollable} style:--setting-label-width={`${labelWidth}px`} bind:this={dock}>
  {#if panel === 'palettes'}
    <div class="panel palette-family-panel glass-card" bind:offsetHeight={panelHeight}>
      <div class="palette-picker-header" use:fitPaletteHeader={selectedName + family}>
        <span class="palette-name-measure" aria-hidden="true">{compactPaletteName(selectedName, 22)}</span>
        <div class="palette-family-tabs glass-segmented" role="group" aria-label="Color system">
          <button class="glass-segmented__item" aria-pressed={family === 'two-color'} onclick={() => family = 'two-color'}>1-bit</button>
          <button class="glass-segmented__item" aria-pressed={family === 'full-palette'} onclick={() => family = 'full-palette'}>Palette</button>
        </div>
        <span class="palette-selected-name" hidden={!showSelectedName} use:tooltip={selectedName}>{compactPaletteName(selectedName, 22)}</span>
        <div class="palette-header-actions">
          {#if family === 'two-color'}
            <span class="seg mini palette-transparency glass-segmented" role="group" aria-label="Transparent color">
              {#each ['Both colors', 'Transparent outlines and dark areas', 'Transparent fills and highlights'] as label, n}
                <button class="glass-segmented__item" aria-pressed={none === n} aria-label={label} use:tooltip={['Draw both colors.', 'Make front color transparent.', 'Make back color transparent.'][n]} onclick={() => { none = n; showOriginal = false; }}><PalettePreview none={n} compact /></button>
              {/each}
            </span>
          {:else}
            <button class="btn glass-btn icon-only" aria-label="Import palette" use:tooltip={'Import a palette from an image, a palette file or pasted hex colors.'} onclick={onimportpalette}><PixelIcon name="import" /></button>
            <button class="btn glass-btn icon-only" aria-label="Edit palette" use:tooltip={fullPalette.id.startsWith('preset-') ? 'Edit a copy of this palette.' : 'Edit this palette or export a HEX backup.'} onclick={() => oneditpalette(fullPalette)}><PixelIcon name="edit" /></button>
          {/if}
        </div>
      </div>
      <div class="palette-rail-wrap">
        <div class="palette-rail" role="group" aria-label={family === 'two-color' ? 'Palettes' : 'Full palettes'} use:paletteRail={family === 'full-palette' ? fullPalette.id : first + second}
          onwheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; } }}>
          {#if family === 'two-color'}
            {#each PRESETS as p, i}
              {#if i > 0 && p.group !== PRESETS[i - 1].group}<span class="palette-group-divider" aria-hidden="true"></span>{/if}
              <button class="palette-choice" aria-pressed={chosen(p)} aria-label={p.name} use:tooltip={`${p.name}: ${PALETTE_USES[p.name]}`} onclick={() => choose(p)}><span class="palette-circle"><PalettePreview first={p.dark} second={p.light}/></span><span class="palette-choice-name">{p.name}</span></button>
            {/each}
          {:else}
            {#each [...fullPresets, ...savedPalettes] as p, i (p.id)}
              {#if i === fullPresets.length && i > 0}
                <span class="palette-library-divider" aria-hidden="true"></span>
              {:else if i > 0 && i < fullPresets.length && p.colors.length !== fullPresets[i - 1].colors.length}
                <span class="palette-group-divider" aria-hidden="true"></span>
              {/if}
              <button class="palette-choice" aria-pressed={fullPalette.id === p.id} aria-label={p.name} use:tooltip={`${p.name} · ${p.colors.length} colors${p.source?.credit ? ' · ' + p.source.credit : ''}`} onclick={() => onpalette(p)}><span class="palette-circle"><PalettePreview colors={p.colors}/></span><span class="palette-choice-name">{p.name}</span></button>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {:else if panel === 'style' && family === 'full-palette'}
    <div class="panel palette-settings-panel glass-card" bind:offsetHeight={panelHeight}>
      <h2 class="palette-method-name">Nearest</h2>
      <div class="palette-setting-row">
        <span class="key" id="palette-matching-label">Matching</span>
        <div class="seg glass-segmented" role="group" aria-labelledby="palette-matching-label">
          <button class="glass-segmented__item" aria-label="Oklab matching" aria-pressed={metric === 'oklab'} use:tooltip={'Compare perceived color differences. Default.'} onclick={() => metric = 'oklab'}>Oklab</button>
          <button class="glass-segmented__item" aria-label="RGB matching" aria-pressed={metric === 'rgb'} use:tooltip={'Compare RGB channel differences.'} onclick={() => metric = 'rgb'}>RGB</button>
        </div>
        <button class="btn glass-btn icon-only" disabled={metric === 'oklab' && alphaCut === 128 && maxColors === 0 && lastMaxColors === 16} aria-label="Reset palette settings" use:tooltip={'Restore Oklab matching, all colors and the default opacity cut.'} onpointerdown={e => e.preventDefault()} onclick={resetPaletteSettings}><PixelIcon name="reset"/></button>
      </div>
      <div class="palette-setting-row palette-limit-row">
        <label class="key" for="full-max-colors">Max colors</label>
        <input id="full-max-colors" class="glass-range" type="range" min="1" max="256" step="1"
          value={limitRange} aria-label="Max colors" aria-valuetext={maxColors === 0 && limitNumber === '' ? 'All colors; move to set a limit' : `${limitRange} colors per image`}
          oninput={e => { limitRange = +e.currentTarget.value; limitNumber = e.currentTarget.value; }}
          onchange={e => applyLimit(+e.currentTarget.value)}
          onpointercancel={() => { limitRange = maxColors || lastMaxColors; limitNumber = maxColors ? String(maxColors) : ''; }} />
        <div class="field palette-limit-field">
          <input class="tnum" type="number" min="1" max="256" step="1" inputmode="numeric" aria-label="Max colors value"
            value={limitNumber} placeholder="—" oninput={e => limitNumber = e.currentTarget.value}
            onchange={finishLimitNumber} onblur={finishLimitNumber}
            onkeydown={e => { if (e.key === 'Enter') { e.preventDefault(); finishLimitNumber(e); } }} />
          <button aria-label="Use all palette colors" aria-pressed={maxColors === 0}
            use:tooltip={'Use all colors. A limit uses fewer colors per image from the selected palette.'} onpointerdown={e => e.preventDefault()} onclick={() => applyLimit(0)}>All</button>
        </div>
      </div>
      {#if soft || alphaCut !== 128}
        <div class="palette-setting-row">
          <label class="key" for="full-alpha-cut">Opacity cut</label>
          <input id="full-alpha-cut" class="glass-range" type="range" min="1" max="255" bind:value={alphaCut} aria-label="Palette opacity cut"/>
          <output for="full-alpha-cut">{alphaCut}</output>
        </div>
      {/if}
    </div>
  {:else if panel === 'style'}
    <div class="panel style-panel glass-card" class:compact={chips} class:bare={!keys.length} bind:offsetHeight={panelHeight}>
      <div class="pick anchor">
        {#if pop === 'styles'}
          <div class="menu glass-card" role="group" aria-label="Style" use:reveal use:styleDividers onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
            {#each STYLES as [key, name]}
              <button class="preset glass-btn" class:group-start={key === 'stencil' || key === 'checker' || key === 'silhouette'} aria-pressed={style === key} use:tooltip={STYLE_USES[key]} onclick={() => { style = key; showOriginal = false; pop = null; }}>
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
      {#if !keys.length}
        <!-- a style with no settings to show: the style button alone, as wide as the panel (.bare in app.css) -->
      {:else if chips}
        <div class="setbox">
          <div class="sets" role="group" aria-label="Settings" bind:this={chipRow} onscroll={fades} onwheel={e => (e.currentTarget.scrollLeft += e.deltaY)}>
            {#each keys as key}
              <button class="chip" class:changed={changed(style, own, [key])}
                aria-label="{SETTINGS[key].label}: {shown(key, own[key], true)}"
                aria-pressed={key === active} onclick={() => (pressed = key)}>
                <span>{SETTINGS[key].label}</span><b>{shown(key, own[key])}</b>
              </button>
            {/each}
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
          <button class="btn extra glass-btn icon-only" aria-expanded={more} aria-label="More settings" use:tooltip={'Show additional settings for the current style.'} onclick={() => (more = !more)}>
            <PixelIcon name="more" />
          </button>
        {/if}
        {#if more && rest.length}
          <div class="adv">
            {#each rest as key}
              <div class="row" class:choice-row={!!SETTINGS[key].options}><span class="key"><span class="setting-label" class:changed={changed(style, own, [key])}>{SETTINGS[key].label}</span></span>{@render control(key)}</div>
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
        <input type="color" bind:value={first} oninput={() => { if (none === 1) none = 0; showOriginal = false; }} aria-label="Color for lines and dark pixels{none === 1 ? ': None' : ''}" />
      </label>
      <button class="ib glass-btn" onclick={swap} aria-label="Swap colors" use:tooltip={'Exchange the two colors, including transparency.'}><PixelIcon name="swap" /></button>
      <label class="sw" class:none={none === 2} style:background={none === 2 ? null : second} use:tooltip={none === 2 ? 'Choose a color to restore fills and highlights.' : 'Choose the color for fills and highlights.'}>
        <input type="color" bind:value={second} oninput={() => { if (none === 2) none = 0; showOriginal = false; }} aria-label="Color for fill and light pixels{none === 2 ? ': None' : ''}" />
      </label>
    </div>
  {/snippet}
  {#snippet paletteButton()}
    <button class="btn glass-btn icon-only" aria-expanded={panel === 'palettes'} aria-label="Palette" use:tooltip={'Choose 1-bit colors or a full palette.'} onclick={() => toggle('palettes')}>
      <PixelIcon name="grid" />
    </button>
  {/snippet}
  {#snippet styleButton()}
    <button class="btn glass-btn icon-only" aria-expanded={panel === 'style'} aria-label={family === 'full-palette' ? 'Palette settings' : 'Style'} use:tooltip={family === 'full-palette' ? 'Adjust color matching, maximum colors and transparency.' : 'Adjust the conversion style and its settings.'} onclick={() => toggle('style')}>
      <PixelIcon name="sliders" />
    </button>
  {/snippet}
  <div class="color-tools tool-group" role="group" aria-label="Colors and palette">
    {#if family === 'full-palette'}
      <button class="full-active-palette glass-btn" onclick={() => toggle('palettes')} aria-label={`Selected palette: ${fullPalette.name}, ${fullPalette.colors.length} ${fullPalette.colors.length === 1 ? 'color' : 'colors'}`} use:tooltip={fullPalette.name}><PalettePreview colors={fullPalette.colors}/></button>
    {:else}{@render colorPair()}{/if}
    {@render paletteButton()}
  </div>
  <span class="sep"></span>
  <div class="style-tools tool-group" role="group" aria-label="Conversion and style">
    <button class="btn glass-btn view-toggle" class:palette-view-toggle={family === 'full-palette'} aria-label="{styleName} conversion" aria-pressed={!effectiveOriginal}
      aria-describedby="view-status"
      use:tooltip={effectiveOriginal ? `Showing original. Click to apply ${styleName}.` : `Showing ${styleName}. Click to compare the original.`}
      onclick={() => (showOriginal = !showOriginal)}>
      <span class="view-state" aria-hidden="true"></span><span class="view-name" aria-hidden="true">{styleName}</span>
    </button>
    {@render styleButton()}
    <span id="view-status" class="view-status">{effectiveOriginal ? 'Showing original images.' : `Showing images converted with ${styleName}.`}</span>
  </div>
</div>


