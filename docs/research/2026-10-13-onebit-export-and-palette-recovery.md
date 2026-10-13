# 1-bit export scheduling and palette failure recovery — October 13, 2026

## Decision and review

Proceed with three bounded changes on main: yield between files in Save all; produce
and encode 1-bit animation frames sequentially; and own Max colors/Cleanup failures
per preview surface with persistent, explicit recovery. Claude accepted the hover
fix and the per-item/surface failure contract. Its Pixel measurements justified the
first export step; the second required measurements of the actual change.

The Codex reviewer challenged all three changes. It caught an initial analysis-object
clone that discarded cold Stencil/Icon preparation reuse: the final helper captures
published analysis references, while independently copying mutable scalar metadata
and style settings. Fresh-oracle tests verify first and repeated cold exports.
The reviewer also caught an extra mobile caption grid row: Retry needed now belongs
to the existing dimensions line. Final source and bounded acceptance results were
accepted; no blocking ownership, cancellation or stale-publication issue was found.
This is agreement on this batch, not a completed whole-project optimization audit.

## Changes

- `6ae364a`: Save all gives input/rendering a posted-task turn between files. Ordering,
  captured selection/settings and atomic ZIP download remain intact. No extra batch
  turn for a single file; a later failure never downloads a partial ZIP.
- `8cd02d6`: 1-bit GIF exports capture metadata/analysis identities at the gesture,
  produce one mask and compress it, then yield when the frame group reaches 8 ms.
  Mask work, None remapping, growth and LZW all count toward that budget. Output
  starts at 1 KiB and grows; no clip-wide mask/worst-case-output reservation.
  Stills, first-frame PNG Copy and palette export retain their existing paths.
- Palette recovery: failures belong to each surface, stage, inputs and attempt.
  Same-item pixels remain with a caption marker and persistent Dock/viewer Retry.
  Affected Save, Copy, Share and drag requests are gated; batches gate any failure.
  Retry targets failed stages and retains gates until success. Successful viewer
  preparation cannot clear a wall failure. Healthy notifications do not invalidate
  app state; teardown releases its own records. There is no automatic retry loop.

## Actual-build testing and provenance

Baseline is `18f8dd2`, entry `index-C7XduU8J.js` (87.42 kB gzip). The final build has
`index-WlghnZjS.js` (88.99 kB gzip), SHA256
`822099401bcb15903c798cada4d3afcdf9612bb995dc064b9819c6f30310831c`.
The phone's repeated A/B export run used `index-kJzRYTSm.js`, before the final caption
markup repair; the A/B export implementation is identical. Final phone and Codex
failure acceptance use the final WlghnZjS entry/hash. The final desktop export run
also uses WlghnZjS. Build manifests are checked before/after export acceptance.

Retained reproducible harnesses:

- `bench/onebit-export-qa-server.mjs` and `.html`: actual baseline/candidate builds,
  native browser UI paths, captured blobs, posted-task timings, ZIP entry SHA256.
  Real fixtures under `.tmp/auto64-ui-20261012/build/fixtures` are deliberately
  untracked user assets. It requires `.tmp/onebit-recovery/site/{base,candidate}`.
- `bench/palette-failure-qa-server.mjs` and `.html`: actual dist build with fault
  injection confined to the loopback diagnostic origin. Real workers otherwise
  operate normally. No production source transform, downloads or clipboard changes.

The physical device was Pixel 8 Pro, Android 17, Brave 155, via explicitly authorized
USB/ADB. Reduced UA reports Android 10; that is not the actual OS. The iframe viewport
was 424×720 at DPR 2.25. Foreground visibility and wakefulness were maintained during
measurements. Separate touch-event checks on the standalone phone page used 448×923:
settings open, failed retained user building preview, settings close, persistent Retry
and restored Save all passed. A CDP-created Android tab that was not being drawn was
excluded; the successful touch check opened through an Android foreground intent.

## Pixel measurements

Three exports per case/build, except captured-settings (one). Longest task means a
Long Tasks entry at least 50 ms; zero is not zero work or a universal latency promise.

