# Practical sprite workloads — October 16, 2026

## Decision and scope

The accepted desktop cohort has not reproduced a production performance or output
defect. Do not optimize a hypothetical 100-image workload or change the matching,
Auto, Keep or dithering algorithms from this evidence. All five final USB Android
cases also pass without a reproduced production performance or output defect.

The user means large individual **sprite sheets**, rather than office spreadsheets.
The cohort contains eight distinct retained Kenney CC0 sprites (16–24 pixels), one
genuine artist-authored 32-pixel effect sequence transformed into a six-frame GIF,
1024/2048-pixel sparse sprite sheets assembled from those sprites, and owned
128-pixel/32-frame and 256-pixel/48-frame motion GIF assemblies. The motion clips
are not genuine walk-cycle animations. The magic GIF thresholds source alpha and
uses assigned timing because the original author gave no durations. All comparisons
use the decoded fixture as input, including these stated transformations. Original
sources, licenses, archive hashes, frame hashes and assembly recipes remain in
[the manifest](../../bench/practical-workloads-2026-10-16/manifest.json).

These are low-color pixel-art workloads, with transparent sheet gutters. They do
not establish worst-case performance for dense high-color photographs, large soft
effects, unbounded animation lengths or all phone models.

## App checks and accuracy

Each case exercises actual file import, initial sampled-wall readiness, native
Save/Save all, rapid matching/cap changes followed by RGB/8 colors/Cleanup/4×4
dithering, another native Save, Preview zoom/Original/Fit/close and wall return.
Animated cases additionally measure converted playback during two source-loop
durations and require at least one fresh observed cycle. Idle periods record
background work. File serialization/allocation is staged before import timing.

Readiness observes each displayed canvas painting. Large sheets legitimately use
sampled walls and need not publish full-source color counts. The final-settings
gate observes a paint after the **last** dither selection, avoiding acceptance of
an intermediate RGB paint. Converted playback can be slower than the source;
two source-loop durations are an observation window, not a promise of two loops.
Offscreen animation pause is intentional and is distinguished from frozen visible
playback before applying the progress gate.

Native PNG/GIF/ZIP files are decoded independently using Sharp, without relying
on browser canvas readback. Every visible RGB byte and alpha byte must match.
Hidden RGB below alpha zero is ignored. Dimensions, frame count, delays and loop
are checked. Default nearest matching uses a separate scalar Oklab implementation.
For cap/Cleanup/dither, the browser's native output is compared to committed core
modules outside the browser, with additional independent alpha/palette-membership
checks. That checks integration and captured settings; it is not an independent
proof of those algorithms or aesthetic superiority.

The strengthened baseline desktop run at `7ed49fd` passed all five cases, with
26 decoded image entries and **17,843,592 pixels**, zero visible RGB/alpha
mismatches, correct GIF timing/loop and no uncaught page errors.

## Desktop measurements

Sandboxed Edge, 1280×900, renderer main-thread CPU in milliseconds:

| Case | Initial wall | Nearest Save | Final-settings interaction | Enhanced Save | Largest Long Task |
|---|---:|---:|---:|---:|---:|
| Eight sprites + genuine effect GIF | 28.0 | 44.4 | 88.6 | 25.0 | None ≥50 ms |
| 1024 sheet | 35.2 | 58.2 | 98.3 | 32.1 | None ≥50 ms |
| 128 GIF, 32 frames | 17.9 | 34.4 | 63.8 | 24.2 | None ≥50 ms |
| 2048 sheet | 41.7 | 96.7 | 124.4 | 113.1 | None ≥50 ms |
| 256 GIF, 48 frames | 34.5 | 92.5 | 74.9 | 79.9 | None ≥50 ms |

Thirty-three stages had no Long Task at least 50 ms. CPU accumulated across posted
tasks is not one uninterrupted stall. Workers are excluded from renderer CPU;
elapsed stages also include UI automation, native download completion or deliberate
observation periods. These are observations, not strict latency budgets. JS heap
deltas do not bound whole-process native/canvas/image memory.

[Raw desktop receipt](../../bench/practical-workloads-2026-10-16/desktop-results.json)
and per-case native exports/screenshots are retained beside it.

## Harness challenges and bounded corrections

An independent reviewer rejected cumulative canvas-paint counts as proof of
animation progress and rejected a settings gate that could stop at an earlier RGB
paint. Both were corrected before accepted desktop/phone results. The playback
window was renamed to describe two **source** durations accurately.

Review then caught duplicate init-script instrumentation when the same
attached page was reused across cases. That could multiply observers, rAF loops
and paint counters. The instrumentation is now idempotent per document, with a
[regression self-check](../../bench/practical-workloads-2026-10-16/instrumentation-selfcheck.json).
Affected multi-case Android timing/progress receipts are superseded; native file
accuracy from them remains valid. Final device cases use fresh processes/pages.

No production source was changed for these test-harness corrections. No new cache,
algorithm, setting or speculative optimization is justified by the accepted
desktop results.

## Final USB Android results

The authorized Pixel 8 Pro ran native Brave at its real 448×819 CSS viewport,
without CDP viewport emulation, against isolated `62dc29c` on port 5342. Every
case used a fresh process/page and the idempotent instrumentation. The accepted
[`receipt-{kind}.json` files](../../bench/android-theme-practical-2026-10-16/workloads/)
supersede the earlier multi-case `receipt.json` for timing and progress claims.
Native downloads—not intercepted canvas exports—were pulled and decoded.

