# Research spike: matching and low-color fidelity

Date: October 14, 2026. Status: current-code audit, independent sources, original synthetic measurements and implementation proposals. No production changes.

## Decision

Retain Oklab nearest matching as the default. The most useful next improvements are explicit target-color locks, optional direct generation at a requested low color count, a visible actual used-color count, and a clear conversion-scope choice for related assets. A replacement distance formula alone cannot preserve semantic details or compensate for a target palette that lacks useful hues.

Separate these user intents: **generate a compact palette that suits this artwork**, **recolor into this fixed palette**, and **use fewer colors from this fixed palette**. They have different valid outputs. A direct-generated palette must not silently replace target colors during fixed-palette recoloring.

## Current behavior

| Concern | Current Colorfetti behavior | Implication |
|---|---|---|
| Target membership | Full palettes contain 1–256 unique opaque RGB values; quantization emits indexes into the active palette | Strong invariant to preserve |
| Snapping | Exact source RGB in the active palette/subset is returned before Oklab or encoded RGB distance | Already protects authored in-palette colors |
| Default metric | Euclidean Oklab; encoded RGB is available | No evidence here for adding another default |
| Automatic source | One up-to-64-color shared palette across wall images and animation frames; equal mass per nonempty asset and duration weighting within animation | Already supports coordinated generation |
| Max colors | Selects a subset of the unchanged target palette, per full-resolution asset; one duration-weighted subset for a GIF | A cap is not new color generation and is not a promise of exactly K used colors |
| Subset optimizer | Exact source histogram through 4096 colors, bounded bins thereafter; frequency and greedy seeds, up to eight improving swaps; binned results validated against original pixels | A useful bounded heuristic, not a global optimum |
| Cleanup | Optional frozen nearest-label singleton/pair proposals, exact-color and error guards, whole-clip agreement | Can remove intended tiny detail; does not infer semantics |

The source-of-truth behavior is in the [design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md) and [palettes](../../palettes.md). Relevant audited modules are [quantize.js](../../../src/lib/quantize.js), [palette-limit.js](../../../src/lib/palette-limit.js), [palette-generated.js](../../../src/lib/palette-generated.js), and [palette-cleanup.js](../../../src/lib/palette-cleanup.js). Scheduling, 128 KiB worker chunks, the 8 MiB animation-index budget and whole-app memory limitations are documented in [performance](../../performance.md).

## Independent technical grounding

