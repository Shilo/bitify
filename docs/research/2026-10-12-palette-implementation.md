# Palette implementation: review and bounded measurements

October 12, 2026. This records the animation-preview optimization and Generated 32 implementation. It does not change the cleanup algorithm's artistic guarantees. Source tests, production build and the desktop/physical-phone integration checks described below are complete. Final actual-ZIP pixel validation and deployment verification remain for the root agent to append.

## What changed

**Animation preview cache:** one shared 8 MiB reservation budget for full-palette animations only. A clip is admitted only if every frame at the requested preview dimensions fits, including its Uint16 indices and 256-byte used-color table per frame. Frames fill lazily during playback, after optional cleanup. This avoids a small frame LRU repeatedly evicting every frame of a looping GIF. Stills and oversized clips bypass the cache; no static-image or full-resolution export baking was added. Only the current displayed frame is colorized to RGBA.

The key includes source buffers/shapes, ordered effective palette, sampled dimensions, matching, opacity and prepared cleanup identity. Equivalent wall/viewer requests can share pending work; dimensions remain separate. Releasing the last handle removes its clip and aborts pending work. The budget includes reservations before filling, but **is not a total browser heap/peak-memory ceiling**: source frames, current ImageData, temporary quantization arrays, metadata, canvases/GPU, workers and export buffers remain additional. An oversized viewer request does not evict a useful wall entry. Opening the viewer pauses wall frame conversion/timers; Original comparison skips converted-preview work while following its own source delays. This does not cancel unrelated exports or optional whole-source preparation already required by other consumers.

**Exact limiter cost memo:** repeated source RGBs reuse their already calculated squared error. Frequency and total-error additions retain original pixel order. The binned transition still measures original-pixel costs and retains the previous subset algorithm, including its heuristic limits. This changes repeated arithmetic, not palette selection policy.

**Cleanup empty guard:** once whole-clip agreement has no surviving replacement, later frames cannot restore one. The client validates every frame's dimensions and length before omitting subsequent transfers. Core, worker and cooperative fallback stop at the same point. Worker-returned shape, label range and `hasChanges` metadata are validated before caching. Trusted completed empty maps skip the no-op overlay while retaining nearest-result metadata; generic/untrusted helper calls continue rebuilding metadata. Cancellation cannot register a partially checked map. The existing singleton proposals, error veto, exact selected-palette protection and animation agreement rule are unchanged. No new claim of preserved intentional details or reduced animation noise follows from this optimization.

## Generated 32 behavior

Generated 32 is an optional selectable source; **ENDESGA 32 remains the default**, with Oklab, Max colors All and Cleanup Off. No new AAP-64 preset was added. Its published near-black/gray/teal coverage makes it a credible future comparison, but popularity/download counts and an unmeasured alternative do not justify expanding the rail now.

Generation is lazy and uses all successfully loaded wall assets, all composited GIF frames and source RGB above the current Opacity cut. Each nonempty asset contributes equal total mass; within a clip, visible counts are weighted by effective frame duration and normalized by total visible pixel-time. A still's contribution is its visible frequency distribution. Loop repetitions, names, wall order and the empty example logo do not contribute. Fixed integer asset mass with canonical rounding/aggregation keeps processing order deterministic. Source summaries are exact up to 4096 RGBs, then use bounded five-bit RGB bins; a fixed Oklab objective selects/refines up to 32 unique RGB colors. The best evaluated rounded fit is retained over a bounded six-iteration refinement. This is an approximate fit, not an optimality or detail-preservation guarantee.

Only source/frame/revision/duration or visibility changes request generation. Matching, per-image Max colors, Cleanup, playback, resizing and Original do not regenerate it. One immutable complete palette revision is published across the wall; older completed preview colors can remain during an update. Zero visible source colors yield an explicit empty state, not fabricated black. Failures show retry guidance. Initial/empty/unavailable states disable applicable export/edit actions. Edit makes an ordinary palette copy; saving that copy freezes its colors. Adding/removing an asset can recolor existing images, so automatically following the wall and permanently preserving approved output are different workflows.

