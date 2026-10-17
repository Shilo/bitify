# Desktop palette performance review

Immutable runtime source: `071ebd9`, archived by root to
`.tmp/performance-review-2026-10-16/`, built and served on localhost:5336.
Runs use an owned sandbox-enabled headless Edge 155, not the user's browser tabs.
Root's actual Codex Browser and the USB-device agent's receipts are separate.

## Accepted observations

- `desktop-results-v3.json`: corrected built-app twelve-sprite/GIF, 100-sprite,
  1MP high-entropy nearest/dither/cap/Cleanup/Original/idle workflows.
  `desktop.mjs` regenerates fixtures and `workflows.mjs` provides the portable
  device runner. The final runner scrolls an offscreen GIF into view; desktop
  previously had it visible already. Files are constructed before import timing.
- `output-validation.json`: four exact 1MP final canvas hashes match Node's
  separately executed committed production modules. This proves final-state
  equivalence, not an independent algorithm/aesthetic oracle.
- `count-integration-results.json`: **10/10** actual-built acceptance groups
  on final committed `5a77313` (`.tmp/palette-labels-final/dist`). Includes the
  Mulfok 32, Game Boy Green and Black & White labels, canonical Mulfok Save,
  independent PNG/GIF counts and reuse, Keep alpha, cap/matching/Cleanup/dither,
  zero outputs, mode changes, delayed/running cancellation and five toolbar
  widths. `final-label-qa.mjs` writes only this directory's receipts.
- `dither-candidate-results.json`: test-only cache, original 72-case/4,718,592-pixel
  equivalence cohort and async AbortError; initial unsteady async timings are
  exploratory only.
- `dither-final-checks-256.json`: nine additional 589,824-pixel boundary cases and
  warmed five-pair synchronous CPU comparisons including 256-color worst cases.
  The deliberately synchronous kernel calls do not model app responsiveness.
  Candidate rejected because supported 256-color cases consistently slow down.

`dither-final-checks.json` retains the earlier 64-color-only check. Its boundary
cases repeat those in `dither-final-checks-256.json`; do not double-count them.
`desktop-profile.json` and `desktop-results.json` are exploratory earlier runs
with weaker render readiness and upload transport included. They must not be
used as final app import timing. Root/device review identified those traps and
required the corrected harness. See the research report for limits.

## Reproduction

Requires the archived source/build and server described above plus the existing
local Playwright/Sharp tooling paths used elsewhere in this repository.

```text
node bench/desktop-performance-review-2026-10-16/desktop.mjs --fixtures-only
node bench/desktop-performance-review-2026-10-16/desktop.mjs
node bench/desktop-performance-review-2026-10-16/validate-outputs.mjs bench/desktop-performance-review-2026-10-16/desktop-results-v3.json
node bench/desktop-performance-review-2026-10-16/dither-ab.mjs
node bench/desktop-performance-review-2026-10-16/dither-final-checks.mjs
node bench/desktop-performance-review-2026-10-16/validate-outputs.mjs --side=896 bench/android-performance-review-2026-10-16/workflow-final-results.json
```

No code in `src/` is changed by these scripts. The sole candidate transforms
only the test server's palette-dither module. No production cache was added.
The large entropy PNGs are generated, ignored artifacts: the explicit first
command reconstructs both sizes from seed `0x352713` without opening a browser
or requiring a running app server. Run it before the Android workflow or output
validator on a fresh checkout. `final-label-qa.mjs` regenerates its own large,
transparent and animated cancellation fixtures, which are ignored too.

Android's `output-validation-896.json` is an **invalid canvas-readback oracle**,
retained to explain the discrepancy. Brave's controlled solid896canvas changes
228 readback bytes by ±1. This fingerprinting defense makes raw canvas SHA
comparison unsuitable there; use the device agent's native PNG Save oracle and
the final research report. No browser security setting is changed to pass a test.
