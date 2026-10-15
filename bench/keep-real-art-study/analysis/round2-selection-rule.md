# Round 2 two-way blind selection rule (none vs linear), fixed before application

Written October 15, 2026 before running `analysis/round2-select.mjs`. Inputs:
`results/results.json`, `analysis/metrics.json` (thresholds unchanged) and the
orchestrator's `analysis/unblinded.json` (round-1 rows; severity lower = better).
Only real art (category != synthetic-counterexample). A case is eligible only when
linear's output hashes differ from none's.

1. RGB matching: every eligible per-unit case whose setting ends in `-rgb`
   (auto-c4/c8, res64-c4/c8, pico8-c4). Walls are Oklab-only in the matrix.
2. Top-12 linear regressions: eligible real cases (unit or wall, any matching) ranked
   by the maximum over regions with >= 16 source pixels (opaque/strong/soft/faint) and
   the four backgrounds of linear - none Oklab RMSE; descending, ties by caseId; top 12.
3. Judged worse: every round-1 row (any judge) whose caseId is real art and has
   sev.linear > sev.none.
4. Controls: round-1 rows with sev.linear < sev.none, real art, caseId not already
   selected by rules 1-3; unique caseIds sorted ascending; mulberry32 seed 20261016
   Fisher-Yates shuffle; first 8.
5. De-duplicate by caseId, then merge cases whose (unit, none frame hashes, linear frame
   hashes) are identical into one sheet listing all caseIds. All reasons are kept.
6. Sheet order: mulberry32 seed 20261017 shuffle of the merged list (sorted by first
   caseId), named K001... P/Q assignment per sheet comes from a NEW random secret seed
   (HMAC-SHA256 of the first caseId) stored only in `.tmp/keep-blind/round2-key.json`.
7. Crop: per case, over the sampled frames (<= 4) and the four backgrounds, per-pixel
   score = |dE_ok(source, linear) - dE_ok(source, none)| of encoded-sRGB composites.
   The crop is the min(96,w) x min(96,h) window with the largest score sum (4-px stride,
   ties: top-left first), identical for every column and frame.
8. R2/index.json lists only K file, unit id, category, setting(s), animated, frame count
   and summed manifest alpha profile. No notes, policies, metrics or reasons.
9. Presentation (no effect on selection): when the image already gets a full enlarged
   panel (max side <= 128) and the crop window is the whole image, the crop panel is
   omitted as a duplicate.
10. Images wider or taller than 320 px are shown fit-to-320 (Lanczos, labelled) plus the
    crop at native 1x and the enlarged crop; smaller images are shown at native 1x.