| Case | Initial wall CPU | Nearest Save CPU | Final-settings CPU | Enhanced Save CPU | Largest Long Task |
|---|---:|---:|---:|---:|---:|
| Eight sprites + genuine effect GIF | 98.2 ms | 209.5 ms | 416.6 ms | 150.1 ms | None ≥50 ms |
| 1024 sheet | 71.8 ms | 209.7 ms | 464.9 ms | 156.3 ms | None ≥50 ms |
| 128 GIF, 32 frames | 57.9 ms | 147.3 ms | 311.9 ms | 123.6 ms | None ≥50 ms |
| 2048 sheet | 104.0 ms | 329.7 ms | 499.2 ms | 216.0 ms | None ≥50 ms |
| 256 GIF, 48 frames | 57.3 ms | 286.3 ms | 312.2 ms | 259.2 ms | None ≥50 ms |

All 26 native output entries, again totaling 17,843,592 pixels, match their exact
oracles, with zero visible RGB/alpha mismatches, correct frame delays/loop and no
uncaught page errors. No measured stage had a Long Task at least 50 ms. The table
reports aggregate renderer CPU across task slices; the roughly 499 ms interaction
also includes many deliberate control changes and is not a 499 ms blocked task.

The phone's rAF 95th-percentile gap was approximately 17 ms in every phase.
One 2048-sheet Preview interaction had a roughly 58 ms maximum gap; that case's
settings interaction reached 42 ms, with other maxima smaller. Absence of a
50 ms Long Task does **not** mean zero dropped frames or zero GPU/native memory
cost. These isolated gaps during automated interactions do not establish a
sustained practical stall or justify a speculative source optimization.

As an end-to-end sanity check, the measured import event to first sampled-wall
paint took about 178–331 ms. Native download stages completed in about 1.0–1.6 s,
including the phone download manager, polling delay and ADB file retrieval. Those
elapsed values include test transport/observation overhead after the gesture;
they are not pure conversion times. No case hid a tens-of-seconds worker wait
behind its main-thread CPU total.

The ninth batch GIF initially appeared not to advance because it was below the
scroll viewport: IntersectionObserver reported `false`, ratio zero. Bringing it
into view yielded 15 fresh paints over the observation window (six source frames).
The 32/48-frame clips yielded 65/96 fresh paints. This confirms intended offscreen
pause rather than a playback bug. An additional native Original check on the
48-frame clip recorded 50 fresh paints in 4570 ms, independently of converted
readiness. Closing Preview and returning to the wall remained functional.

## Auto and Codex Browser supplements

The independent reviewer added a bounded 2048-sheet default-Auto check on the
final isolated build. Publication is checked through the enabled palette editor.
When closing the palette rail changes sampled dimensions, a fresh paint is
required before timing ends. If dimensions stay unchanged, a healthy retained
cache hit need not repaint: that measurement proves publication plus an observed
wall paint, rather than a fresh post-publication conversion. The generated
37-color palette is read from the editor in its original order. Auto and subsequent
Resurrect 64 native saves both match independent scalar nearest matching against
their actual palette, with all 8,388,608 pixels and alpha bytes checked.

The final desktop Auto stage used about 122.9 ms renderer CPU, including import,
generation publication, panel interaction and the current converted paint—not
pure generation time. This is one observation, not a speedup or memory bound.
[Auto receipt](../../bench/practical-challenge-2026-10-16/auto-desktop/results.json).

The corrected native Android Auto supplement also passed: 37 published colors,
then Auto and Resurrect 64 2048-pixel native PNGs with zero visible RGB/alpha
mismatches against independent scalar matching. Its import/publication/layout
stage used about 276.0 ms renderer CPU. Sampled dimensions did not change on
rail close, so this timing is **not** a fresh post-publication wall-latency claim.
An earlier helper incorrectly required a new paint despite an unchanged healthy
cache and timed out; that benchmark gate was corrected, its failure retained,
and one corrected run passed. This was not a reproduced application freeze.
[Native Android Auto receipt](../../bench/android-theme-practical-2026-10-16/auto2048/results.json).

Root also used the actual Codex Browser for the distinct small batch, 2048 sheet
and 48-frame animation, including Preview and real native downloads. Its separate
receipts and scalar native-output verification are retained in
[the Codex evidence directory](../../bench/practical-theme-root-2026-10-16/).
Those checks complement the sandboxed Edge timings; they are not the same browser
session or a CDP substitute for the requested Codex surface.

The remaining genuine limitation is coverage, not a reproduced defect: this
bounded low-color cohort cannot prove all future large/soft/dense artwork or
unbounded clips will be fast. Further optimization should follow a specific
representative failure. The separate Android forced-dark investigation is in
[the theme diagnosis](2026-10-16-android-theme-diagnosis.md).

The full native workload matrix and Auto receipts identify their actual build,
`62dc29c`. The subsequent `db39123` fix changes only decorative 1-bit color
swatches, not import, quantization, limiting, Cleanup or export. Its separate
native light/dark checks, unchanged native exports and full 982-passed/2-skipped
suite are recorded with the theme validation. The five-case timing matrix is
not presented as a rerun on that later UI-only commit.