The [Oklab author](https://bottosson.github.io/posts/oklab/) designed a simple perceptual space suitable for image processing. [CSS Color 4](https://www.w3.org/TR/css-color-4/#color-difference) discusses Euclidean perceptual differences, CIEDE2000 and their complexity. Those sources support keeping the current practical default while independently evaluating alternatives. They do not establish that one metric understands outlines, materials, eyes or palette ramp roles.

[libimagequant’s official API](https://pngquant.org/lib/) supplies independent examples of fixed color constraints, image-importance maps, shared-image histograms, quality/error reporting and adjustable dithering. These suggest a useful feature/evaluation vocabulary. Its generation objective, gamma/alpha handling and quality scale differ from this harness, so its quality numbers are not interchangeable with Oklab MSE. It was not installed or timed here.

[ImageMagick’s quantization documentation](https://imagemagick.org/quantize/) provides another independent description of palette generation and squared-error measurement. Quantizer names such as median cut, octree, Wu or k-means should be treated as candidates to test, not as quality guarantees for pixel art. No comparative claim about those engines is established in this spike.

## Reproduction and evidence

Run `node bench/palette-algorithm-spikes/run.mjs`. The [harness](../../../bench/palette-algorithm-spikes/run.mjs) and [results](../../../bench/palette-algorithm-spikes/output/results.json) accompany a [visual comparison](../../../bench/palette-algorithm-spikes/output/index.html). Fixtures are original synthetic images; no external artwork or service is involved.

Recorded environment: Windows x64, Node v25.0.0, Intel i7-13700K. Matching medians use seven synchronous runs after one warmup. Generation preparation figures are single observations, not controlled speed comparisons: the production path yields cooperatively, the prototype is synchronous and unbounded, and current Auto preparation is charged to each illustrated scenario although it is reusable in the app. Browser/device performance and real-art preference remain untested.

### Matching: keep the useful default, improve control

| Fixture | Oklab nearest point MSE | RGB nearest point MSE | Conclusion supported here |
|---|---:|---:|---|
| Eight-gray ramp | .001955 | .002654 | Different dark-tone boundaries |
| 16-color RGB ramps | .010536 | .017028 | Different target-color assignments |
| Eight-color RGB ramps | .024175 | .034848 | Sparse target leaves substantial residual error |
| Flat transparent sprite | .008582 | .010815 | Some regions choose different palette colors |
| Exact target palette | 0 | 0 | Existing exact-match shortcut works for both |

These are **Oklab-scored** errors, so it is mathematically expected that Oklab nearest wins that pointwise objective. They are not independent proof of human perceptual superiority. Both metrics keep target membership and alpha classification; both preserve all 3,600 visible exact-color pixels in the dedicated fixture.

A future metric evaluation should add independent color-pair judgments, CIEDE2000 as an offline diagnostic, neutral/shadow/hue stress sets and artist preferences. If a new metric is exposed, explicitly define its white point, transfer function, exact-match rule, tie order, subset objective and cleanup interactions. HSV distance or unweighted hue distance is not an evidence-backed upgrade; near-neutral hue needs special care.

### Low-count generated palettes: fit K directly as an explicit operation

The existing workflow generates a shared Auto palette of up to 64 colors, then Max colors picks a subset of those fixed values. A low-count palette fitted directly to source colors can place its centroids elsewhere and therefore may lower distortion. This is useful for the **generate** intent only.

The original direct-K prototype builds an exact weighted RGB histogram, initializes deterministic farthest weighted seeds, runs twelve Oklab Lloyd refinements and clamps reconstructed RGB to gamut. It preserves exact colors when they already fit. It is intentionally synchronous, allocates freely, has no histogram bound, and handles one still image. It is not a production-ready version of Auto and does not preserve its shared-wall weighting semantics.

| Synthetic source / K | Current Auto64 then subset MSE | Direct-K prototype MSE | Measured difference |
|---|---:|---:|---|
| RGB ramps / 4 | .0102956 | .0096729 | 6.05% lower point error |
| RGB ramps / 8 | .00498784 | .00471594 | 5.45% lower point error |
| Flat sprite / 4 | .00005844 | .00005844 | Tie |
| Flat sprite / 8 | 0 | 0 | Both preserve all source colors |

Preparation observations for the ramp were about 85/106 ms current Auto-plus-cap and 25/41 ms direct K for K=4/8. Those are not a demonstrated speedup: the algorithms have different bounds, iteration counts, cancellation and scheduling. The measured quality gain is modest and limited to one ramp. More iterations, better initialization or local minima can alter the result; no global optimum is claimed.

**Next spike:** parameterize a separate generated request by desired K without changing fixed-target Max colors semantics. Preserve equal asset mass and duration weights, immutable snapshots, bounded summaries, cancellation and exact source-color preservation up to K. Compare direct fit against Auto64→subset on real sprite cohorts at 2/4/8/16/32/64; charge generation once and separately measure cache reuse. Return the actual palette size when duplicate/gamut-rounded centroids reduce it.

### Rare accents: a lower global error can erase the important pixel

A 64×64 original fixture contains three broad blue regions and one exact red accent. The current cap-2 optimizer selects dark and light blues, losing the red pixel, with point MSE **.009749**. A manually constructed lock-respecting alternative reserves red and one blue: it preserves the accent but increases MSE to **.020298**, about 2.08× as much.

This is expected under an area-weighted objective. It is not a bug in nearest matching and does not establish that automatically preferring rare colors is always correct; noise is also rare. The prototype only demonstrates one explicit user preference and its cost. It does not implement a generic locked-color optimizer.

**Proposed feature:** let users lock chosen target entries while reducing a target palette. Locked entries consume the budget, remain available to matching, and never mutate their RGB. If locks exceed the requested cap, require a visible resolution such as raising the effective cap or removing locks; silently ignoring a lock is invalid. Expose the effective count and distinguish “retained in palette” from “actually used in this output.”

A future source-importance brush or optional edge/rare-color weighting can help without locks, but needs a separate artistic test set. Importance must affect generation/subset selection rather than merely postprocessing a lost color back in, which can violate the cap. Readability cannot be inferred solely from global MSE.

### Palette scope: keep the existing whole-animation subset

A two-frame 64×64 fixture keeps 2,176 pixels unchanged while a large region changes. Independent cap-2 selection picks subsets `[0,1]` and `[1,2]`; **256 unchanged source pixels** change output. The existing style of one shared subset across both frames changes **0 unchanged pixels**.

This synthetic control reinforces a property Colorfetti already has. It is not a recommendation to add per-frame generation as a default. Shared palette/subset selection prevents this specific source of label churn but does not prevent diffusion-induced flicker; the [dithering spike](01-full-palette-dithering.md) independently demonstrates that distinction.

For still asset collections the current cap remains per asset, even when the target palette is shared. A user may want one shared subset for a character’s sprites, a tileset or an export batch. An explicit scope such as **Each image / Whole set** is worth prototyping; Whole set must define weighting, source signature, cache identity, locked colors and whether animations count as one asset. Equal asset mass and total pixel/duration mass serve different purposes, so the interface should explain the choice.

## Product improvements to prioritize

| Priority | Proposal | Why it helps | Validation needed |
|---|---|---|---|
| P1 | Actual used colors, target count and effective maximum shown together | Clarifies that an eight-color palette may produce seven colors | PNG/GIF transparency count rules, per-image vs set summaries, no expensive hover scans |
| P1 | Target swatch locks for cap selection | Lets artists protect eyes, outlines or accents deliberately | Infeasible locks, exactness, whole-GIF constraints, exported count |
| P1 | Opt-in full-palette ordered dither | Provides another low-count shading choice | Bounded algorithm, texture/readability, preview phase, animated outputs |
| P2 | Explicit generate-at-K operation | Can improve compact palettes without changing a fixed target | Corpus quality, wall mass, deterministic bounds, generation/cap UI distinction |
| P2 | Shared subset across selected assets | Coordinates related sprite sets | Scope/weight semantics, whole-set budget, live additions/removals |
| P2 | Source→target color mapping review | Makes near misses explainable and allows manual corrections | Histogram bounds, exact-color precedence, cap membership, persistent identity |
| P3 | Alternative offline metric/engine study | Tests whether more complexity pays for itself | Independent visual judgments, memory/device costs, licensing/package review |

Source→target overrides are a proposal, not an implemented spike. A precise override should map a source RGB to an existing target entry and apply consistently across frames; approximate tolerance/ramp mapping is a different feature. Neither should silently introduce an out-of-palette RGB or override a cap that excluded its destination.

The [reduction workflow and collection-budget spike](04-reduction-workflow-and-collection-budgets.md) owns the detailed count/scope interface and acceptance criteria. The related rows above are algorithm dependencies and supporting evidence for that same work, not additional independent feature requirements.

## Scope, diagnostics and exit criteria

Before implementation, decide how users distinguish the target library, a generated working palette and the actual output palette. “All” currently means all target entries are eligible, not “use every entry.” Keep that meaning. A one-color imported palette is valid, while the standard Max colors control currently begins at two; do not conflate those capabilities.

Build a human-reviewed cohort with tiny eyes/highlights, near-black outlines, lightness ramps, hue-shifted ramps, pre-dithered shading, limited chromatic coverage, alpha-edge pixels and related animation/tileset assets. Compare cap quality, override/lock effort, actual used colors, point error, spatial tone error, detail survival and unchanged-region temporal churn.

Require immutable fixed targets, target-subset membership, deterministic tie handling, actual count bounds and correct alpha first. Then verify full-source versus sampled previews, PNG/GIF/Copy/ZIP output, cancellation, persistent failures, mobile scheduling, retained memory and long tasks. Do not replace the current bounded limiter or Oklab default based solely on these synthetic improvements. Preserve the measured gains as hypotheses for a focused follow-up implementation.
