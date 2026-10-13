# Performance

## Reviewed scheduling and recovery (October 13, 2026)

Palette export yields reuse matching's posted-task primitive, retaining its timer
fallback. A Tile keeps one completed-input record for its existing pixels:
unchanged Original/viewer return reuses them without conversion. Changed source,
frame, sample size, palette subset, matching, alpha or cleanup require current work.
Single-frame GIFs keep native still decoding followed by unpublished analysis on
the same healthy serial worker, avoiding worker churn and main-thread reanalysis.
Unreadable worker messages use existing terminal rejection/recovery semantics.

Leaving desktop hover stops queued preparation immediately. An in-flight request
gets the existing 180 ms hover delay before abort, so a brief return while that same
request remains pending can reuse it. Completion while away still discards its result.
Different items, settings invalidation, explicit cancellation and destroy abort at
once. Cancellation affects only its preparation, including
matching, cleanup and PNG/GIF compression. Shared Save/preview consumers and native
drag grace records survive. Module downloads cannot be canceled, but do not block
the next hover or start obsolete source jobs afterward; late URLs are released.
Legacy synchronous masks/codecs remain a separate candidate. GPL rows trim once
and avoid ambiguous whitespace backtracking; tests use a killable child process.

The 8 MiB cache policy and opacity-slider commits remain unchanged. Measured rAF
rate does not prove every clip smooth or bound memory. See
[the fix record](research/2026-10-13-performance-stability-fixes.md).

For the maintained still-preview reuse check, build normally and run
`node bench/palette-preview-reuse-server.mjs dist 5281`; open `/qa` in a foreground
desktop browser and Run checks. It checks unchanged Original/viewer return and
fresh output after a held-Original palette change against a new conversion. Its
test-only HTML counters leave production assets untouched. Reload for another run.
See [the review reconciliation](research/2026-10-13-fix-review-reconciliation.md)
for the bounded hover departure repair and next-batch ownership decisions.

## Auto tooltip and wall scheduling (October 12, 2026)

Auto is the visible name of the existing generated source, now capped at 64.
Its tooltip reads the completed palette's count and published source label;
showing it performs no sampling or generation. A new preview conversion posts its
first task before accessing source data, preventing many tile effects from combining
their first slices in one synchronous flush. Cache hits and exports keep their paths.

Both built Codex and physical Pixel 8 Pro audits passed thirteen phases with
184 assets/17 GIFs. Independent exports passed 28 files and 144 composited frames
per device. The phone's matching phase had no observed task above 50ms in the final
run, but the desktop phase was slower and still had long tasks. This is an input-ordering
guard, not a demonstrated universal speedup. Synchronous GIF decode/legacy analysis
and offscreen animation remain concrete performance targets. Source RGBA/analysis,
GPU and export scratch are outside the 8 MiB animation-index budget.
See [the audit](research/2026-10-12-auto-performance-audit.md) and the separate
[32/64 experiment](research/2026-10-12-auto-capacity.md) for measured costs and limits.

The approved 64-color release retains the saved `generated-32` identity and All
default, and preserves exact visible source colors up to 64 without padding.
Generation and uncached matching can cost more with 64 candidates; the 8 MiB index
budget, 128 KiB worker slices and full-source export rules are unchanged.
Animated tiles outside the viewport pause their timers and subsequent palette
conversions while retaining their frame/cache. They resume the held frame's normal
delay on return, including 1-bit and Original; enlarged Preview remains independent.
Stills and full-source preparation/export paths are unaffected by visibility.
See [the release checks](research/2026-10-12-auto-64-release.md) and
[offscreen playback](research/2026-10-12-offscreen-playback.md).

User imports now load a serial worker for GIF compositing and analyze/unify, with
acknowledged original/analysis buffer transfers. Native PNG decoding stays intact;
the tiny demo starts no import worker. Failed workers recover from the original
File, while canceled imports cannot publish late. Unsupported-worker fallback
yields between frames/analyses, but one huge frame, shared unify and live-wall
1-bit reanalysis can still block. Source and analysis storage remain unchanged.
Single-frame non-GIF stills up to 4096 pixels use the same cooperative analysis
through that serial queue to avoid unnecessary worker round trips.
See [the import review](research/2026-10-12-import-worker.md).

## Generated preview and PNG source decoding (October 12, 2026)

Generated 32 uses the animated demo only for an empty wall, including a persisted
Generated selection and clearing the last real image. A wholly invisible real wall
remains authoritative and yields zero colors. The initial request and conversion
handoff retain an already completed conversion of the same item; pending work does
not remove its canvas. This is display continuity, not reduced generation cost.

Artwork and palette-image import share native PNG ImageDecoder/copyTo RGBA/sRGB when
supported. It streams the file and avoids a canvas readback/premultiplied-alpha round
trip, without adding a PNG parser or color-merging heuristic. Native capability/errors
and transformed frames fall back to the previous bitmap/canvas decoder. Other formats
and the independent animated GIF decoder retain their paths. Native/frame/bitmap/canvas
resources close on completion, failure and cancellation; palette import limits remain.
The supplied two-color PNG had eight visible colors after physical-phone canvas
readback, but exactly its two original colors through native decoding. This fixes
source corruption rather than altering Generated 32's exact-color rule.

Admitted animation clips quantize each sampled frame on its first visit and retain
indexes within the 8 MiB budget. Colorization and canvas upload still happen each
displayed frame. Over-budget clips quantize again on revisits. Generation, palette
limiting and guarded cleanup are shared whole-source/clip preparations. Full GIF
export intentionally converts two sequential passes: used-table preflight, then
encoding with worker backpressure; it does not retain a full native RGBA bake.
See [the decoding and preview record](research/2026-10-12-generated-preview-decoding.md)
for reproduction, browser evidence and limits.

## Palette performance implementation (October 12, 2026)

Max colors reuses nearest error for repeated exact histogram RGBs, preserving original
cost accumulation and binned validation. Cleanup Off still loads/runs no cleanup
engine. On validates all animation metadata first, then stops frame transfer/processing
when agreement is empty. Validated prepared empty maps skip overlays; arbitrary helper
callers retain metadata rebuilding.

Palette animations lazily cache sampled Uint16 indexes and used flags when the whole
clip fits a shared **8 MiB** budget. Stills bypass it; over-budget clips stream without
eviction. Last-consumer release frees the reservation. Original comparison skips frame
conversion; an open viewer pauses hidden wall playback, retaining its cache. The budget
excludes source RGBA, JS objects, canvases, temporary/worker buffers and exports. It is
not a total app memory guarantee. Exports remain full-source; 1-bit caching is unchanged.

Generated 32 is lazy and shared at wall level: 128 KiB acknowledged chunks, exact RGB
summaries up to 4096 entries, 32768 bins thereafter, and six deterministic refinements.
Its cache retains two small palettes/signatures rather than old sources/histograms.
Matching, caps, cleanup, playback and resize do not regenerate it. Worker construction
failure uses the cooperative core. Export subscribers survive preview cancellation.
App's completed generated result stores the request key rather than the captured wall.
Tiles clear inactive limiter/cleanup request references. Canceling the final subscriber
of an unstarted limiter/cleanup job removes it from the queue immediately; active or
independently subscribed export jobs remain alive. Cleanup Off skips work, but a prior
cached map still costs two bytes/source pixel until its source identity is collectible.

Pixel 8 Pro, Android 17, Brave/Chromium 155: the supplied 56-frame GIF took 624ms for a
cold cap-8 worker job, 129ms for cleanup and 1439ms for Generated 32. Cached generation
took 0.1ms. At 256×229, warm cached rendering averaged 0.57ms/frame versus 2.08ms uncached;
all 56 indexes matched. Buffers cost 6,580,224 bytes and were released afterward. This
is one bounded device run, not FPS, hard deadlines or a controlled speedup distribution.
Existing noncancelable hover export preparation can retain an old generation subscriber
and delay a newer serial job. Safari, prolonged sessions and isolated whole-app memory
peaks remain unverified. See the [implementation record](research/2026-10-12-palette-implementation.md).

Built-app desktop and physical-phone wall stress checks each passed 18 lifecycle stages
with 184 assets, 17 GIFs and 439 total source frames (including stills), about 85 MiB of
decoded RGBA. A bounded 28-asset cohort exercised cap 8 and Cleanup On/Off. Independent
decoding of both full-wall ZIPs verified every file/frame's dimensions, alpha, shared
palette membership and GIF timing/loop. Large import/regeneration changes still caused
380ms phone and up to 1091ms desktop long tasks. All-Brave Android process PSS remained
above baseline after clear; it is not isolated app memory, and rounded phone JS heap
values cannot establish a memory bound. The 8 MiB cache is not a whole-heap limit.
See the [wall stress and retention record](research/2026-10-12-generated-wall-stress.md)
for scope, timings, process measurements and cross-device color differences.

## Optional one-pixel cleanup (October 12, 2026)

