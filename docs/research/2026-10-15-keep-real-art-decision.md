# Keep opacity weighting: real-art acceptance decision

October 15, 2026. Product baseline: `310df63` (unchanged). Frozen cohort: `4525906` +
`f49000d` (manifest SHA-256 `d27e1d8a…8165f`). The study follows the
[real-art handoff](../../.claude/handoffs/2026-10-15-062048-keep-opacity-real-art-acceptance.md) and
continues the [synthetic spike](2026-10-15-keep-alpha-weighting-spike.md) and
[review](2026-10-15-keep-alpha-weighting-review.md).

## Decision

**No ship under the stated gate.** The gate was "demonstrated improvements without
meaningful regressions":
- **Squared weighting fails on improvement.** It loses intended neutral shadows and dark rims on real art.
- **Linear weighting meets the improvement half.** Blind judges preferred it over current Keep by a wide margin in both rounds.
- **Linear fails the no-regression half.** It still has about ten meaningful judged losses, spread across Auto, fixed palettes, Oklab and RGB, so no narrow setting scope is regression-free.

Production, spec and defaults are unchanged.

Shipping linear is therefore a **product tradeoff for the owner**, not something the
evidence settles. If accepted, the [integration map](2026-10-15-keep-real-art-round2-challenge.md)
estimates about 40 production lines in 10 files, plus tests, spec edits and a desktop and Android pass.

## Cohort (frozen before any comparison)

The cohort was frozen before any comparison: 26 licensed real assets, 4 animation groups
(27 frames) and the 6 known synthetic counterexamples. Licenses are CC0, CC-BY 4.0,
CC-BY-SA 3.0 and public domain, with full provenance in
[manifest.json](../../bench/keep-real-art-study/cohort/manifest.json) and
[CREDITS.md](../../bench/keep-real-art-study/cohort/CREDITS.md).

- **Categories:** glow, shadow, antialiased icons, fade, effects, all-soft and animation.
- **Gaps:**
  - No hand-placed multi-colour pixel art with partial alpha; every pack checked was binary.
  - Grayscale Kenney particle textures are over-represented.
  - Only one translucent subject with a neutral soft shadow (the glass orb).

## Method

- **Harness:** fixed and validated on the synthetic fixtures before the cohort existed ([evaluate.mjs](../../bench/keep-real-art-study/evaluate.mjs)).
  - Policies were current, linear and squared, with Cut128 as a reference.
  - Settings were Auto caps 3/4/8/16/All, RGB and Oklab, Resurrect 64 and PICO-8 capped, one 4×4 dither row, and category walls.
  - That gave 576 cases.
  - Production control equalled the unweighted candidate in every render.
- **Parity:** the built-in browser pane (Chrome 152) and the USB Pixel 8 Pro (Brave 155) matched Node on 115/115 research-module checks each ([device report](2026-10-15-keep-real-art-device.md)). These checks exercise the algorithm only, not built-app import or export.
- **Round 1:** two blind judges rated 118 sheets (59 each, 12 shared), each showing three randomly lettered outputs over four backgrounds.
- **Round 2:** two fresh blind judges did a targeted two-way current vs linear comparison on 97 cases (9 shared).
  - It covered every differing real-art RGB-matching case, the 12 worst metric regressions for linear, every round-1 judged-worse case, and 8 controls.
  - Keys and judgments are retained in [judging/](../../bench/keep-real-art-study/judging/).
- **Metrics:** analysed per region (opaque/strong/soft/faint) and background ([metrics](2026-10-15-keep-real-art-metrics.md)), and used to support the visual judgments, not to replace them.

## Results

| Real art | Better than current | Worse | Tie | Meaningful losses (current → candidate) | Major |
|---|---|---|---|---|---|
| Round 1, linear (108 judgments) | 57 | 5 | 46 | 45 → 8 | 4 → 0 |
| Round 1, squared | 63 | 14 | 31 | 45 → 7, with 6 meaningful regressions on shadows/rims | 4 → 0 |
| Round 2, linear vs current (106 judgments, adversarially selected) | 64 | 20 | 22 | current loses 36, linear loses 10 | 5 vs 0 |

**What linear repairs:**
- Dull, desaturated or darkened hot cores in glows, flares and energy effects.
- Lost yellow and cyan identity in effects and animations.
- Fringe pollution on some icons.

Several sources store luminance-like RGB in their faint pixels, a black-matte export
style common in particle packs. Excluding those 8 sources, linear still wins 30–4.

**What linear loses (round 2, meaningful):**
- A neutral glass-orb contact shadow tinted pink (Resurrect 64 cap 4, RGB matching; found in both rounds).
- Brown eyes or blotches on the Tango smile at Auto c4/c8 RGB.
- A dirty outer glow on the blue light (Resurrect 64 c4 RGB) and a banded yellow flash (Resurrect 64 c4 RGB).
- A paler red-orb rim (Resurrect 64 c4).
- A gray duck frame (PICO-8 c4 RGB).

The judges also gave one PICO-8 orb case to linear, though both outputs failed there. The explosion smoke under PICO-8 c4 went to linear in both rounds.

Metric-flagged fringe and rim regressions on magic-orbs and system-search are not visible at 1×; the unblinded challenger confirmed them as metric artefacts near black.

Every loss is a colour-slot tradeoff at caps of 3–8; none affects alpha or structure. At c16, Resurrect 64 c8 and All, the policies tie. Auto All stays byte-exact for sources with 64 or fewer colours.

## Remaining limits and next useful work

- **Unmeasured:** Cut invariance under a shipped flag. The candidates weight regardless of cut, so integration must gate weighting to Keep.
- **Not run:** cap 2, and fixed palettes at All.
- **Missing art:** hand-authored partial-alpha pixel art. User assets would be the most valuable addition if this question is reopened.
- **Separate questions:** low-cap hue coverage (the knight's tabard and eyes), browser low-alpha decode rounding and existing-image Smart colours.
