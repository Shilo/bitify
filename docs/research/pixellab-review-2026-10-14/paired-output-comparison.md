# Paired palette output comparison

October 14, 2026. Actual PixelLab reducer outputs compared with Colorfetti's current production conversion, palette generation, limiting and PNG encoding modules. This supplements the service inventory with direct output evidence. It does not change the four independent implementation spikes.

**Keep the new ordered dithering optional and Off by default.** Colorfetti's mixtures make broad shading smoother in these tests, but maximum strength visibly fragments a tiny armor sprite. PixelLab retains partial source alpha, which Colorfetti currently converts to binary transparency. Automatic palette quality is mixed: our existing pipeline performs better on several item-sheet budgets; PixelLab performs better on one capacity-matched grayscale case. These are concrete feature and evaluation opportunities, rather than grounds for replacing our algorithms wholesale.

Open the [self-contained side-by-side gallery](../../../bench/palette-paired-comparison/contact-sheet.html), [ramp/fixed-target sheet](../../../bench/palette-paired-comparison/contact-sheet-1.png), [sprite/armor sheet](../../../bench/palette-paired-comparison/contact-sheet-2.png), or [generation/alpha sheet](../../../bench/palette-paired-comparison/contact-sheet-3.png). The [complete measurements](../../../bench/palette-paired-comparison/results.json) retain every tested setting, including cases favoring PixelLab. The [request manifest](../../../bench/palette-paired-comparison/manifest.json) identifies exact input PNGs, hashes, target images and archived responses.

## What is better, worse, or tied

| Area | Observed result | Product implication |
|---|---|---|
| Fixed target fidelity | Both keep output RGB within the supplied target, preserve exact active-target RGB and maintain the tested alpha classification. Fixed black/white nearest results are pixel-identical on the ramp and item sheet. | Retain exact-color protection and explicit target-palette semantics. |
| Fixed-target nearest matching | Colorfetti Oklab has lower point Oklab error on the irregular eight-color cube and item sheet; this is expected when evaluating the objective our nearest matcher directly minimizes. PixelLab has better integrated tone on the tiny armor with dithering Off. | Keep both matching choices; do not treat one metric as proof of superior art. |
| Broad dithered shading | Colorfetti at its own maximum spreads mixtures across the black/white ramp, while PixelLab's own maximum changes a narrow boundary region. Our ramp block-tone error is 93.2% lower, with 91.3% higher point Oklab error. | The methods have different strength calibration and appearance. Show comparisons; do not copy their numeric strength scale or enable dithering automatically. |
| Tiny-sprite readability | At maximum 4×4 strength, our 16px armor develops disconnected bright flecks, loses the intermediate green and uses three of four allowed colors. PixelLab uses four colors and retains a more continuous highlight. Our point Oklab error is 47.4% higher. | This is a real counterexample. Prioritize an evaluated texture/contrast guard before adding more dither algorithms. |
| Automatic palettes | At equal two/four/eight-color budgets on the item sheet, our current Auto64→MaxColors pipeline has 60.2%/33.6%/21.9% lower point Oklab error. PixelLab's four-color result has slightly better integrated tone. PixelLab also wins a grayscale fit when both outputs are limited to 34 colors. | Add compact-palette refinement only after evaluating it against both current pipelines; current evidence does not support replacing Auto. |
| Partial alpha | PixelLab preserves every original alpha value in both partial-alpha fixtures. Colorfetti preserves the cut128 visible/empty decision but converts alpha to 0/255, changing 192/256 and 1,536/2,048 raw alpha values. | An explicit Preserve alpha option for PNG is a useful capability gap. Retain the current binary default and define GIF limitations separately. |
| Animation at unchanged coordinates | Both have zero changed output pixels at 2,047 unchanged ramp coordinates and 4,095 unchanged sprite coordinates after one input pixel changes, with a shared fixed target and fixed ordered matrix. | Keep the source-anchored phase. This does not promise stability for moving sprites or regenerating palettes. |
| PNG bytes | Our indexed PNGs are usually smaller here, but PixelLab wins some exact-gradient files. In a common encoder, some of our dithered outputs are larger. | Separate encoder improvements from artistic fidelity and texture compressibility. |

## Selected measurements

Lower error is better for the stated objective only. Point errors are mean per-pixel **sums** of squared Oklab-axis differences, not per-channel averages. RGB variants and both 4×4/8×8 tone results are retained in JSON, even when they change the ranking.