Cleanup is Off by default. Off loads no optional cleanup runtime and preserves the
existing nearest path. On prepares full-source decisions after palette limiting, with
one lazy serial worker and 128 KiB acknowledged chunks. Only one source frame is
assembled in the worker at a time. Full-animation agreement is accumulated incrementally;
converted clips are not retained. A cached replacement map costs two bytes/source pixel.
Preview resize, playback and Original comparison share the same preparation. Independent
subscriber cancellation keeps an export alive when its preview closes; canceling the
last subscriber terminates even a worker whose module is still loading. Unsupported
worker construction uses the same cooperative core. Runtime failures are reported.

The core has typed scratch and a bounded 4096-entry RGB-to-Oklab cache, with no
per-pixel arrays/objects. Temporary core arrays are about 11 bytes/source pixel for a
still and up to 15 for a subsequent animation frame, plus 114,688 bytes of RGB cache and
palette vectors, plus at most 1,024 bytes of exact RGB keys. This excludes source RGBA, quantizer arrays, decoding, cached maps,
runtime GC and export buffers. Full-resolution export overlays yield cooperatively;
display-sized previews use the same synchronous range kernel. The 8ms target is checked
between bounded blocks and is not a hard device deadline.

The final error-limited rule adds one cooperative pass over frozen proposals. It only
converts source RGB to Oklab for proposed changes, reuses the bounded source cache and
allocates no arrays or objects per pixel. Off and the lazy-loading boundaries are unchanged.
See the [final decision and validation](research/2026-10-12-cleanup-final-decision.md).

Historical initial implementation: its suite passed 525 tests and a production build. Native Codex browser checks
decoded 315 PNG/GIF outputs covering the supplied sprite, all six buildings, four
eight-frame animations, partial alpha and a 1.92MP mixed/noisy fixture. Pixel/cap/alpha,
GIF metadata, Copy, Preview, Reset, family retention, rapid changes and responsive
layouts with Opacity cut visible were checked. All 56 supplied-image Off PNGs were
byte-identical to the existing path at `ecb8088`. A browser-decoded RGBA witness was required
for partial alpha: existing canvas rounding changes some source RGBs before conversion.

Historical initial core-only desktop observations were about 65ms preparation plus 7–9ms overlay on
1.92MP flat/speckled fixtures; native Save observations ranged 1.4–3.1 seconds with
mixed cold/warm caches, compression, preview contention and automation included.
These are not phone budgets or comparative speedup claims. Physical phones, Safari,
nonzero hardware safe areas and sustained peak memory remain unverified. Optional
bundle sizes, detailed evidence, intentional-detail loss and animation guard limits are
in [the cleanup research](research/2026-10-12-one-pixel-cleanup.md).

The revised error-limited implementation passes 528 tests and a production build.
Final native browser validation covers 161 outputs / 521 frames, including Copy;
all checked pixels match the independent reference. Three revised core runs on the
1.92MP mixed/noisy fixture took 192.5, 180.5 and 167.6ms, excluding browser decoding,
worker transfer, rendering and export encoding. These differ from the historical
fixtures and are not a before/after speed comparison. Responsive browser checks
at 320px and 375px include Opacity cut. See the final decision linked above for
coverage, bundle sizes and remaining artistic/animation limitations.

How Colorfetti stays fast with big images on phones: what was slow, what was changed and why,
what was measured, what was tried and thrown away, and what is still open. It is the record
of the performance work of October 2026 (commits `e1eccfd` to `6d6e37f`, on top of
`ce7bffa`), written so that the work can be continued without anything but this file, the
code and the spec.

The historical sections below begin with the legacy 1-bit engine. The full palette implementation
and its separate scheduling/export limits are recorded in the October 11 section at the
end of this document. Earlier phone measurements must not be read as validation of the
new conversion family.

