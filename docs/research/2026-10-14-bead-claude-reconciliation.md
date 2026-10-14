# Bead research: Claude challenge and Codex reconciliation

October 14, 2026. This is Codex's single reconciliation response to Claude's
independent challenge, relayed by the human. Claude's final acknowledgment was
returned by the human on October 14, 2026: **Agreed.** Research only on
main; production and current Cleanup Off/On remain unchanged.

## Revised decision

**Accept Claude's corrections C1–C3 and revise the recommendation.** Useful partial
help already exists in Colorfetti's palette editor. On this native input, global
merging of the two near-identical darks is the first line-consistency recommendation.
Compare global removal of the two fill shades with the selected-small prototype
before considering new code. Snowie's chart-design request is reasonable; a finished
chart or automatic geometry repair has not been demonstrated.

Solid exterior leaves the integration path unless the designer explicitly wants
exterior and interior lines to differ. It is an intentional styling operation,
not a reliable inference of unwanted selective borders. No further threshold
tuning or production work is justified by this one image.

## What was verified

The exact source SHA-256 is
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
It is 96×96, with 24 visible colors, 5,652 opaque and 3,564 alpha-zero cells, and
no partial alpha. No resizing, palette fitting or background removal was performed.

Codex reran Claude's three aggregate analysis scripts and independently reproduced
the palette baselines using production quantization and PNG encoding. The retained
reproduction is `bench/bead-research/native-palette-baseline-evaluate.mjs`; its JSON
stores counts only. Native encoded visible RGB/alpha were decoded and compared
against production colorization. Images and comparisons remain in ignored scratch.

The existing app workflow was also clicked through in the live Codex browser:
Edit palette → Remove selected → save a custom palette → Nearest Oklab, Max colors
All, Cleanup Off. Removing the dark gave 23 palette colors; removing both shades
as well gave 21. The native source was displayed with the latter palette. This
confirms UI availability and preview, not independently downloaded UI-export equality.
Auto selection was restored and the temporary test tab closed. A local saved test
palette named 'Codex Claude review temporary' remains; the earlier user palette
'Bead shading test' was not edited.

Claude reproduced all nine previous metric rows, eleven private PNGs byte-identically
and 16 research checks. Claude did not independently verify the previous live research
page export equality. That evidence remains the earlier native-browser record.
Git was clean at the start of this review; the prior handoff's trailer-edit warning
was stale. This review does not revalidate production tests or deployment.

## C1 accepted: heuristic protection and accent gains

Only seven dark palette labels meet the selected-small protection predicates on
this source. Zero labels meet the pink or near-white predicates. Salmon/peach
accents are missed by the pink rule. Original accent cells survive because they
are not selected; that is not semantic blush protection.

Selected-small and C each add five cells to #f7c4ae, four inside the face box.
The old `pinkAccentChanged` counted edits away from original accent cells only.
The native runner now also records `pinkAccentAdded` and `pinkAccentAddedInFace`.
These count gains into the declared RGB accent union, not actual semantic blush.
The algorithm and thresholds are unchanged. The reassessment and native retest
now qualify their preservation claims accordingly.

Claude's private nearest-neighbor visual inspection located the 13 selected-small
face-box edits at hair tips and the left face edge, with none on eyes, mouth or
eyebrows. Codex independently verified color/dark membership and coordinates/counts,
not that fine-grained semantic interpretation. Neither check substitutes for designer
approval of strand-tip edits or cheek-edge growth.

## C2 accepted: existing global merge is the meaningful outline-color baseline

The source's exterior comprises #200402 (190 cells), #250603 (127), #8f533e (one)
and #f3be91 (one). The two common darks are close in Oklab (squared distance about
.00027). Their correspondence to H5/H6 bead codes is unverified; no code-to-RGB
mapping is supplied. No formal perceptual threshold is asserted here.

There are 171 cardinal neighbor seams between those two darks: 60 between exterior
cells, 39 at exterior/interior junctions and 72 interior. Solid exterior removes
the 60 exterior seams but raises junction seams to 52, leaving 124 overall.
Global removal of #250603 maps all 670 occurrences to #200402 and clears all 171.
The earlier research mentioned a custom-palette union but omitted this native
production baseline. This was a material comparison gap.

| Native variant | RGB recolors | Small-component cells | Near-dark pair seams | Used colors | Exterior colors | New accent cells |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 0 | 848 | 171 | 24 | 4 | 0 |
| A: remove #250603 | 670 | 590 | 0 | 23 | 3 | 0 |
| B: A plus remove both fill shades | 773 | 548 | 0 | 21 | 3 | 0 |
| C: selected-small plus Solid | 168 | 704 | 124 | 24 | 1 | 5 |
| Selected-small alone | 39 | 809 | 171 | 24 | 4 | 5 |
| Remove both fill shades alone | 103 | 806 | 171 | 22 | 4 | 0 |

Small cells belong to same-color eight-connected components of at most four cells.
The seam score covers only #200402/#250603 neighbor pairs. Neither metric measures
artistic intent, chart placement time or a finished contour. More RGB edits can
be preferable when they consistently merge equivalent line colors.

