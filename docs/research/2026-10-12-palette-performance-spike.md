# Palette rendering performance: research spike

October 12, 2026. Completed research, not a shipped performance rewrite. Main now contains the reviewed retained-frame playback fix (`56c1f0d`) and ENDESGA 32 default (`c26a1b7`). No generated-palette source or animation cache was added to the application.

## Decision

Improve expensive first-use palette preparation before attempting full-animation baking. The most promising exact-output change is to reuse each exact histogram RGB's nearest-color error during Max colors fitting. Next eliminate unnecessary empty-cleanup transfers and overlays, retaining validation and cancellation. Consider lazy indexed preview caching only when a whole clip fits a **shared global byte budget**; keep the current streaming path otherwise. Do not add a generic small frame LRU or bake every native-resolution frame upfront.

Keep ENDESGA 32 as the full-palette default. The earlier [preset study](2026-10-12-palette-default-and-adaptive.md) supports its broader coverage over PICO-8 on this cohort, not universal superiority or artistic neutrality. Its 32 shared colors allow different assets to use different ramps; Max colors remains optional per-asset limiting, with All unchanged. PICO-8 remains a useful deliberate stylization. No additional preset is justified by this spike. [AAP-64](https://lospec.com/palette-list/aap-64) is a future comparison candidate, not a measured replacement.

## What already runs, and when

- **Static palette images:** a Tile retains its completed conversion. There is no animation loop constantly requantizing a static image. Relevant source, palette, matching, cap, cleanup, transparency or sample-size changes trigger conversion. Display colorization is separate from fitting/quantization.
- **Palette animation:** subset selection and guarded cleanup are shared whole-source jobs, cached by immutable source/settings identity. Prepared palettes are reused, but preview frames are requantized on later loops. Wall and enlarged viewer can share preparation without sharing their sampled frame conversions.
- **1-bit:** already caches frame masks and colored pixels. The retained-frame GIF fix changes the palette path; it does not claim to improve the existing 1-bit algorithm. No extra static bake is warranted merely to prevent repeated work.
- **Cleanup Off:** independent fresh-runtime witnesses observed zero cleanup module loads or workers and unchanged Nearest indices for Oklab and RGB. It is a no-op for cleanup work, not zero cost for normal matching.
- **All:** skips fitting and its heavy core/worker. A source-getter trap confirmed no source scan on this bypass. The small shared client module may already be loaded; that is distinct from loading or running the optional engine.
- **Original comparison:** the palette Tile effect currently still quantizes while Original is visible. An optimization should suppress unnecessary jobs without altering source playback timers, readiness, exports or the visible viewer. The wall also converts behind a viewer; any visibility policy must distinguish those consumers.

Audit witnesses: `.tmp/palette-perf-20261012/audit/`. These exercised current source directly; no production code was modified for the witnesses.

## Physical-device and browser measurements

The supplied dungeon GIF contains 56 composited 512×458 frames, 224 visible RGB values and 52,527,104 decoded RGBA bytes. Both browsers used the actual production modules with ENDESGA 32, Opacity cut 128, and the same GIF. The 256px preview is 256×229. The research harness is [palette-performance-spike.html](../../bench/palette-performance-spike.html), included only in a separate benchmark build, not the normal production build.

Physical device: **Pixel 8 Pro, Android 17, Brave with Chromium 155**, USB-powered, battery 81%, approximately 31.5°C before and 32.1°C after the first run. Android's reduced browser user agent reports Android 10; device metadata came from ADB. The user started the first run; the second was operated through ADB at their explicit request. Desktop: Codex in-app Chromium 155 on Windows, 24 reported logical threads. Record times below are independent runs, not controlled statistical distributions.

| Work | Desktop | Phone first | Phone repeat |
|---|---:|---:|---:|
| Decode GIF | 67.8ms | 127.5ms | 120.4ms |
| All / Oklab / Off, first 256px loop, mean per frame | 1.40ms | 2.11ms | 2.26ms |
| All / Oklab / Off, requantized loop, mean per frame | 1.49ms | 1.96ms | 1.94ms |
| Research cached indices loop, mean per frame | 0.26ms | 0.47ms | 0.55ms |
| All / RGB / Off, mean per frame | 1.67ms | 2.35ms | 1.94ms |
| Native 512px, eight frames, mean per frame | 4.64ms | 7.13ms | 7.44ms |
| Max colors 8, whole-clip result-cache miss | 726ms | 2,278ms | 2,009ms |
| Max colors 8, existing result-cache hit | 0ms* | 2.3ms | 0.4ms |
| Cleanup On, whole-clip result-cache miss | 48.9ms | 254.3ms | 195.7ms |
| Cleanup On, existing result-cache hit | 0.1ms | 0.7ms | 0.2ms |
| Max colors 8 / Cleanup On, mean per preview frame | 1.70ms | 2.43ms | 2.13ms |

*A rounded timer zero is not literally zero work. A cache miss includes preparation and communication; the phone repeat retains already loaded modules/workers, so it is not a second cold browser launch. The benchmark labels this phase "cold" to distinguish a missing item result from its following cached request.

Every independently requantized index was compared against the first loop, not just its hash. All 56 frames agreed exactly in all three runs. The cached path reused those indices for colorization/canvas upload. Cached index and used-color buffers total **6,580,224 bytes (6.28MiB)**, excluding Map/result objects, source buffers and canvas/GPU memory. This demonstrates an exact-output opportunity, not a complete production cache implementation.

Timings include quantization (or cached-index lookup), colorization, ImageData creation and putImageData. Explicit yields, index verification, reporting/network requests and presentation are outside frame timings. They **do not establish playback FPS**, Svelte scheduling, input latency or whole-app RAM. The GIF decode produced a main-thread long task (desktop 68ms; first phone 132ms). Worker work still consumes CPU even when it does not block the main thread.

The phone test covers one flagship device and one low-entropy GIF. It does not certify low-end Android, Safari, high-entropy AI images, many simultaneously playing tiles or sustained thermal performance. Detailed immutable runs are in [browser measurements](2026-10-12-palette-performance-browser-measurements.json).

ADB also imported the supplied GIF through the phone's native media picker and verified ENDESGA 32 as the fresh full-palette default in the actual application. The Nearest popup fit the phone viewport with its 32-color All placeholder, maximum-position thumb, Matching and Cleanup rows. A short All/Oklab/Cleanup Off screen recording contained 43 captured frames without duplicated extraction; the always-present warm brick region remained visible in every frame. This checks for gross blank-output intervals in that short recording, not subtle palette churn or every animation/settings combination. [Probe](2026-10-12-palette-phone-playback-probe.json), [phone popup screenshot](assets/2026-10-12-palette-phone-settings.png). The kernel benchmark separately completed cap8/Cleanup On on both phone runs.

To reproduce from the repository root, build with `node node_modules/vite/bin/vite.js build --config bench/palette-performance.vite.config.js`, place the supplied GIF at `.tmp/palette-phone-build/fixtures/dungeon.gif`, and run `node bench/palette-performance-server.mjs`. Open `http://127.0.0.1:5262/perf` in the test browser. For a USB Android device, `adb reverse tcp:5262 tcp:5262` exposes only that loopback test port to the device. Reports are saved in `.tmp/palette-perf-20261012/phone/`. Stop the server and remove that reverse after testing; do not publish this local reporting endpoint. The normal production build does not include the benchmark entries.

## Challenged optimization candidates

### 1. Reuse exact histogram matching error

The limiter already keeps a bounded exact histogram up to 4096 RGBs, but repeatedly recalculates unchanged matching error for every repeated pixel. The research variant stores one scalar per exact entry. It still accumulates each pixel's weight/error in the original order; the binned path is unchanged. This avoids changing floating-point accumulation and ties.

Desktop Node, ENDESGA 32/Oklab/cap8 on the supplied clip: **727–757ms original versus 154–183ms prototype**, two bounded repeats. Complete returned objects, including selected indices, costs and traces, were strictly equal. Another **46 parity cases** covered matching modes, alpha cuts, frame duration weighting, random palettes and >4096-color transitions. [Measurements](2026-10-12-limit-cost-results-32.json), [parity results](2026-10-12-limit-validation.json).

This is the strongest small production candidate. The browser/phone numbers above benchmark the original limiter, **not this prototype**. A future implementation must repeat actual-device measurements and retain its exact-result regression checks; do not project the Node speedup directly onto the phone.

### 2. Avoid proven empty cleanup work

The tested dungeon configurations left no guarded replacements. The cleanup core already skips later calculations once no proposals survive, but the worker still receives/assembles later RGBA frames. Chunk copying alone took approximately 30–34ms in Node, excluding messaging and GC.

Validate every frame's width, height and buffer shape **before** accepting an early result. Equal pixel counts do not prove equal dimensions. Then stop remaining transfers once the guarded intersection is empty, with the existing cancellation/subscriber/backpressure rules. A validated `hasChanges` result could also skip empty overlay scans without skipping the generic helper's necessary validation or used-color/transparency invariants. Cleanup Off remains its current bypass.

### 3. Cache clips that actually fit

Full native RGBA baking adds about 50.09MiB for this GIF, on top of decoded sources; native Uint16 indices add 25.05MiB. Sampled indexed frames are far smaller but require recolorization/upload. A 4MiB LRU holds only 17 of 56 sampled frames. Sequential playback evicts every frame before reuse: **zero steady-loop hits**.

If implemented later, estimate the complete sampled clip and admit it only when it fits a **global** cache budget shared by all tiles/viewers. Populate lazily during normal playback, retain complete reusable clips, and use the existing streaming path when they do not fit. Cache keys must cover immutable source frame identity, ordered palette/subset colors, matching, opacity cut, cleanup revision/map and sampled dimensions. Removed items, settings changes and resize must release or invalidate obsolete entries. Retained same-item display pixels must not be mistaken for readiness under new settings.

Exports retain full-source captured settings and are independent of sampled preview caches. No cache may substitute downsampled output for an export, retain an export consumer's canceled snapshot incorrectly, or multiply an apparently small per-tile budget across a large wall.

### Rejected for this spike

Shared nearest-RGB memo reuse helped the low-entropy GIF only weakly and regressed noisy sources. A row-address loop was faster on the GIF but slower in a high-entropy native case. Neither deserves a global kernel replacement from the favorable sample alone. Extra matching color spaces do not address the observed startup/transfer/repeated-frame costs. Packed RGBA colorization is a smaller future opportunity, with endianness and invalid-index behavior needing preservation.

Kernel workloads included the supplied sprite, dungeon and large AI-city/mixed-noisy fixtures. They are not the entire 160-image PixelLab cohort used in the separate preset study. The research copies and full kernel report remain in `.tmp/palette-perf-20261012/kernel/`.

## Generated shared palette

Accept the user's lazy source proposal with an explicit **Generated 32** selection. Compute once for the current whole wall and all animation frames; publish one immutable shared revision. Refresh only for committed source changes, frame duration changes and opacity changes affecting participating pixels. Matching, per-image Max colors, Cleanup, playback, reorder and layout do not regenerate colors. Copy/Edit can save a frozen ordinary palette.

Normalize each nonempty asset to equal total contribution, with duration-weighted visible pixel frequencies inside each GIF. Raw GIF millisecond weights must not be mixed with still weight1 across assets. Adding/removing assets can legitimately recolor earlier assets; automatic adaptation cannot also promise permanently unchanged output. Export captures the whole wall and resolves a single captured shared revision before converting any ZIP member.

This is worthwhile, but separate from the exact-output optimizations above: it creates new RGB colors and needs its own bounded lazy worker, source-summary cache, deterministic fit and physical-device validation. The earlier RGB median-cut experiment does not validate a proposed Oklab generator. [Generated palette design](2026-10-12-generated-palette-design.md) and [23 semantic probes](2026-10-12-generated-palette-semantics.json) describe the chosen contract and its remaining validation.

The final review corrected one misleading promise: identical source RGB maps identically across assets with All **and Cleanup Off**; spatial cleanup and per-image subsets can intentionally differ. The primary [libimagequant documentation](https://pngquant.org/lib/#multiple-images-with-the-same-palette) supports pooled shared-palette generation, without establishing this app's performance or requiring that dependency.

## Validation before shipping performance changes

Implement candidates separately and compare exact indices/subsets/exports against the existing behavior. Cover both matching modes, All and caps, cleanup Off/On, partial and empty transparency, 256-color exports, real GIF delays/loop counts, source mutation/removal, rapid sliders, viewer/Original behavior, worker failure/cancellation and cache eviction. Recheck the sprite, six buildings, high-entropy large images, multi-animation walls and physical-phone cold/warm behavior. Preserve normal lazy bundle boundaries. The completed default change passed **528 tests and the production build**, plus fresh-default and saved-selection browser checks.