The rules of behavior are in the spec,
[superpowers/specs/2026-10-06-colorfetti-app-design.md](superpowers/specs/2026-10-06-colorfetti-app-design.md),
in the sections "Images larger than their tile", "Drafts while a slider is dragged" (which
since covers every slider of the Style panel, not only the threshold's), "Long jobs", and parts of "Adding images", "Saving", "Copying" and "Errors and
limits". This file explains the reasons and holds the numbers.

## Icon preparation (October 8, 2026)

### Small-sprite cavities and openings

Small transparent components (at most 1,024 source pixels in a 64×64 box) now use
`src/lib/icon-glyph.js` for Auto and Keep. Larger/opaque inputs and Trim keep the previous
linear groove path. The outer component flood and two-byte cached result are unchanged.
The new bounded scratch space is under 128 KiB per component and is discarded after
preparation. Arrays are typed and allocated per component, never per pixel. Opening work
allows at most 128 unique straight paths; overflow conservatively keeps the contour.
Moving Detail still samples the cache, without rerunning the detector.

Separate-process measurements are in
[integration-performance-before.json](../bench/icon-research/integration-performance-before.json)
and [integration-performance-after.json](../bench/icon-research/integration-performance-after.json).
For all 65 actual 16px items together, fresh preparation was 2.782 ms before and 6.263 ms
after; cached updates were 0.226 and 0.289 ms. These are desktop best-of-five timings.
The extra preparation buys whole cavities and selected edge openings rather than the old
filled helmet results. The large opaque stress path has identical output and no additional
per-pixel scratch; single-pass times varied substantially (including roughly twice as long
at 512² and 2048² after the inventory warm-up). The new small-sprite path does not warm
the old large-input loops. These figures are not a speedup claim or phone measurements.
`node bench/bench.mjs` also ran before and after. The earlier figures below describe the
original Icon implementation and are retained as historical measurements.

Icon adds a separate structural preparation in `src/lib/icon.js`. It is lazy and is not
run for any other style. `Tile.svelte` prepares it before timing the mask loop, like
Stencil, so the slider's draft decision measures the cached conversion. Every outline
choice is cached on the analysed image as two byte arrays: body membership and minimum
Detail. Moving Detail samples these arrays; colors only repaint. Saving and copying use
the full-source mask. Brightness/alpha changes produce a fresh analysis and cache.

Preparation uses linear component floods, constant-size connectivity lookups and ranked
linked buckets. It allocates 13 temporary bytes per source pixel plus 2 cached bytes per
outline choice, in addition to the existing source/analysis/mask. No pixel creates an
array or object. Three cached outline choices can retain 6 bytes per pixel. Large inputs
still have a synchronous first pass and significant temporary memory demand.

`node bench/icon-research/bench-icon.mjs` measured 65 actual 16×16 inventory items at
2.898 ms for fresh preparation and 0.220 ms for a cached Detail update on this desktop
(best of five after warming the engine). A noisy, fully opaque stress image took:

| Source size | First Icon pass | Cached full mask |
|---|---:|---:|
| 512×512 | 34.1 ms | 0.86 ms |
| 2048×2048 | 580.8 ms | 13.0 ms |
| 4000×3000 | 3224.1 ms | 76.3 ms |

Stress results are single passes, not a phone benchmark. Icon is intended for inventory
sprites. `node bench/bench.mjs` was run before and after; unchanged conversion branches
showed ordinary shared-machine variance, rather than a consistent regression. All ten
existing styles matched `bench/recolor.old.js` in 24,000 image/style/threshold cases,
including sampled pictures, using `node bench/equiv.mjs`. The old baseline remains local
and untracked.

## Stencil median cap (October 8, 2026)

The brightness guard in `mask` now compares each pixel with its sprite's cached interior
median, rather than disabling all brightness cuts when the requested cutoff reaches that
median. Sprite preparation, caching, sampling and allocations are unchanged. Original
Otsu Auto selection is retained; the proposed recursive Auto split is not shipped.

`node bench/bench.mjs bench/recolor.old.js` and `node bench/bench.mjs` compared commit
`7c0437d` with the cap, best of three on this desktop:

| Stencil input | Before, cached | After, cached | Before, first pass | After, first pass |
|---|---:|---:|---:|---:|
| 512×512 opaque | 3.7 ms | 3.8 ms | 3.9 ms | 3.9 ms |
| 512×512 sprite | 4.3 ms | 4.4 ms | 8.5 ms | 8.6 ms |
| 2048×2048 opaque | 113.0 ms | 111.4 ms | 109.8 ms | 115.8 ms |

Larger/shared-machine timings varied substantially, including unchanged branches. These
runs support no speedup claim and are not phone measurements. The cap adds no allocation
or preparation work. `bench/equiv.mjs` verifies 24,000 byte-identical combinations for
the ten unchanged styles, plus exact preview sampling for 2,400 Stencil cases. The unit
suite sweeps all 65 AI items through Cuts 0–254 in 30 brightness/outline/edge configurations.
The historical guard comparison is reproducible with
`node bench/icon-research/stencil-guard.mjs`, which loads its baseline from Git `7c0437d`.

## The rules that must hold

Two were set by the owner. The rest are what the work depends on.

1. **Saving, downloading and copying are always full quality.** Every pixel of the image is
   converted, whatever is on screen, also in the middle of a slider drag. A palette PNG
   counts as full quality. No path from a button or a key may reach a tile's smaller picture.
2. **The slider's draft has no race, its timer is always stopped or started again, and
   nothing leaks.** There is one timer at most; every move and every end of a drag stops it
   first.
3. **Performance-only changes preserve conversion.** `mask` with no size is byte-identical
   to the old `mask`. Intentional algorithm changes must update the spec and tests; the
   equivalence harness checks unaffected styles and exact structural preview sampling.
4. **The loops in `src/lib/recolor.js` make nothing per pixel**: no array, no object, no
   function. They run once for every pixel of a photo, on phones.
5. **Work per change follows the screen, not the file.** Only adding an image, saving and
   copying may go through every pixel; desktop mouse dragging additionally prepares
   one hovered image's full export after settings settle, on ordinary URLs too. Jobs
   are debounced and serial, with one current encoded export shared by wall and Preview.
   Native dragging requires a decoded image resource per rendered surface for that
   export, adding full-image decode/memory cost on desktop. Touch/mobile create no drag
   runtime. Drag exports are not hashed or logged; prototype diagnostics were removed.

## What was wrong

Measured before any change, on a desktop, with Node (`bench/bench.mjs`) and in a browser
with the processor slowed down:

1. **The conversion loops made things for every pixel.** Cutout, the default style, built a
   small array of the eight neighbours for each pixel and ran closures over it. It took
   3.0 s for a 12-megapixel image on a desktop, 0.57 s for 4 megapixels.
2. **Every change converted every pixel of the file.** A change of color, style or
   threshold made a full mask, a new copy at four bytes per pixel, and pushed it into a
   full-size canvas, whose size was also set again each time (which reallocates it). The
   browser then shrank that canvas to a tile about 1000 screen pixels wide. For a
   12-megapixel photo on a phone, 15 of every 16 pixels converted were never shown.
3. **Saving copied the image at four bytes per pixel** and compressed all of it: 3 s for 12
   megapixels on a desktop.

In a browser with the processor slowed 4 times, a 12-megapixel photo in Cutout took 25 s to
add and 13 s for every move of the threshold slider.

## How it works now

### Analysis (`analyze` in `src/lib/recolor.js`)

Done once when an image is added. It goes through every pixel, because the Auto thresholds
are picked from all of them.

- One pass works out the brightness of each pixel, the histogram of brightness, and each
  pixel's color difference from the pixel to its right and from the one below. The
  differences are kept, one byte each, in `right` and `down`.
- A second, cheap pass (`seamStrength`) picks Cutout's seam strength. It needs the Auto
  threshold from the first pass, so it cannot be part of it. It reads only brightness and
  the stored differences.
- **Why the differences are kept.** Lines and Cutout asked for them at every pixel on
  every threshold change, and working them out from RGBA is most of their cost. Without the
  two arrays Cutout is about 2 times slower and Lines about 3 times (measured by a
  reviewer). They cost 2 more bytes per pixel of memory.
- An image holds 7 bytes per pixel in all: 4 of RGBA, 1 of brightness, 2 of differences.
  That is 84 MB for a 12-megapixel photo. One that has been shown in Stencil holds 3 more
  (see "Conversion").
- For an image with no empty pixel, `mask` never reads the RGBA array (`opaque`), which
  keeps a photo's conversion to the three small arrays.

### Conversion (`mask`)

`mask(img, style, threshold, mw, mh)`. With no size it converts the whole image. With a
smaller `mw` by `mh` it converts a smaller picture of the image, which is what a tile draws.

- **Where the picture's pixels fall.** Pixel `i` of `m` across `n` image pixels stands for
  image pixel `floor((i + 0.5) * n / m)`, the one under its middle (`spread`). The spacing
  is whatever that comes to. It is deliberately not a whole number. See "Whole-number
  steps" under what was thrown away: this is the most important lesson of the work.
- **Cutout, Solid, Stencil, Lines, Silhouette** give each pixel of the picture exactly what its
  image pixel is in the full mask, worked out from that pixel's real neighbours in the full
  image. The picture is the full result with pixels left out.
- **Checker, Hatch, Bayer, Noise and Atkinson are drawn afresh on the picture's pixels.**
  The pattern's tile is counted in the picture's pixels, and Atkinson passes its error from
  one of the picture's pixels to the next. Their look comes from how neighbouring pixels
  alternate, and pixels picked out of a pattern do not alternate as the pattern does (every
  second pixel of a checkerboard is one color). The tile is as light and dark as the saved
  file, with a pattern at the scale of the screen; the file's own pattern is finer.
- **Tone** for the pattern styles is read from a table of 256 entries, made once per call,
  not worked out per pixel. The four patterns are small tables of cuts (`TILES`), 2, 3, 4
  and 16 pixels square.
- **Atkinson** keeps its running values for three rows at a time, not for the whole image.
  That saves 4 bytes per pixel on each conversion. It did not make it faster.
- **Colors** (`colorize`) are written one whole pixel at a time through a 32-bit view.

Cost per pixel converted, desktop, Node: Solid 1.3 to 2.5 ns, the patterns 3 to 6, Lines 8
to 12, Cutout 14 to 20. It is about the same at every picture size.

- **Stencil judges each sprite on its own**, so it first needs to know every sprite:
  `sprites` walks each one once and keeps three bytes per pixel with the analysed image
  (its outline level, what Auto cuts up to, and the median brightness of its inside), so
  the walk is done once however often the settings change. `spritesOf` does it the first
  time it is asked, not `analyze`, so an image never shown in Stencil never pays for it,
  and a tile's smaller picture reads the same arrays.
  - A photo has no empty pixel and skips the walk.
  - The walk holds five more bytes for every pixel while it runs: 60 MB for 12 megapixels.
  - In Node on a desktop the first Stencil mask of a 2048 by 2048 image with see-through
    parts took about 80 ms longer than the ones after it, and of a 4000 by 3000 one
    between 0.3 and 1.3 s longer, the most on a machine that was busy. `node bench/bench.mjs` shows it as "stencil first".
  - The walk is not part of a tile's `pace`: `Tile.svelte` asks for the sprites before it
    starts its clock, so the first drag of a slider in Stencil is drafted no rougher than
    the next.
  - **Not solved:** a very large see-through image stalls a phone for some seconds the
    first time it is shown in Stencil. That is also paid when Stencil is only stepped
    past, since it is third in the list, and again after each change of Brightness or
    Opacity cut, which analyses the image afresh. A cap on size was turned down: above it
    a large sheet of sprites would be judged as one sprite, which is the case the walk is
    for.

### What a tile draws (`shown` in `src/lib/layout.js`, used by `src/Tile.svelte`)

A tile measures the square its image sits in and asks `shown` for the size of the picture
to draw.

- **An image no larger than the tile's screen pixels is drawn whole.** That covers every
  sprite. It is then exactly what is saved.
- **A larger image is drawn at the tile's own size**: the image area's width in CSS pixels
  (the square less 8px on each side) times the device pixel ratio, along the longer side.
- **A picture a whole number of times smaller than the image, or within 0.04 of that, is
  made 6% smaller.** See "Whole-number steps".
- **The shorter side keeps at least 32 pixels**, or all the image has. A long thin image
  was otherwise drawn up to 30% too tall once its few rows were rounded.
- **During a drag of the threshold slider** a smaller picture may be drawn. See "Drafts".

In `Tile.svelte`:

- `size` is the pair from `shown`; `mw` and `mh` are derived from it one each, so that
  working `size` out again to the same numbers redraws nothing.
- `masks`, `colored` and `originals` are caches, one entry for each frame. A frame is
  converted when it is first shown and kept until what it depends on changes: a mask until
  the style, threshold or size changes, colored pixels until a color changes too. So a
  color change reuses the masks, and an animation converts one frame at a time as it
  plays, not all frames on every change.
- The original is shown as the same picture (`shrink`), so comparing moves nothing.
- `pace` is how long the tile's last conversion took, in milliseconds per pixel. It is a
  plain variable, set inside the derived value that converts.
- A square of 16px or less has not been laid out yet, and nothing is converted for it.
- `src/Pixels.svelte` sets the canvas's size only when it changes.

### Drafts while the threshold slider is dragged

On the Pixel 8 Pro a full redraw of a photo's tile in Cutout takes 60 to 80 ms. That is too
slow to follow a finger. On a slow phone it is several times more.

- While the slider is dragged the wall has `DRAG_MS` = 24 ms for each move, shared equally
  between the tiles (`budget` on `<Tile>`).
- A tile whose picture would take longer than its share, by its own `pace`, draws a
  smaller one: the image scaled by `sqrt(share / (width * height * pace))`. It does not
  classify the device. It times this image, in this style, on this device.
- **An image drawn whole is never drafted**, however slow. A draft would drop pixels the
  screen was showing, which for pixel art is wrong, not rough. Twelve sprites on the Pixel
  therefore take 33 ms per move and are left at that.
- The size of the draft is fixed for the drag (`pace` is not reactive), so the detail does
  not flicker during it.

When it is a drag is decided by `sliderDrag` in `src/lib/gesture.js`, wired in
`src/Dock.svelte`:

- A drag is moves with a pointer pressed (`pointerdown`, then `input`). The arrow keys and
  the number box move the threshold with no pointer pressed and never draft.
- It ends on `change`, `pointerup`, `pointercancel` or `blur`, and when the Style panel
  closes, which takes the slider away with its events.
- **It pauses when the slider has rested for 150 ms** with the pointer still down: the
  image sharpens under the resting finger, and the next move makes it a drag again. This
  was the owner's choice among four designs.
- **The rest is timed from the end of the redraw**, not from the move. `sliderDrag` is
  given `tick` from Svelte, which settles once the wall has converted and drawn. Timed from
  the move, a device that needs longer than 150 ms to redraw would be taken for a resting
  finger at every move, and would redraw at full detail each time.
- Real touch on Chrome for Android gives one `pointerdown`, the `input` events, one
  `pointerup` and one `change`. There is no `pointercancel` in a normal drag.

Known behavior that follows from this design, left as it is: a touch that lands off the
slider's thumb starts with one full redraw (the first `input` comes at touch-down, and the
browser holds the next moves until the finger has travelled); a slow, careful drag shows
rough then sharp at each step; if the finger moves on while an image is sharpening, that
move waits for it; and the original is drafted too when compared in mid-drag.

