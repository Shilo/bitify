# Alternative palette matching research

October 16, 2026. Research and review only. No production implementation.

**Closed — no implementation planned.** The user confirmed this disposition after the independent challenge. See the [complete spike record and final decision](2026-10-16-palette-matching-spike.md). Any future evaluation or implementation discussed below is conditional research context, not a scheduled next step.

## Decision

**Revised after the requested independent challenge: defer CAM16-UCS. Keep Oklab and RGB in the product.** The initial conclusion was “worth adding”; that recommendation exceeded the practical evidence. The [independent challenge](2026-10-16-cam16-independent-challenge.md) reproduced 816 finalist renders, checked primary research and adoption claims, and identified clearer shading-loss counterexamples. CAM16-UCS is worth a focused artist comparison, but has not yet earned another product setting. The measurements below remain unchanged.

ΔE OK2 remains a strong inexpensive comparison control. It shares some of CAM16's shade losses and does not automatically earn a setting instead. CIEDE2000 is the most interesting more expensive alternative, but its additional color-fidelity benefit does not justify its search cost and integration complexity for this browser app at present. Do not present it as universally “higher quality.”

The earlier brightness spike tested removing color information. This broader experiment tests different models of full-color difference and different matching objectives. Another mode offers a plausible tradeoff: closer source color families while sometimes merging shading steps. Repeated practical preference for that tradeoff remains unestablished. Numerical novelty and favorable color-error scores alone do not meet the protocol's usefulness requirement.

The [interactive browser comparison](../../bench/matching-alternatives-2026-10-16/review.html) supports all 47 inputs and twenty methods. Serve it with the reproduction commands below. The [accessory-sheet browser evidence](../../bench/matching-alternatives-2026-10-16/output/browser-accessories.png) shows the finalists beside the original and both current modes.

## What was researched and tested

The [experiment protocol](../../bench/matching-alternatives-2026-10-16/PROTOCOL.md) declares the methods, source groups, objectives, and stability checks. The principal matrix contains **47 images or frames × twelve current presets × twenty methods = 11,280 renders**.

The inputs comprise the five original sprite sheets; twelve additional real sprites with pre-existing annotations for materials and details; eight real-art effect fixtures; two trailer scene captures; six real animation frames; four synthetic GIF frames; nine authored counterexamples; and one real-art montage. The prior annotated manifest supplies provenance, licenses, source hashes and intent labels. The montage is kept separate from quality means to avoid treating assembled repeated art as independent evidence.

All principal comparisons use full source resolution, Cut128, All colors, Cleanup Off and Dithering Off. Exact source RGB already in the active palette remains unchanged. Outputs always use target-palette RGBs. The source PNGs are decoded through the product's existing native decoder in the browser; no grayscale or canvas readback step enters matching.

The matrix is a convenience sample of available assets, not a representative artist preference study. The twelve additional real sprites provide a second asset group; they were not used to tune the coefficients. Their existing annotations identify intended objects, but do not establish that one recoloring is artistically preferred.

## Candidate comparison

