# Keep opacity real-art study: round-2 methodology challenge

Date: October 15, 2026. Adversarial reviewer, unblinded. This is research only:
nothing under `src/` or the spec was changed, and nothing was committed. Inputs were the
frozen cohort (`bench/keep-real-art-study/cohort/`, 4525906/f49000d), `results/results.json`,
`analysis/metrics.json`, `analysis/unblinded.json`, the round-1 judge files and summaries,
and the device parity note. I did not open `.tmp/keep-judge/R2` or `.tmp/keep-blind`.

The scripts are in `bench/keep-real-art-study/round2/`. Run them with `node <script>`:

- `view.mjs "<caseId>" [scale] [x,y,w,h] [frame]` writes labeled source | none | linear |
  squared composites on the four backgrounds to `round2/views/`.
- `faint-rgb.mjs` (writes `faint-rgb.json`) measures, for each source, the share of gray
  pixels, the correlation between alpha and the max RGB channel, and the mean max channel
  in each alpha band.
- `split.mjs` (writes `split.json`) splits the round-1 linear-vs-none judgments by source
  type, cap and target.
- `by-setting.mjs` (writes `by-setting.json`) gives linear's metric verdict for each
  setting, using opaque, strong and soft regions only (faint excluded).

## Verdict

**The claim holds only within a narrow scope, and the literal gate is not met.** As
worded, "demonstrated improvement without meaningful regressions" is not supported. One
blind-judged meaningful regression is real (`shadow-glass-orb|res64-c4-rgb`). The cohort
also has almost no examples of the asset class most likely to produce more of them.

What the evidence does support is a large net improvement, limited to Keep. It shows up
mainly at caps of 3 to 8. Every loss found so far is a rare color tradeoff, never a
structural loss. Linear weighting should ship only if the product owner explicitly accepts
the "neutral soft shadow under a wholly translucent colored subject" tradeoff. Both review
rounds asked for that decision to be made explicitly. Any shipped claim must say "net
improvement with a documented tradeoff class", never "no regressions".

Reasons:

1. **The improvement is robust and not an artifact of one authoring style.**
   - Over 97 unique real cases (shared sheets averaged), linear vs none is 52 better,
     5 worse and 40 tie.
   - The judges agreed on direction for 10 of the 12 shared sheets. Both disagreements
     were none-vs-tie.
   - Excluding the eight black-matte sources (below), linear still wins 30 to 4. On the
     meaningful threshold the split is 19 to 1.
2. **The metric analyst's soft/strong "regressions" are mostly Oklab's amplification near
   black, not visible losses** (section C). The judges were right to discount them.
3. **One meaningful regression remains, and the cohort barely samples its class.** The
   risk class is a wholly translucent subject whose deliberately neutral soft shadow loses
   its palette slot. Nor does the cohort contain multi-color pixel art with partial alpha,
   which is the most common reason anyone selects Keep. Absence of further regressions is
   therefore weak evidence.
4. **Settings coverage is partial.**
   - There is no cap 2 and no Cut-with-candidate run.
   - Large caps and All are covered only by metrics. They are byte-identical or metric
     ties, so they carry no visual risk, but they also show no benefit.

## Task 1: challenges

### A. Is the cohort representative, and could it bias toward linear?

Composition: 30 real units.

- **Kenney (8 units).** Lens flare, radial light, trail streak, smoke puff, magic ring,
  black smoke, flash and explosion.
- **Grayscale (6 units).** Six of the Kenney units are 100% gray, with RGB tracking alpha
  (see B).
- **Pixel-like art.** The only pixel-like units are `shadow-lpc-character` and
  `anim-tango-spinner`. Both have a single RGB, so every policy produces identical output.
  The cohort has **no multi-color pixel sprite with partial-alpha shadows, glows or AA
  pixels**.
- **Risk-class assets.** Only one asset is "translucent colored subject plus neutral soft
  shadow": `shadow-glass-orb`, whose artist exported every pixel below 255. It produced
  the one meaningful regression.

Where the judgments fall (108 real judgments, `split.json`):

| Group | n | better | worse | tie | meaningful better / worse |
|---|---:|---:|---:|---:|---:|
| RGB≈alpha (black-matte) sources | 39 | 27 | 1 | 11 | 19 / 0 |
| Other sources | 69 | 30 | 4 | 35 | 19 / 1 |
| cap 3 / cap 4 / wall c4 | 4 / 71 / 7 | 4 / 35 / 7 | 0 / 4 / 0 | 0 / 32 / 0 | 4/0, 23/1, 6/0 |
| cap 8 | 26 | 11 | 1 | 14 | 5 / 0 |