### Long jobs (`during` in `src/App.svelte`)

Adding, saving and copying a photo go through every pixel on the main thread, and the page
can do nothing else meanwhile.

- A job of `BUSY_PIXELS` = 2,000,000 or more first shows a message in the toast with a
  spinner: "Reading name…", "Downloading name-1bit.png…", "Downloading colorfetti.zip (5
  images)…", or "Copying name…". Every download also shows its output filename in the toast
  for smaller jobs, without a spinner.
- The job starts 50 ms after the message (`drawn`), so that the message is on screen
  first. **That wait is a timer, not a screen frame**: a hidden tab has no frames, and a
  job waiting for one would wait until the tab was shown.
- **The spinner (`.spin` in `src/app.css`) is a CSS animation of rotation alone.** The
  browser runs such an animation without the page, so it keeps turning while the job has
  the page stuck. It turns at an even speed: WebKit may not run a stepped one that way.
  Seen turning on Chrome for Android; not checked on Safari.
- **What is saved is what was asked for.** `asking()` takes the colors, style and threshold
  at the click, and Download all takes the list of images then too. The job that starts
  50 ms later uses those, whatever has changed since.
- **A copy asks the clipboard at once and hands it the PNG later.** Safari only allows
  `navigator.clipboard.write` inside the click, so `copyOne` is called in the click with a
  promise of the PNG (`pngBlob`), which is made inside the job the message covers.
- `working(text)` puts a message up and returns what ends it. If jobs overlap, the message
  is that of the newest one still running.

### Adding images (`addFiles` in `src/App.svelte`)

- Images of a batch are read one after another. A photo goes on the wall as soon as it is
  read.
- **Images read within a quarter of a second of each other go on the wall together.**
  Putting each sprite on by itself refitted the whole wall every time, which for 120
  sprites took up to three times as long as adding them at once.
- A batch keeps its "Reading 2 of 5…" message from its first large image until it ends.
- **Remove all stops a batch that is still being read** (`emptied` counts the times; a
  batch checks after every wait).
- The full-size canvas used to read an image is given back at once (`canvas.width = 0`).
  iOS limits how much memory all canvases may hold.
- URL image drops (including Discord attachments) fetch one image at a time and hand
  each file to this same reader. Remove all aborts the pending network requests and
  the reader checks the original batch generation before adding downloaded pixels.
  Network waits show a fetching message and time out after 30 seconds per request.
- Progress jobs use object identity rather than their text, so two concurrent URL
  fetches with the same message can finish in either order without hiding a newer
  still-running read, save or copy job.

### Saving (`src/lib/save.js`)

- **A PNG is written straight from the mask** as a palette image: color type 3, 2 bits per
  pixel, a palette of three entries (empty, first color, second color) and a `tRNS` chunk
  that makes the first one transparent, and a color that is None with it. That is a sixteenth of the data to compress, and
  the image is never held as RGBA.
- zlib level 3. Level 6 is twice as slow for a file 4% smaller.
- Download all converts and encodes one image at a time, so only one full mask is in
  memory at once.
- GIFs were always palette images. Nothing changed there.

Encoding a 12-megapixel Cutout image, desktop:

| Form | Time | Size |
|---|---|---|
| RGBA, level 6 (before) | 1560 ms | 1175 kB |
| RGBA, level 1 | 617 ms | 1666 kB |
| 2 bits per pixel, level 6 | 262 ms | 763 kB |
| 2 bits per pixel, level 9 | 676 ms | 744 kB |
| 2 bits per pixel, level 3 (now) | 131 ms | 797 kB |

### Memory

- A removed image used to be kept by the Share sheet, which remembers the image it was
  last opened for. An effect in `App.svelte` now lets it go.
- After garbage collection, removing all images returns image memory, elements and
  listeners to where they were (`bench/leak.mjs`).

## What was measured

### On a real phone

Pixel 8 Pro, Chrome 154, driven over USB with real touch input, at the phone's own speed.
Old build (`ce7bffa`) to new (`6d6e37f`). Best of 2 or 3 runs. Milliseconds.

| Scenario | Add image | Change style | One slider move | Save | Memory in use (MB) |
|---|---|---|---|---|---|
| Sprite 256 by 256 | 79 to 60 | 55 to 19 | 14 to 5 | 65 to 30 | 14 to 13 |
| 12 sprites 256 by 256 | 357 to 169 | 133 to 71 | 80 to 33 | 178 to 74 | 30 to 45 |
| Photo 4 MP, Cutout | 1727 to 384 | 943 to 79 | 1273 to 20 | 1383 to 248 | 98 to 61 |
| Photo 12 MP, Cutout | 4698 to 1112 | 2459 to 60 | 3657 to 19 | 3787 to 592 | 273 to 117 |
| Photo 12 MP, Solid | 952 to 847 | 193 to 27 | 138 to 10 | 1524 to 239 | 273 to 111 |
| Photo 12 MP, Lines | 2585 to 855 | 708 to 44 | 1668 to 7 | 1080 to 309 | 273 to 141 |
| Photo 12 MP, Bayer | 1189 to 843 | 274 to 30 | 203 to 12 | 1160 to 241 | 273 to 111 |
| Photo 12 MP, Atkinson | 2227 to 890 | 1350 to 49 | 1200 to 14 | 4164 to 427 | 290 to 117 |
| 6 photos of 4 MP, Cutout | 7822 to 1308 | 3522 to 55 | 3136 to 30 | 7851 to 1100 | 441 to 190 |
| Photo 12 MP, Cutout, phone slowed 4 times more | 19260 to 3080 | 6974 to 103 | 15066 to 24 | 17286 to 2106 | 228 to 111 |

"One slider move" is the time from a move reaching the page to the last tile being
redrawn. "Memory in use" is before garbage collection; after a forced collection the
sprite rows are level with the old build. The picture a 12-megapixel photo's tile draws on
this phone is 900 by 675, and about 600 by 450 while dragging in Cutout. The raw figures
are in `bench/matrix-device.txt` (old and an earlier new build) and
`bench/final-device.txt` (the final build).

### By part

| Part | Measured on | Before to after | Gain |
|---|---|---|---|
| Flat loops and stored differences, Cutout | Desktop, whole 4 MP image | 566 to 87 ms | 6.5 times |
| the same, Lines | the same | 244 to 52 ms | 4.7 times |
| the same, Atkinson | the same | 486 to 52 ms | 9.3 times |
| the same, Solid and the patterns | the same | 29 to 54, to 15 to 21 ms | 1.9 to 2.6 times |
| the same, coloring | the same | 31 to 3.5 ms | 9 times |
| the same, analysis | the same | 159 to 86 ms | 1.9 times |
| Tiles draw at the size of the screen | Pixel, 12 MP | 12 MP to 0.61 MP converted per change | 20 times fewer pixels |
| The two together | Pixel, 12 MP Cutout, change of style | 2459 to 60 ms | 41 times |
| Drafts | Pixel, 12 MP Cutout, a slider move against a full redraw | 60 to 19 ms | 3.2 times |
| Palette PNG | Pixel, 12 MP Cutout, save | 3787 to 592 ms | 6.4 times, files 35 to 45% smaller |
| Analysis, and no full-size first draw | Pixel, 12 MP Cutout, add | 4698 to 1112 ms | 4.2 times |
| Memory | Pixel, 12 MP | 273 to 117 MB | 57% less |

Whole 12-megapixel image on a desktop, Node, before to after: analysis 746 to 243 ms,
Cutout 3043 to 247, Lines 706 to 151, Solid 82 to 42, Atkinson 1334 to 149, coloring 84
to 9.

### Checks that passed on the final build

- `npm test`: 115 tests at the time.
- `bench/equiv.mjs`: `analyze`, `mask` and `colorize` byte-identical to the old code on
  400 random images, 9 styles, 6 thresholds; a smaller picture is the full mask at the
  image pixels its pixels stand for.
