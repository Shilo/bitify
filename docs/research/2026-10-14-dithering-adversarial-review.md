# Full-palette dithering adversarial review

Date: October 14, 2026. Scope: independent review of the ordered conversion kernel, settings/preview/export integration, counterexample generation and native built-browser boundary checks.

## Contract and design decision

Ship optional ordered 2×2, 4×4 and 8×8 full-palette dithering, Off by default. It is useful with arbitrary low-color palettes and two-color targets; existing 1-bit styles remain a separate creative workflow. Defer diffusion because one pixel can propagate error into unchanged animation regions. Fixed source-coordinate patterns preserve unchanged coordinates with a fixed active palette and settings, but moving sprites can still move through the texture.

The kernel first classifies alpha, preserves exact eligible RGB, ranks at most four palette candidates with the selected matching metric, then scores bounded linear-light mixtures in Oklab. It evaluates a few realizable grid occupancies and applies a small point-distortion penalty. This is a bounded heuristic, not exhaustive optimal-pair selection. RGB matching controls candidate ranking; the mixture score remains perceptual. Amount interpolates the linear-light target between its nearest color and the source; zero uses the unchanged nearest path.

Frozen nearest-label cleanup decisions are prepared independently of dither and applied afterward only at their marked source coordinates. Those pixels become solid replacements; unmarked pixels retain the ordered result. This avoids allowing a cleanup detector to classify newly introduced dither texture as noise. Cleanup can still remove intentional original details, as already documented.

## Independent checks completed

`node bench/palette-dither-review.mjs` passed **54 seeded combinations** spanning 1/2/3/4/5/8/16/64/256 target colors, Oklab/RGB, every matrix, strengths 1/50/100 and opacity cuts 1/128/255. Each case checks source immutability, exact binary-alpha threshold classification, subset-index bounds, used-color flags, transparency flags, sync/async agreement, source-center sampled previews and zero output churn outside one changed source coordinate. See [results](../../bench/palette-dither-review/results.json). These are property checks on synthetic inputs, not a sprite-quality preference study.

`node bench/palette-dither-overflow-qa.mjs dist` passed in sandboxed installed Edge against the built app, using real import/Save/Save all controls and an independent PNG decoder. With 8×8 at 100%, a still using all 256 target colors plus transparency saved correctly through the RGBA PNG fallback. Its exact visible RGB and alpha bytes matched the synthetic source. A valid two-frame source GIF whose converted global union needs 256 opaque entries plus empty failed both individual Save and ZIP atomically, downloaded zero files, opened the actionable palette-copy dialog and retained the active palette and dither settings. See [results](../../bench/palette-dither-review/overflow-results.json).

The kernel owner's targeted tests additionally cover all 256 exact entries, irregular targets, source sampling, unchanged-coordinate temporal behavior, integrated grayscale tone improvement, very dark ramps, canonical matrix phase and cancellation before source reads or partial publication. Integration tests cover normalization/persistence, immutable export gestures, GIF timing/loop and frozen cleanup overlays. Native PNG/Copy/GIF/ZIP acceptance, physical-phone scheduling and performance belong to the main implementation record; their device results must be read separately from these desktop checks.

## Review findings

1. **Fixed: Amount slider ownership across method changes.** The initial integration keyed the range only by palette. Switching between enabled matrix sizes retained the native range node; late events from a still-held thumb could capture the new method and commit an unintended value. The native browser reproduced this precisely: start 8×8 at 100, retain the range node, select 4×4, dispatch input/change with value 17 on the old node; persisted strength became 17. The owner keyed the row by matrix and palette, captured immutable node context, checked connected/current ownership and removed listeners on destruction. The same native regression now passes and keeps 100; PNG fallback and individual GIF/ZIP overflow guards also pass after the rebuild. `bench/palette-dither-overflow-qa.mjs` retains the regression.
2. **Validation precision:** the initial integration unit test decoded GIF pixels independently, but only zipped and compared PNG bytes to themselves. Independent native PNG decoding in the main acceptance harness and the overflow check closes this particular gap; byte round-trip alone is not preview/export verification.

No actionable kernel correctness issue was found in the reviewed implementation and independent cases. This is a bounded review result, not a universal no-bugs guarantee. Candidate restriction can miss useful distant combinations, amount is not a universal monotonic quality control, ordered patterns can increase grain/file size, and sampled previews can alias repeating texture even when every sampled source pixel is correct.

An independent final targeted Vitest run passed 34 tests across the dither kernel, state/export integration and animation cache. No unresolved actionable finding remains in this review's scope.

The final read-only production pass traced both settings through restored preferences, persistence, local/global Reset, family return, wall/viewer props, completed-paint identity, animation cache identity and immutable Save/Copy/ZIP/hover snapshots. Limiter and cleanup requests correctly remain independent of dither because their source decisions do not depend on the ordered pattern. The native range action captures its palette and method once, checks connected/current ownership, and detaches all four listeners on destruction. No additional actionable production issue was found.

The main browser acceptance harness intercepts clipboard writes and download anchors to inspect encoded PNG/GIF/ZIP blobs. It verifies the app's Copy payload and export conversion/encoding paths; it does not by itself prove operating-system clipboard readback, browser permission prompts or a physical phone filesystem download. The separate sandboxed Edge overflow harness does exercise actual browser download events for its PNG and failure cases. Human preference on a broad artist-curated sprite corpus, Safari, prolonged-session heap behavior and motion-relative pattern swimming remain outside the completed bounded checks.

## Required release evidence

Confirm method-change gesture invalidation, fresh source-referenced paints after rapid setting changes, persistence/reset/family return, full preview/Copy/PNG/GIF/ZIP agreement, cleanup interaction, animated shared subset retention, unchanged Off bytes and physical Android performance. Report observed conversion times and long tasks with fixture size; do not infer animation FPS, a hard deadline or whole-app memory bounds from a small timing sample. Safari remains a separate unverified platform unless directly exercised.
