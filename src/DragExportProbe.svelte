<script>
  import { exportFingerprint } from './lib/export-drag.js';
  let { status, logs, mode = $bindable('combined'), onlog } = $props();
  let comparison = $state('');
  let target = $state('File Explorer');
  let comparisonSequence = 0;
  function saveLogs() {
    const blob = new Blob([JSON.stringify({ userAgent: navigator.userAgent, logs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: 'bitify-drag-log.json' });
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function compare(event) {
    const file = event.currentTarget.files[0]; event.currentTarget.value = '';
    if (!file) return;
    const exports = logs.filter(log => log.event === 'drag-start');
    const expected = exports.at(-1), destination = target;
    const sequence = ++comparisonSequence;
    comparison = 'Checking file…';
    try {
      const sha256 = await exportFingerprint(file);
      const match = expected?.sha256 === sha256 && expected?.bytes === file.size;
      const historical = exports.findLast(log => log.sha256 === sha256 && log.bytes === file.size);
      if (sequence === comparisonSequence) comparison = match ? 'Exact match to the latest drag: full optimized export.' : historical ? 'Matches an older drag, not the latest drag. Check for a stale file.' : 'No exact match to a logged drag. Keep the received file for investigation.';
      onlog('received-file', { target: destination, name: file.name, bytes: file.size, sha256, matchesLatestDrag: !!match,
        expectedAt: expected?.at ?? null, historicalAt: historical?.at ?? null });
    } catch (error) { if (sequence === comparisonSequence) comparison = 'Could not read this file.'; onlog('compare-error', { message: error.message }); }
  }
</script>

<aside class="drag-export-probe" aria-label="Drag export compatibility test">
  <details>
    <summary>Drag export test: <span aria-live="polite">{status.state}</span></summary>
    <p>Hover over an image until ready, then drag. Uses full converted PNG/GIF bytes. Destination support is experimental. Touch gestures stay unchanged.</p>
    {#if status.name}<p>{status.name}</p>{/if}
    <label>Payload <select bind:value={mode}><option value="native">Native image + DownloadURL</option><option value="native-only">Native image only</option><option value="combined">JS File + DownloadURL (old probe)</option><option value="download-url">DownloadURL only</option><option value="file">JS File only</option></select></label>
    <label>Destination <select bind:value={target}><option>File Explorer</option><option>Discord desktop</option><option>Discord web</option></select></label>
    <div class="drag-probe-actions">
      <button onclick={() => onlog('manual-result', { target, mode, result: 'accepted' })}>Record accepted</button>
      <button onclick={() => onlog('manual-result', { target, mode, result: 'rejected' })}>Record rejected</button>
      <button onclick={saveLogs}>Save test log</button>
    </div>
    <label>Verify received file <input type="file" accept="image/png,image/gif" onchange={compare} /></label>
    <p aria-live="polite">{comparison || 'Choose the file saved by Explorer or downloaded from Discord to compare its exact bytes. No upload occurs here.'}</p>
  </details>
</aside>
