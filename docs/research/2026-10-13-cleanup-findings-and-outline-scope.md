# Cleanup findings and outline investigation scope

October 13, 2026. Text-only research. Production Cleanup remains Off/On unchanged.

Completed October 14: [outline decision](2026-10-14-outline-cleanup-decision.md).
Five frozen candidates were independently evaluated; none justified a new setting.
The research is closed with a no-add recommendation, separately from the shading
decision below. Production remains unchanged.

## Automatic shading decision

Do not add the tested automatic Patches mode. Its visible benefit was insufficient
to justify another setting and its detail-loss risk. This conclusion applies to
the evaluated methods; it does not prove that every automatic cleanup idea fails.

Two fixed automatic rules considered frozen eight-connected patches of up to four
pixels, borrowed a nearest similar color from an edge-adjacent larger region, and
abstained on ambiguity, edge/transparency contact or conflicting boundary contrast.
Squared Oklab limits were `.005` and `.02`. Neither used maker-selected colors,
face boxes, protection lists or keep masks. No tuning followed held-out evaluation.

Tests covered 36 source sprites, including 24 fresh held-outs, plus 12 procedural
controls. Raw/Auto64 and 24-color views produced 84 correlated views and 168
configurations, not 168 independent artworks. Current Cleanup and 16/8-color
alternatives were included. Fifty research checks passed.

On the earlier 96x96 Snowie fixture:

| Variant | Requested shade coordinates recolored | Requested small-patch pixels remaining |
| --- | ---: | ---: |
| Strict | 1/103 | 60/61 |
| Balanced | 11/103 | 50/61 |

The main blush and eyes remained visible here. Both rules erased identical
same-color intentional highlights in controls; Strict erased subtle gray blush,
and Balanced also erased blue/olive-theme blush. Enlarged sprite comparisons showed
minor lost glints and flattened cheek/ear/material shading. Some disclosed detail
loss could be acceptable for an optional transform; weak benefit was decisive.

The independent reviewer inspected all 24 held-outs in fixed order and enlarged
target/detail views. No unequivocal substantial readability win was found; at most
four examples had modest potential improvement. This is reviewer judgment, not
maker preference or an artistic-accuracy percentage.

Detailed methodology and reproduction are in
[the automatic decision](../../bench/bead-research/AUTOMATIC-DECISION.md) and
[text measurements](../../bench/bead-research/automatic-results.json).
[The original bench](../../bench/bead-research/README.md) also records artist-guided
methods: supplied protection made those results useful, without establishing
automatic recognition of important details.

## Outline evidence already available

The maker's later example requests one outline color, repair of unwanted gaps,
removal of doubled/thick sections and a continuous mostly one-bead-wide contour.
H5/H6 are that chart's color codes; bead brand and exact RGB values were not established.
Color union is exact relabeling, which preserves geometry but cannot fix width or gaps.

A conservative bridge proposed no additions on the sampled chart. Simple-point
thinning removed 12 of 202 known selected cells and reduced four 2x2 blocks to zero.
Tested topology was preserved, but on 2,104 approximately aligned common cells,
extra/missing target cells changed from 19/13 to 11/17: some desired contour was
removed. Reverse scan order retained two different cells. These are screenshot
reconstructions with occluded/cropped cells, not native artist ground truth.

Outline tests include 4,096 small binary masks. Preserving connectivity and holes
does not establish artist-preferred contour, line width, or the fill that should
replace removed outline pixels. Intentional and accidental openings can have
identical local geometry. See [text outline findings](../../bench/bead-research/outline-findings.json).

## New investigation requested

Independently investigate an intuitive, minimal-input outline setting for jagged
runs, unnecessary double pixels, unwanted skipped pixels and inconsistent shades,
including selective borders the user considers unwanted. Evaluate optional solid
outer border color and, separately, internal body/shape outlines. The next agent
must research, prototype, test, challenge the idea and decide add/not-add. A no-go
is a valid completed investigation; the shading no-go does not decide outline methods.

Do not presume all stair steps, doubled pixels or border color changes are mistakes.
They can be important drawing choices at low resolution. The character is a required
test, not a formally annotated defect map or a supplied corrected target.

## Latest character and asset restriction

The latest attachment is a 96x96 PNG with SHA-256
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
It differs from the earlier fixture at 23 decoded visible/alpha coordinates.
Previous shading measurements must not be presented as results on this exact file.
The handoff identifies the local attachment and its ignored scratch copy.

No originals, derived PNGs, screenshots, sprite sheets, base64, RGBA arrays,
reconstructable image masks or gallery pixel payloads belong in research documents
or Git. Media remain in ignored local storage. Keep code, text, provenance metadata
and measurements; use authored procedural controls for portable tests.

Current Cleanup protects exact active-palette matches and restricts isolated-pixel
merges by color error; GIF changes require fixed-coordinate agreement across all
frames. Outline transformation needs separate decisions about geometry, alpha,
palette membership, source dimensions and timing. Do not silently change today's On.
