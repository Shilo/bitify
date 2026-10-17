# Color-count overhead investigation — October 16, 2026

This folder owns test-only variants and measurements. It does not modify the
application source. The reference is `.tmp/palette-usability-final`, whose source
comparison is recorded in the preceding palette-usability acceptance folder.
The measurements cover the closed wall, not the other task's new Preview zoom.

## What the application actually does

- Quantization already produces `used[256]`. Exact-size wall previews report that
  metadata after Cleanup; counts introduce no additional pixel traversal or
  source conversion. Larger sampled/draft walls intentionally have no count.
- Each new exact animation frame unions at most 256 flags/RGB values. Until all
  frames are seen, only a byte/frame plus at most 256 RGB entries is retained.
  Completion discards that progress and retains colors/count/frame-number only.
- Completed stills and clips reject subsequent duplicate reports. Original/return,
  playback repeats and idle do not publish new counts or start conversions.
- A changed actual source or conversion setting invalidates its count. Auto's
  shared palette legitimately changes when the captured wall changes; fixed
  palettes do not invalidate unchanged items merely because another is added.
- Sampled images get full-resolution counting only when Preview opens or Reuse
  is requested. Both share one inspection. Closing Preview aborts its automatic
  work unless explicit Reuse joined it. This exact inspection can be expensive
  for a large clip, but is cancellable and keeps no second converted-frame cache.
- Counts are not free: the original immutable Map publication copied existing entries
  and notifies caption consumers; its prune effect also iterates records after
  publication. At 100 stills/import + one matching change this copied 9,900 Map
  entries and runs about 205 prune passes. Caption text/DOM/layout has additional
  cost outside the tiny synchronous aggregation callback.

## Reproduce

Recreate the original isolated source before running the transforms (PowerShell,
from repository root; the destination is an owned scratch directory):

```powershell
New-Item -ItemType Directory -Force .tmp/palette-usability-final | Out-Null
git archive --format=tar -o .tmp/palette-usability-final/snapshot.tar 4983212633706b88145a59081657b920632cd514
tar -xf .tmp/palette-usability-final/snapshot.tar -C .tmp/palette-usability-final
```

1. `node bench/palette-count-overhead-2026-10-16/build-variants.mjs`
2. `node bench/palette-count-overhead-2026-10-16/desktop.mjs`
3. `node bench/palette-count-overhead-2026-10-16/desktop-followup.mjs`
4. `node bench/palette-count-overhead-2026-10-16/desktop-candidate.mjs slots`

The isolated source archive must exist. Builds and generated large correctness
fixtures are not committed. Owned 16×16 PNG and 128-frame GIF inputs are included.
Browser launches retain Chromium's sandbox. Full acceptance uses the copied
existing `correctness.mjs` with `AUDIT_DIST` pointing to an uninstrumented `*-qa`
variant. This test copy writes only here, preserving earlier acceptance receipts.

For physical Android, the phone owner imports `runCase` from `cases.mjs`, starts
`server.mjs`, reverses port 5364 and visits `/enabled/`, `/disabled/` or a candidate.
Use a new owned tab, restore test-origin storage, close owned tabs and restore OS
rotation. There is no device-metrics/orientation emulation in the new phone runs.
Phone receipts live in `../palette-physical-landscape-2026-10-16/`.

## Interpretation and gates

The disabled variant returns only from metadata aggregation; source conversion
and unrelated UI remain unchanged. Each fresh browser page has independent state.
Alternating run order reduces warm-up/order bias. Phase wall-clock times include
fixed waits and automation; they are not conversion CPU. CDP `TaskDuration`,
`ScriptDuration`, `LayoutDuration` and `RecalcStyleDuration` are reported separately.
Heap deltas contain GC noise. No universal FPS, zero-overhead or whole-app memory
claim follows from these bounded measurements.

`desktop-results.json` has three enabled/disabled trials for 12 and 100 stills and
one 128-frame GIF. The GIF has exactly 128 source conversions and 128 first-pass
publications; repeats have zero conversions/publications in enabled mode and zero
conversions in disabled mode. 100-still import and matching have identical source
conversion counts in all variants (100 + 100, plus the initial demo).