The lightweight synchronous capture owns source/frame references and scalar settings before generation yields. Save, Copy, drag export and ZIP conversion resolve that captured shared generation; each ZIP output uses the same colors even if the wall subsequently changes. Subset selection and cleanup also receive captured source metadata. Copy still calls the clipboard API immediately with the pending PNG promise. A captured export can keep a generation alive when the preview cancels. Completed generation caching retains at most two tiny color results/keys, without old source references; canceled queued preview jobs are removed. Source histogram summaries are not cached across different walls/cuts, so changes can require rescanning the full population.

## Independent review findings

Targeted source reviews covered output/error parity, all-frame validation, job ownership, cancellation, stale publication, cache admission and captured exports. The performance/cleanup review's 69 targeted tests and the Generated/integration review's 60 targeted tests passed; these counts overlap and must not be summed into a unique full-suite count.

Two integration issues were identified and fixed in the working tree:

- A completed zero-color generation left the previous same-item conversion visible. Tile now clears retained conversion pixels when no palette is available; transient updates with a prior valid palette still retain that complete palette.
- Generated guidance appeared in the 1-bit palette panel because its selected ID persists across family switches. The notice now also requires the full-palette family.

Export availability was propagated to tile/viewer/touch actions and handlers, and generated-copy editing guards the current completed revision. Subsequent desktop/physical-phone flow checks covered these integrations, including empty-state recovery and family switching. The final source suite passed **585 tests in 39 files**; the production build passed at **227.68 kB, 85.53 kB gzip** for the main JavaScript chunk. This is a bundle observation, not network load time or the sum of every optional chunk.

## Physical-phone phase measurements

The supplied 56-frame, 512×458 dungeon GIF was measured on a **physical Pixel 8 Pro, Android 17, Brave/Chromium 155**, operated through ADB. Desktop checks used Codex browser. Its reduced user agent reports Android 10; that string is not the device's actual OS. No CPU-throttle or Safari result is implied. One cold/warm sequence is recorded in [phone measurements](2026-10-12-palette-implementation-android-performance.json).

| Phase | Observed time |
|---|---:|
|GIF decode|88.9 ms|
|Cap 8 cold whole-clip worker|624.0 ms|
|Cap 8 cached|0.5 ms|
|Cleanup cold whole-clip worker|129.1 ms|
|Cold 56-frame sampled preview loop|235.8 ms|
|Warm 56-frame sampled preview loop|108.6 ms|
|Uncached 56-frame sampled preview loop|203.7 ms|
|Generated 32 cold whole-clip worker|1439.3 ms|
|Generated 32 cached|0.1 ms|

The sampled clip reserved 6,580,224 bytes and released its reservation after testing. All 56 recorded frame-parity checks passed. Cleanup had no surviving replacements. Warm mean work per frame was 0.57 ms versus 2.08 ms uncached, covering quantization/overlay/colorization/ImageData/upload while excluding yields and other loop overhead. Loop totals include additional harness overhead. Cold caching was slower than the uncached loop here; benefit occurs on repeats. These are phase observations from one run, **not playback FPS, a source-delay guarantee, device-independent budgets or peak-memory measurements**. Generated cold work is meaningful even on this phone; lazy loading/result reuse avoids imposing it on preset users.

## Generated fit and native export checks

The current generation core was evaluated on the supplied sprite, six buildings, 160 corpus stills and 16 real clips. The combined wall has 183 assets/383 frames. [Core quality results](2026-10-12-palette-implementation-generated-quality.json) retain timing, palette and error measurements.

| Cohort | Generated 32 asset-equal mean squared Oklab error | ENDESGA 32 same score |
|---|---:|---:|
|Sprite alone, 28 colors|0|.006220|
|Six buildings|.000162|.005544|
|160 stills|.002229|.007532|
|16 clips|.001940|.006059|
|Combined 183 assets|.002262|.007331|

