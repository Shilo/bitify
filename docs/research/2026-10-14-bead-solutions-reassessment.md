# Bead conversion reassessment: useful assistance exists

Follow-up: [exact native-original retest](2026-10-14-native-original-retest.md)
tests the later 96×96, 24-color transparent attachment directly, without preprocessing.
The opaque-source discussion below refers to the earlier enlarged attachment.

October 14, 2026. Research only on main. Production Cleanup and application behavior
are unchanged. All artwork, screenshots, derived PNGs and pixel payloads remain in
ignored local scratch. This document contains text and aggregate measurements only.

## Decision

**Snowie's request is reasonable. Useful deterministic partial solutions exist.**
The strongest measured workflow is explicit selected-fill simplification plus a
chosen solid exterior color. It needs a few design choices and review, rather than
editing every affected pixel. It does not produce a guaranteed finished bead chart
or repair every internal gap, double line or jagged contour.

Keep the five rejected automatic outline candidates rejected. Do not replace or
strengthen current Cleanup On based on these experiments. The new assisted workflow
is worth a designer trial as a separate per-image operation. It is not yet justified
as a production wall-wide setting. The current research page already allows local
preview, isolated-color inspection, Keep selection and exact-label PNG preparation.

## What the earlier report establishes

The earlier [outline decision](2026-10-14-outline-cleanup-decision.md) explicitly
limited its conclusion to its candidates. Its mechanics and reported internal-detail
damage were independently checked. It did not prove universal impossibility.

The acceptance gate required clear improvements on at least 12/24 mixed sprite inputs,
without masks. That is useful for judging a remembered automatic control. It excludes
the designer-assisted workflow now tested. Five candidates also share one automatic
outline seed/shade detector, so their failures do not independently evaluate explicit
color selection, semantic masks, spatial optimization or fitted contour reconstruction.

Color consistency and geometry need separate scores. An independent remeasurement
of the earlier transparent character found 319 exterior cells, four exterior colors
and 62 cardinal adjacent color changes. Union reduced those transitions to two;
Solid reduced them to zero, with zero interior or alpha edits. Those are real partial
color-consistency gains, even though they do not fix preferred line placement.

The authored double-line test's zero preferred corrections reflected retaining the
opposite row from the target. It showed a contour-placement problem despite reducing
width. Identical deliberate/accidental gaps demonstrate missing intent under identical
inputs; selecting a region or requesting a particular style supplies additional input.
Passing app tests and a handoff validator does not measure maker preference or effort.

## Exact source and background correction

The newest 288×288 attachment has an opaque, baked checkerboard. Every 3×3 pixel block
is constant across all four channels: 331,776 channel comparisons confirm it is an
exact enlargement of a 96×96 grid. Attachment SHA-256:
`0c31e91002a7b1cfbc4b4c5e2e1753d7053ea7edb59f5e4ead4382d0ae48a411`.

Its 26 colors comprise 24 artwork colors plus `#dcdcdc` and `#ebebeb` background
shades. Research preprocessing explicitly removes those two selected backgrounds:
3,563 background cells become empty and 5,653 artwork cells remain. This is a declared
background annotation, not automatic semantic recognition. A native transparent PNG
would skip that step. The prepared input shares identical RGB on all 5,652 common
foreground cells with the earlier transparent fixture and adds one occupied cell.

Raw attachment results are retained separately. Fully opaque contour reconstruction
abstains; the old Solid candidate instead paints the canvas edge, an invalid character
outline result. Unconstrained spatial smoothing also changes the checkerboard itself.
Claims of outline repair or total fragmentation improvement must use the prepared
foreground, with its preprocessing disclosed.

## Strongest targeted test: select problem fill shades

`guided-shade-spike.mjs` builds on the previous nearest admissible-fill prototype.
The designer selects two troublesome fill shades. Only original eight-connected
selected components of at most four cells are eligible. Larger connected shading
and diagonal selected lines remain unchanged. An eligible fragment may take the
nearest adjacent larger four-connected fill, using fixed squared Oklab tolerance
`.04` and minimum anchor area five. Ambiguity/error vetoes remain.

