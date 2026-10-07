<script>
  import { analyze, mask, colorize, hexToRgb, autoThreshold } from './lib/bitify.js';
  import { unify } from './lib/bitify.js';
  import { saveOne, saveAll, copyOne } from './lib/save.js';
  import { fitGrid } from './lib/layout.js';
  import { restore } from './lib/settings.js';
  import { STYLES, inOrder, stepStyle, stepPalette } from './lib/presets.js';
  import { wheelSteps } from './lib/gesture.js';
  import { on } from 'svelte/events';
  import Dock from './Dock.svelte';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import logoUrl from './assets/logo.gif';

  const touch = matchMedia('(pointer:coarse)').matches;

  // The colors, style and threshold are kept between visits. A browser can refuse storage
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
  let threshold = $state(saved.threshold); // null means Auto
  $effect(() => {
    try {
      localStorage.setItem('bitify', JSON.stringify({ first, second, style, threshold }));
    } catch {
      // no storage; the settings last until the page is closed
    }
  });
  let showOriginal = $state(false);
  // Changing the style or the threshold, by any route, shows the result: the view goes back to bitified.
  $effect(() => {
    style, threshold; // read, so this runs when either changes
    showOriginal = false;
  });
  let spaceHeld = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  // The logo, shown on the empty screen as a live preview of the settings. Never saved or counted.
  let example = $state.raw(null);
  // The lowest and highest threshold Auto is using for the images on screen, for the Dock to show.
  const autoRange = $derived.by(() => {
    const autos = (items.length ? items : example ? [example] : []).map(i => autoThreshold(i.img, style));
    return autos.length ? [Math.min(...autos), Math.max(...autos)] : [128, 128];
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
  let sheet;
  let shared = $state.raw(null); // the image the sheet is for; it stays set after the sheet closes, until the next one
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
    return { frames: [{ original: ctx.getImageData(0, 0, canvas.width, canvas.height) }] };
  }

  // Turns decoded frames into an item for the wall. `original` and `img` are the first frame;
  // an animation also has `frames` (each with its own original, img and delay) and `loop`.
  function toItem(id, name, { frames, loop }) {
    for (const frame of frames) frame.img = analyze(frame.original);
    unify(frames.map(frame => frame.img)); // one conversion for the whole animation, so it does not flicker
    return frames.length > 1 ? { id, name, ...frames[0], frames, loop } : { id, name, ...frames[0] };
  }

  fetch(logoUrl)
    .then(response => response.blob())
    .then(decode)
    .then(decoded => (example = toItem(0, 'Example', decoded)))
    .catch(() => {}); // without it the empty screen simply has no preview

  async function addFiles(files) {
    const added = [];
    let skipped = 0;
    for (const file of files) {
      try {
        added.push(toItem(++nextId, file.name || 'image.png', await decode(file)));
      } catch {
        skipped++;
      }
    }
    if (added.length) items = [...items, ...added];
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  // What gets saved: a still image as its two-color pixels, an animation as one mask per frame.
  const bitified = item => {
    const base = { name: item.name, w: item.img.w, h: item.img.h };
    return item.frames
      ? { ...base, first, second, loop: item.loop, frames: item.frames.map(f => ({ mask: mask(f.img, style, threshold), delay: f.delay })) }
      : { ...base, pixels: colorize(mask(item.img, style, threshold), first, second) };
  };

  async function save(item) {
    try {
      await saveOne(bitified(item));
    } catch {
      say(`${item.name} could not be saved.`);
    }
  }

  // The clipboard takes a PNG but not a GIF, so an animation is copied as its first frame.
  async function copy(item) {
    try {
      await copyOne({ pixels: colorize(mask(item.img, style, threshold), first, second), w: item.img.w, h: item.img.h });
      say(`${item.name} copied${item.frames ? ' as a still image' : ''}.`);
    } catch {
      say(`${item.name} could not be copied.`);
    }
  }

  async function saveEverything() {
    try {
      await saveAll(items.map(bitified));
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
/>

<header class="bar">
  <span class="mark">Bitify</span>
  <span class="count">{items.length} image{items.length === 1 ? '' : 's'}</span>
  <span class="grow"></span>
  {#if items.length}
    <button class="btn sm" onclick={() => (items = [])} aria-label="Remove all" title="Remove all"><PixelIcon name="trash" /></button>
  {/if}
  <a class="ib gh" href="https://github.com/Shilo/bitify" target="_blank" rel="noopener" aria-label="Bitify on GitHub" title="Bitify on GitHub">
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" /></svg>
  </a>
  <button class="btn" onclick={() => picker.click()}><PixelIcon name="plus" />Add<span class="wide">images</span></button>
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
          {threshold}
          flipped={showOriginal !== spaceHeld}
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
        <Tile item={example} {first} {second} {style} {threshold} flipped={showOriginal !== spaceHeld} />
      {/if}
      <div class="empty-text">
        <h2>Pixel art in two colors</h2>
        <p>Instantly convert sprites and animated GIFs to <span>1-bit</span> colors and styles.</p>
        <button class="btn primary" onclick={() => picker.click()}>{touch ? 'Choose images' : 'Drop or choose images'}</button>
      </div>
    </div>
  </div>
{/if}

<Dock bind:first bind:second bind:style bind:threshold bind:showOriginal {autoRange} count={items.length} onsaveall={saveEverything} />

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
<div class="toast" role="status" hidden={!message}>{message}</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
