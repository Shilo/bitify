# Small important colors: decision and validation

October 15, 2026. Starting source baseline `310df63`, unchanged through the closed
Keep study (`1e4e8fd`). This is a separate investigation of low-color subset
selection. **Neither automatic candidate ships.** Defaults, specification,
production algorithms and controls remain unchanged. No push or deployment.

## What the direct comparison establishes

Eight fresh PixelLab REST reductions cost 0.8 subscription generations, reconciled
against usage and balance. Five compatible retained operations were reused. The
new licensed inputs are a water bucket, archer and heterogeneous inventory; all
requests use the same source PNG bytes and dither Off, with either 4/8 colors or
the same ENDESGA 8 target strip. The [service report](2026-10-15-important-colors-service.md)
records public schema refresh, native outputs, exact settings, cost and limitations.
These new outputs are API results, not website-generated output claims.

The low-cap detail gap is real:

| Input and budget | Useful service behavior | Current app behavior |
|---|---|---|
| Bucket, 4 colors | Retains 22 blue water pixels | Oklab turns water gray; RGB retains blue in this case |
| Bucket, 8 colors | Retains eight cyan highlight pixels | Both local matching modes turn them gray |
| Inventory, 8 colors | Retains purple hood and green headband | Local output sacrifices the purple hood |
| Retained two-frame knight, 8 colors | Retains red cloth and blue eyes | Local Oklab favors metal/wood shading over those hues |

The service also loses blue water elsewhere and rewrites exact source colors.
At archer K8, current output preserves all eight source colors exactly while the
service uses seven. Bucket/ENDESGA 8 matches current Oklab exactly on visible RGB
and all alpha. Lower whole-image error does not prove better detail preservation;
neither product is universally superior.

## Candidate decision

The [frozen study](2026-10-15-important-colors-spike.md) compares mild concave
frequency and a 90/10 frequency/hue-coverage mixture. Neither receives semantic
labels or artist intent. Generation, matching, opacity, Cleanup and dithering stay
unchanged. High-entropy binned selection retains the existing path.

There are 640 settings/item rows across 18 files and two two-frame sequences,
four targets, two matching modes and 2/4/8/16 budgets. This includes repeated
views and equivalent full-target rows; it is not 640 independent artworks.
The unweighted research copy matches production in every row. Every changed
output is retained. Independent measurements decode all 101 rows changed by at
least one candidate, using metrics separate from the fitting implementation.

Useful gains exist, but the [independent challenge](2026-10-15-important-colors-review.md)
confirms meaningful regressions:

- Concave frequency turns 47 warm bucket pixels gray/pale without restoring water.
- Hue coverage restores a purple hood but makes 19 green headband pixels gray.
- Both turn 18 red potion pixels orange and 15 peach skin pixels gray.
- Concave loses 76 currently green visor pixels; hue turns 24 neutral blade pixels pink.

The root reviewer inspected all six hash-verified, explicitly labeled native/enlarged
figures on a uniform background. Candidate author, service reviewer and independent
challenger agree that both rules fail the stated gate. No coefficient tuning,
automatic exception or third candidate was added after results.

An attempted randomized-label review was invalidated after a checkerboard phase
misreading. Its provisional judgments are excluded; the initial claim of output
drift was disproved and retracted. There is no blind preference tally in this
decision. Confirmed native images and actual region RGB/counts support the result.

## Browser and physical-device evidence

Codex Browser and USB Pixel 8 Pro / Brave each pass **189 research checks**:
180 output comparisons against frozen Node hashes and nine chunk/duration-scale
invariants. All cross-device hashes and input identities match, with no reported
errors. These research-module checks are separate from application delivery.
Additional Node technical checks cover 36 rendered cases and three pre-aborted
jobs: Cut/Keep (opacity remains unweighted), exact RGBA, dither Off/4×4, unchanged
binned output and a hue-boundary fixture. They do not prove semantic intent or
rotation invariance across hue-sector boundaries.

Actual unmodified built-app checks were also performed on both devices:

- Import the retained 24×24 knight; Auto, maximum 8 colors, Oklab, Cut128,
  Cleanup Off and Dithering Off.
- Native Save produces byte-identical 233-byte PNGs. Independent Sharp decode
  confirms dimensions, source alpha mask and eight used source RGB colors.
- Count reports eight; Use opens an unsaved draft whose eight swatches exactly
  match the decoded output. The draft is closed without saving a palette.
- The phone reports no page errors. An initial test selector used the wrong
  accessible button name; correcting the harness resolved it, without app edits.

Receipts, scripts and screenshots are in `bench/important-colors-validation/`.
The native PNG hash is
`dd8e418b0fdaa93f88ed12f6ca769cebe5305aae094185f5c21600326911f642`.
This is one bounded app smoke scenario, not all-feature or clipboard validation.
No candidate was integrated, so its worker/cache/UI/export integration is not
claimed tested. Existing independent app regressions remain separate below.

## Performance and regression scope

Alternating-order, three-sample selection timings include two small sprites and a
32,768-pixel / 4,096-RGB stress input. Stress medians in milliseconds:

| Device | Current | Concave | Hue |
|---|---:|---:|---:|
| Codex Browser | 25.4 | 25.3 | 55.6 |
| Pixel 8 Pro | 47.7 | 28.6 | 61.2 |

Small-sprite medians are roughly 0–0.5 ms, near timer precision. These short runs
are noisy kernel diagnostics, not app FPS, thermal behavior, main-thread stall or
whole-process memory measurements. They support no general speedup claim. Hue
balancing is slower in this stress sample; quality already fails independently.
No shipping performance changes exist because production is unchanged. REST
network/service latency must not be ranked against these local timings.

Current regression checks: 930 unit tests pass, two existing gc-gated tests skip;
the build succeeds. The current build's index SHA256 is
`67b5a088de09d901f63badcb14a4f7ba41e4e8c4b78ddc8b9b8767d8128dd82f`.
`BASE_REF=1e4e8fd node bench/palette-qa.mjs dist` passes 132 legacy, 11 Palette,
11 RGB cases and 13 integration groups, with no reported page errors.
Chromium's own sandbox remains enabled. Production source, CLAUDE.md, the app
specification and performance contract have an empty diff from `310df63`.

## What remains useful

Close these two automatic rules with a no-ship result. The gaps above remain
documented output-quality tradeoffs, not silently fixed or dismissed. Real art
here is one author's style family; the two-pose sequence provides limited motion
coverage. No new website, stock Firefox, Mac or iOS validation is claimed.

The next distinct design opportunity is artist-controlled protection: let the
user express which source color/detail matters. Before implementation, resolve
whether that protects target availability or actually maps the chosen source
color, what happens when protected colors exceed the budget, how animations share
the choice, and how the action stays clear on a phone. The identical deliberate
eye/accidental-noise fixtures show why frequency/hue alone cannot decide intent.
No such UI is added by this study; another automatic weighting loop is not the
recommended next step. Smart integration and the closed Keep study remain separate.