Dark, pink and near-white color classes are heuristically protected, and cannot
receive added pixels through this operation. A Keep area vetoes its whole selected
eight-connected component. Only selected-source cells can change. These are explicit
algorithm contracts; they are not recognition of eyes, blush or materials.

The current prepared attachment's two selected shades occupy 103 cells; 61 are in
small eight-connected components. They come directly from Snowie's isolated-color
examples. Not every occurrence has a maker-provided unwanted/keep annotation.

| Operation on current prepared attachment | Recolored cells | Selected small-patch cells | Exterior colors | Used artwork colors |
| --- | ---: | ---: | ---: | ---: |
| Original | 0 | 61 | 4 | 24 |
| Two selected fill shades | 39 | 22 | 4 | 24 |
| Selected shades plus one face Keep | 26 | 35 | 4 | 24 |
| One chosen solid exterior color | 129 | Not scored as fill cleanup | 1 | 24 |
| Selected shades plus solid exterior | 168 | 22 | 1 | 24 |
| Selected shades, face Keep and solid exterior | 155 | 35 | 1 | 24 |

The combined operation makes 129 exterior recolors and 39 fill recolors, with zero
prepared occupancy changes. Total small-component cells change 849→705. With Keep,
all kept face cells remain exact. The selected-only transform leaves every other
source color unchanged, retaining this character's pink blush and dark eye/outline
pixels. These observations do not establish generic facial preservation.

Four related poses were tested with nearest source-swatch proxies for the same two
shade roles, not maker selections. Without Keep, selected small cells change
110→45, 61→22, 48→14 and 37→9. The smiling pose is almost identical to the standalone
image. These correlated examples are not independent held-out success rates.

The raw opaque attachment also gives 61→22 selected small cells while retaining its
26 colors. That targeted recoloring result is valid, but the baked background still
needs resolution before character-border processing and final bead-chart export.

The semantic counterexample remains: an intentional tiny accent using a selected
unprotected shade can be removed. Light/colored outline fragments can also be affected.
Keep protects declared areas but may retain unwanted shading within them. There is
no maker-approved target, placement study or measured manual-edit time saving.

## Other new hypotheses and findings

Three agents supplied deep primary-source research, independent verdict/code/visual
audits, and an exterior contour spike. See the [literature and spatial report](2026-10-14-bead-solutions-literature.md)
and [contour report](2026-10-14-bead-contour-spike.md) for sources and detailed results.

| Family | Measured effect | Remaining issue |
| --- | --- | --- |
| Region-block Potts spatial descent | Current prepared input with one face Keep: 191 edits, all small cells 849→705, selected small cells 61→52; 24 colors retained | Broad flattening helps more than the specifically requested shades. Intentional highlights outside Keep can disappear. Local descent is not a global graph-cut solver. |
| Global L0 gradient smoothing and palette remap | Fixed `.03` plus Keep: 1,016 edits; selected small cells 61→62 | Continuous abstraction followed by palette mapping recreates fragments. Not a useful standalone default here. |
| L0 followed by spatial finishing | 957 edits; selected small cells 61→44, all small cells 849→705 | More extensive shading changes without a clear advantage over targeted shade choices. No production recommendation. |
| Moore exterior trace | Same as Solid on this character and related poses | Follows existing occupancy; does not remove silhouette jaggies or infer skipped cells. |
| Trace plus two-cell old-border refill | Corrects 52/52 authored doubled-rectangle cells; current prepared character 183 edits, including 54 near-border interior cells | Can erase intentional perimeter features and alter braid/material shading. Competing fill colors use first-reached propagation. Keep experimental. |
| Learned masks, constrained inpainting and vector reconstruction | Credible mechanisms in primary literature | No learned inference or full curve rerasterization was executed here; these remain candidates, not demonstrated successes. |

