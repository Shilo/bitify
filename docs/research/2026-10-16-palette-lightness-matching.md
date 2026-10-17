# Palette lightness matching research

October 16, 2026. Review and research only. Production behavior is unchanged.

**Closed — no implementation planned.** The user confirmed the final disposition after the broader study and independent challenge. See the [complete spike record and final decision](2026-10-16-palette-matching-spike.md). Conditional future proposals below are retained as research notes, not planned work.

## Recommendation

Keep Oklab as the default and do not add a matching setting from this spike yet. Reject HSV Value and HSL Lightness as ways to promise more predictable brightness. Hold pure lightness matching as a possible artistic effect rather than an improvement to general color matching. A fixed Oklab distance that gives lightness more weight is the strongest candidate, but its measured gains and visual differences do not yet establish that another setting is worth the complexity.

The useful part of the proposal is the desire to control what matching preserves. The risky assumption is that preserving a single brightness number also preserves an image's readable details. Some details exist in hue alone. A more distinctive result can be a less useful result.

On the five original sprite sheets across all twelve current presets, pure Oklab lightness reduced mean absolute lightness error by 8.8%, while increasing the mean per-case RMS Oklab color error by 16.5%. It changed 25.2% of visible output labels. Giving squared lightness distance four times its normal weight reduced lightness error by 4.6%, increased color error by 1.8%, and changed 9.6% of labels. These are objective tradeoffs under the stated measurements, not aesthetic scores.

The [interactive comparison](../../bench/matching-spike-2026-10-16/review.html) displays every rendered case. Serve it with the commands below; its modules and verification need HTTP. [Browser evidence](../../bench/matching-spike-2026-10-16/output/browser-general.png) shows the original item sheet, current modes, and the rainbow banding introduced by lightness-only matching.

## What the current matcher does

`src/lib/quantize.js` first preserves an exact source RGB that is already in the active palette. Otherwise it selects the palette color with the smallest squared distance. RGB uses encoded sRGB channel differences, deliberately without converting to linear light. Oklab first linearizes sRGB, then measures differences in L, a, and b:

```
RGB:    d² = ΔR² + ΔG² + ΔB²
Oklab:  d² = ΔL² + Δa² + Δb²
```

