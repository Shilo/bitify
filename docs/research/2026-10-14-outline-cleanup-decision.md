# Outline cleanup decision — October 14, 2026

**Do not add the tested outline setting, extend Cleanup, or ship the prototypes.
Keep Cleanup Off/On unchanged. Close this bounded investigation.**

Five fixed automatic candidates were evaluated independently of the earlier shading
no-go. They did not deliver enough useful gap, width or contour improvement to justify
another remembered wall-wide control. Border recoloring has a predictable limited
effect, but neither it nor the tested solid-border styling demonstrated sufficient
benefit here. This is a decision about these candidates and this product request,
not proof that every outline algorithm is impossible.

## Scope and prior evidence

The [October 13 scope](2026-10-13-cleanup-findings-and-outline-scope.md) requested
minimal-input treatment of inconsistent outline shades, doubled pixels, unwanted
gaps and jagged runs, with exterior and internal lines investigated separately.
The starting handoff was read completely. Main advanced from 55a12b1 to ba17ae9
through three branding/link commits; the working tree was clean before this work.

The required latest 96x96 PNG was available and verified against SHA-256
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
The old Snowie shading measurements were not substituted. Original and nearest-neighbor
8x views were inspected before implementation. Evaluation-only prose identified
facial/hat marks, hand separation, hair boundaries and transparent wedges to examine;
thick overlap joins and interrupted dark runs remained uncertain. No source-specific
palette, coordinate mask, face box or artist correction entered any method.

There is no maker-approved native desired-after for this character or the real corpus.
Visual ratings are an independent reviewer's product judgment. They are not artistic
accuracy percentages, timed manual-correction studies or maker-preference measurements.

## Primary-source investigation

The literature separates color segmentation, stroke skeletons and silhouette curves:

| Family | What it supplies | Consequence for this investigation |
| --- | --- | --- |
| [Region adjacency graphs](https://scikit-image.org/docs/stable/api/skimage.graph.html) | Region contacts and weighted merging | Can group adjacent colors; does not identify whether a dark region is border, eye, hair or shadow. |
| [Skeletonization](https://scikit-image.org/docs/stable/auto_examples/edges/plot_skeleton.html) | Thinning of a supplied binary foreground | Requires a line mask first; its skeleton is not the preferred edge location or replacement fill. |
| [Morphology](https://scikit-image.org/docs/stable/api/skimage.morphology.html) | Closing can connect small cracks; opening/thinning modify shapes | Useful bounded baselines, with explicit gap and geometry tradeoffs. |
| [DGtal digital straight segments](https://www.dgtal.org/doc/1.4/moduleArithDSSReco.html) | Recognition of discrete straight runs with defined connectivity | A legitimate diagonal staircase may already be straight in the digital model; recognizing one supplies no defect intent. |
| [Potrace](https://potrace.sourceforge.net/potrace.pdf) | Boundary paths, polygon approximation, corner handling and smooth curves | Curve fitting needs a corner/regularity policy; vector tracing is a different output contract from fixing a same-size bead chart. |
| [Kopf and Lischinski, Depixelizing Pixel Art](https://johanneskopf.de/publications/pixelart/) | Resolves connectivity ambiguity, reshapes cells and fits optimized contour splines | Demonstrates a richer alternative to local morphology for vector magnification; this research did not implement it or establish same-resolution repair benefit. |

The last two methods were considered, not benchmarked or declared failures. Re-rasterizing
their curves onto the original grid introduces additional placement choices. Alpha
identifies silhouette contact with background, not internal body lines. RGB edges and
region boundaries include shading/material changes. These observations motivate the
separate candidates; they do not prove semantic preservation cannot be learned.

## Frozen methods and evaluation

The exact [protocol](../../bench/bead-research/OUTLINE-PLAN.md) was written before the
held-out evaluation. Choose the most frequent exterior boundary color with Oklab
L <= .5. Candidate shades have L <= seed L + .12 and squared Oklab distance <= .04.
No dark seed means abstention. Exterior is four-connected empty background reachable
from the canvas edges, with outside-canvas cells empty. Closed holes are excluded.
Opacity cut is 128; original dimensions are retained.

| Candidate | Behavior and its deliberate limits |
| --- | --- |
| Union | Recolor candidate shades only at the exterior boundary; alpha and interior colors stay fixed. |
| Solid | Recolor every occupied exterior boundary pixel to the chosen palette color; an inner border with no expansion or one-pixel-width promise. |
| Repair | Candidate lines in the boundary plus one inward neighbor band; tight one-cell opaque endpoint bridges, existing sequential iterative simple-point thinning and a unique >=60% frozen adjacent fill vote. Boundary pixels cannot be removed. |
| Regularized | One alpha-majority pass, accepting only simple-point toggles, then Solid; can add/remove occupied cells. |
| All lines | Repair mechanics over every candidate dark pixel, including internal components; no facial protection. |

Repair has one frozen application/fill pass; its binary thinning itself iterates.
The alpha simple-point implementation was corrected on procedural controls to require
cardinal background contact before corpus evaluation. The methods were not tuned after
held-outs. Protocol, method, control, baseline-thinning and runner hashes are retained
in [text results](../../bench/bead-research/outline-native-results.json).

Comparisons cover the latest character, 11 previous exploration sprites, 24 fresh
held-outs and 15 authored controls. Held-outs exclude both the earlier exploration
and its 24 shading held-outs; SHA-256 ID ordering with `outline-20261014/` selects the
first 24 eligible PNG sources. These are fresh to this evaluation but come from a
purposive, related-generation corpus. Raw colors, or Auto64 when necessary, and Auto24
give 87 correlated views and 696 baseline/candidate records, not 696 independent art
samples. Baselines are unchanged, current Cleanup from original RGB, cap16, and global
simple color union using the same automatically detected shades.

The declared practical go gate required meaningful benefit on the latest character,
at least 12/24 clear held-out improvements over practical baselines, at most two
materially harmful cases and no systematic facial damage, without masks or an expert
editing interface. Uncertain stylistic preferences do not count as clear wins.

## Latest character results

These are raw-view source coordinates; counts measure edits, not improvement.

| Variant | Changed pixels | Changed original interior pixels | Alpha added/removed |
| --- | ---: | ---: | ---: |
| Current Cleanup | 0 | 0 | 0/0 |
| Cap16 | 530 | Not classified for this baseline | 0/0 |
| Global color union | 692 | 565 | 0/0 |
| Boundary Union | 127 | 0 | 0/0 |
| Solid | 129 | 0 | 0/0 |
| Repair | 164 | 37 | 0/0 |
| Regularized | 132 | 0 | 9/0 |
| All lines | 693 | 566 | 0/0 |

Boundary Union gives a modest consistent-edge effect while leaving the doubled inner
joins and interrupted runs largely unresolved. Solid is nearly identical here.
Repair retains the troublesome thick internal intersections. All lines changes the
left eyelid/lash profile and animal/garment marks. Regularized fills nine silhouette
cells and increases selected-dark 2x2 blocks from 15 to 24. All lines reduces that
surrogate from 15 to six while visibly changing meaningful marks. Neither number
establishes preferred one-bead width. The same comparison was inspected in Auto24,
with enlarged face, hat and hand/clothing crops.

## Independent held-out review

The independent reviewer inspected all 24 sources in both views, all nine comparison
columns, separately enlarged each source, and reviewed the exact character, controls
and first/middle/last real animation frames. Detailed source-level ratings and review
limitations are in [OUTLINE-REVIEW.md](../../bench/bead-research/OUTLINE-REVIEW.md).

| Candidate | Clear wins | Neutral | Uncertain | Material harms |
| --- | ---: | ---: | ---: | ---: |
| Union | 0 | 16 | 6 | 2 |
| Solid | 0 | 5 | 12 | 7 |
| Repair | 0 | 10 | 9 | 5 |
| Regularized | 0 | 2 | 11 | 11 |
| All lines | 0 | 1 | 4 | 19 |

One source is counted once across its two renderings. The lack of clear benefit is
decisive even for Union, whose harm count meets the maximum. A maker might prefer
some uncertain heavier borders, but that preference was not supplied. All lines
changes hoodie-mascot facial marks in s143, mouth details in s070 and expressions
in s046; these are repeatable semantic losses, not only occasional innocuous edits.

For Auto24 held-outs, Union edits 19/24 sources, Solid/Repair/Regularized/All lines
22/24 each. Their median edits are 26.5, 32.5, 30.5, 35.5 and 68 pixels respectively.
Editing many inputs is not evidence of helping them. Regularized changes alpha in
16/24 sources. No manual correction time saving was measured; a promised reduction
in bead-placement or repair effort would be unsupported.

## Controls, geometry and animations

The identical accidental/intentional internal gaps receive identical All-lines repairs:
one wanted correction and one unwanted closure. Exterior Repair abstains on both.
All lines reduces the authored double-line width but removes the opposite row from
the specified target: zero of ten target corrections match. At the thick bend it
changes eight of 14 keep cells; the eye/glint/text control loses two of nine keep
cells. Solid fixes seven authored shade-seam pixels but also replaces seven intentional
selective-border pixels. Union misses the seam under its fixed shade detector. None
repairs the authored spur. Diagonal stairs, tiny transparent holes and disconnected
accessories expose further limits without supplying private semantic masks.

Occupancy and direct label changes are primary geometry measurements. Foreground8
components/background4 holes are recorded, alongside candidate-dark pixels, endpoints,
2x2 blocks and Chebyshev distance-to-background histograms. Candidate masks are
reclassified per output, so their statistics can change through color detection.
Degree-based endpoints and grid distance are imperfect stroke surrogates; neither
topology nor fewer 2x2 blocks demonstrates preferred contour placement. Repair's bridge
and accepted fill subset do not promise global line topology preservation.

Regularized retained global alpha components/holes on all corpus views and 4,096
padded authored binary masks. That is a tested topology constraint, not preservation
of every silhouette pixel or a proof about every possible clipped input.

Temporal checks use a translated authored line and nine frames of real GIF a003,
with common RGB label identities and recorded original delays. Fixed-coordinate
whole-clip agreement retains zero first-frame edits for Union, Solid, Repair and
Regularized on a003, and two of 2,484 for All lines. The translated All-lines control
retains eight of ten because the shifted line overlaps itself; it is not motion
tracking. Static animation panels show conspicuous dark borders on pale effects.
Framewise edit changes and rejected agreement do not measure flicker, timing quality
or production GIF behavior. No candidate has a validated animation contract.

## Interface decision and implementation limits

Do not add Exterior/All, Auto/Solid or numerical repair controls to Cleanup. Those
choices represent different transformations and would make the panel larger while
leaving the main repair request unresolved. Existing On remains compatible and exact
palette-source protection stays intact.

A separate opt-in Solid styling effect could be described intelligibly as inner
silhouette recoloring using an explicit active-palette color, with unchanged alpha
and dimensions and no internal-line promise. This experiment does not justify adding
it now. Automatic seed selection can choose material colors; opaque images can get
canvas-edge frames, closed holes are excluded, narrow parts can be fully recolored,
and light outlines may abstain. A remembered global toggle would affect later imports
and mixed walls inconsistently. This is a considered no-add decision for styling too,
not an implementation plan awaiting permission.

Small still candidate calls measured 1.28 ms median and 64.14 ms maximum on the final
desktop run (the initial run was 1.00/21.00 ms). These synchronous allocation-heavy research methods have no cancellation,
worker queue, source-resolution preview/export agreement, immutable save snapshot,
failure handling or bounded phone-cost implementation. No positive candidate passed
the benefit gate, so production integration and physical-phone tests were not pursued.
The local precomputed gallery does not establish those properties. Desktop browser
navigation to it timed out in this session; no browser interaction validation is claimed.

## Verification status

October 14 verification-packet preparation confirmed that the latest source hash,
protocol hash and all four algorithm hashes match the retained result record. Its
36 sources, 24 held-outs, 15 controls, 87 views and 696 records agree with this report.
A handoff now requests a new independent audit of reproducibility, visual judgments,
candidate coverage and the recommendation. That audit is pending; the preparation
checks do not count as another independent verification. Preserve the recorded results
before rerunning the harness, which overwrites its result JSON and private PNG outputs.

## Reproduction, validation and private comparisons

```powershell
node --test bench/bead-research/*.checks.mjs
node bench/bead-research/outline-evaluate.mjs
node bench/bead-research/outline-native-render.mjs
node bench/bead-research/outline-temporal-render.mjs
npm test
npm run build
```

57 research checks pass, including the new seven checks and 4,096 alpha masks.
The harness checks 2,356,032 candidate coordinates for palette membership and
non-Regularized occupancy invariants, and decodes 3,534,048 saved PNG pixels back to
the expected native RGBA. Production tests: 806 passed, two skipped; production build
passed. Initial sandbox attempts prevented Vite worker path resolution and Vitest
temporary-file renames; rerunning with approved escalation passed. No production
source was changed and no research imports/text were found in src or dist.

Inputs require ignored `fixtures/outline-character-latest.png`, the 11 old fixtures
and `.tmp/cleanup-qa/corpus/manifest.json` plus its local source files. Environment
overrides are `BEAD_CORPUS_MANIFEST` and `NODE_DEPENDENCY_ROOT`. Use Node with pngjs
and sharp locally or the existing bundled runtime fallback; no dependency was added.
Authored algorithm checks need no private inputs.

All media and reconstructable image data remain ignored and uncommitted. Private
comparison directory: `C:/Programming_Files/Shilocity/colorfetti/.tmp/bead-research-private/outline/`.
Useful paths: `latest-large.png`, `latest-raw-{method}-{face,hat,hands}.png`,
`heldout-{raw,bead24}-1.png` through `-6.png`, `controls-1.png` through `-3.png`,
and `temporal-a003.png`. These names expose no image contents. The optional local
gallery is `bench/bead-research/outline-native.html` through `npm run dev`; it displays
precomputed PNGs only. Timings vary, but fixed candidate pixels and counters reproduce.

Stop the fixed-candidate experiment. Do not keep searching thresholds to improve
these held-outs or revive the rejected shading mode as outline cleanup.
