// One-shot: apply accepted round-1 documentation supersession notes (exact, unique replacements).
import fs from 'node:fs';
const N = 'Status/supersession (Oct 15):';
function rep(file, pairs) {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a0, b0] of pairs) {
    // Files may mix line endings: try LF first, then CRLF. Skip pairs already applied (idempotent rerun).
    const nl = s.split(a0).length === 2 ? '\n' : '\r\n', a = a0.replaceAll('\n', nl), b = b0.replaceAll('\n', nl);
    if (s.includes(b)) continue;
    if (s.split(a).length !== 2) throw new Error(`${file}: not unique: ${a.slice(0, 60)}`); s = s.replace(a, b); }
  fs.writeFileSync(file, s); console.log('edited', file);
}
const R = 'docs/research/', S = R + 'palette-improvement-spikes-2026-10-14/';
const spikeNote = `\n\n${N} historical proposal. Current behavior is documented in [palettes](../../palettes.md) and the [design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md); its next-step language is not an open task list.`;
rep(S + '01-full-palette-dithering.md', [
  ['Status: original executable experiments and proposed product contract; no production changes.', 'Status: original executable experiments and proposed product contract; no production changes.' + spikeNote + ' Shipped dithering is ordered only (Off / 2×2 / 4×4 / 8×8 with Dither strength); diffusion stayed deferred.'],
  ['233 ms naive pair, **946 ms grid-aware pair**,', '233 ms naive pair, **946 ms grid-aware pair** (an October 15 rerun on the same machine measured about 240–290 ms for both exhaustive variants; these timings are load-sensitive),'],
]);
rep(S + '02-matching-and-low-color-fidelity.md', [
  ['and implementation proposals. No production changes.', 'and implementation proposals. No production changes.' + spikeNote + ' Used-color Count shipped; locks remain deferred and direct generation at K was not adopted.'],
]);
rep(S + '03-palette-workflows-and-presets.md', [
  ['plus research proposals; no app behavior changed.', 'plus research proposals; no app behavior changed.' + spikeNote + ' The rail now has eleven curated presets including ENDESGA 8, and Lospec import accepts full palette URLs (not bare slugs).'],
]);
rep(S + '04-reduction-workflow-and-collection-budgets.md', [
  ['supported by one original executable experiment; no app changes.', 'supported by one original executable experiment; no app changes.' + spikeNote + ' Explicit used-color Count and Use N output colors shipped; quick-budget rows and a whole-wall cap were not adopted.'],
]);
rep(R + '2026-10-14-full-palette-dithering-implementation.md', [
  ['with Amount 0–100%, initially 50%.', 'with Amount 0–100%, initially 50% (relabeled **Dither strength** in e146f83; 50% is a midpoint default, not a calibrated optimum).'],
  ['## Next useful work\n', `## Next useful work\n\n${N} historical list. Count and ENDESGA 8 shipped; direct-K fitting was rejected; locks and quick budgets were deferred. See the [remaining-work audit](2026-10-15-palette-remaining-audit.md).\n`],
]);
rep(R + '2026-10-15-auto-refinement-decision.md', [
  ['\nThe [refinement study](2026-10-15-auto-refinement-spike.md) contains', `\n${N} the strict guard requires no error increase for any visible source RGB, a Pareto condition almost any palette change fails by construction; its zero acceptances reflect the gate, not proof that no better palette exists. The no-ship decision rests on shared-target identity, exact-pixel losses and the requested no-regression condition. The point-error comparison against the service uses the Oklab objective that Colorfetti's nearest mapping minimizes, so it is not neutral between the products.\n\nThe [refinement study](2026-10-15-auto-refinement-spike.md) contains`],
]);
rep(R + '2026-10-15-auto-refinement-service-comparison.md', [
  ['Smaller point error is better for this metric.', `Smaller point error is better for this metric. (${N} Colorfetti's nearest mapping minimizes this Oklab point objective for its palette, so the metric is not neutral between the products.)`],
]);
rep(R + '2026-10-15-clipboard-contract-review.md', [
  ['](../../src/App.svelte:818)', '](../../src/App.svelte#L818)'],
  ['](../../src/lib/save.js:239)', '](../../src/lib/save.js#L247)'],
  ['](../../src/lib/palette-state.js:42)', '](../../src/lib/palette-state.js#L42)'],
  ['](../../src/lib/palette-state.js:31)', '](../../src/lib/palette-state.js#L36)'],
  ['](../../src/App.svelte:937)', '](../../src/App.svelte#L937)'],
  ['](../../src/App.svelte:923)', '](../../src/App.svelte#L923)'],
  ['](../../src/PaletteImport.svelte:199)', '](../../src/PaletteImport.svelte#L199)'],
  ['this case tests whether the native promise route survives that delay.', 'this case tests whether the native promise route survives that delay. (Not performed; the final verification records large delayed native snapshots as outside scope.)'],
  ['\nThe remaining actionable steps are narrow:', `\n${N} historical. The steps below were completed later; see the [final verification](2026-10-15-clipboard-verification.md).\n\nThe remaining actionable steps are narrow:`],
]);
rep(R + '2026-10-15-clipboard-independent-review.md', [
  ['it is not approval to replace the decoder.', 'it is not approval to replace the decoder. (Subsequent: d37d8b7 removed a redundant native conversion and desktop Save now matches the golden; see [PNG precision verification](2026-10-15-png-import-precision-verification.md). The clipboard-transport differences remain.)'],
]);
rep(R + '2026-10-15-png-import-precision-verification.md', [
  ['Next useful work is actual Safari/iOS verification and\nevaluated fallback precision, rather than more palette UI.', `Next useful work is actual Safari/iOS verification and\nevaluated fallback precision, rather than more palette UI.\n\n${N} the [WebKit fallback decision](2026-10-15-webkit-fallback-decision.md) later evaluated and rejected a WebGL fallback; the precision limit remains. Mac/iOS is outside the current requested scope.`],
]);
rep(R + '2026-10-15-png-import-precision-checklist.md', [
  ['repair intentionally does not claim to fix browsers lacking ImageDecoder.', 'repair intentionally does not claim to fix browsers lacking ImageDecoder. Investigated and left unchanged in the [WebKit fallback decision](2026-10-15-webkit-fallback-decision.md).'],
]);
rep('bench/webkit-fallback-candidate-proposal.md', [
  ['133/135/147 ms synchronous context creation calls, even for a tiny sprite.', '133/135/147 ms synchronous context creation calls with the earlier helper revision (139/140/141 ms with the final streamed helper, below), even for a tiny sprite.'],
  ['for shipping while this native alternative is under evaluation.', 'for shipping; the native alternative was also rejected (see the [decision](../docs/research/2026-10-15-webkit-fallback-decision.md)).'],
]);
rep(R + '2026-10-15-clipboard-verification.md', [
  ['Native image delivery is verified on Codex Browser and the USB Pixel 8 Pro.', 'Native image delivery is verified for one human-assisted Palette Keep transfer on Codex Browser and four cases on the USB Pixel 8 Pro.'],
]);
rep(R + '2026-10-15-png-native-copy-implementation.md', [
  ['measures the actual production reorder\nwith a mocked native decoder/copy,', 'measures the actual production reorder\nwith a mocked native decoder/copy (and a Node `setImmediate` mock of MessageChannel),'],
]);
