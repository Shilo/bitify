# Safer optional Cleanup: final decision

Date: October 12, 2026. This closes the safeguard research with an implementation
decision. It supersedes the stronger Cleanup rule measured in the
[initial implementation](2026-10-12-one-pixel-cleanup.md) and
[PixelLab corpus study](2026-10-12-cleanup-pixellab-corpus.md).
The [first safeguard experiment](2026-10-12-cleanup-safeguards.md) remains historical.

## Decision

Implement conservative, error-limited one-pixel cleanup behind the existing
Off/On control. **Off remains the default.** No additional modes, thresholds,
color spaces, storage fields or UI controls are introduced. Nearest matching,
Max colors selection and the Off conversion path are unchanged.

Keep the existing single pass over frozen nearest labels: only isolated
eight-connected pixels can propose a neighbor's palette label; connected regions
are anchors, mutually agreed isolated pairs are supported, and changes do not
cascade. After choosing the original winner, apply two final vetoes:

1. Preserve source RGB that exactly matches a color in the active palette/subset.
2. Accept a replacement only when its added squared Oklab error is at most
   `min(0.005, 0.5 * originalSquaredError + 0.0004)`.

Do not try another candidate after a veto. Oklab supplies this safeguard even
when RGB supplies nearest matching. The absolute ceiling prevents a small palette
or color cap from granting an arbitrarily large allowance because its baseline
color error is high. Exact-color protection applies to the selected subset;
colors excluded by Max colors are not protected as if still available.

The whole-animation guard remains: a coordinate can change only when its baseline
and proposed labels are each identical across every frame. Full-source decisions
are shared by previews, copies and exports. Moving or changing pixels often remain.

## Bounded final comparison

The final pass compared four fixed error rules, then stopped tuning. All four
protected exact selected-palette RGB. The same 160 sampled PixelLab stills used
PICO-8, Oklab and All; nearest output had 20,798 isolated pixels.

| Final veto | Remaining isolated pixels | Reduction | Changed pixels | Images with fewer isolated pixels |
| --- | ---: | ---: | ---: | ---: |
| Relative: `0.5 * error + 0.0004` | 15,464 | 25.65% | 4,784 | 140/160 |
| **Selected: relative, ceiling 0.005** | **16,311** | **21.57%** | **3,989** | **136/160** |
| Strict: `0.25 * error + 0.0001`, ceiling 0.0025 | 17,927 | 13.81% | 2,543 | 114/160 |
| Relative, ceiling 0.0005 | 19,824 | 4.68% | 884 | 72/160 |

The previous stronger rule removed 79.61% of isolated pixels but erased
contrast-bearing details in reviewed images and deliberate details in constructed
controls. Singleton reduction measures behavior, **not visual
success**. Corpus images lack artist annotations, so there is no defensible
percentage for artistic correctness.

All 48 highlighted ear, sword, metal and roof detail probes were retained relative
to nearest output across PICO-8/Resurrect 64, Oklab/RGB and All/8 configurations.
These are targeted regressions from the research set, not held-out guarantees.
The independent subagent approved the capped compromise and challenged the
uncapped rule's dependence on baseline color error. Its documentation findings
were accepted and fixed; its warning about ambiguous intentional dots remains valid.

Reported sprite pixels (26,22) and (18,25) remain
unchanged with the safer rule. Aggressively merging them conflicts with protecting
the reviewed detail counterexamples.

## Production validation

- Independent scalar reference versus production: **454 source/configuration cases,
  682 frames**, with 12,728 grouped checks. Coverage includes 160 stills, 16 real
  GIFs, deliberate-detail/animation controls, the supplied sprite, and all six
  buildings with the shared 255-color Aseprite palette. Membership, alpha, cap,
  exact-color protection, added-error bounds and coordinate transitions passed.
- Codex browser, built app: 16 inputs across PICO-8/shared palette, Oklab/RGB,
  All/8 with Cleanup On, plus All/Oklab Off baselines. Ten ZIP downloads and one
  clipboard copy produced **161 outputs / 521 frames / 24,798,999 checked pixels**;
  3,881 grouped checks passed. Every RGBA byte matched independent nearest,
  singleton, final-veto and temporal-guard calculations. All six building outputs
  stayed inside the shared palette or its selected subset. GIF frame count,
  timing and loop count passed.
- Browser inputs also included green-ear/sword/metal regression examples, two real
  GIFs, intentional-eye/moving-noise GIF controls, partial transparency and a
  1.92-megapixel image. The partial-alpha reference reused the existing validated
  browser decode witness for the identical fixture; browser premultiplication
  rounds some RGB values while preserving alpha.
- Responsive browser checks at **375×740 and 320×700**, including all four settings
  with Opacity cut visible: no clipped controls or overlap. Matching, number input,
  slider endpoints, rapid Cleanup Off/On, opacity change and Reset worked. Reset
  restored Oklab/All/Off/128. Browser console had no warnings or errors.
- **528 tests in 34 files passed; production build passed.** New tests exercise
  exact colors in both matching modes, the error bound, useful near-boundary noise,
  overlays and animation agreement. Existing worker/fallback/cancellation,
  transparency and palette-cap tests remain covered.

An interactive comparison of actual Original/Off/On browser files, including GIFs,
is available while the local server runs at
[final comparison](http://127.0.0.1:5260/.tmp/cleanup-qa/final-cleanup/compare.html).
It includes both PICO-8 and the shared palette, Oklab/All. Native QA scripts and
full JSON measurements remain ignored local artifacts under
`.tmp/cleanup-qa/final-cleanup/`; the figure and conclusion are versioned here.

## Cost and limitations

The added exact-RGB table uses at most **1,024 bytes**. One extra cooperative pass
checks proposed changes, reusing existing bounded vector caching; it allocates no
additional arrays per pixel. Off still loads no cleanup runtime. Built lazy core
grew from 3,882 to 4,153 bytes (2,055 to 2,173 bytes gzip); worker grew from 10,392
to 10,651 bytes. The cleanup client code is unchanged.

Three sequential core runs on the 1600×1200 fixture took **192.5, 180.5 and
167.6 ms**, each changing 12,512 pixels. These include matching, proposals, final
veto and cooperative yields; they exclude browser decoding, worker transfer,
rendering and export encoding. This is desktop evidence, not phone performance.

There is still no automatic way to distinguish two identical near-boundary pixels
when one is intentional and the other is noise. The synthetic ambiguous-dot test
demonstrates this failure. The guard prevents additional tested fixed-coordinate
label transitions; it is not a motion tracker or a guarantee against every
perceptual animation artifact. Physical phones and other browser engines were not
tested. Use Off when deliberate one-pixel details matter most.

This is the final selected implementation; no further parameter search is needed
without a concrete regression or new artist-labeled evidence.