[PixelLab documents outline choices](https://www.pixellab.ai/docs/options/outline)
and [shading choices](https://www.pixellab.ai/docs/options/shading) as weak controls.
Flat shading and single-color outline preferences therefore do not guarantee finished
chart constraints. Masked edits plus restoration of protected source pixels are a
more specific future experiment than another unconstrained prompt. Snowie's extensive
prompting history is relevant; generic prompting alone is not the proposed solution.

## Live test and verification

Local research page: `http://127.0.0.1:5173/bench/bead-research/solution-review.html`.
Unlike prior galleries, spatial and selected-shade algorithms run live in the browser.
The page loads only ignored private inputs. Its single-color view exposes actual
remaining fragments. Precomputed contour/refill comparisons are labeled separately.

The live Codex browser reproduced 191/848→704 on the earlier transparent fixture
with a two-corner Keep selection, and 39/61→22 with the two selected shades. Current
prepared attachment results are retained in `guided-shade-results.json`.
The current-source combined page reproduced 168 edits, selected small cells 61→22,
and all small cells 849→705. Its PNG was prepared in that live page and downloaded
through the Codex browser, then independently decoded and compared with the Node
result over all 9,216 cells. Visible RGBA and alpha match exactly; 3,563 fully
transparent cells have different unused RGB bytes between the two PNG encoders.
The current source's two pink blush colors have zero edits. Solid recoloring adds
two dark-class cells at existing occupied boundary positions and removes none:
unchanged occupancy is not a claim that apparent dark-line thickness cannot change.
Numeric evidence is `bench/bead-research/solution-browser-checks.json`.

Research PNG preparation uses the production palette byte encoder with native labels,
not a screenshot or canvas PNG encoding. Runtime input decoding is still via canvas;
these supplied PNGs matched the independent decoder in the displayed measured counts.
No color-profile-general import, animation or phone contract is established.

Final verification: 16 new Node algorithm checks and three NumPy checks pass.
No production files changed; production tests/build were not rerun for these isolated
research modules. Media/pixel-payload exclusion was checked before completion.

Independent review checked 100 authored random spatial inputs and 5,404 accepted
moves: each reduced energy and move deltas accounted for the full energy change.
The same reviewer inspected the character/pose outputs and challenged scope, hidden
inputs, correlated samples and semantic losses. New algorithm checks cover target
scope, retained diagonal shading, explicit Keep, adversarial lost highlights, opaque
abstention, exterior-only recoloring, contour termination and energy accounting.

```powershell
node bench/bead-research/prepare-attachment.mjs
node --test bench/bead-research/semantic-spike.checks.mjs bench/bead-research/contour-spike.checks.mjs bench/bead-research/guided-shade.checks.mjs bench/bead-research/solid-boundary.checks.mjs
node bench/bead-research/guided-shade-evaluate.mjs
node bench/bead-research/semantic-spike-evaluate.mjs --original-attachment-only --background-prepared
node bench/bead-research/l0-spike-evaluate.mjs --original-attachment-only --background-prepared
```

Private comparisons and PNGs are in `.tmp/bead-research-private/`. No images or
reconstructable source arrays are stored in these research documents/results.
Production tests from the previous investigation are historical, not new maker
validation. This research does not change production source or persisted settings.

## Practical next decision

Present the targeted before/after to the pattern designer. For a native transparent
sprite the proposed input is two problematic shade choices, one outline color, and
optional Keep areas for deliberate accents. The designer reviews the full image and
isolated colors once; the builder receives the completed exact-color chart.

Worth pursuing: a per-image, reviewable **simplify selected fills + solid exterior**
action. Not justified: automatic wall-wide artistic reconstruction, generic internal
thinning, or changing current Cleanup's exact-source-color preservation.

Before shipping, collect new native noisy/desired-after chart pairs and maker-marked
intentional details; test light outlines and shared-role shades; measure accepted
bulk edits and residual corrections, including the time to choose/verify masks.
Then evaluate whether per-image selections fit Colorfetti's shared palette interface.
Preview/export state and cancellation would need implementation; animations require
a separate motion-aware design. Failed filters should remain failed evidence rather
than being tuned repeatedly on the same held-outs.

The existing research workflow can help this image now. A complete automatic
bead-ready conversion has not been demonstrated, and that limitation should not
be substituted for the claim that the user's request is unreasonable.