| Method | What changes | Decision for Colorfetti |
| --- | --- | --- |
| Current Oklab | Euclidean distance in L, a, b | Retain as the balanced default |
| Current RGB | Encoded sRGB channel distance | Retain existing behavior |
| CAM16-UCS | Appearance-model coordinates with a simple Euclidean distance | Credible experimental candidate; defer product setting |
| ΔE OK2 | Double Oklab a and b before distance | Low-complexity control for a practical preference comparison; defer |
| CIEDE2000 | Pair-dependent correction to CIELAB color differences | Useful differences, expensive search; defer |
| HCT with UCS-style distance | CAM16 chromatic coordinates with CIE L* tone | Competitive, but insufficient reason to prefer this modified distance over CAM16-UCS |
| CIELAB ΔE76 | Simple distance in D50-adapted Lab | Distinct, but weaker tradeoff than the finalists |
| CIELUV distance | Simple distance in L*, u*, v* | Distinct, but no compelling advantage in the tests |
| IPT | Opponent space intended to model hue well | No winning overall tradeoff here |
| Jzazbz | HDR-oriented coordinates, with 203 cd/m² media-white assumption | No relevant advantage over finalists for current sRGB palette output |
| ICtCp ΔE ITP | HDR-oriented distance | No convincing advantage for this task |
| Redmean RGB | Inexpensive channel weighting depending on mean red | Mostly overlaps RGB; too little unique benefit |
| Linear RGB | Compare light quantities after decoding sRGB | Not a perceptual matching improvement in this corpus |
| Oklab hue priority | Increase squared hue contribution fourfold | Useful locally, less robust across the tested cases than CAM16 |
| Oklab chroma priority | Increase squared chroma difference fourfold | No consistent additional purpose established |
| Oklab lightness priority | Increase squared L difference fourfold | The earlier tone-versus-color compromise remains; not selected |
| Oklrab | Revised lightness transform before distance | Mostly redundant and no clear overall gain |
| Helmlab | Recent analytical model and pair-dependent distance | Experimental; no compelling cross-metric win here, higher complexity |
| Equivalent OKLCH distance | Express the Oklab distance in polar coordinates | Zero changed output pixels; redundant |
| Edge-aware mapping prototype | Optimize source-color labels using neighbor contrast and point error | Improves boundary retention but distorts colors and depends on image context; reject this prototype |

Color-space names alone do not define a matcher. In particular, taking ordinary distance between hue degrees, chroma and lightness mixes incompatible units and mishandles hue near neutral colors. A correct equivalent OKLCH calculation uses a chroma-weighted hue chord:

```
d² = ΔL² + ΔC² + 2 C1 C2 (1 − cos(Δh))
```