| Same input and target/budget | PixelLab point error | Colorfetti point error | PixelLab / ours 4×4 tone error | Scope |
|---|---:|---:|---:|---|
| 64×32 gray ramp, black/white, Off | .0897184 | .0897184 | .0848855 / .0848855 | Exact visible-pixel tie; 128 opaque blocks |
| Same ramp, 4×4 native maxima 10 / 100 | .1020355 | .1952301 | .0762461 / .00522087 | Smoother integrated shading, more texture; 128 opaque blocks |
| 64×64 item sheet, fixed irregular eight-color target, Off | .0155177 | .0136805 | .00960178 / .00808239 | 1,574 visible pixels; only 27/256 complete opaque blocks |
| Same item sheet, 4×4 native defaults 5 / 50 | .0172063 | .0168966 | .00967384 / .00453046 | Tone reduction 53.2% on those **27 blocks**; 229 boundary/empty blocks excluded |
| Same item sheet, 4×4 native maxima 10 / 100 | .0188053 | .0286622 | .00914616 / .00222305 | More visible speckling; same limited block coverage |
| 16×16 armor, four-color green target, Off | .0183189 | .0174218 | .00391124 / .00592295 | PixelLab has better local tone; 155 visible pixels, 4/16 opaque blocks |
| Same armor, 4×4 native maxima 10 / 100 | .0210632 | .0310560 | .0113885 / .00468333 | Our flecks and missing intermediate color remain failures despite the four-block score |
| Item sheet, generated eight-color output | .00563727 | .00440350 | .00201307 / .00156174 | Distinct generated palettes; whole-pipeline comparison |
| Gray ramp, both outputs constrained to 34 colors | .0000629047 | .0000811209 | .00000374784 / .00000397172 | PixelLab Auto34 versus our Auto64→cap34; **not** default versus default |

Colorfetti's actual uncapped Auto default preserves all 64 distinct colors of that ramp with zero color error. PixelLab Auto chooses 34, with small error and fewer colors. Both views are published: default behavior answers a different question from capacity-matched fitting.

There are no complete 8×8 opaque blocks in the item sheet or armor. Their 8×8 tone scores are therefore null, not zero. The block metric deliberately excludes any block containing a below-cut source or output pixel, rather than averaging unrelated transparent islands or rewarding changed silhouettes. It consequently covers only a small interior portion of these sprites. Inspect outlines and highlights in the full images.

## Visual findings

The ramp sheet shows why stronger mixture coverage is useful: our maximum black/white ordered result retains a gradual gray appearance at viewing scale. PixelLab's result stays mostly split into black and white, with texture concentrated near the transition. Neither output resembles authored flat-shaded sprite art by default.

The item sheet shows a useful middle ground at our native strength50: the bread, map and scroll gain texture, while much of the silhouette remains recognizable. At strength100 the yellow/red/green target endpoints produce conspicuous colored texture. PixelLab's maximum is more conservative on the same artwork. Its less textured appearance can be preferable even where our average-tone score is lower.

The armor is the strongest negative example. Our maximum creates isolated light pixels across a very small surface and drops the middle green. PixelLab's larger coherent light region reads more like a highlight. Reducing point and tone error cannot by itself establish whether an eye, seam or armor plate remains readable. Keep this exact fixture in future dither changes.

Our generated two-color item sheet keeps more small internal marks than PixelLab's, while both sacrifice material hues. At four/eight colors, our palettes and PixelLab's distribute their limited hues differently; both omit some source material colors. A color lock or per-color override could address intentional colors better than a global metric alone.

## Encoding, alpha, and target import qualifications

The maximum-strength item-sheet exports are 2,276 bytes for PixelLab and 1,062 for Colorfetti. Re-encoding their identical-size, identical-alpha RGBA outputs with one encoder reverses the compression ranking: 1,267 versus 1,484 bytes. Our indexed representation explains much of the native file-size advantage; the extra texture is less compressible in this case. The exact 64-color ramp instead exports at 163 versus 364 bytes, favoring PixelLab. No general encoder winner follows from this sample.

The common encoder normalizes fully transparent RGB to zero. It removes codec/representation differences, but partial-alpha cases still encode different alpha values under the products' different contracts. Only equal-alpha cases isolate color-pattern compressibility.

For the archived partially transparent **target palette image**, PixelLab uses all four RGB entries, including fully hidden RGB. The controlled matching comparison supplies those same four opaque RGB values explicitly to Colorfetti. A separate variant runs Colorfetti's actual `extractPalette` image-import module: it skips alpha0 and returns three colors, which the gallery shows separately. Its point error is .0278845, versus .0115482 when explicitly supplying all four RGBs and .0148105 for PixelLab. These are different input-palette contracts, not evidence that matching suddenly became worse. The three-color variant is not described as an equal-target comparison.

A wholly transparent source is also a contract difference: PixelLab returns an empty-looking PNG, while actual Colorfetti Auto has no generated colors and disables color-dependent exports. The comparison records that case without fabricating an application output.

## Next improvements, ranked

1. **Finish shipping the bounded ordered feature with Off default and native strength50 when enabled.** Keep 2×2/4×4/8×8 as matrix dimensions, preserve the two existing matching choices, and retain source-coordinate phase, exact RGB protection and shared animation subsets. Do not add diffusion or change 1-bit styles on this evidence.
2. **Evaluate a texture/contrast guard for tiny sprites.** Use the armor, item sheet, ramps and fixed-target temporal fixtures as paired gates. Test nearest-pixel confidence, endpoint contrast and local structure before selecting an implementation. Require a readability improvement without losing the demonstrated ramp benefit. Avoid a hard-coded fix for one armor color.
3. **Add explicit alpha preservation for PNG as a separate feature.** Compare binary cut and preserved alpha in previews, copy and exports. Define indexed-table growth versus RGBA fallback, GIF's binary transparency and max-color accounting before implementation.
4. **Show actual used colors and explain Auto capacity versus requested budget.** The four-color armor uses only three at maximum dither; both systems can return fewer colors than requested. Distinguish those outcomes from palette size, and let a user compare Off/On without changing the target.
5. **Experiment with direct low-budget palette fitting/refinement and color locks.** The equal-budget grayscale failure and mixed four-color material results justify a spike. Compare against our unchanged Auto64→cap pipeline first; evaluate clusters, silhouettes and hue retention as well as MSE. Do not assume a direct generator will improve the item-sheet cases already favoring the current pipeline.

