<script>
  import { analyze, mask, colorize, hexToRgb } from './lib/bitify.js';
  import { saveOne } from './lib/save.js';
  import Tile from './Tile.svelte';
  import PixelIcon from './PixelIcon.svelte';

  const touch = matchMedia('(pointer:coarse)').matches;

  let first = $state('#f6dfa4'); // lines and dark pixels
  let second = $state('#0b0a0c'); // fill and light pixels
  let style = $state('lines');
  let threshold = $state(null); // null means Auto
  let showOriginal = $state(false);
  // raw: items hold large typed arrays, and the list is only ever replaced, never mutated
  let items = $state.raw([]);
  let dragDepth = $state(0);
  let message = $state('');
  let picker;
  let nextId = 0, messageTimer;

  // Text color for the drop screen: the first color, unless it is too close to the second to read.
  const brightness = hex => {
    const [r, g, b] = hexToRgb(hex).map(v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const overlayInk = $derived.by(() => {
    const a = brightness(first), b = brightness(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 2.5 ? first : b > 0.4 ? '#000000' : '#ffffff';
  });

  function say(text) {
    message = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (message = ''), 3200);
  }

  async function decode(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = Object.assign(document.createElement('canvas'), { width: bitmap.width, height: bitmap.height });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function addFiles(files) {
    const added = [];
    let skipped = 0;
    for (const file of files) {
      try {
        const original = await decode(file);
        added.push({ id: ++nextId, name: file.name || 'image.png', original, img: analyze(original) });
      } catch {
        skipped++;
      }
    }
    if (added.length) items = [...items, ...added];
    if (skipped) say(`${skipped} file${skipped === 1 ? '' : 's'} skipped. Bitify reads PNG, GIF, WebP, JPEG and BMP images.`);
  }

  const bitified = item => ({
    name: item.name,
    pixels: colorize(mask(item.img, style, threshold), first, second),
    w: item.img.w,
    h: item.img.h,
  });

  async function save(item) {
    try {
      await saveOne(bitified(item));
    } catch {
      say(`${item.name} could not be saved.`);
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
</script>

<svelte:window
  ondragenter={dragenter}
  ondragover={dragover}
  ondragleave={dragleave}
  ondrop={drop}
  onpaste={paste}
  onblur={() => (dragDepth = 0)}
/>

<header class="bar">
  <span class="mark">Bitify</span>
  <span class="count">{items.length} image{items.length === 1 ? '' : 's'}</span>
  <span class="grow"></span>
  {#if items.length}
    <button class="btn quiet" onclick={() => (items = [])}>Remove all</button>
  {/if}
  <button class="btn" onclick={() => picker.click()}><PixelIcon name="plus" />Add<span class="wide">images</span></button>
</header>

{#if items.length}
  <div class="grid">
    {#each items as item (item.id)}
      <Tile
        {item}
        {first}
        {second}
        {style}
        {threshold}
        flipped={showOriginal}
        onsave={() => save(item)}
        onremove={() => (items = items.filter(i => i !== item))}
      />
    {/each}
  </div>
{:else}
  <div class="empty">
    <h2>{touch ? 'Add pixel art' : 'Drop pixel art anywhere'}</h2>
    <p>Each image is redrawn in your two colors. Add as many as you like.</p>
    <button class="btn primary" onclick={() => picker.click()}>Choose images</button>
  </div>
{/if}

{#if dragDepth > 0}
  <div class="drop" style:background={second} style:color={overlayInk}>Drop to bitify</div>
{/if}
<div class="toast" role="status" hidden={!message}>{message}</div>
<input bind:this={picker} type="file" accept="image/*" multiple hidden onchange={picked} />
