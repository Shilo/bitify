<script>
  import { analyze, mask, hexToRgb, autoThreshold } from './lib/bitify.js';
  import { unify } from './lib/bitify.js';
  import { saveOne, saveAll, copyOne, pngBlob } from './lib/save.js';
  import { fitGrid } from './lib/layout.js';
  import { restore } from './lib/settings.js';
  import { STYLES, inOrder, stepStyle, stepPalette } from './lib/presets.js';
  import { wheelSteps } from './lib/gesture.js';
  import { on } from 'svelte/events';
  import Dock from './Dock.svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import logoUrl from './assets/logo.gif';
  import logoStill from './assets/logo.png';

  const touch = matchMedia('(pointer:coarse)').matches;
  const mod = /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'; // the key the help names for pasting and copying

  // The colors, the style and every style's settings are kept between visits. A browser can refuse storage
  // (private windows, blocked site data), and then the app simply starts from the defaults.
  let stored = null;
  try {
    stored = localStorage.getItem('bitify');
  } catch {
    // no storage
  }
  const saved = restore(stored, STYLES.map(s => s[0]));

  let first = $state(saved.first); // lines and dark pixels
  let second = $state(saved.second); // fill and light pixels
  let style = $state(saved.style);
  // Each style's own settings, by style (see lib/settings.js). `set` is the current style's, as
  // a plain object that is a new one whenever any of them changes.
  let settings = $state(saved.settings);
  const set = $derived({ ...settings[style] });
  $effect(() => {
    try {
      localStorage.setItem('bitify', JSON.stringify({ first, second, style, settings }));
    } catch {
      // no storage; the settings last until the page is closed
    }
  });
  // Nothing stored means a first visit, and the help opens by itself as a welcome. Where storage
  // is refused every visit looks like the first.
  $effect(() => {
    if (stored === null) help.showModal();
  });
  let showOriginal = $state(false);
  // Changing the style or one of its settings, by any route, shows the result: the view goes back to bitified.
  $effect(() => {
    style, set; // read, so this runs when either changes
    showOriginal = false;
  });
  let spaceHeld = $state(false);
  // While a slider of the style panel is being dragged, the wall as a whole gets this many milliseconds
  // to redraw after each move, shared out between the tiles (see `budget` in Tile.svelte).
  const DRAG_MS = 24;
  let dragging = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  // The logo, shown on the empty screen as a live preview of the settings. Never saved or counted.
  let example = $state.raw(null);
  // The lowest and highest value Auto is using for the images on screen, for the Dock to show:
  // of the threshold, and of Cutout's seam strength.
  const autos = $derived.by(() => {
    const imgs = (items.length ? items : example ? [example] : []).map(i => i.img);
    const range = of => (imgs.length ? [Math.min(...imgs.map(of)), Math.max(...imgs.map(of))] : [128, 128]);
    return { threshold: range(img => autoThreshold(img, style)), seams: range(img => img.autoSeam) };
  });
  // Size of the area the wall can use, measured from the page (see .probe in app.css).
  let wallWidth = $state(0);
  let wallHeight = $state(0);
  // A tile is its square image plus a caption underneath. On touch screens the caption row also
  // holds the Share and Remove buttons, so it is taller. These mirror the sizes in app.css.
  const noHover = matchMedia('(hover: none)');
  let captionHeight = $state(noHover.matches ? 48 : 27);
  noHover.addEventListener('change', e => (captionHeight = e.matches ? 48 : 27));
  const layout = $derived(
    fitGrid(items.length, wallWidth, wallHeight, {
      gap: 16,
      extra: captionHeight,
      min: Math.max(140, Math.min(200, wallWidth * 0.16)), // smallest useful tile; below it the wall scrolls
    }),
  );
  let dragDepth = $state(0);
  let message = $state('');
  let picker;
  let nextId = 0, messageTimer;
  // On touch screens a tile's Share button opens a sheet with Copy and Download for that image.
  let sheet, more, help; // the dialogs: the Share sheet, the More menu and the help
  let shared = $state.raw(null); // the image the sheet is for; it stays set after the sheet closes, until the next one
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
  function share(item) {
    shared = item;
    sheet.showModal();
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
  // Runs `job` and gives back what it returns, with `text` on screen meanwhile if `pixels` is large.
  async function during(text, pixels, job) {
    if (pixels < BUSY_PIXELS) return job();
    running.push(text);
    busy = text;
    // The message has to be drawn before the job takes over the page. A timer, not a screen
    // frame: a hidden tab has no frames, and the job would wait until the tab was shown again.
    await new Promise(drawn => setTimeout(drawn, 50));
    try {
      return await job();
    } finally {
      running.splice(running.indexOf(text), 1);
      busy = running.at(-1) ?? ''; // the newest job still running, or nothing
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

  // The wheel steps the styles wherever it has nothing to scroll. With Shift, with Ctrl or
  // sideways it steps the palettes. Shift and the wheel scroll sideways, so Shift steps wherever
  // nothing scrolls that way, the wall included; Ctrl and the wheel never scroll, so Ctrl steps
  // everywhere. A trackpad pinch also arrives as a wheel event marked Ctrl, with no key pressed.
  // That one is left to the browser, which zooms the page, so Ctrl only counts once the keyboard
  // has said so.
  let ctrlHeld = false;
  const wheelStep = wheelSteps();
  function wheel(e) {
    if (document.querySelector('dialog[open]')) return; // nothing behind an open dialog changes
    // If the browser will not let a Ctrl move be stopped it is about to zoom, and one effect is enough.
    if (e.ctrlKey ? !ctrlHeld || !e.cancelable : scrolls(e.target, e.shiftKey ? 'x' : undefined)) return;
    e.preventDefault(); // or Ctrl and the wheel would zoom the page
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const dir = wheelStep((sideways ? e.deltaX : e.deltaY) * (e.deltaMode ? 40 : 1), e.timeStamp);
    if (dir) step(e.ctrlKey || e.shiftKey || sideways, dir);
  }

  // One finger steps the styles by moving up or down and the palettes by moving sideways,
  // wherever the page does not scroll that way: first after 32px, then every 72px.
  let swipe = null; // where the finger was at its last step, and its axis once it has one
  function touchstart(e) {
    const { clientX: x, clientY: y } = e.touches[0];
    // Two fingers are a pinch, a slider or a color picker keeps its own drag, a press that has
    // just closed a panel (the Dock stops that one) does nothing else, and nothing behind the
    // open sheet changes.
    swipe = e.touches.length === 1 && !e.defaultPrevented && !e.target.closest('input, dialog') ? { x, y } : null;
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
  const reading = $derived(`${set.source ?? 'luma'} ${set.alpha}`);

  // Turns decoded frames into an item for the wall. `original` and `img` are the first frame;
  // an animation also has `frames` (each with its own original, img and delay) and `loop`.
  function toItem(id, name, { frames, loop }) {
    const by = reading;
    for (const frame of frames) frame.img = analyze(frame.original, set.source, set.alpha);
    unify(frames.map(frame => frame.img)); // one conversion for the whole animation, so it does not flicker
    return frames.length > 1 ? { id, name, by, ...frames[0], frames, loop } : { id, name, by, ...frames[0] };
  }
  // The item analysed the way the current style reads images: itself, if it already is.
  const reread = item =>
    item.by === reading ? item : toItem(item.id, item.name, { frames: (item.frames ?? [item]).map(f => ({ original: f.original, delay: f.delay })), loop: item.loop });
  // When a setting or a change of style changes how images are read, every image is analysed
  // again. That reads every pixel, so while a slider is being dragged over a wall with a lot of
  // pixels on it, it waits for the slider to rest or be let go.
  $effect(() => {
    if (dragging && items.reduce((n, item) => n + pixelsOf(item), 0) > 1e6) return;
    const next = items.map(reread);
    if (next.some((item, i) => item !== items[i])) items = next;
    if (example) example = reread(example);
  });

  fetch(logoUrl)
    .then(response => response.blob())
    .then(decode)
    .then(decoded => (example = toItem(0, 'Example', decoded)))
    .catch(() => {}); // without it the empty screen simply has no preview

  // Each image goes on the wall as soon as it is read, so the first of a batch of photos shows
  // without waiting for the rest.
  // Remove all also stops the batches still being read, or their images would turn up on the
  // wall that was just emptied. `emptied` counts the times, for a batch to see that it has been.
  let emptied = 0;
  function removeAll() {
    emptied++;
    items = [];
  }
  async function addFiles(files) {
    let skipped = 0;
    const began = emptied;
    for (const [n, file] of files.entries()) {
      try {
        const decoded = await decode(file), { width, height } = decoded.frames[0].original, name = file.name || 'image.png';
        if (began !== emptied) return; // checked after each wait, before the next piece of work
        const reading = files.length > 1 ? `Reading ${n + 1} of ${files.length}…` : `Reading ${name}…`;
        const item = await during(reading, width * height * decoded.frames.length, () => began === emptied && toItem(++nextId, name, decoded));
        if (began !== emptied) return;
        items = [...items, item];
      } catch {
        skipped++;
      }
    }
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  // What gets saved: the two colors with a still image's mask, or with one mask per frame of an
  // animation. These masks are of every pixel, always: never the smaller picture a tile draws.
  // `asked` is the settings at the moment of asking (see `asking`). A long job starts a moment
  // after it is asked for, and what it saves is what was on screen then, whatever is changed since.
  const asking = () => ({ first, second, style, set });
  const about = (item, asked) => ({ name: item.name, w: item.img.w, h: item.img.h, first: asked.first, second: asked.second });
  const still = (item, asked) => ({ ...about(item, asked), mask: mask(item.img, asked.style, asked.set) });
  const bitified = (item, asked) =>
    item.frames
      ? { ...about(item, asked), loop: item.loop, frames: item.frames.map(f => ({ mask: mask(f.img, asked.style, asked.set), delay: f.delay })) }
      : still(item, asked);

  async function save(item) {
    try {
      const asked = asking();
      await during(`Saving ${item.name}…`, pixelsOf(item), () => saveOne(bitified(item, asked)));
    } catch {
      say(`${item.name} could not be saved.`);
    }
  }

  // The clipboard takes a PNG but not a GIF, so an animation is copied as its first frame.
  async function copy(item) {
    try {
      const asked = asking();
      // the clipboard is asked at once, as Safari demands, and handed the PNG when it has been made
      await copyOne(during(`Copying ${item.name}…`, item.img.w * item.img.h, () => pngBlob(still(item, asked))));
      say(`${item.name} copied${item.frames ? ' as a still image' : ''}.`);
    } catch {
      say(`${item.name} could not be copied.`);
    }
  }

  async function saveEverything() {
    try {
      const asked = asking(), all = items; // the images on the wall now, even if some are removed before the job starts
      const saving = all.length > 1 ? `Saving ${all.length} images…` : `Saving ${all[0].name}…`;
      await during(saving, all.reduce((sum, item) => sum + pixelsOf(item), 0), () => saveAll(all, item => bitified(item, asked)));
    } catch {
      say('The images could not be saved.');
    }
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
  onblur={() => { dragDepth = 0; spaceHeld = false; ctrlHeld = false; }}
  onbeforeinstallprompt={e => { e.preventDefault(); installOffer = e; }}
  onappinstalled={() => (installOffer = null)}
/>

<header class="bar">
  <span class="mark">Bitify</span>
  <span class="count">{items.length} image{items.length === 1 ? '' : 's'}</span>
  <span class="grow"></span>
  {#if items.length}
    <button class="btn sm" onclick={removeAll} aria-label="Remove all" title="Remove all"><PixelIcon name="trash" /></button>
  {/if}
  <button class="btn" onclick={() => picker.click()}><PixelIcon name="plus" />Add<span class="wide">images</span></button>
  <!-- A mouse click gives up focus before the menu opens, or closing the menu would hand it back (see unfocus). -->
  <button class="btn sm" aria-haspopup="true" aria-label="More" title="More" onclick={e => { if (e.detail) e.currentTarget.blur(); more.showModal(); }}><PixelIcon name="more" /></button>
</header>

{#if items.length}
  <div class="grid" style:--cols={layout.cols} style:--tile-size="{layout.size}px">
    <div class="probe" bind:clientWidth={wallWidth} bind:clientHeight={wallHeight}></div>
    <div class="tiles">
      {#each items as item (item.id)}
        <Tile
          {item}
          {first}
          {second}
          {style}
          {set}
          flipped={showOriginal !== spaceHeld}
          budget={dragging ? DRAG_MS / items.length : 0}
          onshare={() => share(item)}
          oncopy={() => copy(item)}
          onsave={() => save(item)}
          onremove={() => (items = items.filter(i => i !== item))}
        />
      {/each}
    </div>
  </div>
{:else}
  <div class="empty">
    <div class="empty-in">
      {#if example}
        <Tile item={example} {first} {second} {style} {set} flipped={showOriginal !== spaceHeld} />
      {/if}
      <div class="empty-text">
        <h2>Pixel art in two colors</h2>
        <p>Instantly convert sprites and animated GIFs<br />to <span>1-bit</span> colors and styles.</p>
        <button class="btn primary" onclick={() => picker.click()}>{touch ? 'Choose images' : 'Drop, paste or choose images'}</button>
      </div>
    </div>
  </div>
{/if}

<Dock bind:first bind:second bind:style bind:settings bind:showOriginal bind:dragging {autos} count={items.length} onsaveall={saveEverything} />

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to bitify</div>
{/if}
<!-- Any click closes the sheet: one of its buttons, or the dimmed screen around it, which counts as the dialog. -->
<dialog class="sheet" bind:this={sheet} aria-label="Share" onclick={() => sheet.close()}>
  {#if shared}
    <p class="name" title={shared.name}>{shared.name}</p>
    <button class="btn" onclick={() => copy(shared)}><PixelIcon name="copy" />Copy</button>
    <button class="btn" onclick={() => save(shared)}><PixelIcon name="save" />Download</button>
    <button class="btn">Cancel</button>
  {/if}
</dialog>
<!-- The More menu drops down from the More button. Any click closes it too. -->
<dialog class="more" bind:this={more} aria-label="More" onclick={() => more.close()}>
  <button class="btn" onclick={() => { more.close(); help.showModal(); }}><PixelIcon name="help" />Help</button>
  <a class="btn" href="https://github.com/Shilo/bitify" target="_blank" rel="noopener">
    <svg class="ico" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" /></svg>GitHub
  </a>
  {#if installOffer}
    <button class="btn" onclick={install}><PixelIcon name="save" />Install</button>
  {/if}
</dialog>
<!-- The help, which is also the welcome on a first visit: what Bitify is, four steps, and the
     controls of the device in use. A click on the dimmed screen around it counts as the dialog itself. -->
<dialog class="help" bind:this={help} aria-labelledby="help-title" onclick={e => e.target === help && help.close()}>
  <div class="help-in">
    <button class="ib" onclick={() => help.close()} aria-label="Close" title="Close"><PixelIcon name="x" /></button>
    <header>
      <img src={logoStill} alt="" />
      <div>
        <h2 id="help-title">Bitify</h2>
        <p>Instantly convert sprites and animated GIFs to <span>1-bit</span> colors and styles.</p>
      </div>
    </header>
    <ol>
      <li><PixelIcon name="plus" /><b>Add</b>{touch ? 'Choose images.' : 'Drop, paste or choose images.'}</li>
      <li><PixelIcon name="grid" /><b>Palette</b>Pick two colors, or a preset.</li>
      <li><PixelIcon name="sliders" /><b>Style</b>Pick effect, tune its settings.</li>
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
          <tr><th>Add image</th><td><kbd>Touch</kbd> <kbd><PixelIcon name="plus" /></kbd></td></tr>
          <tr><th>Next palette</th><td><kbd>Swipe</kbd> <kbd>←</kbd> <kbd>→</kbd></td></tr>
          <tr><th>Next style</th><td><kbd>Swipe</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td></tr>
          <tr><th>See original image</th><td><kbd>Hold</kbd> <kbd>Image</kbd></td></tr>
          <!-- on touch screens a tile's Download and Copy are behind its Share button -->
          <tr><th>Save image</th><td><kbd>Touch</kbd> <kbd><PixelIcon name="share" /></kbd></td></tr>
        {:else}
          <tr><th>Add image</th><td><kbd>Drag</kbd> <kbd>Drop</kbd></td><td><kbd>{mod}</kbd> <kbd>V</kbd></td></tr>
          <tr><th>Next palette</th><td><kbd>Shift</kbd> <kbd>Scroll</kbd></td><td><kbd>←</kbd> <kbd>→</kbd></td></tr>
          <tr><th>Next style</th><td><kbd>Scroll</kbd></td><td><kbd>↑</kbd> <kbd>↓</kbd></td></tr>
          <tr><th>See original image</th><td><kbd>Press</kbd> <kbd>Image</kbd></td><td><kbd>Space</kbd></td></tr>
          <tr><th>Save image</th><td><kbd>Click</kbd> <kbd><PixelIcon name="save" /></kbd> <kbd><PixelIcon name="copy" /></kbd></td><td><kbd>{mod}</kbd> <kbd>C</kbd></td></tr>
        {/if}
      </tbody>
    </table>
    <footer>
      <span>Images never leave your device.</span>
      <!-- svelte-ignore a11y_autofocus -->
      <button class="btn primary" autofocus onclick={() => help.close()}>Got it</button>
    </footer>
  </div>
</dialog>
<div class="toast" role="status" hidden={!busy && !message}>{#if busy}<span class="spin" aria-hidden="true"></span>{/if}{busy || message}</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