| Case | Baseline total ms | Changed total ms | Baseline longest task ms | Changed longest task ms |
| --- | --- | --- | --- | --- |
| Cutout dungeon, 56 frames, 512×458 | 634–679 | 681–704 | 350–367 | none ≥50 |
| Cutout real wall, 17 GIFs + 6 buildings, 278 frames | 905–1005 | 927–962 | 358–363 | none ≥50 |
| Cutout twelve 1024×1024 stills | 705–783 | 715–804 | 654–730 | 65–96 |
| Bayer dungeon | 379–401 | 406–427 | 225–232 | none ≥50 |
| First ink None dungeon | 785–790 | 846–876 | 368–377 | none ≥50 |
| Second ink None dungeon | 770–846 | 846–859 | 363–425 | none ≥50 |
| Change Cutout to Solid after export capture | 658 | 713 | 361 | none ≥50 |

This is responsiveness and transient-allocation improvement, not a throughput win.
Some GIF totals increase modestly from scheduling. Still PNG/mask work remains
synchronous per file. Desktop sustained CPU timings are unstable on this machine:
final desktop tasks improve but some individual frames still produce 70–82 ms tasks,
and a large still reaches 336 ms. Do not extrapolate the Pixel fixtures to all devices.

## Correctness evidence

Final full suite: 49 files, **741 passed**, two known explicit-GC skips. Running the
worker-client suites with `--execArgv=--expose-gc` gives **41 passed, zero skipped**.
Production build and diff whitespace checks pass. The full source suite includes all
11 styles, both None roles, loop variants, fresh cold Icon/Stencil preparation,
captured replacement/mutation, growth, cancellation before/after masks/compression
and atomic batch failure. These are meaningful finite tests, not exhaustive inputs.

Both native Codex export runs and the phone run pass all seven baseline/candidate
cases, repeated SHA256/ZIP-entry identity and captured-settings isolation. Independent
Pillow validation decoded **120 representative files / 1710 frames**, including the
final desktop run: dimensions, frame counts, clamped source delays, loop metadata,
binary alpha, exact source-alpha fidelity when neither ink is None, visible ink
membership and baseline byte equality pass. Repeat exports were also compared by
content hash. None-role alpha is checked against compatible baseline output, because
None intentionally removes additional source-visible pixels.

Both desktop and physical-phone recovery harnesses pass 11 checks: independent
failures and persistent gates; failed-only retry with partial recovery; unrelated
import/retained pixels; Cleanup change preserving a limiter failure; Share Save/Copy;
forced buttons and first-item keyboard Copy; independent wall/viewer ownership and
modal Retry without dismissal; cleanup failure/recovery; unchanged cap recommit;
1-bit bypass; overflow/runtime-error/idle observer checks. Physical failed captions
remain 52 px with two children. One-second settling before counting worker starts
prevents queued healthy initial jobs being mistaken for redundant retry work.

Desktop recorded five finite existing ResizeObserver notifications during layout
transitions, none continuing during the final 2.5-second idle window; phone recorded
zero. Historical QA already categorizes this warning separately. No evidence here
justifies changing observer scheduling or claiming an ongoing F3 loop.

Local detailed evidence (ignored): `.tmp/onebit-recovery/results/desktop-1791887999952`,
`desktop-1791889004023`, `phone-1791888796697`, `failure-results/{desktop,phone}.json`,
`independent-decode.json` and `proof/`. The result files distinguish build hashes,
case and physical/emulated environments. Tracked harnesses are manual browser gates,
not automatically executed by npm test.

## Remaining limits and next review

No change to live 1-bit reanalysis (CXS-02); measure on the phone before designing it.
Individual huge masks/LZW calls, cold structural prep, PNG encoding and final output
copy cannot be preempted; the 8 ms budget is cooperative, not a hard task ceiling.
ZIP assembly remains synchronous. Whole-app source/analysis memory is unchanged;
this batch removes eager output masks and worst-case GIF allocation only.

Naturally occurring worker faults, viewer-only failure teardown and an already
captured export followed by a new surface failure were not exercised by this browser
harness; ownership/cancellation unit tests and source review support those boundaries.
Native OS drag-and-drop after failure is source-guarded but not driven end-to-end here.
No Safari/iOS, hidden-tab timing, multi-hour soak or arbitrary oversized-frame guarantee.
Ask Claude to independently challenge these commits and retest the stated boundaries,
then measure CXS-02 before proposing another performance change.
