<script>
  import { untrack } from 'svelte';
  import PixelIcon from './PixelIcon.svelte';
  import { tooltip } from './lib/tooltip.js';
  import { decodePaletteFile } from './lib/palette-decode.js';
  import { extractPalette, parsePaletteText } from './lib/palette-import.js';
  import { normalizeColors, validateName } from './lib/palette-library.js';

  let { request = {}, onsave, ondelete, onreload, onuse, onclose } = $props();
  const initial = untrack(() => request);
  let dialog, fileInput;
  let name = $state(initial.name || 'Imported palette');
  let nameEdited = $state(!!initial.name);
  let colors = $state([...(initial.colors || [])]);
  let baseline = $state([...(initial.colors || [])]);
  let source = $state(initial.source || { kind: 'custom' });
  let editingId = $state(initial.forceCopy || initial.id?.startsWith('preset-') ? undefined : initial.id);
  let revision = $state(initial.expectedRevision ?? initial.revision);
  let inputOpen = $state(!initial.colors?.length), inputKind = $state('file'), text = $state('');
  let reviewing = $state(!!initial.colors?.length), imageOptionsOpen = $state(false);
  let manualOrigin = $state(!initial.colors?.length);
  let image = $state(null), solid = $state(false), total = $state(initial.colors?.length || 0), truncated = $state(false);
  let partialAlpha = $state(false), firstFrame = $state(initial.firstFrame || false);
  let selected = $state([]), page = $state(0), addColor = $state('#ffffff');
  let busy = $state(''), progress = $state(0), error = $state(''), failedSave = $state(false), conflict = $state(false), deleteConfirm = $state(false);
  let controller;
  const maxColors = initial.maxColors ?? 256;
  const pageSize = 64;
  const pages = $derived(Math.max(1, Math.ceil(colors.length / pageSize)));
  const visible = $derived(colors.slice(page * pageSize, (page + 1) * pageSize));
  const eligible = $derived(!busy && !truncated && colors.length >= 1 && colors.length <= maxColors);
  const edited = $derived(colors.length !== baseline.length || colors.some((color, i) => color !== baseline[i]));

  $effect(() => {
    dialog.showModal();
    return () => controller?.abort();
  });

  function close() {
    if (busy === 'Saving' || busy === 'Deleting') return;
    controller?.abort(); dialog.close();
  }
  function cancelJob() { controller?.abort(); }
  function resetFailure() { failedSave = false; conflict = false; error = ''; }
  function applyImport(result) {
    reviewing = true; manualOrigin = false;
    colors = result.colors; baseline = [...result.colors]; total = result.total;
    truncated = !!result.truncated; partialAlpha = result.partialAlpha;
    selected = []; page = 0; resetFailure();
  }
  async function importFile(file) {
    if (!file || busy) return;
    resetFailure(); controller?.abort(); controller = new AbortController();
    busy = 'Reading palette'; progress = 0;
    try {
      const result = await decodePaletteFile(file, { signal: controller.signal, onProgress: value => progress = value });
      applyImport(result); image = result.image; source = result.source; firstFrame = result.firstFrame; solid = false;
      imageOptionsOpen = result.total > maxColors;
      if (!nameEdited) name = [...(file.name || 'Imported palette').replace(/\.[^.]+$/, '')].slice(0, 64).join('') || 'Imported palette';
      inputOpen = false;
    } catch (problem) { if (problem.name !== 'AbortError') error = problem.message || 'This palette could not be read.'; }
    finally { busy = ''; }
  }
  function importText() {
    resetFailure();
    try {
      const next = parsePaletteText(text);
      applyImport({ colors: next, total: next.length, partialAlpha: false, truncated: false });
      source = { kind: 'hex' }; image = null; solid = false; firstFrame = false; inputOpen = false;
      imageOptionsOpen = false;
    } catch (problem) { error = problem.message; }
  }
  async function findColors(flat) {
    if (!image || busy) return;
    resetFailure(); controller?.abort(); controller = new AbortController(); busy = 'Finding colors'; progress = 0;
    try {
      const result = await extractPalette(image, { solid: flat, signal: controller.signal, onProgress: value => progress = value });
      if (flat && !result.total) error = 'No solid 3×3 patches were found. Your current colors were kept.';
      else { applyImport(result); solid = flat; }
    } catch (problem) { if (problem.name !== 'AbortError') error = problem.message; }
    finally { busy = ''; }
  }
  function toggle(index) { selected = selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index]; }
  function removeSelected() {
    colors = colors.filter((_, index) => !selected.includes(index)); selected = [];
    page = Math.min(page, Math.max(0, Math.ceil(colors.length / pageSize) - 1)); resetFailure();
  }
  function editColor(value, input) {
    const index = selected[0];
    if (colors.some((c, i) => i !== index && c === value)) { input.value = colors[index]; error = 'That color is already in this palette.'; return; }
    colors = colors.map((color, i) => i === index ? value : color); resetFailure();
  }
  function add() {
    if (busy || truncated) return;
    if (colors.includes(addColor)) { error = 'That color is already in this palette.'; return; }
    if (colors.length >= 4096) { error = 'Review up to 4096 colors. Remove colors before adding another.'; return; }
    if (manualOrigin && !reviewing && !nameEdited && name === 'Imported palette') name = 'Custom palette';
    colors = [...colors, addColor]; reviewing = true; page = Math.floor((colors.length - 1) / pageSize); resetFailure();
  }
  function draft(copy = false) {
    return { name: validateName(name), colors: normalizeColors(colors, maxColors), source,
      ...(!copy && editingId ? { id: editingId, expectedRevision: revision } : {}) };
  }
  async function save(copy = false) {
    if (!eligible) return;
    let value;
    try { value = draft(copy); } catch (problem) { error = problem.message; return; }
    resetFailure(); busy = 'Saving';
    try { await onsave(value); busy = ''; dialog.close(); }
    catch (problem) { error = problem.message || 'This palette could not be saved. Your draft is still here.'; failedSave = true; conflict = problem.code === 'PALETTE_CONFLICT'; }
    finally { busy = ''; }
  }
  async function reload() {
    if (!onreload || !editingId) return;
    try {
      const latest = await onreload(editingId);
      if (!latest) throw new Error('This palette was deleted. Save your draft as a copy.');
      name = latest.name; nameEdited = true; colors = [...latest.colors]; baseline = [...latest.colors]; revision = latest.revision;
      reviewing = true; manualOrigin = false;
      source = latest.source; image = null; total = colors.length; truncated = false; page = 0; selected = []; resetFailure();
    } catch (problem) { error = problem.message; }
  }
  async function useSession() {
    try { await onuse?.(draft(true)); dialog.close(); } catch (problem) { error = problem.message; }
  }
  async function removePalette() {
    busy = 'Deleting';
    try { await ondelete(editingId, revision); busy = ''; dialog.close(); }
    catch (problem) { error = problem.message || 'This palette could not be deleted.'; conflict = problem.code === 'PALETTE_CONFLICT'; }
    finally { busy = ''; deleteConfirm = false; }
  }
  function backup() {
    // A draft may exceed the committed palette limit. Export all reviewed colors
    // for recovery, but never present a truncated candidate list as a full backup.
    if (!colors.length || truncated) return;
    const blob = new Blob([colors.join('\n') + '\n'], { type: 'text/plain' }), url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = (name.trim() || 'palette').replace(/[^\w -]/g, '_').slice(0, 64) + '.hex';
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function drop(event) { event.preventDefault(); event.stopPropagation(); importFile(event.dataTransfer?.files?.[0]); }
  function paste(event) {
    event.stopPropagation();
    const file = event.clipboardData?.files?.[0];
    if (file) { event.preventDefault(); importFile(file); }
  }
</script>

{#snippet reviewMetadata()}
  <label class="palette-name-label" for="palette-name">Name</label>
  <input id="palette-name" class="glass-input" bind:value={name} oninput={() => nameEdited = true} maxlength="128" disabled={!!busy} autocomplete="off" />
  <div class="palette-editor-tools palette-review-utilities">
    {#if !manualOrigin}<button class="btn glass-btn" aria-expanded={inputOpen} onclick={() => inputOpen = !inputOpen} disabled={!!busy} use:tooltip={'Replace this draft with another image, file or pasted colors. Colors are not merged.'}><PixelIcon name="import" />Replace source</button>{/if}
    {#if colors.length}<button class="btn glass-btn icon-only" aria-label="HEX backup" onclick={backup} disabled={truncated || !!busy} use:tooltip={'Download these colors as a HEX palette backup.'}><PixelIcon name="save" /></button>{/if}
    {#if edited}<button class="btn glass-btn" disabled={!!busy} onclick={() => { colors = [...baseline]; selected = []; page = 0; resetFailure(); }}>Undo edits</button>{/if}
  </div>
{/snippet}

{#snippet colorReview()}
  {#if colors.length}<div class="palette-review-heading"><strong>{truncated ? total.toLocaleString() + ' colors found' : colors.length.toLocaleString() + (colors.length === 1 ? ' color' : ' colors')}</strong></div>{/if}
  {#if truncated}<p class="palette-editor-notice">This image has more than 4096 colors. Only the first 4096 are shown, and this draft cannot be saved. Try Find solid colors or a smaller prepared palette image.</p>
  {:else if colors.length > maxColors}<p class="palette-editor-notice">Remove {colors.length - maxColors} or more colors before saving.</p>
  {:else if !colors.length}<p class="palette-editor-hint">Add a color, import another palette, or paste colors to start.</p>{/if}
  <div class="palette-review-grid" aria-label="Palette colors">
  {#each visible as color, offset}
    {@const index = page * pageSize + offset}
    <button class="palette-review-swatch" class:is-selected={selected.includes(index)} style:background-color={color}
      aria-label={'Select color ' + (index + 1) + ' ' + color} aria-pressed={selected.includes(index)} disabled={!!busy} onclick={() => toggle(index)}
      use:tooltip={color + '. Select to edit or remove.'}></button>
  {/each}
  </div>
  {#if pages > 1}<nav class="palette-review-pages" aria-label="Color pages"><button class="btn glass-btn" disabled={page === 0} onclick={() => page--}>Previous</button><span>{page + 1} / {pages}</span><button class="btn glass-btn" disabled={page >= pages - 1} onclick={() => page++}>Next</button></nav>{/if}
  {#if selected.length}<div class="palette-editor-tools">
  {#if selected.length === 1}<label class="palette-color-label">Edit color<input type="color" value={colors[selected[0]]} onchange={event => editColor(event.currentTarget.value, event.currentTarget)} disabled={!!busy} /></label>{/if}
    <button class="btn glass-btn danger" onclick={removeSelected} disabled={!!busy}>Remove selected ({selected.length})</button><button class="btn glass-btn" onclick={() => selected = []} disabled={!!busy}>Clear selection</button>
  </div>{/if}
{/snippet}

<dialog class="glass-modal-overlay is-active palette-import-modal" bind:this={dialog}
  aria-labelledby="palette-import-title" onclose={() => { controller?.abort(); onclose(); }}
  oncancel={event => { if (busy === 'Saving' || busy === 'Deleting') event.preventDefault(); else controller?.abort(); }}
  ondragover={event => { event.preventDefault(); event.stopPropagation(); }} ondrop={drop} onpaste={paste}
  onclick={event => { if (event.target === dialog) close(); }}>
  <div class="glass-modal palette-editor">
    <div class="glass-modal__header palette-editor-header">
      <h2 class="glass-modal__title" id="palette-import-title">{editingId ? 'Edit palette' : initial.forceCopy ? 'Make a palette copy' : 'Import palette'}</h2>
      <button class="ib glass-btn" aria-label="Close palette editor" disabled={busy === 'Saving' || busy === 'Deleting'} onclick={close} use:tooltip={'Close without saving this draft.'}><PixelIcon name="x" /></button>
    </div>
    <div class="glass-modal__body palette-editor-body">
      {#if request.exportNotice}<p class="palette-editor-notice" role="alert">{request.exportNotice}</p>{/if}
      {#if initial.notice || initial.maxColors === 255}<p class="palette-editor-notice">{initial.notice || `Keep at most ${maxColors} colors for this GIF. Remove colors, save a copy, then download again.`}</p>{/if}
      {#if reviewing && !manualOrigin}{@render reviewMetadata()}{/if}
      {#if inputOpen}
        <div class="palette-input-method seg glass-segmented" aria-label="Import method">
          <button class="glass-segmented__item" class:is-active={inputKind === 'file'} aria-pressed={inputKind === 'file'} onclick={() => inputKind = 'file'}>Image or file</button>
          <button class="glass-segmented__item" class:is-active={inputKind === 'text'} aria-pressed={inputKind === 'text'} onclick={() => inputKind = 'text'}>Paste colors</button>
        </div>
        {#if inputKind === 'file'}
          <button class="btn glass-btn palette-file-button" onclick={() => fileInput.click()} disabled={!!busy}><PixelIcon name="import" />{colors.length ? 'Replace from image or file' : 'Choose palette image or file'}</button>
          <p class="palette-editor-hint">Or drop or paste a palette image here.</p>
        {:else}
          <textarea class="glass-input palette-text-input" bind:value={text} aria-label="Hex colors" placeholder="#000000, #ffffff, #ff004d" disabled={!!busy}></textarea>
          <button class="btn glass-btn" onclick={importText} disabled={!!busy || !text.trim()}>{colors.length ? 'Replace colors' : 'Review colors'}</button>
        {/if}
      {/if}
      <input class="palette-file-input" type="file" bind:this={fileInput} accept=".png,.jpg,.jpeg,.webp,.bmp,.gif,.hex,.txt,.gpl,.pal" onchange={event => { importFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
      {#if busy && busy !== 'Saving' && busy !== 'Deleting'}
        <div class="palette-import-progress" role="status"><span>{busy}…</span><progress max="1" value={progress}></progress><button class="btn glass-btn" onclick={cancelJob}>Cancel import</button></div>
      {/if}
      {#if image}
        <details class="palette-editor-details" bind:open={imageOptionsOpen}>
          <summary>Image options</summary>
          <div class="palette-editor-tools">
          <button class="btn glass-btn" aria-pressed={!solid} onclick={() => findColors(false)} disabled={!!busy}>Every color</button>
          <button class="btn glass-btn" aria-pressed={solid} onclick={() => findColors(true)} disabled={!!busy}>Find solid colors</button>
          </div>
          <p class="palette-editor-hint">Every color scans all visible pixels. Solid colors finds matching visible RGB in 3×3 patches; review borders and backgrounds before saving.</p>
        </details>
      {/if}
      {#if firstFrame}<p class="palette-editor-hint">Only the first GIF frame supplies these colors.</p>{/if}
      {#if partialAlpha}<p class="palette-editor-hint">Visible partially transparent pixels become opaque palette colors.</p>{/if}
      {#if reviewing && !manualOrigin}{@render colorReview()}{/if}
      <details class="palette-editor-details">
        <summary>Add colors</summary>
        <div class="palette-editor-tools">
          <label class="palette-color-label">New color<input type="color" bind:value={addColor} disabled={!!busy} /></label>
          <button class="btn glass-btn" onclick={add} disabled={!!busy || truncated || colors.length >= 4096}><PixelIcon name="plus" />Add color</button>
        </div>
      </details>
      {#if reviewing && manualOrigin}
        {@render reviewMetadata()}
        {@render colorReview()}
      {/if}
      {#if error}<p class="palette-editor-error" role="alert">{error}</p>{/if}
      {#if conflict}<div class="palette-editor-tools"><button class="btn glass-btn" onclick={() => save(true)} disabled={!eligible}>Save copy</button>{#if onreload}<button class="btn glass-btn" onclick={reload} disabled={!!busy}>Reload saved palette</button>{/if}</div>
      {:else if failedSave && onuse}<button class="btn glass-btn" onclick={useSession} disabled={!eligible}>Use for this session</button>{/if}
      {#if editingId && ondelete}
        <details class="palette-editor-details"><summary>More options</summary>
        {#if deleteConfirm}<div class="palette-delete-confirm"><p>Delete this saved palette? Your images stay.</p><button class="btn glass-btn" onclick={() => deleteConfirm = false} disabled={!!busy}>Cancel</button><button class="btn glass-btn danger" onclick={removePalette} disabled={!!busy}>Delete palette</button></div>
        {:else}<button class="btn glass-btn danger" onclick={() => deleteConfirm = true} disabled={!!busy}>Delete saved palette</button>{/if}
        </details>
      {/if}
    </div>
    <div class="glass-modal__footer">
      <button class="glass-modal__action" onclick={close} disabled={busy === 'Saving' || busy === 'Deleting'}>Cancel</button>
      <button class="glass-modal__action palette-save-action" onclick={() => save()} disabled={!eligible}>{busy === 'Saving' ? 'Saving…' : editingId ? 'Save changes' : 'Save palette'}</button>
    </div>
  </div>
</dialog>
