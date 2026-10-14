# Explicit outer-outline reconstruction spike

Recommendation update: the [Claude reconciliation](2026-10-14-bead-claude-reconciliation.md)
finds global dark merging through the existing palette editor preferable on the
native input. Solid leaves the integration path except for explicit designer intent
to use different exterior/interior colors. Measurements below remain historical.

October 14, 2026. Research only; production behavior is unchanged. All original,
derived and comparison images remain in ignored `.tmp/bead-research-private/`.
The retained source code and aggregate measurements contain no artwork payloads.

## Finding

There is a useful **partial** deterministic solution: let the pattern designer
explicitly request a solid exterior outline in one chosen palette color. That
request supplies the missing style intent. On the earlier transparent 96×96 character, the
exterior changes from four source colors to one with 129 recolored cells and no
alpha or original interior changes. A maker no longer has to choose how to combine
the exterior shades. This is not proof of shorter placement time, and internal
outline fragments remain.

The prior no-add verdict is valid for the tested universal automatic Cleanup
setting. Its requirement that an improvement also repair geometry can obscure
this smaller successful contract. A maker explicitly wanting a solid outline has
already decided to discard selective lighting at that boundary. Treating every
such change as a potential artistic harm evaluates a different goal.

An additional new contour-and-refill spike can normalize some doubled exterior
borders, but is insufficiently reliable to ship. It fixes all 52 specified cells
of an authored two-cell rectangular outline while keeping nine facial/text
features. It also erases an intentionally dark feature located immediately inside
the perimeter in an adversarial control. The operation therefore needs explicit
style intent and a comparison preview; it is not semantic defect detection.

## Research basis and distinct hypothesis

