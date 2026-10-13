# Generated shared palette: bounded research and proposed design

October 12, 2026. Historical design spike, now adopted with a bounded exact/binned Oklab fit. The implementation and final validation are in [palette implementation](2026-10-12-palette-implementation.md). Details below describe the proposed design and its earlier evidence; the implementation record supersedes cache/algorithm proposals.

## Firm recommendation

Offer **Generated 32** as one selectable full-palette source alongside the presets. Compute its colors lazily from **all successfully loaded wall assets**, then refresh when those sources or participating transparency change. It should immediately work like choosing any other palette, without opening Import or requiring a preliminary save. Keep ENDESGA 32 as the general preset default; Generated is an explicit choice.

The earlier recommendation to require a frozen creation action was too restrictive for this workflow. An explicit source communicates that its colors come from the current wall. It can be intuitive and stable if it publishes one immutable shared revision at a time and excludes unrelated conversion settings from generation. **Copy/Edit** can use the existing palette editor to save a frozen ordinary palette; this remains optional, rather than being the entry workflow.

The important limit is unavoidable: a palette fitted to all current assets may change when an asset is added, removed or replaced. Existing images can therefore recolor. Automatic refresh and permanently retaining previously approved RGB output cannot both be promised. A saved copy is the appropriate stable alternative. Do not hide this behavior with an automatic lock after export, a second mode switch, or a palette that silently stops following the wall.

Start with a fixed 32-color source to avoid a new control. Label it Generated 32, with a tooltip explaining that it is shared across all images and updates when images change. Existing **Max colors** retains its present per-image meaning; **All** remains the default. It must not secretly become the generated palette's global size. Generation may use fewer than 32 colors when the source has fewer unique visible colors. A separate global size control could be evaluated later if real usage justifies it.

## Evidence and limits

The earlier independent preset study covered 160 corpus stills and six supplied buildings. A research-only pooled RGB median-cut fit, followed by Oklab matching, gave these source-color errors:

| Cohort | ENDESGA 32 | Shared adaptive 32 | Shared adaptive 64 |
|---|---:|---:|---:|
|160 stills, pixel-weighted squared Oklab error|.004011|.002934|.001843|
|Six buildings, same metric|.005784|.000562|.000180|

The six-building adaptive sheet preserved muted teal and brick more faithfully than the sampled presets. This establishes usefulness for an optional generated source, not a universal artistic success rate. These were full pooled-pixel **RGB median-cut** fits on the same images being evaluated. They do not validate the proposed equal-asset weighting, Oklab generation, bounded bins, animations or a browser implementation. Source fidelity is not material recognition, deliberate pixel-art vocabulary, detail preservation or orphan cleanup. Generated palettes may preserve unwanted AI noise unless optional per-image limiting/cleanup is used, and those features can still lose intentional detail.

Earlier artifacts: `.tmp/palette-default-20261012/adaptive-palettes.json`, `adaptive-measurements.json`, `adaptive-buildings.png`, and `findings.md`. The supplied 255-color palette remains an independent user-controlled source; Generated is allowed to create different RGB values and does not preserve that palette's membership.

## Exactly what should refresh

| Event | Regenerate shared colors? | Reason |
|---|---|---|
|Select Generated for the first time|Yes, lazily|No generation bundle/job needed for other palettes.|
|Add/remove/replace a successfully decoded wall asset|Yes|The shared source population changed.|
|Change actual source pixels or animation frame durations|Yes|Visible source-color statistics changed.|
|Commit Opacity cut|Yes when visibility changes|Only source pixels surviving the active cut participate.|
|Select Generated again with the same sources/cut|No; reuse current revision|Do not recompute for selection alone.|
|Matching Oklab/RGB|No|Matching chooses how existing source colors map to the shared generated palette.|
|Per-image Max colors or All|No|This chooses a subset of the shared palette separately for each asset.|
|Cleanup On/Off|No|Cleanup operates after matching; feeding its output back into generation creates a cycle.|
|Resize, zoom, wall reorder, scroll, animation playback, Original comparison, theme|No|Display state must not change source colors.|
|Export/copy/Download all|No new UI revision|Use a captured shared revision, resolving the captured generation if needed.|
|Switch to a preset or saved palette|No background refresh|Cancel unused generation and retain only a small bounded cache.|
|GIF loop count|No|One whole clip contributes; infinite looping must not imply infinite weight.|

