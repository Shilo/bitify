# Frozen outline experiment — October 14, 2026

Research only. Freeze this policy before evaluating held-outs; no production imports
of research code, no tuning after review. No artist target is available for the native
character. Author-created procedural targets test mechanics and ambiguity only.

## Evaluation-only character notes, before methods

Latest input hash: 638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233.
Keep facial eyes/mouth/blush, hat face, hand separation, braid gaps, clothing seams
and disconnected transparent openings. Candidate repair areas are color changes on
the hat perimeter, thick dark hair/clothing intersections, and interrupted dark
runs at hand/clothing borders. Their intended correction is uncertain. No coordinate
mask or source-specific colors enter algorithms. These prose regions are for visual
review, not desired-after ground truth or quantitative accuracy scores.

## Candidates and exact constants

Opacity cut 128. Pixels outside the original fixed dimensions are empty. Exterior
means four-connected transparent background reachable from image edges, plus outside
the image. Enclosed holes are excluded from exterior border recoloring.

Automatically choose the most frequent exterior-boundary palette color with Oklab
L <= .5, breaking ties by lower L then palette order. Abstain without a dark seed.
Dark shade candidates have L <= seed L + .12 and squared Oklab distance <= .04.
These are detector hypotheses, not semantic outline labels.

1. **Union:** recolor only exterior boundary pixels of candidate shades to the seed.
   Compare global simple color union using the same shades, without region selection.
2. **Solid:** recolor every occupied four-neighbor exterior boundary pixel to seed.
   Inner border, no expansion, alpha unchanged, no guarantee of one-pixel stroke width.
3. **Repair:** candidate dark pixels within one four-neighbor step of the boundary;
   tight existing one-cell endpoint bridge, then existing sequential simple-point
   thinning. Only opaque gap cells may be filled. Only nonboundary line pixels may be
   removed, with a unique >=60% four-neighbor nonline fill vote. Frozen proposals,
   no iteration of filling. Alpha unchanged. Apply shade union on retained lines.
4. **Regularized:** one row-major pass of alpha majority proposals (<=2/8 occupied
   removes, >=6/8 occupied adds), accepted only at a simple point (local foreground8
   and background4 each one component), then Solid. Unique >=60% four-neighbor fill
   for additions. Original dimensions; alpha may change; transparent RGB ignored.
5. **All lines:** Repair mechanics over all candidate dark pixels, including internal
   components. Evaluated separately for facial/semantic leakage; no keep masks.

Simple-point thinning is the existing baseline, not an implementation of Zhang/Suen
or Lee. Majority regularization is a bounded local alternative, not Potrace, digital
straight segment recognition, or Kopf/Lischinski depixelization.

## Corpus and stop gate

Latest character + 11 old exploration sprites. Twenty-four deterministic held-outs
from the local corpus, excluding prior shading exploration AND its 24 held-outs;
seed `outline-20261014/`, SHA256 ID ordering, first 24 PNGs <=128 in each dimension.
These are fresh to this outline comparison, but the corpus is purposive and correlated
by subject/generation. No population-generalization claims. Test raw (Auto64 if >256
colors) and Auto24. Baselines: unchanged, current Cleanup from original RGB, cap16,
and global simple union. One source counts once, not once per rendering.

Authored controls: selective border, shade seam, accidental/intentional identical
gaps, stair steps, spur, thick bend, doubled internal line, tiny loop/transparent
hole, touching limbs, disconnected accessory, eyes/blush/glint/text, opaque background,
light border and clipped sprite. Paired identical controls expose intent ambiguity.

Practical go gate, declared judgment not a scientific standard: meaningful benefit
on the latest character and >=12/24 clear held-out improvements over practical
baselines, <=2 materially harmful results, no systematic facial loss, and minimal
interaction without masks. Solid styling may be judged as its separate predictable
opt-in aesthetic; it cannot claim gap/thickness repair. A feature that only beats
unchanged in a few cases or needs extensive masks is no-go. No follow-up threshold
search. Uncertain cases do not count as clear wins.

Measure palette membership, unchanged pixels, occupancy additions/removals,
foreground8/background4 topology, exterior contact count, candidate line8 components,
holes, endpoints, length (pixel count), 2x2 blocks and grid distance-to-background
distribution (not artistic stroke width). Review nearest-neighbor views and enlarged
regions. Authored controls have targets; real sprites do not. Independent reviewer
must assess all held-outs, leaks and the proposed single-setting interaction.

Animation: translated procedural line/shape and real GIF sample; compare framewise
changes and fixed-coordinate whole-clip agreement. Report rejection of moving edits;
do not imply motion tracking. Only a positive feature recommendation proceeds to
desktop/mobile live algorithm interaction and production integration cost gates.

All media and reconstructable data stay ignored under
`.tmp/bead-research-private/outline/`. Retain only code, text, provenance and counters.
