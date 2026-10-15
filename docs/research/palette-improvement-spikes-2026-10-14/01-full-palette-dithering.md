# Research spike: full-palette dithering

Date: October 14, 2026. Status: original executable experiments and proposed product contract; no production changes.

Status/supersession (Oct 15): historical proposal. Current behavior is documented in [palettes](../../palettes.md) and the [design specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md); its next-step language is not an open task list. Shipped dithering is ordered only (Off / 2×2 / 4×4 / 8×8 with Dither strength); diffusion stayed deferred.

## Decision

Add an optional full-palette dithering workflow only after a bounded implementation and sprite/animation evaluation. Keep **None** as the default. A fixed ordered pattern is the best first candidate for animation predictability; serpentine error diffusion is a useful still-image alternative. Neither is uniformly better than nearest matching, even at eight colors.

The experiments demonstrate a worthwhile feature, rather than a ready implementation. In particular, the exhaustive ordered prototypes are much too slow on high-color inputs, and a first naive ordered strategy failed a dark grayscale ramp. Preserve that failed result as evidence against choosing an algorithm by name alone.

## Existing behavior and actual gap

Colorfetti already supports arbitrary full palettes, Oklab/RGB nearest matching, exact active-palette source RGB preservation, alpha classification, a Max colors subset, shared automatic generation, and optional cleanup. Full-palette quantization assigns each source RGB independently; it has no spatial dithering option. See [quantize.js](../../../src/lib/quantize.js), [palette-limit.js](../../../src/lib/palette-limit.js), [palettes](../../palettes.md), and the [behavior specification](../../superpowers/specs/2026-10-06-colorfetti-app-design.md).

The optional 1-bit family already has Checker, Bayer, Hatch, Noise and Atkinson. Its Atkinson style can select Atkinson, Floyd–Steinberg or Stucki diffusion; Noise uses a fixed 16×16 void-and-cluster rank tile. Those styles classify normalized brightness between two ink roles. They do not remap arbitrary source RGB into a multicolor target palette. Existing functionality should be acknowledged when describing the proposed addition. See [recolor.js](../../../src/lib/recolor.js) and [styles](../../styles.md).

## Independent grounding