- `bench/tone.mjs` and `bench/alias.mjs`: at every picture size each style is as light as
  the full conversion, also for dithered art, stripes and a stippled transparency, also on
  tiles exactly a half, third or quarter of the image.
- `bench/saved.mjs`: a photo saved and copied in the old build and the new, at Auto and in
  the middle of a drag, in all nine styles, is full size and identical pixel for pixel.
- `bench/leak.mjs`: five rounds of add, every control, save and remove, each followed by a
  forced garbage collection, return to the same memory, elements, listeners and file links.
- On the phone: draft while moving, full while the finger rests, a draft again on moving,
  and a file saved in the middle of that is the full 4000 by 3000.
- By a reviewer: a real clipboard write in Edge is identical to the saved file; an
  animation plays, drafts and saves at full size; `sliderDrag` under 1,500 random orderings
  of moves and late redraws never has two timers or one left over; and in Firefox 157 the
  palette PNG decodes to the old pixels and the clipboard accepts the promised image.

## What was tried and thrown away

### Whole-number steps (the mistake to remember)

The first version of the tile took every k-th pixel of every k-th row, with k a whole
number. It looked exact and it was cheap. It was wrong twice, and neither the author's
tests nor a check of 21,600 cases against the old code saw it, because they all proved
that the tile equalled the full mask sampled, which was the fault itself.

1. **It collapsed the pattern styles.** A pattern that repeats every 2, 3, 4 or 16 pixels,
   sampled every k pixels, gives the same few cells each time. On a photo, Bayer showed
   98% light where the saved file is 51%; Checker 82% at even k; Hatch 19% at k of 3. Found
   by the first review. Fixed by drawing the patterns and Atkinson afresh on the picture.
2. **It locked onto any fine regular texture in the image itself, in every style.** Art
   already dithered to black and white came out 97% light where the file is 50%; one-pixel
   stripes came out one color; a stippled transparency lost its midtones. It also kept
   lines and seams in enlarged pixel art on the left and top of each art pixel only. Found
   by the second review. This matters for this app, since dithered art is a likely input.

Before the work the browser shrank the whole conversion at whatever ratio the tile gave,
which does not lock on. The fix is the same: spread the picture's pixels evenly at
whatever spacing comes, and step off a whole-number ratio where the tile happens to give
one.

It had a third cost. With k rounded down, an image between one and two times its tile had
k of 1: it was converted whole on every slider move and, being "shown whole", never
drafted (507 ms per move for a 1900-pixel image on a slowed phone, 30 ms after the fix).

**The test to trust is a picture's brightness against the full conversion's, on images
with a texture, not equality with a sample.**

### Holding changes back to one per screen frame

Setting changes were applied in `requestAnimationFrame`, so that several slider moves in
one frame would cost one conversion. It made a slider move slower, 76 ms to 126 ms at 4
times slowdown, and a palette change went from 6 ms to 155 ms: every change waited one or
two frames. Browsers already report a slider's moves once per frame, and while a
conversion runs they merge the moves that arrive, so conversions never queue up behind
each other. Removed.

### Other ways to shrink, considered and not taken

- **Random offsets within each block** would break the locking, but make every straight
  edge ragged by a pixel, which is worse for the common case.
- **Averaging blocks of the image before converting** is the proper way to shrink, and
  would remove the bands a shrunken texture shows. But the Auto thresholds and Cutout's
  seam strength are picked from full-size differences and would not fit an averaged
  image, and Lines and Cutout would draw features several times thicker than the file's.
- **Averaging the full conversion** is the most faithful picture of the saved file, and
  needs a full conversion on every change, which is the cost the work removed.

### A worker

Not done. Conversion, analysis and saving all run on the main thread. A worker is the only
way to full quality on every slider move with a smooth thumb, and to a page that stays
alive while a photo is read or saved. It makes loading, drawing, saving and copying
asynchronous, needs the image data copied to the worker or moved there, and has to be
tried on iOS. It was left as the upgrade path. Analysis is the easiest part to move,
since adding is already asynchronous; it would not make it finish sooner.

### Smaller things

- **Auto thresholds from a sample of the pixels** would make adding a photo several times
  faster, but the thresholds would no longer be exactly those of the full image, and the
  per-pixel arrays would have to be made on the fly, which makes every conversion slower.
- **Other ways of writing the difference** between two pixels (comparisons in place of
  `Math.max`, bit tricks, reading pixels as 32-bit words): none was faster than
  `Math.max` of three `Math.abs`. Reading pixels as words was 15% faster in one test, not
  worth what it does to the code.
- **Folding the seam pass into the first pass** needs two tables of 256 by 256 counts and
  would save at most a quarter of the analysis.
- **Grouping a batch's images over a tenth of a second** still left 120 sprites slower to
  add than before. A quarter of a second brought them level.
- **Not ending the drag on `pointercancel`** was meant to keep drafts going if a browser
  cancelled the pointer in mid-drag. No browser tried does that, and it left the drag to
  be ended by the rest timer. It ends on cancel now.

## What is left

1. **Safari and iOS have not been run at all.** Chrome on Android and on a desktop, Edge,
   and headless Firefox have. Unverified on Safari: the clipboard being handed a promise
   of the image, the spinner turning while the page is busy, and real touch on the slider.
2. **Adding and saving a photo still stall the page**: about 1.1 s and 0.6 s for 12
   megapixels on the Pixel. A message shows, but nothing else responds. A worker is the fix.
3. **Memory is 7 bytes per pixel per image, and 10 for one that has been shown in Stencil.** Of the 84 MB a 12-megapixel photo holds, 48
   are its RGBA pixels, which after analysis are read only for the compare view and for
   transparency. Letting them go, and reading the file again to compare, would more than
   halve it. Several photos can still exhaust a phone.
4. **Images above about 16.7 megapixels cannot be read on iOS**, because reading uses a
   canvas of the full size. Not changed by this work.
5. **A tile's picture is a sample, not an average.** An image with a fine regular texture
   shows bands when drawn smaller, as it did before the work. The saved file has none.
6. **For the patterns and Atkinson a large image's tile is not a sample of the saved
   file**: as light and dark, but with the pattern at the scale of the screen.
7. **Saved PNGs open in indexed-color mode** in image editors. The pixels are identical.
8. **Zooming in with two fingers does not reveal more detail** in a large image's tile.
9. **`devicePixelRatio` is read without being watched.** Moving the window to a screen of
   another density leaves a tile's picture at the old size until the tile resizes.
10. **The draft's speed estimate is one earlier conversion.** A tile that has never
    converted is not drafted on its first drag. On a browser with a coarse clock (Firefox
    with fingerprint resistance) the estimate would be poor.
11. **The benchmark image is synthetic**: smooth shapes with grain and a 64-pixel grid,
    saved as a JPEG. Real photos, sprite sheets and dithered art have not been timed.

## The reviews

Three independent reviews were run, each told to assume the work was wrong. All three
found things the author's own checks had passed.

- **First, a Claude subagent, on an early version.** One blocking bug: the pattern styles
  collapsing at whole-number steps. Also: Atkinson walked every pixel on each change;
  sprites could be drafted; the drag could stick when the Style panel closed; the step
  formula was untested and in the component; thin images were drawn too tall; the canvas
  used to read an image was never freed.
- **Second, Codex.** One blocking bug: a stippled transparency lost its midtones, which
  led to the wider fault of whole-number steps. Also: a long save or copy read its
  settings and images after its 50 ms wait, not at the click; Remove all did not stop a
  batch being read; the drag did not end on `pointercancel`; a copy's message was
  withdrawn before the PNG was made; the message of overlapping jobs could be a finished
  one's.
- **Second, a Claude subagent, on the same version.** The same six, and: an image between
  one and two times its tile was converted whole on every move; adding 120 sprites took
  two to four times as long; the spinner turned in steps; lines in enlarged pixel art were
  kept on two sides only; the "Reading" message blinked between the photos of a batch.

Everything they found that was a defect is fixed. A review is worth running again after
any change to `mask`, `shown`, `sliderDrag` or `during`.

## Measuring

The scripts are in `bench/`. They need Node 22 or later, and Microsoft Edge or Chrome for
the ones that open a browser (set `BROWSER` to its path if it is not at the default Edge
location).

| Script | What it does |
|---|---|
| `bench.mjs` | Times `analyze`, `mask` in every style, `colorize` and `pngBytes` on whole images, in Node |
| `equiv.mjs` | Checks the conversion against an earlier copy of `recolor.js` saved as `bench/recolor.old.js` |
| `kcost.mjs` | Cost per pixel converted at several picture sizes |
| `tone.mjs` | Each style's brightness and texture at several picture sizes, on a smooth image |
| `alias.mjs` | The same for dithered art, stripes and a stippled transparency, at the size each of several tiles would draw |
| `png.mjs` | Time and size of the ways of writing a PNG |
| `live.mjs` | Drives a build of the app in a real browser or on a phone, and times adding, style changes, a real slider drag and saving |
| `matrix.mjs` | Runs `live.mjs` over a list of scenarios for an old and a new build |
| `final-device.mjs` | Runs `live.mjs` over the scenarios for one build on a phone |
| `saved.mjs` | Saves and copies a photo in two builds and compares every pixel of the files |
| `leak.mjs` | Adds, uses and removes images in rounds and measures what is still held |