These are same-cohort source-color fidelity scores with All/Oklab and no cleanup, not independent artistic success rates or held-out generalization. The sprite alone preserves its 28 existing colors—including the unwanted orphan colors—rather than interpreting intent. Combined `pixelMSE` in the raw artifact pools still count 1 and clip millisecond weights; it is not a uniform pixel-weighted metric across mixed asset types. The asset-equal column above avoids that mixed-unit aggregate. Generation's binned training cost is an approximate objective and differs from the full original-source evaluation.

Core-only desktop observations ranged 0.8 ms for the sprite to 123.2 ms for the combined wall; a synthetic 2 MP noise image took 513.8 ms. They exclude file decoding, browser worker transfer, rendering and encoding, and are not phone timings.

A native Generated 32 GIF export was independently decoded and compared with the captured-generation/production-quantizer reference: **56 frames, zero visible RGB-channel differences, zero alpha differences, exact frame delays and loop count**. The 32-color table and 512×458 dimensions were retained. [Export verification](2026-10-12-palette-implementation-generated-export-verification.json) records the result. Independent decoding verifies the native export; using production generation/quantization as the reference does not independently prove those algorithms' optimality.

## Remaining limitations and final integration status

Existing hover drag-export preparation has no abort signal. A stale hovered export can retain its captured generation subscriber, making a newer preview wait in the serial generation queue until that work completes. Actual explicit exports intentionally retain their snapshots; obsolete hover work is a separate performance limitation. Do not claim that every superseded operation stops immediately.

Desktop and physical-phone runs each passed the **80 GIF configuration cases**: the nine full presets plus Generated 32, Oklab/RGB, All/requested 8 and Cleanup Off/On. Palettes with fewer than eight colors retained their effective maximum. These checks verified converted-frame readiness, ongoing paints and settings transitions. Desktop readbacks also verified sampled palette membership and caps. The phone run's known-pixel canvas witness showed that Brave changes values on readback; phone canvas color counts therefore are **not** evidence of output-palette membership or cap violations. Phone pixel correctness relies on native decoded export checks, including the separately verified 56-frame Generated export above.

Each remaining desktop/phone flow run recorded **15 passing checks and one inconclusive synthetic viewer probe**, with no recorded errors. Native viewer opening, Original comparison and closing were separately verified. Responsive layouts were exercised at 320 CSS pixels on desktop and 448 on the physical phone, including the conditional Opacity cut row. The completed flows covered palette import/edit/copy, Generated source changes, rapid conversion settings, empty-state recovery and family retention. An early harness's readiness/viewer failures were resolved by correcting its probes; those early records must not be counted as successful product checks.

Actual ZIPs from both desktop and physical Android were independently decoded with Pillow/zipfile after Generated 32 / RGB / cap 8 / Cleanup On conversion. Each contains the dungeon GIF, six building PNGs and sprite PNG. Every output uses at most eight colors from that device's captured shared palette, with zero source-alpha differences and unchanged dimensions. Both GIFs retain all 56 frames, original delays and loop count. This checks the actual native files rather than noisy phone canvas readback. The test harness initially captured a JavaScript compression-worker Blob URL as a download; the corrected probe filters download MIME types, verifies the ZIP signature and captures actual bytes through a bounded loopback endpoint. Those earlier fake ZIP records are excluded.

[Browser and ZIP verification](2026-10-12-palette-implementation-browser-verification.json) records the accepted final checks. Additional responsive checks passed at 375×812 and 740×360; short landscape keeps the settings panel within the viewport and scrolls its lower rows. The conditional Opacity cut row was explicitly exercised alongside Max colors, Matching and Cleanup.

Deployment verification follows the implementation commit. Sustained multi-clip peak memory, cross-browser Safari behavior and broader device coverage remain separate validation limits.
