# Bead-friendly art: broader literature and spatial research spike

Current product recommendation: the [Claude reconciliation](2026-10-14-bead-claude-reconciliation.md)
adds the previously omitted existing-editor native baselines. Start with global
palette merging; require maker preference over that workflow before a spatial-tool
trial. Literature plausibility and earlier spike measurements are unchanged.

Research only, October 14, 2026. No production edits, external inference, or paid API
calls. Source artwork, derived PNGs and comparisons remain in ignored local scratch.
This document contains no images or reconstructable artwork data.

## Conclusion

There are credible partial solutions. The previous recommendation against the five
automatic outline candidates remains supported by its own tests; its report already
states that it is not a universal impossibility claim. It does not settle whether a
designer-assisted, spatially optimized workflow is useful for this specific craft.

The important contract is a finished chart approved by its designer. A chart builder
should not have to reinterpret shades, infer body shapes, or decide whether to omit
pixels. Eliminating every singleton is also the wrong contract: a meaningful eye
glint is allowed. This makes semantic protection and per-color inspection useful
inputs rather than evidence that the whole task is unreasonable.

**Source correction:** the initial `latest` measurements below use the earlier
transparent 24-color outline fixture, not the most recent 288×288 attachment. The
most recent attachment is an exact 3× native enlargement with an opaque baked
checkerboard and 26 colors. Separate raw-attachment and explicitly background-prepared
tests are recorded below; the prior results are retained, not substituted silently.

The new spike demonstrates a measurable reduction in scattered fill regions at the
same palette size. It also demonstrates why an unprotected automatic filter is risky.
A coarse Keep gesture protects the face exactly, but this alone does not identify
important accents elsewhere or solve outline geometry. **Worth further assisted-workflow
evaluation; not evidence to ship a new wall-wide Cleanup strength.**

## What the literature actually supplies