Generation should always use a fixed perceptual Oklab objective, independent of Matching. This keeps the toggle understandable: RGB matching changes the remap, not both the shared colors and the remap at once. Opacity cut is different because it defines which source pixels are visible. An optimization may reuse results for changes proven not to alter visibility, such as binary-alpha assets, but such an optimization must preserve the simple semantic dependency.

Use committed/coalesced settings, not every transient pointer move. Debounce rapid source batches and opacity edits, keep cancellation prompt, and publish only the latest complete generation. Use decoded source RGB and fully composited GIF frames, never converted previews, thumbnails, the empty-wall logo or only the currently displayed GIF frame.

## Weighting and animation

Use **equal total contribution per nonempty wall asset**. Within each asset, accumulate visible color counts across its whole clip with frame-duration weights, then normalize by that asset's total visible pixel-time. For a still, use its visible color frequencies. This avoids a large background or a long animation automatically drowning out smaller sprites. It deliberately gives a small icon more influence than plain pooled-pixel fitting would; it is a product choice for a sprite wall, not proof of lowest pooled error.

For asset i and RGB c, the contribution is:

`h_i(c) = sum_frames(delay * visible_count(c)) / sum_frames(delay * total_visible_count)`.

Sum the normalized histograms across assets. Skip a fully invisible asset rather than dividing by zero. Use the app's effective decoded/normalized delays with its existing fallback for invalid delays. Multiplying every delay in one clip by the same factor should not change its contribution. Splitting an identical frame into two with the same total duration should not change the palette. Unequal visibility across frames is weighted by visible pixel-time; a blank frame supplies no color. Loop repetitions are ignored. Identical duplicate wall tiles count as separate assets, consistently with treating each wall asset equally.

Do **not** combine still weight1 with GIF raw millisecond delays across the wall: those are incomparable units and can make animation dominate. The existing limiter's duration weighting is sensible within a single clip; it cannot simply be pooled unchanged across unrelated wall assets.

A single generated revision applies to every frame of every asset. This avoids palette generation causing frame-to-frame flicker. It does not remove source animation noise or eliminate the cleanup guard's existing limitations. Per-image Max colors still uses one subset over the whole clip, and Cleanup continues to prepare against that final subset. All with Cleanup Off yields one deterministic mapping for the same source RGB across assets; per-image subsets can map that RGB differently while retaining shared-palette membership. Cleanup On can also map the same RGB differently according to its spatial context, even with All.

## Atomic lifecycle and exports

Track a wall-source revision and an immutable generation signature containing the source/frame identities and content revisions, frame delays, Opacity cut, algorithm version and fixed target32. Wall order is excluded. Capture the source references before awaiting work. A result can publish only if its signature still matches the current requested revision.

Retain the last complete palette and tile output while updating, with a concise updating state. Never publish partially fitted colors or let individual tiles install different shared palette revisions. Publication of the complete immutable colors object invalidates dependent subset/cleanup/preview jobs together. Newly loaded images may use the old complete revision while marked updating, but that revision must be explicit rather than pretending that current generation is finished. On initial generation, show the loading state until there is a valid palette; do not silently use ENDESGA output under the Generated label.

At a Save/Copy/Download all gesture, capture the entire wall source set, Opacity cut and conversion settings, then resolve one palette for that captured signature. Every output in a ZIP uses those same captured colors. Source edits or removal during export must not mutate its sources or palette. An old generation needed by an export remains alive even if the preview changes; only the last subscriber can cancel it. Capture source references before waiting, not after the new palette arrives. Export may await generation, with the existing busy/progress/cancel UI, rather than exporting an obsolete palette or rebuilding independently per tile.

The first implementation needs a clear non-color state: zero assets or zero visible pixels yields no generated color result and does not fabricate black. Keep Generated selectable/selected with an explanatory empty state; disable its color-dependent export/copy/edit action until applicable. A one-color input produces that one color and uses existing one-color control behavior. Failed decoding does not become an asset contribution. Generation failure should preserve the last completed preview with an explicit error/retry state; do not treat it as a valid current revision or silently substitute another source.

Copy/Edit receives a plain immutable palette snapshot and switches to normal saved-palette behavior on Save. Editing that copy must not modify the generated source. Generated's selected ID may persist across visits, but its runtime colors should be regenerated from new wall sources rather than restored as an unexplained old palette.

