# Palette default and shared-adaptive palette challenge

Research and independent subagent challenge, October 12, 2026. ENDESGA 32 was accepted
and implemented as the full-palette default in a separate follow-up commit. Existing
saved selections remain intact. Dynamic-palette behavior has not been changed. The separately diagnosed GIF preview
canvas-lifecycle fix is documented in `2026-10-12-palette-gif-playback.md`.

## Recommendation

Choose **ENDESGA 32** as the broad full-color default candidate, with **Max colors: All**, **Oklab**, and **Cleanup Off** unchanged. This is a product judgment supported by the sampled color fidelity and useful skin/metal/red ramps; it is not a universal winner. Keep PICO-8 as a deliberately distinct fantasy-console look. DawnBringer 16 is the strongest alternative if the desired default must enforce exactly a small 16-color vocabulary. Do not default to Resurrect 64 simply because it has the most colors or Lospec downloads.

The comparison has an important counterargument to my recommendation: DawnBringer 16 has a lower average when every image receives equal weight and wins error against ENDESGA in 87/160 images. ENDESGA has lower pooled pixel error and visibly keeps sampled red/skin/metal ramps better. A default decision cannot be derived from one scalar score; PICO-8 even wins on the blue-glass third building.

## Method and bounded scope

160 stills from the existing deterministic PixelLab corpus manifest, plus the six supplied buildings. Alpha cutoff128, Oklab nearest, Cleanup Off. Compare PICO-8, DawnBringer16, ENDESGA32 and Resurrect64 using their exact existing RGB sets. Also compare per-image cap16 for ENDESGA/Resurrect. All1,941,987 visible pixels were evaluated, with histogram-weighted independent scalar nearest matching. Rendered output membership and transparency checks passed (132 grouped checks on11 chosen images ×6 configurations).

The corpus mixes generated/reference/derived assets and was not relabeled or resampled for this study. Color error uses squared Euclidean Oklab distance. It measures fidelity to source color, not readability, coherent material recognition, stylistic quality or artist intent. Contact-sheet review is unblinded and uses nine selected images, not held-out validation.

| Palette |160 corpus pixel-weighted MSE|160 image-equal mean MSE|Median used colors|Images using more than16|
|---|---:|---:|---:|---:|
|PICO-8|.007750|.007663|8|0|
|DawnBringer16|.004985|.007252|9|0|
|ENDESGA32|.004011|.007532|12|36|
|Resurrect64|.005903|.011758|13|69|

ENDESGA has lower source-color error than PICO-8 in112/160 images; DawnBringer in108/160; Resurrect in93/160. Resurrect loses to ENDESGA in121/160. Six-building pixel-weighted errors: DawnBringer .005166, ENDESGA .005784, PICO .006024, Resurrect .009865. More available colors does not imply uniformly better coverage: Resurrect has no black and its darkest #2e222f raises the dark-source error floor. PICO has black but sparse intermediate neutrals, so gray/metal often maps purple. ENDESGA has a useful blue-gray ramp but can shift muted teal glass blue/green. DawnBringer offers muted16-color shading but lacks exact black/white and can make that glass brown. No preset is a neutral color-preservation guarantee.

Low-chroma is defined here as Oklab chroma <= .03; this descriptive cutoff is not an artist label. Counts of such entries: PICO4, DB163, END32two, Res64six. Res64 has lower average introduced chroma on the corpus's neutral pixels but higher squared error due dark-source coverage. These metrics deliberately disagree rather than implying one definition of neutral.

## Why All should remain the independent default

ENDESGA cap16 raises pooled error from .004011 to .004167; Res64 cap16 from .005903 to .006151. This can be useful when a sprite really needs16 colors, but frequency fitting can sacrifice small accents. All does not force32/64 colors: median output uses12/13 already.

Across all166 inputs,2,503 original RGB values occur in more than one image. All maps each of these to exactly one output RGB for every preset. Per-image cap16 maps38 of them differently under ENDESGA and122 under Resurrect, because each image chooses a different subset. This does not violate shared-palette membership; it weakens same-source-color consistency. A saved shared palette and per-image restriction are separate promises.

## Sources and popularity challenge