Error diffusion can remap to arbitrary generated or supplied color sets. It exchanges local quantization error for a high-frequency pattern; its usefulness depends on the image and palette. Ordered threshold maps and arbitrary irregular target palettes require a separate color-mixture decision rather than blindly posterizing each channel. The official [ImageMagick options](https://imagemagick.org/command-line-options/#dither) and [quantization examples](https://usage.imagemagick.org/quantize/) describe these distinctions.

Oklab provides a practical perceptual comparison space, but linear-light RGB is the space in which these experiments average emitted light. Choosing a perceptual nearest color and choosing how to propagate error are separate decisions. The [Oklab author’s explanation](https://bottosson.github.io/posts/oklab/) supplies its construction and conversion; [CSS Color 4](https://www.w3.org/TR/css-color-4/#ok-lab) documents its perceptual axes and color-difference context.

The [libimagequant API](https://pngquant.org/lib/) exposes a 0–1 dithering level and a Floyd–Steinberg variation. It is an independent mature reference for parameter and evaluation design, not a benchmarked replacement in this spike. Its remapping can refine a generated palette, so any future adapter must explicitly verify that a fixed target palette cannot drift.

Fixed blue-noise ranks are a plausible alternative to visibly periodic Bayer patterns. [NVIDIA’s research explanation](https://developer.nvidia.com/blog/rendering-in-real-time-with-spatiotemporal-blue-noise-textures-part-1/) discusses space/time noise distributions and temporal filtering. Its rendering context uses temporal integration; that does not establish that changing the pattern every sprite frame looks good. No blue-noise full-palette variant was implemented here. Keep sprite pattern phase fixed until separate visual evidence supports animation of it.

## Reproduction and limits

Run from the repository root:

```text
node bench/palette-algorithm-spikes/run.mjs
```

The [original harness](../../../bench/palette-algorithm-spikes/run.mjs) imports the current quantizer for the baseline and generates every fixture itself. It writes [results.json](../../../bench/palette-algorithm-spikes/output/results.json), a [labeled comparison page](../../../bench/palette-algorithm-spikes/output/index.html), a [self-contained labeled sheet](../../../bench/palette-algorithm-spikes/output/contact-sheet-labeled.svg), and a [PNG contact sheet](../../../bench/palette-algorithm-spikes/output/contact-sheet.png). It does not import outside artwork or add a dependency.

The recorded run used Node v25.0.0 on Windows x64, Intel i7-13700K. Kernel timings are the median of seven synchronous runs after one warmup, including prototype allocations. They exclude browser decoding, worker transfer, cancellation, canvas upload and PNG/GIF export. Concurrent machine load varied. These figures are observations, not phone budgets or algorithm-normalized speed comparisons. The prototypes deliberately allocate arrays per pixel and retain full-frame diffusion scratch; production must follow the flat-loop and bounded-memory rules in [performance](../../performance.md).

Six fixtures cover an eight-gray ramp, a 16-color target applied to RGB ramps, a transparent flat-shaded sprite, an eight-color target applied to RGB ramps, exact target-palette artwork, and alpha islands with alpha values 0/127/128/255. Every dither mode asserts target membership, maximum palette count, zero alpha-classification changes, exact active-palette RGB preservation, and byte equality to nearest at strength zero. These assertions cover the generated fixtures only.

Only amount zero and one are exercised. Ordered positive amount is an on/off prototype, not a validated continuous amount control. Diffusion scales propagated error, but intermediate amounts have not been swept. The proposed interface must not expose unsupported amount semantics from this harness.

Two error metrics intentionally answer different questions:

- **Point Oklab MSE** compares each visible original pixel with its output. Nearest is expected to win this objective.
- **4×4 block Oklab MSE** first averages linear-light RGB inside each block, then compares those averages in Oklab. It is a local tone-mixture proxy; it does not measure eye readability, hue preference, edge structure or artistic quality. Grid phase and block size affect it.

“Flat texture” is the fraction of horizontally adjacent pairs with identical source RGB that receive different output RGB. This is not an edge-quality score. PNG bytes come from one consistent RGBA/filter-0/zlib-9 encoder, not Colorfetti’s production indexed encoder, and are only a compressibility indicator.

## Measured comparison

Values below are deterministic quality measurements from the recorded outputs. All listed modes preserve palette membership and alpha. The exact-palette fixture has zero error for every mode.

| Fixture / mode | Point Oklab MSE | 4×4 block MSE | Observation |
|---|---:|---:|---|
| Eight-gray ramp / nearest | .001955 | .001553 | Clean bands |
| Eight-gray ramp / naive ordered pair | .005924 | .003678 | Worse even on the mixture proxy; rejects this strategy |
| Eight-gray ramp / grid-aware ordered | .004384 | .000333 | 78.6% lower block error than nearest |
| Eight-gray ramp / linear-light diffusion | .004328 | .0000508 | 96.7% lower block error, added grain |
| Eight-gray ramp / Oklab diffusion | .003606 | .000455 | Different balance; perceptual diffusion is not universally superior |
| Eight-color RGB ramps / nearest | .024175 | .022501 | Seven of eight allowed colors used |
| Eight-color RGB ramps / grid-aware ordered | .052485 | .011162 | 50.4% lower block error; substantially higher point error |
| Eight-color RGB ramps / linear-light diffusion | .039266 | .022907 | Block error slightly worse than nearest |
| Eight-color RGB ramps / Oklab diffusion | .063647 | .018211 | Lower block error, much higher point error |
| Flat sprite / nearest | .008582 | .007248 | Flat regions remain flat |
| Flat sprite / grid-aware ordered | .018672 | .001134 | Better average tone, 44.1% flat-pair texture |
| Flat sprite / linear-light diffusion | .017132 | .000974 | Better average tone, 79.8% flat-pair texture |

Visual inspection of the contact sheet confirms that dithering fills the flat sprite with texture and sometimes mixes strongly different hues. A lower block-average error is not evidence that this is desirable pixel art. The eight-color ramp also shows a palette-coverage limit: more dithering cannot recover arbitrary missing hues cleanly.

The first ordered prototype projects a source onto every target-color pair and picks a continuous mixture with a contrast penalty. A 4×4 rank matrix can only realize multiples of 1/16. For dark colors it selected very small fractions of a distant bright endpoint, which the matrix then rendered as entirely dark. The revised prototype rounds mixture fractions to the actual grid and scores expected point distortion as a secondary penalty. It fixes this specific grayscale failure, but is still a pair-mixture heuristic with conspicuous colored patterns.

For the 128×64 16-color ramp, the recorded medians were approximately 0.87 ms nearest, 233 ms naive pair, **946 ms grid-aware pair** (an October 15 rerun on the same machine measured about 240–290 ms for both exhaustive variants; these timings are load-sensitive), 14.2 ms linear diffusion and 13.5 ms Oklab diffusion. The grid-aware exhaustive implementation is rejected for production. Repeated-color sprites are much cheaper than ramps because pair lookup is memoized, but a fast sprite case does not make the method safe for arbitrary imported artwork. A future ordered kernel needs a bounded candidate set, cached source decisions and measured error against the exhaustive reference.

The flat sprite’s research PNG grew from 210 bytes nearest to 290 bytes ordered and 1,057 bytes linear diffusion. The gray ramp grew from 275 to 384 and 1,558 bytes respectively. This supports measuring export size alongside visual quality rather than promising that reduced colors always mean a smaller file.

## Animation and preview findings

With a fixed 16-color target, a 96×64 flat image is changed at just its first pixel. Among the remaining **6,143 unchanged source pixels**, nearest and both fixed ordered strategies changed **0** outputs. Linear diffusion changed **4,116 (67.0%)**; Oklab diffusion changed **4,026 (65.5%)**. These are two-frame synthetic results, not a universal flicker rate. They demonstrate that deterministic diffusion and a shared palette alone do not prevent flicker: error from one changed pixel propagates downstream.

The current palette cap already chooses one duration-weighted subset across an animation. Retain that property. Offer fixed ordered patterns for stable unchanged coordinates; do not label diffusion “stable” merely because it uses no random seed. A moving sprite can still swim through a canvas-anchored pattern. Object anchoring, sprite-cell origins and motion compensation need separate experiments; no such guarantee is established here.

There is also a concrete sampled-preview trap. Dithering a 32×16 sampled ramp using display coordinates disagreed with sampling the full-resolution ordered result at **277/512 pixels**. This shows why the existing display-size quantizer cannot be extended by applying a pattern to tile coordinates. It does not test an optimized correct source-coordinate implementation.

## Proposed behavior and engineering gates

1. Add **Dithering: None / Ordered / Diffusion** under full-palette conversion, with None default and reset. Use plain explanations: smoother shading versus more pixel texture. Make amount available after choosing a method; specify its exact effect independently for ordered and diffusion.
2. Always classify source alpha before matching. Never add or remove visible pixels, diffuse through empty areas, treat hidden RGB as a tone source, or dither alpha unless a separate explicit feature is designed.
3. Preserve exact RGB in the active target subset. The prototype drops incoming error at exact pixels. This protects authored colors but is not energy conserving; compare this contract visually against a “free remap” mode before deciding whether a second mode is useful.
4. Select the active subset first and restrict every dither endpoint to it. Report an actual used-color count as distinct from the palette size and requested maximum. Do not advertise exactly eight output colors when only seven are used.
5. Keep ordered rank phase at source coordinates, including reduced tile previews. Diffusion needs full-resolution processing before sampling, or an explicitly labeled approximate preview followed by an exact result. Saving and copying must agree with the exact enlarged preview.
6. Define cleanup interaction before implementation. The current cleanup proposals detect isolated nearest-label dots; applying them after dither can erase deliberately introduced texture. Prototype cleanup of the frozen nearest labels before dithering, or disable the combination with a clear product rule. Neither pipeline has been validated here.
7. Capture dither parameters in export snapshots and all preview/cache identities. Maintain cancellation, latest-result ownership, retry gates and honest error handling; a failed dither cannot silently download an undithered file.
8. Optimize diffusion to two row buffers, about `2 × width × 3 × sizeof(float)` bytes, rather than this harness’s three-double full-frame buffer. Check cancellation/yield deadlines between bounded row segments. Verify transparent boundaries and serpentine row restarts after yielding. Ordered pair search must be bounded before it touches production.

## Next experiments and exit criteria

Use a corpus of authored 16/32/64px sprites, large sheets, smooth shading, already-dithered assets and animations with still backgrounds. Compare eight-, four- and two-color targets, hue-limited targets, exact palette art, partial alpha and a source containing all 256 target colors plus transparency.

Require target-subset membership, unchanged alpha, deterministic results, exact-pixel protection, preview/export agreement, cancellation and export-codec checks. Measure native browser desktop and physical-phone main-thread tasks, retained scratch, repeated animation cost and PNG/GIF/ZIP size. Review low-count eyes, outline connectivity, highlights and intentional one-pixel details with humans; point/block error alone cannot decide artistic fidelity.

For ordered methods, compare nearest-four candidate pairs with the exhaustive prototype, 2×2/4×4/8×8 matrices and fixed blue-noise ranks. For diffusion, sweep amount and edge gates, assess disconnected component resets and unchanged-region flicker. No numeric gate for acceptable artistic quality is established yet. Ship only after user-visible comparisons and device evidence justify one bounded implementation.