## Bounded implementation plan

Lazy-load one generator core and worker only after Generated is requested. Reuse the existing worker/chunk/cancellation approach, but keep generation as a wall-level job rather than one job per Tile. Stream acknowledged 128 KiB source slices; never clone all wall RGBA or detach original buffers. Fit all frames incrementally. Use fixed arrays, no per-pixel objects or per-pixel palette-cost matrices, and cooperative fallback if worker construction is unsupported.

A reasonable first implementation candidate is a bounded RGB histogram (exact up to a small threshold, then fixed bins), deterministic weighted splitting in Oklab, and a small fixed number of improving refinements. Generation creates RGB colors; gamut conversion, byte rounding, duplicate removal and deterministic final order are part of its contract. Retain the best evaluated fit if rounding/refinement increases the objective. This algorithm choice is **not yet validated** by the previous Pillow prototype and must be benchmarked before shipping. Do not add a large WASM quantizer just because it has more features; measure the optional compressed bundle before choosing a dependency.

Cache bounded source summaries keyed by content revision and visibility cut, with an explicit byte LRU budget, not an unbounded list of per-asset histograms. Fixed 32,768-bin count/moment arrays cost about1MiB per four-Float64 array; even a small number of retained full histograms can matter. A proposed4MiB summary-cache budget is an engineering starting point, not a measured memory promise. Keep only one active fit plus the latest preview request; deduplicate export consumers by signature. Older export snapshots can be processed serially without allowing canceled preview requests to accumulate. Bound completed palette-result cache entries and release removed-source references.

Cancellation must be checked while scanning, combining and fitting. Terminate a worker when its last consumer leaves, including during module load, and reject stale results. Do not assume a worker solves CPU cost: scanning all source pixels/frames still takes time. Cached summaries help add/remove workflows; alpha-cut changes can require a rescan. Keep fixed fit-work/iteration ceilings and measure import contention, sustained GIF playback and worker contention with subset/cleanup before production adoption.

Determinism must cover wall reorder, independent import completion order, repeat selection and preview/export agreement. Canonical histogram processing, deterministic split/seed/tie rules and stable RGB rounding are required. Floating-point normalized contributions need canonical aggregation; simply summing in arrival order can break exact determinism at ties. If a hash is used for cache identity, handle collisions or validate the underlying revision identity; a hash alone must not permit stale pixels to be reused.

## Small new decision probes

`.tmp/palette-perf-20261012/adaptive/semantics-probe.mjs` passes **23 algebraic/state fixture checks**, recorded in `semantics-results.json`. These cover equal asset contribution, whole-clip duration weighting, order/scaling/frame-splitting invariance, invisible inputs, generation dependency exclusions, immutable palette capture and stale-publication rejection. They do not exercise production workers, asynchronous export races, a quantizer, animations in a browser, mobile performance or real memory peaks.

Required production validation before implementation is accepted: the160-still corpus and six buildings; all16 real GIFs; mixed still/GIF walls; one/zero-color visibility; transparency cut changes; add/remove/replace/reorder while generating/exporting; rapid source/setting changes; worker failure/cancellation; mixed cold/warm generation timing; lazy bundle size; bounded cache eviction; exact preview/export palette parity; mobile layouts and sustained playback. Report fidelity metrics separately from unblinded artistic judgments and inspect small details rather than claiming that generated palettes solve orphan pixels.

## Additional presets

Do not add another preset in this change. [AAP-64](https://lospec.com/palette-list/aap-64) is a credible future comparison candidate: its published64 colors include a near-black#060608, white and gray/teal ramps addressing identifiable coverage gaps in some current presets. Its displayed83,186 Lospec downloads are site-specific cumulative downloads, not universal popularity. No bounded cohort comparison against AAP-64 was performed here, so there is no demonstrated benefit sufficient to expand the minimal rail now. Keep the accepted [ENDESGA32](https://lospec.com/palette-list/endesga-32) default and existing distinctive presets; users can import alternatives.

The [libimagequant primary documentation](https://pngquant.org/lib/#multiple-images-with-the-same-palette) establishes that collecting multiple images into one histogram is a standard shared-palette mechanism. Its importance maps and progress cancellation are useful design references. Its palette can refine during remapping, which is exactly why a shared app palette must be frozen before converting independent outputs. This is supporting design context, not a recommendation to load that library or a claim of browser performance.