Before a change to the conversion:

```bash
cp src/lib/recolor.js bench/recolor.old.js && node bench/bench.mjs
```

After it:

```bash
npm test && node bench/equiv.mjs && node bench/tone.mjs && node bench/alias.mjs && node bench/bench.mjs
```

To compare two builds in a browser, build each next to the scripts. The old one comes
from a commit, with `node_modules` linked in:

```bash
mkdir bench/baseline && git archive ce7bffa | tar -x -C bench/baseline && cmd //c mklink //J "bench\\baseline\\node_modules" "node_modules" && (cd bench/baseline && npx vite build --outDir ../dist-base --emptyOutDir) && npx vite build --outDir bench/dist-new --emptyOutDir
```

Remove that link with `cmd //c rmdir bench\baseline\node_modules` before deleting the
folder. Deleting the folder with the link still in it can delete the real `node_modules`.

Then, from inside `bench/`:

```bash
node live.mjs dist-new w=4000 h=3000 cpu=4 style=cutout steps=20
```

```bash
node saved.mjs dist-base dist-new
```

```bash
node leak.mjs dist-new
```

`live.mjs` options: `w`, `h`, `cpu` (slowdown), `style`, `steps` (slider moves), `count`
(copies of the image to add), `profile` (`phone`, `tablet`, `desktop`), `kind` (`photo`,
`sprite`). `HEADLESS=1` hides the window; `PROFILE=1` adds a processor profile of the
drag; `SHOTS=name` saves screenshots during the drag and after release; `BUSY=name` saves
two during the read; `TRACE=1` prints each stage as it is reached.

### On a phone

An Android phone with USB debugging on, Chrome open and the screen awake:

```bash
adb forward tcp:9555 localabstract:chrome_devtools_remote
```

```bash
cd bench && DEVICE=9555 node final-device.mjs dist-new
```

