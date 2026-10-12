# Cleanup on the PixelLab generation corpus

Date: October 12, 2026. Implementation: `1e0976f` on main.

Cleanup reliably reduces isolated palette colors in stills. It is much less effective
on moving animations, and fewer isolated colors does not reliably mean better art.
Keep it optional and Off by default. No algorithm or default was changed by this study.

## Sample and checks

The supplied `pixellab-pip-generations` folder contains 38,886 PNG/GIF/WebP paths across
565 top-level groups. This is a mixed asset corpus: generated candidates, rotations,
animation frames, tiles, scenes and some reference/derived images. Generation provenance
was not verified from metadata, and these are not 176 independent artist-labeled trials.

Select 160 stills and 16 GIFs by deterministic SHA-256 ordering seeded with
`bitify-cleanup-20261012`, one still and one GIF at most per top-level group. Deduplicate
file contents. Exclude obvious masks, review/contact sheets, upscales and several derived
formats by filename. Limit stills to 262,144 pixels; GIFs to 2–64 frames and 1.5 million
frame-pixels. All selected inputs have binary alpha. The filter cannot perfectly identify
derived images: for example, some animation frames and an aura sheet remain eligible.
One attempted GIF failed decoding with `Unknown gif block: 0x47` and was skipped, not
counted as a passing case. Unselected files and WebP were not tested in this study.

Test PICO-8 and Resurrect 64, Oklab/RGB, All/8: 1,408 source/configuration cases,
3,008 converted frames and 71,581,416 indexed pixels. Every case matched a separate
scalar nearest matcher plus the strict research singleton rule and whole-clip agreement
reference. Transparency, allowed palette indexes and color caps passed throughout.
The independent cleanup reference shares the intended algorithm, so this establishes
implementation correctness, not artistic intent detection. GIF source compositing uses
the existing app decoder; it is not an independent audit of that decoder.

Also import 16 of those stills and four GIFs into the production build in Codex browser.
Exercise all 16 palette/matching/cap/Off-On combinations through the UI and download
16 ZIPs. Independently decode all 320 exported files: 1,024 frames, 10,853,952 pixels,
3,152 grouped assertions. Exact converted RGBA, original dimensions, GIF delays and loop
counts pass. No browser warnings/errors were recorded. The full suite passes 525 tests;
the production build passes. These checks add to, rather than replace, the earlier
sprite/building/partial-alpha/mobile validation.

The [sample manifest and default measurements](2026-10-12-cleanup-pixellab-sample.csv)
retain relative source paths and SHA-256 hashes. Local harnesses, all configuration
measurements, decoded outputs and contact sheets are under `.tmp/cleanup-qa/corpus/`;
they are ignored QA artifacts and are not downloaded by app clients.

## Numerical effect on still images

A counted isolated pixel is a visible palette label with no equal label among its
eight immediate neighbors. It can be an intentional eye, highlight or texture pixel.
“Reduced cases” below measures this count, not visual success. Counts are summed over
images, so larger images contribute more to aggregate pixel reduction.

| Palette | Matching | Max colors | Reduced cases | Isolated before → after | Reduction |
|---|---|---|---:|---:|---:|
| PICO-8 | Oklab | All | 151/160 | 20,798 → 4,240 | 79.6% |
| PICO-8 | Oklab | 8 | 151/160 | 17,001 → 4,142 | 75.6% |
| PICO-8 | RGB | All | 149/160 | 19,956 → 4,551 | 77.2% |
| PICO-8 | RGB | 8 | 149/160 | 17,257 → 4,372 | 74.7% |
| Resurrect 64 | Oklab | All | 150/160 | 38,932 → 5,980 | 84.6% |
| Resurrect 64 | Oklab | 8 | 150/160 | 22,987 → 4,518 | 80.3% |
| Resurrect 64 | RGB | All | 150/160 | 36,442 → 5,834 | 84.0% |
| Resurrect 64 | RGB | 8 | 150/160 | 19,625 → 4,360 | 77.8% |

No tested configuration increased the isolated-pixel count. For the default
PICO-8/Oklab/All configuration, 151/160 (94.4%) images reduce that count; six have no
isolated pixels initially and three have candidates that stay unchanged. Across the
154 images with candidates, median reduction is 81.1%. Only 15,517/1,804,424 visible
pixels (0.86%) change, but a small changed fraction can still damage a key detail.

## Visual judgment on 40 stills

Before inspecting outcomes, select every fourth still in the deterministic manifest:
`s001`, `s005`, …, `s157`. Review original, nearest Off, Cleanup On and changed-pixel
maps with the same crop and nearest-neighbor magnification, under PICO-8/Oklab/All.
The review is unblinded and by one reviewer, without artist intent annotations.

| Judgment | Cases | Share |
|---|---:|---:|
| Clearly cleaner, with no obvious important loss in this view | 11 | 27.5% |
| Mixed: smoother regions, but plausible highlights/texture/accents lost | 18 | 45.0% |
| Subtle or uncertain; no confident artistic benefit | 8 | 20.0% |
| Clearly worse by reviewer judgment | 1 | 2.5% |
| Unchanged | 2 | 5.0% |

This **27.5% observed clear-improvement rate** is a subjective sample judgment, not
an estimated universal success rate. Mixed cases are not counted as successes or
automatic failures. Independent artist labels or a blinded panel could change these
ratings. The 94.4% mechanical reduction rate must not be advertised as visual accuracy.

Ratings are preserved in the CSV. Cleaner examples include `s017` (helmet/outline),
`s045` (character surfaces), `s113` (house roof texture) and `s149` (star edge).
Mixed cases include `s041`/`s085` (fire texture), `s093` (metallic glints), `s009`
(soil/pot accents) and `s153` (tiny chicken shading). In `s121`, green ear accents
become gray while adjacent apparent skin/body accents remain green, reducing material
consistency by reviewer judgment despite removing all 12 isolated colors. Cleanup
preserves alpha, so a detail can lose color contrast without losing its silhouette.

## Animations

Under PICO-8/Oklab/All, only 5/16 GIFs change. Isolated pixels fall from 78,001 to
76,715 (1.65% reduction). There are 1,181 changed frame-pixels out of 2,192,360 visible
frame-pixels (0.054%). Across the eight configurations, only 4–6 GIFs change and aggregate
reduction is about 1.1–1.65%. Large movement, rotation and changing effects usually
reject every proposal under whole-animation agreement.

All 128 animation/configuration cases preserve the baseline number of fixed-coordinate
label transitions exactly, including the clips that do change. The four native GIF
fixtures cover walking, a forge fire, a rotating coin and a waving robot. This validates
the guard's narrow promise; it does not prove perceived flicker is absent, track materials
through motion, or preserve stationary intended details. The guard deliberately leaves
most moving noise untouched.

## Performance and recommendation

One desktop Node pass recorded still preparation median 0.23ms, p95 4.05ms and a
481.7ms worst case; GIF median 11.0ms, p95 86.8ms and maximum 190.0ms. Preparation
includes baseline quantization and cleanup, but excludes palette-subset selection,
encoding and browser-worker transfer. The run overlaps other work and is not an isolated
benchmark. These measurements do not establish physical-phone latency or responsiveness.

Use Cleanup as a per-project visual choice for stills with unwanted speckles. Compare
eyes, jewelry, sparks and tiny highlights before saving. Keep Off for art whose isolated
accents are intentional. Do not relax the animation guard or retune gates based only on
lower singleton counts: that would optimize the proxy while increasing detail-loss risk.
The test found no correctness defect requiring a production fix.