L models perceived lightness; a and b carry chromatic information. Consequently, Oklab already considers brightness. A new lightness-only mode would remove information from the comparison, rather than introduce a brightness calculation that is currently missing. The [Oklab author's description and published matrices](https://bottosson.github.io/posts/oklab/) explain those coordinates.

Both current modes are independent nearest-neighbor rules. Neither understands objects, material ramps, outline roles, or whether two source colors must remain distinguishable. Multiple source colors may map to the same output. A new distance formula cannot guarantee preservation of every detail or use of every palette entry.

## What brightness and value mean

| Candidate | Meaning in this spike | Main problem for this task |
| --- | --- | --- |
| Oklab lightness | Compare source and palette using L only | Ignores hue and saturation except for exact distance ties |
| Relative luminance | Compare linear-light Y using sRGB coefficients 0.2126, 0.7152, 0.0722 | Physical light quantity is not a perceptually even scale |
| CIE lightness | Compare L* derived from D65-relative Y | Different from Oklab L; still discards color distinctions |
| HSV Value | Compare max of encoded R, G, B | Saturated primaries and white all have V = 1 |
| HSL Lightness | Compare half of max plus min encoded channel | Saturated primaries all have HSL L = 0.5 |
| Luma | Apply luminance coefficients to encoded channels | Different from linear luminance; shifts tone decisions |
| Grayscale source then Oklab | Replace source a and b with zero before normal Oklab matching | Penalizes palette chroma and favors neutral colors |
| Lightness priority | Compare 4ΔL² + Δa² + Δb², or 16ΔL² + Δa² + Δb² | A controlled compromise, with a weight requiring justification |
| Tone rank | Sort palette by L and assign equal input L bands to entries | Assumes an evenly distributed ramp that arbitrary palettes do not have |

The [WCAG sRGB luminance definition](https://www.w3.org/WAI/WCAG22/Understanding/relative-luminance.html) specifies linearization before calculating Y. It is a definition of relative luminance, not a recommendation for palette quantization. [GIMP's desaturation documentation](https://docs.gimp.org/3.0/en/gimp-filter-desaturate.html) documents the differences between Value, HSL lightness, luminance and luma. These names describe different functions; “brightness” alone would leave the behavior ambiguous.

There are three distinct versions of “make it grayscale before applying the palette.” Removing source chroma and then using full Oklab distance favors desaturated target colors. Removing chroma from both sides for comparison gives lightness-only matching while retaining original target RGB in output. Treating brightness as a position along a selected color ramp is gradient mapping. [GIMP's gradient map](https://docs.gimp.org/3.0/en/plug-in-gradmap.html) illustrates the last concept; it can produce intermediate gradient colors, whereas Colorfetti's palette output must stay within the selected color set. A future discrete ramp feature would need its own explicit design.

## Experiment design

The matrix contains 29 source images or frames, twelve current presets, and twelve methods: **4,176 renders**. The current working palette list includes mulfok32, so the experiment uses twelve rather than the eleven presets described in some older project documentation.

| Source group | Count | Purpose |
| --- | --- | --- |
| Original sprite sheets | 5 | breastplate, general items, weapons, accessories, armor |
| Trailer scene captures | 2 | town and platformer; captures are evaluated separately from original sprites |
| Existing real art fixtures | 8 | glow, antialiasing, shadow, magic, smoke and soft effects |
| Existing real animation frames | 6 | rubberduck magic sequence, analyzed per frame |
| Existing synthetic GIF frames | 4 | walk fixture, decoded with the project GIF reader |
| New synthetic cases | 4 | saturated stripes, neutral ramp, nearly equal-lightness detail, RGB with an alpha ramp |

The existing cohort manifest retains attribution and licenses for the real art. Paths, dimensions, source hashes, attribution links and the exact preset RGB lists are stored in [results.json](../../bench/matching-spike-2026-10-16/output/results.json). This is a convenience sample of available assets, not a representative sample of all pixel art. No artist preference study was conducted.

Every principal render uses full source dimensions, Cut128, All colors, Cleanup Off, and Dithering Off. The prototypes preserve exact RGB membership before other matching, matching Colorfetti's existing contract. Candidate scalar ties use full Oklab distance and then canonical RGB order. The two baseline methods retain production first-entry tie handling so their output can be checked exactly.

Metrics average pixels within each source/palette case, then give cases equal weight. Original sprites, scene captures, still art, animation frames and synthetic cases have separate summaries. A 16×16 sprite therefore does not disappear under the 440×440 town capture's pixel count. Animation frame summaries are diagnostics, not a duration-weighted user quality score.

“Lightness error” means mean absolute source/output Oklab L difference. “Color error” is the RMS Euclidean Oklab distance within a case, averaged across cases. A source edge has Oklab distance at least 0.05 between horizontal or vertical neighbors; an edge merges when both map to the same RGB. A tone inversion compares neighbors separated by at least 0.03 in source L and detects reversal in output L. These thresholds are declared diagnostics, not validated perceptual acceptance thresholds.

Lower edge merging can reward rainbow fragmentation. Lower lightness error favors methods designed to minimize lightness error. Lower Oklab color error favors the Oklab baseline by construction. No single column establishes which image looks best.

## Results on the original sprite sheets

Each row averages 60 cases: five sheets times twelve palettes. Lower error is better for the named objective.

| Method | Pixels changed versus Oklab | Lightness error | Color error | Source edges merged |
| --- | ---: | ---: | ---: | ---: |
| Oklab | 0% | 0.0925 | 0.1369 | 30.8% |
| RGB | 16.1% | 0.1028 | 0.1470 | 33.8% |
| Lightness only | 25.2% | 0.0844 | 0.1595 | 27.4% |
| Linear luminance only | 32.9% | 0.0971 | 0.1747 | 30.7% |
| CIE lightness only | 28.6% | 0.0882 | 0.1629 | 27.3% |
| HSV Value only | 35.9% | 0.1137 | 0.1763 | 28.1% |
| HSL Lightness only | 34.7% | 0.1107 | 0.1789 | 30.8% |
| Luma only | 30.5% | 0.0973 | 0.1686 | 28.1% |
| Grayscale source then Oklab | 17.2% | 0.0919 | 0.1493 | 31.4% |
| Lightness priority 4 | 9.6% | 0.0883 | 0.1394 | 28.8% |
| Lightness priority 16 | 17.2% | 0.0859 | 0.1449 | 27.6% |
| Equal-band tone rank | 58.5% | 0.1613 | 0.2186 | 20.8% |

The broader thirteen-still-art set, including the eight effects, has 156 cases per method. Pure lightness changed 31.0% of labels and reduced lightness error by 13.6%, with 22.9% higher color error. Lightness priority 4 changed 12.3%, reduced lightness error by 7.3%, and increased color error by 2.8%. The recommendation remains the same across these two groupings.

## Visual findings and counterexamples

**Large multicolor palettes introduce arbitrary hue changes.** On general items with ENDESGA 32, pure lightness changed 69.6% of visible labels. The red potion, gold key and brown bread lose their material colors and acquire bright bands. The breastplate becomes multicolored metal. Matching tone more accurately does not preserve object identity or palette ramps. The [browser item-sheet comparison](../../bench/matching-spike-2026-10-16/output/browser-general.png) captures this directly.

**A coherent small ramp can benefit.** On breastplate with Ice Cream GB, lightness-only retains a broader body highlight and additional side detail. Edge merging falls from 74.1% to 63.7%, with only a small change in lightness error, 0.196 to 0.193. Lightness priority 4 approaches that result at 64.2% merged edges. This is a real local benefit, but the palette's darkest color is still too light to reproduce the source's dark outline. A matcher cannot recover colors absent from the palette. See the [small-ramp browser comparison](../../bench/matching-spike-2026-10-16/output/browser-breastplate-icecream.png).

**Equal-lightness details disappear.** A green rectangle on a red background was constructed with nearly equal Oklab L. Current Oklab and RGB retain the rectangle with ENDESGA 32. Lightness-only maps both to one color and merges 100% of its source boundary; the grayscale-source and equal-band variants also erase it. The 4 and 16 weighted variants retain the distinction. The [browser counterexample](../../bench/matching-spike-2026-10-16/output/browser-equal-lightness.png) shows the failure. This is consistent with the established color-to-gray problem: [Gooch et al., Color2Gray](https://users.cs.northwestern.edu/~ago820/color2gray/color2gray.pdf) demonstrate that chromatic differences can carry salient detail that luminance alone loses. Their spatial optimization is substantially different from a cheap pointwise palette metric.

**The most obvious use case is often redundant.** Lightness-only produced exactly the current Oklab output for every tested source with Grayscale 8 and Black & white. Against the thirteen real stills, it changed an average of 5.7% with Game Boy green, 12.5% with Ice Cream GB, approximately 0.005% with Glow, and 0.22% with Paper. Its most dramatic differences occur with the large multicolor palettes that expose the hue problem.

**Value is distinct without being a better brightness model.** Saturated red, green, blue, cyan, magenta and yellow all share HSV V = 1. With a grayscale palette, those nonexact chromatic inputs map to white. Hue-based tie resolution can hide this on a multicolor target, but does not make Value perceptual. In the broader still set, Value reversed 4.73% of sufficiently separated source-tone neighbor pairs on average, versus 0.19% for Oklab and zero for pure Oklab L in that matrix.

**Auto can make a matching switch do nothing.** The extra Auto experiment generates an individual palette per original sheet and one shared palette for all five. Breastplate has only 52 visible source colors, within Auto's 64-color capacity; all 155 visible pixels are exact members and every mode returns the original. Across the five individually generated palettes, lightness priority 4 changes just 3.1% of pixels on average. Pure lightness changes 38.2%, but increases mean color error from 0.0122 to 0.0618. Source preservation remains valuable even when it reduces visible novelty.

## Stability and browser verification

[stress.json](../../bench/matching-spike-2026-10-16/output/stress.json) records ±1-byte perturbations of each RGB channel, weighted by source color frequency within each original-sprite/preset case. All methods are deterministic. Determinism does not mean resistance to small changes in input.

| Method | Changed selection after channel perturbation | Output jump at least 0.1 Oklab distance |
| --- | ---: | ---: |
| Oklab | 0.72% | 0.57% |
| RGB | 0.62% | 0.52% |
| Lightness only | 1.79% | 1.21% |
| Linear luminance only | 1.73% | 1.19% |
| Lightness priority 4 | 1.21% | 0.90% |
| Lightness priority 16 | 1.18% | 0.80% |

The scalar alternatives are more sensitive around nearby palette tones. For example, ENDESGA 32 green `#3e8948` stays exact, but its one-byte neighbor `#3e8848` maps to rusty red `#be4a2f` under lightness-only. The two targets have close lightness and very different chroma.

There are also 1,095 valid one-byte neighbors of the preset colors themselves. Oklab, RGB and both weighted variants retained their parent palette color for all of these. Pure lightness switched on 7.1%. Grayscaling only the source switched on 68.5%, because exact source colors bypass grayscaling while their almost-identical neighbors lose chroma. Removing exact passthrough would avoid that particular exception but break the established source-color preservation contract; it would not restore lost hue information.

Each candidate also passed 25,428 palette-reversal probes with stable output RGB under the declared canonical tie policy. Existing RGB changed 22 ties under reversal because production intentionally keeps the first minimum. This is tie behavior, not nondeterminism for a fixed palette. The prototype does not change production tie handling.

Codex's in-app browser inspected the current Recolor controls and operated the research viewer. Its [verification receipt](../../bench/matching-spike-2026-10-16/output/browser-receipt.json) records:

- 696 exact baseline index comparisons: two production modes × 29 sources × twelve presets.
- 348 exact candidate PNG comparisons: twelve methods × 29 sources with ENDESGA 32, independently rerendered in the browser against saved Node results.
- 348 Keep-alpha comparisons, plus 2,048 alpha-ramp pixel checks per method in Node.
- Zero visible-byte differences between the app's native PNG decoder and the saved raw reference for all 29 sources.
- Zero failures. Fixed RGB maps identically across repeated positions; the pointwise methods have no frame-dependent fitting.

An initial canvas-based verification produced output mismatches on translucent fixtures. The [preserved diagnostic receipt](../../bench/matching-spike-2026-10-16/output/canvas-roundtrip-diagnostic.json) records that failed test setup. Canvas premultiplication round trips altered source RGB; using the existing native `decodeImageFile` path resolved the differences. This is a reason to preserve the product's decoder, not to add grayscaling through a canvas.

Browser medians over seven prototype runs were about 0.1 ms for the 64×64 general sheet and 4.5–4.6 ms for the 440×440 town capture in the three most relevant modes. These memoized research loops allocate feature objects and are not production implementations. They establish feasibility on the tested desktop browser, not phone performance or worst-case photo latency. Safari, physical phones, candidate exports and end-to-end candidate playback were not validated. The animation corpus checks per-frame mappings; it does not establish an artist preference or absence of visible shimmer when source RGB changes.

## Integration implications for a future proposal

Adding one UI button would not complete a matching feature. `validateMatchingMetric` currently accepts only two metrics, while storage restoration and Dock labels assume that any alternative is RGB. The limiter has a separate coordinate transform; previews and exports must use the same new metric there. Existing snapshot and cache identities already carry the metric, but new values need explicit validation throughout.

Dithering ranks candidates using Matching but scores mixtures in Oklab. A new brightness objective would therefore not automatically determine dithered output. Cleanup derives baseline labels from Matching but applies Oklab gates. Either relationship could be intentional, but would need a documented policy and combined tests. Auto currently fits palettes in Oklab independently of Matching and should not silently regenerate when the user changes a matching preference.

A later candidate should use a single explicit label such as **Lightness priority**, retain Oklab as default, and explain that it favors tones while retaining color information. The fixed weight 4 is an experimental value, not a color-science standard. Adding weights 4 and 16 as separate settings, a brightness slider, or a list of technical scalar models would increase choice without establishing clear user purposes.

For a general-purpose matching mode, acceptance should require repeatable artist preference on named tasks, retention of meaningful details, acceptable perturbation sensitivity, and agreement across cap, dither, Cleanup, preview and export. For a deliberately stylized tone-remapping feature, evaluate coherent palette ramps and describe the intentional loss of source hue. A separate ramp workflow may eventually be more predictable than treating an arbitrary large palette as one ramp, but this spike does not establish it as a feature to implement.

## Reproduction and evidence

Run from the repository root:

```powershell
node bench/matching-spike-2026-10-16/run.mjs
node bench/matching-spike-2026-10-16/stress.mjs
node bench/matching-spike-2026-10-16/serve.mjs
```

Open `http://127.0.0.1:5371/` and choose **Verify in this browser**. The native browser pass writes `output/browser-receipt.json`. Generated matrix PNGs and raw RGBA references are ignored by Git and regenerated by `run.mjs`; the scripts use the already-installed runtime Sharp package. Production source hashes are recorded with results and matched at the end of the spike.

The research files are confined to `bench/matching-spike-2026-10-16/` and this report. Existing unrelated working changes were preserved. No app feature, setting definition, storage schema, source module, dependency, specification, or deployment was changed.
