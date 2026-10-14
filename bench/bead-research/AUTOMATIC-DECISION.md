# Automatic Cleanup decision — October 13, 2026

**Decision: do not add automatic Patches to the production Cleanup control. Keep
Off/On and its current behavior unchanged. Close this bounded experiment.**

This decision is based on insufficient visible benefit relative to the edit risk,
not a requirement for perfect preservation. An optional artistic transform may
lose details when its benefit is useful and predictable. These candidates did not
establish that benefit.

## What was actually tested

Two fixed, fully automatic variants, with no selected colors, face boxes, protected
color lists, maker masks, or special treatment of Snowie:

- Frozen eight-connected regions of at most four pixels.
- Replacement from a same-color component of at least eight pixels that shares an
  edge with the patch and owns at least half its external edge contacts.
- Nearest Oklab, near-tie abstention, one pass without cascading edits.
- Strict squared color-distance limit `.005`; balanced limit `.02`.
- The same fixed vetoes for both: image-border/transparency contact and a third
  boundary color more than `.02` squared Oklab from the replacement.

All rules were fixed before evaluating fresh held-out inputs. There was no tuning
after their results. The generic edge veto is not automatic outline recognition.

The corpus contains 36 source sprites: Snowie, 11 previously inspected sprites,
and 24 fresh deterministic held-outs. Each is tested in its raw palette when it
fits 256 colors (otherwise production Auto64), and as a production Auto/24-color
chart. Twelve procedural controls cover four color themes, faces, diagonals and
dithering. That is 84 correlated views and 168 automatic configurations, not 168
independent images. The procedural variations share one constructed face design.

Current Cleanup and 16/8-color alternatives are displayed alongside the automatic
results. Current Cleanup is calculated from original source RGB using the same
active colors as the comparison baseline, so its exact-color/error gates are not
artificially fed already-converted pixels.

## Results on the requested image

The two original isolated shading colors identify 103 source coordinates; 61 of
them belong to eight-connected regions of at most four pixels. Those coordinates
are used only for evaluation, never supplied to the automatic algorithm.

| Variant | All pixels recolored | Requested-shade coordinates recolored | Requested small-patch pixels remaining |
| --- | ---: | ---: | ---: |
| Strict | 10 | 1/103 | 60/61 |
| Balanced | 54 | 11/103 | 50/61 |

The raw and 24-color views give the same requested-coordinate figures. The strict
rule is ineffective for the actual request. Balanced removes some hair highlights
and other shading while most requested hat/clothing fragments remain. The main
blush and eyes remain visible here; five/nine face-box edits are measurements of
where edits occurred, not an assertion that every such edit is harmful.

The fixed dark mask (Oklab L < `.35`) gains/loses no pixels on Snowie and its dark
2x2 block count is unchanged. That is a geometry-related measurement independent
of a supplied protected palette, but it does not prove preservation of all colored
outlines or artistic line thickness. The method does not close gaps, thin lines,
or unify an entire multi-shade outline.

## Held-outs and deliberate details

The independent reviewer inspected all 24 fresh sprites in fixed manifest order,
including current Cleanup, automatic variants, and lower-color alternatives;
then enlarged Snowie and four detail comparisons. The proposed practical gate was
at least 12/24 clear useful improvements, at most two visibly harmful results, and
meaningful improvement on the target image. This is our declared product judgment,
not a scientific standard or artist preference measurement.

No unequivocal substantial readability win was identified. Generously counting
modest potential fill simplification in `s061`, `s052`, `s039`, and `s019` gives
4/24, still below the benefit gate. Most changes are minor, neutral or imperceptible.
Enlarged examples show a lost metal glint and flattened cheek/ear/material shading.
These minor losses would not alone disqualify an optional mode; the low benefit is
the decisive issue. No numeric artistic-accuracy percentage is claimed.

Strict edits 16/24 of the 24-color held-outs, with median two changed pixels;
balanced edits 19/24, with median six. Changed-pixel counts are not benefit scores.
Dark-mask membership changes in four/seven held-outs are flags for review, not
automatic classifications of outline damage.

The procedural controls expose a repeatable detail trade-off. Both variants erase
a deliberate highlight that has the same local appearance as noise. Strict erases
the subtle gray blush; balanced also erases blue/olive-theme blush. High-contrast
eyes, white glints and long dark outlines survive these fixtures. Short low-contrast
lines can be erased. Dithered controls can lose accents even as their main connected
texture remains. Protection cannot be inferred reliably from similarity alone.

## Validation, scope and reproduction

50 research checks pass: the earlier 34 plus 16 automatic checks. The corpus harness
checks palette membership and unchanged occupancy across 1,861,760 pixel checks.
These are native algorithm checks, not a production export/GIF test. Small-input
desktop timings are recorded but do not establish phone or large-photo performance.

The Codex browser gallery displays precomputed native comparisons, including
Snowie, two detail examples and the blush controls. Its values match the recorded
measurements and no console errors were observed. It does not independently execute
the algorithm or validate production preview/export integration.

```powershell
node bench/bead-research/automatic-evaluate.mjs
node bench/bead-research/automatic-render.mjs
node --test bench/bead-research/*.checks.mjs
```

Private prior inputs must be available under `.tmp/bead-research-private/fixtures/`.
The earlier local corpus manifest supplies fresh source paths; override it through
`BEAD_CORPUS_MANIFEST` if needed. Fresh inputs, all PNGs, contact sheets, browser
screenshots and gallery pixel payloads stay under ignored
`.tmp/bead-research-private/automatic/`. No third-party images enter Git.
Text measurements are in `automatic-results.json`. The local gallery is
`http://127.0.0.1:5173/bench/bead-research/automatic.html`.

No production settings, algorithms, storage or exports were changed. There is no
new shipping mode. Further threshold adjustment of these two rules is not justified
by this evidence; a materially different method or new maker-paired source/target
data would constitute a new experiment rather than continuation of this one.
