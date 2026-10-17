# Android landscape and wall-count follow-up — October 16, 2026

This follow-up closes the prior palette batch's Android display-rotation gap and
tests the cost of automatic wall color metadata. It does not reopen the deferred
color-protection, Auto-budget or opacity-weighting investigations. Nothing is
pushed or deployed by this work.

## Native Android landscape

The authorized USB Pixel 8 Pro ran Brave 155 with the actual Android display at
both 90° and 270°, with CDP viewport overrides cleared. Native screenshots are
2244×1008; the browser viewport is 947×364 CSS pixels. Portrait and return-to-
portrait are covered too. Android's original free-rotation policy, accelerometer
setting and user rotation were restored after every harness. This tests real OS
rotation and composition, not a human physically turning the body or the sensor.

The original committed palette snapshot passed all seven groups in
`bench/palette-physical-landscape-2026-10-16/results.json`: live rotations, every
conditional Recolor control, touch ranges and Reset, native Save, wall Reuse,
modal gesture ownership, Preview and existing 1-bit controls. The independently
decoded PNG has zero RGB/alpha mismatches against a scalar reference; Reuse has
the same 13 colors. The compact landscape panel is about 76px tall, versus 130px
in portrait. The initial download interception failure is retained separately;
restoring the harness's native download policy resolved it without an app fix.

### Challenged caption limitation

Root challenged apparently clipped artwork and tiny caption text in a native
screenshot. Eight old/current, panel-open/closed, short/long-filename captures and
DOM geometry showed the artwork fits; alpha content made the image ambiguous.
When settings are open, both old and new layouts shrink tiles to roughly 96–98px,
leaving only 12–14px for caption text beside the existing actions. Dimensions,
filenames and counts can truncate. With settings closed, the tested tile is
194px wide and its full dimensions/count fit. This is an inherited short-
landscape layout tradeoff, not a color-count regression. The independent reviewer
checked the baseline evidence and agreed. No speculative layout rewrite ships.

## What counting does and does not cache

Exact-size wall conversions already produce used-color flags. Metadata consumes
those flags after Cleanup; it does not scan pixels or reconvert images to obtain
a wall count. Sampled walls start no additional full-resolution inspection.
Preview or explicit Reuse can inspect a missing full-source result; automatic
Preview work is canceled on close unless Reuse joined it.

Each live image retains only its current settings/source result, not a history
of settings or a cache of converted rasters. Changing relevant inputs invalidates
counts; unchanged idle/Original return does not. An incomplete animation retains
small frame-observation flags and a color union. Once all frames are seen, those
progress flags are replaced by the completed tiny color list/count. Repeat
playback adds no count publication or conversion in the tested cached clip.

Caching avoids repeated color inspection, but count publication, reactivity and caption
layout still cost CPU. A callback-only timer misses most of that cost. The A/B
harness therefore also records browser TaskDuration, ScriptDuration, layout,
style, long tasks, quantization counts and output hashes, with alternating runs.

## Performance investigation and implementation decision

The original implementation added roughly 100–115ms of total task CPU on the
phone's 100-image import/recolor stress fixture compared with metadata disabled.
That comparison keeps quantization unchanged. It is not the cost for a typical
small wall. Twelve-image runs showed no long tasks; the GIF's repeat playback and
idle showed no additional count publication/conversion. Both variants still have
substantial DOM/conversion costs at 100 images.

Two simpler alternatives did not establish a phone benefit: pruning-only and
plain SvelteMap without stable empty entries. The accepted fix uses SvelteMap
with one stable slot per live image. Invalidated live results become null;
removed images are deleted. This prevents missing-key reads from making every
caption subscribe to each refill, removes whole-map copies, and runs pruning
only on actual source/settings changes. Output and cancellation semantics stay
the same. The bounded alternatives stop here.