If nothing answers on that port, another Chromium browser (Brave, on the owner's Pixel)
holds the usual socket while frozen in the background. Chrome's own is then
`chrome_devtools_remote_<Chrome's process id>`; `adb shell cat /proc/net/unix | grep
devtools` lists them. `live.mjs` opens a tab of its own and closes it, serves the build
from this machine through `adb reverse`, and uses real touch events.

### What to know about the measurements

- **Slowing the processor in a desktop browser is not a phone.** It does not slow memory
  or the graphics chip. For a 12-megapixel photo in Cutout, a desktop slowed 4 times took
  2.5 s to add it and 1.6 s to save it; the Pixel 8 Pro at its own speed took 1.1 s and
  0.6 s. Measure on the phone.
- **The machine is shared with other work**, and runs vary by up to 2 times. The scripts
  keep the best of several runs.
- **Time one way of writing a loop per process.** Timing several variants of a function in
  one process makes the later ones slower, because the engine has stopped trusting what
  it learned from the first. An early comparison was wrong for this reason.
- **A headless browser sometimes stops answering.** The scripts wait for the app to load,
  try the connection again, and `saved.mjs` gives each style a browser of its own. If a
  script prints nothing, run it again.
- **The browser cannot hand over a screenshot while the page is busy.** To see the page
  during a long job on a phone, `live.mjs` photographs the screen through `adb`.
- **A tile needs a drawn frame to learn its size.** In a browser pane that is not being
  shown, tiles stay unmeasured and report a canvas of 1 by 1 or none.
- **Keep historical test copies in `.tmp/`.** Vitest excludes this generated scratch
  directory while preserving its default discovery elsewhere. A source copy in another
  directory, such as `bench/baseline`, can still run duplicate tests.

## Unit test overhead (October 10, 2026)

The Pages deployment previously failed when an exhaustive workspace layout test exceeded
Vitest's five-second timeout. Its strict-assertion optimization retained every half-pixel
width and packing configuration. A follow-up audit kept the same approach for hot Icon
assertion loops: all 65 fixtures, Detail values, reflection/rotation cases, preview sizes
and export pixel comparisons remain unchanged. Ordinary assertions outside these loops
still use Vitest matchers. Failure messages now identify the fixture, setting and pixel.

Three comparable targeted runs before and after, using
`npx vitest run src/lib/recolor.test.js src/lib/icon.test.js --reporter=json --outputFile=.tmp/test-speed.json`,
gave these median test durations on the local machine:

| Check | Before | After |
| --- | ---: | ---: |
| Icon file, sum of test durations | 642.66 ms | 446.76 ms |
| Geometry and symmetry sweep | 237.11 ms | 156.21 ms |
| Preview and export sweep | 105.35 ms | 16.41 ms |

This reduces Icon test execution time by about 30.5%. Overall parallel wall time remains
dominated by the unchanged exhaustive Stencil test, approximately 2.3 seconds locally;
these measurements do not imply the same improvement for the entire suite or a guarantee
against future CI failures. Precomputing Stencil's transparency oracle was measured slower
and rejected. No application code, test cases, iteration ranges or timeout limits changed.

An intentionally wrong export color still failed with the correct fixture/pixel and
actual/expected values. A deliberately failing test in a new `bench` subdirectory remained
discoverable, while a failing `.tmp` test was excluded. These temporary canaries were
removed after checking them. The `.tmp` exclusion extends Vitest's existing defaults;
it does not limit discovery to today's test directories.

### Complete suite audit

The next pass read all 19 tracked test files, accounting for all 271 tests, plus the
runner configuration and Pages workflow. It did not limit the review to the slowest files.

| Test file | Cases | Audit result |
| --- | ---: | --- |
| `recolor.test.js` | 93 | Exhaustive conversion cases retained; Stencil remains compute-bound. |
| `icon.test.js` | 13 | Replace the connectivity helper's visited Set with a byte array; same eight-neighbor traversal. |
| `workspace-controls.test.js` | 20 | Format exhaustive-sweep diagnostics only on failure; preserve every condition and context. |
| `style-preview.test.js` | 3 | Small independent previews; no measured change warranted. |
| `tooltip.test.js` | 15 | Fake timers and per-test cleanup already avoid real waits and shared state. |
| `save.test.js` | 10 | Tiny fixtures retain independent PNG/ZIP decoding and CRC checks. |
| `hover-capability.test.js` | 8 | Independent CSS transformations retained. |
| `gif.test.js` | 11 | Small fixtures and disposal/round-trip checks retained. |
| `gesture.test.js` | 15 | Fake timers already avoid real waits; cleanup retained. |
| `theme-startup.test.js` | 8 | Independent VM contexts retained for startup isolation. |
| `settings.test.js` | 14 | Small validation and persistence cases; no change warranted. |
| `layout.test.js` | 17 | Small geometry cases and loops; no change warranted. |
| `canvas-grid.test.js` | 12 | Small synchronous coordinate cases; no change warranted. |
| `presets.test.js` | 12 | Small synchronous palette/style cases; no change warranted. |
| `workspace.test.js` | 4 | Small synchronous layout cases; no change warranted. |
| `viewer-layout.test.js` | 3 | Small synchronous fit cases; no change warranted. |
| `image-gesture.test.js` | 6 | Deterministic event/clock helpers; no real waits. |
| `tooltipCoverage.test.js` | 3 | Small source inspections; no change warranted. |
| `comparison-hold.test.js` | 4 | Small synchronous hold cases; no change warranted. |

Repeated whole-suite measurements showed Icon test time around 448→379 ms and the
workspace-control sweep around 106→69 ms. JSON-timed suite execution stayed around 2.8
seconds (command wall time around 4.3–4.4 seconds), dominated by unchanged Stencil execution.
The alternative thread worker pool was slower (median 4.15 seconds versus 2.79 seconds of
JSON-timed execution for the current pool) and was rejected; isolation,
worker defaults and timeout limits remain unchanged.

The old Set-based and new byte-array connectivity oracles agreed on 221,196 exhaustive
ternary-mask/value combinations, including rectangular boundary cases and an empty mask.
The workspace checks retain negated original predicates so invalid numeric values still
fail. Centering assertions retain their original messages and width/configuration context:
an extra lazy-message variant lost that context in Vitest's cached error stack and was
rejected. Deliberately wrong component counts, bounds and centered rows still failed with
the intended diagnostics. All fixtures, test names, conversion calls and sweep iterations
remain intact; production code is unchanged.

## Full palette conversion (October 11, 2026)

The 1-bit loops in `recolor.js`, preset stepping and legacy setting restoration remain
unchanged. Full palettes use `quantize.js`: prepared scalar Oklab and RGB arrays and a
256-entry sRGB linearization table, an exact RGB lookup first, then exhaustive nearest
search under the selected Oklab (default) or encoded RGB rule. Each
opaque output index belongs to the selected palette. Strictly smaller distance replaces
the current nearest result, preserving earliest-entry ties. No approximate color LUT or
per-pixel array/object allocation is used. RGB memoization is bounded to 4096 entries and
bypassed for high-entropy sources, avoiding an unconditional source-color Map.

The wall uses the existing center-spread sampling coordinates and display-sized picture
dimensions. Pointwise nearest matching agrees with full conversion at those coordinates.
Sprites fitting the display remain full resolution. `Tile.svelte` retains one completed
full-palette frame from the same item outside the legacy mask cache while settings or
the next animation frame convert. This keeps the canvas mounted through cooperative
yields; item/family changes clear it. Changes to palette, matching, size,
alpha or animation frame cancel the previous cooperative job, so stale results cannot replace the current
preview. Full palette playback advances only after that frame is converted and its source
delay has elapsed; expensive previews can play slower than the original. Original view
and exported frame delays remain independent of that preview timing policy. Original
playback does not subscribe to converted-frame readiness, so a pending or completed
conversion does not stop or restart its source-frame timer.

Quantization runs adaptive batches with an 8ms clock budget and 2048-pixel sub-blocks for
clock/cancellation checks. MessageChannel tasks yield to the event loop without the
nested-timer 4ms clamp. A sub-block is indivisible, so 8ms is a scheduling target rather
than a guaranteed maximum on every device. Import scanning also yields cooperatively.
The exact uniqueness bitset uses 2 MiB; only the first 4096 candidates become review
strings, while scanning still reports an exact total above that bound. Solid assistance
matches visible RGB in 3×3 patches and does not allocate a histogram object per pixel.

Full palette indices use Uint16, with 256 reserved for empty. At 12MP this result uses
24MB, compared with the legacy mask's 12MB, in addition to source RGBA and existing
analysis. Decoded GIF source frames are still retained by artwork import; this feature
does not remove that existing animation-memory cost. Browser image decode can allocate
internally before the palette importer discovers dimensions. Import limits are 32 MiB
per image and 16 × 1024 × 1024 decoded pixels; palette text is limited to 256 KiB.

Aseprite embedded-palette import is a separate dynamic module, requested only by the
`.ase` / `.aseprite` file route. Its bounded binary scan reads palette entries directly
and yields cooperatively for cancellation/progress. It allocates no artwork bitmap,
decompressed cel, layer composite or color-profile converter. Files are capped at
32 MiB and the review table at 4096 entries. Stored RGB values are numeric palette
values, as with HEX import; document display profiles are metadata, not applied.
Cancel suppresses publication and late read/module errors; it does not terminate the
browser's module request or file read. Busy clears when that pending operation settles,
and Close stays available. Parsing itself checks cancellation between bounded batches.
At `ac380bb`, the Aseprite-import production comparison with `2963cd3` added 575 minified startup bytes (201 bytes
using the same Node gzip settings). The separate parser is 2492 minified bytes / 1326
gzip bytes and is not preloaded by the HTML. These are build measurements, not network
latency or a physical-phone timing guarantee; compression varies by server settings.

Save/Copy snapshots the family, colors, matching and alpha cut and converts original pixels.
Palette PNG output is packed directly at the smallest fitting 1/2/4/8-bit depth, with a
direct RGBA fallback when all 256 opaque colors and empty occur. Async PNG packing and
compression keep the costly path separate from canvas encoding. GIF makes a used-color
preflight, then reconverts and sends one remapped frame at a time to a module worker for
compression. Acknowledgment prevents conversion from queuing every indexed frame; the
worker terminates when finished or failed. Browsers without Worker use the same writer
directly; an available worker failure is reported and is not silently retried. Compressed
GIF and ZIP output still accumulate in memory. The global GIF table, including empty,
must fit 256 entries; a compatibility failure opens an explicitly edited 255-color copy
and never downloads a partial ZIP.

### Evidence and limits

Desktop Edge 155, with a 256-color palette, measured a 12MP exact-membership conversion
at roughly 121–123ms, with progress/task intervals around 8.7–9.6ms. A noisy 512×512
conversion took roughly 118–123ms, with intervals around 9–11.5ms. A 16ms test interval
continued firing during both jobs. These are repeated development-browser measurements
on this desktop, not p95 claims, physical-phone measurements or a memory ceiling.

All ordered RGB values from the supplied PNG fixtures matched independently decoded
values in that browser. Exact/solid counts were 255/0, 31/31 and 345/31. The targeted core
suite passed 23 tests, including randomized scalar-reference equivalence, alpha boundaries,
sampled previews, input validation, count overflow, cancellation and storage conflicts.
Eight native-editor browser checks passed, including zero-solid draft retention, duplicate
picker restoration, named saving, revision reload and quota/session recovery.

The integrated suite passed 310 unit tests. `node bench/palette-qa.mjs dist` passed 132
legacy style/color-pair combinations and all five full preset cases through the built
browser app, with independently decoded exports and additional persistence/compatibility
flows. The harness compares the legacy engine and encoder against its Git baseline;
after committing the feature, set `BASE_REF` to the pre-feature revision. Codex browser
interaction checks supplement the harness. These checks do not prove absence of bugs.
Physical iOS/Android, Safari, arbitrary color profiles, canvas privacy noise and sustained
large-input memory behavior of the new family remain unverified and need device testing.

### Optional matching verification

Matching adds one rule selection to the existing nearest search. Prepared arrays remain
metric-independent and private; RGB memoization remains job-local, so switching rules
cannot reuse a stale color mapping. Exact membership and alpha take the same early paths.
RGB computes unweighted squared encoded-channel differences without a transform; formula
simplicity alone does not establish a browser speed advantage.

Isolated Edge 155 comparisons with `626d95e` preserved every previous Oklab output index
for 1MP exact, repeated-color and noisy inputs. Exact median times were both 10.1ms;
repeated-color times were 33.8/34.0ms. High-entropy measurements varied widely and reversed
their apparent ranking after warming. No reliable comparative speed or regression claim
is supported. Asynchronous results matched synchronous output under both rules, and
both canceled at the first progress callback. Observed maximum progress gaps were 17.2ms
Oklab and 19.5ms RGB; the existing 8ms budget remains a target checked between 2048-pixel
blocks, not a hard pause limit or a phone-performance guarantee.

The final matching change passed 324 unit tests and a production build. Independent
built-app checks passed 195 Oklab, 189 RGB and nine storage assertions, with intentionally
overlapping cases across modes. All six supplied buildings and native Codex downloads
matched their scalar references; Oklab native PNG bytes remained unchanged. A retained
baseline run covered 132 legacy combinations; the extended harness then covered five
Oklab and five RGB presets plus seven integration categories. Phone-size/coarse-pointer
emulation passed, including partial alpha; physical phone and Safari checks remain open.

### Palette preview refinement

The small palette circle caps its displayed sectors at sixteen actual palette colors.
Selection costs at most 256 entries × sixteen passes when palette metadata changes,
not per source pixel or animation frame. Integer RGB sums seed the greedy range coverage;
conversion and export use the unchanged full palette. Comparison-label transitions are
limited to colors and shadows so responsive widths settle without geometry animation.

The merged branch passed 356 unit tests and a production build. Independent built-app
checks passed 195 Oklab and 189 RGB assertions, including every supplied building and
new native Codex ZIP downloads. The fresh baseline run covered all 132 legacy
style/color-pair combinations, five presets under each matching rule and seven
integration categories. Layout checks covered 80 cases plus 40 short-label/theme cases;
web-image/GIF drop checks passed in both automated and native Codex browser flows.
Partial-alpha Opacity cut, reset, paired settings rows and conditional Help were checked.
Physical-phone and Safari validation remain outstanding.

The sixteen-sector/title follow-up passed 359 unit tests and a production build, plus
80 settings/layout cases and 40 short-name/theme cases against the new assets. Rendered
PICO-8 and DawnBringer previews retain all sixteen colors in their original order. The
16px title and paired settings fit native Codex 320px portrait and 844px landscape checks.
Conversion algorithms are unchanged; prior conversion/export results remain historical.

### Seven presets and palette URL drops (October 11, 2026)

Two additional immutable color tables bring the curated rail to seven entries. The
matching loops and sixteen-sector preview cap are unchanged; Resurrect uses all 64
colors for conversion even though its small preview shows sixteen. PICO-8 remains the
default independently of the descending-count rail order in that October 11 change.
The October 12 follow-up selects ENDESGA 32 for fresh/missing selections; existing
selections, matching kernels and optional settings remain unchanged. Fixed PICO-8
regression fixtures now select their named preset independently of the product default.

The open palette editor reuses the existing drag payload parser, then downloads only
the first image or Aseprite URL. Its separate fetch helper accumulates streamed chunks
up to 32 MiB, rejecting larger declared or actual bodies before reading the remainder.
This is a payload bound, not a bound on all browser memory or File construction copies.
Cancel and Close abort the request and suppress late results/errors. A 30-second timeout
bounds network/body reads only; local import and decoding keep their prior cancellation
behavior. Aseprite's parser remains on demand. No dependency, CSS or conversion changes.

Verification: 446 unit tests and the final production build pass. The built browser
regression passed 132 legacy combinations, all seven presets in both Oklab and RGB,
their complete copy/HEX backups, and eleven integration categories. The same build
passed 311 local import/editor assertions across 36 fixture scenarios. A subsequent
error-sentence punctuation fix passed a fresh 328-assertion URL suite on the final build,
including real cross-origin success/denial, all supported image codecs, the supplied
255-color Aseprite file, timeout/cancellation, limits and mixed import methods.
Native Codex browser checked every preset at desktop/320px width and exercised URL
imports, blocked-host recovery, manual/paste mixing, cancellation and saved editing.
Timeout tests assert the 30-second setting with shortened fixture timers; physical
devices, Safari and native Discord-client drags remain unverified for the new modal route.

### Optional Max colors (October 11, 2026)

All remains the default and returns the existing prepared palette without importing the
selection core or starting a worker. A limit at least the selected palette size does the same.
The slider updates its local display while dragged and commits after a 200ms pause or
immediately on release/change. Closing, palette/family switching, pointer cancellation,
All and Reset cancel pending values. The last completed preview of the same item
stays visible while a new subset/rendering or next animation frame is prepared;
unrelated items/families cannot reuse those pixels. Converted playback waits for the
current result. The number
field commits valid integers on change/Enter/blur. All/Reset suppress premature pointer
blur so discarding a typed number does not fetch the optional code.

Selection always reads full-resolution source pixels, even for reduced previews. A
duration-weighted animation histogram chooses one subset for the whole animation, including
its first-frame PNG Copy. Preview selection has its own effect, independent of frame,
display dimensions and original comparison. A WeakMap keeps one completed selection per
image; simultaneous preview/viewer/export requests share a job. Source identities, frame
delays, palette order, matching, alpha cut and maximum participate in its cache signature.

One lazy worker processes the queue serially. Each request transfers a new slice of at
most 128 KiB and waits for acknowledgment; original RGBA buffers stay intact. The last
subscriber cancellation terminates the worker immediately, releasing even a stalled module
download; canceling one consumer does not stop an export that still needs the same job.
Worker construction failure uses a dynamically imported cooperative core. Other failures
produce an actionable toast rather than uncapped output.

The source histogram is exact up to 4096 unique visible RGBs. Above that it collapses into
4096 four-bit RGB bins with means in the chosen matching space, while still scanning every
pixel. The largest distance matrix is 4096 × 256 Float64s (8 MiB); this excludes source
frames, browser decoding, bin/histogram bookkeeping and export buffers. Scratch data is
released after selection; the cache retains the prepared subset, not the matrix.

If unrestricted nearest matching already uses at most the cap, selection returns those
winning entries after one pass and preserves the output without fitting. Otherwise the
bounded search compares a full-nearest frequency seed with greedy error reduction,
then accepts up to eight improving swaps. Binned fitting uses a second original-pixel pass
to check the final fitted subset against the true frequency seed and chooses the lower-error
result. This is a heuristic with a baseline safeguard, not a global optimum; it can merge
rare details. Only afterward does the existing nearest quantizer map pixels to that subset.

Verification: 487 unit tests and the production build pass. The built-browser suite
retains 132 legacy style/palette exports, all seven full presets in both matching modes
and twelve integration categories, including a retained cap-one UI/PNG/Copy regression.
The limiter suite adds 53 runtime flow checks and
60 stress assertions covering worker/fallback parity, cancellation, export snapshots,
GIF frame subsets and the 4096/4097-color boundary. Native Codex browser checked all six
supplied buildings, two 1536×1024 AI images, 1.92/4 MP stress images, animations, partial
alpha and 320px/short-landscape layouts. Independent decoding verified 136 downloaded outputs
and 823 named contract assertions, including every-pixel membership, cap and nearest mapping.
An actual native clipboard PNG also matched its equivalent limited download byte for byte.

In an isolated desktop fixture, 1.92 MP cap-eight selection plus PNG Save took about
0.94–1.21 seconds. Native mixed five-item exports took 3–9 seconds; those times include
preview contention, full-resolution conversion, compression and browser automation.
They are not isolated selector timings or a physical-phone budget. Mobile checks use
responsive/touch emulation; physical iOS/Android and Safari remain unverified.

Against `bd9bab3` built with identical installed dependencies, initial JavaScript adds
7,677 raw bytes / 2,528 gzip bytes (3.31% gzip); CSS adds 273 raw / 57 gzip bytes.
The optional worker including its selection core is 8,841 raw / 4,203 gzip bytes. The
cooperative fallback is 4,458 raw / 2,212 gzip bytes and loads as an alternative path.
These are artifact sizes measured with identical gzip settings, not download timings.

### October 13: cooperative batch export

Save all yields through the existing posted-task scheduler between encoded files,
before starting the next. The captured item list and settings remain unchanged;
the ZIP downloads only after every file succeeds. Single-file Save retains its path.
This does not make an individual still's synchronous mask/PNG encoder cooperative.

Claude's physical Pixel 8 Pro measurements at `18f8dd2` found the twelve 1024×1024
still ZIP's longest task dropped from 719–1,104 ms to 60–116 ms with between-file
yielding; total times overlapped. The real 23-file animated wall remained
near 350 ms because one GIF's eager masks/encoding still dominated. These are
reviewer diagnostic measurements, not measurements of the committed production patch.
`save-batch.test.js` checks ordering, identical PNG entries, between-file scheduling
and no partial download on a later failure.

1-bit animation export now captures each frame's analysis and metadata before any
yield, without eagerly allocating every mask. The asynchronous GIF writer produces
and encodes one mask at a time, giving input/rendering a turn before the first frame
and after a frame group reaches the 8 ms budget. Mask creation, None remapping, buffer
growth and compression all count toward the budget. Output starts with a 1 KiB buffer
and grows with encoded data; it no longer reserves worst-case output for the whole
clip. Palette exports, still PNG and Copy retain their paths. Shared source analysis
is still retained; this is not a bound on whole-app memory.

Cancellation checks surround production, compression and posted yields, and cannot
interrupt an individual synchronous mask/LZW call. One large frame, cold Stencil/Icon
preparation and final output copying can exceed the budget. Average compression time
per frame does not prove a maximum. Tests compare all eleven styles, either None ink,
loop variants, buffer growth and captured mutations against the old GIF bytes.

### October 13: palette failure recovery

`palette-failure.js` records failures per surface, stage, logical inputs and attempt.
Retried requests retain their failure until they succeed. Removing a viewer cannot
remove a wall failure; unrelated imports do not reset failures. Registry notifications
invalidate app state only when failure presence changes, not on every successful
preparation. Source removal and Tile destruction remove owner references.

Retained previews are marked in the existing caption line without adding a phone
caption row. Persistent Dock/viewer Retry actions recover only failed stages. All
export entry points gate affected items, including keyboard Copy and native drag
requests; the batch button gates any failure. Already captured exports stay independent.
No uncapped or Cleanup-Off fallback is silently produced.

Actual-build Codex browser and Pixel 8 Pro results, byte-parity/independent decoding,
finite observer warning notes and limits are in
`docs/research/2026-10-13-onebit-export-and-palette-recovery.md`.

Blocked export drag requests now refuse without claiming preparation is running.
The preparation notice applies only to a currently valid request whose file is not
ready. Unavailable Auto and failed limiter/Cleanup guidance remain authoritative.

### October 13: live 1-bit source changes

Changing Brightness or a relevant Opacity cut no longer replaces analyses in a
synchronous wall-wide pass. `image-reanalysis.js` captures immutable source references
and frame metadata before yielding, analyzes into new arrays, and runs the unchanged
shared animation seam calculation one frame per posted turn. An already matching
analysis retains identity without posting work. There is no extra remembered-source
cache. Original sources are neither transferred nor mutated.

The app publishes the completed captured wall together only while its controller,
family, wall membership, source and relevant cut remain current. An empty wall handles
only the demo; an imported wall never reanalyzes the hidden demo. Rapid changes cancel
obsolete preparation. During pending or deferred slider analysis, a tile holds its
completed converted picture and pauses converted animation; Original remains available.
Save, Copy, ZIP and drag preparation independently analyze their captured source and
settings. Copy supplies its clipboard promise in the initiating gesture.

Analysis failures report once and leave the prior picture until a source/cut change
requests another attempt. Temporary old and new analyses add roughly three bytes per
changed source pixel, plus histograms and existing render caches. Individual large
frame analysis/seam calls, cold Stencil/Icon preparation and publication rendering
remain synchronous; yielding is not a universal task-time bound.
Independent overlapping exports may also own replacement analyses; this figure is
not a bound on total transient memory. Actual-build acceptance and native Pixel task
measurements are in `docs/research/2026-10-13-live-onebit-reanalysis.md`.

Starting a slider drag retains an already running analysis for the same captured
wall, Brightness and relevant Opacity cut. Dragging still defers a new heavy pass;
changing those inputs or the family cancels obsolete work. The request has an
explicit lifetime rather than the reactive effect's rerun lifetime. A settled
failure is retained until its inputs change, preventing drag events from retrying it.
Desktop and native Pixel touch checks close the reported drag freeze in
`docs/research/2026-10-13-slider-reanalysis-resolution.md`.