Primary published entries were checked on October12,2026: [ENDESGA32](https://lospec.com/palette-list/endesga-32), [Resurrect64](https://lospec.com/palette-list/resurrect-64), [DawnBringer16](https://lospec.com/palette-list/dawnbringer-16), and [PICO-8](https://lospec.com/palette-list/pico-8). Their displayed downloads were205,677,363,338,10,779 and66,013 respectively. These are site-specific cumulative downloads, not universal usage/popularity rankings or evidence of suitability. ENDESGA's entry identifies NYKRA as its original project. [Lexaloffle](https://www.lexaloffle.com/pico-8.php) documents PICO-8's16-color console and deliberately restrictive visual identity. This supports keeping it as a distinctive style choice rather than treating it as a neutral default.

## Shared-adaptive palette: useful demonstration, not an implementation

Prototype one pooled palette per cohort (160corpus separately from6buildings) with RGB median cut,32/64 colors, no dithering. Palette creation uses Pillow only in local QA; output remaps every image to the frozen shared result using independent Oklab nearest. [Pillow's quantize reference](https://pillow.readthedocs.io/en/stable/reference/Image.html#PIL.Image.Image.quantize) documents the method. This creates new representative RGB colors, unlike Max colors choosing a subset of an existing user palette.

|Shared source|32-color fitted MSE|64-color fitted MSE|Relevant fixed comparison|
|---|---:|---:|---|
|160corpus|.002934|.001843|ENDESGA32 .004011|
|6buildings|.000562|.000180|ENDESGA32 .005784; user's255-color palette .001310|

Fitted building32 uses median13/max31 colors per image; fitted64 median18/max57. The before/after sheet visibly preserves muted teal glass and the building's material colors better. This is **in-sample compression**, not an unexpected generalization result, an artistic success rate or preservation of the user's original palette. A custom artist-curated palette may intentionally favor different colors. No adaptive animation or browser performance feature was implemented.

Local desktop Pillow fit-only times were roughly93/98ms for the1.8M-visible-pixel corpus, and3.6/3.6ms for137,563 building pixels. Reading files, collecting pixels, matching outputs and browser transfer are excluded; these are not JavaScript/mobile estimates. Full opaque RGB buffers total5.4MB for the corpus and0.41MB for buildings; Python counters and Pillow processing add memory. Production should not build one giant concatenated image or retain all animation frames.

## Future design, if pursued

Demonstrably worth an **explicit one-time create-from-all-images operation**, followed by a frozen, named, editable/saved shared palette. Do not silently recompute when images arrive, are removed, animations advance or tiles resize. Adding a vivid/large image can shift the fitted vocabulary and recolor previously approved sprites. A separate deliberate regenerate action can preview the change before replacing the snapshot. Exports must capture a single immutable palette; all frames and images use it.

Source all actual decoded images, not current converted thumbnails. For GIFs, sample the whole clip using source delays and bounded frame processing, then fit one palette for the entire cohort. Fitting a palette independently per frame would cause color identities to drift. Sharing one global palette avoids that particular problem but cannot guarantee no perceptual flicker from near-boundary source changes.

Use a bounded sample/histogram and flat worker loops; one frame and bounded sample data at a time, cancellation and stale-job rejection. Decide contribution weighting: pooled pixel weighting lets a large image dominate; equal per-asset budgets protect small sprites but can overweight minor effects. Normalize clip-duration weights if each asset should receive equal total influence. Freeze the fit independently of wall order and viewport; deterministic bins/order/seed and documented RGB rounding are required. Samples can miss rare eyes/highlights; exact sampling limits do not solve intent. Preserve transparent alpha separately.

Start with32 shared colors as an optional user choice,64 when material fidelity needs it; per-image Max colors remains optional, All by default. This future source palette generator must be lazy-loaded and reviewed separately. Do not add dynamic palette behavior in this task or more color spaces to solve palette coverage.

## Preserved evidence

Full per-image results are in `2026-10-12-palette-default-measurements.json` and
`2026-10-12-adaptive-palette-measurements.json`. Local prototype scripts, generated
palettes and per-image outputs remain in `.tmp/palette-default-20261012/`.

The primary preset decision compares the four full-color general-purpose options.
The five remaining presets deliberately remove or restrict hue: Grayscale 8, Ice Cream
GB, Game Boy green, Glow and Paper. Those remain useful looks but are unsuitable as
general defaults for retaining the varied source hues of a shared PixelLab collection.
No new preset or color-space setting is warranted by this evidence.

The root review agrees with ENDESGA 32 as the recommendation, while rejecting a
claim that it is a universal standard or neutral palette. The image-equal DB16 result
and building teal shifts are material counterexamples. The accepted default change
is independent of the GIF bug fix and does not replace existing saved selections.
