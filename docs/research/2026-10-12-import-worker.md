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

## Remaining performance boundaries

Final source RGBA, eager legacy analysis, and existing cache budgets are unchanged.
The import worker is serial to prevent multiplying simultaneous large GIF decode
memory, but analysis still computes all frames. Export conversion remains full
source and preserves delays. Worker round-trip overhead for many tiny stills must
be assessed alongside reductions in input stalls, rather than assumed faster.
Offscreen animation pause is an independent fix. Moving import work cannot
eliminate layout, rendering, GC, export cost or all legacy setting-update stalls.