That is algebraically the same as Oklab distance. The equivalent control changed zero output pixels across this experiment. A distinct OKLCH mode requires a different weighting or rule, not just a change of coordinates. [Oklab's original description](https://bottosson.github.io/posts/oklab/) defines the Cartesian and polar relationship.

ΔE OK2 instead uses `ΔL² + 4Δa² + 4Δb²`. [Color.js documents the implementation and its rationale](https://github.com/color-js/color.js/blob/main/src/deltaE/deltaEOK2.js). Doubling the axes quadruples their squared contribution. This gives chromatic agreement more influence without the previous brightness-only information loss.

## Results across the original and annotated real sprites

The following means cover seventeen real sprite inputs and all twelve presets: **204 cases per method**. Each case averages its source pixels, then each source/palette case receives equal weight. Lower color and tone errors are better for the named objective. Percent changed measures output labels versus current Oklab.

| Method | Changed | Different from both current modes | Mean ΔE2000 | Mean CAM16-UCS distance | Mean absolute Oklab L error | Source edges merged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Oklab | 0% | 0% | 17.39 | 18.93 | 0.0801 | 21.2% |
| RGB | 14.5% | 0% | 17.76 | 19.37 | 0.0898 | 22.8% |
| OK2 | 12.5% | 9.1% | 17.03 | 18.64 | 0.0915 | 23.3% |
| CAM16-UCS | 13.3% | 9.7% | 16.77 | 18.49 | 0.0907 | 23.2% |
| CIEDE2000 | 20.4% | 16.5% | 16.57 | 18.70 | 0.0969 | 25.0% |
| Hue priority | 11.5% | 9.6% | 16.94 | 18.73 | 0.0887 | 22.9% |

These measures intentionally disagree. CIEDE2000 necessarily favors the CIEDE2000 nearest matcher, and CAM16-UCS necessarily favors the CAM16-UCS nearest matcher. CAM16 also improves the independent ΔE2000 score here; its advantage is not supported only by its own objective. Conversely, Oklab retains lower tone error and fewer merged edges. None of these measures is an artist preference score.

For the specific goal of matching colored palettes, a separate view uses the six multicolor presets: Resurrect 64, ENDESGA 32, mulfok32, PICO-8, DawnBringer 16 and ENDESGA 8. This contains **102 cases**, using the same seventeen sprites. It excludes grayscale, two-color and handheld ramps; all-preset results above remain the primary broad comparison.

| Method | Changed versus Oklab | Different from both | ΔE2000 | CAM16-UCS distance | L error | Edges merged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Oklab | 0% | 0% | 11.67 | 12.27 | 0.0394 | 7.8% |
| RGB | 17.6% | 0% | 12.10 | 12.77 | 0.0474 | 8.3% |
| OK2 | 15.6% | 10.2% | 11.11 | 11.80 | 0.0509 | 11.3% |
| CAM16-UCS | 20.9% | 16.6% | 10.69 | 11.59 | 0.0534 | 10.5% |
| CIEDE2000 | 31.2% | 25.9% | 10.36 | 11.93 | 0.0613 | 13.4% |

CAM16 lowers ΔE2000 by about 8.4% and CAM16-UCS error by 5.6% in this view. It also raises L error by about 35.6% and merges an additional 2.7 percentage points of tested source edges. This establishes a measurable tradeoff, but neither a default replacement nor sufficient practical benefit for an optional setting.

CAM16 beats the better of Oklab and RGB by more than 1% on both color-error measures in 61 of those 102 cases. OK2 does so in 48 and CIEDE2000 in 48. Those thresholds are descriptive comparisons, not a perceptual acceptance threshold or a count of images that artists would prefer. In the all-preset view, CAM16's corresponding count is 73 of 204.

The [decision summary](../../bench/matching-alternatives-2026-10-16/output/decision-summary.json) retains both views. [Results](../../bench/matching-alternatives-2026-10-16/output/results.json) retain all twenty methods and separate original-sheet, annotated-sprite, effect, scene, animation and synthetic groups.

## What the images show

**The accessory sheet supports a useful color-fidelity alternative.** With ENDESGA 32, CAM16 changes 35.6% of visible labels, lowers ΔE2000 from 10.12 to 8.61, and lowers CAM16-UCS error from 10.85 to 9.79. The overall material colors remain recognizable. Some adjacent shades merge: used colors fall from 25 to 23. This is a different compromise from the brightness-only rainbow bands in the earlier experiment. The [browser comparison](../../bench/matching-alternatives-2026-10-16/output/browser-accessories.png) includes all finalists and an edge-aware failure for comparison.

**CIEDE2000 can make the most visibly distinct useful choice.** On the annotated archer with PICO-8, it replaces the blue-biased hood with a red-purple hood closer to the original brown-red family. Oklab and CAM16 produce identical output in this particular case. CIEDE2000 improves its own metric but slightly worsens CAM16 error and reduces the used-color count from seven to six. The [archer browser comparison](../../bench/matching-alternatives-2026-10-16/output/browser-archer-pico8.png) is evidence for this local benefit, not a universal superiority claim.

**A better color score can erase shading.** The platformer pilot with ENDESGA 32 uses seven colors with Oklab and six with CAM16 or CIEDE2000. ΔE2000 falls from 7.08 to 6.79, while the source-edge merge fraction rises from zero to about 4.2%. The [pilot browser comparison](../../bench/matching-alternatives-2026-10-16/output/browser-pilot.png) records this limitation. Matching still has no understanding of a visor, eye, face or intended material ramp.

**Many exact-palette sprites should remain unchanged.** Several Kenney fixtures already use colors present in ENDESGA 32. Their exact entries bypass all distance formulas. Ten annotated real sprites have identical CAM16 and Oklab output for that preset; other nonexact colors can also receive the same nearest choice. This is correct preservation, not a failure to make an effect visible.

**Edge preservation is a different algorithmic objective.** The exploratory graph heuristic reduces merged edges in the original sheets from 30.8% to 23.9%, but worsens color errors and can assign unrelated hues. On the breastplate it produces visible colored artifacts. The [region-recoloring literature](https://graphicsinterface.org/proceedings/gi2021/gi2021-09/) supports preserving neighbor relationships as a distinct objective; this prototype is not a reproduction of that paper's segmentation and spanning-tree method. A context counterexample maps the same dark RGB differently against two different neighboring backgrounds. That violates the consistency users currently get from fixed-palette pointwise matching and can matter in animations.

Color transfer, palette editing and ramp detection are also different workflows. The [Princeton palette-based recoloring work](https://gfx.cs.princeton.edu/pubs/Chang_2015_PPR/chang2015-palette_small.pdf) transforms colors through a user-edited palette rather than simply choosing an existing target entry. [The TU Delft ramp-detection thesis](https://repository.tudelft.nl/record/uuid:259633b8-22b1-44d5-a91a-d6def7ad048a) uses perceptual and adjacency relationships with user control. These are relevant future directions, but their existence does not validate a drop-in Matching option. Neither paper's complete system was implemented here.

## Stability and mathematical validation

The [stress results](../../bench/matching-alternatives-2026-10-16/output/stress.json) perturb each original-sheet source RGB channel by ±1, weighting colors by their frequency within a case, then giving cases equal weight.

| Method | Changed output selection | Output jump at least 0.1 Oklab distance |
| --- | ---: | ---: |
| Oklab | 0.72% | 0.57% |
| RGB | 0.62% | 0.52% |
| OK2 | 0.82% | 0.67% |
| CAM16-UCS | 0.85% | 0.59% |
| CIEDE2000 | 1.31% | 0.93% |
| Hue priority | 0.92% | 0.72% |

CAM16 is slightly more sensitive to these perturbations than Oklab, while its large-jump rate is close in this test. Every pointwise candidate retained its parent palette color for all 1,095 valid one-byte neighbors of preset colors. All exact target members remained exact. Candidate palette-reorder probes use canonical RGB order for equal distances; Oklab and RGB controls retain production first-minimum handling. Reordering test palettes therefore does not redefine the baseline oracle.

Both the library CIEDE2000 and a separate direct squared-distance kernel pass the [author's 34 reference pairs](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/), within the published four-decimal rounding. The direct kernel also agrees with the library on 4,096 independent RGB pairs, with maximum ΔE difference below 1e-12. The source paper documents real implementation pitfalls and small discontinuities; correctness was checked rather than inferred from a few familiar color examples.

Two independent CAM16 implementations, Google's Material Color Utilities and Color.js, agree on 512 identical XYZ inputs under identical viewing conditions, with maximum UCS-coordinate difference below 2e-13. A 33×33×33 sRGB cube gives 35,937 finite-coordinate checks, and the 256-step gray axis is monotonic in J*. No inverse conversion or gamut mapping is required: matching only selects existing RGB entries.

CAM16 does require fixed viewing assumptions. This spike uses Material Color Utilities' default sRGB-like conditions: D65, adapting luminance about 11.73 cd/m², background L* 50, average surround, and no illuminant discounting. These are assumptions, not measurements of the user's room. Altering the assumptions to a dim or bright test environment changes selected labels by averages of 8.7% or 3.2% respectively across the original-sheet/preset cases. A production mode should fix and document one set of conditions, rather than change with app theme or guessed ambient light. [Google's CAM16 implementation](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/hct/cam16.ts) explains the model and its UCS coordinates.

The black, white, neutral, saturated, exact-member and equal-lightness counterexamples are included in the matrix. Fixed source RGB maps consistently for the pointwise modes. These checks establish deterministic numeric behavior in the tested domain; they do not promise no visible flicker when source colors themselves change between frames.

## Browser verification and runtime cost

Codex's in-app browser rendered the candidates from native-decoded PNG pixels and operated the source and palette controls. The [browser receipt](../../bench/matching-alternatives-2026-10-16/output/browser-receipt.json) reports zero failures:

- 1,128 exact production baseline index comparisons: two modes × 47 inputs × twelve palettes.
- 940 candidate RGBA hash comparisons: twenty methods × 47 inputs with ENDESGA 32, against the Node matrix.
- 940 Keep-alpha comparisons and 47 source-decoder byte comparisons.
- 34 CIEDE2000 reference-pair checks and matching direct/library nearest-winner checks in the finalist kernel benchmark.

The browser also timed seven runs of 512 unique source colors against 64 target entries, using already-transformed coordinates. This isolates the search loop from decoding and color-space conversion.

| Search kernel | Median time |
| --- | ---: |
| Oklab | 0.4 ms |
| OK2 | 0.3 ms |
| CAM16-UCS | 0.5 ms |
| CIEDE2000 through Color.js | 22.3 ms |
| Separate direct CIEDE2000 kernel | 6.1 ms |

Sub-millisecond differences are close to timer resolution and should not be ranked precisely. The direct CIEDE2000 implementation avoids much of the library wrapper cost, but remains about fifteen times the Oklab kernel time in this benchmark. This is evidence of a significant search cost, not a claim that no further optimization is possible.

Cold prototype transforms of 4,096 colors took medians of about 0.7 ms for Oklab/OK2, 1.2 ms for CAM16 and 10.7 ms for the library's D50 Lab path. The library conversion timing includes object and conversion-framework overhead, so it is not the unavoidable mathematical cost of CIELAB. Full research mapping plus pixel painting took about 0.1 ms on the general sheet for Oklab/OK2/CAM16 and 2.8–2.9 ms on the town capture. CIEDE2000's library path took about 4.9 and 8.3 ms respectively. Those two assets have few unique source colors and many repeated pixels, so caching helps them substantially.

Photos and large walls can have many more unique colors, and production intentionally bypasses an ineffective RGB memo cache. The cheap CAM16 coordinate search fits that existing architecture more directly than a pair-dependent CIEDE2000 search. These are desktop prototype measurements. Physical-phone latency, full-wall memory, Safari, and end-to-end candidate exports were not validated.

## Auto and color-limit probes

The [integration probes](../../bench/matching-alternatives-2026-10-16/output/integration-probes.json) exercise the proposed coordinate objectives independently of product UI. A guarded copy of the existing limiter replaces only the coordinate conversion and validation for CAM16/OK2. It leaves source code untouched. Sixty Oklab/RGB subset selections match the original limiter exactly.

Five original sheets, three preset palettes, two budgets (4 and 8), and four modes produce **120 subset cases**. All subsets stay within the target palette and budget. Average ΔE2000 is 14.24 for Oklab, 13.27 for OK2 and 12.50 for CAM16. CAM16 also merges more edges, 29.8% versus 21.8% with Oklab. A small budget makes the color-versus-shading tradeoff stronger; it is not a fix for lost eyes or other intentional rare details.

An unchanged production Auto generator fits one shared 64-color palette across all five sheets. With that same palette frozen for all modes, CAM16 lowers mean ΔE2000 from 3.96 to 3.64 and CAM16 error from 4.23 to 3.97. It raises L error from 0.0119 to 0.0181 and edge merging from 0.77% to 1.61%. Matching should continue to leave Auto generation independent of the selected metric.

These limiter and Auto probes run in Node. The app's full candidate worker, snapshot, dither, Cleanup, cache and export integration remains future implementation work. Existing ordered dithering scores mixtures in Oklab and Cleanup applies Oklab gates; adding CAM16 must explicitly preserve or revise those policies. A new metric button alone would be incomplete.

## Why the other spaces do not earn more settings

The established full-color alternatives were tested rather than dismissed on age or name. Lab, Luv, IPT and the HDR-oriented spaces change pixels but do not offer a better purpose/cost/quality tradeoff than the finalists in this corpus. HCT's tested UCS-style distance is competitive; its tone substitution brings little reason to prefer it to CAM16-UCS itself. HCT is not compared by treating hue degrees as an ordinary Cartesian coordinate.

Redmean is fast, but only 1.7% of original-sheet outputs on average differ from both Oklab and RGB; that is weak justification for another control. Oklrab similarly changes little uniquely. The [redmean author's discussion](https://compuphase.com/cmetric.htm) presents it as an inexpensive approximation. It does not establish superiority over modern perceptual models.

Jzazbz and ICtCp address HDR and absolute-luminance considerations that the current decoded sRGB-to-fixed-palette workflow does not expose. [Color.js's color-difference guide](https://colorjs.io/docs/color-difference) describes that distinction. Their inclusion here does not simulate HDR output; the tested conversion assumes 203 cd/m² media white.

[Helmlab](https://arxiv.org/abs/2602.23010) is a recent data-driven proposal aimed at color-difference prediction and UI color systems. The tested implementation is pinned to Color.js 0.7.1. Its extra complexity and local cross-metric results do not establish a reason to deploy it in this app. A paper's dataset score is not a substitute for sprite matching evidence.

The hue/chroma weighting prototypes have understandable artistic objectives, but add arbitrary coefficients and do not beat CAM16's combined evidence. The best reason to add an artistic ramp or controlled color-remapping workflow would be a separate demonstrated task; it should not be disguised as another technical color-space name.

## Deferred implementation considerations

Do not implement a third matching choice from this spike. First compare anonymized outputs on a holdout set from additional independent artists and custom palettes, including favorable material-color cases and the shield/heart/pilot failures. Determine whether CAM16 repeatedly supplies a desired result beyond Oklab, RGB and the simpler OK2 control. “Favors close-looking colors” is not yet an adequate explanation of when to choose CAM16 over an already perceptual Oklab matcher. Avoid the names “Accurate,” “Best,” or “Perceptual” as exclusive quality claims.

If that practical evaluation succeeds, a later implementation would need fixed viewing conditions, exact RGB passthrough, source alpha, stable ties and cooperative cancellation. It would need one authoritative transform for nearest matching and subset selection, metric identity in every preview/export/cache snapshot, storage normalization, and compact labels. The research dependencies are not a production dependency decision.

Any later implementation would also need combined cap, dither, Cleanup, preview/export agreement and physical-phone measurements. These are distinct from the unresolved practical usefulness question. The next useful research is a bounded artist comparison, rather than another open-ended search for color spaces. The [challenge report](2026-10-16-cam16-independent-challenge.md) also corrects the standards and adoption distinctions: CIECAM16's appearance-model report does not establish that the tested CAM16-UCS implementation is a published CIE uniform-space standard, and Google's use of CAM16/HCT for UI colors does not establish its use for image quantization.

## Reproduction

From the repository root:

```powershell
npm install --prefix .tmp/matching-alternatives --no-audit --no-fund --ignore-scripts colorjs.io@0.7.1 @material/material-color-utilities@0.4.0
node bench/matching-alternatives-2026-10-16/run.mjs
node bench/matching-alternatives-2026-10-16/stress.mjs
node bench/matching-alternatives-2026-10-16/kernel-validation.mjs
node bench/matching-alternatives-2026-10-16/integration-probes.mjs
node bench/matching-alternatives-2026-10-16/summarize.mjs
node bench/matching-alternatives-2026-10-16/serve.mjs
```

Open `http://127.0.0.1:5372/` and select **Verify in this browser**. The prior brightness spike's generated RGBA references must exist; regenerate them with its `run.mjs` if needed. Generated PNG/RGBA source references are ignored by Git. The dependency lock, complete metrics, receipts, source hashes and browser screenshots remain with the spike. Source hashes matched at the end of testing.

Only this report, the isolated research harness and its temporary dependencies were added for this request. Production source, package dependencies, specification and deployment were not changed; unrelated working changes were preserved.
