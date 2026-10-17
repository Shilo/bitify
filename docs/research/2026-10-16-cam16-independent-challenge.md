# Independent challenge: should Colorfetti add CAM16-UCS?

October 16, 2026. Requested independent sub-agent review and research. Research only; no production changes.

**Closed — no implementation planned.** The user accepted deferral after this review. The [complete spike record](2026-10-16-palette-matching-spike.md) governs the final disposition. The conditional reconsideration criteria below do not create follow-up work.

## Verdict: defer the setting

**CAM16-UCS is a credible candidate, but the prior recommendation to add it is stronger than the practical evidence supports.** Retain it in the research comparison. Do not add it to the product yet. The outstanding question is whether users repeatedly prefer its particular tradeoff enough to justify a third technical matching choice. More color-space searches or more copies of the same fixtures will not answer that question.

This is not a finding that CAM16-UCS is obscure pseudoscience, mathematically unsound, or redundant. There is real perceptual research, real implementation adoption, and real output distinctness. The experiment also exposes significant shade losses, modest practical evidence, and an explanation problem: both Oklab and CAM16-UCS already seek perceptual color similarity. “Favors close-looking colors” does not clearly tell an artist when to choose one.

No different candidate currently earns automatic promotion instead. OK2 is simpler but shares much of the same color-versus-shading compromise. CIEDE2000 has interesting cases and greater search cost. Neither substitutes for evidence of a desired workflow.

## What it means, in ordinary language

A palette matcher needs a rule for measuring how far the source color is from each available palette color. Oklab and CAM16-UCS both supply three coordinates so the matcher can choose the closest point.