`desktop-followup-results.json` has five 100-still CPU trial pairs. Median enabled
versus disabled TaskDuration: import 145.36/121.32 ms, matching 118.76/80.97 ms.
Those differences include useful caption DOM/layout, not just counting loops.
First/last rendered canvas SHA256s match between variants before/after RGB matching.
Phone three-pair follow-up medians were import 511.59/396.81 ms and matching
501.04/400.96 ms. This is a real stress cost; callback-only timing understates it.
Both phone variants also have existing import long tasks.

## Bounded candidates

- `pruned`: only untrack Map reading in the pruning effect. Fewer scans, but no
  measured phone improvement. Not a sufficient fix on its own.
- `granular`: SvelteMap per-item records and pruning only on source/settings
  changes. Corrected candidate passes 10/10 built-app checks and independent
  removal/cancellation/sharing checks, but whole-task phone results are mixed.
- `slots`: one final candidate retaining a known-null slot per live item so
  missing-key lookups do not subscribe to global Map version during every refill.
  Only removed IDs are deleted; obsolete jobs still abort. Preview close clears
  its own pending slot and explicit Reuse ownership stays intact. Its focused
  10/10 correctness receipt is `count-results.json`; independent ownership checks
  are in `../palette-landscape-followup-2026-10-16/stale-review-slots-results.json`.

An initial granular **test transformer** made an overly broad replacement and
caused `next is not defined`; it never touched production source. Its receipt is
preserved as `desktop-granular-invalid-transform-results.json` and the phone's
`count-granular-cpu-results-with-test-transform-errors.json`. These are failed
candidate evidence, not acceptance. The corrected pure transformer is now scoped
to the exact count block with strict anchors, and candidate runs assert zero
page errors before accepting output equivalence.

Final desktop stable-slot five-pair medians: TaskDuration import 140.07→131.43 ms,
matching 107.23→108.04 ms; ScriptDuration 43.91→36.50 ms and 20.62→15.09 ms.
No long tasks occurred in those phases; output SHA256s match; quantization counts
are unchanged. Source-key pruning runs about 4 times rather than 205, and no
immutable Map entries are copied. Whole-task matching is effectively unchanged,
so this is not a broad rendering-speed claim.

The final physical Android three-pair receipt is
`../palette-physical-landscape-2026-10-16/count-slots-cpu-results.json`.
ScriptDuration import 137.73→120.71 ms (−12.4%) and matching 81.00→61.25 ms
(−24.4%); every paired script measurement improves in both phases. TaskDuration
import 528.78→480.56 ms (−9.1%, every pair improves), matching 506.31→502.03 ms
(effectively unchanged). Zero page errors; first/last rendered canvas SHA256s
match in all three pairs before and after matching. Existing source conversion
counts remain 201 including the demo, and Original/idle remain zero publications
and zero new conversions. Both original and candidate still show long import
and matching tasks and frame gaps of roughly 83–117 ms in this 100-asset stress
case. The optimization reduces metadata scripting; it does not solve all bulk
import/DOM/layout cost or guarantee smoothness for arbitrary walls.

Decision: recommend the final stable-slot candidate, with the orchestrator's final
production-snapshot desktop/Android/browser regression gate before shipping.
Reject prune-only and plain granular alternatives as insufficiently supported by
phone timings. No further architecture candidates are planned in this review.

## Integrated production snapshot

`count-integration-results.json`: 10/10 built-app checks, zero runtime errors, on
`.tmp/palette-landscape-final/dist` (including the separately committed Preview
zoom/navigation work). Index SHA256:
`fa48d37c48f411413c17aee896b74874db48200154f5a37d5625a71bf55877b1`.
Source tree: `31052b673a190f64039399ad450234011f4d1128`.

`integration-source-proof.json` independently compares the production count
ownership block with the accepted stable-slot candidate, ignoring comments and
whitespace only. They match exactly; the other task's uncommitted Auto guard is
excluded. The integration harness scopes existing Save/Copy/Compare checks to the
Image actions group, allowing the independently committed zoom group. No count
or Reuse control was added to Preview. Independent source review accepts the
integrated metadata implementation with the performance limits above.
