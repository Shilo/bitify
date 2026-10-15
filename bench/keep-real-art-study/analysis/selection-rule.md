# Blind judge sheet selection rule (fixed before application)

Written October 15, 2026, before running the selector. Input: frozen cohort
(`cohort/manifest.json`, commits 4525906/f49000d) and `results/results.json`
(36 units, 576 cases, 362 sheets). Applied by `analysis/select-judges.mjs`.

A case is eligible only if its policies are not all identical (it has `sheet` or
`duplicateSheetOf`; a duplicate resolves to the referenced sheet). "Real art" means
category is not `synthetic-counterexample`; animation groups are units.

1. Synthetic counterexamples: every eligible per-unit case with setting
   `auto-c3-oklab`, `auto-c4-oklab`, `res64-c4-oklab` or `res64-c4-rgb`
   (both Resurrect 64 cap-4 metrics, because the prior many-soft negative was RGB).
2. Every real unit: eligible per-unit cases for `auto-c4-oklab`, `auto-c8-oklab`,
   `res64-c4-oklab`, `pico8-c4-oklab`.
3. Real-art extremes (unit and wall cases). For a region group G and policy p, per
   background: D = sqrt(sum_r n_r * rmse_r^2 / sum_r n_r) over regions r in G with
   pixels, n_r = source region pixel count, rmse = oklabRmse. Delta = mean over the
   four backgrounds of D(linear) - D(none). Take the 8 largest |Delta| for
   G = {opaque, strong} and the 8 largest for G = {soft, faint}; only cases with
   nonzero pixels in G and linear != none output. Ties: caseId ascending.
4. Walls: among real-art `wall-auto-c4-oklab` eligible cases, per category keep the
   case with the largest |mean-over-backgrounds all-region Oklab delta (linear - none)|;
   take the 4 categories with the largest such value (ties: category ascending).
5. De-duplicate by sheet file (first rule that selected it is recorded; all reasons kept).
   No replacements for overlaps.
6. Packets: mulberry32 PRNG seed 20261015. Fisher-Yates shuffle of the selection
   (sorted by sheet name first). The first 12 are shared by A and B; the rest alternate
   A, B. Each packet is then shuffled again with the same PRNG stream and renamed
   J001... Sheets larger than 1600 px on a side also get `Jnnn-view.png`, a nearest
   downscale by the smallest integer factor that fits 1600.
7. Judge indexes contain only: J file, view file, original sheet filename, unit id,
   category, setting, source alpha profile (summed manifest alphaStats) and manifest
   notes. No policy names, hashes, metrics or selection reasons.
