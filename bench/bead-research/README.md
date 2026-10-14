# Fuse-bead research, October 13, 2026

Originally developed on `codex/fuse-bead-research` and retained on `main` after
research review. **Research only; no production imports or UI changes.**

Follow-up: [automatic mode decision](AUTOMATIC-DECISION.md) tests the minimal-input
proposal without selected colors or keep masks. Its final recommendation is
**do not add Patches; retain the existing Off/On behavior**.

The separate outline investigation is complete: [outline decision](../../docs/research/2026-10-14-outline-cleanup-decision.md)
and [independent review](OUTLINE-REVIEW.md). Five frozen outline candidates failed
the practical benefit gate on the exact latest character and 24 fresh held-outs.
Do not add an outline setting. Earlier outline notes below remain historical.

Start the existing dev server with `npm run dev`, then open
`http://127.0.0.1:5173/bench/bead-research/index.html`.
The main Colorfetti route remains unchanged. The bench offers source/24-color charts,
selected shading swatches, a fixed distance comparison, and original/nearest/vote views.
Supplied protection is fixed in each fixture; the page is not a masking editor.
Third-party inputs, derived images and embedded pixel payloads are excluded from
Git and stored only in ignored local scratch storage. The retained research
consists of code, text findings, metadata and measurements.

## What the maker actually requested

The first example asks for fewer isolated shading regions while retaining blush,
eyes and important details. The follow-up additionally requests one outline color,
closed unwanted gaps, and a continuous mostly one-bead-wide contour. These are
different operations: recoloring, spatial merging, pixel addition, and pixel removal.
An attractive sprite and an easy-to-follow bead chart can require different choices.

## Methods and limits

- **Nearest admissible fill:** consider only adjacent nonselected, nonprotected
  colors with a larger frozen four-connected anchor of at least five pixels. Choose
  nearest Oklab, veto excessive error, and abstain on near ties.
- **Boundary vote with veto:** propose the most common surrounding label, then
  veto ties, protected colors, unanchored candidates and excessive Oklab distance.
  A veto does not try another label.

Both operate once on frozen labels and alter only selected colors. A protected
pixel vetoes its entire selected-color region. Neither recognizes faces, materials,
highlights or outlines. Neither has a small-region-only cap: coherent selected
shading can also be recolored. Four-neighbor adjacency avoids borrowing a fill
that only touches diagonally; eight-neighbor statistics are reported separately.

Distances `.005`, `.02`, `.04` were declared before this corpus run; `.02` is the
display default, not an optimum found by tuning. These are bounded heuristics, not
implementations of a learned or globally optimized segmentation method.

## Shading results

27 input cases: Snowie's original; 11 additional real sprites; those same 11 after
the production Auto + Max colors24 pipeline; four variations of one constructed
face. This produces 162 method/threshold configurations, not 162 independent images.
Raw sprites with thousands of colors remain exploratory controls. The 24-color
baseline preserves at most the information already retained by palette conversion.

At `.02`, Snowie's two selected shades originally occupy 71 pixels in four-connected
patches of at most four pixels (61 with eight-connectivity):

| Method | Total selected pixels recolored | Remaining small-patch pixels, four-connected | Eight-connected |
| --- | ---: | ---: | ---: |
| Original | 0 | 71 | 61 |
| Nearest | 50 | 42 | 32 |
| Vote + veto | 38 | 54 | 44 |

The face rectangle, pink and light eye accents, and declared dark colors are
explicitly protected in this fixture. Protected-label membership and pixel masks
remain exact, including no additions to the declared protected-color union.
This prevents the prior prototype's dark-color absorption, but is not automatic
outline detection or an independent geometric thickness metric.

Other real sprites use disclosed heuristic shade selection and dark/pink/light
protection. They have no artist labels of desired edits. Lower island counts cannot
be advertised as artistic accuracy. The source fixtures are a small, purposive
selection from an earlier PixelLab corpus, not a representative bead-maker sample.

The decisive control reuses a selected shading color in both noise and an intentional
highlight. **Both methods erase the highlight without its explicit keep mask.**
With the mask, noise is merged and the highlight remains. Protected blush, eyes,
outline pixels and alpha are exact in the constructed controls. The diagonal case
counts only noise pixels that remain after drawing the protected diagonal.

## Outline results

