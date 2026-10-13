# Imported artwork preparation worker

## Finding and scope

The 184-asset performance audit (167 PNGs, 17 GIFs, 439 frames) identified
synchronous GIF decoding and eager legacy image analysis during import as main
thread work. Auto palette fitting already ran in its own worker; this earlier
import work affected both rendering families before their previews started.

Move user artwork preparation to one lazy serial worker without changing color
matching, source pixels, animation composition or legacy analysis. Keep the tiny
built-in example on its existing browser path; it must not start this worker or
load its client on a fresh empty wall.

## Implementation and reviewed constraints

- PNG and other still-image formats retain the existing native/browser source
  decoder. Only new unpublished RGBA buffers transfer to the preparation worker.
  The measured small-still exception below uses identical cooperative analysis.
- GIFs send the immutable compressed Blob/File to the worker. The existing GIF
  decoder composites every source frame with the same disposal, transparency,
  delay normalization and loop handling. Legacy analysis and whole-clip `unify`
  run before any frame is returned.
- One frame is returned per acknowledgment. RGBA and analysis arrays transfer
  without copying; the worker drops its reference before transferring each frame
  and drops clip state when complete. This moves work off the UI thread; it does
  not reduce the final source or legacy-analysis memory retained by the wall.
- Returned frame counts, dimensions, order, pixel/analysis array types and
  lengths, settings and scalar metadata are validated. Worker construction,
  posting, runtime and malformed-result failures recover from the original File.
  Recovery never trusts detached, aliased or partially returned source buffers.
  PNG recovery uses the same native decoder, preserving straight RGBA fidelity.
- Only unpublished imports may be reanalyzed or transferred. Publication removes
  their File ownership record. A source-brightness/opacity-cut change while an
  import is awaiting preparation triggers async reanalysis before publication;
  actual analysis metadata labels the resulting item. Fully binary alpha keeps
  the existing rule that changing the opacity cut needs no reanalysis.
- Reanalysis drops obsolete unpublished analysis arrays before enqueueing. This
  avoids retaining an additional old analysis during replacement; it is not a
  promise of lower whole-app memory. Original source pixels and recovery File
  remain available until ownership transfers or publication completes.
- Clear and component destruction cancel queued/running user imports and release
  their pending File/source references. A canceled import neither falls back nor
  reappears. Source buffers already published on the wall are never transferred.
- When workers are unavailable, GIF fallback uses the exact same decoder through
  an async wrapper that yields before starting and between frame groups; legacy
  analysis yields between frames and before unification. One very large frame
  or whole-clip unification can still block this fallback. Existing live-wall
  legacy reanalysis is unchanged and can still be expensive.

## Verification before production-browser stress

Focused Vitest verification: **159 tests pass across six suites**, covering the
new core/client/worker, GIF, native image decoding and existing legacy conversion.
Actual structured-clone transfer tests detach buffers and reconstruct identical
RGBA and analysis. Three partial-alpha frames are compared across five brightness
sources and three opacity cuts; all eleven legacy styles match at full and sampled
preview sizes (990 mask comparisons). Tests preserve GIF partial-patch disposal,
transparency, delays and finite loop counts; exercise worker startup/post/runtime
and malformed metadata/sequence/arrays/cut/incomplete results; recover after
partially returned frames and aliased inputs; and cancel active/queued imports
without fallback. An independent subagent additionally verified 45 reconstructed
analysis sequences and 495 full-size masks.

The production build passes. The import client and worker are separate lazy
chunks. Their added download occurs when user artwork is imported, not during
empty-wall startup. Built desktop/physical-phone stress and independent exported
pixel verification are recorded in the Auto 64 release report after this commit.

## Built desktop and physical-phone verification

The complete 184-asset audit passes all **14 stages** on Codex browser and the
physical Pixel 8 Pro after the import worker and independent offscreen-animation
pause fixes. This comparison measures the combined changes, not their separate
causal contributions.

| GIF import phase | Before desktop | After desktop | Before phone | After phone |
| --- | ---: | ---: | ---: | ---: |
| Maximum main-thread long task | 438 ms | 0 | 355 ms | 0 |
| Maximum heartbeat gap | 486.6 ms | 68.8 ms | 416.8 ms | 110 ms |
| File change to all source commits | 875.9 ms | 543.5 ms | 821.5 ms | 1257.4 ms |
| File change to controls ready | 1407.4 ms | 807.7 ms | 4065.4 ms | 2107.6 ms |

Independent Pillow/NumPy verification passes both actual exported ZIPs: 64 distinct
selected colors, 28 files, 144 composited frames and 3,533,753 checked pixels per
device, with correct transparency, palette membership, dimensions, delays and
loops. A separate before/after comparison finds identical selected palettes and
**zero changed output pixels, frame timings or loop counts** on either device.
Records are under `.tmp/auto64-ui-20261012/reports` (independent export and
before/after equivalence JSON); pre-fix records are under `before-reports`.

This is not a claim of zero remaining stalls: the phone observed 134 ms during
the added scroll/family/Original exercise and 99 ms during clear/reimport; desktop
clear/reimport had 55 ms. The phone's coarse `performance.memory` remained flat at
20.5 MB and excludes worker/native/GPU allocations; it cannot demonstrate a
memory reduction or bound total process memory.

## Reviewed tiny-still transport adjustment

The worker-only implementation introduced a measured small-PNG throughput
tradeoff on the phone: cold 40-PNG controls-ready time rose from 421.1 to 635.1 ms
(no main-thread long tasks in either run). A bounded research profile times the
unchanged `analyze` plus `unify` operations for 37 real sources up to 16,384 pixels
and six synthetic square/thin partial-alpha sources, across five brightness
components, three cuts and three repetitions. Keep the cold sample: the first
4096-pixel source has **11.9 ms maximum**, with 2.8 ms p95. Subsequent sources up
to 4096 pixels peak at 1.9 ms; thin/square synthetic 4096-pixel sources peak at
0.3 ms. The initial proposed absolute 4 ms criterion was therefore not met.

After root and independent subagent challenge, use a conservative **4096-pixel
single-frame non-GIF** main-thread path, covering 21 of these 40 PNGs. It uses the
same cooperative function and shared serial queue, with posted tasks before
analysis and unification. GIFs and larger stills keep the worker. The measured
cold call fits one 60 Hz frame on this phone; that is evidence for the transport
choice, not a hard timing guarantee across devices or GC conditions. Do not choose
a larger threshold from warm-only results. No source colors, alpha rules or
animation decisions change, and no extra RGBA copy is introduced.

Regression tests retain genuine larger PNG fixtures for worker failures and
transfers, and explicitly verify the 4096-pixel route's byte/analysis equivalence,
ownership, reanalysis and cancellation during its first posted task. Focused
verification after this adjustment is **161 passing tests across six suites**.
Its focused phone throughput and exported-subset checks are recorded in the
release report after the reviewed commit.

## Remaining performance boundaries

Final source RGBA, eager legacy analysis, and existing cache budgets are unchanged.
The import worker is serial to prevent multiplying simultaneous large GIF decode
memory, but analysis still computes all frames. Export conversion remains full
source and preserves delays. Worker round-trip overhead for many tiny stills must
be assessed alongside reductions in input stalls, rather than assumed faster.
Offscreen animation pause is an independent fix. Moving import work cannot
eliminate layout, rendering, GC, export cost or all legacy setting-update stalls.
