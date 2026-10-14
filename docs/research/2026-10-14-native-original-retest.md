# Exact native original: retest and next recommendation

Revised after the [Claude challenge and Codex reconciliation](2026-10-14-bead-claude-reconciliation.md):
existing palette removal is the first recommendation. The protection and accent
measurements below now distinguish retained source cells from added accent area.

The follow-up attachment was tested directly from its supplied PNG bytes. It is
96×96, has 24 visible colors, 5,652 occupied cells and 3,564 fully transparent cells.
There are no partial-alpha cells. No resizing, background removal or palette fitting
was performed. SHA-256 is
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
It matches the earlier transparent fixture byte-for-byte; the prior opaque attachment
was a separate input. This run independently verifies the exact supplied file.

Results are retained in `bench/bead-research/native-original-results.json`.
The selected-shade test uses the same two isolated-reference colors, `#f3be91` and
`#c18b70`; solid exterior uses chosen `#200402`. Parameters are unchanged. Optional
Keep freezes the same rough face rectangle `[34,30,65,50]` used in prior research.

| Variant | Recolored cells | Small selected-shade cells | Exterior colors | Face-box edits |
| --- | ---: | ---: | ---: | ---: |
| Original | 0 | 61 | 4 | 0 |
| Current Cleanup On | 0 | 61 | 4 | 0 |
| Selected shades | 39 | 22 | 4 | 13 |
| Selected shades + face Keep | 26 | 35 | 4 | 0 |
| Solid exterior | 129 | 60 | 1 | 0 |
| Selected shades + solid exterior | 168 | 21 | 1 | 13 |
| Selected shades + Keep + solid exterior | 155 | 34 | 1 | 0 |
| Automatic spatial smoothing | 243 | 41 | 4 | 52 |
| Spatial smoothing + face Keep | 191 | 52 | 4 | 0 |
| Border trace/refill | 184 | 60 | 1 | 0 |

Small cells means pixels belonging to eight-connected same-color components of at
most four cells, not all unwanted cells or components. Solid changes one selected
shade boundary cell on this exact input, so combined gives 21 rather than the
selected-only result of 22. No variant changes alpha; every variant still uses
24 colors. PNG outputs retain the native 96×96 grid.

The selected variants retain original cells of `#f7c4ae`, `#fc9884`, `#bf6251` and
dark eye/line pixels within the face box. However, selected-only and combined also
add five cells to `#f7c4ae`, four inside that box. The old `pinkAccentChanged` metric
counted only edits to original accent cells, missing these gains. New counters
`pinkAccentAdded` and `pinkAccentAddedInFace` correct that omission. These RGB
proxies do not identify semantic blush. Only seven dark labels match the protection
rules here; no pink or near-white label does. Original accents were retained because
they were not selected, not because the pink rule protected them. The 13 face-box
edits are selected shading, not proof of maker approval. Keep
preserves every pixel in that rectangle but also retains unwanted shading there.
Source dark pixels cannot be removed or added by selected-shade cleanup. Solid
recoloring turns two already occupied boundary cells into dark pixels; unchanged
alpha does not mean every apparent stroke-width measurement stays fixed.

Automatic spatial smoothing changes 19 cells of those pink/skin-accent colors;
face Keep reduces that to nine outside the protected box. Color roles are not
semantic labels, so this is an accent-change measurement, not a count of damaged
blush pixels. It reinforces the decision against a broad automatic default.
Border refill removes 50 source dark-class cells and retains its previously
identified braid/material-detail risks. Neither result justifies generic thinning.

The exact source was also loaded in the live Codex browser research page. Two fill
choices and one outline choice reproduced 168 recolors, selected small cells 61→21,
and all small-component cells 848→704. Its prepared PNG was downloaded and decoded
independently: all 9,216 cells match the Node result in visible RGBA and alpha.
Unused RGB beneath 3,564 fully transparent cells differs between encoders and has
no visual effect. Evidence is `native-original-browser-checks.json`.

The research page now defaults to this unmodified native source. Artwork, exported
PNGs and screenshots remain solely in ignored `.tmp/bead-research-private/native-original/`.
No images or image payloads are included in this document or retained results.
Twelve relevant algorithm checks pass. No production feature was changed.

## Recommendation

1. Present original plus A (existing palette removal of #250603), B (A plus global
   removal of #f3be91 and #c18b70), and C (selected-small plus Solid) in full and
   isolated-color views. A clears all 171 near-dark seams and reduces small cells
   848→590; B reaches 548, against C's 704. Both preserve alpha and dark membership.
   They do not repair gaps or doubles. Maker approval remains unmeasured.
2. If A or B is adequate, document the existing workflow; add no feature. The fill
   prototype retains five coherent selected-shade regions totaling 42 cells that
   global removal changes. Its small-cell reduction is uneven: #f3be91 31→3,
   #c18b70 30→19. Only maker preference for retaining these areas can justify it.
3. Only if C or its fill half clearly beats B should a 5–10 unrelated-design trial
   proceed, with A/B on every design and a common dark-merge baseline for fill-only
   comparisons. Measure preferred result, residual manual cells, restored deliberate
   details and selection/review time. Include selective outlines, reused highlights,
   salmon blush and non-warm palettes. A two-thirds preference gate is a screening
   rule, not proof of generality. Keep current Cleanup unchanged; no production now.

Solid exterior leaves the integration path unless the maker explicitly wants
exterior and interior line colors to differ. Do not tune thresholds further on this
character or promise uniform one-bead width, gap repair or automatic intent recognition.

```powershell
node bench/bead-research/native-original-evaluate.mjs "C:/path/to/the/native-original.png"
```
