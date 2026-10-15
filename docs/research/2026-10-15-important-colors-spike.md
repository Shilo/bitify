# Small colors at low limits: bounded research

October 15, 2026. Research only; production source, defaults, specification and
settings are unchanged. Neither candidate is accepted for implementation. The
independent review and final decision determine whether a candidate meets the
improvement-without-meaningful-regressions gate.

## Question and frozen candidates

At a low color budget, a palette selector can spend several entries on a common
material ramp and discard a small differently colored detail. A target entry being
available is not enough: nearest matching must actually paint the intended source
region with a useful color. This study records mapped eye, headband, clothing,
water and other preselected source regions, rather than counting palette hues.

Two hypotheses were frozen before cohort outputs in
[candidate-freeze.json](../../bench/important-colors-spike/candidate-freeze.json):

- **Concave frequency:** raise each distinct visible RGB's duration-weighted mass
  to the power 0.75, then normalize to the original total. This gives infrequent
  RGB groups more influence, without making all colors equally common.
- **Hue coverage:** retain 90% of original mass and distribute 10% equally among
  occupied Oklab hue groups. There are twelve equal angular sectors and one neutral
  group for chroma below 0.04. Within a group, original frequencies remain intact.

These are deliberately different hypotheses, not semantic recognition. A rare eye
and a rare accidental red speck can have exactly identical pixels. Neither method
can infer the creator's intent. Hue-sector boundaries, near-neutral colors and
noise are limitations that must be challenged, not assumed solved.

Only the existing subset objective changes in a copied research module. Auto
still generates the same shared 64-color target. Matching, active target RGBs,
source alpha, Cleanup, dithering and codecs remain unchanged. If the existing
full-nearest path already fits within the requested count, it returns unchanged.
Above 4,096 distinct visible RGBs, the existing bounded-bin path retains its
original weights and selection; the candidate does not claim balanced hue
statistics for mixed bins. There is no new full-source spatial buffer.

## Frozen cohort and comparisons

The independent reviewer froze
[the manifest](../../bench/important-colors-review/manifest.json) before outputs.
It contains thirteen real CC0 source views (including one inventory montage), five
owned synthetic inputs and two two-frame clips. The real art covers small faces,
green headbands, a red potion, metal, neutral art, a rocket, a heart, an axe and
water. Owned inputs retain the known knight eyes/tabard/gem example, a neutral
ramp, and identical pixel images labeled once as an intentional eye and once as
accidental noise. Repeated views and frames are not independent artworks.

Each item is compared at 2/4/8/16 colors, with Auto, Resurrect 64, PICO-8 and
ENDESGA 8, under Oklab and RGB matching: **640 settings/item rows**. All primary
artistic comparisons use Cut128, Dithering Off and Cleanup Off. Explicit caps
larger than a target's capacity use that unchanged full target, so some rows tie
by construction. These rows must not inflate claims of artistic improvement.

The manifest originally spelled the Resurrect preset ID `preset-resurrect64`;
before device receipts it was corrected to the actual `preset-res64`. This was a
metadata correction. The initial runner explicitly used the real preset already;
the final runner reads manifest IDs and asserts a successful lookup. Re-running
the same frozen art/rules produced the same output counts and RGBA hashes.

The unweighted research copy equals the actual current selector in all 640 rows.
For every candidate, alpha, target membership, color-cap bounds and unchanged
coordinate stability across animation frames are asserted. Every changed row
retains native PNGs for current and both candidates, including every clip frame.
The report includes selected target colors, actual mapped-region colors, point
Oklab error, encoded-RGB channel RMSE, exact-color losses and output hashes.

| Diagnostic | Concave frequency | Hue coverage |
|---|---:|---:|
| Rows changing actual pixels | 56 | 70 |
| Changed real-art rows | 27 | 11 |
| Changed rows with lower point Oklab error | 17 | 12 |
| Changed rows with higher point Oklab error | 39 | 58 |
| Rows losing some currently exact source pixels | 12 | 23 |

These diagnostic counts are **not artistic wins or losses**. A small important
eye may justify trading a redundant shade; a worse face or material does not
become acceptable because another region scores better. Independent native-size
and enlarged inspection remains required.

Concrete initial observations: hue coverage restores the knight's exact blue eyes
at Auto/Oklab eight colors, but its tabard still becomes brown and one metal shade
is sacrificed. Concave weighting at Auto/Oklab four colors changes the water
bucket's warm wood into cool gray/pale colors without restoring blue water. Both
observations are retained for independent challenge; neither is a universal
conclusion about the candidate family.

## Technical and device validation scope

[technical-results.json](../../bench/important-colors-spike/technical-results.json)
contains 36 additional rendered cases and three pre-canceled jobs. These are
technical fixtures, not post-hoc additions to the artistic acceptance set. They
cover Cut/Keep, Off/4x4 dithering, exact four-color membership, 6,144-unique-color
binned input and a hue/near-neutral boundary input. Binned output remains identical
to current; exact visible RGBA remains exact; original alpha is preserved. Keep
remains unweighted by alpha.

Nine separate chunk/duration-scale checks pass. They compare ordinary chunks with
16-byte chunks and a common sevenfold duration scale. They preserve one shared
subset for a clip. This is not a claim that every arbitrary frame ordering is
interchangeable or that a moving feature cannot change pattern phase.

The browser-safe harness runs actual research modules against frozen Node hashes.
It includes 180 rendered settings/method checks, nine chunk/duration invariants and
alternating-order selection timing on two small sprites and a 32,768-pixel,
4,096-RGB source. **This tests research algorithms, not the built app's worker,
import/export, UI, cache or clipboard integration.** No candidate is integrated
into those paths. Device receipts and independent conclusions are recorded by
the coordinating review after completion.

Node timing samples vary substantially because the cooperative scheduler and
runtime load enter measured selection time. No free speedup or whole-app latency
claim is supported. No extra long-lived source retention, new worker protocol or
application UI is implemented.

## Reproduce

1. `node bench/important-colors-spike/build-candidate.mjs`
2. `node bench/important-colors-spike/run.mjs`
3. `node bench/important-colors-spike/technical.mjs`
4. `node bench/important-colors-spike/server.mjs 5306`, then open loopback port
   5306 and press **Run frozen comparisons**. Select the appropriate device.

The loopback server serves only four owned harness dependencies and flat
`src/lib/*.js` modules. It accepts bounded owned-device reports; it serves no
private configuration, credentials or arbitrary repository files.

Primary artifacts: [results](../../bench/important-colors-spike/results.json),
[cohort vectors](../../bench/important-colors-spike/cohort-input.json),
[device inputs](../../bench/important-colors-spike/device-input.json), and the
[candidate builder](../../bench/important-colors-spike/build-candidate.mjs).