A/B change no alpha or dark-class membership and retain original accent cells
without gaining accent cells. Face-box RGB edits are 65 for A and 86 for B; these
counts must not be interpreted as facial geometry damage. The two non-dark exterior
cells remain (B maps the warm shade to another warm shade). A/B do not fix skipped
cells, jaggies or doubled strokes. C changes two occupied boundary cells into dark
cells; unchanged alpha alone is not proof of unchanged apparent stroke thickness.

## C3 accepted: selected fills need the global-removal comparison

Global removal of #f3be91 and #c18b70 gives 103 edits, 848→806 small cells and
21 face-box edits. Selected-small gives 39 edits, 848→809 and 13 face-box edits.
The selective operation's possible value is retaining coherent shade regions,
not a demonstrated improvement in total fragmentation.

It retains five larger regions of sizes 11, 10, 7, 5 and 9 (42 cells total), plus
abstentions. The selected small-cell split is #f3be91 31→3 and #c18b70 30→19.
For the latter, 14 eligible cells lack an admissible anchor and five hit the
distance veto. Report both colors rather than implying an even 61→22 improvement.
Only the designer can say which retained areas are useful.

## Other accepted findings

Solid intentionally overwrites deliberate selective/light boundary colors. The
loss is two non-dark cells here, but could include purposeful rim lighting elsewhere.
If revisited conditionally, it needs selective-outline and rim-light counterexamples.

Max colors is not a substitute for selecting color roles on this source. Its
23-color subset drops #ecc9a0; 22 drops #f3be91 as well; 21 drops the #bf6251 accent;
20 also drops #fc9884. The dark pair persists until roughly 16. Lower reconstruction
error does not specify which line colors the designer considers equivalent.

Automatic Potts, L0 and border refill remain unsupported as default cleanup. Local
Potts descent is not a global solver; border refill loses 50 dark-class cells; contour
tracing follows existing occupancy and cannot infer desired missing cells. Literature
mechanisms remain plausible candidates, not successful local semantic reconstruction.

## Shared proposed next step

Present original and A/B/C to Snowie in full and isolated-color views through the
human. Ask which is closest, whether inner lines should match the outline, whether
the larger connected shade regions should stay, and which residual cells need repair.
This is designer review; builders should receive a completed exact chart.

If A or B is adequate, add only a workflow note to `docs/palettes.md`: import/edit
the image palette, remove the chosen duplicate/transition shades, use Nearest Oklab,
then correct residual cells in the bead editor. No new setting.

Only if C or its fill half clearly beats B on maker evidence should a 5–10 unrelated
native-design trial proceed. Include A/B on every design. For a fill-only trial,
apply the global dark merge to both sides so different outline treatment does not
confound the comparison. Include reused intentional highlights, selective outlines,
rim lighting, salmon blush, non-warm palettes and different prompts/generators.

Screen for preference over B on at least two-thirds of unrelated designs, fewer
residual manual cells, no unprotected deliberate details requiring restoration,
and selection/review effort worth the saved edits. This is a pragmatic screening
rule for a small trial, not statistical evidence of generality. Even success would
not establish novice/phone usability, animation behavior or builder outcomes.

Prefer a narrow chosen-color small-fragment operation if evidence warrants one;
defer Keep/masking integration. Colorfetti's global palette editor already fits
its product model. No feature or Cleanup behavior change is authorized by this report.

## Reproduction and review protocol

    node bench/bead-research/native-palette-baseline-evaluate.mjs
    node bench/bead-research/native-original-evaluate.mjs
    node --test bench/bead-research/guided-shade.checks.mjs bench/bead-research/solid-boundary.checks.mjs bench/bead-research/semantic-spike.checks.mjs bench/bead-research/contour-spike.checks.mjs

The first two require the ignored native source or its explicit path argument.
The checks require no copyrighted fixture. Aggregate JSON contains no reconstructable
source arrays. No images, screenshots or pixel payloads enter Git or this document.
Final Codex verification: both native runners pass, all 16 checks pass, and the
original native JSON changes only by adding the two incoming-accent counters.
No production tests/build were rerun for these isolated research corrections.

## Final acknowledgment: review closed

Claude checked commit 332fd91 for the corrections and absence of images, reran the
baseline script without a results diff, and confirmed the A/B/C counts. Claude then
signed off with **Agreed.** This completes the single reconciliation; no further
research or rebuttal round is part of this review.

Shared recommendation: no new feature now; current Cleanup unchanged. Use existing
palette editing first and show Snowie A/B/C, including isolated-color views. Pursue
selective fill cleanup only if Snowie clearly prefers C to B, then trial unrelated
designs before integration. Solid exterior remains conditional on wanting different
exterior/interior line colors. None of these methods fixes gaps, doubles or jaggies.

The two remaining maker questions are whether #200402/#250603 correspond to H5/H6
and whether the five larger shading regions C retains are wanted. Claude accepted
the live UI click-through and A/B face-box counts as reported, without independently
rechecking them. That verification limit remains explicit.

Concurrent trailer changes were present at sign-off. This research update does not
edit, stage or commit them. No artwork or pixel payload is retained here.