Caps 3 and 4 make up 76% of the judgments. This follows selection rule 2, which takes
auto c4/c8, res64 c4 and pico8 c4. The selection inflates the apparent effect size, since
caps 3 and 4 are where palette slots are scarcest. It does not bias the direction: rule 3
and rule 4 pick extremes by |Δ|, symmetric for gains and losses.

Linear's metric verdicts by setting, from `by-setting.json` (real units, faint ignored):

- At auto c16 the split is 3 better / 0 worse.
- At res64 c8 and at Auto All it is 0 / 0.
- At pico8 c4 Oklab it is 1 better and 0 worse, with 23 of 30 identical.

**The benefit therefore vanishes at larger caps.** The case for shipping depends on how
often users choose small caps under Keep.

The direction bias I could not exclude is cohort selection. The curators knew the spill
hypothesis, and luminous effects dominate the cohort. The missing pixel-art category
mostly makes linear look *neutral*, because binary-alpha pixels weigh the same under every
policy. The missing translucent-UI/glass category could make it look *worse*.

### B. Is the win just "dark faint RGB spill" from black-matte exports, and is that a real case?

Sharp measurements (`faint-rgb.json`, first frame per unit):

- **Black-matte style, RGB ≈ alpha.** Eight sources have a correlation between alpha and
  the max channel of at least 0.94:
  - glow-lens-flare
  - fade-radial-light
  - fade-trail-streak
  - fx-energy-star
  - fx-black-smoke
  - soft-smoke-puff
  - soft-magic-ring
  - anim-kenney-explosion

  Their mean max channel follows the alpha band almost exactly: about 8–17 at α 1–15,
  50–65 at α 16–63, 118–131 at α 64–127 and 178–206 at α 128–254. These are luminance
  masks written into both RGB and alpha. That is a premultiplied/black-matte convention
  meant for tinting or additive blending in engines. Under straight-alpha compositing,
  which is what Colorfetti shows and exports, their faint pixels are dark grays that
  contribute almost no visible color.
- **Straight, non-matte sources.** These keep light RGB at low alpha: glow-orb-red (242
  at α 1–15), glow-light-64 (184), flash-yellow (190), rubberduck magic (206) and
  green-magic (208).

Is this a real user case? **Yes, but it is the convention that amplifies linear's
largest wins.** Kenney-style particle packs are very common free inputs. Weighting by
alpha is also principled for straight-alpha output: a pixel's visible contribution on any
background scales with its alpha. So the black-matte sources show the mechanism most
strongly, but they are not the only evidence. Without them the meaningful split is still
19 to 1, driven by flash-yellow, light-64, the rubberduck animation, glow-orb-red, the
island shore, the tango icons and the magic-orbs wall. Release notes should not claim the
large "core restored" effect for typical straight-alpha art.

### C. Metric/visual disagreement, inspected unblinded

All five cases were rendered with `view.mjs`, at 6× for the 32 px icons and 1× or 4×
crops for the large sheets, on black, white, checker and blue.

- **`aa-tango-face-smile|auto-c3-oklab`** (metric: soft +0.069 on black).
  - None turns the face dull tan-brown and reduces the smile to a dash. It keeps
    near-black #020200 eyes and shadow.
  - Linear restores the saturated orange body and the smile. It renders the eyes and soft
    bottom shadow in dark brown #3a2b0d, which shows as a faint brown haze under the face
    on black.
  - Reading: minor loss, severity 1, far outweighed by the gain. I agree with judge B
    (none 3, linear 0).
- **`aa-tango-face-smile|wall-auto-c4-oklab`** (metric: soft +0.086 on black).
  - Linear's dark slot becomes cold slate #292e30. The eyes stay dark, but the lower rim
    and shadow turn blue-gray, visible on white at 6×.
  - None has orange-centred eyes and a brownish smile.
  - Reading: a real hue fault on an orange icon, but small at 1× (32 px). Severity 1. The
    judge rated it 1 and also noticed the "cold blue-black lower rim". Seen, not
    overlooked.
- **`aa-tango-system-search|auto-c4-oklab`** (metric: soft +0.042 and faint +0.062, both
  on black).
  - None draws a spurious dotted black ring inside the lens. Linear removes it and keeps
    a darker, more faithful lens on black.
  - The faint/soft delta is #000000 → #2e2e2e in the drop shadow, which is invisible at 1×.
  - Reading: linear better. The wall c4 variant is also better, because none loses the
    blue ring entirely.