| 100-image median CPU | Original | Accepted fix | Interpretation |
|---|---:|---:|---|
| Android import, total task | 528.78ms | 480.56ms | 9.1% improvement; every pair improves |
| Android recolor, total task | 506.31ms | 502.03ms | Essentially tied |
| Android import, script | 137.73ms | 120.71ms | 12.4% improvement |
| Android recolor, script | 81.00ms | 61.25ms | 24.4% improvement |
| Desktop import, script | 43.91ms | 36.50ms | 16.9% improvement |
| Desktop recolor, script | 20.62ms | 15.09ms | 26.8% improvement |

Android has three alternating pairs; desktop has five. Every phone script pair
improves in both phases. Quantization remains 201 calls including the example;
first/last canvas hashes match before and after recolor in every pair. This is
not a universal FPS gain: 100-image phone walls still show long tasks and roughly
83–117ms frame gaps. Heap deltas are GC-sensitive, not a memory ceiling.

An initial granular test transformer accidentally left an undefined variable;
its errored measurements are retained with an invalid-transform label and are
excluded from acceptance. No production source used that broken transform.
Final candidate and production receipts require zero runtime errors.

## Final integrated acceptance

Fix commit: `a695bfc01ada85a9a6bdb378a489fd68fcabf4ff`. Tests ran the actual staged
tree `31052b673a190f64039399ad450234011f4d1128`, which became this commit, through
`.tmp/palette-landscape-final/dist` on port 5335. Index SHA256:
`fa48d37c48f411413c17aee896b74874db48200154f5a37d5625a71bf55877b1`.
This includes separately committed zoom/navigation work, while preserving and
excluding other tasks' uncommitted App and later viewer changes.

- Full isolated suite: **969 passed, 2 skipped, 63 files**. The two GC-dependent
  skips remain. The first sandboxed invocation could not rename Vitest temporary
  files; the host rerun completed. No app defect was inferred from that failure.
- Built desktop: **10/10**, including independent PNG/GIF decoding, full-animation
  union, used-palette reuse, Keep/Cleanup/dither, empty outputs, changed settings,
  module-held and actually running cancellation, and five toolbar layouts.
- Separate adversarial reviewer: **3/3** final-build lifecycle checks. Removed
  images cannot publish late drafts/counts; readding the same name uses new
  pixels; explicit Reuse survives joining and closing automatic Preview.
- Native Android: **7/7**, zero errors, both genuine OS landscapes, portrait
  return, Save/reference parity, Reuse, all controls, modal gestures and existing
  1-bit controls. Integrated Preview Zoom/Fit also received trusted-touch smoke
  checks. The twelve-sprite/GIF run observed no tasks above 50ms, maximum frame
  gap 33.5ms, p95 16.8ms. Rotation/storage/owned artifacts were restored.
- Codex Browser: owned upload, Auto→PICO-8, 13-color wall and Reuse draft,
  short-landscape/portrait controls, conditional dither strength (count becomes
  15), Reset (back to 13), and viewport restoration; no console errors.

Receipts and reproducible scripts are in
`bench/palette-count-overhead-2026-10-16/`,
`bench/palette-landscape-followup-2026-10-16/` and
`bench/palette-physical-landscape-2026-10-16/integration/`. Native captures and
Codex Browser screenshots are versioned alongside them. The independent source
proof verifies the integrated count block matches the accepted candidate.

## Review and remaining limits

Independent review covers count ownership, invalidation, cancellation, animation
union, final-output consistency, and the recent palette usability batch. The
reviewer also challenged the core palette/dither/alpha/export changes back to the
requested baseline, and passed 172 focused tests before final integration. Root
challenged caption clipping, callback-only performance accounting, candidate
page errors, missing-key fanout, cancellation ordering and overbroad performance
claims. The reviewer and performance/device agents agree on the final bounded
fix after these checks; no further actionable defect was found. No universal
performance or absence-of-bugs claim follows
from these fixtures. Mac/iOS remain untested. The inherited tiny-caption layout
is documented above; no new settings or color-selection algorithms are added.