The four existing independent spikes remain competitor-free. This report contains the competitor-specific evidence and preserves negative results rather than importing external implementation details.

## Reproduction and audit

Run `node bench/palette-paired-comparison/run.mjs` for an **offline** replay against retained service PNGs. It generates the measurements, all current application exports and the gallery using real app modules. PNG output is independently decoded and checked against the quantizer's alpha and visible RGB for every application export. Source bytes are never resized before conversion. Engine SHA-256 hashes are retained with results.

Then run `node bench/palette-paired-comparison/verify.mjs`. The separate [offline evidence audit](../../../bench/palette-paired-comparison/verification.json) passed source/engine hashes, actual decoded PNG hashes and byte counts, dimensions, binary-alpha classification, target membership and exact active-RGB preservation across **115 files / 1,327,616 application output pixels**, plus billing totals and 41 service-file hashes.

`--live` is the only paid mode. It submits missing requests from the twelve-case manifest, retains responses, and never repeats an existing case. The completed batch made **12 successful reductions, 0 failed requests, billed 1.2 subscription generations** in response usage. It adds to **25 retained earlier successful requests**, for **37 request cases / 41 service images / 115 application PNG roundtrips**. No new image generation, smart generation or workbench calls were billed by this comparison. A later offline rerun incurs no service usage.

The new source art is the repository's existing unresized `general-source.png` item sheet and `breastplate-source.png` armor, with provenance recorded in the script; remaining sources are retained synthetic API fixtures. The one-pixel animation changes an originally visible source pixel. It is an unchanged-coordinate stability test, not a complete motion test.

Independent adversarial review challenged strength calibration, matching-objective bias, partial-alpha masking, block coverage, file-size confounds, source provenance and preserving the negative armor example. The final offline run incorporates those qualifications. This corpus is small and selected; no pooled score or universal visual-quality claim is justified.

## Follow-up: the existing strength control addresses the armor example

The maximum-setting comparison above does **not** establish that Colorfetti's best available configuration is worse, because native maxima 10 and 100 are uncalibrated. An additional **offline** [strength sweep](../../../bench/palette-paired-comparison/armor-strength-sweep.html), [native 16px plus 12× visual sheet](../../../bench/palette-paired-comparison/armor-strength-sweep.png), and [complete measurements](../../../bench/palette-paired-comparison/armor-strength-sweep-results.json) retain every requested strength with the same source, four RGB targets, cut 128, Oklab matching and 4×4 matrix.

| Colorfetti strength | Point Oklab error | 4×4 tone error | Used colors | Brightest-target component sizes |
|---:|---:|---:|---:|---|
| 0 | .0174218 | .00592295 | 4 | [4] |
| 10 | .0174218 | .00592295 | 4 | [4] |
| 20 | .0178117 | .00556845 | 4 | [3] |
| 30 | .0192107 | .00449607 | 4 | [3,1,1,1] |
| 40 | .0236373 | .00442699 | 4 | [4,1,1,1,1,1] |
| 50 | .0247492 | .00330276 | 3 | [6,1,1,1,1] |
| 75 | .0269132 | .00284180 | 3 | [6,1,1,1,1,1] |
| 100 | .0310560 | .00468333 | 3 | [5,1,1,1,1,1,1] |

At **strength 20**, the central brightest highlight stays connected, all four target colors remain in use, and there are no isolated brightest-color pixels. Tone error is 6.0% lower than our Off result, with 2.2% higher point error. Against the uncalibrated service maximum reference, both errors are lower. Against PixelLab Off, point error is 2.8% lower but the limited tone score is 42.4% higher. Neither comparison establishes a universal winner.

The native-size and enlarged visuals show that our strength 20 retains a coherent central highlight, whereas strength 30 starts adding isolated bright pixels; strength 50 and above drop the intermediate green. Component counts describe only the brightest target color, not outline quality or overall readability. Tone still covers just four fully opaque blocks out of sixteen.

This narrows recommendation 2 above: **use the existing strength control first. A new texture guard is optional research, not a demonstrated requirement to fix this fixture.** Keep the maximum-strength counterexample as an honest explanation of the control's tradeoff. Do not infer that our best configuration is inferior from comparing two unrelated native maxima, or change the global default strength from one small sprite.

Reproduce with `node bench/palette-paired-comparison/armor-strength-sweep.mjs`. It performs no service calls, checks source/target hashes against the retained request, verifies service output hashes, and checks binary alpha and target membership in all eight application exports. The original 37-case/115-file audit remains separate.
