<script>
  import { analyze, mask, hexToRgb, autoThreshold, spritesOf } from './lib/bitify.js';
  import { unify } from './lib/bitify.js';
  import { saveOne, saveAll, copyOne, pngBlob, downloadName } from './lib/save.js';
  import { fitImageWall, IMAGE_INSET } from './lib/workspace.js';
  import { restore } from './lib/settings.js';
  import { STYLES, inOrder, inks, stepStyle, stepPalette } from './lib/presets.js';
  import { wheelSteps } from './lib/gesture.js';
  import { on } from 'svelte/events';
  import { tick } from 'svelte';
  import { imageGesture } from './lib/image-gesture.js';
  import CanvasGrid from './CanvasGrid.svelte';
  import Dock from './Dock.svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import ImageViewer from './ImageViewer.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { packWorkspaceControls } from './lib/workspace-controls.js';
  import logoUrl from './assets/logo.gif';
  import helpLogoUrl from './assets/logo.png';

  const storageKey = 'bitify';
  const touch = matchMedia('(pointer:coarse)').matches;
  const mod = /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'; // the key the help names for pasting and copying

  // The colors, the style and every style's settings are kept between visits. A browser can refuse storage
  // (private windows, blocked site data), and then the app simply starts from the defaults.
  let stored = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    // no storage
  }
  const saved = restore(stored, STYLES.map(s => s[0]));

  let first = $state(saved.first); // lines and dark pixels
  let second = $state(saved.second); // fill and light pixels
  let none = $state(saved.none); // which of the two is None, and left out of the picture: 0 neither, 1 the first, 2 the second
  let style = $state(saved.style);
  // Each style's own settings, by style (see lib/settings.js). `set` is the current style's, as
  // a plain object that is a new one whenever any of them changes.
  let settings = $state(saved.settings);
  const set = $derived({ ...settings[style] });
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
      localStorage.setItem(storageKey, JSON.stringify({ first, second, none, style, settings, theme: themePick }));
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
      const placement = packWorkspaceControls(groups.map(el => el.getBoundingClientRect().width), available, gap);
      // Popups follow the editing pair only while the measured layout is centered.
      node.classList.toggle('editing-centered', placement[0].offset > 0);
      groups.forEach((el, i) => {
        const { row, side, offset } = placement[i];
        const styles = { gridRow: String(row), justifySelf: side === 'left' ? 'start' : 'end', marginLeft: side === 'left' ? `${offset}px` : '0px', marginRight: side === 'right' ? `${offset}px` : '0px' };
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
    const reconnect = () => { resize.disconnect(); resize.observe(node); for (const el of node.querySelectorAll('.panel,.menu,.tray,.color-tools,.style-tools,.file-actions,.file-tools > .btn')) resize.observe(el); measure(); };
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
    first, second, none, style, set;
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
  // The logo, shown on the empty screen as a live preview of the settings. Never exported.
  let example = $state.raw(null);
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
    const cuts = style === 'stencil' && imgs.length ? [Math.min(...imgs.map(img => spritesOf(img).cuts[0])), Math.max(...imgs.map(img => spritesOf(img).cuts[1]))] : [0, 0];
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
    const fresh = restore(null, STYLES.map(s => s[0]));
    ({ first, second, none, style, settings } = fresh);
    themePick = fresh.theme;
    say('Settings reset.');
  }
  let shared = $state.raw(null), sharedTrigger; // the image the sheet is for; it stays set after the sheet closes, until the next one
  // But not once that image is removed, or the sheet would go on holding all of a photo's pixels.
  $effect(() => {
    if (shared && !items.includes(shared)) shared = null;
  });
  // The browser's offer to install Bitify as an app. It comes only where that can be done and is
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
    running.push(text);
    busy = text;
    return () => {
      running.splice(running.indexOf(text), 1);
      busy = running.at(-1) ?? ''; // the newest job still running, or nothing
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
  async function decode(file) {
    if (file.type === 'image/gif') {
      try {
        // the GIF code is only downloaded the first time a GIF is added
        const { decodeGif } = await import('./lib/gif.js');
        const gif = decodeGif(new Uint8Array(await file.arrayBuffer()));
        if (gif.frames.length > 1) {
          const frames = gif.frames.map(f => ({ original: new ImageData(f.data, gif.width, gif.height), delay: f.delay }));
          return { frames, loop: gif.loop };
        }
      } catch {
        // not a GIF we can read ourselves; let the browser try below
      }
    }
    const bitmap = await createImageBitmap(file);
    const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = 0; // gives the canvas's memory back now; iOS limits how much all canvases may hold
    return { frames: [{ original }] };
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
  function toItem(id, name, { frames, loop }) {
    for (const frame of frames) frame.img = analyze(frame.original, set.source, set.alpha);
    unify(frames.map(frame => frame.img)); // one conversion for the whole animation, so it does not flicker
    const by = readBy(frames[0].img.soft);
    return frames.length > 1 ? { id, name, by, ...frames[0], frames, loop } : { id, name, by, ...frames[0] };
  }
  // The item analysed the way the current style reads images: itself, if it already is.
  const reread = item =>
    item.by === readBy(item.img.soft) ? item : toItem(item.id, item.name, { frames: (item.frames ?? [item]).map(f => ({ original: f.original, delay: f.delay })), loop: item.loop });
  // When a setting or a change of style changes how images are read, every image is analysed
  // again. That reads every pixel, so while a slider is being dragged over a wall with a lot of
  // pixels on it, it waits for the slider to rest or be let go.
  // It runs before the tiles redraw (`pre`): after them, each tile would first convert its image
  // as it was analysed before, and then again.
  $effect.pre(() => {
    if (dragging && items.reduce((n, item) => n + pixelsOf(item), 0) > 1e6) return;
    const next = items.map(reread);
    if (next.some((item, i) => item !== items[i])) items = next;
    if (example) example = reread(example);
  });

  fetch(logoUrl)
    .then(response => response.blob())
    .then(decode)
    .then(decoded => (example = toItem(0, 'Bitify', decoded)))
    .catch(() => {}); // without it the empty screen simply has no preview

  // Each image goes on the wall as soon as it is read, so the first of a batch of photos shows
  // without waiting for the rest.
  // Remove all also stops the batches still being read, or their images would turn up on the
  // wall that was just emptied. `emptied` counts the times, for a batch to see that it has been.
  let emptied = 0;
  function removeAll() {
    emptied++;
    clearComparison(); items = [];
  }
  async function addFiles(files) {
    let skipped = 0, fresh = [], shownAt = 0, done;
    const began = emptied;
    // A photo goes on the wall as soon as it is read. Sprites are read far quicker than the wall
    // can be fitted again around each one, so those read within a quarter of a second go on together.
    const show = () => {
      if (fresh.length) items = [...items, ...fresh];
      fresh = [];
      shownAt = performance.now();
    };
    try {
      for (const [n, file] of files.entries()) {
        try {
          const decoded = await decode(file), { width, height } = decoded.frames[0].original, name = file.name || 'image.png';
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
          fresh.push(toItem(++nextId, name, decoded));
          if (performance.now() - shownAt > 250) show();
        } catch {
          skipped++;
        }
      }
      show();
    } finally {
      done?.();
    }
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  // What gets saved: the two colors as they are drawn, with a still image's mask, or with one mask per frame of an
  // animation. These masks are of every pixel, always: never the smaller picture a tile draws.
  // `asked` is the settings at the moment of asking (see `asking`). A long job starts a moment
  // after it is asked for, and what it saves is what was on screen then, whatever is changed since.
  const asking = () => ({ first: ink[0], second: ink[1], style, set });
  const about = (item, asked) => ({ name: item.name, w: item.img.w, h: item.img.h, first: asked.first, second: asked.second });
  const still = (item, asked) => ({ ...about(item, asked), mask: mask(item.img, asked.style, asked.set) });
  const bitified = (item, asked) =>
    item.frames
      ? { ...about(item, asked), loop: item.loop, frames: item.frames.map(f => ({ mask: mask(f.img, asked.style, asked.set), delay: f.delay })) }
      : still(item, asked);

  async function save(item) {
    try {
      const downloading = `Downloading ${downloadName(item)}…`;
      say(downloading);
      const asked = asking(), read = reread(item); // analysed as asked, also while a drag has put that off for the wall
      await during(downloading, pixelsOf(item), () => saveOne(bitified(read, asked)));
      say(downloading);
    } catch {
      say(`${item.name} could not be saved.`);
    }
  }

  // The clipboard takes a PNG but not a GIF, so an animation is copied as its first frame.
  async function copy(item) {
    try {
      const asked = asking(), read = reread(item);
      // the clipboard is asked at once, as Safari demands, and handed the PNG when it has been made
      await copyOne(during(`Copying ${item.name}…`, item.img.w * item.img.h, () => pngBlob(still(read, asked))));
      say(`${item.name} copied${item.frames ? ' as a still image' : ''}.`);
    } catch {
      say(`${item.name} could not be copied.`);
    }
  }

  async function saveEverything() {
    try {
      const selected = [...items]; // the images on the wall now, even if some are removed before the job starts
      if (!selected.length) return;
      const downloading = selected.length > 1
        ? `Downloading bitify.zip (${selected.length} images)…`
        : `Downloading ${downloadName(selected[0])}…`;
      say(downloading);
      const asked = asking(), all = selected.map(reread);
      await during(downloading, all.reduce((sum, item) => sum + pixelsOf(item), 0), () => saveAll(all, item => bitified(item, asked)));
      say(downloading);
    } catch {
      say('The images could not be saved.');
    }
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

  const hasFiles = e => e.dataTransfer?.types.includes('Files');
  function dragenter(e) {
    if (hasFiles(e)) { e.preventDefault(); dragDepth++; }
  }
  function dragover(e) {
    if (hasFiles(e)) e.preventDefault();
  }
  function dragleave(e) {
    if (hasFiles(e)) dragDepth = Math.max(0, dragDepth - 1);
  }
  function drop(e) {
    e.preventDefault();
    dragDepth = 0;
    if (e.dataTransfer?.files.length) addFiles([...e.dataTransfer.files]);
  }
  function paste(e) {
    if (e.clipboardData?.files.length) addFiles([...e.clipboardData.files]);
  }

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
    {#each canvasItems as item (item.id)}
      <Tile {item} inset={IMAGE_INSET} first={ink[0]} second={ink[1]} {style} {set}
        flipped={effectiveOriginal} comparing={previewing} budget={dragging ? DRAG_MS / canvasItems.length : 0}
        oncompare={compareHold} onopen={items.length ? openImage : undefined}
        onactivate={items.length ? undefined : () => picker.click()}
        activationLabel={items.length ? undefined : 'Add images'}
        onshare={items.length ? e => share(item, e.currentTarget) : undefined}
        oncopy={items.length ? () => copy(item) : undefined}
        onsave={items.length ? () => save(item) : undefined}
        onremove={items.length ? () => (items = items.filter(i => i !== item)) : undefined} />
    {/each}
  </div>
</div>

{#if viewed}
  <ImageViewer item={viewed} first={ink[0]} second={ink[1]} {style} {set} {busy} {message} flipped={viewInitialOriginal}
    onsave={viewed.id === 0 ? undefined : () => save(viewed)}
    oncopy={viewed.id === 0 ? undefined : () => copy(viewed)}
    onclose={async () => { const trigger = viewTrigger, keyboard = viewKeyboardFocus; viewing = null; await tick(); if (keyboard) trigger?.focus({ preventScroll: true }); else trigger?.blur(); }} />
{/if}

<CanvasGrid {items} {example} />

<div class="workspace-tools" class:canvas-scrollable={canvasScrollable} use:measureWorkspaceTools>
<Dock bind:first bind:second bind:none bind:style bind:settings bind:showOriginal bind:dragging {previewing} {canvasScrollable} {autos} {soft} />
<nav class="bar file-tools" class:has-images={!!items.length} aria-label="File and app actions">
  <div class="file-actions" class:awaiting-import={!items.length} role="group" aria-label="Add and save images">
  {#if items.length}
    <button class="btn glass-btn icon-only danger file-clear" bind:this={clearTrigger} onclick={() => { clearComparison(); clearConfirm.showModal(); }} aria-label="Remove all images" use:tooltip={'Remove all images from the canvas.'}><PixelIcon name="trash" /></button>
  {/if}

    <button class="btn glass-btn icon-only import-action" onclick={() => picker.click()} aria-label={importLabel} use:tooltip={'Add images from your device, or drop or paste them onto the canvas. Images stay on your device.'}><PixelIcon name="import" /></button>
    <button class="btn glass-btn icon-only export-action" class:glass-btn--primary={!!items.length} disabled={!items.length} aria-label={items.length > 1 ? 'Save all images' : 'Save image'} use:tooltip={items.length > 1 ? 'Save all converted images as a ZIP archive.' : items.length ? 'Save the converted image at its original size.' : 'Add an image to enable saving.'} onclick={saveEverything}><PixelIcon name="save" /></button>
  </div>
  <button class="btn glass-btn icon-only" bind:this={moreTrigger} aria-haspopup="true" aria-label="More" use:tooltip={'Open appearance, help and app options.'} onclick={e => { clearComparison(); if (e.detail) e.currentTarget.blur(); more.showModal(); }}><PixelIcon name="more" /></button>
</nav>
</div>

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to bitify</div>
{/if}
<!-- Any click closes the sheet: one of its buttons, or the dimmed screen around it, which counts as the dialog. -->
<dialog class="sheet glass-sheet" bind:this={sheet} aria-label="Image actions" onclick={() => sheet.close()}>
  {#if shared}
    <p class="name" use:tooltip={shared.name}>{shared.name}</p>
    <button class="btn glass-btn glass-btn--primary" onclick={() => { const item = shared; sheet.close(); save(item); }}><PixelIcon name="save" />Save</button>
    <button class="btn glass-btn" onclick={() => { const item = shared; sheet.close(); copy(item); }}><PixelIcon name="copy" />Copy</button>
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
<dialog class="more glass-popover" bind:this={more} aria-label="More" onclick={() => more.close()}>
  {#if items.length}<button class="btn glass-btn danger menu-clear" onclick={() => { more.close(); clearConfirm.showModal(); }}><PixelIcon name="trash" />Remove all images</button>{/if}
  <button class="btn glass-btn" onclick={() => (themePick = otherTheme === systemTheme ? undefined : otherTheme)}>
    <PixelIcon name={otherTheme === 'dark' ? 'moon' : 'sun'} />{otherTheme === 'dark' ? 'Dark' : 'Light'} mode
  </button>
  {#if installOffer}
    <button class="btn glass-btn" onclick={install}><PixelIcon name="save" />Install</button>
  {/if}
  <hr />
  <button class="btn glass-btn" onclick={() => { more.close(); help.showModal(); }}><PixelIcon name="help" />Help</button>
  <a class="btn glass-btn" href="https://github.com/Shilo/bitify" target="_blank" rel="noopener">
    <PixelIcon name="github" />GitHub<PixelIcon name="out" />
  </a>
  <hr />
  <button class="btn undo glass-btn" onclick={() => { more.close(); confirm.showModal(); }}><PixelIcon name="reset" />Reset settings</button>
</dialog>
<!-- Native dialog handles focus/inertness; GlassKit provides the centered modal anatomy. -->
<dialog class="glass-modal-overlay is-active reset-modal" bind:this={confirm}
  aria-labelledby="confirm-title" aria-describedby="confirm-description"
  onclick={e => e.target === confirm && confirm.close()} onclose={() => moreTrigger?.focus()}>
  <div class="glass-modal">
    <div class="glass-modal__header"><h2 class="glass-modal__title" id="confirm-title">Reset all settings?</h2></div>
    <div class="glass-modal__body"><p id="confirm-description">Colors, styles and theme return to their defaults.<br /><br />Your images stay.</p></div>
    <div class="glass-modal__footer">
      <button class="glass-modal__action" onclick={() => confirm.close()}>Cancel</button>
      <button class="glass-modal__action glass-modal__action--danger" onclick={() => { confirm.close(); resetAll(); }}>Reset</button>
    </div>
  </div>
</dialog>
<!-- Removing imports never deletes the original files. Confirm the whole-canvas action. -->
<dialog class="glass-modal-overlay is-active reset-modal" bind:this={clearConfirm}
  aria-labelledby="clear-title" aria-describedby="clear-description"
  onclick={e => e.target === clearConfirm && clearConfirm.close()}
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
<!-- The help, which is also the welcome on a first visit: what Bitify is, four steps, and the
     controls of the device in use. A click on the dimmed screen around it counts as the dialog itself. -->
<dialog class="help glass-modal" bind:this={help} aria-labelledby="help-title" onclick={e => e.target === help && help.close()}>
  <div class="help-in">
    <button class="ib" onclick={() => help.close()} aria-label="Close" use:tooltip={'Dismiss this help window.'}><PixelIcon name="x" /></button>
    <header>
      <img class="help-logo" src={helpLogoUrl} alt="" width="48" height="48" />
      <div>
        <h2 id="help-title">Bitify</h2>
        <p>Instantly convert sprites and animated GIFs to <span>1-bit</span> colors and styles.</p>
      </div>
    </header>
    <ol>
      <li><PixelIcon name="import" /><b>Add</b>{touch ? 'Choose images.' : 'Choose, drop or paste images.'}</li>
      <li><PixelIcon name="grid" /><b>Palette</b>Pick one or two colors, or a preset.</li>
      <li><PixelIcon name="sliders" /><b>Style</b>Pick an effect. Tune its settings.</li>
      <li><PixelIcon name="save" /><b>Save</b>Download or copy images.</li>
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
          <tr><th>Next style</th><td><kbd>Swipe</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td></tr>
          <tr><th>Style settings</th><td><kbd>Tap</kbd> <kbd><PixelIcon name="sliders" /></kbd></td></tr>
          <tr><th>Preview image</th><td><kbd>Tap</kbd> <kbd>Image</kbd></td></tr>
          <tr><th>Save or copy image</th><td><kbd><PixelIcon name="more" /></kbd> → <kbd><PixelIcon name="save" /></kbd> <kbd><PixelIcon name="copy" /></kbd></td></tr>
          <tr><th>Remove image</th><td><kbd><PixelIcon name="more" /></kbd> → <kbd><PixelIcon name="trash" /></kbd></td></tr>
        {:else}
          <tr><th>Add</th><td><kbd>Click</kbd> <kbd><PixelIcon name="import" /></kbd> or <kbd>Drop</kbd></td><td><kbd>{mod}</kbd> <kbd>V</kbd></td></tr>
          <tr><th>Next palette</th><td><kbd>Shift</kbd> <kbd>Scroll</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
          <tr><th>Next style</th><td><kbd>Scroll</kbd></td><td><kbd>↑</kbd> <kbd>↓</kbd></td></tr>
          <tr><th>Style settings</th><td><kbd>Click</kbd> <kbd><PixelIcon name="sliders" /></kbd></td><td>—</td></tr>
          <tr><th>Preview image</th><td><kbd>Click</kbd> <kbd>Image</kbd></td><td><kbd>Enter</kbd></td></tr>
          <tr><th>Save or copy image</th><td><kbd>Click</kbd> <kbd><PixelIcon name="save" /></kbd> <kbd><PixelIcon name="copy" /></kbd></td><td><kbd>{mod}</kbd> <kbd>C</kbd></td></tr>
          <tr><th>Remove image</th><td><kbd>Click</kbd> <kbd><PixelIcon name="trash" /></kbd></td><td>—</td></tr>
        {/if}
      </tbody>
    </table>
    <footer>
      <span>Images stay on your device.</span>
      <!-- svelte-ignore a11y_autofocus -->
      <button class="btn primary glass-btn" autofocus onclick={() => help.close()}>Got it</button>
    </footer>
  </div>
</dialog>
<div class="glass-toast" class:is-visible={!viewed && (!!busy || !!message)} role="status" aria-atomic="true" hidden={!!viewed || (!busy && !message)}>
  {#if busy}<span class="spin" aria-hidden="true"></span>{/if}<span class="glass-toast__text">{busy || message}</span>
</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