| Primary source | Useful mechanism | Relevance and unresolved issue |
| --- | --- | --- |
| [Boykov, Veksler and Zabih, 2001](https://www.cs.cornell.edu/~rdz/Papers/BVZ-pami01-final.pdf) | Multi-label energy with data fidelity and discontinuity-preserving smoothness; alpha-expansion/swap moves | Gives a principled alternative to independent nearest-color mapping. It optimizes a specified cost, not artistic meaning. The present spike implements cheaper local region descent, not this graph-cut solver or its guarantees. |
| [GrabCut, 2004](https://www.microsoft.com/en-us/research/publication/grabcut-interactive-foreground-extraction-using-iterated-graph-cuts/) | Graph-cut segmentation initiated by a rough rectangle, refined by constraints | Shows that modest designer input can materially alter an inference problem. Its foreground extraction results do not establish that it can segment this sprite's blush, hair or outline correctly. |
| [Gerstner et al., 2013](https://cragl.cs.gmu.edu/pixelate/journal.html) and [2012 paper](https://gfx.cs.princeton.edu/gfx/pubs/Gerstner_2012_PIA/Gerstner_2012_PIA_full.pdf) | Joint feature mapping/palette abstraction with integrated user constraints | Particularly relevant precedent for assisted pixel design. Primarily converts high-resolution images to small pixel images; not validated here as a same-resolution bead cleanup algorithm. |
| [DeCarlo and Santella, 2002](https://www.eecs.umich.edu/courses/eecs498-2/papers/stylization-abstraction.pdf) | Hierarchical regions and boundaries with perceptual/user importance guiding abstraction | Supports separating important features from broad simplified areas. Eye tracking is not proposed as app UI; a Keep gesture is a simpler importance input. |
| [Xu et al., 2011](https://jiaya.me/file/archive/projects/L0smoothing/) | Global L0 gradient sparsity with half-quadratic splitting | A materially different way to flatten low-amplitude structure while retaining strong transitions. Continuous output still needs discrete palette mapping; this new local test exposes reintroduced fragments at that step. |
| [scikit-image region adjacency graphs](https://scikit-image.org/docs/stable/api/skimage.graph.html) | Region contacts, boundary weights and hierarchical merging | Useful local implementation foundation. Connectedness/color distance supplies region structure but does not label eyes or decide deliberate selective borders. |
| [Azami and Mould, 2021](https://graphicsinterface.org/proceedings/gi2021/gi2021-09/) | Palette-constrained recoloring of image oversegmentations with adjacent-region contrast preserved | Supports treating region roles and relationships separately from global color count. Their stylizations are not bead-chart usability measurements. |
| [Nguyen et al., 2024](https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.15042) | Joint simplification of lines and bounded regions, penalizing destructive region merges | Important warning against treating thinning as the complete geometry problem. Input is 3D-derived line drawings with curve/region structure, not arbitrary colored 96-pixel sprites. |
| [Kopf and Lischinski, 2011](https://johanneskopf.de/publications/pixelart/) | Resolves pixel connectivity ambiguity and fits optimized contour splines | Stronger contour representation than local thinning. Their goal is vector magnification; returning to the same bead grid needs an additional discrete placement objective. |
| [Potrace algorithm](https://potrace.sourceforge.net/potrace.pdf) and [manual](https://potrace.sourceforge.net/potrace.1.html) | Binary boundary tracing, polygon/curve approximation and tunable smoothing | Useful once a trustworthy shape mask exists. It cannot infer which dark pixels belong to facial features; re-rasterization can relocate narrow features. |
| [Segment Anything, 2023](https://openaccess.thecvf.com/content/ICCV2023/papers/Kirillov_Segment_Anything_ICCV_2023_paper.pdf) | Promptable point/box/mask segmentation | A possible way to propose material/protection regions. Its general segmentation benchmark is not evidence of one-bead accuracy on anime sprites. |
| [SAM 3 official repository](https://github.com/facebookresearch/sam3/blob/main/README.md) | Concept/text and visual prompt segmentation | Could propose face, hat or garment regions. Current official setup needs model access and a substantial inference stack; not a reasonable small hidden dependency for the existing browser-only app. No local SAM inference was run. |
| [MobileSAM official implementation](https://github.com/ChaoningZhang/MobileSAM) and [EfficientSAM paper](https://openaccess.thecvf.com/content/CVPR2024/papers/Xiong_EfficientSAM_Leveraged_Masked_Image_Pretraining_for_Efficient_Segment_Anything_CVPR_2024_paper.pdf) | Smaller promptable segmentation models; MobileSAM documents ONNX export | More plausible future local mask proposals than a large concept model. Device latency, model download, image-domain accuracy and pixel alignment remain untested here. |
| [ControlNet, 2023](https://arxiv.org/abs/2302.05543) | Generation conditioned on edges, poses or segmentation | A hybrid redraw pipeline could constrain pose/contour while simplifying material areas. Conditioning is not exact preservation of a bead grid. |
| [RePaint, 2022](https://arxiv.org/abs/2201.09865) | Diffusion inpainting conditioned by supplied unmasked image regions | Supports masked edits instead of unconstrained whole-image correction. Exact preservation should still be enforced by compositing original Keep pixels after generation. No model execution was tested. |

The cited papers concern different problems. None proves that a ready-made algorithm
will fix Snowie's pattern. Equally, their existence makes a blanket conclusion that
only per-pixel manual work is possible unjustified.

## Current PixelLab workflow options

PixelLab's official documentation explicitly describes both [outline](https://www.pixellab.ai/docs/options/outline)
and [shading](https://www.pixellab.ai/docs/options/shading) settings as weak controls.
Single-color outline and flat shading are available preferences, not exact chart
constraints. A failed attempt to obtain a solid outline is therefore compatible with
the documented contract, although it can still be a disappointing product behavior.

[Inpaint](https://www.pixellab.ai/docs/tools/inpaint) lets a designer specify the allowed
editing region and offers palette/style controls. [Edit image Pro](https://www.pixellab.ai/docs/tools/edit-image-pro)
accepts a textual edit or reference appearance. A useful separate experiment is:
protect the face and deliberate marks; edit the hat/garment to broad connected shading;
reapply the original protected pixels; remap to the approved bead palette; inspect
isolated colors. This is a proposed workflow, not a measured success. Snowie has
already tried extensive prompting, so another generic prompt alone is weak evidence.

Outside apps recognize the same trade-off. [StitchBitz's own guide](https://stitchbitz.com/guides/how-to-clean-up-confetti-stitches-in-a-cross-stitch-pattern)
separates useful isolated detail from unwanted conversion fragments and uses local
repaint/keep decisions. That is product documentation, not an independent benchmark
of an automatic solution. Builder navigation aids would address counting effort but
would not satisfy Snowie's stated goal of a cleaner finished chart.

## New local spike: constrained spatial optimization

Files: `bench/bead-research/semantic-spike.mjs`,
`semantic-spike-evaluate.mjs`, `semantic-spike.checks.mjs` and numeric
`semantic-spike-results.json`. Production never imports these modules.

The objective is squared Oklab source-to-output color error plus a penalty for
different labels across adjacent low-contrast cells. Contrast weights are frozen from
the source. Whole small connected regions may take a neighboring fill color when
their exact energy delta is negative. Region moves repeat for up to eight passes.
This differs from the prior frozen singleton/pair rule and its near-tie/third-color
veto. It is deterministic region-block local descent; it is not global optimization.

Two strengths `.004` and `.008`, maximum move area 32, source-to-candidate squared
distance `.05`, and the eight-pass limit were fixed before the initial corpus run.
Alpha is fixed. Source dark colors with Oklab L below `.5`, cells at the canvas edge
and cells adjoining transparency cannot change. Candidates cannot introduce dark
pixels. One optional rough face Keep rectangle is a hard constraint. These are
simple structural safeguards, not a semantic model. **The dark threshold does not
protect every possible light-colored internal outline.**

There are 30 cases: the required latest native 96×96 image, four related poses from the
supplied 192×192 sheet, 11 previous exploratory sprites, their production Auto24 versions,
and three authored face/noise counterexamples. Poses are correlated and one is nearly
the same character as the required image; they are not four independent unseen art
samples. Raw exploratory sprites can exceed the app's palette limit, so the Auto24
versions are the relevant bead-palette comparisons. No fresh maker-approved targets
or timed editing/assembly trials were supplied.

The required character source hash is
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
Its visible source has 24 colors. The two shades previously isolated by Snowie still
occupy 103 cells, of which 61 belong to eight-connected components of at most four
cells. These colors are evaluation labels, not algorithm inputs.

| Required character | Total edits | All small-component cells | All singleton components | Requested-shade edits | Requested small cells | Used colors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 0 | 848 | 292 | 0/103 | 61 | 24 |
| `.004`, automatic | 166 | 714 | 245 | 16/103 | 48 | 24 |
| `.004`, one face Keep | 134 | 740 | 254 | 8/103 | 56 | 24 |
| `.008`, automatic | 243 | 664 | 226 | 23/103 | 41 | 24 |
| `.008`, one face Keep | 191 | 704 | 240 | 12/103 | 52 | 24 |

The one Keep rectangle freezes 672 occupied face/hair cells. Their labels remain
identical. Every candidate has zero alpha changes and zero changes to/from the fixed
dark class. These are direct invariants, not a claim that every artistic outline or
important mark is preserved.

At `.008` with one Keep gesture, the four related pose small-cell counts change
965→755, 849→739, 879→755 and 750→622. Corresponding edits are 295, 158, 157 and 202;
all retain 24 used colors. The face rectangles freeze 1515, 1272, 1215 and 1260 occupied
cells respectively. This is visibly modest flattening of fill/shading, rather than
proof of a finished chart. Larger rectangles protect more unwanted shading too.

Auto24 generic cases all make some edits, ranging 3–602. Small-cell reductions range
one cell to 298. The largest numeric gain is a star-like object with simplified
facet shading; it is a style trade-off. An armor example changes little. A pot loses
some material shading. Visual inspection of the character, related poses, pot,
armor and star does not establish a general artist preference. Reducing a component
metric can also erase meaningful details.

The authored controls are decisive counterexamples. Without Keep, two subtle-color
themes lose all four blush cells while both their declared noise cells are removed.
The pale warm theme keeps blush but loses two eye glints without removing its
stronger-contrast noise. A face Keep gesture preserves all blush/eye cells in every
theme. However, an intentional same-shade highlight outside the Keep rectangle is
still erased in the subtle themes. The correct input would require a second Keep
gesture or a smarter semantic proposal. A few coarse inputs can help; one face box
does not solve all intent.

An additional exploratory pressure check on the required image only used `.02`/`.04`
after the main run. With the same Keep rectangle it edits 426/488 cells and 48/52
requested-shade cells, leaving 40/35 requested small cells. This illustrates a
remaining trade-off; those strengths were not frozen/independently visually reviewed
and are not the selected solution or evidence of broad success.

Six focused spatial research checks pass, including the later initializer contract.
The original corpus runner performs 2,134,272 per-cell
membership/alpha/dark/Keep checks and validates nonincreasing total energy. This
large count reflects repeated invariants, not millions of independently judged
examples. Node timings on these small sources are recorded for reproduction;
mobile/browser integration, GIF consistency and production exports were not tested.

```powershell
node --test bench/bead-research/semantic-spike.checks.mjs
node bench/bead-research/semantic-spike-evaluate.mjs
```

The runner requires private fixtures and optionally the supplied local Temp pose
sheet. Comparison PNGs stay under `.tmp/bead-research-private/semantic-spike/`.

## Further spike: global L0 reconstruction and a discrete finishing pass

`l0-spike.py` independently implements the half-quadratic FFT solver described by
Xu et al.; it is not their downloaded implementation. `l0-spike-evaluate.mjs` runs
the latest character, four related poses and the three authored controls. Fixed
strengths `.01` and `.03` were selected before inspecting their results. A
four-neighbor nearest-visible-cell extension fills transparent RGB for the continuous
filter; eight pixels of edge padding limit periodic FFT wrap influence. After
filtering, Oklab nearest mapping returns cells to the original palette. Original
alpha, dark cells, transparency-adjacent cells and optional Keep rectangles are
restored exactly. This matte extension/padding is an implementation choice, not
semantic segmentation or a theorem about silhouettes. Continuous smoothing followed
by constrained palette projection is not the unconstrained objective optimum.

| Latest character variant | All edits | Requested-shade edits | Requested small cells | All small cells |
| --- | ---: | ---: | ---: | ---: |
| Original | 0 | 0/103 | 61 | 848 |
| L0 `.01`, automatic | 129 | 23/103 | 64 | 793 |
| L0 `.01`, one face Keep | 116 | 22/103 | 65 | 807 |
| L0 `.03`, automatic | 1106 | 47/103 | 56 | 809 |
| L0 `.03`, one face Keep | 1016 | 41/103 | 62 | 836 |
| L0 `.03` → spatial `.008`, automatic | 1083 | 51/103 | 31 | 654 |
| L0 `.03` → spatial `.008`, one face Keep | 957 | 41/103 | 44 | 704 |

All rows retain 24 used colors on this source; all direct dark/alpha/Keep constraints
hold. L0 `.03` visibly flattens larger hair/hat/garment areas, but native palette
projection reintroduces tiny scattered regions. On the requested color metric,
L0 alone with Keep is worse than the original (61→62). It is not the solution.

The combination is a separate exploratory hypothesis introduced after the L0
failure: use fixed `.03` reconstruction as the initializer for the already specified
`.008` discrete spatial descent, with fidelity evaluated against the original source
and original protection constraints. The source constraints are not inferred from
the modified output. With Keep, the combination reduces requested small cells
61→44 and all small cells 848→704, while changing 957 cells rather than the plain
spatial method's 191. This is a substantially flatter style for similar aggregate
fragment reduction. The larger edit count is not proof of better chart usability.
There are more choices about clothing/leg shading and light internal lines.

For the four related poses, L0 `.03` with Keep edits 1215/876/1495/1623 cells and
leaves 907/842/868/726 small cells. Combined with spatial finishing, it edits
1124/797/1355/1553 and leaves 772/755/758/641. Facial cells remain exactly protected;
dark-mask thickness is fixed, but lighter line geometry is not generally protected.
Inspection of the source and pose comparisons shows broad simplification but no
evidence of a completed maker-approved chart. Related poses are still correlated.

At `.03`, all three unprotected authored controls lose blush; the warm control also
loses its white eye glints. With the face Keep, every control's blush/eyes stay
unchanged, both noise dots disappear, but an intentional same-shade highlight outside
the Keep area also disappears. The combination retains the same semantic failure.

Three NumPy checks pass: constant fields stay constant; invisible black RGB is
replaced by visible-color extension; a constructed low-contrast dot flattens.
The eight-case runner performs 860,544 repeated palette/alpha/dark/Keep checks across
32 L0 and 16 combined configurations. No new artistic ground truth, GIF test or
production integration was added. Private data/output JSON and PNGs remain under
`.tmp/bead-research-private/l0-spike/`; numeric results are `l0-spike-results.json`.

```powershell
node bench/bead-research/l0-spike-evaluate.mjs
& 'C:/Users/shilo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -B bench/bead-research/l0-spike-checks.py
```

## Provenance correction and most recent attachment retest

The latest supplied 288×288 attachment, SHA-256
`0c31e91002a7b1cfbc4b4c5e2e1753d7053ea7edb59f5e4ead4382d0ae48a411`,
is an exact 3× nearest-neighbor enlargement. Its decoded native source has **9216
opaque cells**, including 1787 cells of `#dcdcdc` and 1776 of `#ebebeb`. These are
the baked display checkerboard, not actual transparency. The raw source has 26
colors, and alpha cannot identify the character boundary in that version.

Excluding those two explicitly annotated background colors, all 5652 cells shared
with the earlier transparent fixture have identical RGB. The newest attachment
contains one additional non-background cell at a location that was transparent in
the earlier fixture. This is a correlated source variant, not a new independent
character or evidence of two additional art shades.

Exact raw-attachment tests retain all 26 colors. Potts `.008` with face Keep edits
1934 cells, with requested small cells 61→51 but all small cells 858→1035. L0 `.03`
with Keep edits 2642 cells, with requested small cells 61→58 and all small cells
858→1052. The combined pipeline edits 2655 cells, leaving 45 requested small cells
and 882 total small cells. Much of that activity affects the baked checkerboard.
These raw totals are not fair measurements of foreground chart simplification.
They expose a real import/preprocessing requirement rather than an algorithm win.

`prepare-attachment.mjs` supplies a **separate explicit background annotation**:
both known checker colors become empty. This removes 3563 cells, retains 5653
occupied cells and leaves 24 foreground colors. It is not automatic background
recognition; a real designer must approve that those colors are background. An
intentional gray feature using the same colors would be at risk under this global
annotation. Both the raw attachment and its prepared variant are retained privately.

The same fixed Potts/L0 parameters and the same one face Keep rectangle were then
applied to `original-prepared`, without new threshold tuning:

| Prepared most recent attachment | All edits | Requested-shade edits | Requested small cells | All small cells |
| --- | ---: | ---: | ---: | ---: |
| Prepared source | 0 | 0/103 | 61 | 849 |
| Potts `.004`, automatic | 166 | 16/103 | 48 | 715 |
| Potts `.004`, one face Keep | 134 | 8/103 | 56 | 741 |
| Potts `.008`, automatic | 243 | 23/103 | 41 | 665 |
| Potts `.008`, one face Keep | 191 | 12/103 | 52 | 705 |
| L0 `.01`, automatic | 129 | 23/103 | 64 | 794 |
| L0 `.01`, one face Keep | 116 | 22/103 | 65 | 808 |
| L0 `.03`, automatic | 1106 | 47/103 | 56 | 810 |
| L0 `.03`, one face Keep | 1016 | 41/103 | 62 | 837 |
| L0 `.03` → spatial `.008`, automatic | 1083 | 51/103 | 31 | 655 |
| L0 `.03` → spatial `.008`, one face Keep | 957 | 41/103 | 44 | 705 |

Every prepared row retains 24 used colors and the direct dark/alpha/Keep constraints.
The prepared result differs from the earlier source's corresponding counts by one
small foreground cell. Previous conclusions are unchanged. The face rectangle
still freezes 672 occupied cells, and its protection burden remains explicit.

Additional numeric records are `semantic-spike-original-attachment-results.json`,
`semantic-spike-original-prepared-results.json`,
`l0-spike-original-attachment-results.json` and `l0-spike-original-prepared-results.json`.
The original 30-case spatial and eight-case L0 reports are unchanged. These are
additional source-variant checks, not an expanded count of independent held-outs.
Private output IDs are `original-attachment` and `original-prepared` in their
respective spike directories.

```powershell
node bench/bead-research/prepare-attachment.mjs
node bench/bead-research/semantic-spike-evaluate.mjs --original-attachment-only
node bench/bead-research/semantic-spike-evaluate.mjs --original-attachment-only --background-prepared
node bench/bead-research/l0-spike-evaluate.mjs --original-attachment-only
node bench/bead-research/l0-spike-evaluate.mjs --original-attachment-only --background-prepared
```

## What is worth pursuing

1. **Designer-approved spatial simplification.** A per-image preview, one broad
   Keep gesture for the face and additional Keep gestures for important accessories,
   an optional choice of problem fill/shades, then inspect isolated colors and accept.
   This can reduce many disconnected shading fragments in one operation without
   reducing the palette. The current spatial spike makes a partial difference but
   leaves most of the specifically requested protected shade patches. It needs a
   better target objective and designer feedback before a shipping decision.
2. **Separate explicit border styling.** Let the designer request one exterior
   outline color and an exact scope. This addresses inconsistent boundary color
   without pretending to repair every internal stroke. Add contour/region geometry
   reconstruction only where its discrete contract is tested; generic dark-pixel
   thinning is not a suitable default.
3. **Semantic proposals with deterministic finishing.** A local lightweight model
   could propose protected features/material masks; the designer corrects a small
   number of mistakes. Run palette-constrained spatial optimization inside approved
   material regions, and restore protected source pixels exactly. Browser footprint
   and native-pixel mask reliability require new measurements. No learned model
   result is claimed in this research.
4. **Matched training/evaluation data for deeper automation.** Maker-approved noisy
   source/finished chart pairs are needed to evaluate a learned system or choose
   component/contour weights. The isolated color views are helpful evidence of the
   pain point, but a different desired-style character is not a paired ground truth.

A useful trial should judge designer approval and remaining correction effort at
fixed native dimensions, not just total color count, generic sprite prettiness, or
zero modifications. Show per-color fragments and the exact changes, ask whether
the designer would publish that chart, and measure how many coarse gestures and
pixel repairs remain. Include deliberate lone highlights, blush in several palettes,
light outlines, small disconnected objects and intentionally selective borders.
No such maker trial has happened yet.
