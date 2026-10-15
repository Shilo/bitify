# Keep opacity weighting: research decision

Date: October 15, 2026. Frozen product baseline: `310df63` (Claude's PNG/import fixes retained).

**Do not ship either blanket weighting candidate.** Linear alpha weighting fixes the
faint-pixel pollution example and is less destructive than squared weighting, but
independent testing found real output tradeoffs. The user's condition was improvement
without regressions. No production source, settings, worker protocol or specification
is changed by this spike.

## Question and scope

Palette Keep currently allows every alpha-positive source pixel equal influence when
Auto generates a shared palette and Max colors chooses a subset. An alpha-one surround
can displace opaque core shades at a small cap. The candidates change only the source
mass used by those two decisions: original mass, mass × alpha/255, or mass × (alpha/255)².
They retain raw RGB matching, original opacity, source-coordinate dithering and the
existing Cleanup algorithm. There is no new UI control or background assumption.

The experiment uses source copies, not a custom quantizer. `build-candidates.mjs`
records SHA-256 of both unchanged production modules and writes research copies with
an `alphaWeight` option. `none` is a control. Frame-duration weights still multiply
pixel mass. Auto's canonical integer normalization still gives every nonempty asset
the same total mass, including an all-faint asset. Cap targets retain original palette
identity/order and no candidate directly fits Auto to the cap. Cut would bypass the
candidate entirely; this spike does not infer Keep from alphaCut=1.

## Reproduction and retained evidence

All files below are under `bench/keep-alpha-weighting-spike/`:

- `build-candidates.mjs`, `source-hashes.json`, `palette-generated.candidate.js`,
  `palette-limit.candidate.js`: bounded research variants.
- `experiment.mjs`, `results.json`: 13 fixtures × Auto/fixed target × Oklab/RGB =
  52 rows, with baseline/control/linear/squared in every row, plus 72 exact control
  invariants. Auto cap is 3; fixed target is stable ID `preset-res64`, cap 4.
- `invariants.mjs`, `invariants-results.json`: 112 additional checks for source
  immutability, exact alpha, target membership, dithering, 28-byte chunk boundaries,
  wall/frame order, equal asset weighting, duration weighting and >4096-color bins.
- `negative-detail.mjs`, `negative-detail.json`, `visuals/`: straight RGB regional
  errors and native-size PNGs, plus four-times-nearest warm/cool/checker contact sheets.
- `performance.mjs`, `performance.json`: interleaved Node selector diagnostic.
- `browser-harness.html`, `browser-harness.js`, `serve.mjs`: visible Run control
  for research modules in real browsers. The loopback server permits only the exact
  research entry/candidate files and `src/lib/*.js`, and stores bounded JSON receipts.
  Root-owned Codex Browser / USB Android evidence is recorded separately.

Run `node bench/keep-alpha-weighting-spike/build-candidates.mjs`, then the individual
experiment/invariant/detail scripts. Start the browser harness with
`node bench/keep-alpha-weighting-spike/serve.mjs` and use
`http://127.0.0.1:5302/?device=codex` or `?device=android`.
The performance scripts must run separately from browser/device/performance work.

Fixtures combine original authored soft glows, shadows, antialiased edges, deliberate
translucent accents, all-faint fades, high-entropy art and tiny shared walls with the
retained original knight/glow/alpha-one spill sprites. The independent challenger froze
additional held-outs before seeing candidate results; see the adjacent independent
review and crosscheck artifacts, rather than treating the authors' fixtures as sufficient.

## Results and negative outcomes

The unweighted research control matches production on all 52 rows. All 72 baseline
Cut/opaque/binary comparisons and all 112 additional invariants pass. These module
checks do not establish worker/cache/UI/native decoder/export coverage.
For an entirely Cut-away Auto source, the research runner compares the empty palette
and an all-zero placeholder buffer; it does not claim the product exports an empty
Auto palette or bypasses its existing unavailable guidance.

Across the 52 primary rows, summing the independent composited Oklab error over
black/white/warm/cool surfaces gives:

| Candidate | Improved | Equal | Worse |
| --- | ---: | ---: | ---: |
| Linear alpha | 18 | 32 | 2 |
| Squared alpha | 18 | 31 | 3 |

Both linear negatives occur in `many-soft-colors`: an 80×64 original synthetic
spectrum with 5120 distinct RGBs, alpha 1–254, 2564 pixels at alpha ≥128 and no opaque
pixels. The high entropy forces the bounded histogram/bin path. The absolute changes
are modest but reproducible; the source was not edited to improve candidate results.

| Configuration | Composite channel RMSE, baseline → linear | Alpha ≥128 straight RGB RMSE |
| --- | --- | --- |
| Auto, cap 3, Oklab | 36.4166 → 36.8524 | 63.0266 → 63.7988 |
| Resurrect 64, cap 4, RGB | 30.3781 → 30.5197 | 52.6136 → 52.8612 |

Composite channel differences are identical across these constant backgrounds because
alpha is unchanged and the channel difference is alpha × RGB difference. Composited
Oklab errors vary by background and expose perceptual tradeoffs; neither metric is
universal art quality. Independent visual review also found reduced yellow/blue variety
in the fixed/RGB candidate. All native PNGs and enlarged sheets are retained.

The independent deliberate cyan halo is a more decisive negative for squared weighting:
at Auto cap 3 it sacrifices visible alpha-48 cyan, turning the halo gray. Its soft-region
channel RMSE rises from 0 to about 22.73 while overall error improves by helping the core.
Linear retains the cyan there. Overall average improvement must not hide loss of an
intentional translucent feature. The independent reviewer reproduced the author's two
linear negatives and agreed that a blanket candidate does not satisfy the ship gate.

## Performance and precision limits

The source copies preserve existing histogram/matrix bounds and cooperative yield
points. They add a fixed 256-entry Float64 opacity lookup table per accumulator/selection
and one multiply per eligible source pixel in weighted modes. No retained source copy,
additional image-sized array or new palette cache is added by the candidate change.

The coarse full-pipeline Node 1 Mi-pixel four-color warm diagnostic gives medians
46.6 ms baseline and 39.5 ms linear, but a high-entropy diagnostic is heavily variable.
The subsequent interleaved selector-only runs vary from 381 to 2183 ms even for
baseline/control with the same two swaps. These samples overlap other workstation
activity and do **not** establish attributable candidate overhead, a mobile budget,
or a speed improvement. No performance claim justifies shipping a quality regression.

Browser decoding can already round faint RGB differently. Opacity weighting reduces
their influence but does not recover original PNG colors, guarantee cross-engine Auto
identity, or fix native clipboard rounding. Those are distinct limits.

## Decision and next boundary

Research and independent challenge were bounded to two review rounds. Keep the current
product behavior. Do not add a threshold guard tuned to these examples, silently change
Cleanup, introduce a background-specific objective, or add a weighting slider.

A future change needs held-out real Keep artwork that establishes the desired tradeoff
for intentional halos, glows and shadows, plus an explicit acceptance decision about
their importance relative to opaque details. The present spike supplies counterexamples
and reproducible artifacts for Claude; repeating the same candidates or another broad
review is not the next step. No paid service calls were necessary for this local question.
