# Slider reanalysis review resolution

The performance/stability review batch is closed after fixing Claude's reproduced
R-2 regression. The baseline is `ebf5cac`, which includes the separate Colorfetti
branding commit. Both baseline and candidate are ordinary production builds;
instrumentation is injected only by the tracked QA server, never into production.

## Decision and challenge

Claude correctly identified an ordinary sequence: select G Brightness, then begin
dragging Threshold while replacement analyses are pending. Reactive-effect cleanup
aborted that work on drag start, and heavy replacement work waited until release.
The retained picture was correct but stopped responding during the drag.

The review subagent challenged the repair before implementation and accepted the
actual App diff afterward. Keep one non-reactive request record for captured wall
identity, empty-wall example, Brightness and normalized relevant Opacity cut.
Retain identical work before applying drag deferral. Cancel when its inputs or
family change, or on teardown. Keep a settled failure until its inputs change so
drag events cannot create an automatic retry loop. Successful atomic publication
changes wall/example identity and retires the old record. Existing publication
guards and independently captured exports remain intact.

No pixel kernel, worker protocol, palette algorithm, cache, export or UI design
change is needed. Conditional Svelte dependencies are safe: genuine input changes
read current dragging before starting a new job, while an existing job continues.

## Actual-build evidence

`bench/live-reanalysis-qa.html` now has **Run slider race checks**. Its server accepts
a diagnostic root as its third CLI argument. Run with separate built directories:
`node bench/live-reanalysis-qa-server.mjs 5286 .tmp/slider-race`.
The checks are manual browser acceptance checks, not part of `npm test`.

| Check | Codex browser | Pixel 8 Pro, Brave 155 |
| --- | --- | --- |
| Held source pass, two 1024-square stills, sustained Threshold inputs | Baseline 0 paints, candidate 2 during drag | Baseline 0, candidate 2 |
| Final Threshold output against fresh G/120 selection | Exact exported entry hashes | Exact exported entry hashes |
| Relevant opacity changes cancel old pass and defer new work | Passed; exact fresh G/cut200 export | Passed; exact fresh export |
| Failed source preparation followed by unrelated dragging | One failure, no retry | One failure, no retry |

The held posted-task boundary makes the race deterministic. Those rows use synthetic
DOM input, which is distinct from actual touch input. A separate top-level app tab
on the physical phone used native CDP touchStart/move/end events for 25 moving steps:

- Threshold: canvas paints rose from 6 to 58 while the finger remained down. The
  source pass finished rather than waiting for release.
- Opacity cut: posted analysis count stayed at 1 during movement, then settled at
  the new cut after release. This deliberately retains the previous picture while
  continuously changing analysis inputs; it is the intended heavy-work deferral.
- Phone CSS viewport and document width were both 448px; no horizontal overflow,
  and no runtime errors. Screenshots and results are under `.tmp/slider-race/phone/`.

The Codex browser also reran the existing edge checks (mounted viewer retention,
Original playback during pending GIF analysis, resumed converted GIF, remove-all,
example recovery, subsequent import and one-shot failure/source recovery).
The bounded main acceptance run used two alternating changes per build on the real
23-asset wall (17 GIFs, six buildings, 278 animation/image frames), twelve 1MP stills
and four 4MP stills. It also verified A/B/A cancellation, captured-source exports,
image removal, family switching and same-source no-reanalysis controls. All passed
with exact baseline/candidate exported content.

## Verification and limits

774 tests passed, two ordinary GC skips; explicit GC passed all 41 client tests.
Build passed, main bundle 88.30 → 88.40 kB gzip on the same branding baseline.
After the separate `7bca403` Help-wording commit arrived, an isolated clean export
with only this repair was tested again: 774 passed/two skips, build 88.39 kB gzip,
and the four Codex browser slider checks passed again. Concurrent uncommitted file
and storage renames belong to the other chat and are excluded from this commit
and this review's correctness claim.
Independent Pillow decoding of the new main-run captures verified 42 files and
297 frames: source dimensions, frame counts, delays, loop, alpha and two-ink
membership. Exact archive-entry parity additionally covers captured export settings.

The first harness attempt had a malformed injected storage object; this was fixed
by serializing an actual object and parsing the returned inline scripts. A native
touch script initially omitted a serialized argument; its corrected run passed.
These were diagnostic errors, not production failures. Only passing corrected runs
support the conclusions. Build identities and raw results are saved under
`.tmp/slider-race/results/`; the desktop proof is `.tmp/slider-race/desktop-race.png`.

No new speed claim is made from this iframe harness: its Long Tasks attribution and
host sustained CPU timing limitations remain as documented in the previous review.
Large individual frame analysis and ordinary publication redraws can still exceed
50ms. This small scheduling repair does not promise a universal task bound.
Whole-app heap measurement, Safari/iOS, hidden-tab timing and native clipboard
permissions remain unmeasured, not implied successes.

Claude's three smaller reading observations are accepted tradeoffs: imports restart
captured-wall preparation to preserve membership correctness; a newly opened viewer
may await its first current conversion; Auto readouts stay paired with retained
analysis until publication. None warrants a new architecture or open review loop.
The agreed performance batches, including R-2, are resolved. Any future optimization
should start from a new reproducible user impact rather than repeat this audit.
