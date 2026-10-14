# Exact native original: retest and next recommendation

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

The targeted variants retain source pink/skin-accent colors `#f7c4ae`, `#fc9884`,
`#bf6251`, and dark eye/line pixels within the face box exactly. Their 13 other
face-box edits are selected transition shading, not proof of maker approval. Keep
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

1. Have the pattern designer inspect the exact source, combined result and isolated
   colors. Ask whether the 39 fill replacements and solid exterior are changes they
   would keep, including the 13 face-shading edits. Offer the Keep version if desired.
   This is approval of chart design, not asking the builder to reinterpret cells.
2. If useful, run a small trial on 5–10 additional native bead designs, including
   deliberate same-shade highlights, light outlines, small accessories and different
   palettes. Measure accepted bulk corrections and remaining manual repairs, alongside
   selection/review time. Do not treat correlated poses as independent evidence.
3. If that trial shows clear value, implement a per-image, reviewable selected-fill
   simplification action and explicit solid-exterior option. Keep current Cleanup
   On unchanged. Scope the first version to still images; do not promise internal
   gap repair, uniform one-bead width or automatic intent recognition.

The native test supports that targeted trial. It does not justify another round of
threshold tuning on this character or shipping a generic stronger Cleanup setting.

```powershell
node bench/bead-research/native-original-evaluate.mjs "C:/path/to/the/native-original.png"
```