CAM16 is a **color appearance model**: starting with physical color measurements and assumed viewing conditions, it estimates attributes such as lightness, hue, and colorfulness. CAM16-UCS reshapes some of those outputs so ordinary distances better approximate perceived color differences. “UCS” means uniform color space. It is a full-color distance model, not a brightness-only mode, not a neural model, and not an artistic interpretation of materials. The proposed matcher still makes an independent nearest-color decision for each source RGB. [Original CAM16/CAM16-UCS paper](https://doi.org/10.1002/col.22131)

## Standards: three names that must not be conflated

| Name | Established fact | Implication for this proposal |
| --- | --- | --- |
| CAM16 / CAM16-UCS | Published research model and associated color-difference space from 2017. | This is the family implemented by the pinned Google dependency in the spike. |
| CIECAM16 | CIE 248:2022 recommends a color appearance model based on CAM16, superseding CIECAM02. It is a CIE Technical Report. | The appearance model has formal CIE backing. That does not automatically standardize every associated distance or implementation. |
| CIECAM16-UCS | CIE TC 1-100 publicly describes the work of recommending CAM16-UCS as the CIE uniform color space under this name. | Do not describe the tested Google CAM16-UCS implementation as an already published CIE uniform-space standard. |

The CIE's public publication and committee pages support this distinction. I did not purchase or inspect the paywalled full Technical Report, and the committee's continuing public scope is not proof that no unpublished decision exists. [CIE 248:2022](https://cie.co.at/publications/cie-2016-colour-appearance-model-colour-management-systems-ciecam16), [CIE TC 1-100](https://www.cie.co.at/technicalcommittees/recommend-cam16-ucs-cie-uniform-colour-space)

This is more than inconsistent naming. A development paper by Gao and colleagues explains two changes from original CAM16 to CIECAM16: the nonlinear luminance-adaptation extension and the chromatic-adaptation normalization/transform. These matter to exact conformance claims. They do not by themselves show that the proposed ordinary sRGB matcher will behave badly. [Development of CIECAM16, 2025](https://doi.org/10.1002/col.22959)

**Recommended wording:** “A research-backed perceptual color-difference space derived from CAM16.” Avoid “the standardized replacement for Oklab,” “the industry standard for sprite matching,” or “Google's preferred image quantization space.” Those claims are unsupported.

Formal status is a reason to be precise, not a veto. Oklab itself originated in its author's published work rather than a CIE color-space recommendation. Requiring formal CIE status only of a challenger would be an inconsistent standard; practical fitness still decides.

## Is it actually used, and what does that prove?

Google Material Color Utilities provides CAM16, its UCS coordinates, a distance function, and HCT. That is meaningful adoption and an implementation source. HCT combines CAM16 hue and chroma with CIELAB L* tone; HCT is not the same coordinate system as CAM16-UCS. [Google CAM16 source](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/hct/cam16.ts), [Google HCT source](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/hct/hct.ts)

The workflow distinction is decisive: Material's image extraction quantizes an image, scores possible theme seeds, and generates UI schemes. Its current WSMeans image quantizer uses **LabPointProvider**, not a CAM16-UCS point provider. This does not refute CAM16-UCS nearest matching; it does refute using Material adoption alone as evidence that this exact sprite-recoloring algorithm is established. [Official extraction workflow](https://github.com/material-foundation/material-color-utilities/blob/main/concepts/color_extraction.md), [WSMeans implementation](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/quantize/quantizer_wsmeans.ts)

I found evidence for color science, appearance reproduction, libraries, and UI color systems. I did not find primary evidence establishing CAM16-UCS as a popular fixed-target sprite quantization choice. That is a bounded research finding, not a claim that nobody uses it for that purpose. Popularity is neither a necessary nor a sufficient shipping criterion.

## Research for it, and legitimate research against it

There is substantial positive evidence: Luo and colleagues compared seventeen models on twenty-eight visual datasets, covering small and large differences and surface and display colors. Their analysis ranks CAM16-UCS highly, including its original form. They also examine versions with parameters fitted per dataset. These are genuine observer-derived color-difference data, much stronger than merely citing a library README. They are not observer judgments of recolored sprites, preserved material ramps, or preferred game art. The study also notes overlap between model-development and evaluation datasets; fitted variants cannot automatically be treated as the fixed Google implementation. [2023 comprehensive comparison](https://doi.org/10.1002/col.22844)

There is also a relevant critique. Hellwig and Fairchild discuss the mixture of relative lightness and luminance-dependent colorfulness, and a statistical issue with power-compressed differences. They propose revised spaces and report no significant difference between traditional and revised CAM16-UCS on their comparison; CIEDE2000 wins most of their tested subsets. That is evidence against categorical “best model” claims, not evidence that Colorfetti must reject CAM16-UCS. [Revising CAM16-UCS, 2022](https://library.imaging.org/admin/apis/public/api/ist/website/downloadArticle/cic/30/1/48)

The power-compression objection needs a precise qualification: Google's `1.41 × distance^0.63` is strictly increasing. Removing it cannot change the nearest palette winner for an individual pixel. The spike's squared Euclidean ranking is therefore not invalid merely because it omits the compression. Power compression *can* affect reported average scores or a summed global objective such as subset fitting; coordinate-squared subset error should be described as that chosen objective. The critique is not a newly discovered winner-selection bug.

Oklab's author also discusses CAM16-UCS's strengths and limitations, and used CAM16-generated lightness/chroma constraints when deriving Oklab. Thus this candidate is a different perceptual compromise, not an entirely independent philosophy of color. Blending and inverse-transform criticisms are much less relevant to fixed-palette nearest matching, which requires neither operation. [Oklab derivation](https://bottosson.github.io/posts/oklab/)

## Independent test audit

I read the protocol, matcher, metric collection, numerical stress tests, limiter probes, and prior report. I reran **816 finalist renders**: seventeen real sprite inputs × twelve palettes × Oklab/RGB/OK2/CAM16-UCS. Every output hash and the tested diagnostics reproduced the saved results. This verifies reproducibility using the shared implementation; it is not an independently coded color model or a new human preference study. Reproduction and results are in [audit.mjs](../../bench/cam16-independent-challenge/audit.mjs) and [audit.json](../../bench/cam16-independent-challenge/audit.json).

The strongest supportive result survives challenge. For the 102 combinations using the six multicolor palettes, CAM16's mean source hue diagnostic improves in 64 combinations and worsens in zero; mean CIEDE2000 error improves in 77. These counts use descriptive differences above numerical tolerance, not perceptual significance thresholds. They support a plausible color-family objective. They do not say that 77 images look better.

The strongest negative result is also substantial. In those same 102 combinations, measured edge merging is worse in **48**, better in **13**, and unchanged in 41. Dominant-color collision counts between the predefined named regions are unchanged in every multicolor combination; that particular annotation diagnostic does not establish an advantage for semantic detail. The diagnostic itself is coarse: retaining different dominant colors does not prove all details survive.

Across all twelve palettes, 65 of 204 CAM16 cases reproduce Oklab exactly. With ENDESGA 32, ten of seventeen inputs are identical. Exact palette membership explains some of that correctly. It limits how broadly a new mode supplies useful changes, but it is not a defect: exact matches should remain exact.

### Counterexamples stronger than the original report's pilot example

| Source and target | Oklab | CAM16-UCS | Why it matters |
| --- | --- | --- | --- |
| Dungeon neutral shield → Resurrect 64 | Three output colors; 0% counted edges merged; ΔE00 7.62 | Two colors; 45.45% merged; ΔE00 6.61 | A closer pixel-average score removes a whole metal shading step even with 64 target choices. |
| Platformer heart → mulfok32 | Three colors; 0% merged; ΔE00 15.27 | Two colors; 16.67% merged; ΔE00 14.65 | The highlight/body distinction collapses. OK2 has this same loss. |
| Platformer pilot → ENDESGA 8 | Four colors; 50% merged; ΔE00 18.23 | Three colors; 70.14% merged; ΔE00 16.79 | More uniform green can look more faithful as a color family while flattening face/visor shading. |

These edge percentages count the protocol's qualifying visible source adjacencies, not all pixels and not perceived severity. Nevertheless the shield's exact mapping is unambiguous: source `#8b9bb4` and `#c0cbdc` both become `#9babb2` in CAM16. Oklab, RGB, and OK2 keep separate output shades on this case. The “closest color” result and an artist's desired result can disagree.

I visually inspected the existing accessory and pilot browser screenshots. The accessories show plausible closer material colors with subtle shading changes. The pilot comparison visibly removes the cyan upper visor highlight with CAM16; the face retains recognizable features. These are qualitative observations by one reviewer, not blinded or independent artist votes. The parent reviewer independently confirmed the flattened shield ramp and heart shade step using Codex browser controls: [fresh shield evidence](../../bench/matching-alternatives-2026-10-16/output/browser-challenge-shield.png), [fresh heart evidence](../../bench/matching-alternatives-2026-10-16/output/browser-challenge-heart.png).

The parent's additional output-distance probe found that most output-label changes also represent meaningful numerical color-distance changes: the distinctness should not be dismissed as an index-count artifact. Its thresholds are descriptive, not validated visibility or desirability thresholds. [Novelty probe](../../bench/matching-alternatives-2026-10-16/output/novelty-probe.json)

## What the existing evidence does and does not establish

1. **11,280 renders are coverage, not 11,280 independent quality judgments.** Forty-seven inputs include animation frames, montages, synthetics, and related assets. The central sprite quality comparison has seventeen inputs, including twelve Kenney sprites from three packs and two poses of the same pilot. Their shared source colors, artist, and repeated target palettes make many comparisons strongly related.
2. **Metrics provide objectives, not approval.** CAM16 necessarily wins its own nearest-distance score. An improvement in independently computed ΔE00 provides corroboration, but correlated perceptual metrics are not independent observers, and neither metric values intentional shading or character features. The protocol explicitly requires repeated visual benefit and says numerical novelty is insufficient.
3. **Mean errors conceal concentrated loss.** Improvements across abundant flat regions can dominate a tiny but important highlight. The shield is the cleanest demonstration. Avoid reporting the 8.4% ΔE00 improvement without the roughly 35.6% greater mean Oklab-lightness error and increased edge merging on the same multicolor comparison.
4. **Distinctness is real but not a user purpose by itself.** A mode that changes 20% of pixels might be useful; it might merely create another trial-and-error button. Artists should be able to predict when it helps without knowing appearance-model acronyms.
5. **Numerical checks are strong within their scope.** Exact membership, opacity, determinism, reference pairs, and independent CAM implementations support algorithmic competence. They do not establish a preferred appearance, every custom palette, every 256-color target, or shipping integration.

## Stability, runtime, and product cost

Fixed viewing conditions are a reasonable way to make a deterministic tool. They are assumptions, not sensing or correcting the user's room. The prior perturbation rates and implementation agreement provide no reason to call this candidate numerically broken in the current sRGB domain. Changing conditions also changes results, so production must freeze and version the chosen convention rather than vary it with app theme. This is a maintenance choice, not necessarily a blocker.

The cheap three-coordinate search is a genuine advantage over CIEDE2000. However, sub-millisecond search timings with preconverted colors do not characterize the complete feature. A production path needs coordinate conversion, low-allocation pixel loops, lazy import behavior, cancellation, limiter consistency, cache and storage identity, ordered-dither policies, Cleanup gates, and exact preview/export agreement. The Google prototype creates objects that should not simply be copied into every pixel of a high-entropy photograph. None of this is evidence that integration is impossible; it prevents treating integration as a free third button.

Oklab mixture scoring and Cleanup gates already coexist with RGB matching, so hybrid policies are not uniquely disqualifying for CAM16. They still need a deliberate contract and tests for the new mode. Phone/full-wall/high-entropy timing and end-to-end integration remain unmeasured, as the original report itself acknowledges.

## What would change this verdict

Use a bounded practical evaluation, not another broad color-space tournament:

1. Freeze a holdout set from additional independent pixel artists and custom palettes, including the shield, heart, pilot, and existing favorable accessory case. Review at native size and enlarged. Keep repeated animation poses grouped as one asset family.
2. Compare anonymized Oklab, RGB, OK2, and CAM16 outputs with original references. Let reviewers choose a preferred recoloring or “no useful difference,” and separately flag lost intentional details and unacceptable material shifts. Collect a short reason. This can begin as a small practical artist review; no claim of population-wide statistical proof is needed.
3. Look for repeated CAM16 wins with a coherent purpose that remains after the simpler OK2 control. Choose the acceptance rule before revealing method labels. If it only wins its own metrics or a handful of selected examples, keep it out.
4. If that succeeds, implement a private prototype and measure full feature behavior on a physical phone and larger/high-entropy images. Require the existing exact RGB, opacity, cancellation, cap, dither, Cleanup, animation, preview, and export contracts.

**Decision for the current spike:** retain Oklab and RGB in the product; retain CAM16-UCS as a credible experimental candidate. The recommendation can be revisited after practical preference evidence. The prior final should be corrected from “worth adding” to “worth a focused artist comparison.”

## Reproduction

With the existing research dependencies and generated RGBA inputs present:

```powershell
node bench/cam16-independent-challenge/audit.mjs
```

This reruns finalist outputs, asserts their existing hashes and diagnostics, and writes the isolated challenge audit JSON. Production source, dependencies, and specifications remain unchanged.