- **`aa-magic-orbs-sheet|wall-auto-c4-oklab`** (metric: strong +0.147 on black, the
  largest linear "regression").
  - Region check: the strong region is the black rim. None maps it to exact #000000 (error
    0). Linear maps it to #130a0a: sRGB RMSE 11.4, and linear-light RMSE **0.93 on black /
    3.9 on white**.
  - The Oklab distance #000000→#130a0a alone is 0.158 dE_ok. Oklab's cube root magnifies
    near-black steps that are barely visible.
  - In the composites all three policies destroy the red lattice at shared cap 4. Linear
    is the only one that keeps a warm brown for the red and orange orbs; none turns red
    into magenta and orange into gray. The rim halo on black is visible only at 4×.
  - Reading: **not a meaningful loss.** Judge B rated none 2 and linear 0, and I concur.
- **`shadow-glass-orb|res64-c4-rgb`** (the judged regression; metric: soft +0.011 to
  +0.017 on all backgrounds, strong −0.009).
  - Confirmed: the neutral gray contact shadow becomes pink/mauve on every background
    (cluster #6d6e71 at 5.8% mass is lost).
  - The body changes from rust-brown bands to wine/pink bands. Its hue is closer to the
    source's crimson, and the regained clusters #eaa1a1 and #dd9192 hold 6% of the mass.
  - Reading: a genuine tradeoff, and a meaningful regression for the shadow. Severity 2
    stands.
- **Unjudged extra checks.**
  - `fx-energy-star|pico8-c4-rgb` (metric strong +0.027): linear restores the yellow
    rays that none turns peach. It is better.
  - `fade-trail-streak|pico8-c4-rgb` (metric +0.035): linear brightens the core but adds
    a wider posterized warm-gray (#5f574f) teardrop halo in the faint tail on black and
    blue. This is a minor, severity-1 loss.

**Overlooked meaningful regressions: none.** The judges also caught the one regression the
metrics flagged weakly, glass-orb at +0.017. The minor uncaught faults are listed under
"Overlooked regressions" below.

### D. Settings coverage

From `results.json`:

- **Auto All.** Every unit with at most 64 visible RGBs is byte-identical across none,
  linear and squared. These are shadow-cloud-cast, lpc-character, both twemoji, the tango
  spinner and the four small synthetic units.
  - The code path guarantees this: `finish()` returns every exact key when `global.size ≤ 64`,
    even keys with zero mass. That covers the largest-remainder case in which a single
    α=1 pixel in an asset of about 65.8k or more opaque pixels gets 0 units under linear
    mass.
  - Units with more than 64 colors (24 of them) get a different 64-color Auto palette, so
    **Auto All is not unchanged in general.** The metric difference is ≤ 0.002 dE_ok,
    which is a tie.
- **Larger caps.** res64 c8 is identical for 23 to 24 of 30 real units, with no material
  delta. Auto c16 has 3 better and 0 worse.
- **Fixed palettes at All.** These were not run. They are unaffected by construction,
  because there is no limiter and matching is unweighted.
- **Cut.**
  - The study's `cut128` column is unmodified production. The spike likewise passes
    `weighting: 'none'` whenever it is in Cut mode (`experiment.mjs:104`).
  - The candidates apply `opacityMass[alpha]` whatever alphaCut is, so Cut 128 with the
    candidate code would *change* (a pixel at alpha 128 rendered opaque would get half
    mass).
  - **Cut invariance is therefore an integration requirement, not a measured property.**
    The spike's invariants do demonstrate opaque and binary Keep identity.
- **Cap 2 was not tested.** The handoff asked for 2/4/8/16. Cap 2 is where the
  glass-orb-style slot competition is harshest.

### E. Judge leakage and selection bias

- Letters were randomized per sheet with an HMAC, policy names were absent, and two
  manifest clauses describing policy behavior were redacted. I found no leakage path.
- The remaining notes ("glow colour must survive a small cap") tell the judges what to
  value, not which letter is which, and they apply to all three outputs equally.
- Squared's presence anchors severity relative to the best of three. This affects none
  and linear symmetrically.
- The 12 shared sheets are counted twice in the 108. Deduplicated, the result is 52/5/40
  (above), so nothing changes.
- Rule 2 omitted auto-rgb, res64-c8, c16 and All. That is acceptable, given that the
  metrics show ties there.
- Round 1 had two judges who were the same model family as the curators. The round-2
  judge is pending.

## Overlooked regressions (case IDs)

- **Meaningful:** none beyond the judged `shadow-glass-orb|res64-c4-rgb`.
- **Minor (severity 1), not judged or under-weighted:**
  - `fade-trail-streak|pico8-c4-rgb`: wider warm-gray faint halo on black and blue.
  - `aa-tango-face-smile|wall-auto-c4-oklab`: cold slate rim, shadow and eyes on an
    orange icon. The judge noted it.
  - `aa-tango-face-smile|auto-c3-oklab`: brown eyes and shadow haze. Outweighed by the
    restored body.
- **Metric-only, not visible:**
  - `aa-magic-orbs-sheet|wall-auto-c4-oklab`: rim #000000 → #130a0a.
  - `aa-tango-system-search|auto-c4-oklab` and its dither variant: faint #000000 → #2e2e2e
    in the drop shadow.

## Requirements before any ship decision

1. The owner explicitly accepts the glass-orb tradeoff class.
2. The round-2 judge confirms the direction.
3. Optional but cheap: add 2–3 multi-color pixel sprites with partial-alpha shadows and
   one translucent glass/UI asset with a neutral shadow, and run cap 2 and cap 4. Do this
   only with user-supplied or already-licensed files; nothing was downloaded here.

Do not add an adaptive guard tuned to glass-orb. That repeats the post-hoc tuning both
reviews rejected.

## Task 2: integration map for linear, if shipped (read-only)

The principle is one boolean opacity-mass flag, true exactly when `alphaMode === 'keep'`.
It applies to every place a fitting or limiter decision is made or cached. It must never
reach matching, dithering, Cleanup or alpha output. Use **integer** mass, `weight * alpha`
(1–255), instead of the candidates' float `alpha / 255`:

- Per-asset normalization makes the scale irrelevant to Auto.
- Integer sums keep within-asset histogram and bin sums exact.
- Integer sums also keep chunk, wall-order and duration invariance canonical.

**Where Keep must be distinguished from Cut1.** Today `effectiveAlphaCut('keep') === 1`
collapses the two modes.

| Place | Change |
|---|---|
| `palette-generated-sources.js` `captureGeneratedSources` / `captureGeneratedWallSources` | Add an `alphaMode` argument. Freeze `opacityMass` into the snapshot. The key becomes `[2, alphaCut, opacityMass ? 1 : 0, assets]`. Reject `keep` with `alphaCut !== 1`. |
| `palette-generated.js` `createGeneratedAccumulator`, `generatePaletteAsync` | Add an option `{ opacityMass }`. Use `pixelWeight = opacityMass ? weight * a : weight` at the histogram, overflow and bin sites (3 lines). `generatePaletteAsync` reads `snapshot.opacityMass`. |
| `palette-generated-client.js` `runWorker` start message; `palette-generated-worker.js` | Send `opacityMass` and pass it to the accumulator. The fallback is already covered through the snapshot. |
| `palette-limit.js` `selectPaletteSubset` | Add an `opacityMass` option. Weight the histogram/bins, `frequency`/`fullCost` and the binned verification pass (the same 3 sites as the candidate). |
| `palette-limit-client.js` | Add an `opacityMass` option to `getLimitedPalette`. Include it in `snapshot()`, `same()`, the worker `start` message and the cooperative fallback call. |
| `palette-limit-worker.js` | Pass `data.opacityMass` through. |
| `palette-failure.js` | Add `alphaMode` to `paletteFailureInputs` and `samePaletteFailureInputs`. `current()` compares the context's alphaMode. Without this, a Keep limiter failure is treated as owned by Cut1 (same item, palette, cut, metric and cap), and vice versa. |
| `palette-state.js` `fullPaletteImage` | Pass `opacityMass: alphaMode === 'keep'` to `getLimitedPalette`. Generated mode travels in the captured snapshot. This one path serves Save, Copy, ZIP, drag, hover preparation and Count/Use (`palette-usage.js`). |
| `Tile.svelte` | `stageInputs` and `limitRequest` carry alphaMode. The `getLimitedPalette` call passes the flag. The Cleanup request is unchanged, because its palette identity already changes with the subset. |
| `App.svelte` | `generatedRequest = captureGeneratedWallSources(items, example, paletteCut, alphaMode)`. Add `alphaMode` to the `paletteFailures.current` context. `asking()` and `usageKey` already include alphaMode and the generated key, so export capture and Count/Use follow automatically. |

**No change** is needed in:

- `quantize.js`, `palette-dither*`
- `palette-cleanup*`. It stays unweighted on purpose, using the same frozen nearest labels.
- `palette-animation-cache.js`. Its key already holds post-limit colors and alphaMode.
- `palette-usage.js`, `save.js`, the GIF/PNG encoders and `Dock.svelte`.

**Behavior change to specify.**

- Switching Cut1 ↔ Keep will now regenerate Auto and refit caps. The spec currently says
  only sources, durations and Opacity cut refresh generation.
- Existing Keep users with small caps, or with Auto over more than 64 colors, will see
  different palettes after upgrading.

**Spec edits** in `docs/superpowers/specs/2026-10-06-colorfetti-app-design.md`:

- In the "Optional original opacity" paragraph, replace "without ... adding alpha
  weighting" with: Auto and subset fitting weight each alpha-positive pixel by its alpha.
  Matching, Cleanup and output alpha stay unweighted.
- In the Auto section, add "Cut/Keep mode" to the list of what refreshes generation.
- In the Max colors section, note that the limiter is weighted the same way.
- Keep the rule that a wholly faint asset still contributes one full asset mass.

**Minimal diff shape:** about 35–50 production lines across 10 files, with no new module,
setting or UI.

**Existing tests likely to need updating.** These are small edits, because every new
parameter defaults to unweighted:

- `palette-failure.test.js`, for the input shape and equality.
- Any `palette-generated.test.js` assertion on key format. Current tests compare keys only
  relatively, so they should pass.
- `palette-limit-client.test.js` / `palette-generated-worker.test.js`, only if they assert
  the exact `start` payloads. Today they send no flag, so the default stays valid.

**New tests needed:**

1. **Snapshot identity.** Keep and Cut1 keys differ for the same wall; Cut128 keys ignore
   mode. The limit-client cache runs separate jobs for Keep and Cut1 on the same
   item/palette/metric/cap and reuses them on a repeat.
2. **Opaque/binary exactness.** For opaque and binary-alpha sources, Keep's weighted
   output is byte-identical to the unweighted result (Auto, every cap, both metrics,
   dither).
3. **Auto All exactness.** With ≤ 64 visible colors, all colors are retained. This must
   include a single α=1 pixel in a 300×300 opaque asset, which exercises the zero-unit
   remainder case.
4. **Invariance.** Generator and limiter results do not change across chunk sizes (28 B
   vs 128 KiB), asset order or frame order. Duration weighting keeps working under
   opacity mass, and an all-faint asset still receives equal asset mass.
5. **Worker/fallback equality.** For the generator and the limiter with `opacityMass`,
   worker and cooperative fallback give the same colors and indices.
6. **Cancellation.** Canceling a Keep preview leaves a Cut1 export subscriber alone, and
   the reverse. Last-subscriber removal of unstarted jobs still works with the new key.
7. **Failure ownership.** A Keep limiter failure does not block, retry or retire for Cut1.
   Toggling the mode clears the obsolete failure correctly.
8. **Preview/export/Count parity.** Under Keep, `fullPaletteImage` and
   `collectPaletteUsage` give the same subset the Tile previews.
9. **Spill regression.** The alpha-1 spill fixture at Auto c3 restores the core. The
   cyan-halo fixture stays unchanged.
10. **Precision bound.** The ×255 mass with a maximum GIF delay keeps sums below 2^53, or
    fails with the existing safe-precision error and never silently degrades.

The real app also needs native PNG, preview and Count/Use checks on desktop and USB
Android, as the handoff requires.

**Risks.**

- **Identity drift.** Any path that forgets the flag makes preview and export disagree
  under Keep. The `fullPaletteImage` path and Tile are separate call sites.
- **Precision.** Mass ×255 costs about 8 bits of headroom. Generated within-asset `binAdd`
  is unchecked float addition. Very large or long GIFs could lose integer exactness before
  normalization; bound this or test it explicitly.
- **Cost of toggling.** Switching Cut1 ↔ Keep now costs a regeneration and refit.
- **User-visible change.** Palettes change for existing Keep users.
- **Known tradeoff.** A neutral soft shadow under a translucent colored subject can lose
  its slot at small caps (glass-orb).

**Size estimate:**

- Production: about 40 lines.
- Tests: about 200–300 lines across 6 files.
- Spec: about 10 lines.
- Device verification: one desktop and one Android pass.
- Total: about a day, including independent review.
