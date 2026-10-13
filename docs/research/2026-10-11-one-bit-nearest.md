# 1-bit Nearest style — deferred task

Date: October 11, 2026
Status: Deferred; code paths reviewed and product tradeoffs debated. No 1-bit
Nearest style implemented.

## Decision and constraints

Keep nearest-color conversion in the variable-color **Palette** family. Glow and
Paper are now its final two-color preset group, using the same RGB pairs as their
1-bit counterparts. They run the existing Oklab/RGB quantizer, not Solid or another
1-bit style. Commit `8020802` added these presets and grouped chooser dividers.

The user explicitly chose this approach after a sub-agent review and debate. The
priority is fewer overlapping features and a small, understandable interface.
Do not treat this spike as authorization to add another style, duplicate every
1-bit preset into Palette mode, or introduce new controls.

Nearest is not equivalent to Solid. The deferred question is whether easier access
and comparison justify a second interface to the same nearest-color conversion.

## Findings from the current implementation

| Behavior | 1-bit Solid | Palette Nearest |
| --- | --- | --- |
| Pixel decision | Compare source brightness with a threshold | Match original source RGB to the nearest allowed color |
| Output pair affects classification | No | Yes |
| Image adaptation | Auto threshold uses the source histogram | With All, the palette and matching rule determine the mapping |
| Palette edits | Recolor existing classified regions | May change which color each source pixel matches |
| Swap | Exchanges output inks and inverts the appearance | Reordering the same color set usually leaves the visible result unchanged; ties can differ |
| None | Hide one classified ink role | Not available |

`FULL_PRESETS` contains separate `preset-glow` and `preset-paper` records with
immutable color arrays. Selecting either sets `family: 'full-palette'`.
`Tile.svelte` uses `quantizeAsync`; copy/save snapshots use `fullPaletteImage` and
the same matching engine. A direct verification exercised both records with Oklab
and RGB, confirmed their full-palette state restoration, and compared export-path
indexes with `quantize`. Legacy style/threshold values were absent from the captured
palette snapshot and did not affect conversion.

Palette mode already accepts arbitrary two-color imports and editor-created pairs.
Only the preset catalog is limited to Glow/Paper for two colors; the converter is
not. Other pairs require more setup, rather than a different algorithm.

For grayscale input and a neutral pair, nearest matching can behave like a fixed
brightness cutoff. Colored input, a different pair, or a different metric can
produce different classification. Solid's Auto cutoff is image-dependent. Similar
outputs on one sprite do not establish functional equivalence.

## Review and challenge

The strongest argument for a 1-bit Nearest style is workflow continuity: keep any
of the twelve pairs or a custom pair, then switch directly between Nearest, Solid,
Cutout and dithering. Applying None after matching could also provide color-based
transparent cutouts, which the current Palette interface does not offer.

The strongest argument against is duplication and control semantics. The current
change supplies the requested popular two-color nearest conversions. A twelfth
style would introduce another route to those results and exceptions to the current
1-bit rule that styles classify independently of the output colors.

The parent challenged the architectural objection: palette-dependent classification
and post-match transparency are technically feasible, and implementation conventions
alone should not prevent a useful feature. The reviewer challenged the assumption
that the two presets fully replace seamless custom-pair comparisons. Both agreed
that the deciding factor is demonstrated workflow demand, not algorithm novelty
or an insurmountable technical blocker.

## Deferred work and triggers

1. **1-bit Nearest style.** Revisit when users need frequent comparisons between
   nearest matching and structural/dithering styles using existing or custom pairs,
   or specifically request nearest-based transparency. Merely wanting Glow/Paper
   nearest output is already covered.
2. **Pair reuse across families.** If users repeatedly re-enter other 1-bit/custom
   pairs in the Palette editor, evaluate an explicit way to copy the current pair
   into a palette draft. Compare its workflow cost with adding a style. Do not add
   all twelve presets by default or silently change conversion family.
3. **Nearest-based transparency.** If needed independently of style comparison,
   assess whether hiding a matched palette entry belongs in Palette mode instead.
   This would be a separate behavior change, not ordinary source Opacity cut.

Multi-color dithering and alternative matching metrics remain separate research
topics in the existing shared-palette and matching spikes. This decision adds no
new requirement to implement them.

## Open decisions before implementation

1. **Swap semantics.** Matching against the actual displayed colors makes Swap
   visually inert except for ties. To retain inversion, define an unswapped pair,
   classify against it, then exchange output inks. Describe this as nearest matching
   followed by inversion: inverted output need not minimize displayed color error.
   Do not infer canonical roles solely from brightness; custom colors can have equal
   brightness. Define restoration, pair editing and preset switching explicitly.
2. **None semantics.** A plausible rule is to match against both remembered RGB
   colors, then make the chosen role transparent. Matching only the remaining ink
   would collapse all visible source pixels to that ink. Decide and document the
   rule, including exact matches and distance ties.
3. **Settings.** Nearest needs no brightness threshold or Brightness setting.
   Preserve binary source alpha handling. Decide whether Matching is per-style or
   shared with Palette mode; avoid coupling retained family settings accidentally.
4. **Conversion and caches.** Reuse the quantizer where practical, but invalidate
   classification on relevant pair/metric edits. Capture pair roles, inversion,
   transparency and matching for previews, viewer, copy, PNG, GIF and ZIP. A new
   route need not rewrite the legacy style algorithms.
5. **Animation and performance.** With a fixed unrestricted palette, matching the
   same source RGB is deterministic. Changing source RGB can still cross a matching
   boundary; do not promise flicker-free animation. Measure color-drag responsiveness,
   cancellation and full-resolution export on representative mobile workloads.

## Proposed research scope

Build a disposable comparison prototype only after one of the triggers is met.
Compare today's family switch/editor workflow with a proposed Nearest style using
the same selected pair. Include Glow/Paper, tinted pairs, custom equal-brightness
colors, exact palette matches, transparency and animated inputs. Test small flat
sprites, shaded sprites and smooth gradients.

Assess how many steps users need to compare results and retain their pair, whether
they can predict Swap/None behavior, and whether the new route improves their actual
task. Do not claim visual quality from synthetic RGB-grid disagreement alone.

## Completion criteria for the deferred task

- Establish a concrete workflow that current Palette mode does not serve adequately.
- Compare a style entry against a smaller pair-transfer improvement before choosing.
- Resolve Swap, None, ties, settings retention and color-edit semantics explicitly.
- If proceeding, verify identical intended conversions across preview, viewer,
  copy/save and animation exports, plus cancellation and persistence.
- Check chooser/settings behavior at desktop, narrow portrait and short landscape
  sizes; validate mobile performance before broad claims.
- Measure additional code and runtime cost. Update the behavior spec, style/palette
  docs, Help and performance record with any shipped implementation.
- A supported conclusion to the spike may be to keep the current split. Until a
  new decision is made, the eleven 1-bit styles and Palette Nearest remain the
  source of truth.

## References

- [Palette families, presets and import behavior](../palettes.md).
- [Style rules and controls](../styles.md).
- [Palette matching decision](2026-10-11-palette-matching.md).
- [Shared-palette research](2026-10-11-shared-palette.md).
- [Behavior spec](../superpowers/specs/2026-10-06-colorfetti-app-design.md) and
  [performance constraints](../performance.md).
- Integration points: `src/lib/palette-library.js`, `src/lib/quantize.js`,
  `src/lib/palette-state.js`, `src/lib/presets.js`, `src/lib/recolor.js`,
  `src/App.svelte`, `src/Dock.svelte`, `src/Tile.svelte` and `src/lib/save.js`.
