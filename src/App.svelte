<script>
  import { SvelteMap } from 'svelte/reactivity';
  import { analyze, mask, hexToRgb, autoThreshold, spritesOf } from './lib/recolor.js';
  import { unify } from './lib/recolor.js';
  import { saveOne, saveAll, copyOne, pngBlob, downloadName, fileBytes } from './lib/save.js';
  import { convertedAnimation } from './lib/converted-animation.js';
  import { analysisMatches, reanalyzeItem, reanalyzeItems } from './lib/image-reanalysis.js';
  import { fitImageWall, IMAGE_INSET } from './lib/workspace.js';
  import { restore } from './lib/settings.js';
  import { readStoredValue } from './lib/storage-migration.js';
  import { STYLES, inOrder, inks, stepStyle, stepPalette } from './lib/presets.js';
  import { wheelSteps } from './lib/gesture.js';
  import { on } from 'svelte/events';
  import { tick, untrack } from 'svelte';
  import { createExportDrag, isMobileExportDevice } from './lib/export-drag.js';
  import { imageGesture } from './lib/image-gesture.js';
  import { backdropDismiss } from './lib/dialog-dismiss.js';
  import { isInternalDrag, trackInternalDrag } from './lib/internal-drag.js';
  import { hasImageDrop, droppedImages, fetchDroppedImage } from './lib/image-drop.js';
  import { decodeImageFile } from './lib/image-decode.js';
  import CanvasGrid from './CanvasGrid.svelte';
  import Dock from './Dock.svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import ImageViewer from './ImageViewer.svelte';
  import PaletteImport from './PaletteImport.svelte';
  import { FULL_PRESETS, DEFAULT_FULL_PALETTE, GENERATED_PALETTE, GENERATED_PALETTE_ID, LIBRARY_KEY, restoreLibrary, savePalette, deletePalette, newPaletteName } from './lib/palette-library.js';
  import { captureGeneratedWallSources } from './lib/palette-generated-sources.js';
  import { preparePalette } from './lib/quantize.js';
  import { effectiveAlphaCut } from './lib/palette-alpha.js';
  import { restorePaletteState, conversionSnapshot, fullPaletteImage } from './lib/palette-state.js';
  import { tooltip } from './lib/tooltip.js';
  import { paletteFailureRegistry } from './lib/palette-failure.js';
  import { addUsageFrame, completedUsage } from './lib/palette-usage-progress.js';
  import { packWorkspaceControls } from './lib/workspace-controls.js';
  import logoUrl from './assets/logo.png';
  import darkLogoUrl from './assets/logo-dark.png';
  import helpLogoUrl from './assets/logo.svg';
  import darkHelpLogoUrl from './assets/logo-dark.svg';

  const storageKey = 'colorfetti';
  const trailerUrl = `${import.meta.env.BASE_URL}colorfetti-trailer.mp4`;
  const touch = matchMedia('(pointer:coarse)').matches;
  const dragDesktop = matchMedia('(hover: hover) and (pointer: fine)').matches && !isMobileExportDevice();
  const mod = /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'; // the key the help names for pasting and copying

  // The colors, the style and every style's settings are kept between visits. A browser can refuse storage
  // (private windows, blocked site data), and then the app simply starts from the defaults.
  let stored = null;
  try {
    stored = readStoredValue(localStorage, storageKey);
  } catch {
    // no storage
  }
  const saved = restore(stored, STYLES.map(s => s[0]));
  let initialLibrary = [];
  try { initialLibrary = restoreLibrary(readStoredValue(localStorage, LIBRARY_KEY)); } catch { /* Session still works. */ }
  let library = $state.raw(initialLibrary);
  const fullSaved = restorePaletteState(stored, initialLibrary);
  let family = $state(fullSaved.family), paletteId = $state(fullSaved.paletteId), alphaCut = $state(fullSaved.alphaCut), metric = $state(fullSaved.metric);
  let maxColors = $state(fullSaved.maxColors), lastMaxColors = $state(fullSaved.lastMaxColors), cleanup = $state(fullSaved.cleanup);
  let alphaMode = $state(fullSaved.alphaMode);
  const paletteCut = $derived(effectiveAlphaCut(alphaMode, alphaCut));
  let dither = $state(fullSaved.dither), ditherStrength = $state(fullSaved.ditherStrength);
  let sessionPalettes = $state.raw([]);
  const savedPalettes = $derived([...library, ...sessionPalettes]);
  let generatedResult = $state.raw(null), generatedBusy = $state(false), generatedError = $state(false), generationRetry = $state(0);
  const generatedActive = $derived(paletteId === GENERATED_PALETTE_ID);
  const fullPalette = $derived(generatedActive ? generatedResult?.palette ?? GENERATED_PALETTE
    : [...FULL_PRESETS, ...savedPalettes].find(p => p.id === paletteId) ?? DEFAULT_FULL_PALETTE);
  const fullChoices = $derived([generatedResult?.palette ?? GENERATED_PALETTE, ...FULL_PRESETS]);
  const prepared = $derived(fullPalette.colors.length ? preparePalette(fullPalette.colors) : null);
  let paletteRequest = $state.raw(null), paletteTrigger;
  let deleteImports = $state(false);
  function selectPalette(p) { if (p.id === GENERATED_PALETTE_ID && generatedError) generationRetry++; retryPaletteFailures(); paletteId = p.id; family = 'full-palette'; showOriginal = false; }
  function editPalette(p) {
    if (p?.id === GENERATED_PALETTE_ID && (generatedBusy || generatedUnavailable || generatedResult?.key !== generatedRequest?.key)) return;
    paletteTrigger = document.querySelector('.image-viewer[open] button[aria-label="Save image"]') ?? document.activeElement;
    paletteRequest = p ? { ...p, name: p.id.startsWith('preset-') || p.id === GENERATED_PALETTE_ID ? p.name + ' copy' : p.name, expectedRevision: p.revision, forceCopy: !p.id.startsWith('user-') } : { defaultName: newPaletteName(savedPalettes) };
  }
  function commitPalette(draft) {
    const result = savePalette(localStorage, library, draft, { id: draft.id, expectedRevision: draft.expectedRevision });
    library = result.records; selectPalette(result.record); return result.record;
  }
  function useSessionPalette(draft) {
    const record = { ...draft, id: 'session-' + crypto.randomUUID(), revision: 1 };
    sessionPalettes = [...sessionPalettes, record]; selectPalette(record); say('Using palette for this visit. Export HEX to keep a backup.');
  }
  function removePalette(id, revision) {
    library = deletePalette(localStorage, library, id, { expectedRevision: revision });
    if (paletteId === id) { paletteId = DEFAULT_FULL_PALETTE.id; say(`Palette deleted. ${DEFAULT_FULL_PALETTE.name} selected.`); }
  }
  function reloadPalette(id) {
    library = restoreLibrary(localStorage.getItem(LIBRARY_KEY));
    return library.find(p => p.id === id);
  }
  $effect(() => on(window, 'storage', e => {
    if (e.storageArea === localStorage && (e.key === LIBRARY_KEY || e.key === null)) library = restoreLibrary(e.newValue);
  }));

  let first = $state(saved.first); // lines and dark pixels
  let second = $state(saved.second); // fill and light pixels
  let none = $state(saved.none); // which of the two is None, and left out of the picture: 0 neither, 1 the first, 2 the second
  let style = $state(saved.style);
  // Each style's own settings, by style (see lib/settings.js). `set` is the current style's, as
  // a plain object that is a new one whenever any of them changes.
  let settings = $state(saved.settings);
  const set = $derived({ ...settings[style] });
  const analysisSource = $derived(set.source ?? 'luma');
  const analysisCut = $derived(set.alpha ?? 128);
  const needsAnalysis = item => family === 'two-color' && !analysisMatches(item, { source: analysisSource, alphaCut: analysisCut });
  // The two colors as they are drawn: a None one is null (see `inks`).
  const ink = $derived(inks(first, second, none, style));
  // The theme follows the system until the other one is picked in the More menu. A pick is kept
  // only while it differs from the system's, so picking the system's own goes back to following it.
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  let systemTheme = $state(systemDark.matches ? 'dark' : 'light');
  systemDark.addEventListener('change', e => (systemTheme = e.matches ? 'dark' : 'light'));
  let themePick = $state(saved.theme);
  const theme = $derived(themePick ?? systemTheme);
  const otherTheme = $derived(theme === 'dark' ? 'light' : 'dark');
  $effect(() => {
    document.documentElement.dataset.theme = theme; // app.css takes its colors from this
    document.querySelector('meta[name=color-scheme]').content = `only ${theme}`;
    // the browser's bar takes the page background (index.html sets it for the system's theme)
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    for (const meta of document.querySelectorAll('meta[name=theme-color]')) meta.content = bg;
  });
  $effect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ first, second, none, style, settings, theme: themePick, family, paletteId, alphaCut, alphaMode, metric, maxColors, lastMaxColors, cleanup, dither, ditherStrength }));
    } catch {
      // no storage; the settings last until the page is closed
    }
  });
  // Nothing stored means a first visit, and the help opens by itself as a welcome. Where storage
  // is refused every visit looks like the first.
  $effect(() => {
    if (stored === null) help.showModal();
  });
  // One measured bottom workspace reserves all editing/file rows and open panels.
  function measureWorkspaceTools(node) {
    let disposed = false;
    const root = document.documentElement;
    const write = (key, value) => { if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value); };
    const measure = () => {
      if (disposed) return;
      // Each island is one independent grid item. Pack from the bottom/right so
      // overflow moves Palette upward first, without reserving a whole dock row.
      const groups = [...node.querySelectorAll('.color-tools,.style-tools,.file-actions,.file-tools > .btn')];
      const available = node.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(node).columnGap);
      const widths = groups.map(el => el.getBoundingClientRect().width);
      const saveButton = node.querySelector('.export-action');
      const saveLabel = saveButton.querySelector('.save-label');
      const saveRect = saveButton.getBoundingClientRect();
      // Recover the icon-only width even while the label is showing. Testing
      // the expanded candidate first avoids a resize/show/hide feedback loop.
      if (widths[2]) widths[2] -= saveRect.width - saveRect.height;
      const extra = saveLabel.getBoundingClientRect().width + parseFloat(getComputedStyle(saveButton).gap);
      node.style.setProperty('--save-label-extra', `${extra}px`);
      const expanded = [...widths];
      if (expanded[2]) expanded[2] += extra;
      const labeled = widths[2] > 0 && packWorkspaceControls(expanded, available, gap)[0].offset > 0;
      node.classList.toggle('save-labeled', labeled);
      const placement = packWorkspaceControls(labeled ? expanded : widths, available, gap);
      const failureRow = node.querySelector('.palette-failure-status') ? 1 : 0;
      // Popups follow the editing pair only while the measured layout is centered.
      node.classList.toggle('editing-centered', placement[0].offset > 0);
      groups.forEach((el, i) => {
        const { row, side, offset } = placement[i];
        const styles = { gridRow: String(row + failureRow), justifySelf: side === 'left' ? 'start' : 'end', marginLeft: side === 'left' ? `${offset}px` : '0px', marginRight: side === 'right' ? `${offset}px` : '0px' };
        for (const [key, value] of Object.entries(styles)) if (el.style[key] !== value) el.style[key] = value;
      });
      const area = document.getElementById('app').getBoundingClientRect();
      const tools = node.getBoundingClientRect();
      const panels = [...node.querySelectorAll('.panel,.menu,.tray')];
      const top = Math.min(tools.top,...panels.map(el => el.getBoundingClientRect().top));
      const panelTop = Math.min(tools.top,...[...node.querySelectorAll('.panel')].map(el => el.getBoundingClientRect().top));
      const moreButton = node.querySelector('.file-tools > .btn');
      write('--more-bottom',`${Math.max(0,area.bottom-moreButton.getBoundingClientRect().top+10)}px`);
      write('--canvas-header-space','0px');
      write('--canvas-panel-base',`${Math.max(0,area.bottom-panelTop+12)}px`);
      write('--dock-base',`${Math.max(0,area.bottom-tools.top+12)}px`);
      write('--panel-space',`${Math.max(0,tools.top-top+(panels.length?10:0))}px`);
    };
    const resize = new ResizeObserver(measure);
    const reconnect = () => { resize.disconnect(); resize.observe(node); for (const el of node.querySelectorAll('.panel,.menu,.tray,.color-tools,.style-tools,.file-actions,.file-tools > .btn,.save-label,.palette-failure-status')) resize.observe(el); measure(); };
    const mutation = new MutationObserver(reconnect);
    mutation.observe(node,{childList:true,subtree:true});
    const off = on(window,'resize',measure);
    tick().then(() => { if (!disposed) reconnect(); });
    return { destroy: () => { disposed=true; off(); resize.disconnect(); mutation.disconnect(); } };
  }
  let showOriginal = $state(false);
  // Editing colors or conversion settings returns to the converted result. Temporary
  // comparison stays separate, so releasing a hold never restores an outdated preference.
  $effect(() => {
    first, second, none, style, set, family, fullPalette, alphaCut, alphaMode, metric, maxColors, cleanup, dither, ditherStrength;
    showOriginal = false;
  });
  let spaceHeld = $state(false);
  let comparisonHolds = $state.raw(new Set());
  const previewing = $derived(spaceHeld || comparisonHolds.size > 0);
  const effectiveOriginal = $derived(showOriginal !== previewing);
  function compareHold(active, id) {
    const next = new Set(comparisonHolds);
    if (active) next.add(id); else next.delete(id);
    comparisonHolds = next;
  }
  function clearComparison() { spaceHeld = false; comparisonHolds = new Set(); }
  let canvasScrollable = $state(false);
  const importLabel = 'Add images';
  $effect(() => {
    const hidden = () => { if (document.hidden) clearComparison(); };
    const focused = e => { if (e.target.closest?.('dialog[open]')) clearComparison(); };
    const off = [on(document, 'visibilitychange', hidden), on(document, 'focusin', focused)];
    return () => off.forEach(stop => stop());
  });
  // While a slider of the style panel is being dragged, the wall as a whole gets this many milliseconds
  // to redraw after each move, shared out between the tiles (see `budget` in Tile.svelte).
  const DRAG_MS = 24;
  let dragging = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  // The logo is the empty wall's live preview. It never joins an imported wall or its exports.
  let example = $state.raw(null);
  const generatedRequest = $derived(generatedActive ? captureGeneratedWallSources(items, example, paletteCut) : null);
  const generatedPending = $derived(family === 'full-palette' && generatedActive && !generatedError
    && (generatedBusy || generatedResult?.key !== generatedRequest?.key));
  const generatedSource = $derived(generatedResult?.sourceLabel ?? (items.length ? 'Your images' : 'Example image'));
  const generatedNotice = $derived(family !== 'full-palette' || !generatedActive ? '' : generatedPending ? (!items.length && !example ? 'Loading example…' : 'Updating shared colors…')
    : generatedError ? `Could not generate colors. Select ${GENERATED_PALETTE.name} to retry.`
    : !fullPalette.colors.length ? 'No visible colors. Lower Opacity cut.' : '');
  const generatedUnavailable = $derived(family === 'full-palette' && generatedActive
    && (generatedError || !fullPalette.colors.length));
  $effect(() => {
    const request = generatedRequest;
    generationRetry;
    if (family !== 'full-palette' || !request?.assets.length) { generatedBusy = false; return; }
    // Re-entering Auto with the same immutable sources already has its result.
    // Republishing a cached result would replace the palette identity and restart
    // every tile's conversion (and optional subset/Cleanup preparation) twice.
    if (untrack(() => generatedResult?.key) === request.key) {
      generatedBusy = false; generatedError = false; return;
    }
    const sourceLabel = items.length ? 'Your images' : 'Example image';
    const controller = new AbortController();
    generatedBusy = true; generatedError = false;
    import('./lib/palette-generated-client.js').then(client => client.getGeneratedPalette(request, { signal: controller.signal })).then(result => {
      if (!controller.signal.aborted) {
        // Keep the small result and identity, never the captured wall's frame buffers.
        generatedResult = { key: request.key, sourceLabel, palette: Object.freeze({ ...GENERATED_PALETTE, colors: result.colors }) };
        generatedBusy = false;
      }
    }).catch(error => {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      generatedBusy = false; generatedError = true;
      say(`Could not generate shared colors. Select ${GENERATED_PALETTE.name} to retry.`);
    });
    return () => controller.abort();
  });
  let viewing = $state.raw(null), viewTrigger, viewKeyboardFocus = false;
  // Resolve the current analysis after a setting changes, without duplicating image pixels.
  const viewed = $derived(viewing ? (viewing.id === 0 ? example : items.find(item => item.id === viewing.id)) : null);
  let viewInitialOriginal = $state(false);
  function openImage(item, trigger) { viewInitialOriginal = effectiveOriginal; clearComparison(); viewKeyboardFocus = !!trigger?.matches(':focus-visible'); viewing = item; viewTrigger = trigger; }
  // The lowest and highest value Auto is using for the images on screen, for the Dock to show:
  // of the threshold, of Cutout's seam strength, and of Stencil's Cuts. An image's sprites are
  // only looked for while Stencil is the style: finding them walks the whole image.
  const autos = $derived.by(() => {
    const imgs = (items.length ? items : example ? [example] : []).map(i => i.img);
    const range = of => (imgs.length ? [Math.min(...imgs.map(of)), Math.max(...imgs.map(of))] : [128, 128]);
    const cuts = family === 'two-color' && style === 'stencil' && imgs.length && !canvasItems.some(needsAnalysis) ? [Math.min(...imgs.map(img => spritesOf(img).cuts[0])), Math.max(...imgs.map(img => spritesOf(img).cuts[1]))] : [0, 0];
    return { threshold: range(img => autoThreshold(img, style)), seams: range(img => img.autoSeam), cuts };
  });
  // Size of the area the wall can use, measured from the page (see .probe in app.css).
  let wallWidth = $state(0);
  let wallHeight = $state(0);
  // A tile is its square image plus a caption underneath. On touch screens the caption row also
  // holds the Share and Remove buttons, so it is taller. These mirror the sizes in app.css.
  const noHover = matchMedia('(hover: none)');
  let noHoverMatches = $state(noHover.matches);
  noHover.addEventListener('change', e => (noHoverMatches = e.matches));
  const canvasItems = $derived(items.length ? items : example ? [example] : []);
  const layout = $derived(fitImageWall(canvasItems.length, wallWidth, wallHeight, noHoverMatches || !items.length));
  let dragDepth = $state(0);
  let message = $state('');
  let picker;
  let nextId = 0, messageTimer;
  // On touch screens a tile's Share button opens a sheet with Copy and Download for that image.
  let sheet, more, help, confirm, clearConfirm, moreTrigger;
  let clearTrigger = $state(); // the dialogs: the Share sheet, the More menu, the help and Reset settings's question
  // Reset settings puts back everything kept between visits: the colors, the style, every style's settings
  // and the theme. The images stay. The effect above then stores the defaults over what was kept.
  function resetAll() {
    if (deleteImports) {
      try { localStorage.setItem(LIBRARY_KEY, '{"version":1,"palettes":[]}'); } catch { say('Saved palettes could not be deleted. Settings were not reset.'); return; }
      library = []; sessionPalettes = [];
    }
    const fresh = restore(null, STYLES.map(s => s[0]));
    ({ first, second, none, style, settings } = fresh);
    themePick = fresh.theme;
    const freshPalette = restorePaletteState(null);
    family = freshPalette.family; paletteId = freshPalette.paletteId; alphaCut = 128; alphaMode = 'cut'; metric = 'oklab'; maxColors = 0; lastMaxColors = 16; cleanup = false; dither = 'none'; ditherStrength = 50;
    if (generatedError) generationRetry++;
    say('Settings reset.');
  }
  let shared = $state.raw(null), sharedTrigger, shareSession = 0; // the image the sheet is for; it stays set after the sheet closes, until the next one
  // But not once that image is removed, or the sheet would go on holding all of a photo's pixels.
  $effect(() => {
    if (shared && !items.includes(shared)) shared = null;
  });
  // The browser's offer to install Colorfetti as an app. It comes only where that can be done and is
  // not done yet, and can be taken up once; the More menu shows Install while one is held.
  let installOffer = $state.raw(null);
  async function install() {
    const offer = installOffer;
    if (!offer) return;
    try {
      await offer.prompt();
    } catch {
      say('The browser could not open the install prompt.');
    } finally {
      if (installOffer === offer) installOffer = null;
    }
  }
  function share(item, trigger) {
    shareSession++;
    shared = item; sharedTrigger = trigger;
    clearComparison(); sheet.showModal();
  }

  async function previewShared() {
    const item = shared, trigger = sharedTrigger;
    sheet.close();
    // Let the sheet restore its invoking control before opening the next dialog.
    await tick();
    if (items.includes(item)) openImage(item, trigger);
  }

  // Text color for the drop screen: the first color, unless it is too close to the second to read.
  const brightness = hex => {
    const [r, g, b] = hexToRgb(hex).map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const overlayInk = $derived.by(() => {
    const a = brightness(first), b = brightness(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 2.5 ? first : b > 0.4 ? '#000000' : '#ffffff';
  });

  function say(text, time = 3200) {
    message = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (message = ''), time);
  }

  const paletteFailures = paletteFailureRegistry();
  let failureVersion = $state(0), paletteRetry = $state(0);
  const currentPaletteFailures = $derived.by(() => {
    failureVersion;
    return paletteFailures.current(canvasItems, { family, palette: prepared, alphaCut: paletteCut, metric, maxColors, cleanup });
  });
  const failureNotice = failures => failures.length
    ? failures.some(f => f.stage === 'limit') ? "Couldn't limit colors. Retry or choose All."
      : "Couldn't clean up pixels. Retry or turn Cleanup off." : '';
  const paletteFailureNotice = $derived(failureNotice(currentPaletteFailures));
  const itemPaletteFailed = item => currentPaletteFailures.some(f => f.inputs.item === item);
  function retryPaletteFailures() { paletteRetry++; }
  function reportPaletteStage(event) {
    const changed = event.type === 'remove' ? paletteFailures.remove(event.owner)
      : event.type === 'clear' ? paletteFailures.clear(event.owner, event.stage)
      : event.type === 'begin' ? paletteFailures.begin(event.owner, event.stage, event.inputs, event.attempt)
      : paletteFailures.settle(event.owner, event.stage, event.attempt, event.type === 'failed' ? event.error : null);
    if (changed) failureVersion++;
  }

  // Reading, saving or copying a photo goes through every one of its pixels. On a phone that can
  // take a second or more, and the page can do nothing else meanwhile. So a job over this many
  // pixels first shows a message with a spinner. A smaller job is over before a message could
  // be read, and shows nothing.
  const BUSY_PIXELS = 2_000_000;
  let busy = $state(''); // what the page is busy with; shown in place of any other message
  const running = []; // what each job that has not finished says, as one can start while another waits
  const pixelsOf = item => item.img.w * item.img.h * (item.frames?.length ?? 1);
  // Puts `text` on screen as what the page is busy with, and returns what to call when that is over.
  function working(text) {
    const job = { text };
    running.push(job);
    busy = text;
    return () => {
      running.splice(running.indexOf(job), 1);
      busy = running.at(-1)?.text ?? ''; // the newest job still running, or nothing
    };
  }
  // A message has to be drawn before a job takes over the page, and this is long enough for
  // that. A timer, not a screen frame: a hidden tab has no frames, and the job would wait until
  // the tab was shown again.
  const drawn = () => new Promise(done => setTimeout(done, 50));
  // Runs `job` and gives back what it returns, with `text` on screen meanwhile if `pixels` is large.
  async function during(text, pixels, job) {
    if (pixels < BUSY_PIXELS) return job();
    const done = working(text);
    await drawn();
    try {
      return await job();
    } finally {
      done();
    }
  }

  // Quick switch: scrolling, swiping or an arrow key steps to the next style, or the next
  // palette, and a message names it. `dir` is 1 for the next and -1 for the one before.
  let custom; // the user's own two colors, kept as a stop among the palettes (see stepPalette)
  function step(palettes, dir) {
    if (family === 'full-palette') {
      if (palettes) {
        const choices = [...fullChoices, ...savedPalettes], at = choices.findIndex(p => p.id === fullPalette.id);
        const p = choices[(at + dir + choices.length) % choices.length]; selectPalette(p); say(`Palette: ${p.name}`, 1400);
      }
      return;
    }
    let name, at, of;
    if (palettes) {
      let palette;
      ({ palette, at, of, custom } = stepPalette(first, second, dir, custom));
      [first, second] = inOrder(palette, first, second);
      name = palette.name;
    } else {
      at = stepStyle(style, dir);
      of = STYLES.length;
      [style, name] = STYLES[at];
    }
    say(`${palettes ? 'Palette' : 'Style'}: ${name} · ${at + 1}/${of}`, 1400);
  }

  // Whether `el`, or something it is inside, has more content than it shows, so that a wheel
  // or a finger there scrolls it. `axis` is 'x' or 'y'; without one, either counts.
  function scrolls(el, axis) {
    for (; el instanceof Element; el = el.parentElement) {
      const { overflowX, overflowY } = getComputedStyle(el);
      if (axis !== 'x' && el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(overflowY)) return true;
      if (axis !== 'y' && el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(overflowX)) return true;
    }
    return false;
  }

  // A wheel or a finger steps only over the background: the top bar, the wall or the empty screen,
  // buttons included, except the top bar's. Never over the dock, a panel or a dialog, where a move
  // that just misses what scrolls would step by mistake.
  const onWall = e => e.target.closest?.('.grid, .empty') && !e.target.closest('.workspace-tools');

  // The wheel steps the styles over the wall wherever it has nothing to scroll. With Shift, with
  // Ctrl or sideways it steps the palettes. Shift and the wheel scroll sideways, so Shift steps
  // though the wall scrolls up and down; Ctrl and the wheel never scroll, so neither does Ctrl.
  // A trackpad pinch also arrives as a wheel event marked Ctrl, with no key pressed.
  // That one is left to the browser, which zooms the page, so Ctrl only counts once the keyboard
  // has said so.
  let ctrlHeld = false;
  const wheelStep = wheelSteps();
  function wheel(e) {
    if (document.querySelector('dialog[open]')) return;
    // If the browser will not let a Ctrl move be stopped it is about to zoom, and one effect is enough.
    if (e.ctrlKey ? !ctrlHeld || !e.cancelable : scrolls(e.target, e.shiftKey ? 'x' : undefined)) return;
    e.preventDefault(); // or Ctrl and the wheel would zoom the page
    if (!onWall(e)) return;
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const dir = wheelStep((sideways ? e.deltaX : e.deltaY) * (e.deltaMode ? 40 : 1), e.timeStamp);
    if (dir) step(e.ctrlKey || e.shiftKey || sideways, dir);
  }

  // One finger steps the styles by moving up or down and the palettes by moving sideways,
  // wherever the page does not scroll that way: first after 32px, then every 72px.
  let swipe = null; // where the finger was at its last step, and its axis once it has one
  function touchstart(e) {
    const { clientX: x, clientY: y } = e.touches[0];
    // Two fingers are a pinch, a press that has just closed a panel (the Dock stops that one)
    // does nothing else, and only the background is swiped: not a top bar button, the dock or a dialog.
    swipe = e.touches.length === 1 && !e.defaultPrevented && onWall(e) ? { x, y } : null;
  }
  function touchmove(e) {
    if (document.querySelector('dialog[open]')) { swipe = null; return; }
    if (!swipe) return;
    const { clientX: x, clientY: y } = e.touches[0], dx = x - swipe.x, dy = y - swipe.y;
    if (!swipe.axis) {
      // The first move settles whose gesture this is: the page's if it scrolls that way here,
      // the tile's if it is already held to compare, and ours otherwise.
      const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (!e.cancelable || scrolls(e.target, axis) || e.target.closest('.held')) return (swipe = null);
      swipe.axis = axis;
    }
    e.preventDefault(); // ours, so the browser neither scrolls nor pulls to refresh
    const moved = swipe.axis === 'x' ? dx : dy;
    if (Math.abs(moved) < (swipe.went ? 72 : 32)) return;
    step(swipe.axis === 'x', moved < 0 ? 1 : -1);
    Object.assign(swipe, { x, y, went: true });
  }

  // These two have to stop the browser's own scroll and zoom, which listeners set on
  // <svelte:window> cannot: the browser treats those as passive.
  $effect(() => {
    const off = [on(window, 'wheel', wheel, { passive: false }), on(window, 'touchmove', touchmove, { passive: false })];
    return () => off.forEach(stop => stop());
  });

  // Reads a file into frames: one for a still image, several for an animated GIF.
  const importSettings = () => ({ source: set.source ?? 'luma', alphaCut: set.alpha ?? 128 });
  let importClient;
  async function decode(file, signal) {
    const settings = importSettings();
    importClient = await import('./lib/image-import-client.js');
    return importClient.decodeImportedFile(file, { ...settings, signal });
  }
  async function currentImport(decoded, signal, publish) {
    while (true) {
      const settings = importSettings();
      if (decoded.analysisSource === settings.source
        && (!decoded.frames[0].img.soft || decoded.analysisCut === settings.alphaCut)) {
        if (!signal.aborted) publish(importClient.takeImportedFrames(decoded));
        return;
      }
      decoded = await importClient.reanalyzeImported(decoded, { ...settings, signal });
    }
  }
  async function decodeDemo(file, signal) {
    if (file.type === 'image/gif') {
      try {
        const { decodeGif } = await import('./lib/gif.js');
        const gif = decodeGif(new Uint8Array(await file.arrayBuffer()));
        if (gif.frames.length > 1) return { frames: gif.frames.map(frame => ({
          original: new ImageData(frame.data, gif.width, gif.height), delay: frame.delay })), loop: gif.loop };
      } catch { if (signal.aborted) throw new DOMException('Canceled', 'AbortError'); }
    }
    return { frames: [{ original: await decodeImageFile(file, { signal }) }] };
  }

  // What the current style reads an image by: what brightness is taken from, and how see-through
  // a pixel may be before it is empty. An image is analysed by these, and `by` on an item says
  // which it was analysed by.
  // The opacity cut only counts for an image with a pixel that is partly see-through (`soft`): any
  // other image is the same at every cut, and is not analysed again when the cut changes.
  const readBy = soft => `${set.source ?? 'luma'} ${soft ? set.alpha : ''}`;
  // Whether an image on the wall has such a pixel. Only then does the Dock offer the opacity cut.
  const soft = $derived((items.length ? items : example ? [example] : []).some(item => item.img.soft));

  // Turns decoded frames into an item for the wall. `original` and `img` are the first frame;
  // an animation also has `frames` (each with its own original, img and delay) and `loop`.
  function toItem(id, name, { frames, loop, analysisSource, analysisCut }, prepared = false) {
    if (!prepared) {
      for (const frame of frames) frame.img = analyze(frame.original, set.source, set.alpha);
      unify(frames.map(frame => frame.img)); // one conversion for the whole animation, so it does not flicker
    }
    const by = prepared ? `${analysisSource} ${frames[0].img.soft ? analysisCut : ''}` : readBy(frames[0].img.soft);
    return frames.length > 1 ? { id, name, by, ...frames[0], frames, loop } : { id, name, by, ...frames[0] };
  }
  // Live analyses stay unpublished until the captured wall is ready. Never transfer
  // or mutate live buffers; canceled passes cannot replace a newer source/settings epoch.
  let analysisRequest;
  function stopAnalysis() {
    analysisRequest?.controller.abort();
    analysisRequest = undefined;
  }
  $effect.pre(() => {
    if (family === 'full-palette') { stopAnalysis(); return; }
    const realWall = items, demo = realWall.length ? null : example;
    const selected = realWall.length ? realWall : demo ? [demo] : [];
    const settings = { source: analysisSource, alphaCut: selected.some(i => i.img.soft) ? analysisCut : 128 };
    // A drag defers new heavy work, but must not cancel a pass for these same inputs.
    // Keep a settled failure too: unrelated drag events must not silently retry it.
    if (analysisRequest && (analysisRequest.realWall !== realWall || analysisRequest.demo !== demo
      || analysisRequest.settings.source !== settings.source || analysisRequest.settings.alphaCut !== settings.alphaCut)) stopAnalysis();
    if (!selected.some(item => !analysisMatches(item, settings))) return;
    if (analysisRequest) return;
    if (dragging && selected.reduce((n, item) => n + pixelsOf(item), 0) > 1e6) return;
    const controller = new AbortController();
    const request = { controller, realWall, demo, settings };
    analysisRequest = request;
    const done = selected.reduce((n, item) => n + pixelsOf(item), 0) >= BUSY_PIXELS ? working('Updating images…') : () => {};
    reanalyzeItems(selected, settings, { signal: controller.signal }).then(next => {
      if (controller.signal.aborted || analysisRequest !== request || family !== 'two-color'
        || analysisSource !== settings.source || (selected.some(item => item.img.soft) && analysisCut !== settings.alphaCut)
        || items !== realWall || (!realWall.length && example !== demo)) return;
      if (realWall.length) items = next; else example = next[0];
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError') say('Could not update images. Try changing Brightness or Opacity cut again.', 6000);
    }).finally(done);
  });
  $effect(() => () => stopAnalysis());

  const imageImports = new Set(), exampleImportController = new AbortController();
  let themeExamples = $state.raw(null);
  $effect(() => () => {
    exampleImportController.abort();
    for (const controller of imageImports) controller.abort();
    imageImports.clear();
  });
  // Decode two immutable sources once. Switching reuses their identities and
  // the generated-palette cache instead of allocating new sources on every toggle.
  Promise.all([logoUrl, darkLogoUrl].map(url => fetch(url, { signal: exampleImportController.signal })
    .then(response => { if (!response.ok) throw new Error('Example unavailable'); return response.blob(); })
    .then(file => decodeDemo(file, exampleImportController.signal))))
    .then(([light, dark]) => {
      if (!exampleImportController.signal.aborted) themeExamples = { light: toItem(0, 'Colorfetti', light), dark: toItem(0, 'Colorfetti', dark) };
    })
    .catch(() => {}); // the empty workspace still offers image import
  $effect(() => {
    const selected = themeExamples?.[theme];
    if (selected) example = selected;
  });

  // Each image goes on the wall as soon as it is read, so the first of a batch of photos shows
  // without waiting for the rest.
  // Remove all also stops the batches still being read, or their images would turn up on the
  // wall that was just emptied. `emptied` counts the times, for a batch to see that it has been.
  let emptied = 0;
  const imageDownloads = new Set();
  function removeAll() {
    emptied++;
    for (const controller of imageDownloads) controller.abort();
    for (const controller of imageImports) controller.abort();
    clearComparison(); items = [];
  }
  async function addFiles(files, began = emptied, reportSkipped = true) {
    if (began !== emptied) return;
    const controller = new AbortController();
    imageImports.add(controller);
    let skipped = 0, fresh = [], shownAt = 0, done;
    // A photo goes on the wall as soon as it is read. Sprites are read far quicker than the wall
    // can be fitted again around each one, so those read within a quarter of a second go on together.
    const show = () => {
      if (fresh.length) items = [...items, ...fresh];
      fresh = [];
      shownAt = performance.now();
    };
    try {
      for (const [n, file] of files.entries()) {
        if (began !== emptied) return;
        try {
          let decoded = await decode(file, controller.signal);
          const { width, height } = decoded.frames[0].original, name = file.name || 'image.png';
          if (began !== emptied) return; // checked after each wait, before the next piece of work
          // From its first large image on, the batch says which file it is reading, and goes on
          // saying so until it ends: the message does not come and go between files.
          const large = width * height * decoded.frames.length >= BUSY_PIXELS;
          if (large || done) {
            done?.();
            done = working(files.length > 1 ? `Reading ${n + 1} of ${files.length}…` : `Reading ${name}…`);
          }
          if (large) {
            await drawn();
            if (began !== emptied) return;
          }
          await currentImport(decoded, controller.signal, current => {
            if (began === emptied) fresh.push(toItem(++nextId, name, current, true));
          });
          if (began !== emptied || controller.signal.aborted) return;
          if (performance.now() - shownAt > 250) show();
        } catch (error) {
          if (controller.signal.aborted || error.name === 'AbortError' || began !== emptied) return;
          skipped++;
        }
      }
      if (began !== emptied) return;
      show();
    } finally {
      imageImports.delete(controller);
      done?.();
    }
    if (reportSkipped && skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Colorfetti reads PNG, GIF, WebP, JPEG and BMP images.`);
    return skipped;
  }

  async function addImageUrls(urls) {
    const began = emptied, controller = new AbortController();
    imageDownloads.add(controller);
    let skipped = 0;
    const done = working('Fetching image…');
    try {
      for (const url of urls) {
        if (began !== emptied) return;
        try {
          const file = await fetchDroppedImage(url, AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]));
          if (began !== emptied) return;
          const failed = await addFiles([file], began, false);
          if (began !== emptied) return;
          skipped += failed;
        } catch {
          if (began !== emptied) return;
          skipped++;
        }
      }
    } finally {
      imageDownloads.delete(controller);
      done();
    }
    if (skipped) say(`Could not import ${skipped} dropped image${skipped === 1 ? '' : 's'}. Try copying and pasting the image, or saving it and adding the file.`, 6000);
  }

  // What gets saved: the two colors as they are drawn, with a still image's mask,
  // or lazy full-resolution animation masks consumed one frame at a time.
  // `asked` is the settings at the moment of asking (see `asking`). A long job starts a moment
  // after it is asked for, and what it saves is what was on screen then, whatever is changed since.
  const asking = () => conversionSnapshot({ family, palette: fullPalette, alphaCut, alphaMode, metric, maxColors, cleanup, dither, ditherStrength,
    generated: family === 'full-palette' && generatedActive ? generatedRequest : null, first: ink[0], second: ink[1], style, set });
  const usageKey = $derived.by(() => {
    const snapshot = asking();
    // Auto resolves colors from this captured wall; retained preview swatches
    // and its display name are not conversion inputs during generation.
    return JSON.stringify({ ...snapshot, name: undefined, colors: snapshot.generated ? undefined : snapshot.colors, generated: snapshot.generated?.key });
  });
  // Per-item subscriptions avoid invalidating every caption on each publication.
  const colorUsage = new SvelteMap();
  function previewUsage({ item, key, colors, used, frame, frames }) {
    if (key !== usageKey || family !== 'full-palette' || generatedPending || generatedUnavailable || !items.includes(item)) return;
    const previous = usageFor(item);
    if (previous?.result || previous?.status === 'pending') return;
    const progress = addUsageFrame(previous?.progress, colors, used, frame, frames);
    if (!progress) return;
    const result = completedUsage(progress, fullPalette.colors);
    colorUsage.set(item.id, { item, key, ...(result ? { result, status: 'ready' } : { progress, status: 'partial' }) });
  }
  const usageFor = item => {
    const record = colorUsage.get(item.id);
    return family === 'full-palette' && record?.item === item && record.key === usageKey ? record : null;
  };
  const usageLabel = item => {
    const record = usageFor(item);
    return record?.result ? `${record.result.count} ${record.result.count === 1 ? 'color' : 'colors'}` : '';
  };
  $effect(() => {
    const key = usageKey, live = items;
    // Observe source/settings changes, never metadata publications themselves.
    untrack(() => {
      const current = new Map(live.map(item => [item.id, item]));
      for (const [id, record] of colorUsage) {
        if (!current.has(id)) { record?.controller?.abort(); colorUsage.delete(id); }
        else if (record && (record.key !== key || current.get(id) !== record.item)) {
          record.controller?.abort(); colorUsage.set(id, null);
        }
      }
      // Retain empty live slots: missing-key reads subscribe to the map as a whole.
      for (const id of current.keys()) if (!colorUsage.has(id)) colorUsage.set(id, null);
    });
  });
  $effect(() => () => { for (const record of colorUsage.values()) record?.controller?.abort(); });
  function countColors(item, explicit = false) {
    if (family !== 'full-palette' || generatedUnavailable || itemPaletteFailed(item) || !items.includes(item)) return Promise.resolve(null);
    const previous = usageFor(item);
    if (previous?.status === 'pending') { previous.explicit ||= explicit; return previous.promise; }
    if (previous?.result) return Promise.resolve(previous.result);
    const snapshot = asking(), key = usageKey, controller = new AbortController();
    const record = { item, key, controller, status: 'pending', explicit };
    const publish = value => {
      if (!controller.signal.aborted && key === usageKey && items.includes(item) && colorUsage.get(item.id) === record)
        colorUsage.set(item.id, { item, key, ...value });
    };
    record.promise = (async () => {
      try {
        const { collectPaletteUsage } = await import('./lib/palette-usage.js');
        const result = await collectPaletteUsage(item, snapshot, { signal: controller.signal });
        publish({ result, status: 'ready' });
        return result;
      } catch (error) {
        if (error.name !== 'AbortError') publish({ status: 'error' });
        return null;
      }
    })();
    colorUsage.set(item.id, record);
    return record.promise;
  }
  // Preview metadata is automatic and noninteractive. Reuse is always one action;
  // it joins an in-flight inspection rather than requiring a separate Count click.
  $effect(() => {
    const item = viewed, key = usageKey;
    if (!item || family !== 'full-palette' || generatedUnavailable || itemPaletteFailed(item)) return;
    const record = untrack(() => { void countColors(item); return usageFor(item); });
    return () => {
      if (record?.status !== 'pending' || record.explicit) return;
      record.controller.abort();
      untrack(() => {
        if (colorUsage.get(item.id) === record) {
          colorUsage.set(item.id, null);
        }
      });
    };
  });
  async function outputColors(item, trigger) {
    const key = usageKey, session = shareSession, fromSheet = trigger?.closest('dialog.sheet');
    if (paletteRequest) return;
    if (!usageFor(item)?.result) say('Finding output colors…');
    const result = await countColors(item, true);
    if (key !== usageKey || !items.includes(item) || trigger && !trigger.isConnected
      || fromSheet && (!fromSheet.open || shared !== item || shareSession !== session)) return;
    if (!result) { say('Could not read output colors. Try Reuse colors again.', 5000); return; }
    if (!result.count) { say('This output has no visible colors to reuse.', 5000); return; }
    const record = usageFor(item);
    if (!record?.result?.count || paletteRequest) return;
    sheet.close();
    await tick();
    if (usageFor(item) !== record || paletteRequest) return;
    editPalette({ id: 'output-colors', name: [...item.name.replace(/\.[^.]+$/, '')].slice(0, 55).join('') + ' colors', colors: record.result.colors, source: { kind: 'copy' } });
    paletteRequest = { ...paletteRequest, notice: `${record.result.count} ${record.result.count === 1 ? 'color' : 'colors'} used in the converted ${item.frames ? 'animation, across all frames' : 'image'}. Save this palette to reuse it, or export a HEX backup.` };
  }
  const about = (item, asked) => ({ name: item.name, w: item.img.w, h: item.img.h, first: asked.first, second: asked.second });
  const still = (item, asked) => asked.family === 'full-palette' ? fullPaletteImage(item, asked, { still: true }) : ({ ...about(item, asked), mask: mask(item.img, asked.style, asked.set) });
  const converted = (item, asked, options) =>
    asked.family === 'full-palette' ? fullPaletteImage(item, asked, options) : item.frames
      ? convertedAnimation(item, asked, options)
      : still(item, asked);

  // Prepare through the existing encoders. Keep Save, Copy and ZIP paths untouched.
  const dragExports = dragDesktop ? createExportDrag({
    request(item) {
      const live = items.find(i => i.id === item.id);
      if (!live) return null;
      const snapshot = asking();
      if (generatedUnavailable || itemPaletteFailed(live)) return null;
      return { item: live, snapshot, key: JSON.stringify({ ...snapshot, generated: snapshot.generated?.key }) };
    },
    async prepare({ item, snapshot }, { signal }) {
      const read = snapshot.family === 'full-palette' ? item : await reanalyzeItem(item, { source: snapshot.set.source, alphaCut: snapshot.set.alpha }, { signal });
      const image = await converted(read, snapshot, { signal });
      const bytes = await fileBytes(image, { signal });
      const name = downloadName(image).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
      const type = image.frames || image.getFrame ? 'image/gif' : 'image/png';
      const file = new File([bytes], name, { type });
      return { file, width: image.w, height: image.h, url: URL.createObjectURL(file) };
    },
    notify: say,
  }) : null;
  $effect(() => {
    if (!dragExports) return;
    // Track every export input; the synchronous dragstart check also guards
    // the interval before this effect runs after a settings edit.
    asking(); items; currentPaletteFailures;
    untrack(() => dragExports.refresh());
  });
  $effect(() => {
    if (!dragExports) return;
    // A touchscreen edit may begin in the Dock while the mouse still hovers art.
    // Leave the touch event untouched; only cancel mouse export preparation.
    const stopTouch = on(window, 'pointerdown', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') dragExports.cancelHover();
    }, { capture: true, passive: true });
    const stop = on(window, 'drop', event => {
      if (!dragExports.isOwn(event.dataTransfer)) return;
      event.preventDefault(); event.stopImmediatePropagation(); dragDepth = 0;
    }, { capture: true });
    return () => { stopTouch(); stop(); dragExports.destroy(); };
  });

  async function save(item) {
    if (generatedUnavailable || itemPaletteFailed(item)) return;
    const asked = asking();
    try {
      const downloading = `Downloading ${downloadName({ ...item, family: asked.family })}…`;
      say(downloading);
      await during(downloading, pixelsOf(item), async () => {
        const read = asked.family === 'full-palette' ? item : await reanalyzeItem(item, { source: asked.set.source, alphaCut: asked.set.alpha });
        return saveOne(await converted(read, asked));
      });
      say(downloading);
    } catch (error) {
      exportFailure(error, asked, `${item.name} could not be saved.`);
    }
  }

  // The clipboard takes a PNG but not a GIF, so an animation is copied as its first frame.
  async function copy(item) {
    if (generatedUnavailable || itemPaletteFailed(item)) return;
    try {
      const asked = asking();
      // the clipboard is asked at once, as Safari demands, and handed the PNG when it has been made
      await copyOne(during(`Copying ${item.name}…`, item.img.w * item.img.h, async () => {
        const read = asked.family === 'full-palette' ? item : await reanalyzeItem(item, { source: asked.set.source, alphaCut: asked.set.alpha });
        return pngBlob(await still(read, asked));
      }));
      say(`${item.name} copied${item.frames ? ' as a still image' : ''}.`);
    } catch {
      say(`${item.name} could not be copied.`);
    }
  }

  async function saveEverything() {
    if (generatedUnavailable || items.some(itemPaletteFailed)) return;
    const asked = asking();
    try {
      const selected = [...items]; // the images on the wall now, even if some are removed before the job starts
      if (!selected.length) return;
      const downloading = selected.length > 1
        ? `Downloading colorfetti.zip (${selected.length} images)…`
        : `Downloading ${downloadName({ ...selected[0], family: asked.family })}…`;
      say(downloading);
      await during(downloading, selected.reduce((sum, item) => sum + pixelsOf(item), 0), () => saveAll(selected, async item => {
        const read = asked.family === 'full-palette' ? item : await reanalyzeItem(item, { source: asked.set.source, alphaCut: asked.set.alpha });
        return converted(read, asked);
      }));
      say(downloading);
    } catch (error) {
      exportFailure(error, asked, 'The images could not be saved.');
    }
  }
  function exportFailure(error, asked, fallback) {
    if (error.code === 'PALETTE_GIF_ALPHA') { say('GIF cannot keep partial opacity. Choose Opacity Cut, or copy a frame as PNG. No file was downloaded.'); return; }
    if (error.code !== 'PALETTE_GIF_LIMIT') { say(fallback); return; }
    say('GIF needs room for transparency. No file was downloaded.');
    if (paletteRequest) {
      // An asynchronous export must not replace a draft already being edited.
      paletteRequest = { ...paletteRequest, exportNotice: `GIF export using ${asked.name} needs room for transparency. No file was downloaded. Finish or cancel this draft, then try Save again.` };
      return;
    }
    paletteTrigger = document.querySelector('.image-viewer[open] button[aria-label="Save image"]') ?? document.activeElement;
    paletteRequest = { name: [...asked.name].slice(0, 55).join('') + ' GIF', colors: [...asked.colors], forceCopy: true, maxColors: 255,
      notice: 'GIF needs room for transparency. Remove at least one color and save a 255-color copy, then select Save image again. No file was downloaded.', source: { kind: 'copy' } };
  }

  // Background taps use the same stationary-press rules as image taps. Controls,
  // dismissing presses, held comparisons and swipes never launch the file picker.
  function emptyImport(node, enabled) {
    const gesture = imageGesture();
    let ready = false;
    const excluded = e => previewing || e.defaultPrevented || document.querySelector('dialog[open]') ||
      e.target.closest?.('button,input,select,textarea,a,.dock,.panel,.menu,.tray,[role="slider"]');
    const down = e => { ready = false; if (enabled && !excluded(e)) gesture.press(e); else gesture.cancel(); };
    const move = e => gesture.move(e);
    const up = e => { gesture.move(e); ready = enabled && !excluded(e) && e.isPrimary !== false && gesture.release(e); gesture.cancel(); };
    const cancel = () => { ready = false; gesture.cancel(); };
    const click = e => { if (ready && enabled && !excluded(e)) picker.click(); cancel(); };
    const secondary = e => { if (e.pointerType === 'touch' && !e.isPrimary) cancel(); };
    const off = [on(node,'pointerdown',down),on(node,'pointermove',move),on(node,'pointerup',up),
      on(node,'pointercancel',cancel),on(node,'pointerleave',() => { if (gesture.canHold()) cancel(); }),on(node,'click',click),
      on(window,'pointerdown',secondary,{passive:true})];
    return { update: value => { enabled = value; cancel(); }, destroy: () => off.forEach(stop => stop()) };
  }
  // Read the actual scroll viewport rather than guessing from image count: panel
  // fitting and viewport orientation can change whether artwork passes below the dock.
  function measureCanvas(node) {
    let disposed = false;
    const measure = () => { if (!disposed) canvasScrollable = node.scrollHeight > node.clientHeight + 1; };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    tick().then(() => { if (!disposed) { const tiles=node.querySelector('.tiles'); if(tiles) observer.observe(tiles); measure(); } });
    return { destroy: () => { disposed = true; observer.disconnect(); canvasScrollable = false; } };
  }

  function picked(e) {
    addFiles([...e.currentTarget.files]);
    e.currentTarget.value = ''; // so picking the same file again still fires a change
  }

  function dragenter(e) {
    if (isInternalDrag(e) || dragExports?.isOwn(e.dataTransfer)) return;
    if (document.querySelector('dialog[open]')) return;
    if (hasImageDrop(e.dataTransfer)) { e.preventDefault(); dragDepth++; }
  }
  function dragover(e) {
    if (isInternalDrag(e) || dragExports?.isOwn(e.dataTransfer)) { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; return; }
    if (hasImageDrop(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }
  function dragleave(e) {
    dragDepth = Math.max(0, dragDepth - 1);
  }
  function drop(e) {
    if (isInternalDrag(e) || dragExports?.isOwn(e.dataTransfer)) { e.preventDefault(); dragDepth = 0; return; }
    if (document.querySelector('dialog[open]')) { e.preventDefault(); dragDepth = 0; return; }
    e.preventDefault();
    dragDepth = 0;
    const { files, urls } = droppedImages(e.dataTransfer);
    if (files.length) addFiles(files);
    else if (urls.length) addImageUrls(urls);
  }
  function paste(e) {
    if (document.querySelector('dialog[open]')) return;
    if (e.clipboardData?.files.length) addFiles([...e.clipboardData.files]);
  }
  $effect(() => trackInternalDrag(document, () => { dragDepth = 0; }));

  // Holding Space flips the whole wall, except while a control that uses Space has focus.
  const onControl = e => e.target.matches?.('button, select, textarea, input:not([type=range])');
  // A mouse or touch click leaves focus on the button, where Space would press it again instead
  // of comparing. Keyboard presses (detail 0) keep their focus.
  function unfocus(e) {
    if (e.detail > 0) e.target.closest?.('button')?.blur();
  }
  // The arrow keys step like the wheel and a finger: up and down the styles, sideways the palettes.
  const ARROWS = { ArrowDown: ['y', 1], ArrowUp: ['y', -1], ArrowRight: ['x', 1], ArrowLeft: ['x', -1] };
  function keydown(e) {
    if (e.key === 'Control') ctrlHeld = true;
    if (document.querySelector('dialog[open]')) return; // the keys below act on the wall, which a dialog covers
    if (e.code === 'Space' && !onControl(e)) { e.preventDefault(); spaceHeld = true; }
    // Ctrl and C (Cmd and C on a Mac) copy the first image, unless there is text to copy instead.
    const copies = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !e.repeat && e.key.toLowerCase() === 'c';
    if (copies && items.length && !String(getSelection()) && !e.target.matches?.('textarea, input:not([type=range], [type=color])')) {
      e.preventDefault();
      copy(items[0]);
    }
    const [axis, dir] = (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && ARROWS[e.key]) || [];
    // an arrow keeps its own job in a text box, on a slider, and where it scrolls
    if (axis && !e.target.matches?.('input, select, textarea') && !scrolls(e.target, axis)) {
      e.preventDefault();
      step(axis === 'x', dir);
    }
  }
  function keyup(e) {
    if (e.key === 'Control') ctrlHeld = false;
    if (e.code === 'Space') spaceHeld = false;
  }
</script>

<svelte:window
  ondragenter={dragenter}
  ondragover={dragover}
  ondragleave={dragleave}
  ondragend={() => (dragDepth = 0)}
  ondrop={drop}
  onpaste={paste}
  onkeydown={keydown}
  onkeyup={keyup}
  ontouchstart={touchstart}
  onclick={unfocus}
  onblur={() => { dragDepth = 0; clearComparison(); ctrlHeld = false; }}
  onbeforeinstallprompt={e => { e.preventDefault(); installOffer = e; }}
  onappinstalled={() => (installOffer = null)}
/>



<div class="grid" class:awaiting-images={!items.length} class:stack-captions={layout.stackCaptions}
  style:--cols={layout.cols} style:--tile-size="{layout.size}px" use:measureCanvas use:emptyImport={!items.length}>
  <div class="probe" bind:clientWidth={wallWidth} bind:clientHeight={wallHeight}></div>
  <div class="tiles">
    <!-- Theme demo variants are different immutable artwork sources. Remount only
         the demo when its source changes; real images retain their ID and caches. -->
    {#each canvasItems as item (item.id === 0 ? item.original : item.id)}
      <Tile {item} inset={IMAGE_INSET} first={ink[0]} second={ink[1]} {style} {set} {family} palette={prepared} palettePending={generatedPending} {alphaCut} {alphaMode} {metric} {maxColors} {cleanup} {dither} {ditherStrength} onpalettestatus={reportPaletteStage} {paletteRetry}
        colorUsageLabel={usageLabel(item)} usageIdentity={usageKey} onusageframe={previewUsage} analysisPending={needsAnalysis(item)} flipped={effectiveOriginal} comparing={previewing} active={!viewed} exportDisabled={generatedUnavailable || itemPaletteFailed(item)} budget={dragging ? DRAG_MS / canvasItems.length : 0}
        oncompare={compareHold} onopen={items.length ? openImage : undefined}
        exportDrag={items.length ? dragExports : undefined}
        onactivate={items.length ? undefined : () => picker.click()}
        activationLabel={items.length ? undefined : 'Add images'}
        onshare={items.length ? e => share(item, e.currentTarget) : undefined}
        oncopy={items.length ? () => copy(item) : undefined}
        onreusecolors={items.length && family === 'full-palette' ? e => outputColors(item, e.currentTarget) : undefined} reuseDisabled={usageFor(item)?.result?.count === 0}
        onsave={items.length ? () => save(item) : undefined}
        onremove={items.length ? () => (items = items.filter(i => i !== item)) : undefined} />
    {/each}
  </div>
</div>

{#if viewed}
  <ImageViewer item={viewed} analysisPending={needsAnalysis(viewed)} first={ink[0]} second={ink[1]} {style} {set} {family} palette={prepared} palettePending={generatedPending} {alphaCut} {alphaMode} {metric} {maxColors} {cleanup} {dither} {ditherStrength} onpalettestatus={reportPaletteStage} {paletteRetry} {busy} {message} flipped={viewInitialOriginal}
    colorUsageLabel={usageLabel(viewed)}
    paletteFailureNotice={failureNotice(currentPaletteFailures.filter(f => f.inputs.item === viewed))} onpaletteretry={retryPaletteFailures} exportDisabled={generatedUnavailable || itemPaletteFailed(viewed)} exportDrag={viewed.id === 0 ? undefined : dragExports}
    onsave={viewed.id === 0 ? undefined : () => save(viewed)}
    oncopy={viewed.id === 0 ? undefined : () => copy(viewed)}
    onclose={async () => { const trigger = viewTrigger, keyboard = viewKeyboardFocus; viewing = null; await tick(); if (keyboard) trigger?.focus({ preventScroll: true }); else trigger?.blur(); }} />
{/if}

<CanvasGrid {items} {example} />


<div class="workspace-tools" class:canvas-scrollable={canvasScrollable} use:measureWorkspaceTools>
<Dock bind:first bind:second bind:none bind:style bind:settings bind:showOriginal bind:dragging bind:family bind:alphaCut bind:alphaMode bind:metric bind:maxColors bind:lastMaxColors bind:cleanup bind:dither bind:ditherStrength {fullPalette} fullPresets={fullChoices} {savedPalettes} {generatedNotice} {generatedSource} {paletteFailureNotice} onpaletteretry={retryPaletteFailures} generatedEditable={!generatedPending && !generatedUnavailable} onpalette={selectPalette} onimportpalette={() => editPalette(null)} oneditpalette={editPalette} {previewing} {canvasScrollable} {autos} {soft} />
<nav class="bar file-tools" class:has-images={!!items.length} aria-label="File and app actions">
  <div class="file-actions" class:awaiting-import={!items.length} role="group" aria-label="Add and save images">
    <button class="btn glass-btn icon-only export-action" class:glass-btn--primary={!!items.length} disabled={!items.length || generatedUnavailable || items.some(itemPaletteFailed)} aria-label={items.length > 1 ? 'Save all images' : 'Save image'} use:tooltip={items.length > 1 ? 'Save all converted images as a ZIP archive.' : items.length ? 'Save the converted image at its original size.' : 'Add an image to enable saving.'} onclick={saveEverything}><PixelIcon name="save" /><span class="save-label" aria-hidden="true">Save</span></button>
    <button class="btn glass-btn icon-only import-action" onclick={() => picker.click()} aria-label={importLabel} use:tooltip={'Add images from your device, or drop or paste them onto the canvas. Images stay on your device.'}><PixelIcon name="import" /></button>
  {#if items.length}
    <button class="btn glass-btn icon-only danger file-clear" bind:this={clearTrigger} onclick={() => { clearComparison(); clearConfirm.showModal(); }} aria-label="Remove all images" use:tooltip={'Remove all images from the canvas.'}><PixelIcon name="trash" /></button>
  {/if}
  </div>
  <button class="btn glass-btn icon-only" bind:this={moreTrigger} aria-haspopup="true" aria-label="More" use:tooltip={'Open appearance, help and app options.'} onclick={e => { clearComparison(); if (e.detail) e.currentTarget.blur(); more.showModal(); }}><PixelIcon name="more" /></button>
</nav>
</div>

{#if paletteRequest}
  <PaletteImport request={paletteRequest} onsave={commitPalette} ondelete={removePalette} onreload={reloadPalette} onuse={useSessionPalette}
    onclose={async () => { paletteRequest = null; await tick(); (paletteTrigger?.isConnected ? paletteTrigger : document.querySelector('button[aria-label="Palette"]'))?.focus(); }} />
{/if}

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to Colorfetti</div>
{/if}
<!-- Any click closes the sheet: one of its buttons, or the dimmed screen around it, which counts as the dialog. -->
<dialog class="sheet glass-sheet" bind:this={sheet} aria-label="Image actions" use:backdropDismiss onclick={e => { if (e.target !== sheet) sheet.close(); }}>
  {#if shared}
    <p class="name" use:tooltip={shared.name}>{shared.name}</p>
    <button class="btn glass-btn glass-btn--primary" disabled={generatedUnavailable || itemPaletteFailed(shared)} onclick={() => { const item = shared; sheet.close(); save(item); }}><PixelIcon name="save" />Save</button>
    <button class="btn glass-btn" disabled={generatedUnavailable || itemPaletteFailed(shared)} onclick={() => { const item = shared; sheet.close(); copy(item); }}><PixelIcon name="copy" />Copy</button>
    {#if family === 'full-palette'}
      <button class="btn glass-btn" disabled={generatedUnavailable || itemPaletteFailed(shared) || usageFor(shared)?.result?.count === 0} onclick={e => { e.stopPropagation(); outputColors(shared, e.currentTarget); }}><PixelIcon name="import" />Reuse colors</button>
    {/if}
    <button class="btn glass-btn" onclick={previewShared}><PixelIcon name="expand" />Preview</button>
    <button class="btn glass-btn danger" onclick={async () => {
      const item = shared;
      sheet.close();
      items = items.filter(i => i !== item);
      await tick();
      (document.querySelector('.tile-share') ?? document.querySelector('.file-actions:not(.awaiting-import) .import-action') ?? document.querySelector('.example-add') ?? document.querySelector('.art'))?.focus();
    }}><PixelIcon name="trash" />Remove</button>
    <button class="btn glass-btn sheet-cancel">Cancel</button>
  {/if}
</dialog>
<!-- The More menu drops down from the More button. Any click closes it too. Its rows are in three
     groups with a line between: what the app is set to, what tells about it, and what throws things away. -->
<dialog class="more glass-popover" bind:this={more} aria-label="More" use:backdropDismiss onclick={e => { if (e.target !== more) more.close(); }}>
  {#if items.length}<button class="btn glass-btn danger menu-clear" onclick={() => { more.close(); clearConfirm.showModal(); }}><PixelIcon name="trash" />Remove all images</button>{/if}
  <button class="btn glass-btn" onclick={() => (themePick = otherTheme === systemTheme ? undefined : otherTheme)}>
    <PixelIcon name={otherTheme === 'dark' ? 'moon' : 'sun'} />{otherTheme === 'dark' ? 'Dark' : 'Light'} mode
  </button>
  {#if installOffer}
    <button class="btn glass-btn" onclick={install}><PixelIcon name="save" />Install</button>
  {/if}
  <hr />
  <button class="btn glass-btn" onclick={() => { more.close(); help.showModal(); }}><PixelIcon name="help" />Help</button>
  <a class="btn glass-btn" href="https://github.com/Shilo/colorfetti" target="_blank" rel="noopener">
    <PixelIcon name="github" />GitHub<PixelIcon name="out" />
  </a>
  <hr />
  <button class="btn undo glass-btn" onclick={() => { more.close(); deleteImports = false; confirm.showModal(); }}><PixelIcon name="reset" />Reset settings</button>
</dialog>
<!-- Native dialog handles focus/inertness; GlassKit provides the centered modal anatomy. -->
<dialog class="glass-modal-overlay is-active reset-modal" bind:this={confirm}
  aria-labelledby="confirm-title" aria-describedby="confirm-description"
  use:backdropDismiss onclose={() => moreTrigger?.focus()}>
  <div class="glass-modal">
    <div class="glass-modal__header"><h2 class="glass-modal__title" id="confirm-title">Reset all settings?</h2></div>
    <div class="glass-modal__body"><p id="confirm-description">Colors, styles and theme return to their defaults.<br /><br />{deleteImports ? 'Saved palettes will be deleted. Your images stay.' : 'Your images and saved palettes stay.'}</p>{#if savedPalettes.length}<label class="reset-palette-option"><input type="checkbox" bind:checked={deleteImports}/>Delete saved palettes ({savedPalettes.length})</label>{/if}</div>
    <div class="glass-modal__footer">
      <button class="glass-modal__action" onclick={() => confirm.close()}>Cancel</button>
      <button class="glass-modal__action glass-modal__action--danger" onclick={() => { confirm.close(); resetAll(); }}>{deleteImports ? 'Reset and delete palettes' : 'Reset'}</button>
    </div>
  </div>
</dialog>
<!-- Removing imports never deletes the original files. Confirm the whole-canvas action. -->
<dialog class="glass-modal-overlay is-active reset-modal" bind:this={clearConfirm}
  aria-labelledby="clear-title" aria-describedby="clear-description"
  use:backdropDismiss
  onclose={async () => { await tick(); (clearTrigger?.isConnected ? clearTrigger : moreTrigger)?.focus(); }}>
  <div class="glass-modal">
    <div class="glass-modal__header"><h2 class="glass-modal__title" id="clear-title">Remove all images?</h2></div>
    <div class="glass-modal__body"><p id="clear-description">All imported images will be removed from this canvas.<br /><br />The original files stay on your device.</p></div>
    <div class="glass-modal__footer">
      <button class="glass-modal__action" onclick={() => clearConfirm.close()}>Cancel</button>
      <button class="glass-modal__action glass-modal__action--danger" onclick={() => { clearConfirm.close(); removeAll(); }}>Remove</button>
    </div>
  </div>
</dialog>
<!-- The help, which is also the welcome on a first visit: what Colorfetti is, four steps, and the
     controls of the device in use. A click on the dimmed screen around it counts as the dialog itself. -->
<dialog class="help glass-modal" bind:this={help} aria-labelledby="help-title" onclose={() => moreTrigger?.focus({ preventScroll: true })} use:backdropDismiss>
  <div class="help-in">
    <!-- svelte-ignore a11y_autofocus -->
    <button class="ib" autofocus onclick={() => help.close()} aria-label="Close"><PixelIcon name="x" /></button>
    <header>
      <img class="help-logo" src={theme === 'dark' ? darkHelpLogoUrl : helpLogoUrl} alt="" width="56" height="56" />
      <div>
        <h2 id="help-title">Colorfetti</h2>
        <p>Throw your pixels a palette party. Recolor images and animations.</p>
      </div>
    </header>
    <ol>
      <li><PixelIcon name="import" /><b>Add</b>{touch ? 'Choose images.' : 'Choose, drop or paste images.'}</li>
      <li><PixelIcon name="grid" /><b>Palette</b>{family === 'full-palette' ? 'Use Auto, pick a palette or import your own.' : 'Pick a color pair or choose your own colors.'}</li>
      <li><PixelIcon name="sliders" /><b>{family === 'full-palette' ? 'Recolor' : 'Style'}</b>{family === 'full-palette' ? 'Tune matching, color limits and dithering.' : 'Pick an effect and tune its settings.'}</li>
      <li><PixelIcon name="save" /><b>Save</b>{family === 'full-palette' && alphaMode === 'keep' && soft ? 'Save or copy images. Save a PNG for exact translucent colors.' : 'Save or copy images.'}</li>
    </ol>
    <table>
      <thead>
        <tr>
          <th>Controls</th>
          {#if touch}<th>Touch</th>{:else}<th>Mouse</th><th>Keyboard</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#if touch}
          <tr><th>Add</th><td><kbd>Tap</kbd> <kbd><PixelIcon name="import" /></kbd></td></tr>
          <tr><th>Next palette</th><td><kbd>Swipe</kbd> <kbd>←</kbd> <kbd>→</kbd></td></tr>
          {#if family === 'two-color'}<tr><th>Next style</th><td><kbd>Swipe</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td></tr>{/if}
          <tr><th>{family === 'two-color' ? 'Style settings' : 'Palette settings'}</th><td><kbd>Tap</kbd> <kbd><PixelIcon name="sliders" /></kbd></td></tr>
          <tr><th>Preview image</th><td><kbd>Tap</kbd> <kbd>Image</kbd></td></tr>
          <tr><th>Save or copy image</th><td><kbd><PixelIcon name="more" /></kbd> → <kbd><PixelIcon name="save" /></kbd> <kbd><PixelIcon name="copy" /></kbd></td></tr>
          <tr><th>Remove image</th><td><kbd><PixelIcon name="more" /></kbd> → <kbd><PixelIcon name="trash" /></kbd></td></tr>
        {:else}
          <tr><th>Add</th><td><kbd>Click</kbd> <kbd><PixelIcon name="import" /></kbd> or <kbd>Drop</kbd></td><td><kbd>{mod}</kbd> <kbd>V</kbd></td></tr>
          <tr><th>Next palette</th><td><kbd>Shift</kbd> <kbd>Scroll</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
          {#if family === 'two-color'}<tr><th>Next style</th><td><kbd>Scroll</kbd></td><td><kbd>↑</kbd> <kbd>↓</kbd></td></tr>{/if}
          <tr><th>{family === 'two-color' ? 'Style settings' : 'Palette settings'}</th><td><kbd>Click</kbd> <kbd><PixelIcon name="sliders" /></kbd></td><td>—</td></tr>
          <tr><th>Preview image</th><td><kbd>Click</kbd> <kbd>Image</kbd></td><td><kbd>Enter</kbd></td></tr>
          <tr><th>Save or copy image</th><td><kbd>Click</kbd> <kbd><PixelIcon name="save" /></kbd> <kbd><PixelIcon name="copy" /></kbd></td><td><kbd>{mod}</kbd> <kbd>C</kbd></td></tr>
          <tr><th>Remove image</th><td><kbd>Click</kbd> <kbd><PixelIcon name="trash" /></kbd></td><td>—</td></tr>
        {/if}
      </tbody>
    </table>
    <footer>
      <a class="btn glass-btn help-trailer" href={trailerUrl} target="_blank" rel="noopener noreferrer" aria-label="Watch trailer (opens in a new tab)" use:tooltip={'Watch trailer (opens in a new tab)'}><PixelIcon name="trailer" />Trailer<PixelIcon name="out" /></a>
      <button class="btn primary glass-btn" onclick={() => help.close()}>Got it</button>
    </footer>
  </div>
</dialog>
<div class="glass-toast" class:is-visible={!viewed && (!!busy || !!message)} role="status" aria-atomic="true" hidden={!!viewed || (!busy && !message)}>
  {#if busy}<span class="spin" aria-hidden="true"></span>{/if}<span class="glass-toast__text">{busy || message}</span>
</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
