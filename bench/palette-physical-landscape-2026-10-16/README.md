# Actual Android OS landscape acceptance — October 16, 2026

Target: committed palette batch `9f3c213`, isolated `.tmp/palette-usability-final/dist`
served on port 5335. Its index SHA-256 is in `results.json`. Shared worktree zoom,
Aseprite and later changes are excluded from this first receipt.

`qa.mjs` connects only its own new Brave tab on the authorized USB Pixel 8 Pro.
It clears CDP device metrics, then uses `wm user-rotation lock 0/1/3` to rotate
the genuine Android display and compositor. Native `adb exec-out screencap -p`
captures are 1008×2244 portrait and 2244×1008 landscape. Browser inner dimensions
are 448×819 and 947×364 CSS pixels. Android display dumps confirm ROTATION_90 and
ROTATION_270. This closes the former virtual-viewport compositor gap. Automation
does not establish that a human physically turned the phone body or validate its
accelerometer sensor. Original policy `free`, accelerometer 1, user rotation 0
was restored; see each main result receipt.

## Functional result

All seven groups pass in `results.json`, with no page errors:

- Portrait → both landscapes → portrait with six Recolor controls: one visible
  control, at least 44 CSS-pixel targets, no control overflow. Landscape panel
  75.78 CSS pixels tall versus 129.78 in portrait.
- Actual trusted touch ranges, Matching, Cleanup, conditional Dither strength,
  Keep/Cut, abandoned draft cancellation and Reset.
- Native downloaded PNG versus independent Sharp decode and scalar nearest
  implementation: zero RGB or alpha mismatches. Reuse opens the same 13 RGBs in
  one tap, immediately after Copy in the wall Image actions sheet.
- Inside-field touch drag ending outside retains the editor; backdrop tap closes.
- Preview retains Save/Copy/Compare and returning retains the wall count.
- Existing 1-bit Cutout/Bayer controls survive real display rotations.
- Twelve sprites plus a GIF with repeated Matching changes: no task above 50ms
  in this bounded run, maximum rAF gap 25.1ms, p95 16.8ms. Larger walls are slower;
  this is not a general performance or battery guarantee.

The initial failed native Save receipt is preserved in
`initial-results-download-policy.json`: attached Playwright had intercepted
downloads. Restoring native `Browser.setDownloadBehavior(default)` in the harness
made the same app Save pass; no production change was involved.

## Caption readability challenge

Root challenged the tiny open-panel caption, prompting `caption-probe.mjs` and
eight baseline/current native screenshots. The pre-batch build is
`.tmp/palette-settings-compact/before-dist`, not the original October 14 baseline.

With the panel closed, both builds use a 194px-wide tile. Current complete
`24×24 · 13 colors` fits its approximately 100px text width. With the panel open,
baseline tiles shrink to 96px and current tiles to 98px: their text columns are
12.22px and 14.22px respectively, so even dimensions truncate. This is inherited
short-landscape tile behavior, not introduced by color counting. The previous
254px panel also covered most of the wall; the new 75.78px panel leaves it visible.
No document scroll, visual viewport offset or browser pinch zoom caused this.
`caption-probe.json` records actual geometry, fonts and screenshots. Any redesign
of this inherited tiny-tile tradeoff requires a separate layout decision.

## Metadata-only performance A/B

`count-ab.mjs` uses the performance agent's test-only instrumented builds.
`count-ab-results.json` has two alternating trials of 12 stills, 100 stills and a
128-frame GIF; `count-ab-cpu-results.json` has three 100-still CPU trial pairs.
No extra image conversion is caused by metadata; unchanged Original return and
idle do not republish counts; GIF repeat playback publishes zero additional counts.
Nevertheless publication, formatting and layout have measurable CPU overhead,
especially on 100-tile walls. Callback timing alone understates that cost.

`count-pruned-cpu-results.json` evaluates a test-only stale-metadata pruning
candidate, not a production implementation. The performance agent/root must
compare CPU and output hashes before accepting any change. These results do not
establish universal performance or lack of regressions.

The pruning-only candidate did not improve measured CPU. A second isolated
SvelteMap candidate removes per-publication whole-Map copying and cross-tile
reactivity. `count-granular-fixed-cpu-results.json` records three fresh alternating
100-tile trial pairs: all sampled canvas hashes match, no page errors. Map entries
copied fall 9,900→0 and stale-prune entries inspected 10,201→101 across import plus
Matching. Median phone task CPU is import 528.7→508.6ms and Matching
522.2→537.4ms. These noisy mixed timings establish no universal phone speedup.
The earlier invalid test transform raised `next is not defined`; its failed
receipt is retained in `count-granular-cpu-results-with-test-transform-errors.json`.
The transform was corrected and independently checked before the fresh receipt.

The final test-only `slots` candidate pre-creates a null slot for each live item,
avoiding reactive whole-map missing-key subscriptions on first publication.
`count-slots-cpu-results.json` has three alternating pairs with zero page errors
and identical sampled output hashes. Median 100-tile import task CPU is
528.8→480.6ms (each pair improved), Matching 506.3→502.0ms (essentially tied).
The measured improvement concerns this bounded import workload, not universal
frame rate, memory or battery behavior. Root decides production adoption after
the independent correctness/lifetime review and latest-build integration checks.

Only owned tabs/native download files are removed; original origin localStorage
is restored and no security preferences change. The shared user's browser stays
open. Harnesses never call `browser.close()` on the attached phone.

## Final integrated build

`integration/results.json` repeats all seven functional groups against staged
tree `31052b673a190f64039399ad450234011f4d1128` atop `5184a45`, including the final
slot metadata optimization and the separately committed Preview zoom changes.
The unrelated uncommitted App continuity edits are excluded. All seven groups
pass, zero page errors; native PNG has zero independent RGB/alpha mismatches,
Reuse has the same 13 colors, and trusted landscape Zoom in/Fit works. Real OS
orientation/screenshot evidence and restored policy are retained again in the
integration subfolder. This is the final integrated phone receipt rather than
merely the earlier palette-only build.
