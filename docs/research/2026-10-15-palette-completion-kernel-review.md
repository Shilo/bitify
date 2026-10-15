# Palette completion: independent kernel and export review

October 15, 2026. Review base: `f08d4d3f6e3df771d17524f00f1bba2e492c4ec0`.
Initial reviewed HEAD: `cf72fe5`. This is an independent read/test pass; earlier
audit conclusions were treated as claims to check. No production fix is justified
by this review's current evidence. Physical Android, macOS and iOS were explicitly
not used in this pass. The coordinating reviewer owns new Codex Browser evidence.
The reviewed production `src` tree is
`2d5311edd204c7a3be651e7aa4c185e73add8c53` (also present at `bbff77f`).

## Scope and source trace

The production diff contains 37 files, with 1,474 additions and 94 deletions.
The main behavioral additions are ordered dithering, Keep opacity, explicit
Count/Use, two curated presets, Lospec routing and native PNG precision handling.
The reviewer read CLAUDE.md, the relevant current design-spec sections and the
performance contract before assessing the paths.

| Path | What was challenged |
|---|---|
| `src/lib/quantize.js`, `palette-dither.js` | Exact palette hits, both metrics, four-candidate tie order, Bayer phase, realizable occupancy, alpha eligibility, allocation bounds, cooperative cancellation |
| `src/lib/palette-state.js:42` | Scalar/source captures before yielding; Keep preparation cut1 consistently forwarded to subset/Cleanup; independent snapshot values for dithering and alpha |
| `src/lib/palette-animation-cache.js:27` | Alpha/dither identity, extra alpha-byte reservation, consumer cancellation and result-policy checks |
| `src/lib/save.js:106`, `gif.js:129` | Indexed/RGBA PNG boundary, exact positive-alpha RGB, GIF preflight/replay validation, complete-batch-only ZIP download |
| `src/lib/image-decode.js:5` | Proven native packed sRGB gate, all-null Firefox metadata fallback, explicit managed copy for other metadata, transforms/layout checks and closure on cancellation/errors |
| `src/App.svelte:692`, `palette-usage.js` | Captured full conversion, whole-animation union, generated request identity, stale results and editor draft ownership |

The Auto, subset and Cleanup fitting cores and their worker clients/protocols have
no production diff against this review base. That does not prove those algorithms
globally optimal. It establishes that the newly added Keep path consistently
reuses their existing alpha-positive eligibility. Sharing a Cut1 preparation with
Keep is correct under the retained **unweighted** policy; their final conversion
and animation-cache identity still distinguish alpha preservation.

## New independent tests

Reproduce:

```
node bench/palette-completion-audit/kernel/independent-check.mjs
```

The oracle independently implements sRGB linearization, published Oklab matrices,
candidate sorting, mixture objective and explicit 2/4/8 Bayer matrices. Expected
RGBA is constructed without the application's colorize/export-table helpers.
Sharp independently decodes the actual PNG bytes. This checks implementation
agreement with the specified bounded heuristic, **not** whether that heuristic
looks best for every artwork or searches the global optimal pair.

Retained [results](../../bench/palette-completion-audit/kernel/independent-results.json):

- 80 deterministic randomized cases: target sizes 1/2/8/64/256, both metrics,
  Cut/Keep, and Off/2×2/4×4/8×8 at strength73.
- 68,080 converted pixels; 9,120 independently calculated labels agree exactly.
- All 80 sync/async conversions agree; reduced previews equal the same coordinates
  in full-size output, including original alpha and Bayer phase.
- All 80 synchronous/asynchronous PNG byte streams agree; independent decoding
  preserves every positive-alpha RGB and alpha byte. Fully transparent RGB is
  ignored because indexed PNGs may retain a table entry under alpha zero.
- 120 actual historical-base comparisons retain byte-identical nearest/default
  and enabled-but-zero-strength output across cut1/128/255 and both metrics.
  Historical quantize source is read directly from Git, rather than approximated.
- Partial-alpha GIF fails both at preflight and when a replay source changes after
  preflight. Inconsistent empty-index/alpha buffers fail PNG encoding explicitly.
- Every input buffer hash remains unchanged.

An initial oracle assertion incorrectly expected zero RGB under indexed empty
pixels. It was corrected to ignore **only alpha-zero RGB**; alpha and all visible
RGB remain exact. This was a harness issue, not a production defect.

Focused Vitest run: **11 files / 196 tests passed** (`palette-alpha`,
`palette-dither`, `palette-dither-state`, `palette-animation-cache`, `palette-state`,
`palette-export`, `palette-usage`, `image-decode`, `image-import-client`, `save`,
`gif`). Existing tests complement the independent oracle with stale snapshots,
cancellation, cache subscribers, native metadata/profile/copy failures and ZIP
atomicity. The orchestrator owns the final complete-suite/build receipts.

## Research and performance challenge

The retained manifest bytes were independently rehashed: all 18 important-color
fixtures and all 59 Keep real-art files match their manifests. See
[hash receipt](../../bench/palette-completion-audit/kernel/provenance-hash-check.json).
This verifies retained inputs, not the entirety of the upstream license history.

The closed decisions honestly retain adverse cases: automatic accent weighting
can gray skin/headbands or tint neutral metal; Keep weighting can tint shadows or
remove an intended halo. The invalidated checkerboard blind review is explicitly
excluded, and the real-art Keep study exposes category bias and repeated judgments.
No new weighting experiments or undocumented exceptions are warranted here.
PixelLab's preservation of some useful hues does not override its own demonstrated
exact-color/detail losses. Point error, aggregate preference and semantic intent
are different measures; none establishes universal superiority.

Dithering adds bounded four-candidate scratch plus at most 4,096 memo entries per
job, and disabled/zero paths allocate no dither scratch. Keep adds one alpha byte
per sample; PNG Keep may require full RGBA rows. Count re-converts full sources
and retains only small metadata. The 8MiB animation cache is **not** a whole-app
heap limit. The oracle's roughly 1.5-second run is verification cost, not an app or
mobile performance benchmark. Prior kernel medians do not establish sustained
thermal behavior, animation FPS or unbounded-wall memory safety.

## Initial disposition

No reproducible actionable production defect was found in the reviewed kernel,
PNG/GIF, alpha, snapshot and cache paths. Preserve current behavior. The meaningful
remaining limitations are already explicit: rare-color intent cannot be inferred
from histograms alone; translucent native clipboard/canvas paths can round RGB;
very large frames/import analysis and final encoding copies retain synchronous
work. These are not resolved by pretending service output is a correctness oracle.

Cross-challenge with service/design reviewers and the coordinating browser review
will be recorded below before the final audit closes.