[OpenCV's structural-analysis documentation](https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html)
distinguishes external contours, connected components and contour approximation.
The `CHAIN_APPROX_NONE` contract stores neighboring contour cells whose Chebyshev
distance is one. [Suzuki and Abe's border-following paper](https://www.sciencedirect.com/science/article/pii/0734189X85900167)
describes extracting border structure from binary occupancy. These support using
the supplied transparent silhouette as geometry input without identifying eyes,
hair or shading from RGB.

[Depixelizing Pixel Art](https://johanneskopf.de/publications/pixelart/) instead
resolves pixel-connectivity ambiguities and fits contours for vector output.
It motivates a richer curve pipeline but does not demonstrate faithful, preferable
cleanup after rerasterizing at the original bead resolution. That curve pipeline
was not implemented here, and this spike cannot rule it out.

The new method is a local Moore-style eight-neighbor contour walker, not a claimed
implementation of Suzuki's full hierarchy algorithm. For each occupied
eight-connected component it follows the exterior occupied cells. It paints that
trace with an explicitly supplied target palette index. An optional second step
replaces selected old outline-shade cells that are outside the trace and less than
two cardinal steps from the exterior boundary. Multi-source cardinal propagation
copies nearby nonselected fill colors into those cells, without crossing the new
trace or changing alpha. A missing fill seed leaves a cell unchanged.

That differs from the old Repair candidate, which thinned a detected line mask
while protecting all boundary cells. Here geometry comes from occupancy, and a
replacement fill is propagated into the explicitly selected old border band.
The width is a fixed research policy, not a new slider proposal.

## Input burden and what was actually tested

The API accepts a chosen target shade and a set of original outline shades. A
potential designer workflow is one target-swatch selection followed by accepting
or correcting suggested original shades. The earlier transparent character's suggestion is
target `#200402`, sources `#200402`, `#250603`, `#380d06`.

**The corpus runner passed unmodified automatic-detector suggestions as explicit
parameters. These are accepted-default proxies, not selections by Snowie or a
maker usability study.** The detector's dark boundary heuristic can choose a
material color incorrectly. An actual designer may need additional swatch clicks.
No source-specific mask, face box, region annotation or hidden parameter adjustment
entered the algorithm. Facial boxes below were used only to measure output edits.

Solid exterior repaint needs only a target color; old-shade selection is relevant
to the optional refill step. Neither operation asks the person building the chart
to reinterpret colors. The designer reviews and exports the finished chart.

## Tests and results

The runner reused the old outline experiment's 36 real sources, added four crops
from the newly supplied 192×192 pose sheet plus the current enlarged attachment
before and after explicit background preparation, and evaluated 17 authored
controls. These are 42 correlated real inputs, not 42 independent characters or
new held-outs. Each has original, Solid, trace-only and trace-plus-refill outputs.
The 1,028,416
occupancy comparisons passed. No alpha cell was added or removed.

The **current** 288×288 attachment was independently verified by the parent as an
exact threefold enlargement of a 96×96 grid (attachment SHA-256
`0c31e91002a7b1cfbc4b4c5e2e1753d7053ea7edb59f5e4ead4382d0ae48a411`).
It has 26 visible colors and is fully opaque: two colors, `#dcdcdc` and `#ebebeb`,
encode the flattened checkerboard background. This is different input from the
earlier transparent 24-color character. The unchanged new contour/refill methods
correctly abstain on this opaque source. The old Solid baseline recolors 378
canvas-edge pixels, producing a frame, which is not a successful character outline.
This demonstrates a source-preparation requirement: an exterior-outline tool needs
actual transparency or a designer-approved foreground/background mask. A
checkerboard screenshot must not silently be treated as transparent artwork.

The parent subsequently supplied `original-attachment-background-prepared.png`,
using the recorded preparer `bench/bead-research/prepare-attachment.mjs`. Two
explicit background-color choices remove 3,563 checkerboard cells and leave 5,653
occupied cells in 24 artwork colors. Those are additional preprocessing inputs,
not automatic outline detection or preservation of the raw opaque screenshot's
alpha. The same frozen contour parameters give:

| Current attachment after background preparation | Recolored cells | Original interior edits | Exterior color count |
| --- | ---: | ---: | ---: |
| Solid | 129 | 0 | 1 |
| Trace-only | 129 | 0 | 1 |
| Trace plus refill | 183 | 54 | 1 |

Every prepared-foreground alpha cell is preserved, and the wider face evaluation
box changes zero cells for each transform. Refill still has the braid/detail
tradeoff. The current prepared result differs slightly from the earlier
transparent fixture, so its 183/54 counts must not be replaced with 184/55.

| Earlier transparent character | Recolored cells | Original interior edits | Exterior color count |
| --- | ---: | ---: | ---: |
| Original | 0 | 0 | 4 |
| Solid cardinal-boundary repaint | 129 | 0 | 1 |
| Moore trace repaint | 129 | 0 | 1 |
| Trace and two-cell old-border refill | 184 | 55 | 1 |

On this character, trace-only exactly duplicates Solid, so contour tracing itself
adds no benefit. The refill step changes 55 old dark cells near the perimeter and
visually lightens several hair and leg-border joins. It also alters the braid edge;
that is a material-detail tradeoff, not established maker-approved improvement.
It leaves the problematic internal outline intersections and hat/hair shading
speckles mostly unresolved. Reduced dark thickness at some joins does not establish
a globally correct one-bead-wide outline.

The pose crops' refill edit counts are 49, 183, 254 and 161. Broad face-and-hair
evaluation boxes change 0, 2, 10 and 2 cells respectively. Separately inspected
central face boxes change zero cells in every pose: pose 0 `[33,30,59,47]`, others
`[33,34,62,48]` (exclusive right/bottom). The earlier transparent character's wider
`[34,30,65,50]` box also changes zero. Visual comparisons retain central eyes,
blush and expressions. These limited observations do not establish preservation
of faces located near silhouettes in arbitrary images.

The authored two-cell rectangle with interior eyes/blush/text is a concrete
geometry win: old Solid and trace-only fix 0/52 desired removals, whereas refill
fixes 52/52 and preserves 9/9 keep cells. Its dark 2×2 count falls from 59 to one,
with the remaining block belonging to an intentional interior eye. Conversely,
the edge-feature control loses 1/10 keep cells with refill; Solid loses none.
The identical intentional/accidental internal-gap controls both remain unchanged.
No source-alpha spur or jagged contour is removed because the occupancy is fixed.

All 36 real-source comparison sheets and all four new poses were visually
inspected. Refill can reduce heavy edge shading on outlined characters, but changes
material bands on the silver ring and can be inappropriate on small features.
Solid/trace can blacken detached fire particles; the unmodified detector suggests
brown from the chicken's feet and incorrectly gives its white body that outline.
Opaque images abstain in the new method. Mixed cat-face sheets acquire a shared
outline color even when their original palettes differ. Narrow all-dark shapes
can lack fill seeds, leaving thickness unresolved. These observations prohibit
a global default Cleanup toggle.

Four automated checks pass, including all 4,096 padded authored 3×4 occupancy
patterns for terminating occupied connected contour paths; the specified rectangle
refill and idempotence; the deliberately demonstrated edge-feature failure; and
opaque-input abstention plus explicitly chosen light-outline support. Tests verify
the specified transform and its failure, not maker artistic correctness.

## Decision

Keep the existing Cleanup unchanged. A **separate, explicit Solid exterior outline
prototype** is worth presenting to the pattern designer: it solves shade consistency
with a small input burden and a precise preservation contract. The evidence is
already enough to reject the statement that no deterministic operation can help
this example. It is not enough to add that setting to production without checking
whether makers prefer the exact before/after and whether the interface fits
Colorfetti's broader palette workflow.

Keep optional two-cell border refill as a research preview. Do not claim it repairs
all doubles, gaps, jagged curves or internal lines. Its next decision gate should
use designer-approved before/after charts and actual review/correction time,
including a narrow-face and braid-detail corpus. A few approved outline-style
inputs are reasonable for the **designer**; asking the builder to repair ambiguous
pixels is not a finished-chart solution.

Reproduce with:

```powershell
node --test bench/bead-research/contour-spike.checks.mjs
node bench/bead-research/contour-spike-evaluate.mjs
```

The runner requires private prior outline PNG outputs and optionally reads the
private new pose crops. It writes derived PNGs and gallery metadata only below
`.tmp/bead-research-private/contour-spike/`. Measurements are retained in
`bench/bead-research/contour-spike-results.json`. No production browser, export,
animation, phone or cancellation contract was tested by this worker.