See `outline-findings.json`. Visual outputs are private local scratch artifacts.
The provided assets are screenshots with grid lines, different crops/scales and a
popup obscuring cells. Recovered cells and manual alignment are approximate; magenta
marks unknown areas. No claim of native-pixel artist accuracy is warranted.

- **H5/H6 union:** explicit relabeling is exact and preserves geometry. Tested on
  synthetic labels. It can be approximated today with a suitable custom palette.
- **Conditional one-cell endpoint bridge:** proposes additions on a controlled
  accidental gap, but makes the identical proposal on an intentional opening.
  Its conservative rule proposes zero additions on the sampled merged screenshot.
- **Simple-point thinning:** removes 12 of 202 known selected outline cells, reduces
  four 2x2 blocks to zero, and preserves tested components/holes. On the 2,104
  mutually known aligned cells, extra/missing cells versus the manual chart change
  from 19/13 to 11/17. It deletes some desired contour cells. Reverse scanning
  retains two different cells with the same topology.

The thinning tests include all 4,096 padded 3x4 binary masks. Topology preservation
is a mathematical constraint, not artistic contour preservation. The binary study
also does not determine which fill color should replace a removed outline pixel.

## Decision and next gate

**Continue assisted research; do not integrate either shading method or automatic
outline repair into production.** Nearest is the stronger shading candidate on this
example. The exact outline-color merge is the most predictable operation, but its
benefit is distinct from geometry repair.

Before integration:

1. Obtain native before/desired-after patterns and maker-marked keep/remove areas.
2. Test varied bead charts where one color has different artistic roles. Require
   zero protected-detail changes and no protected-outline growth; judge actual chart
   readability and placement effort rather than singleton counts.
3. Require maker preference on held-out examples. Do not keep tuning thresholds to
   make this one character look good.
4. Keep additions/thinning as reviewable proposals if explored further. Reject a
   scope expansion into automatic artistic reconstruction based on these samples.
5. Only then design full-resolution preview/export agreement, immutable per-image
   choices, cancellation, failure handling and bounded memory. GIFs need a separate
   temporal gate: this bench is still-image only. Current production Cleanup stays
   unchanged.

## Reproduce

```powershell
node bench/bead-research/run.mjs
node bench/bead-research/outline-probe.mjs
node bench/bead-research/render.mjs
node --test bench/bead-research/*.checks.mjs
npm run build
```

The first command requires private local fixtures under
`.tmp/bead-research-private/fixtures/`, or a directory supplied through
`BEAD_RESEARCH_FIXTURES`. Fixture filenames are listed in `fixture-manifest.json`.
These images are not committed or distributed. Generated PNGs and gallery pixel
payloads also go under the ignored `.tmp/bead-research-private/` directory.
For a fresh checkout without those inputs, use `node bench/bead-research/run.mjs
--synthetic-only`; the algorithm checks require no image fixtures. The full runner
imports the unchanged production palette generation, limiting and
matching modules solely to prepare the 24-color baselines. Node `pngjs` is required;
the outline probe also uses `sharp`. Locally installed dependencies are preferred;
set `NODE_DEPENDENCY_ROOT` to a directory containing them, or use the bundled Codex
runtime fallback. No production dependency was added.

Browser testing verifies live controls and visual results; native RGBA/invariant
checks come from the Node harness. The bench does not implement the production
export pipeline or establish phone responsiveness, GIF stability, or maker approval.

Recorded validation: 34 research checks pass, including exhaustive outline masks;
the existing app suite passes 779 tests with two skipped, and the production build
passes. No research method or page appears in the production bundle. The live Codex
browser matched both methods' recorded values on 11 selected cases, and threshold
and swatch controls worked without console errors. `browser-checks.json` records
those case checks. Default PNG outputs are decoded again to verify exact alpha and
unchanged RGBA for untouched pixels.

## Primary sources

- [Region adjacency graph merging](https://scikit-image.org/docs/stable/api/skimage.graph.html)
  describes merging neighboring regions by color-related edge weights. Our one-pass
  constrained methods are simpler experiments inspired by that family.
- [Rank majority/modal filters](https://scikit-image.org/docs/stable/api/skimage.filters.rank.html)
  document local voting techniques; they supply no semantic preservation guarantee.
- [Skeletonization](https://scikit-image.org/docs/stable/auto_examples/edges/plot_skeleton.html)
  describes connectivity-preserving thinning.
- [Morphology](https://scikit-image.org/docs/stable/api/skimage.morphology.html)
  documents closing, thinning and their geometric effects.
